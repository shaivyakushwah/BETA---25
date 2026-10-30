"use client";

import { useActionState } from "react";
import { importLiveJobsAction, type ImportState } from "@/app/actions";
import { SOURCES } from "@/lib/sources";

const initial: ImportState = { ok: false, message: "", imported: 0, results: [] };

export function LiveImport() {
  const [state, action, pending] = useActionState(importLiveJobsAction, initial);

  return (
    <details className="card" style={{ padding: "12px 14px", marginBottom: 18 }}>
      <summary>
        <span className="mono-xs" style={{ color: "var(--color-ink-soft)" }}>
          Import live listings from {SOURCES.length} free feeds — same checks
        </span>
      </summary>

      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)", maxWidth: "78ch" }}>
        The seeded board keeps the demo reproducible. This fetches real roles from {SOURCES.filter((s) => s.kind === "api").length}{" "}
        public APIs and {SOURCES.filter((s) => s.kind === "rss").length} RSS feeds, then puts every listing through the same
        trust and fit engines. They arrive with no company domain, so they are marked unverified — we would rather say
        that than pretend a feed is a verified employer. Salaries are imported only when a feed publishes GBP; we will not
        convert dollars at a rate we invented.
      </p>

      <form action={action} style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: "1 1 240px", maxWidth: 320 }}>
            <label className="field" htmlFor="live-query">
              Words to match
            </label>
            <input
              id="live-query"
              name="query"
              className="input"
              defaultValue="frontend"
              placeholder="frontend, data, python… (empty = latest from every feed)"
            />
          </div>
          <div>
            <label className="field" htmlFor="live-limit">
              Max per feed
            </label>
            <select className="select" id="live-limit" name="limit" defaultValue="4">
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="10">10</option>
            </select>
          </div>
          <button className="btn btn-sm" type="submit" disabled={pending}>
            {pending ? `Fetching ${SOURCES.length} feeds…` : "Fetch listings"}
          </button>
        </div>

        <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
          <legend className="field" style={{ padding: 0, marginBottom: 6 }}>
            Sources
          </legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "6px 16px" }}>
            {SOURCES.map((source) => (
              <label
                key={source.id}
                htmlFor={`source-${source.id}`}
                style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12.5, cursor: "pointer" }}
                title={source.note}
              >
                <input
                  id={`source-${source.id}`}
                  type="checkbox"
                  name="sources"
                  value={source.id}
                  defaultChecked
                  style={{ marginTop: 3 }}
                />
                <span>
                  {source.label}
                  <span className="mono-xs" style={{ color: "var(--color-ink-faint)", marginLeft: 6 }}>
                    {source.kind}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      {state.message ? (
        <p
          className="mono-xs"
          style={{ marginTop: 10, color: state.ok ? "var(--color-accent)" : "var(--color-danger)" }}
        >
          {state.message}
        </p>
      ) : null}

      {state.results.length > 0 ? (
        <ul
          className="mono-xs"
          style={{
            listStyle: "none",
            padding: "8px 0 0",
            margin: 0,
            display: "grid",
            gap: 3,
            color: "var(--color-ink-soft)",
          }}
        >
          {state.results.map((result) => (
            <li key={result.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>
                {result.label}
                {result.ok ? "" : ` — ${result.error ?? "did not answer"}`}
              </span>
              <span className="num" style={{ flex: "none", color: result.ok ? undefined : "var(--color-danger)" }}>
                {result.ok ? `${result.imported} new / ${result.fetched} matched` : "failed"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}
