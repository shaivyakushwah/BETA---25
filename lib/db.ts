import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Application, ApplicationEvent, Candidate, Job, ResumeLine, WorkMode } from "@/lib/types";
import { DEMO_CANDIDATE, DEMO_RESUME } from "@/lib/seed/candidate";
import { SEED_JOBS } from "@/lib/seed/jobs";

const DATA_DIR = process.env.SHORTLIST_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "shortlist.db");

let db: DatabaseSync | null = null;

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function init(database: DatabaseSync) {
  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS candidate (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      headline TEXT NOT NULL,
      location TEXT NOT NULL,
      seniority TEXT NOT NULL,
      years_experience REAL NOT NULL,
      target_roles TEXT NOT NULL,
      work_modes TEXT NOT NULL,
      min_salary INTEGER,
      hours_per_week INTEGER NOT NULL,
      long_shot_goal TEXT
    );

    CREATE TABLE IF NOT EXISTS resume (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      company_domain TEXT,
      company_verified INTEGER NOT NULL DEFAULT 0,
      location TEXT NOT NULL,
      work_mode TEXT NOT NULL,
      seniority TEXT NOT NULL,
      salary_min INTEGER,
      salary_max INTEGER,
      currency TEXT NOT NULL DEFAULT 'GBP',
      description TEXT NOT NULL,
      requirements TEXT NOT NULL,
      posted_at TEXT NOT NULL,
      expires_at TEXT,
      repost_count INTEGER NOT NULL DEFAULT 0,
      filled_days_ago INTEGER,
      contact_email TEXT,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      take_home INTEGER NOT NULL DEFAULT 0,
      cover_letter_required INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS decision (
      job_id TEXT PRIMARY KEY REFERENCES job(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL REFERENCES job(id),
      status TEXT NOT NULL,
      highlights TEXT NOT NULL DEFAULT '[]',
      draft TEXT NOT NULL DEFAULT '',
      cover_letter TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      submitted_at TEXT,
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS application_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES application(id) ON DELETE CASCADE,
      at TEXT NOT NULL,
      kind TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'candidate',
      confidence REAL NOT NULL DEFAULT 1,
      confirmed INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS update_proposal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw TEXT NOT NULL,
      proposed_status TEXT NOT NULL,
      job_hint TEXT,
      confidence REAL NOT NULL,
      evidence TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'job_seeker',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const seeded = database.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as
    | { value: string }
    | undefined;
  if (seeded) return;

  const now = new Date().toISOString();

  database
    .prepare(
      `INSERT INTO candidate (id, name, email, headline, location, seniority, years_experience, target_roles, work_modes, min_salary, hours_per_week, long_shot_goal)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      DEMO_CANDIDATE.name,
      DEMO_CANDIDATE.email,
      DEMO_CANDIDATE.headline,
      DEMO_CANDIDATE.location,
      DEMO_CANDIDATE.seniority,
      DEMO_CANDIDATE.yearsExperience,
      JSON.stringify(DEMO_CANDIDATE.targetRoles),
      JSON.stringify(DEMO_CANDIDATE.workModes),
      DEMO_CANDIDATE.minSalary,
      DEMO_CANDIDATE.hoursPerWeek,
      DEMO_CANDIDATE.longShotGoal,
    );

  database
    .prepare("INSERT INTO resume (candidate_id, text, created_at) VALUES (1, ?, ?)")
    .run(DEMO_RESUME, now);

  const insertJob = database.prepare(
    `INSERT INTO job (id, title, company, company_domain, company_verified, location, work_mode, seniority,
      salary_min, salary_max, currency, description, requirements, posted_at, expires_at, repost_count,
      filled_days_ago, contact_email, source, source_url, take_home, cover_letter_required)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const job of SEED_JOBS) {
    insertJob.run(
      job.id,
      job.title,
      job.company,
      job.companyDomain ?? null,
      job.companyVerified ? 1 : 0,
      job.location,
      job.workMode,
      job.seniority,
      job.salaryMin ?? null,
      job.salaryMax ?? null,
      job.currency ?? "GBP",
      job.description,
      JSON.stringify(job.requirements),
      iso(job.postedDaysAgo),
      job.expiresInDays === undefined || job.expiresInDays === null ? null : iso(-job.expiresInDays),
      job.repostCount ?? 0,
      job.filledDaysAgo ?? null,
      job.contactEmail ?? null,
      job.source ?? "Seed board",
      job.sourceUrl ?? `https://example.com/jobs/${job.id}`,
      job.takeHome ? 1 : 0,
      job.coverLetterRequired ? 1 : 0,
    );
  }

  database.prepare("INSERT INTO meta (key, value) VALUES ('seeded', ?)").run(new Date().toISOString());
}

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  const database = new DatabaseSync(DB_PATH);
  database.exec("PRAGMA foreign_keys = ON;");
  init(database);
  db = database;
  return database;
}

/**
 * Removes personal data but keeps the public listings, so the product stays usable
 * with a blank profile. The meta flag prevents the demo seed from reappearing.
 */
export function resetDatabase() {
  const database = getDb();
  database.exec(`
    DELETE FROM application_event;
    DELETE FROM application;
    DELETE FROM update_proposal;
    DELETE FROM decision;
    DELETE FROM resume;
    DELETE FROM candidate;
  `);
  database
    .prepare(
      `INSERT INTO candidate (id, name, email, headline, location, seniority, years_experience, target_roles, work_modes, min_salary, hours_per_week, long_shot_goal)
       VALUES (1, '', '', '', '', 'junior', 0, '[]', '["hybrid","remote"]', NULL, 3, NULL)`,
    )
    .run();
  database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', 'kept-after-delete')").run();
}

function rows<T>(sql: string, ...params: (string | number | null)[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...params) as unknown as T[];
}

function row<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
  return getDb()
    .prepare(sql)
    .get(...params) as unknown as T | undefined;
}

export function getCandidate(): Candidate {
  const record = row<{
    id: number;
    name: string;
    email: string;
    headline: string;
    location: string;
    seniority: Candidate["seniority"];
    years_experience: number;
    target_roles: string;
    work_modes: string;
    min_salary: number | null;
    hours_per_week: number;
    long_shot_goal: string | null;
  }>("SELECT * FROM candidate WHERE id = 1");
  if (!record) throw new Error("Candidate not initialised");
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    headline: record.headline,
    location: record.location,
    seniority: record.seniority,
    yearsExperience: record.years_experience,
    targetRoles: JSON.parse(record.target_roles),
    workModes: JSON.parse(record.work_modes) as WorkMode[],
    minSalary: record.min_salary,
    hoursPerWeek: record.hours_per_week,
    longShotGoal: record.long_shot_goal,
  };
}

export function updateCandidate(patch: Partial<Candidate>) {
  const current = getCandidate();
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE candidate SET name = ?, email = ?, headline = ?, location = ?, seniority = ?, years_experience = ?,
        target_roles = ?, work_modes = ?, min_salary = ?, hours_per_week = ?, long_shot_goal = ? WHERE id = 1`,
    )
    .run(
      next.name,
      next.email,
      next.headline,
      next.location,
      next.seniority,
      next.yearsExperience,
      JSON.stringify(next.targetRoles),
      JSON.stringify(next.workModes),
      next.minSalary ?? null,
      next.hoursPerWeek,
      next.longShotGoal ?? null,
    );
}

export function getResumeText(): string {
  const record = row<{ text: string }>("SELECT text FROM resume WHERE candidate_id = 1 ORDER BY id DESC LIMIT 1");
  return record?.text ?? "";
}

export function saveResume(text: string) {
  getDb().prepare("INSERT INTO resume (candidate_id, text, created_at) VALUES (1, ?, ?)").run(text, new Date().toISOString());
}

interface JobRecord {
  id: string;
  title: string;
  company: string;
  company_domain: string | null;
  company_verified: number;
  location: string;
  work_mode: WorkMode;
  seniority: Job["seniority"];
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  description: string;
  requirements: string;
  posted_at: string;
  expires_at: string | null;
  repost_count: number;
  filled_days_ago: number | null;
  contact_email: string | null;
  source: string;
  source_url: string;
  take_home: number;
  cover_letter_required: number;
}

function toJob(record: JobRecord): Job {
  return {
    id: record.id,
    title: record.title,
    company: record.company,
    companyDomain: record.company_domain,
    companyVerified: Boolean(record.company_verified),
    location: record.location,
    workMode: record.work_mode,
    seniority: record.seniority,
    salaryMin: record.salary_min,
    salaryMax: record.salary_max,
    currency: record.currency,
    description: record.description,
    requirements: JSON.parse(record.requirements),
    postedAt: record.posted_at,
    expiresAt: record.expires_at,
    repostCount: record.repost_count,
    filledDaysAgo: record.filled_days_ago,
    contactEmail: record.contact_email,
    source: record.source,
    sourceUrl: record.source_url,
    takeHome: Boolean(record.take_home),
    coverLetterRequired: Boolean(record.cover_letter_required),
  };
}

export function listJobs(): Job[] {
  return rows<JobRecord>("SELECT * FROM job ORDER BY posted_at DESC").map(toJob);
}

export function getJob(id: string): Job | undefined {
  const record = row<JobRecord>("SELECT * FROM job WHERE id = ?", id);
  return record ? toJob(record) : undefined;
}

export function insertJob(job: Job) {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO job (id, title, company, company_domain, company_verified, location, work_mode, seniority,
        salary_min, salary_max, currency, description, requirements, posted_at, expires_at, repost_count,
        filled_days_ago, contact_email, source, source_url, take_home, cover_letter_required)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      job.id,
      job.title,
      job.company,
      job.companyDomain ?? null,
      job.companyVerified ? 1 : 0,
      job.location,
      job.workMode,
      job.seniority,
      job.salaryMin ?? null,
      job.salaryMax ?? null,
      job.currency ?? "GBP",
      job.description,
      JSON.stringify(job.requirements),
      job.postedAt,
      job.expiresAt ?? null,
      job.repostCount ?? 0,
      job.filledDaysAgo ?? null,
      job.contactEmail ?? null,
      job.source,
      job.sourceUrl,
      job.takeHome ? 1 : 0,
      job.coverLetterRequired ? 1 : 0,
    );
}

export interface Decision {
  jobId: string;
  kind: "apply" | "skip" | "maybe";
  reason: string;
}

export function listDecisions(): Decision[] {
  const records = rows<{ job_id: string; kind: Decision["kind"]; reason: string }>("SELECT * FROM decision");
  return records.map((r) => ({ jobId: r.job_id, kind: r.kind, reason: r.reason }));
}

export function setDecision(jobId: string, kind: Decision["kind"] | null, reason = "") {
  if (kind === null) {
    getDb().prepare("DELETE FROM decision WHERE job_id = ?").run(jobId);
    return;
  }
  getDb()
    .prepare(
      "INSERT INTO decision (job_id, kind, reason, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(job_id) DO UPDATE SET kind = excluded.kind, reason = excluded.reason, created_at = excluded.created_at",
    )
    .run(jobId, kind, reason, new Date().toISOString());
}

interface ApplicationRecord {
  id: number;
  job_id: string;
  status: Application["status"];
  highlights: string;
  draft: string;
  cover_letter: string;
  created_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
}

function toApplication(record: ApplicationRecord): Application {
  return {
    id: record.id,
    jobId: record.job_id,
    status: record.status,
    highlights: JSON.parse(record.highlights),
    draft: record.draft,
    coverLetter: record.cover_letter,
    createdAt: record.created_at,
    submittedAt: record.submitted_at,
    confirmedAt: record.confirmed_at,
  };
}

export function listApplications(): Application[] {
  return rows<ApplicationRecord>("SELECT * FROM application ORDER BY created_at DESC").map(toApplication);
}

export function getApplication(id: number): Application | undefined {
  const record = row<ApplicationRecord>("SELECT * FROM application WHERE id = ?", id);
  return record ? toApplication(record) : undefined;
}

export function findApplicationByJob(jobId: string): Application | undefined {
  const record = row<ApplicationRecord>(
    "SELECT * FROM application WHERE job_id = ? ORDER BY id DESC LIMIT 1",
    jobId,
  );
  return record ? toApplication(record) : undefined;
}

export function createApplication(jobId: string): Application {
  const existing = findApplicationByJob(jobId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const result = getDb()
    .prepare(
      "INSERT INTO application (job_id, status, highlights, draft, cover_letter, created_at) VALUES (?, 'drafting', '[]', '', '', ?)",
    )
    .run(jobId, now);
  return getApplication(Number(result.lastInsertRowid))!;
}

export function updateApplication(
  id: number,
  patch: Partial<Pick<Application, "status" | "highlights" | "draft" | "coverLetter" | "submittedAt" | "confirmedAt">>,
) {
  const current = getApplication(id);
  if (!current) throw new Error("Application not found");
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      "UPDATE application SET status = ?, highlights = ?, draft = ?, cover_letter = ?, submitted_at = ?, confirmed_at = ? WHERE id = ?",
    )
    .run(
      next.status,
      JSON.stringify(next.highlights),
      next.draft,
      next.coverLetter,
      next.submittedAt,
      next.confirmedAt,
      id,
    );
}

export function listEvents(applicationId?: number): (ApplicationEvent & { jobId: string })[] {
  const sql = applicationId
    ? `SELECT e.*, a.job_id FROM application_event e JOIN application a ON a.id = e.application_id WHERE e.application_id = ? ORDER BY e.at DESC`
    : `SELECT e.*, a.job_id FROM application_event e JOIN application a ON a.id = e.application_id ORDER BY e.at DESC`;
  const records = rows<{
    id: number;
    application_id: number;
    at: string;
    kind: string;
    note: string;
    source: ApplicationEvent["source"];
    confidence: number;
    confirmed: number;
    job_id: string;
  }>(sql, ...(applicationId ? [applicationId] : []));
  return records.map((r) => ({
    id: r.id,
    applicationId: r.application_id,
    at: r.at,
    kind: r.kind,
    note: r.note,
    source: r.source,
    confidence: r.confidence,
    confirmed: Boolean(r.confirmed),
    jobId: r.job_id,
  }));
}

export function addEvent(event: {
  applicationId: number;
  kind: string;
  note: string;
  source?: ApplicationEvent["source"];
  confidence?: number;
  confirmed?: boolean;
  at?: string;
}) {
  getDb()
    .prepare(
      "INSERT INTO application_event (application_id, at, kind, note, source, confidence, confirmed) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      event.applicationId,
      event.at ?? new Date().toISOString(),
      event.kind,
      event.note,
      event.source ?? "candidate",
      event.confidence ?? 1,
      event.confirmed === false ? 0 : 1,
    );
}

export function deleteApplicationEvents(applicationId: number) {
  getDb().prepare("DELETE FROM application_event WHERE application_id = ?").run(applicationId);
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

export function listProposals(): UpdateProposal[] {
  const records = rows<{
    id: number;
    raw: string;
    proposed_status: Application["status"];
    job_hint: string | null;
    confidence: number;
    evidence: string;
    state: UpdateProposal["state"];
    created_at: string;
  }>("SELECT * FROM update_proposal ORDER BY created_at DESC");
  return records.map((r) => ({
    id: r.id,
    raw: r.raw,
    proposedStatus: r.proposed_status,
    jobHint: r.job_hint,
    confidence: r.confidence,
    evidence: r.evidence,
    state: r.state,
    createdAt: r.created_at,
  }));
}

export function getProposal(id: number): UpdateProposal | undefined {
  return listProposals().find((p) => p.id === id);
}

export function addProposal(proposal: {
  raw: string;
  proposedStatus: Application["status"];
  jobHint: string | null;
  confidence: number;
  evidence: string;
}) {
  getDb()
    .prepare(
      "INSERT INTO update_proposal (raw, proposed_status, job_hint, confidence, evidence, state, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
    )
    .run(
      proposal.raw,
      proposal.proposedStatus,
      proposal.jobHint,
      proposal.confidence,
      proposal.evidence,
      new Date().toISOString(),
    );
}

export function resolveProposal(id: number, state: "accepted" | "dismissed") {
  getDb().prepare("UPDATE update_proposal SET state = ? WHERE id = ?").run(state, id);
}

export function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    candidate: getCandidate(),
    resume: getResumeText(),
    applications: listApplications(),
    events: listEvents(),
    decisions: listDecisions(),
    proposals: listProposals(),
  };
}

/**
 * The retention policy, actually executed. Runs at most once a day.
 *
 * - pasted messages: deleted after 90 days
 * - draft text: cleared after 365 days without activity (the status record stays)
 * - listings: dropped after 120 days unless an application refers to them
 */
export function applyRetention() {
  const database = getDb();
  const last = row<{ value: string }>("SELECT value FROM meta WHERE key = 'retention'");
  if (last && Date.now() - new Date(last.value).getTime() < 86_400_000) return;

  const now = Date.now();
  const cutoff90 = new Date(now - 90 * 86_400_000).toISOString();
  const cutoff120 = new Date(now - 120 * 86_400_000).toISOString();
  const cutoff365 = new Date(now - 365 * 86_400_000).toISOString();

  database.prepare("DELETE FROM update_proposal WHERE created_at < ?").run(cutoff90);
  database
    .prepare(
      `UPDATE application SET draft = '', cover_letter = ''
       WHERE id IN (
         SELECT a.id FROM application a
         LEFT JOIN application_event e ON e.application_id = a.id
         GROUP BY a.id
         HAVING MAX(COALESCE(e.at, a.submitted_at, a.created_at)) < ?
       )`,
    )
    .run(cutoff365);
  database
    .prepare("DELETE FROM job WHERE posted_at < ? AND id NOT IN (SELECT job_id FROM application)")
    .run(cutoff120);
  database
    .prepare("INSERT INTO meta (key, value) VALUES ('retention', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(new Date().toISOString());
}

export type { ResumeLine };
