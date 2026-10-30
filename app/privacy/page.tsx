import { Suspense } from "react";
import { connection } from "next/server";
import { getWorkspace } from "@/lib/insights";
import { listApplications } from "@/lib/db";
import { providerStatus } from "@/lib/gemini";
import { PageHeader } from "@/components/ui";
import { DataControls } from "@/components/data-controls";

export default function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Reading the data policy…</p>}>
      <Privacy />
    </Suspense>
  );
}

const INVENTORY = [
  {
    data: "Name, email, city, salary floor",
    why: "To address you, check location and pay against listings.",
    retention: "Until you delete it.",
    where: "Local SQLite file on this machine.",
  },
  {
    data: "Resume text, line by line",
    why: "To quote your own lines as evidence and to catch claims you did not make.",
    retention: "Until you delete it, or replace it.",
    where: "Local SQLite. Never in a job listing.",
  },
  {
    data: "Application drafts and chosen highlights",
    why: "So you can come back, and so the record of what you sent is accurate.",
    retention: "Draft text is cleared 12 months after the last activity on that application.",
    where: "Local SQLite.",
  },
  {
    data: "Pasted update messages",
    why: "To propose a status change and show the phrase we relied on.",
    retention: "90 days. Accepting an update keeps only the status, date and phrase.",
    where: "Local SQLite.",
  },
  {
    data: "Job listings and their public text",
    why: "To score fit and to check for duplicates, scams and staleness.",
    retention: "120 days, unless an application refers to it — then it stays with your record.",
    where: "Local SQLite: seeded, pasted by you, or fetched from a feed you picked.",
  },
  {
    data: "Derived scores and trust flags",
    why: "To explain a recommendation.",
    retention: "Not stored. Recalculated from the inputs above each time.",
    where: "In memory only.",
  },
];

const NOT_STORED = [
  "Passwords, or access to your email inbox",
  "Passport, national ID, bank details or payroll information",
  "Health, disability or family information",
  "Your browsing history or anything outside this app",
  "Recruiter contact details beyond what is in the public listing",
];

async function Privacy() {
  await connection();
  const ws = getWorkspace();
  const provider = providerStatus();
  const applications = listApplications();

  return (
    <>
      <PageHeader
        eyebrow="Data & privacy"
        title="We store as little as the job hunt allows"
        lede="A resume is one of the most sensitive documents a person owns. This page lists every field we keep, why it exists, and when it goes — plus two buttons that take it all back."
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 24, alignItems: "start" }}>
        <section>
          <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1.5fr 1.2fr",
                gap: 10,
                padding: "9px 14px",
                background: "#f1eee4",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-faint)",
              }}
            >
              <span>Data</span>
              <span>Why it exists</span>
              <span>How long</span>
            </div>
            {INVENTORY.map((row, index) => (
              <div
                key={row.data}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.5fr 1.2fr",
                  gap: 10,
                  padding: "10px 14px",
                  borderTop: index === 0 ? "1px solid var(--color-line-soft)" : "1px solid var(--color-line-soft)",
                  fontSize: 12.5,
                  alignItems: "start",
                }}
              >
                <span style={{ fontWeight: 550 }}>{row.data}</span>
                <span style={{ color: "var(--color-ink-soft)" }}>{row.why}</span>
                <span style={{ color: "var(--color-ink-soft)" }}>
                  {row.retention}
                  <span className="mono-xs" style={{ display: "block", color: "var(--color-ink-faint)" }}>
                    {row.where}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>The decision, in plain terms</h2>
          <div className="stack" style={{ fontSize: 13.5, color: "var(--color-ink-soft)", maxWidth: "70ch" }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--color-ink)" }}>Local by default.</strong> The database is a single file in
              this project. There is no account, no sync and no server copy, so deleting it here really deletes it. The
              trade-off is that you cannot pick up your pipeline on another machine — we chose that over holding your
              resume in someone else&apos;s cloud.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--color-ink)" }}>Short windows for incidental data.</strong> A pasted email is
              the riskiest thing here because it can contain anything. We keep it 90 days, and accepting an update stores
              only the status, the date and the phrase that justified it. Drafts outlive their usefulness after a year, so
              the text goes and the record stays.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--color-ink)" }}>We do not ask for inbox access.</strong> Reading Gmail would
              mean holding a token that sees every message you receive, including medical and financial ones. Pasting one
              message is slower by ten seconds and requires no standing permission.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--color-ink)" }}>Live feeds are a request you make, not a background job.</strong>{" "}
              Nothing is fetched until you press the import button, and then only from the feeds you ticked. Those are
              public job boards (Remotive, Arbeitnow, Jobicy, Himalayas, Remote OK, Working Nomads and five We Work
              Remotely category feeds). They receive a search word and a browser-style user agent — no name, no resume, no
              candidate ID. What comes back is stored beside the seeded listings, marked unverified because we have not
              confirmed the employer, and treated exactly like everything else on the board.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--color-ink)" }}>The AI boundary.</strong>{" "}
              {provider.available
                ? "A Gemini key is configured. When the model is used, it receives the job posting and your resume lines with the header (name, email, links) removed. It returns line numbers only, never text, so it cannot invent a claim about you."
                : "No model key is configured, so nothing leaves this machine. The deterministic engine does the matching and the highlighting."}{" "}
              You can remove the key at any time; the app keeps working.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--color-ink)" }}>What we deliberately do not store:</strong>
            </p>
            <ul style={{ margin: "0 0 0 16px", padding: 0 }}>
              {NOT_STORED.map((item) => (
                <li key={item} style={{ marginBottom: 3 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside style={{ display: "grid", gap: 14 }}>
          <DataControls />

          <div className="card card-pad" style={{ background: "#fbf9f2" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              On this machine right now
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: 12.5 }}>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>Applications</span>
                <span className="num">{applications.length}</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>Resume lines parsed</span>
                <span className="num">{ws.lines.length}</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>Listings held</span>
                <span className="num">{ws.jobs.length}</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>Model key</span>
                <span className="num">{provider.available ? "present" : "none"}</span>
              </li>
            </ul>
            <p className="mono-xs" style={{ margin: "8px 0 0", color: "var(--color-ink-faint)" }}>
              File: <code>data/shortlist.db</code>
            </p>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              If you use the model
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              The request is one posting and your numbered resume lines. No account identifier, no browsing data, no
              inbox. If the request fails, the product falls back to the local matcher and says so.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
