/**
 * Data access for one signed-in person. Every call takes the request's
 * authenticated client, so row-level security limits it to that person's rows.
 * Used only inside server function handlers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Application, Candidate, Job } from "@/lib/types";
import {
  fromJob,
  toApplication,
  toCandidate,
  toJob,
  toProposal,
  type Decision,
  type ServiceStatus,
  type Snapshot,
} from "@/lib/snapshot";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Repo {
  sb: SupabaseClient<any>;
  uid: string;
  email: string;
  name: string;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function ensureCandidate(repo: Repo) {
  const existing = check(await repo.sb.from("candidates").select("*").eq("user_id", repo.uid).maybeSingle());
  if (existing) return existing;
  return check(
    await repo.sb
      .from("candidates")
      .insert({ user_id: repo.uid, name: repo.name, email: repo.email })
      .select("*")
      .single(),
  );
}

/**
 * The retention policy, actually executed. Runs at most once a day per person.
 * - pasted messages: deleted after 90 days
 * - draft text: cleared after 365 days without activity (the status record stays)
 * - listings: dropped after 120 days unless an application refers to them
 */
async function applyRetention(repo: Repo, candidateRow: any) {
  const last = candidateRow.retention_at ? new Date(candidateRow.retention_at).getTime() : 0;
  if (Date.now() - last < 86_400_000) return;
  const now = Date.now();
  const cutoff90 = new Date(now - 90 * 86_400_000).toISOString();
  const cutoff120 = new Date(now - 120 * 86_400_000).toISOString();
  const cutoff365 = now - 365 * 86_400_000;

  await repo.sb.from("update_proposals").delete().eq("user_id", repo.uid).lt("created_at", cutoff90);

  const apps = check(await repo.sb.from("applications").select("id, job_id, created_at, submitted_at").eq("user_id", repo.uid)) ?? [];
  const events = check(await repo.sb.from("application_events").select("application_id, at").eq("user_id", repo.uid)) ?? [];
  const stale = apps.filter((a: any) => {
    const times = events.filter((e: any) => e.application_id === a.id).map((e: any) => new Date(e.at).getTime());
    const lastActivity = times.length ? Math.max(...times) : new Date(a.submitted_at ?? a.created_at).getTime();
    return lastActivity < cutoff365;
  });
  if (stale.length) {
    await repo.sb
      .from("applications")
      .update({ draft: "", cover_letter: "" })
      .in("id", stale.map((a: any) => a.id));
  }

  const referenced = new Set(apps.map((a: any) => a.job_id));
  const oldJobs = check(await repo.sb.from("jobs").select("id").eq("user_id", repo.uid).lt("posted_at", cutoff120)) ?? [];
  const drop = oldJobs.map((j: any) => j.id).filter((id: string) => !referenced.has(id));
  if (drop.length) await repo.sb.from("jobs").delete().eq("user_id", repo.uid).in("id", drop);

  await repo.sb.from("candidates").update({ retention_at: new Date().toISOString() }).eq("user_id", repo.uid);
}

export async function loadSnapshot(repo: Repo, status: ServiceStatus): Promise<Snapshot> {
  const candidateRow = await ensureCandidate(repo);
  await applyRetention(repo, candidateRow);
  const sb = repo.sb;
  const [resume, jobs, decisions, applications, events, proposals] = await Promise.all([
    sb.from("resumes").select("text").eq("user_id", repo.uid).order("id", { ascending: false }).limit(1).maybeSingle(),
    sb.from("jobs").select("*").eq("user_id", repo.uid).order("posted_at", { ascending: false }).limit(5000),
    sb.from("decisions").select("*").eq("user_id", repo.uid),
    sb.from("applications").select("*").eq("user_id", repo.uid).order("created_at", { ascending: false }),
    sb.from("application_events").select("*").eq("user_id", repo.uid).order("at", { ascending: false }),
    sb.from("update_proposals").select("*").eq("user_id", repo.uid).order("created_at", { ascending: false }),
  ]);
  const apps = (check(applications) ?? []).map(toApplication);
  const jobByApp = new Map(apps.map((a) => [a.id, a.jobId]));
  return {
    user: { id: repo.uid, email: repo.email, name: repo.name },
    candidate: toCandidate(candidateRow),
    resumeText: (check(resume) as any)?.text ?? "",
    jobs: (check(jobs) ?? []).map(toJob),
    decisions: (check(decisions) ?? []).map((r: any) => ({ jobId: r.job_id, kind: r.kind, reason: r.reason })),
    applications: apps,
    events: (check(events) ?? []).map((r: any) => ({
      id: Number(r.id),
      applicationId: Number(r.application_id),
      at: r.at,
      kind: r.kind,
      note: r.note,
      source: r.source,
      confidence: Number(r.confidence),
      confirmed: Boolean(r.confirmed),
      jobId: jobByApp.get(Number(r.application_id)) ?? "",
    })),
    proposals: (check(proposals) ?? []).map(toProposal),
    status,
  };
}

export async function getCandidate(repo: Repo): Promise<Candidate> {
  return toCandidate(await ensureCandidate(repo));
}

export async function updateCandidate(repo: Repo, patch: Partial<Candidate>) {
  const current = await getCandidate(repo);
  const next = { ...current, ...patch };
  check(
    await repo.sb
      .from("candidates")
      .update({
        name: next.name,
        email: next.email,
        headline: next.headline,
        location: next.location,
        seniority: next.seniority,
        years_experience: next.yearsExperience,
        target_roles: next.targetRoles,
        work_modes: next.workModes,
        min_salary: next.minSalary ?? null,
        hours_per_week: next.hoursPerWeek,
        long_shot_goal: next.longShotGoal ?? null,
      })
      .eq("user_id", repo.uid),
  );
}

export async function getResumeText(repo: Repo): Promise<string> {
  const row = check(
    await repo.sb.from("resumes").select("text").eq("user_id", repo.uid).order("id", { ascending: false }).limit(1).maybeSingle(),
  ) as any;
  return row?.text ?? "";
}

export async function saveResume(repo: Repo, text: string) {
  check(await repo.sb.from("resumes").insert({ user_id: repo.uid, text }));
}

export async function listJobs(repo: Repo): Promise<Job[]> {
  return (check(await repo.sb.from("jobs").select("*").eq("user_id", repo.uid).order("posted_at", { ascending: false }).limit(5000)) ?? []).map(toJob);
}

export async function getJob(repo: Repo, id: string): Promise<Job | undefined> {
  const row = check(await repo.sb.from("jobs").select("*").eq("user_id", repo.uid).eq("id", id).maybeSingle());
  return row ? toJob(row) : undefined;
}

export async function insertJob(repo: Repo, job: Job) {
  check(await repo.sb.from("jobs").upsert(fromJob(repo.uid, job)));
}

export async function setDecision(repo: Repo, jobId: string, kind: Decision["kind"] | null, reason = "") {
  if (kind === null) {
    check(await repo.sb.from("decisions").delete().eq("user_id", repo.uid).eq("job_id", jobId));
    return;
  }
  check(
    await repo.sb
      .from("decisions")
      .upsert({ user_id: repo.uid, job_id: jobId, kind, reason, created_at: new Date().toISOString() }),
  );
}

export async function getApplication(repo: Repo, id: number): Promise<Application | undefined> {
  const row = check(await repo.sb.from("applications").select("*").eq("user_id", repo.uid).eq("id", id).maybeSingle());
  return row ? toApplication(row) : undefined;
}

export async function findApplicationByJob(repo: Repo, jobId: string): Promise<Application | undefined> {
  const row = check(
    await repo.sb
      .from("applications")
      .select("*")
      .eq("user_id", repo.uid)
      .eq("job_id", jobId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  return row ? toApplication(row) : undefined;
}

export async function createApplication(repo: Repo, jobId: string): Promise<Application> {
  const existing = await findApplicationByJob(repo, jobId);
  if (existing) return existing;
  const row = check(
    await repo.sb
      .from("applications")
      .insert({ user_id: repo.uid, job_id: jobId, status: "drafting" })
      .select("*")
      .single(),
  );
  return toApplication(row);
}

export async function updateApplication(
  repo: Repo,
  id: number,
  patch: Partial<Pick<Application, "status" | "highlights" | "draft" | "coverLetter" | "submittedAt" | "confirmedAt">>,
) {
  const current = await getApplication(repo, id);
  if (!current) throw new Error("Application not found");
  const next = { ...current, ...patch };
  check(
    await repo.sb
      .from("applications")
      .update({
        status: next.status,
        highlights: next.highlights as any,
        draft: next.draft,
        cover_letter: next.coverLetter,
        submitted_at: next.submittedAt,
        confirmed_at: next.confirmedAt,
      })
      .eq("user_id", repo.uid)
      .eq("id", id),
  );
}

export async function addEvent(
  repo: Repo,
  event: {
    applicationId: number;
    kind: string;
    note: string;
    source?: "candidate" | "email" | "portal" | "system";
    confidence?: number;
    confirmed?: boolean;
    at?: string;
  },
) {
  check(
    await repo.sb.from("application_events").insert({
      user_id: repo.uid,
      application_id: event.applicationId,
      at: event.at ?? new Date().toISOString(),
      kind: event.kind,
      note: event.note,
      source: event.source ?? "candidate",
      confidence: event.confidence ?? 1,
      confirmed: event.confirmed !== false,
    }),
  );
}

export async function deleteApplicationEvents(repo: Repo, applicationId: number) {
  check(await repo.sb.from("application_events").delete().eq("user_id", repo.uid).eq("application_id", applicationId));
}

export async function addProposal(
  repo: Repo,
  p: { raw: string; proposedStatus: Application["status"]; jobHint: string | null; confidence: number; evidence: string },
) {
  check(
    await repo.sb.from("update_proposals").insert({
      user_id: repo.uid,
      raw: p.raw,
      proposed_status: p.proposedStatus,
      job_hint: p.jobHint,
      confidence: p.confidence,
      evidence: p.evidence,
    }),
  );
}

export async function getProposal(repo: Repo, id: number) {
  const row = check(await repo.sb.from("update_proposals").select("*").eq("user_id", repo.uid).eq("id", id).maybeSingle());
  return row ? toProposal(row) : undefined;
}

export async function resolveProposal(repo: Repo, id: number, state: "accepted" | "dismissed") {
  check(await repo.sb.from("update_proposals").update({ state }).eq("user_id", repo.uid).eq("id", id));
}

/** Removes personal data but keeps the listings, so the product stays usable with a blank profile. */
export async function resetDatabase(repo: Repo) {
  const sb = repo.sb;
  check(await sb.from("application_events").delete().eq("user_id", repo.uid));
  check(await sb.from("applications").delete().eq("user_id", repo.uid));
  check(await sb.from("update_proposals").delete().eq("user_id", repo.uid));
  check(await sb.from("decisions").delete().eq("user_id", repo.uid));
  check(await sb.from("resumes").delete().eq("user_id", repo.uid));
  check(
    await sb
      .from("candidates")
      .update({
        name: "",
        email: "",
        headline: "",
        location: "",
        seniority: "junior",
        years_experience: 0,
        target_roles: [],
        work_modes: ["hybrid", "remote"],
        min_salary: null,
        hours_per_week: 3,
        long_shot_goal: null,
      })
      .eq("user_id", repo.uid),
  );
}

export function exportFrom(snapshot: Snapshot) {
  return {
    exportedAt: new Date().toISOString(),
    candidate: snapshot.candidate,
    resume: snapshot.resumeText,
    applications: snapshot.applications,
    events: snapshot.events,
    decisions: snapshot.decisions,
    proposals: snapshot.proposals,
  };
}
