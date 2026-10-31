import { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { parseResumeText, type ExtractedResumeData } from "@/lib/resume-parser";

/** Reads the text of a PDF in the browser, line by line. */
async function extractPdfText(file: File): Promise<{ text: string; lines: number }> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += item.str ?? "";
      if (item.hasEOL) {
        if (line.trim()) out.push(line.trim());
        line = "";
      }
    }
    if (line.trim()) out.push(line.trim());
  }
  if (out.length === 0) throw new Error("Could not read any text from this PDF");
  return { text: out.join("\n"), lines: out.length };
}

interface ResumeUploadProps {
  onExtracted?: (data: ExtractedResumeData) => void;
  buttonText?: string;
  variant?: "primary" | "secondary" | "compact";
  showHelperText?: boolean;
}

export function ResumeUpload({
  onExtracted,
  buttonText = "Upload Resume (.PDF / .TXT)",
  variant = "secondary",
  showHelperText = true,
}: ResumeUploadProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setStatus(null);

    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isText = file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md");

    if (!isPdf && !isText) {
      setError("Please upload a .pdf, .txt, or .md resume file.");
      return;
    }

    setLoading(true);

    try {
      let rawText = "";
      if (isText) {
        rawText = await file.text();
      } else if (isPdf) {
        setStatus(`Extracting text from ${file.name}...`);
        const data = await extractPdfText(file);
        rawText = data.text;
      }

      // Populate textarea if present in DOM
      populateTextarea(rawText);

      // Parse structured data
      const parsed = parseResumeText(rawText);

      if (onExtracted) {
        onExtracted(parsed);
      }

      const summaryParts: string[] = [];
      if (parsed.name) summaryParts.push(parsed.name);
      if (parsed.education.length > 0) summaryParts.push("Education");
      if (parsed.experience.length > 0) summaryParts.push("Experience");
      if (parsed.skills.length > 0) summaryParts.push(`${parsed.skills.length} Skills`);

      setStatus(
        `Extracted successfully: ${summaryParts.join(" • ")}. Click "Save Profile" to keep changes.`
      );
    } catch (err: any) {
      setError(err?.message || "Failed to process resume file");
    } finally {
      setLoading(false);
    }
  };

  const populateTextarea = (text: string) => {
    const textarea = document.getElementById("resume") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          style={
            variant === "primary"
              ? {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#00D084",
                  color: "#003b26",
                  border: "none",
                  borderRadius: 999,
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: "0 2px 8px rgba(0, 208, 132, 0.28)",
                  transition: "all 160ms ease",
                }
              : {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#f8fafc",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "7px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                }
          }
        >
          <UploadCloud size={16} strokeWidth={2.2} />
          <span>{loading ? "Extracting info..." : buttonText}</span>
        </button>

        {showHelperText && (
          <span className="mono-xs" style={{ color: "var(--color-ink-faint)", fontSize: 11.5 }}>
            Auto-extracts name, contact, education &amp; experience
          </span>
        )}
      </div>

      {status && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={15} color="#059669" />
          <span>{status}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            marginTop: 8,
          }}
        >
          <AlertCircle size={15} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
