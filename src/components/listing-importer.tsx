import { useState } from "react";
import { addJobFromTextAction } from "@/app/actions";
import { Sparkles, FileText, Globe, CheckCircle2, AlertCircle } from "lucide-react";

function parseUrlFast(urlStr: string) {
  try {
    const u = new URL(urlStr.trim());
    const path = decodeURIComponent(u.pathname);

    // LinkedIn
    const linkedinMatch = path.match(/\/jobs\/view\/([^\/?#]+)/i);
    if (linkedinMatch) {
      const slug = linkedinMatch[1]!.replace(/-\d{7,}$/, "").replace(/\?.*$/, "");
      const atParts = slug.split("-at-");
      if (atParts.length === 2 && atParts[0] && atParts[1]) {
        return {
          title: atParts[0].replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim(),
          company: atParts[1].replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim(),
        };
      }
      if (slug.length > 3) {
        return {
          title: slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim(),
        };
      }
    }

    // Greenhouse
    const ghMatch = path.match(/(?:boards\.)?greenhouse\.io\/([^\/]+)\/jobs\/([^\/?#]+)/i);
    if (ghMatch && ghMatch[1]) {
      return { company: ghMatch[1].replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() };
    }

    // Lever
    const leverMatch = path.match(/lever\.co\/([^\/]+)\/([^\/?#]+)/i);
    if (leverMatch && leverMatch[1]) {
      return { company: leverMatch[1].replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() };
    }
  } catch {}
  return null;
}

export function ListingImporter() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);

    if (/^https?:\/\//i.test(val.trim())) {
      const parsed = parseUrlFast(val.trim());
      if (parsed) {
        if (parsed.title && !title) setTitle(parsed.title);
        if (parsed.company && !company) setCompany(parsed.company);
        setDetectedBadge(`Recognized URL: ${[parsed.title, parsed.company].filter(Boolean).join(" at ")}`);
      } else {
        setDetectedBadge("Web URL detected — our AI copilot will fetch and extract listing details automatically.");
      }
    } else {
      setDetectedBadge(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("Please paste a listing URL or job description text.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage("Extracting job requirements, company details & evaluating fit against your resume...");

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("company", company);
      formData.set("description", description);

      await addJobFromTextAction(formData);
      setStatusMessage("✓ Listing successfully imported and evaluated!");
      setDescription("");
      setTitle("");
      setCompany("");
      setDetectedBadge(null);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to process the listing. Please verify the URL or paste full job text.");
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <details className="card" style={{ padding: "16px 20px", marginBottom: 20, borderRadius: 16 }}>
      <summary style={{ cursor: "pointer" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FileText size={16} color="#059669" />
          Import a listing (Paste URL or Text)
        </span>
      </summary>

      <p style={{ margin: "10px 0 14px", fontSize: 13, color: "var(--color-ink-soft)", maxWidth: "78ch", lineHeight: 1.5 }}>
        Saw a role on Greenhouse, Lever, LinkedIn, or a company site? Paste the direct URL or full description text.
        Our AI parser automatically fetches the listing content, extracts title, company, requirements, and evaluates trust and skill fit.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div>
            <label className="field" htmlFor="paste-title">
              Job title (optional if URL provided)
            </label>
            <input
              className="input"
              id="paste-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend Engineer"
            />
          </div>
          <div>
            <label className="field" htmlFor="paste-company">
              Company (optional if URL provided)
            </label>
            <input
              className="input"
              id="paste-company"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe, Acme Corp"
            />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label className="field" htmlFor="paste-description" style={{ margin: 0 }}>
              Listing URL or full description text
            </label>
            {detectedBadge && (
              <span className="mono-xs" style={{ color: "#059669", fontWeight: 600 }}>
                {detectedBadge}
              </span>
            )}
          </div>
          <textarea
            className="textarea"
            id="paste-description"
            name="description"
            required
            rows={4}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Paste https://... (LinkedIn, Greenhouse, Lever, etc.) or the full job description text here"
          />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ borderRadius: 999, padding: "10px 22px", display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700 }}
          >
            <Sparkles size={15} />
            <span>{isSubmitting ? "Ingesting & Analyzing Fit..." : "Ingest & Analyze Fit"}</span>
          </button>
          <span className="mono-xs" style={{ color: "var(--color-ink-faint)" }}>
            Evaluated privately in your workspace. Match score &amp; requirements generated instantly.
          </span>
        </div>
      </form>

      {statusMessage && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={16} color="#dc2626" />
          <span>{errorMessage}</span>
        </div>
      )}
    </details>
  );
}
