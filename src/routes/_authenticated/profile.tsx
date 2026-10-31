import { createFileRoute } from "@tanstack/react-router";
import { snapshotQuery, useSnapshot } from "@/lib/app-runtime";
import { Suspense, useState, useEffect } from "react";
import { getWorkspace } from "@/lib/insights";
import { saveProfileAction } from "@/app/actions";
import { ResumeUpload } from "@/components/resume-upload";
import { ResumeScorer } from "@/components/resume-scorer";
import type { ExtractedResumeData } from "@/lib/resume-parser";
import {
  ShieldCheck,
  FileText,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  Pencil,
  Sparkles,
  Check,
  CheckCircle2,
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

  // Candidate Personal Info (from DB / resume extraction)
  const [candidateName, setCandidateName] = useState(candidate.name || "");
  const [candidateLocation, setCandidateLocation] = useState(candidate.location || "");
  const [candidateHeadline, setCandidateHeadline] = useState(candidate.headline || "");
  const [personalPhone, setPersonalPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState(candidate.email || "");
  const [personalLinkedin, setPersonalLinkedin] = useState("");

  // Resume Text (KEEP RESUME EXTRACTED TEXT AS IT IS)
  const [resumeContent, setResumeContent] = useState(ws.resumeText || "");

  // Career Preferences & Target Roles Form (DO NOT PREFILL)
  const [prefName, setPrefName] = useState("");
  const [prefLocation, setPrefLocation] = useState("");
  const [prefEmail, setPrefEmail] = useState("");
  const [prefHeadline, setPrefHeadline] = useState("");
  const [prefSeniority, setPrefSeniority] = useState("");
  const [prefHours, setPrefHours] = useState("");
  const [prefMinSalary, setPrefMinSalary] = useState("");
  const [prefTargetRoles, setPrefTargetRoles] = useState("");

  // Editable personal info state (pencil modal/inline)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  // Status & Notification banners
  const [extractionAlert, setExtractionAlert] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // Skills state
  const [skillsList, setSkillsList] = useState<string[]>([
    "Python", "React", "Next.js", "TypeScript", "JavaScript", "SQL", "Git", "REST APIs", "Machine Learning"
  ]);

  // Load saved education/experience/personal from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("shortlist_profile_name");
      if (savedName) setCandidateName(savedName);

      const savedLoc = localStorage.getItem("shortlist_profile_location");
      if (savedLoc) setCandidateLocation(savedLoc);

      const savedHead = localStorage.getItem("shortlist_profile_headline");
      if (savedHead) setCandidateHeadline(savedHead);

      const savedPhone = localStorage.getItem("shortlist_profile_phone");
      if (savedPhone) setPersonalPhone(savedPhone);

      const savedEmail = localStorage.getItem("shortlist_profile_email");
      if (savedEmail) setPersonalEmail(savedEmail);

      const savedLi = localStorage.getItem("shortlist_profile_linkedin");
      if (savedLi) setPersonalLinkedin(savedLi);

      const savedEdu = localStorage.getItem("shortlist_profile_education");
      if (savedEdu) {
        try {
          const parsed = JSON.parse(savedEdu);
          if (Array.isArray(parsed) && parsed.length > 0) setEducationList(parsed);
        } catch {}
      }

      const savedExp = localStorage.getItem("shortlist_profile_experience");
      if (savedExp) {
        try {
          const parsed = JSON.parse(savedExp);
          if (Array.isArray(parsed) && parsed.length > 0) setExperienceList(parsed);
        } catch {}
      }

      const savedSkills = localStorage.getItem("shortlist_profile_skills");
      if (savedSkills) {
        try {
          const parsed = JSON.parse(savedSkills);
          if (Array.isArray(parsed) && parsed.length > 0) setSkillsList(parsed);
        } catch {}
      }

      // Check if user previously saved specific career preferences
      const savedPrefName = localStorage.getItem("shortlist_pref_name");
      if (savedPrefName) setPrefName(savedPrefName);
      const savedPrefLoc = localStorage.getItem("shortlist_pref_location");
      if (savedPrefLoc) setPrefLocation(savedPrefLoc);
      const savedPrefMail = localStorage.getItem("shortlist_pref_email");
      if (savedPrefMail) setPrefEmail(savedPrefMail);
      const savedPrefHead = localStorage.getItem("shortlist_pref_headline");
      if (savedPrefHead) setPrefHeadline(savedPrefHead);
      const savedPrefRoles = localStorage.getItem("shortlist_pref_target_roles");
      if (savedPrefRoles) setPrefTargetRoles(savedPrefRoles);
      const savedPrefSen = localStorage.getItem("shortlist_pref_seniority");
      if (savedPrefSen) setPrefSeniority(savedPrefSen);
      const savedPrefHours = localStorage.getItem("shortlist_pref_hours");
      if (savedPrefHours) setPrefHours(savedPrefHours);
      const savedPrefSal = localStorage.getItem("shortlist_pref_minsalary");
      if (savedPrefSal) setPrefMinSalary(savedPrefSal);
    }
  }, []);

  // Handler for structured resume extraction:
  // Updates candidate card, education, experience, skills, and resume text,
  // but DOES NOT PREFILL the career preferences form panel.
  function handleResumeExtracted(data: ExtractedResumeData) {
    if (data.name) {
      setCandidateName(data.name);
      localStorage.setItem("shortlist_profile_name", data.name);
    }
    if (data.location) {
      setCandidateLocation(data.location);
      localStorage.setItem("shortlist_profile_location", data.location);
    }
    if (data.headline) {
      setCandidateHeadline(data.headline);
      localStorage.setItem("shortlist_profile_headline", data.headline);
    }
    if (data.phone) {
      setPersonalPhone(data.phone);
      localStorage.setItem("shortlist_profile_phone", data.phone);
    }
    if (data.email) {
      setPersonalEmail(data.email);
      localStorage.setItem("shortlist_profile_email", data.email);
    }
    if (data.linkedin) {
      setPersonalLinkedin(data.linkedin);
      localStorage.setItem("shortlist_profile_linkedin", data.linkedin);
    }
    if (data.education && data.education.length > 0) {
      setEducationList(data.education);
      localStorage.setItem("shortlist_profile_education", JSON.stringify(data.education));
    }
    if (data.experience && data.experience.length > 0) {
      setExperienceList(data.experience);
      localStorage.setItem("shortlist_profile_experience", JSON.stringify(data.experience));
    }
    if (data.skills && data.skills.length > 0) {
      setSkillsList(data.skills);
      localStorage.setItem("shortlist_profile_skills", JSON.stringify(data.skills));
    }

    // Keep resume extracted text as it is
    if (data.rawText) {
      setResumeContent(data.rawText);
    }

    setExtractionAlert(
      `Resume text & candidate profile extracted for ${data.name || "candidate"}.`
    );
  }

  // Handle Save Profile
  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const formData = new FormData(e.currentTarget);
      const finalName = prefName.trim() || candidateName || "Job Seeker";
      const finalEmail = prefEmail.trim() || personalEmail || "";
      const finalLocation = prefLocation.trim() || candidateLocation || "";
      const finalHeadline = prefHeadline.trim() || candidateHeadline || "";
      const finalRoles = prefTargetRoles.trim() || "";

      formData.set("name", finalName);
      formData.set("email", finalEmail);
      formData.set("location", finalLocation);
      formData.set("headline", finalHeadline);
      formData.set("targetRoles", finalRoles);
      formData.set("hours", prefHours.trim() || "20");
      formData.set("minSalary", prefMinSalary.trim());
      formData.set("seniority", prefSeniority.trim() || "junior");
      formData.set("resume", resumeContent);

      // Persist to local storage
      if (prefName.trim()) localStorage.setItem("shortlist_pref_name", prefName);
      if (prefLocation.trim()) localStorage.setItem("shortlist_pref_location", prefLocation);
      if (prefEmail.trim()) localStorage.setItem("shortlist_pref_email", prefEmail);
      if (prefHeadline.trim()) localStorage.setItem("shortlist_pref_headline", prefHeadline);
      if (prefTargetRoles.trim()) localStorage.setItem("shortlist_pref_target_roles", prefTargetRoles);
      if (prefSeniority.trim()) localStorage.setItem("shortlist_pref_seniority", prefSeniority);
      if (prefHours.trim()) localStorage.setItem("shortlist_pref_hours", prefHours);
      if (prefMinSalary.trim()) localStorage.setItem("shortlist_pref_minsalary", prefMinSalary);

      localStorage.setItem("shortlist_profile_name", finalName);
      localStorage.setItem("shortlist_profile_location", finalLocation);
      localStorage.setItem("shortlist_profile_headline", finalHeadline);
      localStorage.setItem("shortlist_profile_phone", personalPhone);
      localStorage.setItem("shortlist_profile_email", finalEmail);
      localStorage.setItem("shortlist_profile_linkedin", personalLinkedin);
      localStorage.setItem("shortlist_profile_education", JSON.stringify(educationList));
      localStorage.setItem("shortlist_profile_experience", JSON.stringify(experienceList));
      localStorage.setItem("shortlist_profile_skills", JSON.stringify(skillsList));

      // Persist to backend Supabase database
      await saveProfileAction(formData);

      setSaveSuccessMsg("✓ Profile and preferences saved successfully!");
      setExtractionAlert(null);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }

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
    setSaveSuccessMsg("Education details updated.");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
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
    setSaveSuccessMsg("Work experience details updated.");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  }

  return (
    <div>
      {/* Top Header with Upload Resume Button (Turbo Box Removed) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>PROFILE</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Keep your profile and resume updated to match relevant job opportunities.
          </p>
        </div>

        {/* Prominent Upload Resume Button at Top */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ResumeUpload
            onExtracted={handleResumeExtracted}
            buttonText="+ Upload Resume"
            variant="primary"
            showHelperText={false}
          />
        </div>
      </div>

      {/* Extraction Success Banner */}
      {extractionAlert && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={18} color="#059669" />
            <span style={{ fontSize: 13, color: "#065f46", fontWeight: 600 }}>{extractionAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setExtractionAlert(null)}
            style={{ background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Save Success Banner */}
      {saveSuccessMsg && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: 13, color: "#065f46", fontWeight: 700 }}>{saveSuccessMsg}</span>
        </div>
      )}

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
          Skills ({skillsList.length})
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
                      {candidateName || "ADD YOUR NAME"}
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                      {candidateHeadline || "Headline / Specialization"}
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
                    <h4 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700 }}>Edit Contact &amp; Personal Info</h4>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div className="grid-2">
                        <div>
                          <label className="field">Candidate Name</label>
                          <input
                            className="input"
                            value={candidateName}
                            onChange={(e) => {
                              setCandidateName(e.target.value);
                              localStorage.setItem("shortlist_profile_name", e.target.value);
                            }}
                            placeholder="e.g. Your Full Name"
                          />
                        </div>
                        <div>
                          <label className="field">Location</label>
                          <input
                            className="input"
                            value={candidateLocation}
                            onChange={(e) => {
                              setCandidateLocation(e.target.value);
                              localStorage.setItem("shortlist_profile_location", e.target.value);
                            }}
                            placeholder="e.g. City, Country"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="field">Headline</label>
                        <input
                          className="input"
                          value={candidateHeadline}
                          onChange={(e) => {
                            setCandidateHeadline(e.target.value);
                            localStorage.setItem("shortlist_profile_headline", e.target.value);
                          }}
                          placeholder="e.g. Software Engineer | Full Stack"
                        />
                      </div>
                      <div className="grid-2">
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
                          <label className="field">Email Address</label>
                          <input
                            className="input"
                            value={personalEmail}
                            onChange={(e) => {
                              setPersonalEmail(e.target.value);
                              localStorage.setItem("shortlist_profile_email", e.target.value);
                            }}
                            placeholder="e.g. you@example.com"
                          />
                        </div>
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
                  {candidateLocation && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                      <MapPin size={13} color="#64748b" />
                      <span>{candidateLocation}</span>
                    </div>
                  )}
                  {personalEmail && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                      <Mail size={13} color="#64748b" />
                      <span>{personalEmail}</span>
                    </div>
                  )}
                  {personalPhone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#334155" }}>
                      <Phone size={13} color="#64748b" />
                      <span>{personalPhone}</span>
                    </div>
                  )}
                  {personalLinkedin && (
                    <a
                      href={personalLinkedin.startsWith("http") ? personalLinkedin : `https://${personalLinkedin}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0f9ff", border: "1px solid #bae6fd", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, color: "#0284c7", textDecoration: "none" }}
                    >
                      <Linkedin size={13} />
                      <span>{personalLinkedin.replace("https://", "").replace("http://", "")}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Career Preferences & Target Roles Form (DO NOT PREFILL) */}
              <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px", color: "#0f172a" }}>
                  Career Preferences &amp; Target Roles
                </h3>
                <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: 16 }}>
                  <div className="grid-2">
                    <div>
                      <label className="field" htmlFor="name">
                        Full Name
                      </label>
                      <input
                        className="input"
                        id="name"
                        name="name"
                        value={prefName}
                        onChange={(e) => setPrefName(e.target.value)}
                        placeholder="e.g. Enter full name"
                      />
                    </div>
                    <div>
                      <label className="field" htmlFor="location">
                        Target Location
                      </label>
                      <input
                        className="input"
                        id="location"
                        name="location"
                        value={prefLocation}
                        onChange={(e) => setPrefLocation(e.target.value)}
                        placeholder="e.g. Remote, New York, London"
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div>
                      <label className="field" htmlFor="email">
                        Contact Email
                      </label>
                      <input
                        className="input"
                        id="email"
                        name="email"
                        value={prefEmail}
                        onChange={(e) => setPrefEmail(e.target.value)}
                        placeholder="e.g. you@example.com"
                      />
                    </div>
                    <div>
                      <label className="field" htmlFor="headline">
                        Professional Headline
                      </label>
                      <input
                        className="input"
                        id="headline"
                        name="headline"
                        value={prefHeadline}
                        onChange={(e) => setPrefHeadline(e.target.value)}
                        placeholder="e.g. Full Stack Developer | React, Python"
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div>
                      <label className="field" htmlFor="seniority">
                        Experience Level
                      </label>
                      <select
                        className="select"
                        id="seniority"
                        name="seniority"
                        value={prefSeniority}
                        onChange={(e) => setPrefSeniority(e.target.value)}
                      >
                        <option value="">Select experience level...</option>
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
                      <input
                        className="input"
                        id="hours"
                        name="hours"
                        type="number"
                        min={1}
                        max={40}
                        value={prefHours}
                        onChange={(e) => setPrefHours(e.target.value)}
                        placeholder="e.g. 20"
                      />
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
                        value={prefMinSalary}
                        onChange={(e) => setPrefMinSalary(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field" htmlFor="targetRoles">
                      Target Role Families (comma separated)
                    </label>
                    <input
                      className="input"
                      id="targetRoles"
                      name="targetRoles"
                      value={prefTargetRoles}
                      onChange={(e) => setPrefTargetRoles(e.target.value)}
                      placeholder="e.g. Python Developer, Software Engineer, Full Stack"
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label className="field" htmlFor="resume" style={{ margin: 0 }}>
                        Resume Text (Extracted automatically from PDF/TXT upload)
                      </label>
                      <ResumeUpload
                        onExtracted={handleResumeExtracted}
                        buttonText="Re-upload Resume"
                        variant="secondary"
                        showHelperText={false}
                      />
                    </div>
                    <textarea
                      className="textarea"
                      id="resume"
                      name="resume"
                      rows={10}
                      value={resumeContent}
                      onChange={(e) => setResumeContent(e.target.value)}
                      placeholder="Upload your resume above or paste resume text here..."
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={isSaving}
                      style={{ borderRadius: 999, padding: "11px 28px", fontWeight: 700 }}
                    >
                      {isSaving ? "Saving changes..." : "Save Profile"}
                    </button>
                    {saveSuccessMsg && (
                      <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                        {saveSuccessMsg}
                      </span>
                    )}
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
                <ResumeScorer initialTargetRole={prefTargetRoles.split(",")[0]?.trim() || "Software Engineer"} />
              </div>
            </div>
          )}

          {activeTab === "education" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Education</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
                    Extracted from your resume or edited manually.
                  </p>
                </div>
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

              {/* Education Display Cards */}
              <div style={{ display: "grid", gap: 18 }}>
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
            </div>
          )}

          {activeTab === "experience" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Work Experience &amp; Projects</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748b" }}>
                    Extracted from your resume or edited manually.
                  </p>
                </div>
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

              {/* Experience Display Cards */}
              <div style={{ display: "grid", gap: 18 }}>
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
            </div>
          )}

          {activeTab === "skills" && (
            <div className="card" style={{ padding: "28px", borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Skills</h3>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>
                    Technical and domain skills extracted from your resume:
                  </p>
                </div>
                <span className="badge" style={{ background: "#ecfdf5", color: "#065f46" }}>
                  {skillsList.length} Extracted Skills
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {skillsList.map((skill) => (
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

        {/* Right Sidebar Column (Red Alert Box Removed) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Quick Actions Card */}
          <div className="card" style={{ padding: "18px", borderRadius: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
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
                  window.scrollTo({ top: 100, behavior: "smooth" });
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
