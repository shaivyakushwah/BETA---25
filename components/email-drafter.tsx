"use client";

import { useState, useTransition } from "react";
import { draftEmailAction, sendResendEmailAction } from "@/app/actions";
import type { EmailDraftResult, EmailDraftType } from "@/lib/gemini";
import type { SendEmailResult } from "@/lib/resend";

export function EmailDrafter({
  jobTitle,
  company,
  candidateName,
  defaultRecruiterEmail,
}: {
  jobTitle: string;
  company: string;
  candidateName: string;
  defaultRecruiterEmail?: string;
}) {
  const [type, setType] = useState<EmailDraftType>("application");
  const [recruiterName, setRecruiterName] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<EmailDraftResult | null>(null);

  // Editable fields once generated
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(defaultRecruiterEmail || "");

  // Statuses
  const [isDrafting, startDraftTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [sendResult, setSendResult] = useState<SendEmailResult | null>(null);

  const handleGenerate = () => {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("jobTitle", jobTitle);
    fd.append("company", company);
    fd.append("candidateName", candidateName);
    fd.append("recruiterName", recruiterName);
    fd.append("notes", notes);

    startDraftTransition(async () => {
      const res = await draftEmailAction(null, fd);
      setDraft(res);
      setSubject(res.subject);
      setBody(res.body);
      setSendResult(null);
    });
  };

  const handleSendResend = () => {
    if (!recipientEmail || !subject || !body) return;

    const fd = new FormData();
    fd.append("to", recipientEmail);
    fd.append("subject", subject);
    fd.append("body", body);

    startSendTransition(async () => {
      const res = await sendResendEmailAction(null, fd);
      setSendResult(res);
    });
  };

  return (
    <div className="card card-pad" style={{ borderRadius: 16, border: "1px solid #e2e8f0", marginTop: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
            <span>✉️</span>
            <span>Gemini AI Mail Drafting &amp; Resend Dispatch</span>
          </div>
          <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Tailored Outreach &amp; Application Emails
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Draft recruiter outreach and follow-ups backed by your real resume lines, then send via Resend.
          </p>
        </div>

        {/* Email Type Tabs */}
        <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 999, gap: 2 }}>
          {(
            [
              { key: "application", label: "Application" },
              { key: "follow_up", label: "Follow-up" },
              { key: "thank_you", label: "Thank You" },
              { key: "referral", label: "Referral" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: type === t.key ? 700 : 500,
                background: type === t.key ? "#0f172a" : "transparent",
                color: type === t.key ? "#ffffff" : "#475569",
                border: "none",
                cursor: "pointer",
                transition: "all 140ms ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generator Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 16 }}>
        <div>
          <label className="field" htmlFor="recruiter-name">Recruiter / Contact Name (Optional)</label>
          <input
            id="recruiter-name"
            className="input"
            placeholder="e.g. Sarah Jenkins"
            value={recruiterName}
            onChange={(e) => setRecruiterName(e.target.value)}
          />
        </div>
        <div>
          <label className="field" htmlFor="custom-notes">Custom Focus / Angle (Optional)</label>
          <input
            id="custom-notes"
            className="input"
            placeholder="e.g. mention my Next.js performance project"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={handleGenerate}
            disabled={isDrafting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "9px 18px" }}
          >
            {isDrafting ? "Drafting with Gemini…" : "⚡ Draft Email with AI"}
          </button>
        </div>
      </div>

      {/* Drafted Email Viewer & Resend Dispatch */}
      {draft ? (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
          {/* Pro tip */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#1e40af" }}>
              💡 <strong>Pro Tip:</strong> {draft.proTip}
            </p>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label className="field" htmlFor="draft-subject">Subject Line</label>
              <input
                id="draft-subject"
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>

            <div>
              <label className="field" htmlFor="draft-body">Email Body (Fully Editable)</label>
              <textarea
                id="draft-body"
                className="textarea"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ fontFamily: "var(--font-sans)", fontSize: 13.5 }}
              />
            </div>

            {/* Resend Direct Delivery Section */}
            <div style={{ background: "#f8fafc", padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                  🚀 Live Dispatch via Resend
                </span>
                <span className="mono-xs" style={{ color: "#059669" }}>
                  Verified Human Approval Gate
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="email"
                  placeholder="Recipient Email (e.g. jobs@stripe.com)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="input"
                  style={{ flex: "1 1 240px", maxWidth: 360 }}
                />
                <button
                  type="button"
                  onClick={handleSendResend}
                  disabled={isSending || !recipientEmail}
                  className="btn btn-accent"
                  style={{ padding: "9px 20px" }}
                >
                  {isSending ? "Sending via Resend…" : "Send Email with Resend ↗"}
                </button>
              </div>

              {/* Send Status Feedback */}
              {sendResult ? (
                <div style={{ marginTop: 12 }}>
                  {sendResult.ok ? (
                    <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "9px 12px", borderRadius: 8, color: "#065f46", fontSize: 12.5 }}>
                      ✅ <strong>Email Dispatched Successfully!</strong> Resend ID: <code style={{ fontFamily: "var(--font-mono)" }}>{sendResult.id}</code>
                    </div>
                  ) : (
                    <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", padding: "9px 12px", borderRadius: 8, color: "#9f1239", fontSize: 12.5 }}>
                      ⚠️ <strong>Delivery Notice:</strong> {sendResult.error}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
