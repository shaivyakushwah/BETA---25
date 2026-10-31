import type { Candidate, FitComponent, FitReport, Job, ResumeLine, SkillGap, SkillMatch } from "@/lib/types";
import { adjacencyNote, skillLabel } from "@/lib/skills";
import { findEvidence } from "@/lib/engines/resume";
import type { MarketSnapshot } from "@/lib/engines/market";

const RANK = { intern: 0, junior: 1, mid: 2, senior: 3 } as const;

export function scoreFit(
  candidate: Candidate,
  lines: ResumeLine[],
  candidateSkills: Set<string>,
  job: Job,
  market: MarketSnapshot,
  now: Date = new Date(),
): FitReport {
  const musts = job.requirements.filter((r) => r.must);
  const nices = job.requirements.filter((r) => !r.must);

  const matched: SkillMatch[] = [];
  const gaps: SkillGap[] = [];
  let mustPoints = 0;
  let nicePoints = 0;

  const evaluate = (requirement: { skill: string; must: boolean }): number => {
    const direct = candidateSkills.has(requirement.skill);
    if (direct) {
      matched.push({
        skill: requirement.skill,
        must: requirement.must,
        evidence: findEvidence(lines, requirement.skill),
        via: "direct",
      });
      return 1;
    }
    const note = adjacencyNote(candidateSkills, requirement.skill);
    if (note) {
      matched.push({
        skill: requirement.skill,
        must: requirement.must,
        evidence: null,
        via: "adjacent",
        viaNote: note,
      });
      return 0.4;
    }
    gaps.push({
      skill: requirement.skill,
      must: requirement.must,
      demand: market.demand.get(requirement.skill) ?? 0,
      sample: market.sample,
    });
    return 0;
  };

  for (const requirement of musts) mustPoints += evaluate(requirement);
  for (const requirement of nices) nicePoints += evaluate(requirement);

  const hasMusts = musts.length > 0;
  const mustScore = hasMusts ? (mustPoints / musts.length) * 40 : 0;
  // When a posting does not separate must-haves from nice-to-haves (common for
  // live feeds), weight all of its skills over the full 55 requirement points
  // instead of handing out 40 free points.
  const niceMax = hasMusts ? 15 : 55;
  const niceScore = nices.length ? (nicePoints / nices.length) * niceMax : niceMax;

  const rankGap = RANK[job.seniority] - RANK[candidate.seniority];
  const seniorityPoints = rankGap <= 0 ? 15 : rankGap === 1 ? 8 : 2;

  const modePoints = candidate.workModes.includes(job.workMode) ? 10 : 2;

  const city = candidate.location.split(",")[0].trim().toLowerCase();
  const locationPoints =
    job.workMode === "remote" || job.location.toLowerCase().includes(city) ? 10 : 0;

  const ageDays = (now.getTime() - new Date(job.postedAt).getTime()) / 86_400_000;
  const recencyPoints = ageDays <= 7 ? 10 : ageDays <= 14 ? 7 : ageDays <= 30 ? 4 : 1;

  const components: FitComponent[] = [
    ...(hasMusts
      ? [
          {
            key: "must",
            label: "Must-have skills",
            earned: Math.round(mustScore),
            max: 40,
            note: `${matched.filter((m) => m.must && m.via === "direct").length} of ${musts.length} held directly${
              musts.some((m) => matched.some((x) => x.skill === m.skill && x.via === "adjacent"))
                ? ", plus adjacent credit"
                : ""
            }`,
          },
        ]
      : []),
    {
      key: "nice",
      label: hasMusts ? "Nice-to-have skills" : "Skills the posting mentions",
      earned: Math.round(niceScore),
      max: niceMax,
      note: hasMusts
        ? `${matched.filter((m) => !m.must && m.via === "direct").length} of ${nices.length} held directly`
        : `The posting does not label must-haves, so all ${nices.length} mentioned skill(s) count equally`,
    },
    {
      key: "seniority",
      label: "Level",
      earned: seniorityPoints,
      max: 15,
      note:
        rankGap <= 0
          ? `Advertised at ${job.seniority} level, which matches your target`
          : `Advertised at ${job.seniority} level; you are applying as ${candidate.seniority}`,
    },
    { key: "mode", label: "Working pattern", earned: modePoints, max: 10, note: `${job.workMode} — ${modePoints === 10 ? "one of your preferred patterns" : "not one of your preferred patterns"}` },
    { key: "location", label: "Location", earned: locationPoints, max: 10, note: locationPoints ? job.location : `${job.location} is not where you are, and the role is on-site` },
    { key: "recency", label: "Freshness", earned: recencyPoints, max: 10, note: `Posted ${Math.max(0, Math.round(ageDays))} day(s) ago` },
  ];

  const score = Math.round(components.reduce((total, c) => total + c.earned, 0));

  const directWithEvidence = matched.filter((m) => m.via === "direct" && m.evidence).length;
  const evidenceRatio = job.requirements.length ? directWithEvidence / job.requirements.length : 0;
  const confidence = Math.max(
    0.3,
    Math.min(0.93, 0.34 + evidenceRatio * 0.4 + (lines.length >= 18 ? 0.12 : 0) + (candidate.yearsExperience >= 2 ? 0.07 : 0)),
  );

  const missingMusts = gaps.filter((g) => g.must).map((g) => skillLabel(g.skill));
  const directMentions = matched.filter((m) => m.via === "direct").length;
  const summary = !hasMusts
    ? `The posting does not label must-haves. It mentions ${nices.length} skill(s); ${directMentions} appear in your resume.`
    : missingMusts.length === 0
      ? `You cover every must-have on paper (${matched.filter((m) => m.must).length} of ${musts.length}${musts.some((m) => matched.some((x) => x.skill === m.skill && x.via === "adjacent")) ? ", some by adjacency" : ""}).`
      : `Missing ${missingMusts.length} must-have${missingMusts.length > 1 ? "s" : ""}: ${missingMusts.join(", ")}.`;

  return {
    score,
    confidence,
    components,
    matched,
    gaps,
    summary,
    stretch: rankGap >= 1 || score < 45,
  };
}

/** Rough time the application will take, used by the weekly planner. */
export function estimateMinutes(job: Job): number {
  let minutes = 15;
  minutes += Math.min(job.requirements.length, 8) * 3;
  if (job.coverLetterRequired) minutes += 15;
  if (job.takeHome) minutes += 45;
  if (job.description.length > 1600) minutes += 10;
  return Math.min(120, Math.max(15, minutes));
}
