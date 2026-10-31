import { createFileRoute, notFound } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense } from "react";
import Link from "@/lib/next-compat";
import { getWorkspace } from "@/lib/insights";
import { jobFamily, FAMILY_LABEL, type JobFamily } from "@/lib/engines/market";
import { JobCard, PageHeader } from "@/components/ui";
import { LiveImport } from "@/components/live-import";
import { ListingImporter } from "@/components/listing-importer";

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading listings…</p>}>
      <Listings />
    </Suspense>
  );
}

const FAMILIES: JobFamily[] = ["frontend", "data", "ml", "backend", "platform", "design", "qa", "marketing", "support"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function Listings() {
  useSnapshot();
  const params = Route.useSearch() as Record<string, string | string[] | undefined>;
  const ws = getWorkspace();

  const q = (first(params.q) ?? "").toLowerCase();
  const family = first(params.family) ?? "all";
  const showClosed = first(params.closed) === "1";
  const sort = first(params.sort) ?? "fit";

  const now = new Date();
  const isClosed = (id: string) => {
    const insight = ws.byId.get(id)!;
    return (
      (insight.job.filledDaysAgo !== null && insight.job.filledDaysAgo !== undefined) ||
      Boolean(insight.job.expiresAt && new Date(insight.job.expiresAt) < now)
    );
  };

  let items = ws.insights.filter((insight) => {
    if (!showClosed && isClosed(insight.job.id)) return false;
    if (family !== "all" && jobFamily(insight.job) !== family) return false;
    if (q) {
      const haystack = `${insight.job.title} ${insight.job.company} ${insight.job.location} ${insight.job.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (sort === "recent") {
    items = [...items].sort((a, b) => new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime());
  }

  const closedCount = ws.insights.filter((i) => isClosed(i.job.id)).length;
  const linkFor = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    const current = { q, family, sort, closed: showClosed ? "1" : "", ...patch };
    for (const [key, value] of Object.entries(current)) if (value && value !== "all") next.set(key, value);
    const query = next.toString();
    return `/jobs${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow={`${ws.jobs.length} Listings · AI Matched`}
        title="Recommended Jobs"
        lede="Browse AI-matched opportunities tailored to your resume, skills, and target roles."
      />

      <LiveImport />

      <ListingImporter />

      <div className="card" style={{ padding: "12px 14px", marginBottom: 18 }}>
        <form action="/jobs" method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: "1 1 240px" }}>
            <label className="field" htmlFor="q">
              Search
            </label>
            <input className="input" id="q" name="q" defaultValue={q} placeholder="title, company, wording…" />
          </div>
          <div>
            <label className="field" htmlFor="family">
              Family
            </label>
            <select className="select" id="family" name="family" defaultValue={family}>
              <option value="all">All</option>
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {FAMILY_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field" htmlFor="sort">
              Sort By
            </label>
            <select className="select" id="sort" name="sort" defaultValue={sort}>
              <option value="fit">Best Match</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
          {showClosed ? <input type="hidden" name="closed" value="1" /> : null}
          <button className="btn btn-primary" type="submit">
            Apply filters
          </button>
        </form>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <Link href={linkFor({ closed: showClosed ? "" : "1" })} className="pill pill-neutral" style={{ textDecoration: "none" }}>
            {showClosed ? "Hide" : "Show"} {closedCount} closed listing{closedCount === 1 ? "" : "s"}
          </Link>
          <Link href="/jobs" className="pill pill-neutral" style={{ textDecoration: "none" }}>
            Reset
          </Link>
        </div>
      </div>

      <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginBottom: 10 }}>
        {items.length} shown
      </p>

      <div className="grid-2">
        {items.map((insight) => (
          <JobCard key={insight.job.id} insight={insight} />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: "48px 24px", borderRadius: 16 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>No listings found in your database.</p>
          <p style={{ margin: "8px auto 20px", fontSize: 13.5, color: "#64748b", maxWidth: "52ch" }}>
            Use &quot;Import live listings&quot; above to fetch verified remote roles from 11 live feeds, or paste any listing URL to evaluate trust and fit.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/jobs" className="btn btn-primary btn-sm">
              Reset Filters
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const Route = createFileRoute("/_authenticated/jobs/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "AI Job Matches — Shortlist" },
      { name: "description", content: "AI Job Matches in Shortlist, the job search that fits your week." },
      { property: "og:title", content: "AI Job Matches — Shortlist" },
      { property: "og:description", content: "AI Job Matches in Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
  validateSearch: (search: Record<string, unknown>) => search,
});
