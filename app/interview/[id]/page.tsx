import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getApplication, getJob, listEvents } from "@/lib/db";
import { getWorkspace } from "@/lib/insights";
import { buildInterviewPrep } from "@/lib/engines/interview";
import { PageHeader } from "@/components/ui";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mono-xs">Building your two-day plan…</p>}>
      <Prep params={params} />
    </Suspense>
  );
}

async function Prep({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const application = getApplication(Number(id));
  if (!application) notFound();
  const job = getJob(application.jobId);
  if (!job) notFound();

  const ws = getWorkspace();
  const insight = ws.byId.get(job.id)!;
  const prep = buildInterviewPrep(job, ws.candidate, ws.lines, insight.fit);
  const events = listEvents(application.id);
  const interviewEvent = events.find((event) => event.kind === "interview");
  const when = interviewEvent ? new Date(interviewEvent.at) : null;

  return (
    <>
      <p className="mono-xs" style={{ marginBottom: 14 }}>
        <Link href="/pipeline" className="link-underline">
          ← Pipeline
        </Link>
        <span style={{ color: "var(--color-ink-faint)" }}> · application #{application.id}</span>
      </p>

      <PageHeader
        eyebrow={`${job.title} · ${job.company}${when ? ` · interview logged ${when.toLocaleDateString("en-GB")}` : ""}`}
        title={prep.headline}
        lede={prep.subhead}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 26, alignItems: "start" }}>
        <div>
          {prep.blocks.map((day) => (
            <section key={day.day} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span className="pill pill-neutral">{day.day}</span>
                <h2 style={{ fontSize: 19, margin: 0 }}>{day.focus}</h2>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {day.blocks.map((block) => (
                  <div key={block.title} className="card card-pad">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 550 }}>{block.title}</p>
                      <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
                        {block.minutes} min
                      </span>
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 13 }}>
                      {block.items.map((item, index) => (
                        <li key={index} style={{ marginBottom: 7 }}>
                          {item.text}
                          {item.cite ? (
                            <span className="mono-xs" style={{ display: "block", color: "var(--color-ink-faint)" }}>
                              your resume, line {item.cite.line} · {item.cite.section}
                            </span>
                          ) : null}
                          {item.fromPosting ? (
                            <span className="mono-xs" style={{ display: "block", color: "var(--color-ink-faint)" }}>
                              from this posting
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>Questions they will probably ask</h2>
            <div className="card card-pad">
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                {prep.questions.map((question) => (
                  <li key={question} style={{ marginBottom: 5 }}>
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside style={{ display: "grid", gap: 14 }}>
          <div className="card card-pad" style={{ background: "var(--color-accent-soft)", borderColor: "#bcd9cb" }}>
            <p className="eyebrow" style={{ margin: 0, color: "var(--color-accent)" }}>
              Why this is about this role
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#20463a" }}>{prep.honestyNote}</p>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              Ask them
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5 }}>
              {prep.askThem.map((question) => (
                <li key={question} style={{ marginBottom: 5 }}>
                  {question}
                </li>
              ))}
            </ul>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              Gaps to be ready for
            </p>
            {insight.fit.gaps.length === 0 ? (
              <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>No must-have gaps. They will probe depth instead.</p>
            ) : (
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5 }}>
                {insight.fit.gaps.map((gap) => (
                  <li key={gap.skill} style={{ marginBottom: 5 }}>
                    {gap.skill}
                    {gap.must ? " (must-have)" : ""} — {gap.demand} of {gap.sample} listings ask for it.
                  </li>
                ))}
              </ul>
            )}
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 8 }}>
              If you have not used it, say so. This page will never give you a story you did not live.
            </p>
          </div>

          <div className="card card-pad" style={{ background: "#fbf9f2" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              What we know about the company
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              Only what this posting says — we do not scrape their site or invent culture fit. Re-read the posting once
              with fresh eyes before you go in.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
