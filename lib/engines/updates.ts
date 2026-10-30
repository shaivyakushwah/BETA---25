import type { Application, Job } from "@/lib/types";

export interface ParsedUpdate {
  proposedStatus: Application["status"];
  jobHint: string | null;
  confidence: number;
  evidence: string;
  /** What the candidate should check before accepting. */
  reviewNote: string;
  matchedJobTitle: string | null;
}

interface Rule {
  status: Application["status"];
  pattern: RegExp;
  confidence: number;
  label: string;
}

const RULES: Rule[] = [
  {
    status: "offer",
    pattern: /\b(pleased to offer|offer of employment|job offer|offer letter|we would like to offer you)\b/i,
    confidence: 0.94,
    label: "offer language",
  },
  {
    status: "interview",
    pattern: /\b(invite you to (an? )?interview|schedule (an? )?(interview|call)|interview (is|will be) (scheduled|held)|meet the team|next round)\b/i,
    confidence: 0.9,
    label: "an interview invitation",
  },
  {
    status: "rejected",
    pattern: /\b(unfortunately|not (been )?successful|regret to inform|other candidates|will not be progressing|decision not to progress)\b/i,
    confidence: 0.89,
    label: "rejection language",
  },
  {
    status: "screening",
    pattern: /\b(shortlist|shortlisted|next stage|initial (call|conversation)|phone screen|recruiter call|would like to learn more about you)\b/i,
    confidence: 0.72,
    label: "a move to the next stage",
  },
  {
    status: "applied",
    pattern: /\b(thank you for your application|we (have )?received your application|application (has been|was) received|successfully applied)\b/i,
    confidence: 0.82,
    label: "an application acknowledgement",
  },
];

/**
 * Turn a pasted email or message into a *proposal*, never a fact.
 *
 * The candidate confirms. Anything ambiguous stays pending with a low confidence
 * and the exact phrase we used, so a wrong guess is visible rather than silent.
 */
export function parseUpdate(raw: string, jobs: Job[]): ParsedUpdate {
  const text = raw.slice(0, 8000);

  let best: { rule: Rule; match: RegExpMatchArray } | null = null;
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match && (!best || rule.confidence > best.rule.confidence)) best = { rule, match };
  }

  const normalised = text.toLowerCase();
  let matchedJob: Job | null = null;
  for (const job of jobs) {
    if (job.company.length >= 3 && normalised.includes(job.company.toLowerCase())) {
      if (!matchedJob || job.company.length > matchedJob.company.length) matchedJob = job;
    }
  }

  if (!best) {
    return {
      proposedStatus: "applied",
      jobHint: matchedJob?.id ?? null,
      confidence: 0.2,
      evidence: "No status phrase we recognise.",
      reviewNote:
        "We could not tell what this message means. Rather than guess, we left it for you: read it and pick the status yourself.",
      matchedJobTitle: matchedJob ? `${matchedJob.title} at ${matchedJob.company}` : null,
    };
  }

  let confidence = best.rule.confidence;
  if (!matchedJob) confidence = Math.max(0.15, confidence - 0.35);
  if (text.length < 80) confidence = Math.max(0.15, confidence - 0.15);

  const notes: string[] = [];
  if (!matchedJob) notes.push("we could not match it to one of your applications, so pick the right one");
  if (best.rule.status === "applied") notes.push("this may only acknowledge receipt, not progress");
  if (best.rule.status === "screening") notes.push("“next stage” can mean a call or an automated test — check the wording");
  if (confidence < 0.6) notes.push("the wording is ambiguous, so treat this as a suggestion only");

  return {
    proposedStatus: best.rule.status,
    jobHint: matchedJob?.id ?? null,
    confidence,
    evidence: `Matched ${best.rule.label}: “${best.match[0].trim()}”.`,
    reviewNote: notes.length
      ? `Before accepting: ${notes.join("; ")}.`
      : "The wording is clear, but nothing changes in your tracker until you confirm.",
    matchedJobTitle: matchedJob ? `${matchedJob.title} at ${matchedJob.company}` : null,
  };
}

/** What we actually need to read, and what we do not. */
export const UPDATE_INTAKE_GUIDE = [
  "Sender name and domain — to confirm it is the employer, not a lookalike.",
  "Subject line and the first two or three lines — enough to find the decision.",
  "The role name — to attach the update to the right application.",
];

export const UPDATE_INTAKE_AVOID = [
  "Full email threads with salary, address or reference numbers.",
  "Attachments, ID documents, or anything from your inbox we did not ask for.",
  "Your email password. This product does not read your inbox; you paste what you choose.",
];
