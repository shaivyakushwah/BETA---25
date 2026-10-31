import type { Candidate, Job } from "@/lib/types";

export function isProfileReady(candidate: Candidate, resumeText: string): boolean {
  return Boolean(candidate.name.trim() && candidate.location.trim() && candidate.targetRoles.some((role) => role.trim()) && (candidate.headline.trim() || resumeText.trim()));
}

export function profileKey(candidate: Candidate, resumeText: string): string {
  return JSON.stringify([candidate.headline, candidate.location, candidate.seniority, candidate.yearsExperience, candidate.targetRoles, candidate.workModes, candidate.minSalary, resumeText]);
}

export interface JobRanking { jobId: string; score: number; reason: string }

export function normalizeRankings(value: unknown, jobs: Pick<Job, "id">[]): JobRanking[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set(jobs.map((job) => job.id));
  const seen = new Set<string>();
  return value.flatMap((row) => {
    if (!row || typeof row.jobId !== "string" || !ids.has(row.jobId) || seen.has(row.jobId) || typeof row.score !== "number" || !Number.isFinite(row.score) || typeof row.reason !== "string") return [];
    seen.add(row.jobId);
    return [{ jobId: row.jobId, score: Math.max(0, Math.min(100, Math.round(row.score))), reason: row.reason.slice(0, 240) }];
  });
}