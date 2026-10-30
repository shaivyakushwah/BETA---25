"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  addEvent,
  addProposal,
  createApplication,
  deleteApplicationEvents,
  findApplicationByJob,
  getApplication,
  getCandidate,
  getJob,
  getProposal,
  insertJob,
  listJobs,
  resetDatabase,
  resolveProposal,
  saveResume,
  setDecision,
  updateApplication,
  updateCandidate,
  exportAll,
} from "@/lib/db";
import type { Application, EvidenceSuggestion } from "@/lib/types";
import { parseUpdate } from "@/lib/engines/updates";
import { fetchFromSources } from "@/lib/engines/live";
import { SOURCES } from "@/lib/sources";
import { suggestHighlights, validateLineNumbers } from "@/lib/engines/resume";
import { skillsIn } from "@/lib/skills";
import { selectHighlightLines, geminiAvailable } from "@/lib/gemini";
import { getWorkspace } from "@/lib/insights";

export async function decideAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  if (!jobId || !["apply", "skip", "maybe"].includes(kind)) return;
  setDecision(jobId, kind as "apply" | "skip" | "maybe", String(formData.get("reason") ?? ""));
  refresh();
}

export async function clearDecisionAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  setDecision(jobId, null);
  refresh();
}

export async function startApplicationAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  setDecision(jobId, "apply", "Started an application");
  const application = createApplication(jobId);
  redirect(`/apply/${application.id}`);
}

export async function saveDraftAction(input: {
  applicationId: number;
  draft: string;
  coverLetter: string;
  catalog: EvidenceSuggestion[];
  selectedIds: string[];
}) {
  const selected = new Set(input.selectedIds);
  const highlights = input.catalog.map((item) => ({ ...item, selected: selected.has(item.id) }));
  updateApplication(input.applicationId, {
    draft: input.draft,
    coverLetter: input.coverLetter,
    highlights,
    status: input.draft.trim().length > 0 ? "ready" : "drafting",
  });
  refresh();
  return { savedAt: new Date().toISOString() };
}

export interface SubmitState {
  ok: boolean;
  message: string;
}

export async function recordSubmissionAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const applicationId = Number(formData.get("applicationId"));
  const typed = String(formData.get("confirm") ?? "").trim();
  const acknowledged = formData.get("acknowledged") === "on";

  const application = getApplication(applicationId);
  if (!application) return { ok: false, message: "That application no longer exists." };

  // Persist whatever is in the editor first, so the recorded draft is the one the
  // candidate actually approved — not a stale copy from the last save.
  const draft = String(formData.get("draft") ?? application.draft);
  const coverLetter = String(formData.get("coverLetter") ?? application.coverLetter);
  const selected = new Set(formData.getAll("selected").map(String));
  let catalog: EvidenceSuggestion[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("catalog") ?? "[]"));
    if (Array.isArray(parsed)) catalog = parsed as EvidenceSuggestion[];
  } catch {
    catalog = application.highlights;
  }
  const highlights = catalog.length
    ? catalog.map((item) => ({ ...item, selected: selected.has(item.id) }))
    : application.highlights.map((item) => ({ ...item, selected: selected.has(item.id) }));

  if (application.submittedAt) return { ok: false, message: "This application is already recorded as sent." };
  if (!acknowledged) return { ok: false, message: "Tick the box to confirm you checked what you are sending." };
  if (typed !== "SUBMIT") return { ok: false, message: "Type SUBMIT exactly to confirm." };
  if (draft.trim().length < 40)
    return { ok: false, message: "The draft is empty. Write at least a few lines before recording it." };

  const now = new Date().toISOString();
  updateApplication(applicationId, {
    draft,
    coverLetter,
    highlights,
    status: "applied",
    submittedAt: now,
    confirmedAt: now,
  });
  addEvent({
    applicationId,
    kind: "applied",
    note: "Candidate confirmed they sent this application themselves",
    source: "candidate",
    confidence: 1,
  });
  refresh();
  return { ok: true, message: "Recorded. Your pipeline and results page now use this date." };
}

export async function setStatusAction(formData: FormData) {
  const applicationId = Number(formData.get("applicationId"));
  const status = String(formData.get("status") ?? "") as Application["status"];
  const note = String(formData.get("note") ?? "");
  const allowed: Application["status"][] = [
    "drafting",
    "ready",
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
    "ghosted",
  ];
  if (!allowed.includes(status)) return;
  updateApplication(applicationId, { status });
  addEvent({ applicationId, kind: status, note: note || `Marked ${status} by candidate`, source: "candidate" });
  refresh();
}

export async function withdrawAction(formData: FormData) {
  const applicationId = Number(formData.get("applicationId"));
  updateApplication(applicationId, { status: "withdrawn" });
  addEvent({ applicationId, kind: "withdrawn", note: "Withdrawn by candidate", source: "candidate" });
  refresh();
}

export async function deleteApplicationAction(formData: FormData) {
  const applicationId = Number(formData.get("applicationId"));
  deleteApplicationEvents(applicationId);
  updateApplication(applicationId, { status: "withdrawn" });
  refresh();
}

export async function addUpdateAction(formData: FormData) {
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) return;
  const parsed = parseUpdate(raw, listJobs());
  addProposal({
    raw,
    proposedStatus: parsed.proposedStatus,
    jobHint: parsed.jobHint,
    confidence: parsed.confidence,
    evidence: parsed.evidence,
    });
  refresh();
}

export async function acceptProposalAction(formData: FormData) {
  const id = Number(formData.get("proposalId"));
  const proposal = getProposal(id);
  if (!proposal) return;
  const application = proposal.jobHint ? findApplicationByJob(proposal.jobHint) : undefined;
  if (application) {
    updateApplication(application.id, { status: proposal.proposedStatus });
    addEvent({
      applicationId: application.id,
      kind: proposal.proposedStatus,
      note: proposal.evidence,
      source: "email",
      confidence: proposal.confidence,
    });
  }
  resolveProposal(id, "accepted");
  refresh();
}

export async function dismissProposalAction(formData: FormData) {
  const id = Number(formData.get("proposalId"));
  resolveProposal(id, "dismissed");
  refresh();
}

export async function setHoursAction(formData: FormData) {
  const hours = Number(formData.get("hours"));
  if (!Number.isFinite(hours) || hours < 1 || hours > 40) return;
  updateCandidate({ hoursPerWeek: Math.round(hours) });
  refresh();
}

export async function saveProfileAction(formData: FormData) {
  const candidate = getCandidate();
  const targetRoles = String(formData.get("targetRoles") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  updateCandidate({
    name: String(formData.get("name") ?? candidate.name),
    location: String(formData.get("location") ?? candidate.location),
    headline: String(formData.get("headline") ?? candidate.headline),
    hoursPerWeek: Math.max(1, Math.min(40, Number(formData.get("hours")) || candidate.hoursPerWeek)),
    minSalary: Number(formData.get("minSalary")) || null,
    targetRoles: targetRoles.length ? targetRoles : candidate.targetRoles,
    longShotGoal: String(formData.get("longShotGoal") ?? "") || null,
    seniority: (String(formData.get("seniority") ?? candidate.seniority) as typeof candidate.seniority) ?? candidate.seniority,
  });
  const resume = String(formData.get("resume") ?? "").trim();
  if (resume.length > 40) saveResume(resume);
  refresh();
}

export interface AssistState {
  ok: boolean;
  message: string;
  highlights?: EvidenceSuggestion[];
}

/**
 * Model-assisted highlighting. The model returns line numbers only; anything that
 * is not an actual line in the stored resume is dropped and reported.
 */
export async function assistHighlightsAction(input: {
  applicationId: number;
  jobId: string;
}): Promise<AssistState> {
  const application = getApplication(input.applicationId);
  const job = getJob(input.jobId);
  if (!application || !job) return { ok: false, message: "Application or listing not found." };
  if (!geminiAvailable())
    return { ok: false, message: "No Gemini key is configured, so the local matcher is already doing this job." };

  const ws = getWorkspace();
  const result = await selectHighlightLines(ws.lines, job);
  if (result.error) return { ok: false, message: result.error };

  const { valid } = validateLineNumbers(ws.lines, result.numbers);
  if (valid.length === 0)
    return { ok: false, message: "The model did not find a better set of lines than the local matcher." };

  const matched = result.numbers.map((lineNumber) => {
    const line = ws.lines.find((l) => l.n === lineNumber)!;
    return {
      skill: job.requirements[0]?.skill ?? "general",
      must: true,
      evidence: { line: line.n, quote: line.text },
      via: "direct" as const,
    };
  });

  const { suggestions, discarded } = suggestHighlights(ws.resumeText, ws.lines, job, matched);
  if (suggestions.length === 0)
    return { ok: false, message: "None of the model's chosen lines could be verified against your resume." };

  const merged = suggestions.map((s) => ({ ...s, selected: true }));
  updateApplication(input.applicationId, { highlights: merged });
  refresh();

  const dropped = result.rejected.length
    ? ` ${result.rejected.length} returned line number(s) did not exist and were discarded.`
    : "";
  return {
    ok: true,
    message: `Selected ${merged.length} verified line(s) from your resume.${dropped}`,
    highlights: merged,
  };
}

export async function deleteEverythingAction() {
  resetDatabase();
  redirect("/");
}

export async function exportAllClient(): Promise<string> {
  return JSON.stringify(exportAll(), null, 2);
}

export async function addJobFromTextAction(formData: FormData) {
  let text = String(formData.get("description") ?? "").trim();
  let title = String(formData.get("title") ?? "").trim();
  let company = String(formData.get("company") ?? "").trim();
  let sourceUrl = "";

  if (/^https?:\/\//i.test(text)) {
    sourceUrl = text;
    try {
      const res = await fetch(text, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const html = await res.text();
        if (!title) {
          const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
          if (match) title = match[1].replace(/[\r\n\t]+/g, " ").trim().slice(0, 80);
        }
        const stripped = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim();
        if (stripped.length >= 60) {
          text = stripped.slice(0, 10000);
        }
      }
    } catch {
      // Fallback to text as entered
    }
  }

  if (!title) title = "Imported listing";
  if (!company) company = "Direct employer";
  if (text.length < 50) return;

  // Use the same skill lexicon as everything else, so a pasted listing is scored
  // on the skills it actually names rather than on arbitrary words.
  const requirements = skillsIn(`${title}. ${text}`)
    .slice(0, 10)
    .map((skill) => ({ skill, must: false }));

  insertJob({
    id: `pasted-${Date.now()}`,
    title,
    company,
    companyVerified: false,
    location: "Not stated",
    workMode: "hybrid",
    seniority: "junior",
    salaryMin: null,
    salaryMax: null,
    description: text,
    requirements,
    postedAt: new Date().toISOString(),
    expiresAt: null,
    repostCount: 0,
    filledDaysAgo: null,
    source: sourceUrl ? "Imported from URL" : "Pasted by candidate",
    sourceUrl,
  });
  refresh();
  redirect("/jobs");
}

export interface ImportSourceSummary {
  id: string;
  label: string;
  ok: boolean;
  fetched: number;
  imported: number;
  error: string | null;
}

export interface ImportState {
  ok: boolean;
  message: string;
  imported: number;
  results: ImportSourceSummary[];
}

function titleCompanyKey(job: { title: string; company: string }): string {
  return `${job.title} ${job.company}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Pulls listings from the selected free feeds into the same board as the seeds.
 * They are inserted unverified, then scored by the normal engines, so the demo
 * can show a real posting being caught by the same trust checks.
 *
 * Failures are reported per source. We do not quietly return half a result and
 * call it success.
 */
export async function importLiveJobsAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const query = String(formData.get("query") ?? "").trim();
  const limit = Number(formData.get("limit") ?? 5);
  const requested = formData
    .getAll("sources")
    .map((value) => String(value))
    .filter((id) => SOURCES.some((source) => source.id === id));

  if (requested.length === 0) {
    return {
      ok: false,
      message: "Pick at least one source. Nothing was fetched, so nothing changed.",
      imported: 0,
      results: [],
    };
  }

  const results = await fetchFromSources(requested, query, limit);

  // Deduplicate by id and by title + company, so the same role arriving from
  // two feeds does not become two listings you have to reason about.
  const seen = new Set(listJobs().map(titleCompanyKey));
  let imported = 0;

  const summary: ImportSourceSummary[] = results.map((result) => {
    let added = 0;
    for (const job of result.jobs) {
      const key = titleCompanyKey(job);
      if (getJob(job.id) || seen.has(key)) continue;
      insertJob(job);
      seen.add(key);
      added += 1;
    }
    imported += added;
    return {
      id: result.id,
      label: result.label,
      ok: result.ok,
      fetched: result.fetched,
      imported: added,
      error: result.error,
    };
  });

  refresh();

  const okSources = summary.filter((source) => source.ok).length;
  const failed = summary.filter((source) => !source.ok);
  const failedNote =
    failed.length > 0
      ? ` ${failed.length} feed${failed.length === 1 ? "" : "s"} did not answer: ${failed
          .map((source) => source.label)
          .join(", ")}. Nothing was imported from them.`
      : "";

  const message =
    imported === 0
      ? `Nothing new to add from ${okSources} source${okSources === 1 ? "" : "s"}.${
          okSources > 0 ? " Every matching listing is already on your board." : ""
        }${failedNote}`
      : `Imported ${imported} listing${imported === 1 ? "" : "s"} from ${okSources} source${
          okSources === 1 ? "" : "s"
        }${query ? ` matching “${query}”` : ""}. They arrive marked unverified, with the trust check already run.${failedNote}`;

  return {
    ok: imported > 0 || failed.length < summary.length,
    message,
    imported,
    results: summary,
  };
}
