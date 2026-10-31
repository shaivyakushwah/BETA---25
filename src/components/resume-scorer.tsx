
import { useState, useTransition } from "react";
import { scoreResumeAction } from "@/app/actions";
import type { ResumeScoreResult } from "@/lib/gemini";

export function ResumeScorer({ initialTargetRole }: { initialTargetRole?: string }) {
  const [result, setResult] = useState<ResumeScoreResult | null>(null);
  const [targetRole, setTargetRole] = useState(initialTargetRole || "");
  const [isPending, startTransition] = useTransition();

  const handleScore = () => {
    startTransition(async () => {
      const res = await scoreResumeAction(targetRole || undefined);
      setResult(res);
    });
  };

  return (
    <div className="card card-pad" style={{ borderRadius: 16, marginTop: 24, border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
            
            <span>AI Resume Scoring &amp; ATS Audit</span>
          </div>
          <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Evaluate Resume Quality &amp; ATS Match
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Audit your resume with our AI Engine against modern technical hiring benchmarks.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Target role (optional e.g. React Developer)"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="input"
            style={{ width: 220, fontSize: 12.5, padding: "6px 12px" }}
          />
          <button
            onClick={handleScore}
            disabled={isPending}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "7px 18px" }}
          >
            {isPending ? "Auditing Resume…" : "Run AI Score"}
          </button>
        </div>
      </div>

      {result ? (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
          {/* Top Score Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#f8fafc", padding: "16px 20px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  background: result.overallScore >= 75 ? "linear-gradient(135deg, #059669, #00d084)" : result.overallScore >= 50 ? "#d97706" : "#e11d48",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <span>{result.overallScore}</span>
                <span style={{ fontSize: 9, opacity: 0.85, marginTop: -2 }}>/ 100</span>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  {result.headline}
                </h4>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#475569" }}>
                  {result.summary}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: result.interviewReadiness === "High" ? "#ecfdf5" : result.interviewReadiness === "Moderate" ? "#fffbeb" : "#fff1f2",
                  color: result.interviewReadiness === "High" ? "#065f46" : result.interviewReadiness === "Moderate" ? "#b45309" : "#e11d48",
                  border: `1px solid ${result.interviewReadiness === "High" ? "#a7f3d0" : result.interviewReadiness === "Moderate" ? "#fde68a" : "#fecdd3"}`,
                }}
              >
                Interview Readiness: {result.interviewReadiness}
              </span>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
                {result.source === "gemini" ? "AI Engine Powered" : "Standard Rules"}
              </span>
            </div>
          </div>

          {/* Sub-score grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 14 }}>
            {[
              { label: "Technical Match", score: result.breakdown.technicalMatch, max: 30 },
              { label: "Experience & Impact", score: result.breakdown.experienceImpact, max: 30 },
              { label: "Clarity & Structure", score: result.breakdown.clarityStructure, max: 20 },
              { label: "ATS Readiness", score: result.breakdown.atsReadiness, max: 20 },
            ].map((item) => (
              <div key={item.label} style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                  {item.score}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>/{item.max}</span>
                </p>
                <div style={{ height: 4, background: "#f1f5f9", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ width: `${(item.score / item.max) * 100}%`, height: "100%", background: "#059669", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths & Weaknesses 2-Column */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 14 }}>
            <div style={{ background: "#ecfdf5", padding: "14px 16px", borderRadius: 12, border: "1px solid #a7f3d0" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
                Key Strengths
              </p>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#064e3b", display: "grid", gap: 4 }}>
                {result.strengths.map((str, i) => (
                  <li key={i}>{str}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: "#fffbeb", padding: "14px 16px", borderRadius: 12, border: "1px solid #fde68a" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                Gaps &amp; Room for Growth
              </p>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#78350f", display: "grid", gap: 4 }}>
                {result.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable edits */}
          {result.actionableEdits.length > 0 ? (
            <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                Recommended Actionable Edits
              </p>
              <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#475569", display: "grid", gap: 3 }}>
                {result.actionableEdits.map((edit, i) => (
                  <li key={i}>{edit}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
