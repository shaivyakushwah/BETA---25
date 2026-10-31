import type { Candidate, Job } from "@/lib/types";
import { similarity } from "@/lib/text";
import { skillLabel } from "@/lib/skills";

export type JobFamily =
  | "frontend"
  | "data"
  | "ml"
  | "backend"
  | "platform"
  | "design"
  | "qa"
  | "marketing"
  | "support"
  | "other";

const FAMILY_RULES: { family: JobFamily; pattern: RegExp }[] = [
  { family: "ml", pattern: /machine learning|\bml\b|research assistant|data scientist/i },
  { family: "frontend", pattern: /frontend|front-end|react|web developer|ui developer/i },
  { family: "design", pattern: /designer|\bux\b|ui\/ux|product design/i },
  { family: "qa", pattern: /\bqa\b|quality assurance|test engineer/i },
  { family: "platform", pattern: /devops|platform|site reliability|\bsre\b|infrastructure/i },
  { family: "data", pattern: /data (analyst|intern|engineer|science)|analytics|product analyst|insights|business intelligence|reporting analyst/i },
  { family: "marketing", pattern: /marketing|\bseo\b|content|growth/i },
  { family: "support", pattern: /support|helpdesk|service desk/i },
  { family: "backend", pattern: /backend|back-end|full stack|software engineer|developer/i },
];

export function jobFamily(job: Job): JobFamily {
  for (const rule of FAMILY_RULES) if (rule.pattern.test(job.title)) return rule.family;
  return "other";
}

export const FAMILY_LABEL: Record<JobFamily, string> = {
  frontend: "Frontend",
  data: "Data",
  ml: "Machine learning",
  backend: "Backend",
  platform: "Platform",
  design: "Design",
  qa: "QA",
  marketing: "Marketing",
  support: "Support",
  other: "Other",
};

const ROLE_TO_FAMILIES: Record<string, JobFamily[]> = {
  frontend: ["frontend"],
  data: ["data"],
  backend: ["backend"],
  product: ["design", "data"],
  design: ["design"],
  qa: ["qa"],
  devops: ["platform"],
  ml: ["ml"],
  marketing: ["marketing"],
  support: ["support"],
};

export function candidateFamilies(candidate: Candidate): JobFamily[] {
  const set = new Set<JobFamily>();
  for (const role of candidate.targetRoles) {
    const key = role.toLowerCase();
    for (const [needle, families] of Object.entries(ROLE_TO_FAMILIES)) {
      if (key.includes(needle)) families.forEach((f) => set.add(f));
    }
  }
  return set.size ? [...set] : ["frontend", "data"];
}

export interface MarketSnapshot {
  /** Listings used for advice, after removing copies of the same role. */
  listings: Job[];
  sample: number;
  minSample: number;
  enough: boolean;
  families: JobFamily[];
  demand: Map<string, number>;
  /** Same count, restricted to skills a listing marks as a must-have. */
  mustDemand: Map<string, number>;
  windowDays: number;
  byFamily: Map<JobFamily, number>;
}

/**
 * Collapses duplicate copies so one role cannot inflate a skill's demand.
 * Prefers the verified employer over the agency copy.
 */
export function dedupeForAnalysis(jobs: Job[]): Job[] {
  const ordered = [...jobs].sort(
    (a, b) =>
      Number(b.companyVerified ?? false) - Number(a.companyVerified ?? false) ||
      new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  );
  const kept: Job[] = [];
  for (const job of ordered) {
    if (kept.some((k) => similarity(k.description, job.description) >= 0.7)) continue;
    kept.push(job);
  }
  return kept;
}

const seniorityRank = { intern: 0, junior: 1, mid: 2, senior: 3 } as const;

export function buildMarketSnapshot(
  candidate: Candidate,
  jobs: Job[],
  now: Date = new Date(),
  windowDays = 45,
): MarketSnapshot {
  const families = candidateFamilies(candidate);
  const maxRank = seniorityRank[candidate.seniority] + 1;

  const listings = dedupeForAnalysis(jobs).filter((job) => {
    const family = jobFamily(job);
    if (!families.includes(family)) return false;
    if (seniorityRank[job.seniority] > maxRank) return false;
    const ageDays = (now.getTime() - new Date(job.postedAt).getTime()) / 86_400_000;
    if (ageDays > windowDays) return false;
    if (job.filledDaysAgo !== null && job.filledDaysAgo !== undefined) return false;
    if (job.expiresAt && new Date(job.expiresAt) < now) return false;
    return true;
  });

  const demand = new Map<string, number>();
  const mustDemand = new Map<string, number>();
  const byFamily = new Map<JobFamily, number>();
  for (const job of listings) {
    const family = jobFamily(job);
    byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
    const seen = new Set<string>();
    for (const requirement of job.requirements) {
      if (seen.has(requirement.skill)) continue;
      seen.add(requirement.skill);
      demand.set(requirement.skill, (demand.get(requirement.skill) ?? 0) + 1);
      if (requirement.must) {
        mustDemand.set(requirement.skill, (mustDemand.get(requirement.skill) ?? 0) + 1);
      }
    }
  }

  const minSample = 20;
  return {
    listings,
    sample: listings.length,
    minSample,
    enough: listings.length >= minSample,
    families,
    demand,
    mustDemand,
    windowDays,
    byFamily,
  };
}

export interface LongShotAnalysis {
  goal: string;
  family: JobFamily;
  total: number;
  openToNewGrads: number;
  /** Share of the sampled roles open to interns or juniors. */
  openShare: number;
  /** Share of the most-requested skills that already appear in the resume. */
  skillCoverage: number;
  typicalRequirements: { skill: string; count: number }[];
  missing: string[];
  covered: string[];
  verdict: "keep-going" | "build-skills-first" | "pivot-to-adjacent" | "unrealistic-right-now";
  message: string;
}

/**
 * Answers the "long-shot goal" situation with counts instead of encouragement or
 * discouragement. It never says "give up"; it says what the sampled market shows
 * and what would have to change for the goal to become realistic.
 *
 * Two fixed gates, decided before looking at this candidate:
 *   1. Is the level open? (at least 20% of sampled roles accept interns/juniors)
 *   2. Are the skills there? (at least half the most-requested skills appear in the resume)
 * Level alone is not a fair test: an "open" role is still out of reach if you
 * have none of the tools it asks for, and the message must say which gate failed.
 */
export function analyseLongShot(
  candidate: Candidate,
  goal: string,
  jobs: Job[],
  candidateSkills: Set<string>,
): LongShotAnalysis | null {
  if (!goal) return null;
  const probe: Job = {
    ...jobs[0],
    title: goal,
  };
  const family = jobFamily(probe);
  const all = dedupeForAnalysis(jobs).filter((job) => jobFamily(job) === family);
  if (all.length === 0) return null;

  const openToNewGrads = all.filter((j) => j.seniority === "intern" || j.seniority === "junior").length;
  const counts = new Map<string, number>();
  for (const job of all) {
    for (const r of job.requirements) counts.set(r.skill, (counts.get(r.skill) ?? 0) + 1);
  }
  const typicalRequirements = [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const missing = typicalRequirements
    .filter((r) => !candidateSkills.has(r.skill))
    .map((r) => r.skill);
  const covered = typicalRequirements
    .filter((r) => candidateSkills.has(r.skill))
    .map((r) => r.skill);

  const openShare = openToNewGrads / all.length;
  const skillCoverage = typicalRequirements.length
    ? covered.length / typicalRequirements.length
    : 0;
  const verdict: LongShotAnalysis["verdict"] =
    openShare < 0.2
      ? "unrealistic-right-now"
      : skillCoverage < 0.5
        ? "build-skills-first"
        : openShare < 0.5
          ? "pivot-to-adjacent"
          : "keep-going";

  const pct = Math.round(openShare * 100);
  const familyLabel = FAMILY_LABEL[family].toLowerCase();
  const missingNames = missing.map(skillLabel).join(", ");

  const message =
    verdict === "keep-going"
      ? `Of ${all.length} ${familyLabel} roles, ${openToNewGrads} are open to interns or juniors (${pct}%), and your resume already covers ${covered.length} of the ${typicalRequirements.length} skills they ask for most. Aim at those ${openToNewGrads} first.`
      : verdict === "build-skills-first"
        ? `${openToNewGrads} of ${all.length} ${familyLabel} roles are open to your level (${pct}%), so the level is not what is stopping you. The skills are: ${missingNames} appear in most of these postings and nowhere in your resume. One project that uses ${missing[0] ? skillLabel(missing[0]) : "the most-requested tool"} would change more than another twenty applications.`
        : verdict === "pivot-to-adjacent"
          ? `Only ${openToNewGrads} of ${all.length} ${familyLabel} roles are open to interns or juniors (${pct}%). The realistic path is an adjacent role that uses the same skills, then move across after a year. You would not be giving up the goal; you would be entering it from the side.`
          : `Just ${openToNewGrads} of ${all.length} ${familyLabel} roles are open to interns or juniors (${pct}%). Applying broadly right now would mostly produce silence. The honest options are a longer runway (a research project, a master's, or an open-source track record) or an adjacent entry role.`;

  return {
    goal,
    family,
    total: all.length,
    openToNewGrads,
    openShare,
    skillCoverage,
    typicalRequirements,
    missing,
    covered,
    verdict,
    message,
  };
}
