import { useActionState, useState } from "react";
import { importLiveJobsAction, type ImportState } from "@/app/actions";
import { SOURCES } from "@/lib/sources";
import { Globe, Sparkles, MapPin } from "lucide-react";

const initial: ImportState = { ok: false, message: "", imported: 0, results: [] };

export function LiveImport() {
  const [state, action, pending] = useActionState(importLiveJobsAction, initial);
  const [workCompatibility, setWorkCompatibility] = useState("remote");
  const [specificLocation, setSpecificLocation] = useState("");

  return (
    <div className="card" style={{ padding: "18px 22px", marginBottom: 20, borderRadius: 16 }}>
      {/* Static Heading: Already Open */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Globe size={18} color="#059669" />
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
          Fetch and Import Live Opportunities
        </h3>
      </div>

      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--color-ink-soft)", maxWidth: "78ch", lineHeight: 1.5 }}>
        Search and pull fresh verified openings across our live talent network. Every imported role is automatically evaluated for skill match, level alignment, and role requirements.
      </p>

      <form action={action}>
        {/* Pass all sources in the background so no feed names or scraping sources are exposed */}
        {SOURCES.map((source) => (
          <input key={source.id} type="hidden" name="sources" value={source.id} />
        ))}
        {/* Hidden batch limit since Jobs Per Batch filter is removed */}
        <input type="hidden" name="limit" value="6" />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          {/* Role or Skill Keyword */}
          <div style={{ flex: "1 1 220px", maxWidth: 300 }}>
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

          {/* Work Compatibility Filter */}
          <div style={{ flex: "1 1 180px", maxWidth: 220 }}>
            <label className="field" htmlFor="live-compatibility">
              Work Compatibility
            </label>
            <select
              className="select"
              id="live-compatibility"
              name="workCompatibility"
              value={workCompatibility}
              onChange={(e) => setWorkCompatibility(e.target.value)}
            >
              <option value="remote">Fully Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="independent">Location Independent</option>
              <option value="specific">Location Specific</option>
            </select>
          </div>

          {/* Location Specific Input Field */}
          {workCompatibility === "specific" && (
            <div style={{ flex: "1 1 200px", maxWidth: 260 }}>
              <label className="field" htmlFor="live-location" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={12} color="#059669" />
                <span>Specify Location</span>
              </label>
              <input
                id="live-location"
                name="location"
                className="input"
                value={specificLocation}
                onChange={(e) => setSpecificLocation(e.target.value)}
                placeholder="e.g. New York, London, Bangalore"
                required={workCompatibility === "specific"}
              />
            </div>
          )}

          {/* Fetch Live Opportunities Button */}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending}
            style={{ borderRadius: 999, padding: "10px 22px", display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700 }}
          >
            <Sparkles size={15} />
            <span>{pending ? "Fetching live openings..." : "Fetch Live Opportunities"}</span>
          </button>
        </div>
      </form>

      {state.message ? (
        <div
          style={{
            marginTop: 16,
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
    </div>
  );
}
