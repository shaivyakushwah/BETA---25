import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getWorkspace } from "@/lib/insights";
import { getResults } from "@/lib/results";
import { describeOutcomes, wilson } from "@/lib/engines/honesty";
import { analyseLongShot, FAMILY_LABEL } from "@/lib/engines/market";
import { skillLabel, SKILL_BY_ID } from "@/lib/skills";
import { PageHeader, SectionTitle } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Working out what the numbers support…</p>}>
      <Evidence />
    </Suspense>
  );
}

const RELIABILITY_COPY = {
  none: ["Nothing yet", "No data. We will not invent a trend."],
  anecdote: ["Anecdote", "Under 5 applications. Treat every number as a story, not evidence."],
  directional: ["Directional", "5–14 applications. Useful for spotting a disaster, not for optimising."],
  moderate: ["Moderate", "15–29 applications. Patterns are forming, but the range is still wide."],
  reasonable: ["Reasonable", "30+ applications. Enough to compare approaches, if you tracked them consistently."],
} as const;

async function Evidence() {
  await connection();
  const ws = getWorkspace();
  const results = getResults();
  const honesty = describeOutcomes(results.sample);
  const longShot = analyseLongShot(ws.candidate, ws.candidate.longShotGoal ?? "", ws.jobs, ws.skills);

  const demands = [...ws.market.mustDemand.entries()]
    .map(([skill, count]) => ({ skill, count, has: ws.skills.has(skill) }))
    .sort((a, b) => b.count - a.count);

  const topDemanded = demands.slice(0, 10);
  // Only suggest learning things that gate real listings, and only where a
  // project could plausibly show the skill. Soft skills are not a course.
  const missingTop = demands
    .filter((d) => !d.has && SKILL_BY_ID.get(d.skill)?.family !== "soft")
    .slice(0, 4);

  const fitBySkill = (skillId: string) => {
    const affected = ws.market.listings.filter((job) =>
      job.requirements.some((r) => r.skill === skillId && r.must),
    );
    const scores = affected.map((job) => ws.byId.get(job.id)?.fit.score ?? 0).filter((s) => s > 0);
    const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const overall = Math.round(
      ws.market.listings.reduce((total, job) => total + (ws.byId.get(job.id)?.fit.score ?? 0), 0) /
        Math.max(1, ws.market.listings.length),
    );
    return { count: affected.length, average, overall };
  };

  const interval = wilson(results.sample.responses, results.sample.applications);

  return (
    <>
      <PageHeader
        eyebrow="Evidence"
        title="What the numbers can and cannot support"
        lede="This page is built to stop us (and you) over-reading a handful of applications. Every claim shows its sample size, and every threshold is stated in advance."
      />

      <section className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Results · {RELIABILITY_COPY[honesty.reliability][0]}
            </p>
            <h2 style={{ fontSize: 26, margin: "6px 0 0" }}>{honesty.headline}</h2>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--color-ink-soft)", maxWidth: "62ch" }}>
              {honesty.body}
            </p>
          </div>
          <div style={{ flex: "0 1 260px" }}>
            <div className="grid-3" style={{ gap: 8 }}>
              {[
                ["Sent", results.sample.applications],
                ["Replies", results.sample.responses],
                ["Interviews", results.sample.interviews],
              ].map(([label, value]) => (
                <div key={String(label)} className="card" style={{ padding: 10, background: "#fbf9f2" }}>
                  <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                    {label}
                  </p>
                  <p className="num" style={{ margin: 0, fontSize: 20 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {interval ? (
              <div style={{ marginTop: 12 }}>
                <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                  95% range for your true reply rate
                </p>
                <div style={{ position: "relative", height: 22, background: "#eae6da", borderRadius: 3, marginTop: 4 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: `${interval[0] * 100}%`,
                      width: `${Math.max(2, (interval[1] - interval[0]) * 100)}%`,
                      top: 0,
                      bottom: 0,
                      background: "#b9d7c9",
                      borderLeft: "1px solid var(--color-accent)",
                      borderRight: "1px solid var(--color-accent)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: `calc(${honesty.rate * 100}% - 1px)`,
                      top: -3,
                      bottom: -3,
                      width: 2,
                      background: "var(--color-ink)",
                    }}
                  />
                </div>
                <p className="mono-xs" style={{ margin: "3px 0 0", color: "var(--color-ink-soft)" }}>
                  {Math.round(interval[0] * 100)}% – {Math.round(interval[1] * 100)}% · observed{" "}
                  {Math.round(honesty.rate * 100)}%
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <hr className="rule" style={{ margin: "16px 0" }} />

        <div className="grid-2">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              We will not conclude
            </p>
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              {honesty.cannotConclude.map((item) => (
                <li key={item} style={{ marginBottom: 4 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              Caveats we apply to ourselves
            </p>
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              {honesty.caveats.map((item) => (
                <li key={item} style={{ marginBottom: 4 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 26 }}>
        <SectionTitle right={<span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>threshold stated up front</span>}>
          How much data before we speak
        </SectionTitle>
        <div className="card" style={{ overflow: "hidden" }}>
          {(Object.keys(RELIABILITY_COPY) as (keyof typeof RELIABILITY_COPY)[]).map((key, index) => {
            const active = honesty.reliability === key;
            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1fr",
                  gap: 12,
                  padding: "9px 14px",
                  borderTop: index === 0 ? 0 : "1px solid var(--color-line-soft)",
                  background: active ? "var(--color-accent-soft)" : "transparent",
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: active ? 550 : 400 }}>{RELIABILITY_COPY[key][0]}</span>
                <span style={{ fontSize: 12.5, color: "var(--color-ink-soft)" }}>{RELIABILITY_COPY[key][1]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: 26 }}>
        <SectionTitle
          right={
            <span className="pill" style={{ background: ws.market.enough ? "var(--color-accent-soft)" : "var(--color-warn-soft)", borderColor: ws.market.enough ? "#bcd9cb" : "#e8cfa8", color: ws.market.enough ? "var(--color-accent)" : "var(--color-warn)" }}>
              sample {ws.market.sample} / {ws.market.minSample}
            </span>
          }
        >
          What the market keeps asking for
        </SectionTitle>

        <p className="lede" style={{ fontSize: 13.5, margin: "0 0 10px" }}>
          {ws.market.enough
            ? `Counted across ${ws.market.sample} listings in ${ws.market.families.map((f) => FAMILY_LABEL[f].toLowerCase()).join(" and ")} that are open to your level, posted in the last ${ws.market.windowDays} days. A skill is counted only when the listing marks it as a must-have. We do not give skill advice below ${ws.market.minSample} listings — one unusual advert should not change your career.`
            : `Only ${ws.market.sample} usable listings so far, below our threshold of ${ws.market.minSample}. Treat the counts as a hint, not a finding.`}
        </p>

        <div className="card" style={{ overflow: "hidden", marginBottom: 12 }}>
          {topDemanded.map((row, index) => (
            <div
              key={row.skill}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 150px 70px",
                gap: 12,
                alignItems: "center",
                padding: "8px 14px",
                borderTop: index === 0 ? 0 : "1px solid var(--color-line-soft)",
              }}
            >
              <span style={{ fontSize: 13 }}>
                {skillLabel(row.skill)}{" "}
                {row.has ? (
                  <span style={{ color: "var(--color-accent)", fontSize: 11.5 }}>· in your resume</span>
                ) : (
                  <span style={{ color: "var(--color-danger)", fontSize: 11.5 }}>· not in your resume</span>
                )}
              </span>
              <div className="meter">
                <span
                  style={{
                    width: `${(row.count / Math.max(1, ws.market.sample)) * 100}%`,
                    background: row.has ? "var(--color-accent)" : "#c9b7a8",
                  }}
                />
              </div>
              <span className="num" style={{ fontSize: 11.5, textAlign: "right", color: "var(--color-ink-soft)" }}>
                {row.count}/{ws.market.sample}
              </span>
            </div>
          ))}
        </div>

        {missingTop.length > 0 ? (
          <div className="grid-3">
            {missingTop.map((row) => {
              const fit = fitBySkill(row.skill);
              return (
                <div key={row.skill} className="card card-pad">
                  <p className="eyebrow" style={{ margin: 0 }}>
                    If you learned {skillLabel(row.skill)}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                    {fit.count} of {ws.market.sample} listings ask for it as a must-have. Your average fit on those is{" "}
                    <strong>{fit.average ?? "—"}</strong>, against <strong>{fit.overall}</strong> elsewhere.
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-ink-soft)" }}>
                    One project that uses it would let you answer the question honestly. That is a smaller step than a
                    course certificate with no work attached.
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {longShot ? (
        <section>
          <SectionTitle right={<span className="pill pill-neutral">long-shot goal</span>}>
            “{longShot.goal}”
          </SectionTitle>
          <div className="card card-pad" style={{ background: "#fbf9f2" }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>{longShot.message}</p>
            <div className="grid-3" style={{ marginTop: 12 }}>
              <div>
                <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                  listings sampled
                </p>
                <p className="num" style={{ margin: 0, fontSize: 20 }}>
                  {longShot.total}
                </p>
              </div>
              <div>
                <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                  open to your level
                </p>
                <p className="num" style={{ margin: 0, fontSize: 20 }}>
                  {longShot.openToNewGrads} of {longShot.total}
                </p>
              </div>
              <div>
                <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                  common skills you already have
                </p>
                <p className="num" style={{ margin: 0, fontSize: 20 }}>
                  {longShot.covered.length} of {longShot.typicalRequirements.length}
                </p>
              </div>
              <div>
                <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-faint)" }}>
                  skills they ask for
                </p>
                <p style={{ margin: 0, fontSize: 12.5 }}>
                  {longShot.typicalRequirements
                    .map((r) => `${skillLabel(r.skill)} (${r.count})`)
                    .join(", ")}
                </p>
              </div>
            </div>
            {longShot.missing.length > 0 ? (
              <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
                Missing from your resume: {longShot.missing.map((s) => skillLabel(s)).join(", ")}. We are not telling you
                to give up; we are telling you what the sample shows and what would have to change.
              </p>
            ) : null}
            <p className="mono-xs" style={{ margin: "10px 0 0", color: "var(--color-ink-faint)" }}>
              Fairness check: this compares you to the same listings everyone sees, not to an imagined ideal candidate.
              Two gates are fixed before looking at your profile — at least 20% of these roles open to interns or juniors,
              and at least half their most-requested skills already in your resume.{" "}
              <Link href="/profile" className="link-underline">
                Change the goal
              </Link>
              .
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
