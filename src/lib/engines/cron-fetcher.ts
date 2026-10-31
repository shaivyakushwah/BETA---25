import * as db from "@/lib/repo";
import type { Repo } from "@/lib/repo";
import { SOURCES } from "@/lib/sources";
import { fetchFromSources } from "@/lib/engines/live";
import type { Job } from "@/lib/types";

export interface CronSyncReport {
  ok: boolean;
  message: string;
  imported: number;
  lastRunAt: string;
  nextRunAt: string;
  queriesRun: string[];
}

function titleCompanyKey(job: { title: string; company: string }): string {
  return `${job.title} ${job.company}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * 24-Hour Automated Cron Fetcher:
 * Pulls verified live opportunities from remote networks,
 * deduplicates against already saved listings, and adds new jobs to the candidate board.
 */
export async function executeDailyJobSync(repo: Repo, customQueries?: string[]): Promise<CronSyncReport> {
  const candidate = await db.getCandidate(repo);
  const targetRoles = candidate.targetRoles && candidate.targetRoles.length > 0
    ? candidate.targetRoles
    : ["Software Engineer", "Frontend Developer", "Full Stack Developer", "Data Engineer", "AI Engineer"];

  const queries = customQueries && customQueries.length > 0 ? customQueries : targetRoles.slice(0, 4);
  const sourceIds = SOURCES.map((s) => s.id);

  const existingJobs = await db.listJobs(repo);
  const existingIds = new Set(existingJobs.map((j) => j.id));
  const seenKeys = new Set(existingJobs.map(titleCompanyKey));

  let totalImported = 0;
  const now = new Date();
  const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const q of queries) {
    try {
      const results = await fetchFromSources(sourceIds, q, 4);
      for (const res of results) {
        for (const job of res.jobs) {
          const key = titleCompanyKey(job);
          if (existingIds.has(job.id) || seenKeys.has(key)) continue;

          await db.insertJob(repo, job);
          existingIds.add(job.id);
          seenKeys.add(key);
          totalImported += 1;
        }
      }
    } catch (err) {
      console.warn(`[24h Cron Fetcher] Error querying "${q}":`, err);
    }
  }

  const message = totalImported > 0
    ? `24h Cron Job added ${totalImported} fresh opportunit${totalImported === 1 ? "y" : "ies"} to your list.`
    : "24h Cron Job completed. All live opportunities are already up to date on your board.";

  return {
    ok: true,
    message,
    imported: totalImported,
    lastRunAt: now.toISOString(),
    nextRunAt: nextRun.toISOString(),
    queriesRun: queries,
  };
}
