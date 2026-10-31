import { createFileRoute, notFound } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense, useState } from "react";
import Link from "@/lib/next-compat";
import { getWorkspace } from "@/lib/insights";
import { findApplicationByJob } from "@/lib/db";
import { skillLabel } from "@/lib/skills";
import { VERDICT_COPY } from "@/lib/engines/trust";
import { decideAction, clearDecisionAction, startApplicationAction } from "@/app/actions";
import { ConfidenceNote, FitScore, Meter, TrustPill } from "@/components/ui";
import { ResumeTailorer } from "@/components/resume-tailorer";
import { Sparkles, Bookmark, BookmarkCheck, Ban, RotateCcw, Loader2, Check } from "lucide-react";

const SEVERITY_STYLE = {
  serious: { background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "#e6bdb5" },
  caution: { background: "var(--color-warn-soft)", color: "var(--color-warn)", borderColor: "#e8cfa8" },
  info: { background: "var(--color-info-soft)", color: "var(--color-info)", borderColor: "#c8d6e8" },
} as const;

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading the reasoning…</p>}>
      <Detail />
    </Suspense>
  );
}

function Detail() {
  useSnapshot();
  const { id } = Route.useParams();
  const ws = getWorkspace();
  const insight = ws.byId.get(id);
  if (!insight) throw notFound();

  const { job, trust, fit } = insight;
  const application = findApplicationByJob(job.id);
  const duplicate = trust.duplicateOf ? ws.byId.get(trust.duplicateOf) : null;

  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "info"; message: string } | null>(null);

  const isSavedForLater = insight.decision === "maybe";
  const isSkipped = insight.decision === "skip";

  async function handleToggleKeepForLater() {
    if (isSaving || isSkipping) return;
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.set("jobId", job.id);
      if (isSavedForLater) {
        await clearDecisionAction(fd);
        setToast({ type: "info", message: "Removed from your saved shortlist." });
      } else {
        fd.set("kind", "maybe");
        fd.set("reason", "Shortlisted for a later week");
        await decideAction(fd);
        setToast({ type: "success", message: "Job saved for later! View in Weekly Sprint." });
      }
    } catch (err) {
      console.error("Keep for later action failed", err);
      setToast({ type: "info", message: "Could not update status. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleSkip() {
    if (isSaving || isSkipping) return;
    setIsSkipping(true);
    try {
      const fd = new FormData();
      fd.set("jobId", job.id);
      if (isSkipped) {
        await clearDecisionAction(fd);
        setToast({ type: "info", message: "Job restored to active opportunities." });
      } else {
        fd.set("kind", "skip");
        fd.set("reason", "Skipped from the listing page");
        await decideAction(fd);
        setToast({ type: "info", message: "Job marked as skipped." });
      }
    } catch (err) {
      console.error("Skip action failed", err);
      setToast({ type: "info", message: "Could not skip listing. Please try again." });
    } finally {
      setIsSkipping(false);
    }
  }

  const salary =
    job.salaryMin && job.salaryMax
      ? `£${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`
      : job.salaryMin
        ? `from £${job.salaryMin.toLocaleString()}`
        : "not stated";

  return (
    <>
      <p className="mono-xs" style={{ marginBottom: 14 }}>
        <Link href="/jobs" className="link-underline">
          ← All listings
        </Link>
        <span style={{ color: "var(--color-ink-faint)" }}> · {job.sourceUrl ? "Direct Posting" : "Verified Network"}</span>
      </p>

      {/* Skipped Alert Banner */}
      {isSkipped && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            color: "#991b1b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Ban size={15} />
            <span>This job is marked as skipped and hidden from your active planning.</span>
          </div>
          <button
            type="button"
            onClick={handleToggleSkip}
            disabled={isSkipping}
            style={{
              background: "#ffffff",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isSkipping ? "Restoring..." : "Undo Skip"}
          </button>
        </div>
      )}

      {/* Toast Feedback Notice */}
      {toast && (
        <div
          style={{
            background: toast.type === "success" ? "#f0fdf4" : "#f8fafc",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#cbd5e1"}`,
            color: toast.type === "success" ? "#166534" : "#334155",
            borderRadius: 10,
            padding: "8px 14px",
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {toast.type === "success" ? <Check size={14} color="#166534" /> : null}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit", padding: 0 }}
          >
            &times;
          </button>
        </div>
      )}

      <header style={{ marginBottom: 22 }}>
        <p className="eyebrow" style={{ margin: 0 }}>
          {job.company} · {job.location} · {job.workMode} · {job.seniority}
        </p>
        <h1 className="display" style={{ margin: "6px 0 0", maxWidth: "24ch" }}>
          {job.title}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
          <span className="pill pill-neutral">{salary}</span>
          {job.coverLetterRequired ? <span className="pill pill-neutral">cover letter required</span> : null}
          {application ? <span className="pill pill-clear">application in progress</span> : null}
          {isSavedForLater && (
            <span
              className="pill"
              style={{
                background: "#ecfdf5",
                color: "#065f46",
                borderColor: "#a7f3d0",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <BookmarkCheck size={12} />
              <span>saved for later</span>
            </span>
          )}
          {isSkipped && (
            <span
              className="pill"
              style={{
                background: "#fef2f2",
                color: "#991b1b",
                borderColor: "#fecaca",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <Ban size={12} />
              <span>skipped</span>
            </span>
          )}
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26, alignItems: "center" }}>
        <form
          action={startApplicationAction}
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await startApplicationAction(fd);
          }}
        >
          <input type="hidden" name="jobId" value={job.id} />
          <button className="btn btn-accent" type="submit">
            {application ? "Open application" : "Start application"}
          </button>
        </form>

        <button
          type="button"
          className="btn"
          onClick={() => {
            const el = document.getElementById("resume-tailorer-card");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#00D084",
            color: "#003b26",
            fontWeight: 700,
            border: "none",
            padding: "8px 18px",
          }}
        >
          <Sparkles size={14} />
          <span>Tailor Resume</span>
        </button>

        {/* Keep for Later Button */}
        <button
          type="button"
          className="btn"
          onClick={handleToggleKeepForLater}
          disabled={isSaving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            padding: "8px 18px",
            fontWeight: 600,
            background: isSavedForLater ? "#ecfdf5" : "var(--color-bg-card, #ffffff)",
            color: isSavedForLater ? "#065f46" : "var(--color-ink, #0f172a)",
            borderColor: isSavedForLater ? "#86efac" : "var(--color-border, #cbd5e1)",
            boxShadow: isSavedForLater ? "0 1px 3px rgba(16, 185, 129, 0.15)" : "none",
            cursor: isSaving ? "wait" : "pointer",
          }}
          title={isSavedForLater ? "Click to remove from saved shortlist" : "Save this job to review later"}
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isSavedForLater ? (
            <BookmarkCheck size={14} color="#059669" />
          ) : (
            <Bookmark size={14} />
          )}
          <span>{isSaving ? "Updating..." : isSavedForLater ? "✓ Kept for later" : "Keep for later"}</span>
        </button>

        {/* Skip this one Button */}
        <button
          type="button"
          className="btn"
          onClick={handleToggleSkip}
          disabled={isSkipping}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            padding: "8px 18px",
            fontWeight: 600,
            background: isSkipped ? "#fef2f2" : "var(--color-bg-card, #ffffff)",
            color: isSkipped ? "#991b1b" : "var(--color-ink, #0f172a)",
            borderColor: isSkipped ? "#fecaca" : "var(--color-border, #cbd5e1)",
            cursor: isSkipping ? "wait" : "pointer",
          }}
          title={isSkipped ? "Click to restore this job" : "Skip this job from recommendations"}
        >
          {isSkipping ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isSkipped ? (
            <RotateCcw size={14} />
          ) : (
            <Ban size={14} />
          )}
          <span>{isSkipping ? "Updating..." : isSkipped ? "✓ Skipped (Undo)" : "Skip this one"}</span>
        </button>

        {job.sourceUrl ? (
          <a className="btn" href={job.sourceUrl} target="_blank" rel="noreferrer noopener">
            Open original ↗
          </a>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)", gap: 28, alignItems: "start" }}>
        <div>
          <section className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Fit against your resume
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>{fit.summary}</p>
              </div>
              <FitScore fit={fit} />
            </div>
            <ConfidenceNote fit={fit} />

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {fit.components.map((component) => (
                <div key={component.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span>
                      {component.label}{" "}
                      <span style={{ color: "var(--color-ink-faint)" }}>— {component.note}</span>
                    </span>
                    <span className="num">
                      {component.earned}/{component.max}
                    </span>
                  </div>
                  <Meter value={component.earned} max={component.max} />
                </div>
              ))}
            </div>
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 12 }}>
              Fit is a rule-based score so you can audit it. Confidence is{" "}
              {Math.round(fit.confidence * 100)}% — it reflects how much of this posting your resume can actually evidence.
              A thin profile widens the error bar, and we say so instead of pretending otherwise.
            </p>
          </section>

          <section className="card card-pad" style={{ marginBottom: 16 }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              What you can evidence
            </p>
            {fit.matched.length === 0 ? (
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>Nothing on this resume speaks to their requirements directly.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 10 }}>
                {fit.matched.map((match) => (
                  <li key={match.skill} style={{ display: "flex", gap: 10 }}>
                    <span
                      className="pill"
                      style={{
                        background: match.via === "direct" ? "var(--color-accent-soft)" : "var(--color-warn-soft)",
                        borderColor: match.via === "direct" ? "#bcd9cb" : "#e8cfa8",
                        color: match.via === "direct" ? "var(--color-accent)" : "var(--color-warn)",
                        alignSelf: "flex-start",
                      }}
                    >
                      {skillLabel(match.skill)}
                      {match.must ? " · must" : ""}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      {match.evidence ? (
                        <>
                          <p className="quote" style={{ margin: 0 }}>
                            “{match.evidence.quote.replace(/^[-•]\s*/, "")}”
                          </p>
                          <p className="mono-xs" style={{ margin: "2px 0 0", color: "var(--color-ink-faint)" }}>
                            your resume, line {match.evidence.line}
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-warn)" }}>
                          Adjacent only — {match.viaNote}. Nothing in your resume claims this skill, so we do not.
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card card-pad" style={{ marginBottom: 16 }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Gaps, with how common they are
            </p>
            {fit.gaps.length === 0 ? (
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>No gaps against the listed requirements.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 8 }}>
                {fit.gaps.map((gap) => (
                  <li key={gap.skill} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                    <span>
                      {skillLabel(gap.skill)}
                      {gap.must ? <span style={{ color: "var(--color-danger)" }}> · must-have</span> : null}
                    </span>
                    <span className="num" style={{ fontSize: 11.5, color: "var(--color-ink-faint)" }}>
                      {gap.demand} of {gap.sample} similar listings ask for it
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 10 }}>
              Demand is counted across {ws.market.sample} listings in your target families.{" "}
              {ws.market.enough ? "Enough to say something." : "Below our threshold, so treat it as a hint."}
            </p>
          </section>

          <section className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              The posting, as published
            </p>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, marginTop: 10, color: "var(--color-ink)" }}>
              {job.description.replace(/[\u200b-\u200f\ufeff]/g, "")}
            </div>
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 12 }}>
              Posted {new Date(job.postedAt).toLocaleDateString("en-GB")} ·{" "}
              {job.repostCount ? `reposted ${job.repostCount} times · ` : ""}
              Verified Career Post
            </p>
          </section>
        </div>

        <aside>
          <div id="resume-tailorer-card">
            <ResumeTailorer
              job={job}
              candidate={ws.candidate}
              resumeText={ws.resumeText}
              initialMatchScore={fit.overall}
            />
          </div>

          {duplicate ? (
            <section className="card" style={{ padding: 18, marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12.5 }}>
                Similar listing:{" "}
                <Link href={`/jobs/${duplicate.job.id}`} className="link-underline">
                  {duplicate.job.title} at {duplicate.job.company}
                </Link>
              </p>
            </section>
          ) : null}

          {job.salaryMin ? (
            <section className="card card-pad" style={{ background: "#f8fafc", borderRadius: 16 }}>
              <p className="eyebrow" style={{ margin: "0 0 6px" }}>
                Compensation
              </p>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>
                Advertised {salary}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Job detail — Shortlist" },
      { name: "description", content: "Job detail in Shortlist, the job search that fits your week." },
      { property: "og:title", content: "Job detail — Shortlist" },
      { property: "og:description", content: "Job detail in Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
});
