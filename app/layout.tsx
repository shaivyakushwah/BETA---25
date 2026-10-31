import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { connection } from "next/server";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { SideNav } from "@/components/side-nav";
import { getWorkspace } from "@/lib/insights";
import { listProposals } from "@/lib/db";
import { providerStatus } from "@/lib/gemini";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shortlist — the job search that fits your week",
  description:
    "A job tracker that checks listings, spends your limited application hours where they count, and never writes claims you did not make.",
};

async function SidebarFooter() {
  await connection();
  const ws = getWorkspace();
  const pending = listProposals().filter((p) => p.state === "pending").length;
  const provider = providerStatus();

  return (
    <div style={{ marginTop: "auto" }}>
      {pending > 0 ? (
        <div style={{ background: "var(--color-warn-soft)", border: "1px solid var(--color-warn-border)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          <p className="mono-xs" style={{ color: "var(--color-warn)", margin: 0, fontWeight: 600 }}>
            🔔 {pending} update{pending === 1 ? "" : "s"} waiting for confirmation
          </p>
        </div>
      ) : null}
      <div className="card" style={{ padding: "14px", background: "#f8fafc", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #059669)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
            {ws.candidate.name.charAt(0) || "U"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.candidate.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-ink-faint)" }}>
              {ws.candidate.hoursPerWeek}h/wk · {ws.market.sample} jobs
            </p>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--color-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mono-xs" style={{ color: provider.available ? "var(--color-accent)" : "var(--color-ink-soft)", fontWeight: 550 }} title={provider.note}>
            ● {provider.available ? "Gemini Active" : "Local Engine"}
          </span>
          <span className="mono-xs" style={{ color: "var(--color-ink-faint)", fontSize: 10 }}>v1.0</span>
        </div>
      </div>
      <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
        🛡️ Zero auto-spam · 100% human confirmed
      </p>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div aria-hidden style={{ display: "grid", gap: 8, opacity: 0.4 }}>
      {[0, 1, 2].map((group) => (
        <div key={group} style={{ display: "grid", gap: 6 }}>
          <span style={{ height: 8, width: 60, background: "var(--color-line)" }} />
          {[0, 1, 2].map((row) => (
            <span key={row} style={{ height: 26, background: "var(--color-line-soft)", borderRadius: 3 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppShell
          sidebar={
            <>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p className="wordmark" style={{ margin: 0 }}>
                    <span style={{ color: "var(--color-brand)" }}>⚡</span> Shortlist
                  </p>
                  <span className="wordmark-badge">AI COPILOT</span>
                </div>
                <p
                  style={{
                    margin: "6px 0 16px",
                    fontSize: 12,
                    color: "var(--color-ink-faint)",
                    lineHeight: 1.4,
                  }}
                >
                  Autonomous Career Agent & Application Engine
                </p>
              </div>
              <Suspense fallback={<NavSkeleton />}>
                <SideNav />
              </Suspense>
              <Suspense fallback={null}>
                <SidebarFooter />
              </Suspense>
            </>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
