/**
 * Synchronous read access to the signed-in person's data, for pages.
 *
 * The data is loaded once per change through a server function (see
 * `useSnapshot`), then pages read it with the same helpers the original app
 * used. Writes go through server functions in `@/app/actions`.
 */
import type { Application, ApplicationEvent, Candidate, Job } from "@/lib/types";
import type { Decision, Snapshot, UpdateProposal } from "@/lib/snapshot";

export type { Decision, UpdateProposal } from "@/lib/snapshot";

let current: Snapshot | null = null;

export function setCurrentSnapshot(snapshot: Snapshot) {
  current = snapshot;
}

export function getCurrentSnapshot(): Snapshot {
  if (!current) throw new Error("Workspace data is not loaded yet");
  return current;
}

export function getCandidate(): Candidate {
  return getCurrentSnapshot().candidate;
}

export function getResumeText(): string {
  return getCurrentSnapshot().resumeText;
}

export function listJobs(): Job[] {
  return getCurrentSnapshot().jobs;
}

export function getJob(id: string): Job | undefined {
  return listJobs().find((j) => j.id === id);
}

export function listDecisions(): Decision[] {
  return getCurrentSnapshot().decisions;
}

export function listApplications(): Application[] {
  return getCurrentSnapshot().applications;
}

export function getApplication(id: number): Application | undefined {
  return listApplications().find((a) => a.id === id);
}

export function findApplicationByJob(jobId: string): Application | undefined {
  return listApplications()
    .filter((a) => a.jobId === jobId)
    .sort((a, b) => b.id - a.id)[0];
}

export function listEvents(applicationId?: number): (ApplicationEvent & { jobId: string })[] {
  const events = getCurrentSnapshot().events;
  return applicationId ? events.filter((e) => e.applicationId === applicationId) : events;
}

export function listProposals(): UpdateProposal[] {
  return getCurrentSnapshot().proposals;
}

export function getProposal(id: number): UpdateProposal | undefined {
  return listProposals().find((p) => p.id === id);
}
