import { Suspense } from "react";
import { connection } from "next/server";
import { getWorkspace } from "@/lib/insights";
import { saveProfileAction } from "@/app/actions";
import { skillLabel } from "@/lib/skills";
import { PageHeader, SectionTitle } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading your profile…</p>}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  await connection();
  const ws = getWorkspace();
  const candidate = ws.candidate;

  const sections = [...new Set(ws.lines.map((l) => l.section))];
  const hasNumbers = ws.lines.filter((l) => /\d/.test(l.text)).length;
  const thin = ws.lines.length < 18;

  return (
    <>
      <PageHeader
        eyebrow="Profile & resume"
        title="A thin profile still gets answers"
        lede="You do not need a complete CV to start. Shortlist works with what is here, marks its own confidence, and shows which one addition would improve every suggestion at once."
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 26, alignItems: "start" }}>
        <form action={saveProfileAction} className="card card-pad" style={{ display: "grid", gap: 12 }}>
          <div className="grid-2">
            <div>
              <label className="field" htmlFor="name">
                Name
              </label>
              <input className="input" id="name" name="name" defaultValue={candidate.name} />
            </div>
            <div>
              <label className="field" htmlFor="location">
                Location
              </label>
              <input className="input" id="location" name="location" defaultValue={candidate.location} />
            </div>
          </div>

          <div>
            <label className="field" htmlFor="headline">
              One line about you
            </label>
            <input className="input" id="headline" name="headline" defaultValue={candidate.headline} />
          </div>

          <div className="grid-3">
            <div>
              <label className="field" htmlFor="seniority">
                Level
              </label>
              <select className="select" id="seniority" name="seniority" defaultValue={candidate.seniority}>
                <option value="intern">Intern / placement</option>
                <option value="junior">Junior / graduate</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="field" htmlFor="hours">
                Hours per week
              </label>
              <input className="input" id="hours" name="hours" type="number" min={1} max={40} defaultValue={candidate.hoursPerWeek} />
            </div>
            <div>
              <label className="field" htmlFor="minSalary">
                Salary floor (£)
              </label>
              <input
                className="input"
                id="minSalary"
                name="minSalary"
                type="number"
                step={1000}
                defaultValue={candidate.minSalary ?? ""}
              />
            </div>
          </div>

          <div>
            <label className="field" htmlFor="targetRoles">
              Target role families (comma separated)
            </label>
            <input className="input" id="targetRoles" name="targetRoles" defaultValue={candidate.targetRoles.join(", ")} />
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 3 }}>
              Try: frontend, data, backend, design, qa, devops, support
            </p>
          </div>

          <div>
            <label className="field" htmlFor="longShotGoal">
              The long-shot goal (optional)
            </label>
            <input className="input" id="longShotGoal" name="longShotGoal" defaultValue={candidate.longShotGoal ?? ""} />
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 3 }}>
              We will tell you how many listings like that are actually open to your level.
            </p>
          </div>

          <div>
            <label className="field" htmlFor="resume">
              Resume text — plain text is fine
            </label>
            <textarea className="textarea" id="resume" name="resume" rows={22} defaultValue={ws.resumeText} />
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 3 }}>
              Line numbers are preserved exactly, because every suggestion points back to one.
            </p>
          </div>

          <div>
            <button className="btn btn-primary" type="submit">
              Save profile and resume
            </button>
          </div>
        </form>

        <aside style={{ display: "grid", gap: 14 }}>
          <div className="card card-pad" style={{ background: thin ? "var(--color-warn-soft)" : "#fbf9f2", borderColor: thin ? "#e8cfa8" : "var(--color-line)" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Profile strength
            </p>
            <p className="num" style={{ margin: "6px 0 0", fontSize: 26 }}>
              {ws.lines.length} lines
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              {thin
                ? "This is a thin profile. Suggestions still work, but the fit score carries a wider error bar and we say so on every listing."
                : "Enough material for the matcher to cite specific lines."}
            </p>
            <hr className="rule" style={{ margin: "12px 0" }} />
            <p className="mono-xs" style={{ margin: 0, color: "var(--color-ink-soft)" }}>
              Sections found: {sections.join(" · ") || "none"}
            </p>
            <p className="mono-xs" style={{ margin: "4px 0 0", color: "var(--color-ink-soft)" }}>
              Lines with a number in them: {hasNumbers}
            </p>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              Skills we can see
            </p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {[...ws.skills].slice(0, 24).map((skill) => (
                <span key={skill} className="pill pill-clear" style={{ fontSize: 10.5 }}>
                  {skillLabel(skill)}
                </span>
              ))}
              {ws.skills.size === 0 ? (
                <span style={{ fontSize: 12.5, color: "var(--color-ink-soft)" }}>None yet.</span>
              ) : null}
            </div>
            <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 8 }}>
              Only skills that appear word-for-word in your resume. We do not infer.
            </p>
          </div>

          <div className="card card-pad">
            <p className="eyebrow" style={{ margin: 0 }}>
              One change that helps everywhere
            </p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              {thin ? <li>Add one project with what you built, the tools, and who used it.</li> : null}
              {hasNumbers < 3 ? <li>Put a number in at least two lines (users, hours saved, size of dataset).</li> : null}
              {!sections.includes("Experience") ? <li>Add an experience section, even if it is part-time or voluntary.</li> : null}
              <li>Name the tools exactly as employers do, so the matcher can find them.</li>
            </ul>
          </div>

          <div className="card card-pad">
            <SectionTitle>Where your resume is used</SectionTitle>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-ink-soft)" }}>
              As evidence for fit, as the source of every highlight, and as the check that stops your draft from claiming
              a skill you never listed. It is never sent to an employer.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
