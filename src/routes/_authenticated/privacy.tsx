import { createFileRoute, notFound } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense } from "react";
import { getWorkspace } from "@/lib/insights";
import { listApplications } from "@/lib/db";
import { providerStatus } from "@/lib/status";
import { PageHeader } from "@/components/ui";
import { DataControls } from "@/components/data-controls";

function Page() {
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
    where: "Your account in the app's database, visible only to you.",
  },
  {
    data: "Resume text, line by line",
    why: "To quote your own lines as evidence and to catch claims you did not make.",
    retention: "Until you delete it, or replace it.",
    where: "Your account only. Never in a job listing.",
  },
  {
    data: "Application drafts and chosen highlights",
    why: "So you can come back, and so the record of what you sent is accurate.",
    retention: "Draft text is cleared 12 months after the last activity on that application.",
    where: "Your account only.",
  },
  {
    data: "Pasted update messages",
    why: "To propose a status change and show the phrase we relied on.",
    retention: "90 days. Accepting an update keeps only the status, date and phrase.",
    where: "Your account only.",
  },
  {
    data: "Job listings and their public text",
    why: "To score fit and to check for duplicates, scams and staleness.",
    retention: "120 days, unless an application refers to it — then it stays with your record.",
    where: "Your account: pasted by you, or fetched from a feed you picked.",
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

function Privacy() {
  useSnapshot();
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
              <strong style={{ color: "var(--color-ink)" }}>Private to your account.</strong> Your data is stored under
              your sign-in and every read and write is limited to your own rows, so no other user can see it. Deleting it
              here removes it from the database, and you can pick up your pipeline from any device.
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
                ? "AI is switched on. When the model is used, it receives the job posting and your resume lines with the header (name, email, links) removed. It returns line numbers only, never text, so it cannot invent a claim about you."
                : "AI is switched off, so nothing is sent to a model. The deterministic engine does the matching and the highlighting."}{" "}
              The app keeps working with the local engine if the model is unavailable.
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

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-line)" }}>
              <h3 style={{ fontSize: 16, margin: "0 0 10px", color: "var(--color-ink)" }}>
                What we deliberately did NOT build (and why)
              </h3>
              <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                <div style={{ background: "#fbf9f2", padding: "10px 12px", borderRadius: 4, border: "1px solid var(--color-line)" }}>
                  <strong>1. Blind Auto-Apply Bot:</strong> Auto-submitting to 500 portals burns candidate reputation, trips ATS spam filters, and breaks the human-in-the-loop guarantee. We generate pre-flight materials in seconds, but require final human verification.
                </div>
                <div style={{ background: "#fbf9f2", padding: "10px 12px", borderRadius: 4, border: "1px solid var(--color-line)" }}>
                  <strong>2. Hallucinated / Invented Skills:</strong> LLMs tend to invent experiences to force a match. We built a strict line-provenance parser that only cites existing resume lines and explicitly warns against unbacked claims.
                </div>
                <div style={{ background: "#fbf9f2", padding: "10px 12px", borderRadius: 4, border: "1px solid var(--color-line)" }}>
                  <strong>3. Silent Job Discarding:</strong> When a listing is doubtful or a copy, other platforms hide it. We surface the exact suspicion flags and let the candidate decide.
                </div>
                <div style={{ background: "#fbf9f2", padding: "10px 12px", borderRadius: 4, border: "1px solid var(--color-line)" }}>
                  <strong>4. Shared Resume Pool:</strong> Your career history is never pooled with other users or shown to employers. Each account can read only its own rows.
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside style={{ display: "grid", gap: 14 }}>
          <DataControls />

          <div className="card card-pad" style={{ background: "#fbf9f2" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              In your account right now
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

export const Route = createFileRoute("/_authenticated/privacy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Trust & Storage — Shortlist" },
      { name: "description", content: "Trust & Storage in Shortlist, the job search that fits your week." },
      { property: "og:title", content: "Trust & Storage — Shortlist" },
      { property: "og:description", content: "Trust & Storage in Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
});
