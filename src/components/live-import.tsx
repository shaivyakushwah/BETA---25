import { useActionState } from "react";
import { importLiveJobsAction, type ImportState } from "@/app/actions";
import { SOURCES } from "@/lib/sources";
import { Globe, Sparkles } from "lucide-react";

const initial: ImportState = { ok: false, message: "", imported: 0, results: [] };

export function LiveImport() {
  const [state, action, pending] = useActionState(importLiveJobsAction, initial);

  return (
    <details className="card" style={{ padding: "14px 18px", marginBottom: 20 }}>
      <summary style={{ cursor: "pointer" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Globe size={15} color="#059669" />
          Fetch &amp; Import Live Job Opportunities
        </span>
      </summary>

      <p style={{ margin: "10px 0 14px", fontSize: 13, color: "var(--color-ink-soft)", maxWidth: "78ch", lineHeight: 1.5 }}>
        Search and pull fresh verified openings across our live talent network. Every imported role is automatically evaluated for skill match, level alignment, and role requirements.
      </p>

      <form action={action}>
        {/* Pass all sources in the background so no feed names or scraping sources are exposed */}
        {SOURCES.map((source) => (
          <input key={source.id} type="hidden" name="sources" value={source.id} />
        ))}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: "1 1 240px", maxWidth: 360 }}>
            <label className="field" htmlFor="live-query">
              Role or Skill Keyword
            </label>
            <input
              id="live-query"
              name="query"
              className="input"
              defaultValue="frontend"
              placeholder="e.g. frontend, backend, python, react, data..."
            />
          </div>
          <div>
            <label className="field" htmlFor="live-limit">
              Jobs Per Batch
            </label>
            <select className="select" id="live-limit" name="limit" defaultValue="4">
              <option value="2">2 per network</option>
              <option value="4">4 per network</option>
              <option value="6">6 per network</option>
              <option value="10">10 per network</option>
            </select>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending}
            style={{ borderRadius: 999, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Sparkles size={14} />
            <span>{pending ? "Fetching live openings..." : "Fetch Live Opportunities"}</span>
          </button>
        </div>
      </form>

      {state.message ? (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: state.ok ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${state.ok ? "#a7f3d0" : "#fecaca"}`,
            color: state.ok ? "#065f46" : "#991b1b",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {state.message.replace(/from \d+ sources?/gi, "from verified network")}
        </div>
      ) : null}
    </details>
  );
}
