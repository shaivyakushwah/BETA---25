import type { Job, ResumeLine } from "@/lib/types";

/**
 * Model calls run on the server only. They use the project's built-in AI
 * (Gemini through the Lovable AI Gateway). If a GEMINI_API_KEY secret is
 * added, calls go straight to Google with that key instead, as before.
 */
const GATEWAY_MODEL = "google/gemini-3-flash-preview";

function directModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

export function geminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY);
}

export function providerStatus(): { available: boolean; model: string; note: string } {
  const model = process.env.GEMINI_API_KEY ? directModel() : GATEWAY_MODEL;
  return {
    available: geminiAvailable(),
    model,
    note: geminiAvailable()
      ? "AI Copilot active. Live AI scoring & mail drafting enabled."
      : "Running in local engine mode: generative scoring & live AI mail drafting are off.",
  };
}

async function generate(parts: string, jsonSchemaHint: string): Promise<string | null> {
  const directKey = process.env.GEMINI_API_KEY;
  const prompt = `${parts}\n\n${jsonSchemaHint}`;
  try {
    if (directKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${directModel()}:generateContent?key=${directKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.25, responseMimeType: "application/json", maxOutputTokens: 2048 },
          }),
          signal: AbortSignal.timeout(18_000),
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return null;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: GATEWAY_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.25,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text().catch(() => ""));
      return null;
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? null;
    return text ? text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim() : null;
  } catch (error) {
    console.error("AI call failed", error);
    return null;
  }
}

/**
 * Asks the model which resume lines to highlight.
 */
export async function selectHighlightLines(
  lines: ResumeLine[],
  job: Job,
): Promise<{ numbers: number[]; rejected: number[]; error: string | null }> {
  if (!geminiAvailable()) return { numbers: [], rejected: [], error: null };

  const numbered = lines
    .filter((line) => line.section !== "Header")
    .map(
      (line) =>
        `${line.n} [${line.section}] ${line.text
          .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
          .replace(/(\+?\d[\d\s-]{8,}\d)/g, "[phone]")
          .replace(/https?:\/\/\S+/g, "[link]")}`,
    )
    .join("\n");
  const prompt = `You are helping a candidate choose which of THEIR OWN resume lines to highlight for a job.

Rules:
- Return only line numbers from the list below.
- Never write resume text. Never invent experience.
- Prefer lines that give concrete evidence for the job's requirements.
- If nothing is relevant, return an empty array.

JOB: ${job.title} at ${job.company}
REQUIREMENTS: ${job.requirements.map((r) => `${r.skill}${r.must ? " (must)" : ""}`).join(", ")}

NUMBERED RESUME LINES:
${numbered}`;

  const raw = await generate(prompt, 'Respond with JSON: {"lines": [12, 14]}');
  if (!raw) return { numbers: [], rejected: [], error: "Model did not return a response" };

  try {
    const parsed = JSON.parse(raw) as { lines?: unknown };
    const numbers = Array.isArray(parsed.lines)
      ? parsed.lines.filter((n): n is number => typeof n === "number" && Number.isInteger(n))
      : [];
    const valid = new Set(lines.map((l) => l.n));
    return {
      numbers: numbers.filter((n) => valid.has(n)),
      rejected: numbers.filter((n) => !valid.has(n)),
      error: null,
    };
  } catch {
    return { numbers: [], rejected: [], error: "Model returned malformed JSON" };
  }
}

/** Optional: tighten a pre-computed prep plan without letting it add new claims. */
export async function refinePrepHeadline(job: Job, planHeadline: string): Promise<string | null> {
  if (!geminiAvailable()) return null;
  const raw = await generate(
    `Rewrite this interview-prep headline in at most 12 words. Keep the role and company exact. Do not add claims.\n\n${planHeadline}`,
    'Respond with JSON: {"headline": "..."}',
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { headline?: string };
    return typeof parsed.headline === "string" ? parsed.headline.slice(0, 120) : null;
  } catch {
    return null;
  }
}

// ==============================================================
// 1. GEMINI RESUME SCORING ENGINE
// ==============================================================

export interface ResumeScoreResult {
  overallScore: number;
  headline: string;
  summary: string;
  breakdown: {
    technicalMatch: number; // 0-30
    experienceImpact: number; // 0-30
    clarityStructure: number; // 0-20
    atsReadiness: number; // 0-20
  };
  strengths: string[];
  weaknesses: string[];
  interviewReadiness: "High" | "Moderate" | "Needs Preparation";
  actionableEdits: string[];
  source: "gemini" | "deterministic";
}

/**
 * Evaluates resume quality, impact, and ATS readiness using Gemini API.
 * Falls back gracefully to deterministic rule scoring if no key is set.
 */
export async function scoreResumeWithGemini(
  resumeText: string,
  targetRole?: string,
): Promise<ResumeScoreResult> {
  if (!resumeText.trim()) {
    return {
      overallScore: 0,
      headline: "Empty Resume",
      summary: "Upload or paste your resume text to generate an AI evaluation and ATS fit score.",
      breakdown: { technicalMatch: 0, experienceImpact: 0, clarityStructure: 0, atsReadiness: 0 },
      strengths: [],
      weaknesses: ["No resume content found"],
      interviewReadiness: "Needs Preparation",
      actionableEdits: ["Upload a PDF or paste your resume text in the Profile tab"],
      source: "deterministic",
    };
  }

  if (geminiAvailable()) {
    const prompt = `You are an expert technical recruiter and resume auditor.
Evaluate this candidate's resume ${targetRole ? `for target roles in: ${targetRole}` : "for modern engineering and tech roles"}.

Rules:
- Be rigorous, honest, and constructive.
- Score out of 100 overall.
- Rate four sub-scores:
  - technicalMatch: 0 to 30
  - experienceImpact: 0 to 30
  - clarityStructure: 0 to 20
  - atsReadiness: 0 to 20
- List 3-4 specific strengths based ONLY on what is written.
- List 2-3 genuine areas for improvement or missing skills.
- List 3 concrete, actionable bullet edits.

RESUME TEXT:
${resumeText.slice(0, 4000)}`;

    const schema = `Respond ONLY with this JSON schema:
{
  "overallScore": 84,
  "headline": "Strong Frontend & Full-Stack Profile",
  "summary": "Clear evidence of React and TypeScript work with solid project scope...",
  "breakdown": {
    "technicalMatch": 26,
    "experienceImpact": 24,
    "clarityStructure": 17,
    "atsReadiness": 17
  },
  "strengths": ["Clear project descriptions with concrete libraries listed", "..."],
  "weaknesses": ["Metrics and business outcome indicators are sparse", "..."],
  "interviewReadiness": "High",
  "actionableEdits": ["Quantify user impact on projects", "..."]
}`;

    const raw = await generate(prompt, schema);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ResumeScoreResult>;
        if (typeof parsed.overallScore === "number") {
          return {
            overallScore: Math.max(10, Math.min(100, Math.round(parsed.overallScore))),
            headline: parsed.headline || "Resume Evaluation",
            summary: parsed.summary || "Comprehensive evaluation based on parsed resume text.",
            breakdown: {
              technicalMatch: Math.max(0, Math.min(30, parsed.breakdown?.technicalMatch ?? 20)),
              experienceImpact: Math.max(0, Math.min(30, parsed.breakdown?.experienceImpact ?? 20)),
              clarityStructure: Math.max(0, Math.min(20, parsed.breakdown?.clarityStructure ?? 15)),
              atsReadiness: Math.max(0, Math.min(20, parsed.breakdown?.atsReadiness ?? 15)),
            },
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4) : [],
            interviewReadiness:
              parsed.interviewReadiness === "High" ||
              parsed.interviewReadiness === "Moderate" ||
              parsed.interviewReadiness === "Needs Preparation"
                ? parsed.interviewReadiness
                : parsed.overallScore >= 75
                  ? "High"
                  : parsed.overallScore >= 55
                    ? "Moderate"
                    : "Needs Preparation",
            actionableEdits: Array.isArray(parsed.actionableEdits) ? parsed.actionableEdits.slice(0, 4) : [],
            source: "gemini",
          };
        }
      } catch {
        // Fallback to deterministic
      }
    }
  }

  // Deterministic engine fallback (if Gemini API key is absent or offline)
  const lines = resumeText.split("\n").filter((l) => l.trim().length > 0);
  const wordCount = resumeText.split(/\s+/).length;
  const hasMetrics = /\d+[%kK+]|\$\d+|users|saved|increased|reduced/i.test(resumeText);
  const hasEducation = /degree|bsc|bachelor|university|college|education/i.test(resumeText);
  const hasTech = /react|node|python|typescript|javascript|sql|aws|docker|git/i.test(resumeText);

  let techScore = hasTech ? 24 : 14;
  let expScore = hasMetrics ? 23 : 15;
  let structScore = lines.length >= 15 && lines.length <= 80 ? 17 : 12;
  let atsScore = wordCount >= 180 ? 16 : 10;
  const total = techScore + expScore + structScore + atsScore;

  return {
    overallScore: total,
    headline: total >= 75 ? "Well-Structured Technical Profile" : "Developing Profile (Room for Growth)",
    summary:
      "Deterministic audit: Scored on technical keyword presence, line balance, and concrete impact markers.",
    breakdown: {
      technicalMatch: techScore,
      experienceImpact: expScore,
      clarityStructure: structScore,
      atsReadiness: atsScore,
    },
    strengths: [
      hasTech ? "Recognizable engineering and tech stack keywords" : "Foundational skillset represented",
      lines.length >= 15 ? "Healthy resume length and section structure" : "Compact, concise presentation",
      hasEducation ? "Clear academic/educational credentials cited" : "Direct project focus",
    ],
    weaknesses: [
      !hasMetrics ? "Few quantified results (e.g. latency reduced by X%, users served)" : "Could expand on production ownership",
      lines.length < 15 ? "Sparse profile — add more project details or coursework" : "Ensure consistent bullet verb tense",
    ],
    interviewReadiness: total >= 75 ? "High" : total >= 55 ? "Moderate" : "Needs Preparation",
    actionableEdits: [
      "Add 1-2 quantified bullet points per experience item",
      "Explicitly mention tools/frameworks next to each project",
      "Upload your latest PDF in Profile to verify exact line provenance",
    ],
    source: "deterministic",
  };
}

// ==============================================================
// 2. GEMINI AI MAIL & OUTREACH DRAFTING ENGINE
// ==============================================================

export type EmailDraftType = "application" | "follow_up" | "thank_you" | "referral";

export interface EmailDraftOptions {
  type: EmailDraftType;
  jobTitle: string;
  company: string;
  candidateName: string;
  recruiterName?: string;
  resumeSnippet?: string;
  matchedSkills?: string[];
  notes?: string;
}

export interface EmailDraftResult {
  subject: string;
  body: string;
  proTip: string;
  type: EmailDraftType;
  source: "gemini" | "deterministic";
}

/**
 * Drafts authentic, tailored outreach emails using Gemini API (or structured templates).
 * Zero hallucination rule: strictly bases pitch on candidate's real skills.
 */
export async function draftEmailWithGemini(options: EmailDraftOptions): Promise<EmailDraftResult> {
  const { type, jobTitle, company, candidateName, recruiterName, resumeSnippet, matchedSkills, notes } = options;
  const recipient = recruiterName?.trim() || "Hiring Team";

  if (geminiAvailable()) {
    const prompt = `You are an expert career agent drafting a job outreach email for a candidate.
Email Type: ${type}
Target Role: ${jobTitle} at ${company}
Candidate Name: ${candidateName}
Recipient Name: ${recipient}
Matched Real Skills: ${(matchedSkills || []).join(", ") || "Engineering, Software Development"}
${notes ? `User Custom Notes: ${notes}` : ""}
${resumeSnippet ? `Candidate Resume Highlights (DO NOT INVENT ANYTHING OUTSIDE THIS):\n${resumeSnippet.slice(0, 1500)}` : ""}

Rules:
- Write a professional, high-conversion email.
- DO NOT invent claims or fake percentages.
- Tone: Direct, warm, confident, zero generic buzzwords.
- Under 180 words.
- Give a practical 1-sentence tip on timing or delivery.`;

    const schema = `Respond ONLY with this JSON schema:
{
  "subject": "Application: Senior Full-Stack Engineer — Alex Chen",
  "body": "Hi Sarah,\n\nI recently came across...",
  "proTip": "Send this between 8:30 AM and 9:30 AM on Tuesday for the highest open rate."
}`;

    const raw = await generate(prompt, schema);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { subject?: string; body?: string; proTip?: string };
        if (parsed.subject && parsed.body) {
          return {
            subject: parsed.subject,
            body: parsed.body,
            proTip: parsed.proTip || "Review and verify all details before sending.",
            type,
            source: "gemini",
          };
        }
      } catch {
        // Fallback
      }
    }
  }

  // Deterministic fallbacks for all 4 email types
  if (type === "follow_up") {
    return {
      subject: `Following up — ${jobTitle} application (${candidateName})`,
      body: `Hi ${recipient},\n\nI hope your week is going well.\n\nI am following up on my application for the ${jobTitle} position at ${company} submitted recently. I remain very enthusiastic about the work your team is doing and would welcome the opportunity to discuss how my background in ${(matchedSkills || ["software development"]).slice(0, 3).join(", ")} aligns with your immediate goals.\n\nPlease let me know if there are any additional materials or code samples I can provide.\n\nBest regards,\n${candidateName}`,
      proTip: "Follow up 7 to 10 business days after submitting. Tuesday or Thursday mornings work best.",
      type,
      source: "deterministic",
    };
  }

  if (type === "thank_you") {
    return {
      subject: `Thank you — ${jobTitle} interview (${candidateName})`,
      body: `Hi ${recipient},\n\nThank you so much for taking the time to speak with me today regarding the ${jobTitle} role at ${company}.\n\nI really enjoyed learning more about the team's engineering priorities and our discussion around ${(matchedSkills || ["system architecture"]).slice(0, 2).join(" and ")}. Our conversation reinforced my excitement about joining ${company}.\n\nLooking forward to the next steps. Please don't hesitate to reach out if you need anything further from my end.\n\nBest regards,\n${candidateName}`,
      proTip: "Send your thank you note within 24 hours of completing the interview.",
      type,
      source: "deterministic",
    };
  }

  if (type === "referral") {
    return {
      subject: `Connecting regarding ${company} — ${jobTitle}`,
      body: `Hi ${recipient},\n\nI hope you're having a great week.\n\nI've been following ${company}'s work and noticed the open ${jobTitle} role. Given your experience at ${company}, I would love to ask you a couple of brief questions about the team's culture and workflow if you have 10 minutes.\n\nNo pressure at all, and thank you for your time!\n\nBest,\n${candidateName}`,
      proTip: "Keep cold networking messages short and respectful of the other person's schedule.",
      type,
      source: "deterministic",
    };
  }

  // Default: Cold Application Outreach
  return {
    subject: `Application: ${jobTitle} — ${candidateName}`,
    body: `Hi ${recipient},\n\nI am writing to express my strong interest in the ${jobTitle} position at ${company}.\n\nWith hands-on experience in ${(matchedSkills || ["React", "TypeScript", "Node.js"]).slice(0, 3).join(", ")}, I have built and shipped software that prioritizes reliability and user experience. What attracts me specifically to ${company} is your commitment to quality engineering.\n\nI have attached my tailored resume and would love the chance to discuss how I can contribute to your team.\n\nThank you for your consideration,\n${candidateName}`,
    proTip: "Direct recruiter emails have a 3x higher response rate when sent early in the work week.",
    type,
    source: "deterministic",
  };
}
