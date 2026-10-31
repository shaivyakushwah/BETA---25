import type { EvidenceSuggestion, Job, ResumeLine, SkillMatch } from "@/lib/types";
import { adjacencyNote, skillLabel, skillsIn, SKILL_BY_ID } from "@/lib/skills";

const SECTION_ALIASES: Record<string, string> = {
  summary: "Summary",
  profile: "Summary",
  education: "Education",
  experience: "Experience",
  "work experience": "Experience",
  employment: "Experience",
  skills: "Skills",
  projects: "Projects",
  "what i want": "What I want",
  awards: "Awards",
  certifications: "Certifications",
};

function detectSection(raw: string): string | null {
  const key = raw.toLowerCase().replace(/[^a-z &/]/g, "").trim();
  if (SECTION_ALIASES[key]) return SECTION_ALIASES[key];
  const letters = raw.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters.length <= 30 && letters === letters.toUpperCase()) {
    return raw.trim().replace(/:$/, "");
  }
  return null;
}

/** Line numbers are 1-based against the candidate's original text, so a quote can always be found again. */
export function parseResume(text: string): ResumeLine[] {
  const rows = text.split(/\r?\n/);
  const lines: ResumeLine[] = [];
  let section = "Header";
  rows.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const detected = detectSection(trimmed);
    if (detected) {
      section = detected;
      return;
    }
    lines.push({
      n: index + 1,
      section,
      text: trimmed,
      norm: trimmed.toLowerCase(),
    });
  });
  return lines;
}

const DYNAMIC_SECTIONS = new Set(["Experience", "Projects", "Education"]);

export function candidateSkillSet(lines: ResumeLine[]): Set<string> {
  const text = lines.map((l) => l.text).join("\n");
  return new Set(skillsIn(text));
}

function scoreLine(line: ResumeLine): number {
  let score = 0;
  if (DYNAMIC_SECTIONS.has(line.section)) score += 3;
  if (/\d/.test(line.text)) score += 2;
  if (line.text.length >= 45 && line.text.length <= 180) score += 1;
  if (/^[-•]/.test(line.text)) score += 1;
  return score;
}

const lineSkillsMap = new Map<string, string[]>();

export function getLineSkills(line: ResumeLine): string[] {
  let found = lineSkillsMap.get(line.text);
  if (!found) {
    found = skillsIn(line.text);
    if (lineSkillsMap.size > 1000) lineSkillsMap.clear();
    lineSkillsMap.set(line.text, found);
  }
  return found;
}

/** The best line in the resume that genuinely mentions this skill. */
export function findEvidence(lines: ResumeLine[], skillId: string): { line: number; quote: string } | null {
  const hits = lines.filter((line) => getLineSkills(line).includes(skillId));
  if (hits.length === 0) return null;
  const best = hits.length === 1 ? hits[0] : [...hits].sort((a, b) => scoreLine(b) - scoreLine(a) || a.n - b.n)[0];
  return { line: best.n, quote: best.text };
}

/**
 * Builds "what to highlight" suggestions from matched requirements.
 *
 * The quote is copied verbatim from the resume and validated against the original
 * text by the caller. The system never writes a sentence the candidate did not
 * already write; it only chooses which existing sentence to put in front of a
 * requirement.
 */
export function suggestHighlights(
  resumeText: string,
  lines: ResumeLine[],
  job: Job,
  matched: SkillMatch[],
): { suggestions: EvidenceSuggestion[]; discarded: { quote: string; reason: string }[] } {
  const byLine = new Map<number, EvidenceSuggestion>();
  const discarded: { quote: string; reason: string }[] = [];

  for (const match of matched) {
    let evidence = match.evidence;
    let angle = `Evidence for their “${skillLabel(match.skill)}” requirement`;

    if (!evidence && match.via === "adjacent") {
      const candidateSkills = candidateSkillSet(lines);
      const note = adjacencyNote(candidateSkills, match.skill);
      // Use evidence for the skill the candidate actually has — the one the
      // adjacency note names — never an unrelated matched line.
      const adj = SKILL_BY_ID.get(match.skill)?.adjacent?.find((a) => candidateSkills.has(a.skill))?.skill;
      if (adj) {
        const fallback = findEvidence(lines, adj);
        if (fallback) {
          evidence = fallback;
          angle = `Closest thing you have for “${skillLabel(match.skill)}” — ${note ?? "an adjacent skill"}`;
        }
      }
    }
    if (!evidence) continue;

    const existing = byLine.get(evidence.line);
    if (existing) {
      const label = skillLabel(match.skill);
      if (!existing.forRequirement.includes(label)) {
        existing.forRequirement =
          match.via === "direct"
            ? `${label} + ${existing.forRequirement}`
            : `${existing.forRequirement} + ${label}`;
      }
      if (match.via === "direct") existing.matched = true;
      continue;
    }

    if (!resumeText.includes(evidence.quote)) {
      discarded.push({ quote: evidence.quote, reason: "Not found word-for-word in the stored resume" });
      continue;
    }

    byLine.set(evidence.line, {
      id: `${job.id}:${evidence.line}:${match.skill}`,
      quote: evidence.quote,
      line: evidence.line,
      section: lines.find((l) => l.n === evidence!.line)?.section ?? "Resume",
      forRequirement: skillLabel(match.skill),
      angle,
      matched: match.via === "direct",
    });
  }

  const suggestions = [...byLine.values()]
    .sort((a, b) => Number(b.matched) - Number(a.matched) || a.line - b.line)
    .slice(0, 6);

  return { suggestions, discarded };
}

/**
 * Verifies that model-proposed highlights are actual resume lines.
 * The model is only ever allowed to return line numbers, so this is a cheap,
 * airtight check rather than a text-similarity guess.
 */
export function validateLineNumbers(
  lines: ResumeLine[],
  numbers: number[],
): { valid: ResumeLine[]; rejected: number[] } {
  const byNumber = new Map(lines.map((l) => [l.n, l]));
  const valid: ResumeLine[] = [];
  const rejected: number[] = [];
  for (const n of numbers) {
    const line = byNumber.get(n);
    if (line) valid.push(line);
    else rejected.push(n);
  }
  return { valid, rejected };
}
