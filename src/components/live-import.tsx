import { useActionState, useState, useEffect } from "react";
import { importLiveJobsAction, runDailyJobSyncAction, type ImportState } from "@/app/actions";
import { SOURCES } from "@/lib/sources";
import { Globe, Sparkles, MapPin, RefreshCw, CheckCircle2 } from "lucide-react";

const initial: ImportState = { ok: false, message: "", imported: 0, results: [] };

export function LiveImport() {
  const [state, action, pending] = useActionState(importLiveJobsAction, initial);
  const [workCompatibility, setWorkCompatibility] = useState("remote");
  const [specificLocation, setSpecificLocation] = useState("");
  const [cronSyncing, setCronSyncing] = useState(false);
  const [cronReport, setCronReport] = useState<{ message: string; lastSync: string; count?: number } | null>(null);

  useEffect(() => {
    // Check if 24 hours have passed since last automatic sync
    const lastSyncStr = typeof window !== "undefined" ? localStorage.getItem("last_24h_job_cron_sync") : null;
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (now - lastSyncTime >= twentyFourHours) {
      // Trigger automatic background 24h cron sync
      runDailyJobSyncAction()
        .then((res) => {
          localStorage.setItem("last_24h_job_cron_sync", now.toString());
          setCronReport({
            message: res.message,
            lastSync: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            count: res.imported,
          });
        })
        .catch((err) => console.warn("24h background cron sync notice:", err));
    } else {
      setCronReport({
        message: "24h Auto-Sync Cron Active: All opportunities up to date.",
        lastSync: new Date(lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
  }, []);

  async function handleTriggerCronSync() {
    if (cronSyncing) return;
    setCronSyncing(true);
    try {
      const res = await runDailyJobSyncAction();
      const now = Date.now();
      localStorage.setItem("last_24h_job_cron_sync", now.toString());
      setCronReport({
        message: res.message,
        lastSync: new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        count: res.imported,
      });
    } catch (err) {
      console.error("24h Cron execution notice:", err);
    } finally {
      setCronSyncing(false);
    }
  }

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

      {/* 24-Hour Automated Cron Sync Bar */}
      <div
        style={{
          marginTop: 16,
          padding: "10px 16px",
          background: "linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.25)",
            }}
          />
          <div style={{ fontSize: 13, color: "#065f46" }}>
            <strong>24h Auto-Sync Cron: Active</strong>
            <span style={{ color: "#047857", marginLeft: 8 }}>
              {cronReport?.lastSync ? `· Last sync: ${cronReport.lastSync}` : "· Runs automatically every 24 hours"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerCronSync}
          disabled={cronSyncing}
          style={{
            background: "#ffffff",
            border: "1px solid #86efac",
            color: "#065f46",
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: cronSyncing ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "all 150ms ease",
          }}
          title="Manually trigger the 24h cron job to fetch new opportunities immediately"
        >
          <RefreshCw size={12} className={cronSyncing ? "animate-spin" : ""} />
          <span>{cronSyncing ? "Running 24h cron..." : "Run 24h Sync Now"}</span>
        </button>
      </div>

      {cronReport?.count !== undefined && cronReport.count > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 8,
            color: "#065f46",
            fontSize: 12.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={14} color="#059669" />
          <span>{cronReport.message}</span>
        </div>
      )}
    </div>
  );
}
