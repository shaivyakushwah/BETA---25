"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import type { EvidenceSuggestion } from "@/lib/types";
import { assistHighlightsAction, recordSubmissionAction, saveDraftAction, type SubmitState } from "@/app/actions";

interface Props {
  application: {
    id: number;
    draft: string;
    coverLetter: string;
    status: string;
    submittedAt: string | null;
  };
  job: {
    id: string;
    title: string;
    company: string;
    workMode: string;
    location: string;
    sourceUrl: string;
    requirements: { skill: string; must: boolean }[];
  };
  catalog: EvidenceSuggestion[];
  discarded: { quote: string; reason: string }[];
  unclaimed: { label: string; aliases: string[] }[];
  gemini: boolean;
}

const initialSubmit: SubmitState = { ok: false, message: "" };

export function ApplicationWorkspace({ application, job, catalog, discarded, unclaimed, gemini }: Props) {
  const initialSelected = new Set(catalog.filter((s) => s.selected !== false).map((s) => s.id));
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [draft, setDraft] = useState(application.draft);
  const [coverLetter, setCoverLetter] = useState(application.coverLetter);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assist, setAssist] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitState, submitAction, submitting] = useActionState(recordSubmissionAction, initialSubmit);

  const claimWarnings = useMemo(() => {
    const lower = draft.toLowerCase();
    const hits: string[] = [];
    for (const skill of unclaimed) {
      if (skill.aliases.some((alias) => alias.length > 2 && lower.includes(alias.toLowerCase()))) {
        hits.push(skill.label);
      }
    }
    return hits;
  }, [draft, unclaimed]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addToDraft = (quote: string) => {
    setDraft((prev) => `${prev.trimEnd()}${prev.trim() ? "\n\n" : ""}${quote.replace(/^[-•]\s*/, "")}`);
  };

  const save = () => {
    startTransition(async () => {
      await saveDraftAction({
        applicationId: application.id,
        draft,
        coverLetter,
        catalog,
        selectedIds: [...selected],
      });
      setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    });
  };

  const askModel = () => {
    startTransition(async () => {
      const result = await assistHighlightsAction({ applicationId: application.id, jobId: job.id });
      setAssist(result.message);
    });
  };

  const fullText = `${coverLetter.trim() ? `${coverLetter.trim()}\n\n---\n\n` : ""}${draft}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setAssist("Copied. Shortlist still has not sent anything — you do that yourself.");
    } catch {
      setAssist("Could not access the clipboard. Select the text and copy it manually.");
    }
  };

  const download = () => {
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${job.company.replace(/\s+/g, "-").toLowerCase()}-${job.title
      .replace(/\s+/g, "-")
      .toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const recorded = Boolean(application.submittedAt) || submitState.ok;
  const canSubmit = acknowledged && typed === "SUBMIT" && draft.trim().length >= 40;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr)", gap: 24, alignItems: "start" }}>
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <h2 style={{ fontSize: 19, margin: 0 }}>What you can point to</h2>
          <button className="btn btn-sm" type="button" onClick={askModel} disabled={pending}>
            {gemini ? "Ask Gemini to re-rank" : "Local matcher"}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--color-ink-soft)", margin: "4px 0 12px" }}>
          Every quote below is copied from your resume, with its line number. Tick the ones to keep in view while you
          write. Nothing is inserted into your application without you pressing “Add to draft”.
        </p>

        {assist ? (
          <p className="mono-xs" style={{ background: "var(--color-info-soft)", color: "var(--color-info)", padding: "7px 10px" }}>
            {assist}
          </p>
        ) : null}

        {catalog.length === 0 ? (
          <div className="card card-pad">
            <p style={{ margin: 0, fontSize: 13 }}>
              Nothing in your resume matches their requirements yet. That is worth knowing before you write: focus the
              application on the closest project you have, and consider adding the missing skill to your profile first.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {catalog.map((suggestion) => {
              const isSelected = selected.has(suggestion.id);
              return (
                <li
                  key={suggestion.id}
                  className="card"
                  style={{
                    padding: "12px 13px",
                    borderColor: isSelected ? "#9dc7b6" : "var(--color-line)",
                    background: isSelected ? "#fbfefc" : "var(--color-surface)",
                  }}
                >
                  <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(suggestion.id)}
                      style={{ marginTop: 4 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span className="quote" style={{ display: "block" }}>
                        “{suggestion.quote.replace(/^[-•]\s*/, "")}”
                      </span>
                      <span className="mono-xs" style={{ display: "block", marginTop: 5, color: "var(--color-ink-faint)" }}>
                        line {suggestion.line} · {suggestion.section} · for {suggestion.forRequirement}
                      </span>
                      <span style={{ display: "block", marginTop: 5, fontSize: 12, color: "var(--color-ink-soft)" }}>
                        {suggestion.angle}
                      </span>
                    </span>
                  </label>
                  <button className="btn btn-sm" type="button" style={{ marginTop: 8 }} onClick={() => addToDraft(suggestion.quote)}>
                    Add to draft
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {discarded.length > 0 ? (
          <div className="card card-pad" style={{ marginTop: 12, background: "var(--color-warn-soft)", borderColor: "#e8cfa8" }}>
            <p className="eyebrow" style={{ margin: 0, color: "var(--color-warn)" }}>
              Discarded, and why
            </p>
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12 }}>
              {discarded.map((item, index) => (
                <li key={index}>
                  “{item.quote}” — {item.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section>
        <h2 style={{ fontSize: 19, margin: 0 }}>Your application</h2>
        <p style={{ fontSize: 12.5, color: "var(--color-ink-soft)", margin: "4px 0 12px" }}>
          You write it. The system will not generate sentences for you, because a sentence you did not write is a claim
          you did not make.
        </p>

        <label className="field" htmlFor="draft">
          Application text or cover letter
        </label>
        <textarea
          id="draft"
          className="textarea"
          rows={13}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Dear ${job.company} hiring team,\n\nI am applying for ${job.title}…`}
        />
        <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 4 }}>
          {draft.trim() ? draft.trim().split(/\s+/).length : 0} words
          {savedAt ? ` · saved ${savedAt}` : ""}
          {pending ? " · working…" : ""}
        </p>

        {claimWarnings.length > 0 ? (
          <div
            className="card card-pad"
            style={{ marginTop: 8, background: "var(--color-danger-soft)", borderColor: "#e6bdb5" }}
          >
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-danger)" }}>
              Your draft mentions <strong>{claimWarnings.join(", ")}</strong>, which is not in your resume. If you have
              done it, add it to your profile first. If not, take it out.
            </p>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={save} disabled={pending}>
            Save draft
          </button>
          <button className="btn" type="button" onClick={copy}>
            Copy
          </button>
          <button className="btn" type="button" onClick={download}>
            Download .txt
          </button>
        </div>

        <hr className="rule" style={{ margin: "22px 0 14px" }} />

        {recorded ? (
          <div className="card card-pad" style={{ background: "var(--color-accent-soft)", borderColor: "#bcd9cb" }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "#20463a" }}>
              Recorded as sent{application.submittedAt ? ` on ${new Date(application.submittedAt).toLocaleDateString("en-GB")}` : ""}.
              Shortlist had no access to the employer's form; you sent it, and this is the record.
            </p>
            <Link href="/pipeline" className="btn btn-sm" style={{ marginTop: 8 }}>
              See it in the pipeline
            </Link>
          </div>
        ) : (
          <>
            <p className="eyebrow" style={{ margin: 0 }}>
              Handoff — nothing is sent by us
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              Shortlist has no connection to {job.company}&apos;s application system. You send the application on their
              site, then record the date here so your pipeline and results stay honest.
            </p>

            <form action={submitAction} style={{ marginTop: 12 }}>
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="draft" value={draft} />
              <input type="hidden" name="coverLetter" value={coverLetter} />
              <input type="hidden" name="catalog" value={JSON.stringify(catalog)} />
              {[...selected].map((id) => (
                <input key={id} type="hidden" name="selected" value={id} />
              ))}

              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  name="acknowledged"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  I have read the draft I am about to send, and every statement in it is mine.
                </span>
              </label>

              <label className="field" htmlFor="confirm" style={{ marginTop: 10 }}>
                Type SUBMIT to confirm
              </label>
              <input
                id="confirm"
                className="input"
                name="confirm"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                style={{ maxWidth: 180 }}
              />

              <button className="btn btn-primary" type="submit" disabled={!canSubmit || submitting} style={{ marginTop: 10 }}>
                {submitting ? "Recording…" : "Record that I sent it"}
              </button>

              {submitState.message ? (
                <p
                  className="mono-xs"
                  style={{
                    marginTop: 8,
                    color: submitState.ok ? "var(--color-accent)" : "var(--color-danger)",
                  }}
                >
                  {submitState.message}
                </p>
              ) : null}
            </form>
          </>
        )}

        <details style={{ marginTop: 18 }}>
          <summary className="mono-xs" style={{ color: "var(--color-ink-soft)" }}>
            Optional: a separate cover letter
          </summary>
          <textarea
            className="textarea"
            rows={5}
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            style={{ marginTop: 8 }}
            placeholder="Only if the employer asks for one."
          />
        </details>
      </section>
    </div>
  );
}
