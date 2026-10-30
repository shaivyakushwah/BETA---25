import { cache } from "react";
import type { Candidate, Job, JobInsight, ResumeLine } from "@/lib/types";
import type { Decision } from "@/lib/db";
import { getCandidate, getResumeText, listDecisions, listJobs, listApplications, applyRetention } from "@/lib/db";
import { assessTrust } from "@/lib/engines/trust";
import { estimateMinutes, scoreFit } from "@/lib/engines/fit";
import { buildMarketSnapshot, type MarketSnapshot } from "@/lib/engines/market";
import { parseResume, candidateSkillSet } from "@/lib/engines/resume";
import { planWeek, type WeeklyPlan } from "@/lib/engines/allocate";

export interface Workspace {
  candidate: Candidate;
  resumeText: string;
  lines: ResumeLine[];
  skills: Set<string>;
  jobs: Job[];
  insights: JobInsight[];
  byId: Map<string, JobInsight>;
  market: MarketSnapshot;
  plan: WeeklyPlan;
  decisions: Map<string, Decision>;
}

export const getWorkspace = cache((): Workspace => {
  applyRetention();
  const candidate = getCandidate();
  const resumeText = getResumeText();
  const lines = parseResume(resumeText);
  const skills = candidateSkillSet(lines);
  const jobs = listJobs();
  const decisions = new Map(listDecisions().map((d) => [d.jobId, d]));
  const market = buildMarketSnapshot(candidate, jobs);
  const now = new Date();

  // Jobs whose application has already been sent must not be suggested again.
  const appliedJobIds = new Set(
    listApplications()
      .filter((application) => application.submittedAt)
      .map((application) => application.jobId),
  );

  const insights: JobInsight[] = jobs.map((job) => {
    const trust = assessTrust(job, jobs, now);
    const fit = scoreFit(candidate, lines, skills, job, market, now);
    const minutes = estimateMinutes(job);
    const decision = decisions.get(job.id) ?? null;
    return {
      job,
      trust,
      fit,
      minutes,
      valuePerHour: minutes > 0 ? (fit.score * (trust.verdict === "clear" ? 1 : trust.verdict === "check" ? 0.85 : 0.5)) / (minutes / 60) : 0,
      decision: decision?.kind ?? null,
      decisionReason: decision?.reason ?? null,
    };
  });

  insights.sort((a, b) => b.fit.score - a.fit.score);

  return {
    candidate,
    resumeText,
    lines,
    skills,
    jobs,
    insights,
    byId: new Map(insights.map((i) => [i.job.id, i])),
    market,
    plan: planWeek(insights, candidate.hoursPerWeek, now, appliedJobIds),
    decisions,
  };
});

export function getInsight(id: string): JobInsight | undefined {
  return getWorkspace().byId.get(id);
}

export function pipelineSummary() {
  const { insights } = getWorkspace();
  return {
    total: insights.length,
    clear: insights.filter((i) => i.trust.verdict === "clear").length,
    check: insights.filter((i) => i.trust.verdict === "check").length,
    doubtful: insights.filter((i) => i.trust.verdict === "doubtful").length,
    closed: insights.filter(
      (i) =>
        (i.job.filledDaysAgo !== null && i.job.filledDaysAgo !== undefined) ||
        Boolean(i.job.expiresAt && new Date(i.job.expiresAt) < new Date()),
    ).length,
  };
}
