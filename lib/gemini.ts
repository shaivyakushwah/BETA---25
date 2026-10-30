import type { Job, ResumeLine } from "@/lib/types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function providerStatus(): { available: boolean; model: string; note: string } {
  return {
    available: geminiAvailable(),
    model: MODEL,
    note: geminiAvailable()
      ? `Reasoning assisted by ${MODEL}. Every suggestion is still checked against your resume text.`
      : "Running in local mode: no API key set, so matching uses the deterministic engine. Nothing in the product depends on the network.",
  };
}

async function generate(parts: string, jsonSchemaHint: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${parts}\n\n${jsonSchemaHint}` }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

/**
 * Asks the model which resume lines to highlight.
 *
 * The contract is line numbers only. The model cannot write a sentence, so it
 * cannot invent a claim. Numbers that do not exist are dropped, and the caller
 * shows exactly what was dropped.
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
