import { createFileRoute } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense, useState, useEffect } from "react";
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
  Sparkles,
  Zap,
  Check,
  Plus,
} from "lucide-react";

function Page() {
  return (
    <Suspense fallback={<p className="mono-xs">Loading your profile…</p>}>
      <Profile />
    </Suspense>
  );
}

type TabType = "personal" | "education" | "experience" | "skills" | "eeo";

interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  dates: string;
  details: string;
}

interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  dates: string;
  description: string;
}

function Profile() {
  useSnapshot();
  const ws = getWorkspace();
  const candidate = ws.candidate;
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  // Editable personal info state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalPhone, setPersonalPhone] = useState("+91 9424473696");
  const [personalLinkedin, setPersonalLinkedin] = useState("https://www.linkedin.com/in/gauri-tiwari");

  // Editable Education state
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [educationList, setEducationList] = useState<EducationEntry[]>([
    {
      id: "1",
      degree: "Bachelor of Technology in Electronics Engineering",
      institution: "Madhav Institute of Technology & Science",
      dates: "2024-01 ➔ 2028-01",
      details: "aggregate CGPA = 8.7; 1st sem SGPA=8.26; 2nd sem SGPA=8.75; 3rd sem SGPA=8.95; 4th sem SGPA=8.96",
    },
  ]);

  // Editable Work Experience state
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [experienceList, setExperienceList] = useState<ExperienceEntry[]>([
    {
      id: "1",
      title: "Smart India Hackathon (SIH)",
      organization: "National Innovation Hackathon",
      dates: "2024 — Present",
      description: "Selected among the Top 100 teams in the internal selection round. Built AI-powered assistive career search solutions.",
    },
  ]);

  // Load saved education/experience from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEdu = localStorage.getItem("shortlist_profile_education");
      if (savedEdu) {
        try {
          setEducationList(JSON.parse(savedEdu));
        } catch {}
      }
      const savedExp = localStorage.getItem("shortlist_profile_experience");
      if (savedExp) {
        try {
          setExperienceList(JSON.parse(savedExp));
        } catch {}
      }
      const savedPhone = localStorage.getItem("shortlist_profile_phone");
      if (savedPhone) setPersonalPhone(savedPhone);
      const savedLi = localStorage.getItem("shortlist_profile_linkedin");
      if (savedLi) setPersonalLinkedin(savedLi);
    }
  }, []);

  function handleSaveEducation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated: EducationEntry = {
      id: "1",
      degree: String(formData.get("degree") || ""),
      institution: String(formData.get("institution") || ""),
      dates: String(formData.get("dates") || ""),
      details: String(formData.get("details") || ""),
    };
    const newList = [updated];
    setEducationList(newList);
    setIsEditingEducation(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("shortlist_profile_education", JSON.stringify(newList));
    }
  }

  function handleSaveExperience(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated: ExperienceEntry = {
      id: "1",
      title: String(formData.get("title") || ""),
      organization: String(formData.get("organization") || ""),
      dates: String(formData.get("dates") || ""),
      description: String(formData.get("description") || ""),
    };
    const newList = [updated];
    setExperienceList(newList);
    setIsEditingExperience(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("shortlist_profile_experience", JSON.stringify(newList));
    }
  }

  const displayName = candidate.name && candidate.name !== "Job Seeker" ? candidate.name : "GAURI TIWARI";
  const displayLocation = candidate.location || "Laxmi Apartment, Gwalior, M.P";

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
          <span>Turbo for Students: Get Hired Faster! &rarr;</span>
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
                      {candidate.headline || "Electronics Engineering Student | Full Stack Developer"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                    style={{
                      background: isEditingPersonal ? "#0f172a" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: isEditingPersonal ? "#ffffff" : "#475569",
                      transition: "all 160ms ease",
                    }}
                    title={isEditingPersonal ? "Close edit" : "Edit contact info"}
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                {/* Inline contact editor when pencil is clicked */}
                {isEditingPersonal ? (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px", marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700 }}>Edit Contact &amp; Links</h4>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <label className="field">Phone Number</label>
                        <input
                          className="input"
                          value={personalPhone}
                          onChange={(e) => {
                            setPersonalPhone(e.target.value);
                            localStorage.setItem("shortlist_profile_phone", e.target.value);
                          }}
                          placeholder="+91 ..."
                        />
                      </div>
                      <div>
                        <label className="field">LinkedIn URL</label>
                        <input
                          className="input"
                          value={personalLinkedin}
                          onChange={(e) => {
                            setPersonalLinkedin(e.target.value);
                            localStorage.setItem("shortlist_profile_linkedin", e.target.value);
                          }}
                          placeholder="https://www.linkedin.com/in/..."
                        />
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingPersonal(false)}
                          className="btn btn-sm btn-primary"
                          style={{ borderRadius: 999 }}
                        >
                          <Check size={13} />
                          <span>Done Editing</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Contact Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                    <MapPin size={13} color="#64748b" />
                    <span>{displayLocation}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                    <Mail size={13} color="#64748b" />
                    <span>{candidate.email || "tiwarigauriii30@gmail.com"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                    <Phone size={13} color="#64748b" />
                    <span>{personalPhone}</span>
                  </div>
                  <a
                    href={personalLinkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0f9ff", border: "1px solid #bae6fd", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#0284c7", textDecoration: "none" }}
                  >
                    <Linkedin size={13} />
                    <span>{personalLinkedin.replace("https://", "")}</span>
                  </a>
                </div>
              </div>

              {/* Career Preferences & Target Roles Form */}
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
                      <input className="input" id="name" name="name" defaultValue={candidate.name || "GAURI TIWARI"} placeholder="e.g. GAURI TIWARI" />
                    </div>
                    <div>
                      <label className="field" htmlFor="location">
                        Target Location
                      </label>
                      <input className="input" id="location" name="location" defaultValue={candidate.location || "Laxmi Apartment, Gwalior, M.P"} placeholder="e.g. Gwalior, Remote" />
                    </div>
                  </div>

                  <div>
                    <label className="field" htmlFor="headline">
                      Professional Headline
                    </label>
                    <input className="input" id="headline" name="headline" defaultValue={candidate.headline || "Electronics Engineering Student | Full Stack Developer"} placeholder="e.g. Full Stack Developer | React, Python" />
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
                    <input className="input" id="targetRoles" name="targetRoles" defaultValue={candidate.targetRoles.join(", ") || "python, software engineer, intern, fullstack"} placeholder="python, software engineer, intern, fullstack" />
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
                <ResumeScorer initialTargetRole={candidate.targetRoles[0] || "Python Engineer"} />
              </div>
            </div>
          )}

          {activeTab === "education" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Education</h3>
                <button
                  type="button"
                  onClick={() => setIsEditingEducation(!isEditingEducation)}
                  style={{
                    background: isEditingEducation ? "#0f172a" : "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: isEditingEducation ? "#ffffff" : "#475569",
                    transition: "all 160ms ease",
                  }}
                  title={isEditingEducation ? "Cancel edit" : "Edit education"}
                >
                  <Pencil size={15} />
                </button>
              </div>

              {/* Editable Education Form */}
              {isEditingEducation ? (
                <form onSubmit={handleSaveEducation} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px", marginBottom: 20, display: "grid", gap: 12 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Edit Education Record</h4>
                  <div>
                    <label className="field">Degree / Major</label>
                    <input className="input" name="degree" defaultValue={educationList[0]?.degree} required />
                  </div>
                  <div>
                    <label className="field">Institution / University</label>
                    <input className="input" name="institution" defaultValue={educationList[0]?.institution} required />
                  </div>
                  <div className="grid-2">
                    <div>
                      <label className="field">Dates / Graduation</label>
                      <input className="input" name="dates" defaultValue={educationList[0]?.dates} placeholder="e.g. 2024-01 ➔ 2028-01" required />
                    </div>
                    <div>
                      <label className="field">Academic Performance / CGPA</label>
                      <input className="input" name="details" defaultValue={educationList[0]?.details} placeholder="e.g. aggregate CGPA = 8.7" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: 999 }}>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingEducation(false)}
                      className="btn btn-sm"
                      style={{ borderRadius: 999, background: "#ffffff", border: "1px solid #e2e8f0" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Education Display Card */}
              {educationList.map((edu) => (
                <div key={edu.id} style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 18, marginLeft: 6, position: "relative" }}>
                  <div style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#059669" }} />
                  <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                    {edu.dates}
                  </p>
                  <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                    {edu.degree}
                  </h4>
                  <p style={{ margin: "0 0 6px", fontSize: 14, color: "#334155", fontWeight: 500 }}>
                    {edu.institution}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    {edu.details}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "experience" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Work Experience &amp; Projects</h3>
                <button
                  type="button"
                  onClick={() => setIsEditingExperience(!isEditingExperience)}
                  style={{
                    background: isEditingExperience ? "#0f172a" : "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: isEditingExperience ? "#ffffff" : "#475569",
                    transition: "all 160ms ease",
                  }}
                  title={isEditingExperience ? "Cancel edit" : "Edit experience"}
                >
                  <Pencil size={15} />
                </button>
              </div>

              {/* Editable Experience Form */}
              {isEditingExperience ? (
                <form onSubmit={handleSaveExperience} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px", marginBottom: 20, display: "grid", gap: 12 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Edit Experience Record</h4>
                  <div className="grid-2">
                    <div>
                      <label className="field">Role / Project Title</label>
                      <input className="input" name="title" defaultValue={experienceList[0]?.title} required />
                    </div>
                    <div>
                      <label className="field">Organization / Company</label>
                      <input className="input" name="organization" defaultValue={experienceList[0]?.organization} required />
                    </div>
                  </div>
                  <div>
                    <label className="field">Dates / Duration</label>
                    <input className="input" name="dates" defaultValue={experienceList[0]?.dates} placeholder="e.g. 2024 — Present" required />
                  </div>
                  <div>
                    <label className="field">Achievements &amp; Responsibilities</label>
                    <textarea className="textarea" name="description" rows={3} defaultValue={experienceList[0]?.description} required />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: 999 }}>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingExperience(false)}
                      className="btn btn-sm"
                      style={{ borderRadius: 999, background: "#ffffff", border: "1px solid #e2e8f0" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Experience Display Card */}
              {experienceList.map((exp) => (
                <div key={exp.id} style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 18, marginLeft: 6, position: "relative" }}>
                  <div style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }} />
                  <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                    {exp.dates}
                  </p>
                  <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                    {exp.title}
                  </h4>
                  <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "#475569", fontWeight: 500 }}>
                    {exp.organization}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Skills</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
                Technical and role-specific skills associated with your candidate profile:
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Python", "React", "Next.js", "TypeScript", "JavaScript", "SQL", "Git", "REST APIs", "Machine Learning"].map((skill) => (
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
                    {skill}
                  </span>
                ))}
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
                  <select className="select" defaultValue="female">
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="decline">I prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="field">Work Authorization</label>
                  <select className="select" defaultValue="authorized">
                    <option value="authorized">Authorized to work in country of application</option>
                    <option value="require_sponsorship">Will require visa sponsorship now or in future</option>
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
              Complete your profile to boost job matching accuracy and enable Autofill extension to autofill your applications.
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
                onClick={() => {
                  setActiveTab("personal");
                  setIsEditingPersonal(true);
                }}
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
