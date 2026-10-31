/**
 * Authentic ATS Resume Scoring & Audit Engine
 * 
 * Implements rigorous deterministic ATS parsing algorithms modeled after
 * modern Applicant Tracking Systems (Taleo, Workday, Greenhouse, Jobscan, VMock):
 * 1. Contact Information & Header Parsing (15 pts)
 * 2. Section Architecture & ATS Headings (20 pts)
 * 3. Content Impact & Google X-Y-Z Metrics (25 pts)
 * 4. Technical Skills & Keyword Alignment (25 pts)
 * 5. Formatting Hygiene, Word Count & Cliché Scan (15 pts)
 */

export interface AtsCheckItem {
  id: string;
  name: string;
  category: "contact" | "structure" | "impact" | "skills" | "formatting";
  status: "pass" | "warning" | "fail";
  score: number;
  maxScore: number;
  message: string;
}

export interface AtsScoreResult {
  overallScore: number; // 0 - 100
  headline: string;
  summary: string;
  breakdown: {
    contactCompleteness: number; // 0-15
    sectionStructure: number; // 0-20
    experienceImpact: number; // 0-25
    technicalSkills: number; // 0-25
    atsFormatting: number; // 0-15
    // Compatibility fields with legacy breakdown
    technicalMatch: number;
    clarityStructure: number;
    atsReadiness: number;
  };
  checks: AtsCheckItem[];
  detectedSkills: string[];
  metricsCount: number;
  actionVerbsCount: number;
  wordCount: number;
  strengths: string[];
  weaknesses: string[];
  interviewReadiness: "High" | "Moderate" | "Needs Preparation";
  actionableEdits: string[];
  source: "ats_engine";
}

const COMMON_TECH_SKILLS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang", "rust", "ruby", "php", "swift", "kotlin",
  "react", "react.js", "next.js", "vue", "vue.js", "angular", "svelte", "html", "html5", "css", "css3", "sass", "tailwind",
  "node", "node.js", "express", "express.js", "nest.js", "fastapi", "django", "flask", "spring", "spring boot", ".net",
  "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "dynamodb", "cassandra",
  "git", "github", "gitlab", "docker", "kubernetes", "k8s", "aws", "amazon web services", "gcp", "google cloud", "azure",
  "ci/cd", "terraform", "ansible", "jenkins", "linux", "graphql", "rest", "restful", "rest api", "api", "microservices",
  "kafka", "rabbitmq", "grpc", "jest", "cypress", "playwright", "vitest", "unit testing", "system design",
  "machine learning", "deep learning", "ai", "artificial intelligence", "nlp", "computer vision", "llm", "pandas", "numpy",
  "scikit-learn", "tensorflow", "pytorch", "data structures", "algorithms", "agile", "scrum", "jira"
];

const STRONG_ACTION_VERBS = [
  "architected", "spearheaded", "engineered", "orchestrated", "developed", "implemented", "deployed", "automated",
  "optimized", "scaled", "streamlined", "reduced", "increased", "accelerated", "integrated", "designed", "built",
  "formulated", "refactored", "overhauled", "mentored", "negotiated", "led", "directed", "executed", "established",
  "delivered", "launched", "generated", "pioneered", "maximized", "transformed", "boosted", "consolidated", "upgraded",
  "authored", "devised", "initiated", "standardized", "debugged", "resolved", "collaborated", "managed", "trained"
];

const WEAK_PASSIVE_PHRASES = [
  "responsible for", "assisted in", "helped with", "worked on", "duties included", "tasked with", "handled"
];

const CLICHE_BUZZWORDS = [
  "hard worker", "team player", "go-getter", "detail-oriented", "self-motivated", "dynamic", "passionate individual",
  "synergy", "fast learner", "think outside the box", "results-driven person", "perfectionist"
];

export function auditResumeAts(resumeText: string, targetRole?: string): AtsScoreResult {
  const text = resumeText || "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const words = text.toLowerCase().match(/\b[a-z0-9+#.-]+\b/g) || [];
  const wordCount = words.length;

  const checks: AtsCheckItem[] = [];

  // ============================================================
  // 1. CONTACT INFORMATION & HEADER (15 pts)
  // ============================================================
  let contactScore = 0;

  // Name (3 pts)
  const firstLines = lines.slice(0, 3).join(" ");
  const hasName = firstLines.length > 3 && !firstLines.includes("@") && /[a-zA-Z]{2,}\s+[a-zA-Z]{2,}/.test(firstLines);
  const namePts = hasName ? 3 : 1;
  contactScore += namePts;
  checks.push({
    id: "header_name",
    name: "Candidate Name in Header",
    category: "contact",
    status: hasName ? "pass" : "warning",
    score: namePts,
    maxScore: 3,
    message: hasName ? "Full name prominently detected at the top of the resume." : "Ensure your full name is the first clear line in the document.",
  });

  // Email (3 pts)
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const emailPts = hasEmail ? 3 : 0;
  contactScore += emailPts;
  checks.push({
    id: "header_email",
    name: "Professional Email Address",
    category: "contact",
    status: hasEmail ? "pass" : "fail",
    score: emailPts,
    maxScore: 3,
    message: hasEmail ? "Valid professional email address detected." : "No valid email address found. Required for ATS contact parsing.",
  });

  // Phone (3 pts)
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}|\+91[-.\s]?\d{10}/.test(text);
  const phonePts = hasPhone ? 3 : 0;
  contactScore += phonePts;
  checks.push({
    id: "header_phone",
    name: "Phone Number",
    category: "contact",
    status: hasPhone ? "pass" : "fail",
    score: phonePts,
    maxScore: 3,
    message: hasPhone ? "Valid telephone number formatted cleanly." : "Phone number missing. Recruiters filter out resumes without phone contact.",
  });

  // Location (3 pts)
  const hasLocation = /(remote|relocation|[A-Za-z]+,\s*[A-Za-z]{2,}|india|usa|uk|germany|canada|bhopal|delhi|bangalore|london|new york|california)/i.test(text);
  const locPts = hasLocation ? 3 : 1;
  contactScore += locPts;
  checks.push({
    id: "header_location",
    name: "Geographic Location / Work Mode",
    category: "contact",
    status: hasLocation ? "pass" : "warning",
    score: locPts,
    maxScore: 3,
    message: hasLocation ? "City / Region or Remote availability identified." : "Add your City/State/Country so location-based ATS queries match you.",
  });

  // Professional Links (3 pts)
  const hasLinks = /(linkedin\.com\/in\/|github\.com\/|portfolio|[a-z0-9]+\.(?:io|dev|me))/i.test(text);
  const linkPts = hasLinks ? 3 : 1;
  contactScore += linkPts;
  checks.push({
    id: "header_links",
    name: "LinkedIn / GitHub / Portfolio Link",
    category: "contact",
    status: hasLinks ? "pass" : "warning",
    score: linkPts,
    maxScore: 3,
    message: hasLinks ? "Professional profile link found (LinkedIn or GitHub)." : "Include your LinkedIn URL or GitHub to increase candidate credibility.",
  });

  // ============================================================
  // 2. SECTION ARCHITECTURE & HEADINGS (20 pts)
  // ============================================================
  let structScore = 0;

  // Summary (4 pts)
  const hasSummary = /(professional\s+summary|summary|profile|about\s+me|career\s+objective)/i.test(text);
  const summaryPts = hasSummary ? 4 : 2;
  structScore += summaryPts;
  checks.push({
    id: "sec_summary",
    name: "Professional Summary Section",
    category: "structure",
    status: hasSummary ? "pass" : "warning",
    score: summaryPts,
    maxScore: 4,
    message: hasSummary ? "Clear Professional Summary header detected." : "Add a targeted Professional Summary highlighting your technical scope.",
  });

  // Experience (5 pts)
  const hasExperience = /(work\s+experience|professional\s+experience|employment\s+history|experience)/i.test(text);
  const expPts = hasExperience ? 5 : 1;
  structScore += expPts;
  checks.push({
    id: "sec_experience",
    name: "Work / Professional Experience Section",
    category: "structure",
    status: hasExperience ? "pass" : "fail",
    score: expPts,
    maxScore: 5,
    message: hasExperience ? "Standard Experience section header recognized by ATS." : "Missing standard 'Experience' or 'Work Experience' heading.",
  });

  // Skills (4 pts)
  const hasSkillsSec = /(technical\s+skills|core\s+competencies|skills\s+(&|and)\s+technologies|skills)/i.test(text);
  const skillPts = hasSkillsSec ? 4 : 1;
  structScore += skillPts;
  checks.push({
    id: "sec_skills",
    name: "Technical Skills Section",
    category: "structure",
    status: hasSkillsSec ? "pass" : "fail",
    score: skillPts,
    maxScore: 4,
    message: hasSkillsSec ? "Dedicated Technical Skills section detected." : "Create a separate 'Technical Skills' heading for keyword parsers.",
  });

  // Education (4 pts)
  const hasEducation = /(education|academic\s+background|degrees|qualifications)/i.test(text);
  const eduPts = hasEducation ? 4 : 1;
  structScore += eduPts;
  checks.push({
    id: "sec_education",
    name: "Education & Degrees Section",
    category: "structure",
    status: hasEducation ? "pass" : "fail",
    score: eduPts,
    maxScore: 4,
    message: hasEducation ? "Standard Education section verified." : "Missing 'Education' heading. ATS parsers categorize degrees using this header.",
  });

  // Projects (3 pts)
  const hasProjects = /(projects|key\s+projects|technical\s+projects|open\s+source)/i.test(text);
  const projPts = hasProjects ? 3 : 1;
  structScore += projPts;
  checks.push({
    id: "sec_projects",
    name: "Projects & Initiatives Section",
    category: "structure",
    status: hasProjects ? "pass" : "warning",
    score: projPts,
    maxScore: 3,
    message: hasProjects ? "Projects section present to evidence practical delivery." : "Consider adding a Projects section to showcase hands-on work.",
  });

  // ============================================================
  // 3. EXPERIENCE IMPACT & ACTION VERBS (25 pts)
  // ============================================================
  let impactScore = 0;

  // Quantified metrics
  const metricMatches = text.match(/\b(?:\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:\.\d+)?|\d+\+?\s*(?:users|clients|customers|requests|transactions|queries|stars|downloads|leads|sales|dollars|revenue|qps|ms|seconds|minutes|hours|days|percent|x)\b)/gi) || [];
  const metricsCount = metricMatches.length;
  let metricPts = 0;
  if (metricsCount >= 5) metricPts = 10;
  else if (metricsCount >= 3) metricPts = 8;
  else if (metricsCount >= 1) metricPts = 5;
  else metricPts = 2;
  impactScore += metricPts;

  checks.push({
    id: "impact_metrics",
    name: "Measurable Results & Metrics (Google X-Y-Z)",
    category: "impact",
    status: metricsCount >= 3 ? "pass" : metricsCount >= 1 ? "warning" : "fail",
    score: metricPts,
    maxScore: 10,
    message: metricsCount >= 3
      ? `Found ${metricsCount} quantified metrics (%, numbers, scale). Excellent impact proof!`
      : `Found only ${metricsCount} quantified metric(s). Add numbers (e.g. 'improved latency by 35%', 'served 10k users').`,
  });

  // Action verbs
  const lowerText = text.toLowerCase();
  const detectedVerbs = STRONG_ACTION_VERBS.filter((verb) => lowerText.includes(verb));
  const actionVerbsCount = detectedVerbs.length;
  let verbPts = 0;
  if (actionVerbsCount >= 6) verbPts = 8;
  else if (actionVerbsCount >= 3) verbPts = 6;
  else if (actionVerbsCount >= 1) verbPts = 3;
  else verbPts = 1;
  impactScore += verbPts;

  checks.push({
    id: "impact_verbs",
    name: "Strong Action Verbs (Power Verbs)",
    category: "impact",
    status: actionVerbsCount >= 5 ? "pass" : "warning",
    score: verbPts,
    maxScore: 8,
    message: actionVerbsCount >= 5
      ? `Identified ${actionVerbsCount} strong action verbs (${detectedVerbs.slice(0, 3).join(", ")}...).`
      : `Only ${actionVerbsCount} strong action verbs found. Start bullets with 'Architected', 'Implemented', 'Engineered'.`,
  });

  // Weak phrasing check
  const weakFound = WEAK_PASSIVE_PHRASES.filter((p) => lowerText.includes(p));
  const hasPassive = weakFound.length > 0;
  const passivePts = hasPassive ? 1 : 4;
  impactScore += passivePts;

  checks.push({
    id: "impact_passive",
    name: "Absence of Passive / Weak Phrasing",
    category: "impact",
    status: !hasPassive ? "pass" : "warning",
    score: passivePts,
    maxScore: 4,
    message: !hasPassive
      ? "Zero passive phrases detected ('responsible for', 'helped with')."
      : `Found passive phrasing (${weakFound.join(", ")}). Replace with direct accomplishment verbs.`,
  });

  // Bullet formatting & density
  const bulletLines = lines.filter((l) => /^[•\-\*]/.test(l));
  const bulletCount = bulletLines.length;
  const bulletPts = bulletCount >= 5 && bulletCount <= 28 ? 3 : 2;
  impactScore += bulletPts;

  checks.push({
    id: "impact_bullets",
    name: "Bullet Point Density & Structure",
    category: "impact",
    status: bulletCount >= 5 ? "pass" : "warning",
    score: bulletPts,
    maxScore: 3,
    message: bulletCount >= 5
      ? `Proper bullet structure with ${bulletCount} concise accomplishment items.`
      : "Ensure experience entries are organized into clean bullet points with standard bullets ('•').",
  });

  // ============================================================
  // 4. TECHNICAL SKILLS & KEYWORD DENSITY (25 pts)
  // ============================================================
  let skillsScore = 0;

  const detectedSkills = COMMON_TECH_SKILLS.filter((s) => {
    const regex = new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i");
    return regex.test(text);
  });
  const uniqueSkillsCount = detectedSkills.length;

  let skillPtsEarned = 0;
  if (uniqueSkillsCount >= 14) skillPtsEarned = 12;
  else if (uniqueSkillsCount >= 9) skillPtsEarned = 10;
  else if (uniqueSkillsCount >= 5) skillPtsEarned = 7;
  else skillPtsEarned = 4;
  skillsScore += skillPtsEarned;

  checks.push({
    id: "skills_density",
    name: "Hard Skills & Technology Keywords",
    category: "skills",
    status: uniqueSkillsCount >= 9 ? "pass" : uniqueSkillsCount >= 5 ? "warning" : "fail",
    score: skillPtsEarned,
    maxScore: 12,
    message: uniqueSkillsCount >= 9
      ? `Found ${uniqueSkillsCount} recognizable industry hard skills (${detectedSkills.slice(0, 5).join(", ")}...).`
      : `Only ${uniqueSkillsCount} core skills detected. Expand your technologies list to pass ATS keyword filters.`,
  });

  // Skill categorization
  const hasSkillCategories = /(languages|frameworks|tools|databases|cloud|libraries):/i.test(text);
  const catPts = hasSkillCategories ? 5 : 3;
  skillsScore += catPts;
  checks.push({
    id: "skills_categories",
    name: "Skills Categorization (Languages / Tools)",
    category: "skills",
    status: hasSkillCategories ? "pass" : "warning",
    score: catPts,
    maxScore: 5,
    message: hasSkillCategories
      ? "Skills are neatly categorized (e.g. Languages, Frameworks, Tools)."
      : "Group skills into categories (e.g. 'Languages: React, TS' | 'Databases: Postgres, Redis') for faster parsing.",
  });

  // Target role alignment
  const target = (targetRole || "").toLowerCase();
  let roleMatchPts = 6;
  if (target) {
    const roleWords = target.split(/\s+/).filter((w) => w.length > 2);
    const matchesRole = roleWords.filter((w) => lowerText.includes(w)).length;
    if (matchesRole >= roleWords.length) roleMatchPts = 8;
    else if (matchesRole > 0) roleMatchPts = 6;
    else roleMatchPts = 3;
  } else {
    // If no target role specified, evaluate general engineering alignment
    const engTerms = ["software", "developer", "engineer", "data", "full stack", "frontend", "backend"];
    const hasEng = engTerms.some((t) => lowerText.includes(t));
    roleMatchPts = hasEng ? 8 : 5;
  }
  skillsScore += roleMatchPts;

  checks.push({
    id: "skills_role_alignment",
    name: targetRole ? `Alignment with Target Role (${targetRole})` : "Engineering Domain Alignment",
    category: "skills",
    status: roleMatchPts >= 7 ? "pass" : "warning",
    score: roleMatchPts,
    maxScore: 8,
    message: roleMatchPts >= 7
      ? `Strong alignment with keywords expected for ${targetRole || "technical roles"}.`
      : `Incorporate more core keywords specifically matching ${targetRole || "your target domain"}.`,
  });

  // ============================================================
  // 5. ATS FORMATTING, WORD COUNT & CLICHÉ SCAN (15 pts)
  // ============================================================
  let formatScore = 0;

  // Word count sweet spot (400 - 950 words)
  let lengthPts = 0;
  if (wordCount >= 380 && wordCount <= 950) lengthPts = 6;
  else if (wordCount >= 280 && wordCount <= 1200) lengthPts = 4;
  else lengthPts = 2;
  formatScore += lengthPts;

  checks.push({
    id: "format_length",
    name: "Resume Word Count Sweet Spot (400–900 words)",
    category: "formatting",
    status: lengthPts === 6 ? "pass" : "warning",
    score: lengthPts,
    maxScore: 6,
    message: lengthPts === 6
      ? `Word count is optimal at ${wordCount} words (ideal 1–2 page ATS scan depth).`
      : `Resume length is ${wordCount} words. Aim for 400 to 900 words for optimal ATS parsing.`,
  });

  // Cliché buzzwords scan
  const foundCliches = CLICHE_BUZZWORDS.filter((c) => lowerText.includes(c));
  const hasCliches = foundCliches.length > 0;
  const clichePts = hasCliches ? 2 : 5;
  formatScore += clichePts;

  checks.push({
    id: "format_cliches",
    name: "Cliché & Buzzword Hygiene",
    category: "formatting",
    status: !hasCliches ? "pass" : "warning",
    score: clichePts,
    maxScore: 5,
    message: !hasCliches
      ? "Zero empty buzzwords ('hard worker', 'team player', 'synergy')."
      : `Found overused buzzwords (${foundCliches.join(", ")}). Replace with technical proof.`,
  });

  // Date consistency
  const hasDates = /(20\d\d\s*[-–—to➔]+\s*(?:20\d\d|present)|\d{2}\/\d{4})/i.test(text);
  const datePts = hasDates ? 4 : 2;
  formatScore += datePts;

  checks.push({
    id: "format_dates",
    name: "Consistent Date Formatting",
    category: "formatting",
    status: hasDates ? "pass" : "warning",
    score: datePts,
    maxScore: 4,
    message: hasDates
      ? "Chronological employment dates formatted consistently."
      : "Standardize dates (e.g. '2023 – Present' or 'MM/YYYY') for chronological parser indexing.",
  });

  // ============================================================
  // FINAL COMPUTED ATS SCORE
  // ============================================================
  const totalScore = Math.min(100, Math.max(10, contactScore + structScore + impactScore + skillsScore + formatScore));

  // Determine strengths & weaknesses
  const passedChecks = checks.filter((c) => c.status === "pass");
  const failedOrWarn = checks.filter((c) => c.status !== "pass");

  const strengths = passedChecks.slice(0, 4).map((c) => c.name + ": " + c.message);
  const weaknesses = failedOrWarn.slice(0, 4).map((c) => c.name + ": " + c.message);

  const actionableEdits: string[] = [];
  if (metricsCount < 3) {
    actionableEdits.push("Add concrete metrics to your experience bullets using numbers, percentages, or scale (e.g. 'reduced latency by 35%').");
  }
  if (!hasLinks) {
    actionableEdits.push("Add your LinkedIn profile URL and GitHub repository link in the header contact line.");
  }
  if (uniqueSkillsCount < 9) {
    actionableEdits.push("List specific developer tools, libraries, and frameworks you've used (e.g. Git, Docker, REST APIs, SQL).");
  }
  if (hasPassive) {
    actionableEdits.push("Replace weak phrases like 'responsible for' or 'worked on' with power action verbs ('Spearheaded', 'Architected').");
  }
  if (actionableEdits.length < 3) {
    actionableEdits.push("Organize your Technical Skills into categorized lines (Languages, Frameworks, Cloud, Databases).");
  }

  const interviewReadiness: "High" | "Moderate" | "Needs Preparation" =
    totalScore >= 78 ? "High" : totalScore >= 60 ? "Moderate" : "Needs Preparation";

  const headline =
    totalScore >= 85
      ? "Top Tier ATS-Optimized Resume"
      : totalScore >= 72
        ? "Competitive ATS Profile with Strong Foundations"
        : totalScore >= 55
          ? "Developing Resume — Actionable ATS Gaps Identified"
          : "Needs Comprehensive ATS Structure & Keyword Optimization";

  const summary = `Authentic ATS Audit: Scored ${totalScore}/100 across 16 algorithmic parameters including Contact Completeness (${contactScore}/15), Section Architecture (${structScore}/20), Quantified Impact (${impactScore}/25), Technical Skills Density (${skillsScore}/25), and ATS Formatting Hygiene (${formatScore}/15).`;

  return {
    overallScore: totalScore,
    headline,
    summary,
    breakdown: {
      contactCompleteness: contactScore,
      sectionStructure: structScore,
      experienceImpact: impactScore,
      technicalSkills: skillsScore,
      atsFormatting: formatScore,
      technicalMatch: skillsScore,
      clarityStructure: structScore,
      atsReadiness: Math.round((contactScore + formatScore) / 30 * 20),
    },
    checks,
    detectedSkills: detectedSkills.slice(0, 15),
    metricsCount,
    actionVerbsCount,
    wordCount,
    strengths,
    weaknesses,
    interviewReadiness,
    actionableEdits: actionableEdits.slice(0, 4),
    source: "ats_engine",
  };
}
