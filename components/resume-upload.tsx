"use client";

import { useState, useRef } from "react";

export function ResumeUpload() {
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
      if (isText) {
        const text = await file.text();
        populateTextarea(text);
        setStatus(`Imported ${file.name} (${text.split("\n").length} lines)`);
      } else if (isPdf) {
        setStatus(`Extracting text from ${file.name}...`);
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Could not read PDF");
        }

        populateTextarea(data.text);
        setStatus(`Extracted ${data.lines} lines from ${file.name}`);
      }
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
    <div style={{ marginBottom: 10 }}>
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
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading ? "Extracting text..." : "📁 Upload Resume (.PDF / .TXT)"}
        </button>
        <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
          Drag-and-drop or click to import lines automatically
        </span>
      </div>

      {status && (
        <p className="mono-xs" style={{ color: "var(--color-success, #2a8)", marginTop: 6, marginBottom: 0 }}>
          ✓ {status}
        </p>
      )}

      {error && (
        <p className="mono-xs" style={{ color: "var(--color-danger, #c33)", marginTop: 6, marginBottom: 0 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
