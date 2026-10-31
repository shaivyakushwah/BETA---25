import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as db from "@/lib/repo";
import type { Repo } from "@/lib/repo";
import type { Application, EvidenceSuggestion } from "@/lib/types";
import type { ServiceStatus } from "@/lib/snapshot";
import { parseUpdate } from "@/lib/engines/updates";
import { fetchFromSources } from "@/lib/engines/live";
import { SOURCES } from "@/lib/sources";
import { suggestHighlights, validateLineNumbers } from "@/lib/engines/resume";
import { skillsIn } from "@/lib/skills";
import {
  draftEmailWithGemini,
  geminiAvailable,
  providerStatus,
  scoreResumeWithGemini,
  selectHighlightLines,
  tailorResumeWithGemini,
  type EmailDraftType,
  type TailorResumeResult,
} from "@/lib/gemini";
import { resendStatus, sendEmailWithResend } from "@/lib/resend";
import { buildWorkspace } from "@/lib/insights";
import { extractJobFromUrlOrText } from "@/lib/job-extractor";

/** Plain-object form of a submitted form; repeated keys become arrays. */
export type FormFields = Record<string, string | string[]>;

function form(fields: FormFields) {
  return {
    get(key: string): string | null {
      const v = fields[key];
      if (v === undefined) return null;
      return Array.isArray(v) ? (v[0] ?? null) : v;
    },
    getAll(key: string): string[] {
      const v = fields[key];
      return v === undefined ? [] : Array.isArray(v) ? v : [v];
    },
  };
}

const fieldsValidator = (input: FormFields) => {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  return input;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function repoFrom(context: { supabase: any; userId: string; claims: any }): Repo {
  const meta = context.claims?.user_metadata ?? {};
  return {
    sb: context.supabase,
    uid: context.userId,
    email: String(context.claims?.email ?? ""),
    name: String(meta.name ?? meta.full_name ?? ""),
  };
}

function serviceStatus(): ServiceStatus {
  const p = providerStatus();
  const r = resendStatus();
  return { aiAvailable: p.available, aiModel: p.model, aiNote: p.note, resendAvailable: r.available, fromEmail: r.fromEmail };
}


export const getSnapshotFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  return db.loadSnapshot(repoFrom(context), serviceStatus());
});

export const decideFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const f = form(data);
    const jobId = String(f.get("jobId") ?? "");
    const kind = String(f.get("kind") ?? "");
    if (!jobId || !["apply", "skip", "maybe"].includes(kind)) return;
    await db.setDecision(repoFrom(context), jobId, kind as "apply" | "skip" | "maybe", String(f.get("reason") ?? ""));
  });

export const clearDecisionFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const jobId = String(form(data).get("jobId") ?? "");
    if (!jobId) return;
    await db.setDecision(repoFrom(context), jobId, null);
  });

export const startApplicationFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const jobId = String(form(data).get("jobId") ?? "");
    if (!jobId) return { id: null as number | null };
    const repo = repoFrom(context);
    await db.setDecision(repo, jobId, "apply", "Started an application");
    const application = await db.createApplication(repo, jobId);
    return { id: application.id as number | null };
  });

export const saveDraftFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { applicationId: number; draft: string; coverLetter: string; catalog: EvidenceSuggestion[]; selectedIds: string[] }) =>
      input,
  )
  .handler(async ({ data: input, context }) => {
    const selected = new Set(input.selectedIds);
    const highlights = input.catalog.map((item) => ({ ...item, selected: selected.has(item.id) }));
    await db.updateApplication(repoFrom(context), input.applicationId, {
      draft: input.draft,
      coverLetter: input.coverLetter,
      highlights,
      status: input.draft.trim().length > 0 ? "ready" : "drafting",
    });
    return { savedAt: new Date().toISOString() };
  });

export const recordSubmissionFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const repo = repoFrom(context);
    const formData = form(data);
    const applicationId = Number(formData.get("applicationId"));
    const typed = String(formData.get("confirm") ?? "").trim();
    const acknowledged = formData.get("acknowledged") === "on";

    const application = await db.getApplication(repo, applicationId);
    if (!application) return { ok: false, message: "That application no longer exists." };

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
    await db.updateApplication(repo, applicationId, {
      draft,
      coverLetter,
      highlights,
      status: "applied",
      submittedAt: now,
      confirmedAt: now,
    });
    await db.addEvent(repo, {
      applicationId,
      kind: "applied",
      note: "Candidate confirmed they sent this application themselves",
      source: "candidate",
      confidence: 1,
    });
    return { ok: true, message: "Recorded. Your pipeline and results page now use this date." };
  });

const ALLOWED_STATUSES: Application["status"][] = [
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

export const setStatusFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const f = form(data);
    const repo = repoFrom(context);
    const applicationId = Number(f.get("applicationId"));
    const status = String(f.get("status") ?? "") as Application["status"];
    const note = String(f.get("note") ?? "");
    if (!ALLOWED_STATUSES.includes(status)) return;
    await db.updateApplication(repo, applicationId, { status });
    await db.addEvent(repo, { applicationId, kind: status, note: note || `Marked ${status} by candidate`, source: "candidate" });
  });

export const withdrawFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const repo = repoFrom(context);
    const applicationId = Number(form(data).get("applicationId"));
    await db.updateApplication(repo, applicationId, { status: "withdrawn" });
    await db.addEvent(repo, { applicationId, kind: "withdrawn", note: "Withdrawn by candidate", source: "candidate" });
  });

export const deleteApplicationFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const repo = repoFrom(context);
    const applicationId = Number(form(data).get("applicationId"));
    await db.deleteApplicationEvents(repo, applicationId);
    await db.updateApplication(repo, applicationId, { status: "withdrawn" });
  });

export const addUpdateFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const repo = repoFrom(context);
    const raw = String(form(data).get("raw") ?? "").trim();
    if (!raw) return;
    const parsed = parseUpdate(raw, await db.listJobs(repo));
    await db.addProposal(repo, {
      raw,
      proposedStatus: parsed.proposedStatus,
      jobHint: parsed.jobHint,
      confidence: parsed.confidence,
      evidence: parsed.evidence,
    });
  });

export const acceptProposalFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const repo = repoFrom(context);
    const id = Number(form(data).get("proposalId"));
    const proposal = await db.getProposal(repo, id);
    if (!proposal) return;
    const application = proposal.jobHint ? await db.findApplicationByJob(repo, proposal.jobHint) : undefined;
    if (application) {
      await db.updateApplication(repo, application.id, { status: proposal.proposedStatus });
      await db.addEvent(repo, {
        applicationId: application.id,
        kind: proposal.proposedStatus,
        note: proposal.evidence,
        source: "email",
        confidence: proposal.confidence,
      });
    }
    await db.resolveProposal(repo, id, "accepted");
  });

export const dismissProposalFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    await db.resolveProposal(repoFrom(context), Number(form(data).get("proposalId")), "dismissed");
  });

export const setHoursFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const hours = Number(form(data).get("hours"));
    if (!Number.isFinite(hours) || hours < 1 || hours > 40) return;
    await db.updateCandidate(repoFrom(context), { hoursPerWeek: Math.round(hours) });
  });

export const saveProfileFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const repo = repoFrom(context);
    const formData = form(data);
    const candidate = await db.getCandidate(repo);
    const targetRoles = String(formData.get("targetRoles") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    await db.updateCandidate(repo, {
      name: String(formData.get("name") ?? candidate.name),
      email: String(formData.get("email") ?? candidate.email),
      location: String(formData.get("location") ?? candidate.location),
      headline: String(formData.get("headline") ?? candidate.headline),
      hoursPerWeek: Math.max(1, Math.min(40, Number(formData.get("hours")) || candidate.hoursPerWeek)),
      minSalary: Number(formData.get("minSalary")) || null,
      targetRoles: targetRoles.length ? targetRoles : candidate.targetRoles,
      longShotGoal: String(formData.get("longShotGoal") ?? "") || null,
      seniority:
        (String(formData.get("seniority") ?? candidate.seniority) as typeof candidate.seniority) ?? candidate.seniority,
    });
    const resume = String(formData.get("resume") ?? "").trim();
    if (resume.length > 40) await db.saveResume(repo, resume);
  });

export interface AssistState {
  ok: boolean;
  message: string;
  highlights?: EvidenceSuggestion[];
}

/**
 * Model-assisted highlighting. The model returns line numbers only; anything that
 * is not an actual line in the stored resume is dropped and reported.
 */
export const assistHighlightsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { applicationId: number; jobId: string }) => input)
  .handler(async ({ data: input, context }): Promise<AssistState> => {
    const repo = repoFrom(context);
    const application = await db.getApplication(repo, input.applicationId);
    const job = await db.getJob(repo, input.jobId);
    if (!application || !job) return { ok: false, message: "Application or listing not found." };
    if (!geminiAvailable())
      return { ok: false, message: "AI is not available, so the local matcher is already doing this job." };

    const ws = buildWorkspace(await db.loadSnapshot(repo, serviceStatus()));
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

    const { suggestions } = suggestHighlights(ws.resumeText, ws.lines, job, matched);
    if (suggestions.length === 0)
      return { ok: false, message: "None of the model's chosen lines could be verified against your resume." };

    const merged = suggestions.map((s) => ({ ...s, selected: true }));
    await db.updateApplication(repo, input.applicationId, { highlights: merged });

    const dropped = result.rejected.length
      ? ` ${result.rejected.length} returned line number(s) did not exist and were discarded.`
      : "";
    return {
      ok: true,
      message: `Selected ${merged.length} verified line(s) from your resume.${dropped}`,
      highlights: merged,
    };
  });

export const deleteEverythingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await db.resetDatabase(repoFrom(context));
});

export const exportAllFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const snapshot = await db.loadSnapshot(repoFrom(context), serviceStatus());
  return JSON.stringify(db.exportFrom(snapshot), null, 2);
});

export const addJobFromTextFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const formData = form(data);
    const text = String(formData.get("description") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();

    if (!text || text.length < 10) return { added: false };

    const extractedJob = await extractJobFromUrlOrText({
      urlOrText: text,
      overrideTitle: title || undefined,
      overrideCompany: company || undefined,
    });

    const repo = repoFrom(context);

    // Auto-clean any previous ghost jobs with placeholder "Imported listing"
    try {
      await repo.sb.from("jobs").delete().eq("user_id", repo.uid).eq("title", "Imported listing");
    } catch {}

    await db.insertJob(repo, extractedJob);
    return { added: true, id: extractedJob.id };
  });

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
 * Pulls listings from the selected free feeds. They are inserted unverified,
 * then scored by the normal engines. Failures are reported per source.
 */
export const importLiveJobsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }): Promise<ImportState> => {
    const repo = repoFrom(context);
    const formData = form(data);
    const query = String(formData.get("query") ?? "").trim();
    const limit = Number(formData.get("limit") ?? 5);
    const workCompatibility = String(formData.get("workCompatibility") ?? "").trim();
    const specificLocation = String(formData.get("location") ?? "").trim().toLowerCase();
    const requested = formData
      .getAll("sources")
      .map((value) => String(value))
      .filter((id) => SOURCES.some((source) => source.id === id));

    if (requested.length === 0) {
      return { ok: false, message: "Pick at least one source. Nothing was fetched, so nothing changed.", imported: 0, results: [] };
    }

    const results = await fetchFromSources(requested, query, limit);
    const existing = await db.listJobs(repo);
    const ids = new Set(existing.map((j) => j.id));
    const seen = new Set(existing.map(titleCompanyKey));
    let imported = 0;

    const summary: ImportSourceSummary[] = [];
    for (const result of results) {
      let added = 0;
      for (const job of result.jobs) {
        // Filter by work compatibility if requested
        if (workCompatibility === "remote" && job.workMode !== "remote") continue;
        if (workCompatibility === "hybrid" && job.workMode !== "hybrid") continue;
        if (workCompatibility === "independent") {
          const loc = (job.location || "").toLowerCase();
          const isIndep = loc.includes("remote") || loc.includes("anywhere") || loc.includes("worldwide") || job.workMode === "remote";
          if (!isIndep) continue;
        }
        if (workCompatibility === "specific" && specificLocation) {
          const loc = (job.location || "").toLowerCase();
          const desc = (job.description || "").toLowerCase();
          if (!loc.includes(specificLocation) && !desc.includes(specificLocation)) continue;
        }

        const key = titleCompanyKey(job);
        if (ids.has(job.id) || seen.has(key)) continue;
        await db.insertJob(repo, job);
        ids.add(job.id);
        seen.add(key);
        added += 1;
      }
      imported += added;
      summary.push({ id: result.id, label: result.label, ok: result.ok, fetched: result.fetched, imported: added, error: result.error });
    }

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

    return { ok: imported > 0 || failed.length < summary.length, message, imported, results: summary };
  });

export const scoreResumeFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { targetRole?: string }) => input ?? {})
  .handler(async ({ data, context }) => {
    const resumeText = await db.getResumeText(repoFrom(context));
    return scoreResumeWithGemini(resumeText, data.targetRole);
  });

export const draftEmailFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }) => {
    const formData = form(data);
    const resumeText = await db.getResumeText(repoFrom(context));
    return draftEmailWithGemini({
      type: (formData.get("type") as EmailDraftType) || "application",
      jobTitle: String(formData.get("jobTitle") || "Software Engineer"),
      company: String(formData.get("company") || "Hiring Team"),
      candidateName: String(formData.get("candidateName") || "Candidate"),
      recruiterName: String(formData.get("recruiterName") || ""),
      resumeSnippet: resumeText,
      notes: String(formData.get("notes") || ""),
    });
  });

export const sendResendEmailFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data }) => {
    const formData = form(data);
    const to = String(formData.get("to") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const replyTo = String(formData.get("replyTo") || "").trim();
    if (!to || !to.includes("@")) return { ok: false, error: "Please enter a valid recipient email address." };
    if (!subject) return { ok: false, error: "Subject line cannot be empty." };
    if (!body) return { ok: false, error: "Email body cannot be empty." };
    return sendEmailWithResend({ to, subject, body, replyTo: replyTo || undefined });
  });

export const tailorResumeFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(fieldsValidator)
  .handler(async ({ data, context }): Promise<TailorResumeResult> => {
    const formData = form(data);
    const repo = repoFrom(context);
    const resumeText = (await db.getResumeText(repo)) || String(formData.get("resumeText") || "");
    const candidate = await db.getCandidate(repo);

    const jobTitle = String(formData.get("jobTitle") || "Software Engineer");
    const company = String(formData.get("company") || "Tech Company");
    const jobDescription = String(formData.get("jobDescription") || "");
    const requirements = String(formData.get("requirements") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return tailorResumeWithGemini({
      jobTitle,
      company,
      jobDescription,
      requirements,
      candidateName: candidate.name || String(formData.get("candidateName") || "Job Seeker"),
      candidateEmail: candidate.email || String(formData.get("candidateEmail") || ""),
      candidatePhone: String(formData.get("candidatePhone") || ""),
      candidateLocation: candidate.location || String(formData.get("candidateLocation") || ""),
      candidateLinkedin: String(formData.get("candidateLinkedin") || ""),
      candidateHeadline: candidate.headline || "",
      resumeText,
    });
  });
