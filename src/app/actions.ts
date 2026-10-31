/**
 * Client-side actions with the same names as the original app. Each one calls
 * a server function, then refreshes the page data (and navigates when the
 * original redirected).
 */
import type { EvidenceSuggestion } from "@/lib/types";
import {
  acceptProposalFn,
  addJobFromTextFn,
  addUpdateFn,
  assistHighlightsFn,
  clearDecisionFn,
  decideFn,
  deleteApplicationFn,
  deleteEverythingFn,
  dismissProposalFn,
  draftEmailFn,
  exportAllFn,
  importLiveJobsFn,
  recordSubmissionFn,
  saveDraftFn,
  saveProfileFn,
  scoreResumeFn,
  sendResendEmailFn,
  tailorResumeFn,
  runDailyJobSyncFn,
  setHoursFn,
  setStatusFn,
  startApplicationFn,
  withdrawFn,
  type AssistState,
  type ImportState,
} from "@/lib/app.functions";
import type { EmailDraftResult } from "@/lib/gemini";
import type { ResumeScoreResult, TailorResumeResult } from "@/lib/gemini";
import type { SendEmailResult } from "@/lib/resend";
import { go, refresh, toFields } from "@/lib/app-runtime";

export type { AssistState, ImportState, ImportSourceSummary } from "@/lib/app.functions";

export interface SubmitState {
  ok: boolean;
  message: string;
}

export async function decideAction(formData: FormData) {
  await decideFn({ data: toFields(formData) });
  await refresh();
}

export async function clearDecisionAction(formData: FormData) {
  await clearDecisionFn({ data: toFields(formData) });
  await refresh();
}

export async function startApplicationAction(formData: FormData) {
  const { id } = await startApplicationFn({ data: toFields(formData) });
  await refresh();
  if (id) go(`/apply/${id}`);
}

export async function saveDraftAction(input: {
  applicationId: number;
  draft: string;
  coverLetter: string;
  catalog: EvidenceSuggestion[];
  selectedIds: string[];
}) {
  const result = await saveDraftFn({ data: input });
  await refresh();
  return result;
}

export async function recordSubmissionAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const result = await recordSubmissionFn({ data: toFields(formData) });
  await refresh();
  return result;
}

export async function setStatusAction(formData: FormData) {
  await setStatusFn({ data: toFields(formData) });
  await refresh();
}

export async function withdrawAction(formData: FormData) {
  await withdrawFn({ data: toFields(formData) });
  await refresh();
}

export async function deleteApplicationAction(formData: FormData) {
  await deleteApplicationFn({ data: toFields(formData) });
  await refresh();
}

export async function addUpdateAction(formData: FormData) {
  await addUpdateFn({ data: toFields(formData) });
  await refresh();
}

export async function acceptProposalAction(formData: FormData) {
  await acceptProposalFn({ data: toFields(formData) });
  await refresh();
}

export async function dismissProposalAction(formData: FormData) {
  await dismissProposalFn({ data: toFields(formData) });
  await refresh();
}

export async function setHoursAction(formData: FormData) {
  await setHoursFn({ data: toFields(formData) });
  await refresh();
}

export async function saveProfileAction(formData: FormData) {
  await saveProfileFn({ data: toFields(formData) });
  await refresh();
}

export async function assistHighlightsAction(input: { applicationId: number; jobId: string }): Promise<AssistState> {
  const result = await assistHighlightsFn({ data: input });
  await refresh();
  return result;
}

export async function deleteEverythingAction() {
  await deleteEverythingFn();
  await refresh();
  go("/");
}

export async function exportAllClient(): Promise<string> {
  return exportAllFn();
}

export async function addJobFromTextAction(formData: FormData) {
  const { added } = await addJobFromTextFn({ data: toFields(formData) });
  await refresh();
  if (added) go("/jobs");
}

export async function importLiveJobsAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const result = await importLiveJobsFn({ data: toFields(formData) });
  await refresh();
  return result;
}

export async function scoreResumeAction(targetRole?: string): Promise<ResumeScoreResult> {
  return scoreResumeFn({ data: { targetRole } });
}

export async function draftEmailAction(_prevState: unknown, formData: FormData): Promise<EmailDraftResult> {
  return draftEmailFn({ data: toFields(formData) });
}

export async function sendResendEmailAction(_prevState: unknown, formData: FormData): Promise<SendEmailResult> {
  return sendResendEmailFn({ data: toFields(formData) });
}

export async function tailorResumeAction(formData: FormData): Promise<TailorResumeResult> {
  return tailorResumeFn({ data: toFields(formData) });
}

export async function runDailyJobSyncAction(formData?: FormData) {
  const result = await runDailyJobSyncFn({ data: formData ? toFields(formData) : {} });
  await refresh();
  return result;
}
