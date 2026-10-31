import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getWorkspace } from "@/lib/insights";
import { listProposals, listApplications } from "@/lib/db";
import { describeOutcomes } from "@/lib/engines/honesty";
import { getResults } from "@/lib/results";
import { decideAction, setHoursAction, startApplicationAction } from "@/app/actions";
import { FitScore, JobMeta, PageHeader, SectionTitle, TrustPill } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading your week…</p>}>
      <Week />
    </Suspense>
  );
}

async function Week() {
  await connection();
  const ws = getWorkspace();
  const proposals = listProposals().filter((p) => p.state === "pending");
  const applications = listApplications();
  const results = getResults();
  const honesty = describeOutcomes(results.sample);
  const { plan } = ws;
  const applied = new Set(applications.map((a) => a.jobId));

  return (
    <>
      <PageHeader
        eyebrow={`This week · ${ws.candidate.hoursPerWeek} hours budgeted`}
        title={`Spend your ${ws.candidate.hoursPerWeek} hours here`}
        lede={`${ws.jobs.length} listings checked, ${ws.market.sample} inside your target families, and ${plan.skip.length} set aside with a reason. Ranked by what you can realistically win, not by what was posted most recently.`}
        actions={
          <form action={setHoursAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label htmlFor="hours" className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
              hours/week
            </label>
            <input
              id="hours"
              name="hours"
              type="number"
              min={1}
              max={40}
              defaultValue={ws.candidate.hoursPerWeek}
              className="input"
              style={{ width: 64 }}
            />
            <button className="btn btn-sm" type="submit">
              Update
            </button>
          </form>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 28, alignItems: "start" }}>
        <section>
          <SectionTitle
            right={
              <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
                {plan.minutesUsed} of {plan.budgetMinutes} min planned
              </span>
            }
          >
            Do these first
          </SectionTitle>

          {plan.applyNow.length === 0 ? (
            <div className="card card-pad" style={{ borderRadius: 16 }}>
              {ws.jobs.length === 0 ? (
                <>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>No listings in your workspace yet.</p>
                  <p style={{ margin: "6px 0 14px", fontSize: 13, color: "var(--color-ink-soft)" }}>
                    Import live roles from 11 free feeds or paste a job advert URL to start planning your week.
                  </p>
                  <Link href="/jobs" className="btn btn-primary btn-sm">
                    ⚡ Go to Listings &amp; Import
                  </Link>
                </>
              ) : (
                <>
                  <p style={{ margin: 0 }}>Nothing qualifies this week — every open listing failed a check.</p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-ink-soft)" }}>
                    That is a real answer, not an empty state. Look at the skipped list to see what failed and why.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {plan.applyNow.map((insight, index) => (
                <li key={insight.job.id} className="card" style={{ padding: "20px 22px", borderRadius: 16 }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <span className="priority-badge">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <Link href={`/jobs/${insight.job.id}`} style={{ textDecoration: "none" }}>
                            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", color: "#0f172a" }}>
                              {insight.job.title}
                            </p>
                          </Link>
                          <div style={{ marginTop: 2 }}>
                            <JobMeta job={insight.job} />
                          </div>
                        </div>
                        <FitScore fit={insight.fit} />
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                        <TrustPill trust={insight.trust} size="sm" />
                        <span className="pill pill-neutral">⏱️ {insight.minutes} min</span>
                        {insight.job.expiresAt ? (
                          <span className="pill pill-neutral">
                            closes {new Date(insight.job.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        ) : null}
                        {insight.fit.stretch ? <span className="pill pill-check">stretch</span> : null}
                      </div>

                      <p style={{ margin: "12px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                        {insight.fit.summary}{" "}
                        {insight.trust.verdict === "clear"
                          ? "The listing checks out."
                          : `${insight.trust.flags.length} thing(s) to check before you invest time.`}
                      </p>

                      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                        <form action={startApplicationAction}>
                          <input type="hidden" name="jobId" value={insight.job.id} />
                          <button className="btn btn-primary" type="submit">
                            {applied.has(insight.job.id) ? "Open application ↗" : "Start application ⚡"}
                          </button>
                        </form>
                        <Link href={`/jobs/${insight.job.id}`} className="btn">
                          See the reasoning
                        </Link>
                        <form action={decideAction}>
                          <input type="hidden" name="jobId" value={insight.job.id} />
                          <input type="hidden" name="kind" value="skip" />
                          <input type="hidden" name="reason" value="Skipped from the weekly plan" />
                          <button className="btn btn-sm" type="submit">
                            Not this week
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {plan.maybe.length > 0 ? (
            <details style={{ marginTop: 18 }}>
              <summary className="mono-xs" style={{ color: "var(--color-ink-soft)" }}>
                {plan.maybe.length} more that do not fit in {ws.candidate.hoursPerWeek} hours
              </summary>
              <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 8 }}>
                {plan.maybe.slice(0, 6).map((insight) => (
                  <li key={insight.job.id} className="card" style={{ padding: "10px 13px", display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5 }}>{insight.job.title}</p>
                      <JobMeta job={insight.job} />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <FitScore fit={insight.fit} compact />
                      <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                        +{insight.minutes} min
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div style={{ marginTop: 34 }}>
            <SectionTitle
              right={<span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>each with its reason</span>}
            >
              Leave these alone
            </SectionTitle>
            <div className="card" style={{ overflow: "hidden" }}>
              {plan.skip.length === 0 ? (
                <p style={{ margin: 0, padding: 16, fontSize: 13 }}>Nothing skipped yet.</p>
              ) : (
                plan.skip.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry.insight.job.id}
                    style={{
                      padding: "12px 14px",
                      borderTop: index === 0 ? "0" : "1px solid var(--color-line-soft)",
                      display: "flex",
                      gap: 12,
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13.5 }}>
                        <Link href={`/jobs/${entry.insight.job.id}`} className="link-underline">
                          {entry.insight.job.title}
                        </Link>{" "}
                        <span style={{ color: "var(--color-ink-faint)" }}>· {entry.insight.job.company}</span>
                      </p>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-ink-soft)" }}>
                        <strong style={{ fontWeight: 550 }}>{entry.reason}.</strong> {entry.detail}
                      </p>
                    </div>
                    <span className="num" style={{ fontSize: 11.5, color: "var(--color-ink-faint)", flex: "none" }}>
                      fit {entry.insight.fit.score}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 8 }}>
              Skipping is a suggestion, never a block. Every listing stays in{" "}
              <Link href="/jobs" className="link-underline">
                Listings
              </Link>{" "}
              and can be overridden.
            </p>
          </div>
        </section>

        <aside style={{ display: "grid", gap: 14 }}>
          <div className="card card-pad" style={{ background: "#fbf9f2" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Waiting on your OK
            </p>
            {proposals.length === 0 ? (
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                No unconfirmed updates.{" "}
                <Link href="/updates" className="link-underline">
                  Paste one
                </Link>
              </p>
            ) : (
              <>
                <p className="num" style={{ margin: "6px 0 6px", fontSize: 28 }}>
                  {proposals.length}
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-ink-soft)" }}>
                  {proposals[0].raw.split("\n")[0].slice(0, 90)}
                </p>
                <Link href="/updates" className="btn btn-sm" style={{ marginTop: 10 }}>
                  Review the update
                </Link>
              </>
            )}
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              Results so far
            </p>
            <p className="num" style={{ margin: "6px 0 0", fontSize: 28 }}>
              {results.sample.responses}/{results.sample.applications}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              replies from applications
            </p>
            <hr className="rule" style={{ margin: "12px 0" }} />
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-soft)" }}>
              {honesty.interval
                ? `True reply rate plausibly ${Math.round(honesty.interval[0] * 100)}–${Math.round(honesty.interval[1] * 100)}%. Too wide to act on yet.`
                : honesty.headline}
            </p>
            <Link href="/insights" className="link-underline mono-xs" style={{ display: "inline-block", marginTop: 8 }}>
              What this can and cannot tell you
            </Link>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              Trust check
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: 12.5 }}>
              {[
                ["Clear", ws.insights.filter((i) => i.trust.verdict === "clear").length],
                ["Needs a check", ws.insights.filter((i) => i.trust.verdict === "check").length],
                ["Serious warnings", ws.insights.filter((i) => i.trust.verdict === "doubtful").length],
              ].map(([label, count]) => (
                <li key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "var(--color-ink-soft)" }}>{label}</span>
                  <span className="num">{count}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--color-ink-faint)" }}>
              No listing is hidden for being doubtful. Each one keeps its reasons and its override.
            </p>
          </div>

          <div className="card card-pad" style={{ background: "var(--color-accent-soft)", borderColor: "#bcd9cb" }}>
            <p className="eyebrow" style={{ margin: 0, color: "var(--color-accent)" }}>
              How the plan is built
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#20463a" }}>{plan.rationale.join(" ")}</p>
            <p className="mono-xs" style={{ margin: "8px 0 0", color: "#3c5f52" }}>
              fit × trust ÷ minutes, then cut to your budget.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
