import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getApplication, getJob } from "@/lib/db";
import { getWorkspace } from "@/lib/insights";
import { suggestHighlights } from "@/lib/engines/resume";
import { skillAliases, skillLabel } from "@/lib/skills";
import { geminiAvailable } from "@/lib/gemini";
import { ApplicationWorkspace } from "@/components/application-workspace";
import { TrustPill } from "@/components/ui";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mono-xs">Opening your draft…</p>}>
      <Apply params={params} />
    </Suspense>
  );
}

async function Apply({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const application = getApplication(Number(id));
  if (!application) notFound();
  const job = getJob(application.jobId);
  if (!job) notFound();

  const ws = getWorkspace();
  const insight = ws.byId.get(job.id)!;
  const generated = suggestHighlights(ws.resumeText, ws.lines, job, insight.fit.matched);

  const catalog =
    application.highlights.length > 0
      ? application.highlights.map((item) => ({
          ...item,
          selected: item.selected !== false,
        }))
      : generated.suggestions.map((item) => ({ ...item, selected: true }));

  const unclaimed = insight.fit.gaps.map((gap) => ({
    label: skillLabel(gap.skill),
    aliases: skillAliases(gap.skill),
  }));

  return (
    <>
      <p className="mono-xs" style={{ marginBottom: 14 }}>
        <Link href={`/jobs/${job.id}`} className="link-underline">
          ← Back to the listing
        </Link>
        <span style={{ color: "var(--color-ink-faint)" }}> · application #{application.id}</span>
      </p>

      <header style={{ marginBottom: 22 }}>
        <p className="eyebrow" style={{ margin: 0 }}>
          {job.company} · {job.location} · {job.workMode}
        </p>
        <h1 className="display" style={{ margin: "6px 0 0", maxWidth: "26ch" }}>
          {job.title}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <TrustPill trust={insight.trust} />
          <span className="pill pill-neutral">{insight.fit.score}% fit</span>
          <span className="pill pill-neutral">{insight.fit.gaps.length} gap(s)</span>
          <span className="pill pill-neutral">{catalog.length} verified line(s)</span>
        </div>
      </header>

      <ApplicationWorkspace
        application={{
          id: application.id,
          draft: application.draft,
          coverLetter: application.coverLetter,
          status: application.status,
          submittedAt: application.submittedAt,
        }}
        job={{
          id: job.id,
          title: job.title,
          company: job.company,
          workMode: job.workMode,
          location: job.location,
          sourceUrl: job.sourceUrl,
          requirements: job.requirements,
        }}
        catalog={catalog}
        discarded={generated.discarded}
        unclaimed={unclaimed}
        gemini={geminiAvailable()}
      />
    </>
  );
}
