import Link from "next/link";
import type { FitReport, Job, JobInsight, TrustReport } from "@/lib/types";
import { VERDICT_COPY } from "@/lib/engines/trust";
import { jobFamily, FAMILY_LABEL } from "@/lib/engines/market";

export function TrustPill({ trust, size = "md" }: { trust: TrustReport; size?: "sm" | "md" }) {
  const cls =
    trust.verdict === "clear" ? "pill pill-clear" : trust.verdict === "check" ? "pill pill-check" : "pill pill-doubt";
  return (
    <span className={cls} title={`Trust score ${trust.score}/100`}>
      <span className="dot" />
      {size === "sm" ? VERDICT_COPY[trust.verdict].short : VERDICT_COPY[trust.verdict].label}
      <span className="num" style={{ opacity: 0.7 }}>
        {trust.score}
      </span>
    </span>
  );
}

export function FitScore({ fit, compact = false }: { fit: FitReport; compact?: boolean }) {
  const isHigh = fit.score >= 70;
  const isMid = fit.score >= 45;
  const bg = isHigh ? "var(--color-accent-soft)" : isMid ? "var(--color-warn-soft)" : "#f1f5f9";
  const color = isHigh ? "var(--color-accent)" : isMid ? "var(--color-warn)" : "var(--color-ink-faint)";
  const border = isHigh ? "var(--color-accent-border)" : isMid ? "var(--color-warn-border)" : "var(--color-line)";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: compact ? "3px 9px" : "5px 12px",
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        borderRadius: 999,
        fontWeight: 650,
        fontSize: compact ? 12 : 13.5,
      }}
    >
      <span>{isHigh ? "✨" : isMid ? "⚡" : "•"}</span>
      <span className="num">{fit.score}%</span>
      <span style={{ fontSize: compact ? 10 : 11, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.85 }}>
        match
      </span>
    </div>
  );
}

export function ConfidenceNote({ fit }: { fit: FitReport }) {
  if (fit.confidence >= 0.7) return null;
  return (
    <p className="mono-xs" style={{ color: "var(--color-warn)", marginTop: 4 }}>
      thin profile — treat this score as approximate (±
      {Math.round((1 - fit.confidence) * 40)} pts)
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header style={{ marginBottom: 28 }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        {eyebrow}
      </p>
      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginTop: 6,
        }}
      >
        <h1 className="display" style={{ margin: 0, maxWidth: "20ch" }}>
          {title}
        </h1>
        {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      {lede ? (
        <p className="lede" style={{ margin: "12px 0 0" }}>
          {lede}
        </p>
      ) : null}
    </header>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <h2 style={{ fontSize: 20, margin: 0 }}>{children}</h2>
      {right}
    </div>
  );
}

export function Meter({ value, max = 100, tone }: { value: number; max?: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter" role="presentation">
      <span style={{ width: `${pct}%`, background: tone }} />
    </div>
  );
}

export function salaryLabel(job: Job): string | null {
  if (!job.salaryMin) return null;
  const curr = job.currency || "INR";
  const symbol = curr === "INR" || curr === "Rs" ? "₹" : curr === "USD" ? "$" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : `${curr} `;
  const min = Math.round(job.salaryMin / 1000);
  const max = job.salaryMax ? Math.round(job.salaryMax / 1000) : null;
  if (!max || max === min) return `${symbol}${min}k`;
  return `${symbol}${min}–${max}k`;
}

export function JobMeta({ job }: { job: Job }) {
  const salary = salaryLabel(job);
  return (
    <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-soft)" }}>
      {job.company} · {job.location} · {job.workMode} · {FAMILY_LABEL[jobFamily(job)]}
      {salary ? ` · ${salary}` : ""}
    </p>
  );
}

export function JobCard({ insight, href }: { insight: JobInsight; href?: string }) {
  const { job, trust, fit } = insight;
  const serious = trust.flags.filter((f) => f.severity === "serious").length;
  const closed =
    (job.filledDaysAgo !== null && job.filledDaysAgo !== undefined) ||
    Boolean(job.expiresAt && new Date(job.expiresAt) < new Date());

  const initial = (job.company || "C").trim().charAt(0).toUpperCase();

  return (
    <Link
      href={href ?? `/jobs/${job.id}`}
      className="card"
      style={{
        display: "block",
        padding: "18px 20px",
        textDecoration: "none",
        opacity: closed ? 0.72 : 1,
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#f1f5f9",
              border: "1px solid var(--color-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--color-brand)",
              flex: "none",
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 650, letterSpacing: "-0.015em", color: "var(--color-ink)" }}>
              {job.title}
            </p>
            <div style={{ marginTop: 2 }}>
              <JobMeta job={job} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <FitScore fit={fit} compact />
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <TrustPill trust={trust} size="sm" />
        <span className="pill pill-neutral">⏱️ {insight.minutes} min</span>
        {insight.decision === "skip" ? <span className="pill pill-neutral">Skipped</span> : null}
        {serious > 0 && trust.verdict !== "clear" ? (
          <span className="mono-xs" style={{ color: "var(--color-danger)", fontWeight: 600 }}>
            🚨 {serious} warning{serious === 1 ? "" : "s"}
          </span>
        ) : null}
        {closed ? <span className="pill pill-doubt">Closed</span> : null}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--color-ink-soft)", lineHeight: 1.5 }}>
        {fit.summary}
      </p>
    </Link>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card card-pad">
      <p className="eyebrow" style={{ margin: 0 }}>
        {label}
      </p>
      <p className="num" style={{ margin: "8px 0 0", fontSize: 26, letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {hint ? (
        <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--color-ink-soft)" }}>{hint}</p>
      ) : null}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card card-pad" style={{ textAlign: "center", padding: "34px 20px" }}>
      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20 }}>{title}</p>
      <p style={{ margin: "6px auto 0", fontSize: 13, color: "var(--color-ink-soft)", maxWidth: "46ch" }}>{body}</p>
    </div>
  );
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDays(value: string) {
  const days = Math.round((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
