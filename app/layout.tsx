import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { connection } from "next/server";
import "./globals.css";
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
        <p className="mono-xs" style={{ color: "#96550f", marginBottom: 10 }}>
          {pending} update{pending === 1 ? "" : "s"} waiting for your OK
        </p>
      ) : null}
      <div className="card" style={{ padding: "12px 13px", background: "#f1eee4" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{ws.candidate.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--color-ink-soft)" }}>
          {ws.candidate.hoursPerWeek} h/week · {ws.market.sample} listings sampled
        </p>
        <p
          className="mono-xs"
          style={{ margin: "8px 0 0", color: provider.available ? "var(--color-accent)" : "var(--color-ink-faint)" }}
          title={provider.note}
        >
          {provider.available ? "Gemini connected" : "Local engine"}
        </p>
      </div>
      <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 10, lineHeight: 1.6 }}>
        Nothing is sent automatically.
        <br />
        You approve every application.
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
        <div className="shell">
          <aside className="sidebar">
            <div>
              <p className="wordmark" style={{ margin: 0 }}>
                Shortlist
              </p>
              <p
                style={{
                  margin: "6px 0 18px",
                  fontSize: 11.5,
                  color: "var(--color-ink-faint)",
                  lineHeight: 1.5,
                }}
              >
                For the hours you actually have.
              </p>
            </div>
            <Suspense fallback={<NavSkeleton />}>
              <SideNav />
            </Suspense>
            <Suspense fallback={null}>
              <SidebarFooter />
            </Suspense>
          </aside>
          <main id="main" className="page">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
