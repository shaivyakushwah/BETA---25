import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getWorkspace } from "@/lib/insights";
import { findApplicationByJob } from "@/lib/db";
import { skillLabel } from "@/lib/skills";
import { VERDICT_COPY } from "@/lib/engines/trust";
import { decideAction, startApplicationAction } from "@/app/actions";
import { ConfidenceNote, FitScore, Meter, TrustPill } from "@/components/ui";

const SEVERITY_STYLE = {
  serious: { background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "#e6bdb5" },
  caution: { background: "var(--color-warn-soft)", color: "var(--color-warn)", borderColor: "#e8cfa8" },
  info: { background: "var(--color-info-soft)", color: "var(--color-info)", borderColor: "#c8d6e8" },
} as const;

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mono-xs">Loading the reasoning…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const ws = getWorkspace();
  const insight = ws.byId.get(id);
  if (!insight) notFound();

  const { job, trust, fit } = insight;
  const application = findApplicationByJob(job.id);
  const duplicate = trust.duplicateOf ? ws.byId.get(trust.duplicateOf) : null;

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
        <span style={{ color: "var(--color-ink-faint)" }}> · {job.source}</span>
      </p>

      <header style={{ marginBottom: 22 }}>
        <p className="eyebrow" style={{ margin: 0 }}>
          {job.company} · {job.location} · {job.workMode} · {job.seniority}
        </p>
        <h1 className="display" style={{ margin: "6px 0 0", maxWidth: "24ch" }}>
          {job.title}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
          <TrustPill trust={trust} />
          <span className="pill pill-neutral">{salary}</span>
          <span className="pill pill-neutral">about {insight.minutes} min to apply</span>
          {job.coverLetterRequired ? <span className="pill pill-neutral">cover letter required</span> : null}
          {application ? <span className="pill pill-clear">application in progress</span> : null}
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
        <form action={startApplicationAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <button className="btn btn-accent" type="submit">
            {application ? "Open application" : "Start application"}
          </button>
        </form>
        <form action={decideAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="kind" value="maybe" />
          <input type="hidden" name="reason" value="Shortlisted for a later week" />
          <button className="btn" type="submit">
            Keep for later
          </button>
        </form>
        <form action={decideAction} style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="kind" value="skip" />
          <input type="hidden" name="reason" value="Skipped from the listing page" />
          <button className="btn" type="submit">
            Skip this one
          </button>
        </form>
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
              {job.source}
            </p>
          </section>
        </div>

        <aside>
          <section className="card" style={{ padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Trust check
              </p>
              <span className="num" style={{ fontSize: 12, color: "var(--color-ink-faint)" }}>
                {trust.score}/100
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 15 }}>{VERDICT_COPY[trust.verdict].label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              {trust.flags.length === 0
                ? "No warning signs found in the checks we can run."
                : `${trust.flags.length} signal(s) found. Each one names what we saw and what would settle it.`}
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {trust.flags.map((flag) => (
                <div key={flag.code} className="card" style={{ padding: "11px 12px", background: "#fbf9f2" }}>
                  <span className="pill" style={{ ...SEVERITY_STYLE[flag.severity], fontSize: 10.5 }}>
                    {flag.severity === "serious" ? "serious" : flag.severity === "caution" ? "check" : "note"}
                  </span>
                  <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 550 }}>{flag.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-ink-soft)" }}>{flag.observed}</p>
                  <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--color-ink-soft)" }}>{flag.why}</p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-accent)" }}>→ {flag.resolve}</p>
                </div>
              ))}
            </div>

            {duplicate ? (
              <p style={{ margin: "12px 0 0", fontSize: 12.5 }}>
                Compare with{" "}
                <Link href={`/jobs/${duplicate.job.id}`} className="link-underline">
                  {duplicate.job.title} at {duplicate.job.company}
                </Link>
                .
              </p>
            ) : null}

            {trust.checked.length ? (
              <>
                <hr className="rule" style={{ margin: "14px 0 10px" }} />
                <p className="eyebrow" style={{ margin: 0 }}>
                  Also checked
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", fontSize: 12, color: "var(--color-ink-soft)" }}>
                  {trust.checked.map((item) => (
                    <li key={item} style={{ padding: "2px 0" }}>
                      ✓ {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 12, lineHeight: 1.6 }}>
              We never remove a listing for being doubtful. Your override is recorded, not used to hide it.
            </p>
          </section>

          <section className="card card-pad" style={{ background: "#fbf9f2" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Time and money
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>
              About {insight.minutes} minutes: reading the posting, tailoring the draft, and filling the form.
            </p>
            {job.salaryMin ? (
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                Advertised {salary}.{" "}
                {ws.candidate.minSalary && job.salaryMin < ws.candidate.minSalary
                  ? `Below your stated floor of £${ws.candidate.minSalary.toLocaleString()}.`
                  : "At or above your stated floor."}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </>
  );
}
