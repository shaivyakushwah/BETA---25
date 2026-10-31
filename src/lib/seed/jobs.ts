import type { Requirement, SeedJob } from "@/lib/types";

export function req(must: string[], nice: string[] = []): Requirement[] {
  return [
    ...must.map((skill) => ({ skill, must: true })),
    ...nice.map((skill) => ({ skill, must: false })),
  ];
}

/**
 * Seed marketplace jobs. Empty by default so only real imported listings exist.
 */
export const SEED_JOBS: SeedJob[] = [];
