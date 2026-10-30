import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getWorkspace } from "@/lib/insights";
import { jobFamily, FAMILY_LABEL, type JobFamily } from "@/lib/engines/market";
import { JobCard, PageHeader } from "@/components/ui";
import { LiveImport } from "@/components/live-import";
import { addJobFromTextAction } from "@/app/actions";

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="mono-xs">Loading listings…</p>}>
      <Listings searchParams={searchParams} />
    </Suspense>
  );
}

const FAMILIES: JobFamily[] = ["frontend", "data", "ml", "backend", "platform", "design", "qa", "marketing", "support"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function Listings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const ws = getWorkspace();

  const q = (first(params.q) ?? "").toLowerCase();
  const family = first(params.family) ?? "all";
  const verdict = first(params.verdict) ?? "all";
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
    if (verdict !== "all" && insight.trust.verdict !== verdict) return false;
    if (q) {
      const haystack = `${insight.job.title} ${insight.job.company} ${insight.job.location} ${insight.job.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (sort === "recent") {
    items = [...items].sort((a, b) => new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime());
  } else if (sort === "trust") {
    items = [...items].sort((a, b) => b.trust.score - a.trust.score);
  } else if (sort === "time") {
    items = [...items].sort((a, b) => a.minutes - b.minutes);
  }

  const closedCount = ws.insights.filter((i) => isClosed(i.job.id)).length;
  const linkFor = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    const current = { q, family, verdict, sort, closed: showClosed ? "1" : "", ...patch };
    for (const [key, value] of Object.entries(current)) if (value && value !== "all") next.set(key, value);
    const query = next.toString();
    return `/jobs${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow={`${ws.jobs.length} listings · ${ws.market.sample} in your target families`}
        title="Every listing, including the doubtful ones"
        lede="Nothing is filtered out of existence by the trust check. A listing with warnings stays here with its warnings attached, so you decide with the evidence in front of you."
      />

      <LiveImport />

      <details className="card" style={{ padding: "12px 14px", marginBottom: 18 }}>
        <summary>
          <span className="mono-xs" style={{ color: "var(--color-ink-soft)" }}>
            Paste a listing you found elsewhere
          </span>
        </summary>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)", maxWidth: "76ch" }}>
          Saw a role on a company site, a mailing list, or a jobs board we do not pull from? Paste the text and it joins
          the same board. We cannot verify a company domain from pasted text, so it will be marked unverified until you
          check the employer yourself. Skills are read from the wording you paste, so the more of the advert you include,
          the more useful the fit score.
        </p>
        <form
          action={addJobFromTextAction}
          style={{ display: "grid", gap: 8, marginTop: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <div>
            <label className="field" htmlFor="paste-title">
              Job title
            </label>
            <input className="input" id="paste-title" name="title" required placeholder="Junior Frontend Developer" />
          </div>
          <div>
            <label className="field" htmlFor="paste-company">
              Company
            </label>
            <input className="input" id="paste-company" name="company" required placeholder="Employer name" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="field" htmlFor="paste-description">
              Listing text
            </label>
            <textarea
              className="textarea"
              id="paste-description"
              name="description"
              required
              minLength={80}
              rows={6}
              placeholder="Paste the full advert here, including the responsibilities and requirements."
            />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" type="submit">
              Add to my board
            </button>
            <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
              Nothing is sent anywhere. This only adds a record you can read and score.
            </span>
          </div>
        </form>
      </details>

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
            <label className="field" htmlFor="verdict">
              Trust
            </label>
            <select className="select" id="verdict" name="verdict" defaultValue={verdict}>
              <option value="all">Any</option>
              <option value="clear">Clear</option>
              <option value="check">Needs a check</option>
              <option value="doubtful">Serious warnings</option>
            </select>
          </div>
          <div>
            <label className="field" htmlFor="sort">
              Sort
            </label>
            <select className="select" id="sort" name="sort" defaultValue={sort}>
              <option value="fit">Best fit</option>
              <option value="recent">Newest</option>
              <option value="trust">Most trustworthy</option>
              <option value="time">Quickest to apply</option>
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
        <div className="card card-pad">
          <p style={{ margin: 0 }}>No listing matches those filters.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-ink-soft)" }}>
            The filters are yours — nothing was removed behind your back.{" "}
            <Link href="/jobs" className="link-underline">
              Clear them
            </Link>
            .
          </p>
        </div>
      ) : null}
    </>
  );
}
