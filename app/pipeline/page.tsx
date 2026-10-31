import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { listApplications, listEvents } from "@/lib/db";
import { getWorkspace } from "@/lib/insights";
import { setStatusAction } from "@/app/actions";
import { PageHeader, formatDate } from "@/components/ui";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "drafting", label: "In your hands", statuses: ["drafting", "ready"] },
  { key: "applied", label: "Sent, waiting", statuses: ["applied"] },
  { key: "active", label: "Talking to them", statuses: ["screening", "interview", "offer"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "withdrawn", "ghosted"] },
];

const NEXT_STEPS = [
  { value: "screening", label: "Screening / next stage" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "ghosted", label: "No reply after 3+ weeks" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading your pipeline…</p>}>
      <Pipeline />
    </Suspense>
  );
}

async function Pipeline() {
  await connection();
  const applications = listApplications();
  const events = listEvents();
  const ws = getWorkspace();
  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow={`${applications.length} applications · ${applications.filter((a) => a.submittedAt).length} sent`}
        title="Where everything actually stands"
        lede="One record per application, built from what you confirmed. Late updates arrive through the Updates page, where an unclear message stays a proposal until you accept it."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
        {COLUMNS.map((column) => {
          const items = applications.filter((a) => column.statuses.includes(a.status));
          return (
            <section key={column.key} style={{ minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  {column.label}
                </p>
                <span className="num" style={{ fontSize: 11, color: "var(--color-ink-faint)" }}>
                  {items.length}
                </span>
              </div>

              <div style={{ display: "grid", gap: 9 }}>
                {items.length === 0 ? (
                  <p className="mono-xs" style={{ color: "var(--color-ink-faint)", padding: "8px 0" }}>
                    empty
                  </p>
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
