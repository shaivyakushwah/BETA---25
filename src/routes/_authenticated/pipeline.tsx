import { createFileRoute, notFound } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense } from "react";
import Link from "@/lib/next-compat";
import { listApplications, listEvents } from "@/lib/db";
import { getWorkspace } from "@/lib/insights";
import { setStatusAction } from "@/app/actions";
import { PageHeader, formatDate } from "@/components/ui";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "drafting", label: "Available to Apply", statuses: ["drafting", "ready"] },
  { key: "applied", label: "Submitted", statuses: ["applied"] },
  { key: "active", label: "Interview / Active", statuses: ["screening", "interview", "offer"] },
  { key: "closed", label: "Archived / Closed", statuses: ["rejected", "withdrawn", "ghosted"] },
];

const NEXT_STEPS = [
  { value: "screening", label: "Screening / next stage" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "No reply after 3+ weeks" },
  { value: "withdrawn", label: "Withdrawn" },
];

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading your pipeline…</p>}>
      <Pipeline />
    </Suspense>
  );
}

function Pipeline() {
  useSnapshot();
  const applications = listApplications();
  const events = listEvents();
  const ws = getWorkspace();
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow={`${applications.length} Applications · ${applications.filter((a) => a.submittedAt).length} Submitted`}
        title="Application Tracker"
        lede="Keep track of all your applications, interview stages, and recruiter responses."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
        {COLUMNS.map((column) => {
          const items = applications.filter((a) => column.statuses.includes(a.status));
          const colThemes: Record<string, { bg: string; border: string; text: string; badgeBg: string }> = {
            drafting: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", badgeBg: "#dbeafe" },
            applied: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", badgeBg: "#fef3c7" },
            active: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", badgeBg: "#d1fae5" },
            closed: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b", badgeBg: "#e2e8f0" },
          };
          const theme = colThemes[column.key];

          return (
            <section key={column.key} style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "12px 12px 0 0",
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  borderBottom: 0,
                  marginBottom: 0,
                }}
              >
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: theme.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {column.label}
                </p>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: theme.text,
                    background: theme.badgeBg,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {items.length}
                </span>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "0 0 12px 12px",
                  padding: 10,
                  display: "grid",
                  gap: 10,
                  minHeight: 180,
                  alignContent: "start",
                }}
              >
                {items.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--color-ink-faint)" }}>
                    <p style={{ margin: 0, fontSize: 12 }}>No applications here</p>
                    {column.key === "drafting" ? (
                      <Link href="/jobs" className="btn btn-sm btn-primary" style={{ marginTop: 10 }}>
                        Find Jobs
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {items.map((application) => {
                  const insight = ws.byId.get(application.jobId);
                  if (!insight) return null;
                  const jobEvents = events.filter((e) => e.applicationId === application.id);
                  const last = jobEvents[0];
                  const days = application.submittedAt
                    ? Math.round((now - new Date(application.submittedAt).getTime()) / 86_400_000)
                    : null;

                  return (
                    <article key={application.id} className="card" style={{ padding: "11px 12px" }}>
                      <Link href={`/jobs/${application.jobId}`} style={{ textDecoration: "none" }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 550, lineHeight: 1.3 }}>{insight.job.title}</p>
                      </Link>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--color-ink-soft)" }}>
                        {insight.job.company}
                        {days !== null ? ` · ${days}d ago` : ""}
                      </p>

                      <p
                        className="pill pill-neutral"
                        style={{ marginTop: 7, fontSize: 10.5, textTransform: "capitalize" }}
                      >
                        {application.status}
                      </p>

                      {last ? (
                        <p style={{ margin: "7px 0 0", fontSize: 11.5, color: "var(--color-ink-soft)" }}>
                          {formatDate(last.at)} · {last.note || last.kind}
                        </p>
                      ) : null}

                      {application.status === "interview" ? (
                        <Link href={`/interview/${application.id}`} className="btn btn-sm" style={{ marginTop: 8 }}>
                          Two-day prep
                        </Link>
                      ) : null}

                      <details style={{ marginTop: 8 }}>
                        <summary className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
                          record an outcome
                        </summary>
                        <form action={setStatusAction} style={{ marginTop: 6, display: "grid", gap: 5 }}>
                          <input type="hidden" name="applicationId" value={application.id} />
                          <select className="select" name="status" defaultValue="interview" aria-label="New status">
                            {NEXT_STEPS.map((step) => (
                              <option key={step.value} value={step.value}>
                                {step.label}
                              </option>
                            ))}
                          </select>
                          <input className="input" name="note" placeholder="What happened?" />
                          <button className="btn btn-sm" type="submit">
                            Save
                          </button>
                        </form>
                      </details>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Timeline</h2>
        <div className="card" style={{ overflow: "hidden" }}>
          {events.slice(0, 24).map((event, index) => {
            const insight = ws.byId.get(event.jobId);
            return (
              <div
                key={event.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr auto",
                  gap: 12,
                  padding: "10px 14px",
                  borderTop: index === 0 ? 0 : "1px solid var(--color-line-soft)",
                  alignItems: "baseline",
                }}
              >
                <span className="num" style={{ fontSize: 11, color: "var(--color-ink-faint)" }}>
                  {formatDate(event.at)}
                </span>
                <span style={{ fontSize: 12.5 }}>
                  <strong style={{ fontWeight: 550, textTransform: "capitalize" }}>{event.kind}</strong>
                  {" · "}
                  {insight ? `${insight.job.title} at ${insight.job.company}` : "application"}
                  {event.note ? <span style={{ color: "var(--color-ink-soft)" }}> — {event.note}</span> : null}
                </span>
                <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
                  {event.source}
                  {event.confidence < 1 ? ` · ${Math.round(event.confidence * 100)}%` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/pipeline")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Application Tracker — Shortlist" },
      { name: "description", content: "Application Tracker in Shortlist, the job search that fits your week." },
      { property: "og:title", content: "Application Tracker — Shortlist" },
      { property: "og:description", content: "Application Tracker in Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
});
