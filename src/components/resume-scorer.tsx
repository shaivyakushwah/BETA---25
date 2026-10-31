import { useState, useTransition } from "react";
import { scoreResumeAction } from "@/app/actions";
import type { ResumeScoreResult, AtsCheckItem } from "@/lib/gemini";

export function ResumeScorer({ initialTargetRole }: { initialTargetRole?: string }) {
  const [result, setResult] = useState<ResumeScoreResult | null>(null);
  const [targetRole, setTargetRole] = useState(initialTargetRole || "");
  const [checklistFilter, setChecklistFilter] = useState<"all" | "pass" | "issues">("all");
  const [isPending, startTransition] = useTransition();

  const handleScore = () => {
    startTransition(async () => {
      const res = await scoreResumeAction(targetRole || undefined);
      setResult(res);
    });
  };

  const checks = result?.checks || [];
  const filteredChecks = checks.filter((c) => {
    if (checklistFilter === "pass") return c.status === "pass";
    if (checklistFilter === "issues") return c.status === "warning" || c.status === "fail";
    return true;
  });

  const passedCount = checks.filter((c) => c.status === "pass").length;
  const issuesCount = checks.filter((c) => c.status !== "pass").length;

  return (
    <div className="card card-pad" style={{ borderRadius: 16, marginTop: 24, border: "1px solid #e2e8f0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
            <span>Authentic ATS Scoring &amp; Audit Engine</span>
          </div>
          <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            ATS Parser Audit &amp; Benchmark Score
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Deterministic 16-parameter ATS evaluation modeled after enterprise systems (Workday, Taleo, Greenhouse, Jobscan).
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Target role (optional e.g. Frontend Engineer)"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="input"
            style={{ width: 240, fontSize: 12.5, padding: "7px 12px" }}
          />
          <button
            onClick={handleScore}
            disabled={isPending}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "7px 18px" }}
          >
            {isPending ? "Auditing ATS Parameters…" : "Audit ATS Score"}
          </button>
        </div>
      </div>

      {result ? (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
          {/* Top Overall Score Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#f8fafc", padding: "16px 20px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: result.overallScore >= 75 ? "linear-gradient(135deg, #059669, #00d084)" : result.overallScore >= 50 ? "#d97706" : "#e11d48",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 22,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <span>{result.overallScore}</span>
                <span style={{ fontSize: 10, opacity: 0.85, marginTop: -2 }}>/ 100</span>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  {result.headline}
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#475569", maxWidth: 640 }}>
                  {result.summary}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
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
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#059669", fontWeight: 600 }}>
                ✓ Authentic ATS Standard Engine
              </span>
            </div>
          </div>

          {/* Core Metric Highlights */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 14 }}>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>Word Count</p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                {result.wordCount}
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>
                  {result.wordCount >= 400 && result.wordCount <= 900 ? "(Optimal)" : "(Check Length)"}
                </span>
              </p>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>Quantified Metrics</p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#059669" }}>
                {result.metricsCount}
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>detected</span>
              </p>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>Action Verbs</p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#0284c7" }}>
                {result.actionVerbsCount}
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>strong verbs</span>
              </p>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>Tech Keywords</p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>
                {result.detectedSkills?.length || 0}
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>skills parsed</span>
              </p>
            </div>
          </div>

          {/* 5-Category Authentic ATS Parameter Breakdown */}
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              ATS Parameter Categories (Total 100 Points)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { label: "1. Header & Contact Info", score: result.breakdown.contactCompleteness ?? 15, max: 15 },
                { label: "2. Section Architecture", score: result.breakdown.sectionStructure ?? 20, max: 20 },
                { label: "3. Experience Impact & Metrics", score: result.breakdown.experienceImpact ?? 25, max: 25 },
                { label: "4. Technical Skills & Keywords", score: result.breakdown.technicalSkills ?? 25, max: 25 },
                { label: "5. ATS Formatting & Hygiene", score: result.breakdown.atsFormatting ?? 15, max: 15 },
              ].map((item) => {
                const pct = Math.round((item.score / item.max) * 100);
                const barColor = pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#e11d48";
                return (
                  <div key={item.label} style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#475569", fontWeight: 600 }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                        {item.score}<span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>/{item.max}</span>
                      </p>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extracted ATS Skills Chips */}
          {result.detectedSkills && result.detectedSkills.length > 0 && (
            <div style={{ marginTop: 16, background: "#f8fafc", padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Keywords Extracted by ATS Scanner ({result.detectedSkills.length}):
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.detectedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      border: "1px solid #bae6fd",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 16-Point Interactive ATS Audit Checklist */}
          {checks.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    16-Point ATS Inspection Checklist
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                    Detailed diagnostic report of every requirement parsed by employer ATS systems.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setChecklistFilter("all")}
                    className="btn"
                    style={{
                      fontSize: 11.5,
                      padding: "4px 10px",
                      background: checklistFilter === "all" ? "#0f172a" : "#ffffff",
                      color: checklistFilter === "all" ? "#ffffff" : "#475569",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    All ({checks.length})
                  </button>
                  <button
                    onClick={() => setChecklistFilter("pass")}
                    className="btn"
                    style={{
                      fontSize: 11.5,
                      padding: "4px 10px",
                      background: checklistFilter === "pass" ? "#059669" : "#ffffff",
                      color: checklistFilter === "pass" ? "#ffffff" : "#059669",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    Passed ({passedCount})
                  </button>
                  <button
                    onClick={() => setChecklistFilter("issues")}
                    className="btn"
                    style={{
                      fontSize: 11.5,
                      padding: "4px 10px",
                      background: checklistFilter === "issues" ? "#e11d48" : "#ffffff",
                      color: checklistFilter === "issues" ? "#ffffff" : "#e11d48",
                      border: "1px solid #fecdd3",
                    }}
                  >
                    Issues ({issuesCount})
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {filteredChecks.map((chk: AtsCheckItem) => (
                  <div
                    key={chk.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: chk.status === "pass" ? "#f0fdf4" : chk.status === "warning" ? "#fffbeb" : "#fff1f2",
                      border: `1px solid ${chk.status === "pass" ? "#bbf7d0" : chk.status === "warning" ? "#fde68a" : "#fecdd3"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          lineHeight: "20px",
                          color: chk.status === "pass" ? "#059669" : chk.status === "warning" ? "#d97706" : "#e11d48",
                        }}
                      >
                        {chk.status === "pass" ? "✓" : chk.status === "warning" ? "!" : "✕"}
                      </span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {chk.name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              textTransform: "uppercase",
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "#ffffff",
                              color: "#64748b",
                              border: "1px solid #e2e8f0",
                              fontWeight: 600,
                            }}
                          >
                            {chk.category}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569" }}>
                          {chk.message}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 48, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: chk.score === chk.maxScore ? "#059669" : chk.score > 0 ? "#d97706" : "#e11d48",
                        }}
                      >
                        +{chk.score}/{chk.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses 2-Column */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
            <div style={{ background: "#ecfdf5", padding: "14px 16px", borderRadius: 12, border: "1px solid #a7f3d0" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
                Identified Profile Strengths
              </p>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#064e3b", display: "grid", gap: 4 }}>
                {result.strengths.map((str, i) => (
                  <li key={i}>{str}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: "#fffbeb", padding: "14px 16px", borderRadius: 12, border: "1px solid #fde68a" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                Identified Gaps &amp; ATS Warnings
              </p>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#78350f", display: "grid", gap: 4 }}>
                {result.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Edits */}
          {result.actionableEdits && result.actionableEdits.length > 0 && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                Recommended Actionable Edits to Maximize Score
              </p>
              <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12.5, color: "#475569", display: "grid", gap: 3 }}>
                {result.actionableEdits.map((edit, i) => (
                  <li key={i}>{edit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
