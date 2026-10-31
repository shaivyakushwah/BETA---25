export type WorkMode = "remote" | "hybrid" | "onsite";
export type Seniority = "intern" | "junior" | "mid" | "senior";
export type Verdict = "clear" | "check" | "doubtful";
export type Severity = "info" | "caution" | "serious";

export interface Requirement {
  skill: string;
  must: boolean;
}

export interface SeedJob {
  id: string;
  title: string;
  company: string;
  companyDomain?: string | null;
  companyVerified?: boolean;
  location: string;
  workMode: WorkMode;
  seniority: Seniority;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  description: string;
  requirements: Requirement[];
  postedDaysAgo: number;
  repostCount?: number;
  expiresInDays?: number | null;
  filledDaysAgo?: number | null;
  contactEmail?: string | null;
  source?: string;
  sourceUrl?: string;
  takeHome?: boolean;
  coverLetterRequired?: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyDomain?: string | null;
  companyVerified?: boolean;
  location: string;
  workMode: WorkMode;
  seniority: Seniority;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  description: string;
  requirements: Requirement[];
  postedAt: string;
  expiresAt: string | null;
  repostCount: number;
  filledDaysAgo?: number | null;
  contactEmail?: string | null;
  source: string;
  sourceUrl: string;
  takeHome?: boolean;
  coverLetterRequired?: boolean;
}

export interface TrustFlag {
  code: string;
  label: string;
  severity: Severity;
  /** What we actually observed. Always concrete. */
  observed: string;
  /** Why a candidate should care. */
  why: string;
  /** The action that would settle it. */
  resolve: string;
}

export interface TrustReport {
  score: number;
  verdict: Verdict;
  flags: TrustFlag[];
  /** Job id of the listing this appears to be a copy of. */
  duplicateOf: string | null;
  duplicateSimilarity: number | null;
  /** Signals we checked and found clean — shown so the panel is not one-sided. */
  checked: string[];
}

export interface ResumeLine {
  n: number;
  section: string;
  text: string;
  /** Lower-cased copy for matching. */
  norm: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string;
  headline: string;
  location: string;
  seniority: Seniority;
  yearsExperience: number;
  targetRoles: string[];
  workModes: WorkMode[];
  minSalary: number | null;
  hoursPerWeek: number;
  longShotGoal: string | null;
}

export interface SkillMatch {
  skill: string;
  must: boolean;
  /** Line that supports this skill, if any. */
  evidence: { line: number; quote: string } | null;
  via: "direct" | "adjacent";
  viaNote?: string;
}

export interface SkillGap {
  skill: string;
  must: boolean;
  /** How many other listings in the candidate's target families also ask for it. */
  demand: number;
  /** Total listings sampled for that family. */
  sample: number;
}

export interface FitComponent {
  key: string;
  label: string;
  earned: number;
  max: number;
  note: string;
}

export interface FitReport {
  score: number;
  /** 0-1. Low when the profile is thin — the UI must show this. */
  confidence: number;
  components: FitComponent[];
  matched: SkillMatch[];
  gaps: SkillGap[];
  summary: string;
  stretch: boolean;
}

export interface JobInsight {
  job: Job;
  trust: TrustReport;
  fit: FitReport;
  minutes: number;
  valuePerHour: number;
  decision: "apply" | "skip" | "maybe" | null;
  decisionReason: string | null;
}

export interface EvidenceSuggestion {
  id: string;
  /** Verbatim text from the resume. Never generated. */
  quote: string;
  line: number;
  section: string;
  /** The job requirement this speaks to. */
  forRequirement: string;
  /** Short, non-claiming framing of where to put it. */
  angle: string;
  matched: boolean;
  /** Whether the candidate chose to include this in the application. */
  selected?: boolean;
}

export interface DiscardedSuggestion {
  quote: string;
  reason: string;
}

export interface Application {
  id: number;
  jobId: string;
  status: ApplicationStatus;
  highlights: EvidenceSuggestion[];
  draft: string;
  coverLetter: string;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
}

export type ApplicationStatus =
  | "drafting"
  | "ready"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "ghosted";

export interface ApplicationEvent {
  id: number;
  applicationId: number;
  at: string;
  kind: string;
  note: string;
  source: "candidate" | "email" | "portal" | "system";
  confidence: number;
  confirmed: boolean;
}
