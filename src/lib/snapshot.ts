import type { Application, ApplicationEvent, Candidate, Job } from "@/lib/types";

export interface Decision {
  jobId: string;
  kind: "apply" | "skip" | "maybe";
  reason: string;
}

export interface UpdateProposal {
  id: number;
  raw: string;
  proposedStatus: Application["status"];
  jobHint: string | null;
  confidence: number;
  evidence: string;
  state: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

export interface ServiceStatus {
  aiAvailable: boolean;
  aiModel: string;
  aiNote: string;
  resendAvailable: boolean;
  fromEmail: string;
}

/** Everything one signed-in person owns, loaded in one round trip. */
export interface Snapshot {
  user: { id: string; email: string; name: string };
  candidate: Candidate;
  resumeText: string;
  jobs: Job[];
  decisions: Decision[];
  applications: Application[];
  events: (ApplicationEvent & { jobId: string })[];
  proposals: UpdateProposal[];
  status: ServiceStatus;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toCandidate(r: any): Candidate {
  return {
    id: 1,
    name: r.name ?? "",
    email: r.email ?? "",
    headline: r.headline ?? "",
    location: r.location ?? "",
    seniority: r.seniority,
    yearsExperience: Number(r.years_experience ?? 0),
    targetRoles: Array.isArray(r.target_roles) ? r.target_roles : [],
    workModes: Array.isArray(r.work_modes) ? r.work_modes : [],
    minSalary: r.min_salary ?? null,
    hoursPerWeek: r.hours_per_week ?? 3,
    longShotGoal: r.long_shot_goal ?? null,
  };
}

export function toJob(r: any): Job {
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    companyDomain: r.company_domain,
    companyVerified: Boolean(r.company_verified),
    location: r.location,
    workMode: r.work_mode,
    seniority: r.seniority,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    currency: r.currency,
    description: r.description,
    requirements: Array.isArray(r.requirements) ? r.requirements : [],
    postedAt: r.posted_at,
    expiresAt: r.expires_at,
    repostCount: r.repost_count ?? 0,
    filledDaysAgo: r.filled_days_ago,
    contactEmail: r.contact_email,
    source: r.source,
    sourceUrl: r.source_url,
    takeHome: Boolean(r.take_home),
    coverLetterRequired: Boolean(r.cover_letter_required),
  };
}

export function fromJob(userId: string, job: Job) {
  return {
    user_id: userId,
    id: job.id,
    title: job.title,
    company: job.company,
    company_domain: job.companyDomain ?? null,
    company_verified: Boolean(job.companyVerified),
    location: job.location,
    work_mode: job.workMode,
    seniority: job.seniority,
    salary_min: job.salaryMin ?? null,
    salary_max: job.salaryMax ?? null,
    currency: job.currency ?? "GBP",
    description: job.description,
    requirements: job.requirements as any,
    posted_at: job.postedAt,
    expires_at: job.expiresAt ?? null,
    repost_count: job.repostCount ?? 0,
    filled_days_ago: job.filledDaysAgo ?? null,
    contact_email: job.contactEmail ?? null,
    source: job.source,
    source_url: job.sourceUrl ?? "",
    take_home: Boolean(job.takeHome),
    cover_letter_required: Boolean(job.coverLetterRequired),
  };
}

export function toApplication(r: any): Application {
  return {
    id: Number(r.id),
    jobId: r.job_id,
    status: r.status,
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    draft: r.draft ?? "",
    coverLetter: r.cover_letter ?? "",
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    confirmedAt: r.confirmed_at,
  };
}

export function toProposal(r: any): UpdateProposal {
  return {
    id: Number(r.id),
    raw: r.raw,
    proposedStatus: r.proposed_status,
    jobHint: r.job_hint,
    confidence: Number(r.confidence),
    evidence: r.evidence,
    state: r.state,
    createdAt: r.created_at,
  };
}
