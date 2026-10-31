import { useState } from "react";
import { tailorResumeAction } from "@/app/actions";
import type { Job, Candidate } from "@/lib/types";
import type { TailorResumeResult } from "@/lib/gemini";
import {
  Sparkles,
  Download,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ResumeTailorerProps {
  job: Job;
  candidate: Candidate;
  resumeText: string;
  initialMatchScore?: number;
}

export function ResumeTailorer({ job, candidate, resumeText, initialMatchScore = 80 }: ResumeTailorerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResumeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editedResume, setEditedResume] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");

  const displayName = candidate.name || "Candidate";
  const displayEmail = candidate.email || "candidate@example.com";
  const displayLocation = candidate.location || "Remote / Relocation";

  async function handleTailor() {
    setLoading(true);
    setIsOpen(true);
    try {
      const formData = new FormData();
      formData.set("jobTitle", job.title);
      formData.set("company", job.company);
      formData.set("jobDescription", job.description);
      formData.set(
        "requirements",
        (job.requirements || []).map((r) => r.skill).join(", ")
      );
      formData.set("candidateName", displayName);
      formData.set("candidateEmail", displayEmail);
      formData.set("candidateLocation", displayLocation);
      formData.set("candidateHeadline", candidate.headline || "");
      formData.set("resumeText", resumeText);

      const res = await tailorResumeAction(formData);
      setResult(res);
      setEditedResume(res.tailoredResume);
    } catch (err) {
      console.error("Resume tailoring failed", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const textToCopy = editedResume || result?.tailoredResume || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleDownloadTxt() {
    const textToDownload = editedResume || result?.tailoredResume || "";
    if (!textToDownload) return;

    const safeCompany = job.company.replace(/[^a-zA-Z0-9]/g, "_");
    const safeName = displayName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeName}_Resume_${safeCompany}.txt`;

    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDownloadPdf() {
    const textToPrint = editedResume || result?.tailoredResume || "";
    if (!textToPrint) return;

    const safeCompany = job.company.replace(/[^a-zA-Z0-9]/g, " ");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      handleDownloadTxt();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${displayName} - Tailored Resume (${safeCompany})</title>
  <style>
    @page { margin: 15mm 20mm; size: letter portrait; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 11pt;
      margin: 0;
      padding: 20px;
    }
    h1 { font-size: 22pt; margin: 0 0 4px; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; }
    .contact { font-size: 10pt; color: #475569; margin-bottom: 18px; border-bottom: 2px solid #00D084; padding-bottom: 8px; }
    .target-badge { font-size: 9.5pt; font-weight: 700; color: #059669; margin-bottom: 14px; }
    h2 { font-size: 12.5pt; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 16px 0 8px; color: #0f172a; }
    p { margin: 0 0 10px; }
    ul { margin: 0 0 12px; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .role-header { display: flex; justify-content: space-between; font-weight: 700; color: #0f172a; }
    .skills-block { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; font-size: 10pt; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>${displayName}</h1>
  <div class="contact">
    ${displayLocation} &bull; ${displayEmail} &bull; ${candidate.headline || job.title}
  </div>
  <div class="target-badge">
    TAILORED APPLICATION: ${job.title.toUpperCase()} &bull; ${job.company.toUpperCase()}
  </div>
  <pre style="white-space: pre-wrap; font-family: inherit; font-size: inherit; margin: 0;">${textToPrint}</pre>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return (
    <section
      className="card"
      style={{
        padding: "20px 22px",
        marginBottom: 16,
        background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
        border: "1px solid #bbf7d0",
        borderRadius: 18,
        boxShadow: "0 4px 14px rgba(0, 208, 132, 0.08)",
      }}
    >
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#00D084",
                color: "#003b26",
                borderRadius: "50%",
                width: 26,
                height: 26,
              }}
            >
              <Sparkles size={14} strokeWidth={2.4} />
            </span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#065f46" }}>
              AI Resume Tailorer
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#047857", lineHeight: 1.4 }}>
            Customizes your uploaded profile resume specifically for <strong>{job.title}</strong> at <strong>{job.company}</strong>.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#059669",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title={isOpen ? "Collapse tailored resume" : "Expand tailored resume"}
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>

      {/* Trigger / Generation State */}
      {!result && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12.5, color: "#334155", margin: "0 0 12px", lineHeight: 1.5 }}>
            Aligns your work accomplishments, relevant technologies, and summary with the exact keywords and skills required in this job posting. Downloadable as PDF or text.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={handleTailor}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#00D084",
              color: "#003b26",
              border: "none",
              borderRadius: 999,
              padding: "10px 22px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(0, 208, 132, 0.28)",
              transition: "all 160ms ease",
            }}
          >
            <Sparkles size={16} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Tailoring resume for this role..." : "Tailor Resume for this Job"}</span>
          </button>
        </div>
      )}

      {/* Tailored Result Box */}
      {result && isOpen && (
        <div style={{ marginTop: 16, borderTop: "1px solid #dcfce7", paddingTop: 16 }}>
          {/* Match Improvement Badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>
                ATS Match: {initialMatchScore}% &rarr; {result.matchScore}%
              </span>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {result.matchImprovement}
              </span>
            </div>

            {/* Quick Action Download Buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleDownloadPdf}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#00D084",
                  color: "#003b26",
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Download formatted printable PDF file"
              >
                <Printer size={13} />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Download as TXT file"
              >
                <Download size={13} />
                <span>Download (.TXT)</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: copied ? "#dcfce7" : "#ffffff",
                  color: copied ? "#15803d" : "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Copy to clipboard"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Highlighted Skills matching JD */}
          {result.highlightedSkills.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Targeted Skills Featured in Resume:
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.highlightedSkills.map((sk) => (
                  <span
                    key={sk}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs: Formatted Preview vs Raw Editable Text */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              style={{
                background: "none",
                border: "none",
                fontSize: 12.5,
                fontWeight: activeTab === "preview" ? 700 : 500,
                color: activeTab === "preview" ? "#059669" : "#64748b",
                borderBottom: activeTab === "preview" ? "2px solid #059669" : "none",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Formatted Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              style={{
                background: "none",
                border: "none",
                fontSize: 12.5,
                fontWeight: activeTab === "raw" ? 700 : 500,
                color: activeTab === "raw" ? "#059669" : "#64748b",
                borderBottom: activeTab === "raw" ? "2px solid #059669" : "none",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Edit Raw Resume Text
            </button>
          </div>

          {/* Formatted Preview */}
          {activeTab === "preview" && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "16px",
                maxHeight: 380,
                overflowY: "auto",
                fontSize: 12.5,
                lineHeight: 1.6,
                color: "#1e293b",
              }}
            >
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 12 }}>
                <h4 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 800 }}>{displayName}</h4>
                <p style={{ margin: 0, fontSize: 11.5, color: "#64748b" }}>
                  {displayLocation} &bull; {displayEmail}
                </p>
              </div>

              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Tailored Professional Summary
                </p>
                <p style={{ margin: 0, color: "#334155" }}>{result.tailoredSummary}</p>
              </div>

              {result.tailoredExperience.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Experience &amp; Targeted Projects
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {result.tailoredExperience.map((exp, idx) => (
                      <div key={idx} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12 }}>
                          <span>{exp.title}</span>
                          <span style={{ color: "#64748b", fontWeight: 500 }}>{exp.dates}</span>
                        </div>
                        <p style={{ margin: "1px 0 4px", fontSize: 11.5, color: "#059669", fontWeight: 600 }}>{exp.organization}</p>
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} style={{ fontSize: 11.5, color: "#334155" }}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.tailoredEducation.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Education
                  </p>
                  {result.tailoredEducation.map((edu, idx) => (
                    <div key={idx} style={{ fontSize: 12 }}>
                      <strong>{edu.degree}</strong> — {edu.institution} ({edu.dates})
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#64748b" }}>{edu.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Raw Text Editable */}
          {activeTab === "raw" && (
            <div>
              <textarea
                className="textarea"
                rows={12}
                value={editedResume}
                onChange={(e) => setEditedResume(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.4 }}
              />
              <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
                Edits are reflected automatically in the Download PDF and Download TXT files.
              </p>
            </div>
          )}

          {/* Bottom Re-tailor option */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleTailor}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>Regenerate Tailored Resume</span>
            </button>

            <span className="mono-xs" style={{ color: "#059669", fontWeight: 600 }}>
              ATS Ready &bull; Customized for {job.company}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
