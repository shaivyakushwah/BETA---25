import { createFileRoute, notFound } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense } from "react";
import Link from "@/lib/next-compat";
import { findApplicationByJob, listApplications, listProposals } from "@/lib/db";
import { getWorkspace } from "@/lib/insights";
import { UPDATE_INTAKE_AVOID, UPDATE_INTAKE_GUIDE } from "@/lib/engines/updates";
import { acceptProposalAction, addUpdateAction, dismissProposalAction } from "@/app/actions";
import { PageHeader, SectionTitle, Meter } from "@/components/ui";

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading updates…</p>}>
      <Updates />
    </Suspense>
  );
}

function confidenceTone(value: number) {
  if (value >= 0.8) return "var(--color-accent)";
  if (value >= 0.55) return "var(--color-warn)";
  return "var(--color-danger)";
}

function Updates() {
  useSnapshot();
  const proposals = listProposals();
  const pending = proposals.filter((p) => p.state === "pending");
  const resolved = proposals.filter((p) => p.state !== "pending");
  const ws = getWorkspace();
  const applications = listApplications();

  return (
    <>
      <PageHeader
        eyebrow="AI Reply Drafter"
        title="Turn Recruiter Emails Into Next Steps & Replies"
        lede="Paste any recruiter email, interview invitation, or portal message. Shortlist detects the application stage and drafts a professional response."
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 24, alignItems: "start" }}>
        <div>
          <form action={addUpdateAction} className="card card-pad">
            <label className="field" htmlFor="raw">
              Paste recruiter email or message
            </label>
            <textarea
              id="raw"
              name="raw"
              className="textarea"
              rows={6}
              placeholder={"Subject: Next steps — your application\n\nHi there, thanks for applying. We would like to invite you to a 30-minute interview…"}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" type="submit">
                Draft AI Reply &amp; Update Stage
              </button>
              <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
                You review and approve before anything is changed.
              </span>
            </div>
          </form>

          <div style={{ marginTop: 26 }}>
            <SectionTitle
              right={
                <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
                  {pending.length} waiting
                </span>
              }
            >
              Waiting for your decision
            </SectionTitle>

            {pending.length === 0 ? (
              <div className="card card-pad" style={{ borderRadius: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                  No pending update proposals. When a recruiter emails you or updates an application status, paste the message above. The AI will parse the decision and ask for your confirmation before touching your tracker.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pending.map((proposal) => {
                  const job = proposal.jobHint ? ws.byId.get(proposal.jobHint) : null;
                  const application = proposal.jobHint ? findApplicationByJob(proposal.jobHint) : undefined;
                  const tone = confidenceTone(proposal.confidence);
                  return (
                    <article key={proposal.id} className="card" style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                        <div>
                          <p className="eyebrow" style={{ margin: 0 }}>
                            Proposed: <span style={{ color: "var(--color-ink)" }}>{proposal.proposedStatus}</span>
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: 13.5 }}>
                            {job ? `${job.job.title} at ${job.job.company}` : "No application matched"}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 90 }}>
                          <span className="num" style={{ fontSize: 16, color: tone }}>
                            {Math.round(proposal.confidence * 100)}%
                          </span>
                          <Meter value={proposal.confidence * 100} tone={tone} />
                        </div>
                      </div>

                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12.5,
                          background: "#f6f3ea",
                          border: "1px solid var(--color-line-soft)",
                          borderRadius: 3,
                          padding: "9px 11px",
                          margin: "10px 0 0",
                          maxHeight: 150,
                          overflow: "auto",
                        }}
                      >
                        {proposal.raw.slice(0, 700)}
                      </pre>

                      <p style={{ margin: "9px 0 0", fontSize: 12.5 }}>
                        <strong style={{ fontWeight: 550 }}>Why we think so:</strong> {proposal.evidence}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-warn)" }}>
                        {proposal.confidence < 0.6
                          ? "Low confidence: this is a guess, not a reading. Check the message yourself."
                          : "Check the wording yourself before accepting."}
                      </p>

                      {!application ? (
                        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-danger)" }}>
                          There is no application for this job in your pipeline, so accepting will only clear the
                          proposal.
                        </p>
                      ) : null}

                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <form action={acceptProposalAction}>
                          <input type="hidden" name="proposalId" value={proposal.id} />
                          <button className="btn btn-accent" type="submit">
                            Accept and update the pipeline
                          </button>
                        </form>
                        <form action={dismissProposalAction}>
                          <input type="hidden" name="proposalId" value={proposal.id} />
                          <button className="btn" type="submit">
                            Dismiss
                          </button>
                        </form>
                        {application ? (
                          <Link href={`/interview/${application.id}`} className="btn">
                            Prep for this
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {resolved.length > 0 ? (
            <details style={{ marginTop: 22 }}>
              <summary className="mono-xs" style={{ color: "var(--color-ink-soft)" }}>
                {resolved.length} already handled
              </summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12, color: "var(--color-ink-soft)" }}>
                {resolved.map((proposal) => (
                  <li key={proposal.id}>
                    {proposal.state} · {proposal.proposedStatus} · {proposal.raw.split("\n")[0].slice(0, 80)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <aside style={{ display: "grid", gap: 14 }}>
          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              What we actually need to read
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5 }}>
              {UPDATE_INTAKE_GUIDE.map((item) => (
                <li key={item} style={{ marginBottom: 5 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card card-pad" style={{ background: "var(--color-danger-soft)", borderColor: "#e6bdb5" }}>
            <p className="eyebrow" style={{ margin: 0, color: "var(--color-danger)" }}>
              What we do not ask for
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#5c2823" }}>
              {UPDATE_INTAKE_AVOID.map((item) => (
                <li key={item} style={{ marginBottom: 5 }}>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ margin: "8px 0 0", fontSize: 11.5 }}>
              There is no inbox connection. You choose what to paste, and stored messages are trimmed to 90 days.
            </p>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              When it is not sure
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              We score confidence from the wording and whether we can match the employer. Under 60% the card says so, and
              the pipeline does not move. A wrong guess costs you one click to dismiss; a silent wrong update costs you
              weeks.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/updates")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Status Ingestion — Shortlist" },
      { name: "description", content: "Status Ingestion in Shortlist, the job search that fits your week." },
      { property: "og:title", content: "Status Ingestion — Shortlist" },
      { property: "og:description", content: "Status Ingestion in Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
});
