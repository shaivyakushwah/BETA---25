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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatResumeToStandardHtml(text: string, fallbackName: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => !/^[=\-_*#]{3,}$/.test(l.trim()));

  let bodyHtml = "";
  let inBullets = false;

  const sectionRegex =
    /^(PROFESSIONAL SUMMARY|SUMMARY|TECHNICAL SKILLS|SKILLS|CORE COMPETENCIES|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EXPERIENCE|PROJECTS|KEY TECHNICAL PROJECTS|KEY PROJECTS|EDUCATION|CERTIFICATIONS)$/i;

  let seenName = false;
  let seenContact = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (inBullets) {
        bodyHtml += "</ul>\n";
        inBullets = false;
      }
      continue;
    }

    if (!seenName) {
      seenName = true;
      bodyHtml += `<h1 class="resume-name">${escapeHtml(trimmed)}</h1>\n`;
      continue;
    }

    if (!seenContact && (trimmed.includes("•") || trimmed.includes("@") || trimmed.includes("|") || trimmed.includes("+"))) {
      seenContact = true;
      bodyHtml += `<div class="resume-contact">${escapeHtml(trimmed)}</div>\n`;
      continue;
    }

    if (sectionRegex.test(trimmed)) {
      if (inBullets) {
        bodyHtml += "</ul>\n";
        inBullets = false;
      }
      bodyHtml += `<div class="resume-section-title">${escapeHtml(trimmed.toUpperCase())}</div>\n`;
      continue;
    }

    if (/^[•\-\*]\s*/.test(trimmed)) {
      if (!inBullets) {
        bodyHtml += `<ul class="resume-bullets">\n`;
        inBullets = true;
      }
      const itemText = trimmed.replace(/^[•\-\*]\s*/, "");
      bodyHtml += `  <li>${escapeHtml(itemText)}</li>\n`;
      continue;
    }

    if (inBullets) {
      bodyHtml += "</ul>\n";
      inBullets = false;
    }

    if (trimmed.includes("—") || trimmed.includes(" - ") || trimmed.includes(" | ")) {
      bodyHtml += `<div class="resume-entry-header">${escapeHtml(trimmed)}</div>\n`;
    } else {
      bodyHtml += `<p class="resume-text">${escapeHtml(trimmed)}</p>\n`;
    }
  }

  if (inBullets) {
    bodyHtml += "</ul>\n";
  }

  return bodyHtml;
}

export function ResumeTailorer({ job, candidate, resumeText, initialMatchScore = 80 }: ResumeTailorerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResumeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editedResume, setEditedResume] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");

  const displayName = candidate.name || "";
  const displayEmail = candidate.email || "";
  const displayLocation = candidate.location || "";

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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      handleDownloadTxt();
      return;
    }

    const resumeBody = formatResumeToStandardHtml(textToPrint, displayName);

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(displayName)} - Resume</title>
  <style>
    @page {
      margin: 0.6in 0.75in;
      size: letter portrait;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, "Liberation Serif", serif;
      color: #000000;
      background: #ffffff;
      line-height: 1.35;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }
    .resume-name {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin: 0 0 3pt 0;
      color: #000000;
    }
    .resume-contact {
      font-size: 9.5pt;
      text-align: center;
      margin: 0 0 10pt 0;
      color: #000000;
    }
    .resume-section-title {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      border-bottom: 0.75pt solid #000000;
      padding-bottom: 1.5pt;
      margin-top: 10pt;
      margin-bottom: 4pt;
      color: #000000;
    }
    .resume-entry-header {
      font-size: 10pt;
      font-weight: bold;
      margin-top: 4pt;
      margin-bottom: 1.5pt;
      color: #000000;
    }
    .resume-text {
      font-size: 9.5pt;
      line-height: 1.35;
      margin: 0 0 3pt 0;
      color: #000000;
    }
    .resume-bullets {
      margin: 1.5pt 0 5pt 0;
      padding-left: 16pt;
      color: #000000;
    }
    .resume-bullets li {
      margin-bottom: 1.5pt;
      font-size: 9.5pt;
      line-height: 1.35;
      color: #000000;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${resumeBody}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
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
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "24px 28px",
                maxHeight: 460,
                overflowY: "auto",
                fontFamily: '"Times New Roman", Times, Georgia, "Liberation Serif", serif',
                fontSize: 13,
                lineHeight: 1.35,
                color: "#000000",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
              }}
            >
              <style>{`
                .resume-name {
                  font-size: 19px;
                  font-weight: bold;
                  text-align: center;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin: 0 0 4px 0;
                  color: #000000;
                }
                .resume-contact {
                  font-size: 12px;
                  text-align: center;
                  margin: 0 0 14px 0;
                  color: #000000;
                }
                .resume-section-title {
                  font-size: 13px;
                  font-weight: bold;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  border-bottom: 1px solid #000000;
                  padding-bottom: 2px;
                  margin-top: 12px;
                  margin-bottom: 5px;
                  color: #000000;
                }
                .resume-entry-header {
                  font-size: 12.5px;
                  font-weight: bold;
                  margin-top: 5px;
                  margin-bottom: 2px;
                  color: #000000;
                }
                .resume-text {
                  font-size: 12px;
                  line-height: 1.35;
                  margin: 0 0 4px 0;
                  color: #000000;
                }
                .resume-bullets {
                  margin: 2px 0 6px 0;
                  padding-left: 20px;
                  color: #000000;
                }
                .resume-bullets li {
                  margin-bottom: 2px;
                  font-size: 12px;
                  line-height: 1.35;
                  color: #000000;
                }
              `}</style>
              <div
                dangerouslySetInnerHTML={{
                  __html: formatResumeToStandardHtml(editedResume || result.tailoredResume, displayName),
                }}
              />
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
