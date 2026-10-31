import { useState, useEffect } from "react";
import Link from "@/lib/next-compat";
import { useSnapshot } from "@/lib/app-runtime";
import { getWorkspace } from "@/lib/insights";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";

export function ProfileCompletionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const snapshot = useSnapshot();
  const ws = getWorkspace();
  const candidate = ws.candidate;

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("shortlist_profile_modal_dismissed");
    const isNewSignup = localStorage.getItem("shortlist_new_signup");

    // Profile is incomplete if default name, no target roles, or short resume
    const isIncomplete =
      !candidate.name ||
      candidate.name === "Job Seeker" ||
      candidate.targetRoles.length === 0 ||
      !ws.resumeText ||
      ws.resumeText.length < 40;

    if ((isIncomplete || isNewSignup === "true") && !isDismissed) {
      setIsOpen(true);
    }
  }, [candidate, ws.resumeText]);

  function handleDismiss() {
    setIsOpen(false);
    sessionStorage.setItem("shortlist_profile_modal_dismissed", "true");
    localStorage.removeItem("shortlist_new_signup");
  }

  if (!isOpen) return null;

  const hasName = Boolean(candidate.name && candidate.name !== "Job Seeker");
  const hasRoles = candidate.targetRoles.length > 0;
  const hasResume = Boolean(ws.resumeText && ws.resumeText.length >= 40);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#94a3b8",
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              Complete your profile first
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
              Start applying with tailored AI matching and autofill
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 20px" }}>
          Welcome to Shortlist AI! Complete your profile so our AI agent can match relevant jobs, autofill your applications, and draft tailored emails in seconds.
        </p>

        {/* Checklist */}
        <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", marginBottom: 24, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: hasName ? "#059669" : "#64748b" }}>
              {hasName ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              <span style={{ fontWeight: hasName ? 600 : 500 }}>Personal details &amp; contact info</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: hasRoles ? "#059669" : "#64748b" }}>
              {hasRoles ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              <span style={{ fontWeight: hasRoles ? 600 : 500 }}>Target roles &amp; experience level</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: hasResume ? "#059669" : "#64748b" }}>
              {hasResume ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              <span style={{ fontWeight: hasResume ? 600 : 500 }}>Resume upload for AI scoring</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/profile"
            onClick={handleDismiss}
            className="btn btn-primary"
            style={{
              flex: 1,
              justifyContent: "center",
              borderRadius: 999,
              padding: "11px 18px",
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            Complete Profile Now &rarr;
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="btn"
            style={{
              borderRadius: 999,
              padding: "11px 18px",
              fontSize: 13.5,
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              color: "#475569",
            }}
          >
            Explore First
          </button>
        </div>
      </div>
    </div>
  );
}
