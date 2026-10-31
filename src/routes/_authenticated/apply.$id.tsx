import { createFileRoute, notFound } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense } from "react";
import Link from "@/lib/next-compat";
import { getApplication, getJob } from "@/lib/db";
import { getWorkspace } from "@/lib/insights";
import { suggestHighlights } from "@/lib/engines/resume";
import { skillAliases, skillLabel } from "@/lib/skills";
import { geminiAvailable } from "@/lib/status";
import { ApplicationWorkspace } from "@/components/application-workspace";
import { TrustPill } from "@/components/ui";
import { EmailDrafter } from "@/components/email-drafter";

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Opening your draft…</p>}>
      <Apply />
    </Suspense>
  );
}

function Apply() {
  useSnapshot();
  const { id } = Route.useParams();
  const application = getApplication(Number(id));
  if (!application) throw notFound();
  const job = getJob(application.jobId);
  if (!job) throw notFound();

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

      <div style={{ marginTop: 24 }}>
        <EmailDrafter
          jobTitle={job.title}
          company={job.company}
          candidateName={ws.candidate.name || "Candidate"}
          defaultRecruiterEmail={job.contactEmail || undefined}
        />
      </div>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/apply/$id")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Application draft — Shortlist" },
      { name: "description", content: "Application draft in Shortlist, the job search that fits your week." },
      { property: "og:title", content: "Application draft — Shortlist" },
      { property: "og:description", content: "Application draft in Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
});
