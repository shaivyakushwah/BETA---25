import { createFileRoute } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense, useState } from "react";
import { getWorkspace } from "@/lib/insights";
import { saveProfileAction } from "@/app/actions";
import { skillLabel } from "@/lib/skills";
import { ResumeUpload } from "@/components/resume-upload";
import { ResumeScorer } from "@/components/resume-scorer";
import {
  ShieldCheck,
  AlertCircle,
  FileText,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  Pencil,
  GraduationCap,
  Briefcase,
  Sparkles,
  Zap,
} from "lucide-react";

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading your profile…</p>}>
      <Profile />
    </Suspense>
  );
}

type TabType = "personal" | "education" | "experience" | "skills" | "eeo";

function Profile() {
  useSnapshot();
  const ws = getWorkspace();
  const candidate = ws.candidate;
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [isEditing, setIsEditing] = useState(false);

  const displayName = candidate.name && candidate.name !== "Job Seeker" ? candidate.name : "Your Name";
  const displayLocation = candidate.location || "Location not set";

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>PROFILE</h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#dcfce7",
            color: "#15803d",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Zap size={14} fill="#15803d" />
          <span>Turbo for Job Seekers: Get Hired Faster! &rarr;</span>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="jobright-secure-banner">
        <ShieldCheck size={18} />
        <span>Your profile data is kept private and secure. Never shared without your explicit consent.</span>
      </div>

      {/* Jobright Tab Navigation */}
      <div className="jobright-tab-bar">
        <button
          type="button"
          className="jobright-tab"
          data-active={activeTab === "personal"}
          onClick={() => setActiveTab("personal")}
        >
          Personal
        </button>
        <button
          type="button"
          className="jobright-tab"
          data-active={activeTab === "education"}
          onClick={() => setActiveTab("education")}
        >
          Education
        </button>
        <button
          type="button"
          className="jobright-tab"
          data-active={activeTab === "experience"}
          onClick={() => setActiveTab("experience")}
        >
          Work Experience
        </button>
        <button
          type="button"
          className="jobright-tab"
          data-active={activeTab === "skills"}
          onClick={() => setActiveTab("skills")}
        >
          Skills
        </button>
        <button
          type="button"
          className="jobright-tab"
          data-active={activeTab === "eeo"}
          onClick={() => setActiveTab("eeo")}
        >
          Equal Employment
        </button>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) 340px", gap: 32, alignItems: "start" }}>
        {/* Left Column Content Based on Tab */}
        <div>
          {activeTab === "personal" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Candidate Info Card */}
              <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
                      {displayName}
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                      {candidate.headline || "Job Seeker / Candidate"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#475569",
                    }}
                    title="Edit profile"
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                {/* Contact Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                    <MapPin size={13} color="#64748b" />
                    <span>{displayLocation}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                    <Mail size={13} color="#64748b" />
                    <span>{candidate.email || "Set email in settings"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                    <Phone size={13} color="#64748b" />
                    <span>Contact via email</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#0284c7" }}>
                    <Linkedin size={13} />
                    <span>LinkedIn Profile</span>
                  </div>
                </div>
              </div>

              {/* Edit Details Form */}
              <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px", color: "#0f172a" }}>
                  Career Preferences &amp; Target Roles
                </h3>
                <form action={saveProfileAction} style={{ display: "grid", gap: 16 }}>
                  <div className="grid-2">
                    <div>
                      <label className="field" htmlFor="name">
                        Full Name
                      </label>
                      <input className="input" id="name" name="name" defaultValue={candidate.name} placeholder="e.g. Sunny Parihar" />
                    </div>
                    <div>
                      <label className="field" htmlFor="location">
                        Target Location
                      </label>
                      <input className="input" id="location" name="location" defaultValue={candidate.location} placeholder="e.g. Remote / New York / London" />
                    </div>
                  </div>

                  <div>
                    <label className="field" htmlFor="headline">
                      Professional Headline
                    </label>
                    <input className="input" id="headline" name="headline" defaultValue={candidate.headline} placeholder="e.g. Full Stack Developer | React, Node.js, Python" />
                  </div>

                  <div className="grid-3">
                    <div>
                      <label className="field" htmlFor="seniority">
                        Experience Level
                      </label>
                      <select className="select" id="seniority" name="seniority" defaultValue={candidate.seniority}>
                        <option value="intern">Intern / Placement</option>
                        <option value="junior">Junior / Graduate</option>
                        <option value="mid">Mid-Level</option>
                        <option value="senior">Senior</option>
                      </select>
                    </div>
                    <div>
                      <label className="field" htmlFor="hours">
                        Hours / Week
                      </label>
                      <input className="input" id="hours" name="hours" type="number" min={1} max={40} defaultValue={candidate.hoursPerWeek} />
                    </div>
                    <div>
                      <label className="field" htmlFor="minSalary">
                        Minimum Salary Expectation
                      </label>
                      <input
                        className="input"
                        id="minSalary"
                        name="minSalary"
                        type="number"
                        step={1000}
                        placeholder="e.g. 60000"
                        defaultValue={candidate.minSalary ?? ""}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field" htmlFor="targetRoles">
                      Target Role Families (comma separated)
                    </label>
                    <input className="input" id="targetRoles" name="targetRoles" defaultValue={candidate.targetRoles.join(", ")} placeholder="frontend, backend, data, fullstack" />
                  </div>

                  <div>
                    <label className="field" htmlFor="resume">
                      Resume Text (Pasted or extracted from PDF)
                    </label>
                    <div style={{ marginBottom: 10 }}>
                      <ResumeUpload />
                    </div>
                    <textarea className="textarea" id="resume" name="resume" rows={12} defaultValue={ws.resumeText} placeholder="Upload your resume above or paste resume text here..." />
                  </div>

                  <div>
                    <button className="btn btn-primary" type="submit" style={{ borderRadius: 999, padding: "11px 24px" }}>
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>

              {/* AI Resume Scorer Widget */}
              <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <Sparkles size={20} color="#059669" />
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    AI Resume Scoring &amp; Optimization
                  </h3>
                </div>
                <ResumeScorer initialTargetRole={candidate.targetRoles[0]} />
              </div>
            </div>
          )}

          {activeTab === "education" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Education</h3>
                <button
                  type="button"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 18, marginLeft: 6, position: "relative" }}>
                <div style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#059669" }} />
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  2024 &mdash; 2028 (Expected)
                </p>
                <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Bachelor of Technology / Engineering
                </h4>
                <p style={{ margin: "0 0 6px", fontSize: 14, color: "#334155" }}>
                  Computer Science / Engineering
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Extracted from your resume. Update anytime in the Personal tab.
                </p>
              </div>
            </div>
          )}

          {activeTab === "experience" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Work Experience &amp; Projects</h3>
                <button
                  type="button"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 18, marginLeft: 6, position: "relative" }}>
                <div style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }} />
                <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Hackathon Finalist &amp; Project Builder
                </h4>
                <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "#475569" }}>
                  Engineered full-stack applications with AI integration, real-time data sync, and responsive UI.
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>
                  Parsed from your resume lines and experience highlights.
                </p>
              </div>
            </div>
          )}

          {activeTab === "skills" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Skills</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
                Verified technical and soft skills extracted from your profile:
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...ws.skills].map((skill) => (
                  <span
                    key={skill}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    {skillLabel(skill)}
                  </span>
                ))}
                {ws.skills.size === 0 && (
                  <span style={{ fontSize: 13, color: "#64748b" }}>Upload your resume in the Personal tab to detect skills automatically.</span>
                )}
              </div>
            </div>
          )}

          {activeTab === "eeo" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Equal Employment Opportunity</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
                Voluntary demographic information used only when an employer application requests it. You may change or clear these answers at any time.
              </p>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label className="field">Gender</label>
                  <select className="select" defaultValue="decline">
                    <option value="decline">I prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="nonbinary">Non-binary</option>
                  </select>
                </div>
                <div>
                  <label className="field">Veteran Status</label>
                  <select className="select" defaultValue="no">
                    <option value="no">I am not a protected veteran</option>
                    <option value="yes">I identify as a protected veteran</option>
                    <option value="decline">I prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Column (Jobright Style) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Coral Completion Alert Card */}
          <div className="jobright-coral-alert">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <AlertCircle size={20} color="#dc2626" />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#991b1b" }}>
                Complete your profile
              </h4>
            </div>
            <p style={{ fontSize: 12.5, color: "#7f1d1d", lineHeight: 1.5, margin: "0 0 14px" }}>
              Complete your profile to boost job matching accuracy and enable the 1-click Autofill extension for all your applications.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className="jobright-btn-coral"
            >
              Complete Profile
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="card" style={{ padding: "18px", borderRadius: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "8px 4px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#1e293b",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText size={17} color="#64748b" />
                  Manage My Resume
                </span>
                <span style={{ color: "#94a3b8" }}>&rarr;</span>
              </button>

              <div style={{ height: 1, background: "#f1f5f9" }} />

              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "8px 4px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#1e293b",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Linkedin size={17} color="#0284c7" />
                  Update LinkedIn URL
                </span>
                <span style={{ color: "#94a3b8" }}>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(snapshotQuery),
  head: () => ({
    meta: [
      { title: "Profile & Resume — Shortlist" },
      { name: "description", content: "Profile & Resume in Shortlist AI." },
    ],
  }),
  component: Page,
});
