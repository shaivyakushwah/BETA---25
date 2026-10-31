/**
 * Intelligent Job Listing Extractor
 * Parses job URLs (LinkedIn, Greenhouse, Lever, Ashby, Indeed, etc.)
 * or raw pasted job descriptions into structured Job listings with
 * verified Title, Company, Location, Work Mode, Seniority, and Skills.
 */

import { skillsIn, skillLabel } from "@/lib/skills";
import type { Job, Requirement, WorkMode, Seniority } from "@/lib/types";

export interface ExtractJobInput {
  urlOrText: string;
  overrideTitle?: string;
  overrideCompany?: string;
}

const COMMON_SKILLS = [
  "python", "react", "next.js", "javascript", "typescript", "node.js", "html", "css",
  "tailwind", "sql", "postgresql", "mysql", "mongodb", "git", "github", "docker",
  "kubernetes", "aws", "gcp", "azure", "machine learning", "deep learning",
  "pandas", "numpy", "c++", "java", "c#", "go", "rust", "rest apis", "graphql",
  "linux", "fastapi", "django", "flask", "express.js", "redis", "redux", "ai"
];

function titleCase(str: string): string {
  return str
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

/** Extracts Title and Company from known job URL patterns */
function parseUrlSlug(urlStr: string): { title?: string; company?: string } {
  try {
    const u = new URL(urlStr);
    const path = decodeURIComponent(u.pathname);

    // 1. LinkedIn jobs: /jobs/view/{title}-at-{company}-{id}
    const linkedinMatch = path.match(/\/jobs\/view\/([^\/?#]+)/i);
    if (linkedinMatch) {
      const slug = linkedinMatch[1]!.replace(/-\d{7,}$/, "").replace(/\?.*$/, "");
      const atParts = slug.split("-at-");
      if (atParts.length === 2 && atParts[0] && atParts[1]) {
        return {
          title: titleCase(atParts[0]),
          company: titleCase(atParts[1]),
        };
      }
      if (slug.length > 3) {
        return { title: titleCase(slug) };
      }
    }

    // 2. Greenhouse: /boards.greenhouse.io/{company}/jobs/{id}
    const ghMatch = path.match(/(?:boards\.)?greenhouse\.io\/([^\/]+)\/jobs\/([^\/?#]+)/i);
    if (ghMatch && ghMatch[1]) {
      return { company: titleCase(ghMatch[1]) };
    }

    // 3. Lever: /jobs.lever.co/{company}/{id}
    const leverMatch = path.match(/lever\.co\/([^\/]+)\/([^\/?#]+)/i);
    if (leverMatch && leverMatch[1]) {
      return { company: titleCase(leverMatch[1]) };
    }

    // 4. Ashby: /jobs.ashbyhq.com/{company}/{id}
    const ashbyMatch = path.match(/ashbyhq\.com\/([^\/]+)\/([^\/?#]+)/i);
    if (ashbyMatch && ashbyMatch[1]) {
      return { company: titleCase(ashbyMatch[1]) };
    }

    // 5. Workable: /apply.workable.com/{company}/j/{id}
    const workableMatch = path.match(/workable\.com\/([^\/]+)\/j\/([^\/?#]+)/i);
    if (workableMatch && workableMatch[1]) {
      return { company: titleCase(workableMatch[1]) };
    }
  } catch {}

  return {};
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses JSON-LD schema (JobPosting) from HTML */
function parseJsonLd(html: string) {
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]!.trim());
      const job = data["@type"] === "JobPosting"
        ? data
        : Array.isArray(data["@graph"])
        ? data["@graph"].find((item: any) => item["@type"] === "JobPosting")
        : null;

      if (job) {
        const title = job.title;
        const company = job.hiringOrganization?.name || (typeof job.hiringOrganization === "string" ? job.hiringOrganization : undefined);
        let location = "";
        if (job.jobLocation?.address) {
          const addr = job.jobLocation.address;
          location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
        } else if (typeof job.jobLocation === "string") {
          location = job.jobLocation;
        } else if (job.applicantLocationRequirements?.name) {
          location = job.applicantLocationRequirements.name;
        }

        const description = cleanHtml(job.description || "");
        const isRemote = job.jobLocationType === "TELECOMMUTE" || /remote/i.test(location) || /remote/i.test(description);
        const isHybrid = /hybrid/i.test(location) || /hybrid/i.test(description);

        let salaryMin: number | null = null;
        let salaryMax: number | null = null;
        if (job.baseSalary?.value) {
          const val = job.baseSalary.value;
          salaryMin = typeof val.minValue === "number" ? val.minValue : typeof val.value === "number" ? val.value : null;
          salaryMax = typeof val.maxValue === "number" ? val.maxValue : null;
        }

        return {
          title,
          company,
          location: location || (isRemote ? "Remote" : "Not stated"),
          workMode: isRemote ? ("remote" as WorkMode) : isHybrid ? ("hybrid" as WorkMode) : ("onsite" as WorkMode),
          description,
          salaryMin,
          salaryMax,
        };
      }
    } catch {}
  }
  return null;
}

/** Parses OpenGraph and Meta tags */
function parseMetaTags(html: string) {
  const ogTitleMatch = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta\b[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const ogSiteMatch = html.match(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  let rawTitle = ogTitleMatch?.[1] || titleTagMatch?.[1] || "";
  rawTitle = rawTitle.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();

  // Strip brand suffixes: " - LinkedIn", " | Greenhouse", " - Indeed", etc.
  rawTitle = rawTitle.replace(/\s*(?:\||-|–|—)\s*(?:LinkedIn|Greenhouse|Lever|Indeed|Glassdoor|Workday|Ashby|ZipRecruiter).*$/i, "");

  let title = "";
  let company = ogSiteMatch?.[1] || "";

  // If rawTitle contains " at " or " - "
  if (/\bat\b/i.test(rawTitle)) {
    const parts = rawTitle.split(/\bat\b/i);
    title = parts[0]!.trim();
    if (!company) company = parts[1]!.trim();
  } else if (/\s+(?:-|–|—|\|)\s+/.test(rawTitle)) {
    const parts = rawTitle.split(/\s+(?:-|–|—|\|)\s+/);
    title = parts[0]!.trim();
    if (!company && parts[1]) company = parts[1]!.trim();
  } else {
    title = rawTitle;
  }

  return {
    title,
    company,
    description: ogDescMatch?.[1] ? cleanHtml(ogDescMatch[1]) : "",
  };
}

/** Parses raw job text lines */
function parseRawJobText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = "";
  let company = "";
  let location = "";

  // Title keywords
  const titleRegex = /(?:engineer|developer|architect|designer|manager|specialist|analyst|scientist|intern|consultant|lead|director|officer|associate|programmer)/i;

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i]!;
    if (!title && titleRegex.test(line) && line.length < 80) {
      // Check if line says "Role: Frontend Engineer" or "Title: ..."
      title = line.replace(/^(?:Job\s+Title|Title|Role|Position)\s*[:\-–—]\s*/i, "").trim();
    } else if (!company && /^(?:Company|Employer|Organization|At)\s*[:\-–—]\s*(.+)/i.test(line)) {
      const m = line.match(/^(?:Company|Employer|Organization|At)\s*[:\-–—]\s*(.+)/i);
      company = m?.[1]?.trim() || "";
    } else if (!location && /^(?:Location|Place)\s*[:\-–—]\s*(.+)/i.test(line)) {
      const m = line.match(/^(?:Location|Place)\s*[:\-–—]\s*(.+)/i);
      location = m?.[1]?.trim() || "";
    }
  }

  // Fallback for title and company from line 1 & 2
  if (!title && lines[0] && lines[0].length < 70) {
    title = lines[0];
  }
  if (!company && lines[1] && lines[1].length < 50 && !titleRegex.test(lines[1])) {
    company = lines[1].replace(/^[•|\-–—\s]+/, "");
  }

  return { title, company, location };
}

/** Main Extractor Function */
export async function extractJobFromUrlOrText(input: ExtractJobInput): Promise<Job> {
  const rawInput = input.urlOrText.trim();
  const isUrl = /^https?:\/\//i.test(rawInput);

  let title = input.overrideTitle?.trim() || "";
  let company = input.overrideCompany?.trim() || "";
  let location = "Not stated";
  let workMode: WorkMode = "remote";
  let seniority: Seniority = "mid";
  let description = rawInput;
  let sourceUrl = isUrl ? rawInput : "";
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;

  if (isUrl) {
    // 1. Slug heuristic extraction
    const slugInfo = parseUrlSlug(rawInput);
    if (!title && slugInfo.title) title = slugInfo.title;
    if (!company && slugInfo.company) company = slugInfo.company;

    let fetchedHtml = "";

    // 2. Direct fetch with full browser emulation headers
    try {
      const res = await fetch(rawInput, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        fetchedHtml = await res.text();
      }
    } catch {}

    // 3. Fallback to Jina Reader if direct fetch returned blocked/sparse content
    if (!fetchedHtml || fetchedHtml.length < 250 || /<title>(?:Sign In|Access Denied|403|Attention Required)/i.test(fetchedHtml)) {
      try {
        const jinaUrl = `https://r.jina.ai/${encodeURI(rawInput)}`;
        const jinaRes = await fetch(jinaUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (jinaRes.ok) {
          const jinaText = await jinaRes.text();
          if (jinaText.length > 200) {
            // Jina returns "Title: ...\n\nURL Source: ...\n\nMarkdown Content:\n..."
            const titleMatch = jinaText.match(/Title:\s*(.+?)(?:\r?\n|$)/i);
            if (!title && titleMatch?.[1]) {
              title = titleMatch[1]
                .replace(/\s*(?:\||-|–|—)\s*(?:LinkedIn|Indeed|Glassdoor).*$/i, "")
                .trim();
            }
            description = jinaText.slice(0, 12000);
          }
        }
      } catch {}
    }

    // 4. Parse JSON-LD & Meta tags from HTML
    if (fetchedHtml) {
      const jsonLd = parseJsonLd(fetchedHtml);
      if (jsonLd) {
        if (!title && jsonLd.title) title = jsonLd.title;
        if (!company && jsonLd.company) company = jsonLd.company;
        if (jsonLd.location) location = jsonLd.location;
        if (jsonLd.workMode) workMode = jsonLd.workMode;
        if (jsonLd.description && jsonLd.description.length > 50) description = jsonLd.description;
        if (jsonLd.salaryMin) salaryMin = jsonLd.salaryMin;
        if (jsonLd.salaryMax) salaryMax = jsonLd.salaryMax;
      }

      const meta = parseMetaTags(fetchedHtml);
      if (!title && meta.title) title = meta.title;
      if (!company && meta.company) company = meta.company;
      if (description.length < 100 && meta.description) description = meta.description;

      if (description.length < 100) {
        const cleaned = cleanHtml(fetchedHtml);
        if (cleaned.length > 60) description = cleaned.slice(0, 12000);
      }
    }
  } else {
    // Input is raw text
    const textInfo = parseRawJobText(rawInput);
    if (!title && textInfo.title) title = textInfo.title;
    if (!company && textInfo.company) company = textInfo.company;
    if (textInfo.location) location = textInfo.location;
  }

  // Final fallbacks for title and company
  if (!title) {
    // If slug had something
    title = isUrl ? "Software Engineer" : "Engineering Role";
  }
  if (!company) {
    company = "Direct Employer";
  }

  // Work Mode detection
  const fullText = `${title} ${company} ${location} ${description}`.toLowerCase();
  if (fullText.includes("remote") || fullText.includes("anywhere") || fullText.includes("worldwide")) {
    workMode = "remote";
    if (location === "Not stated") location = "Remote";
  } else if (fullText.includes("hybrid")) {
    workMode = "hybrid";
  } else {
    workMode = "onsite";
  }

  // Seniority detection
  if (/intern\b|internship\b|trainee\b|student\b/i.test(title)) {
    seniority = "intern";
  } else if (/junior\b|entry\s*level\b|graduate\b|associate\b/i.test(title)) {
    seniority = "junior";
  } else if (/senior\b|lead\b|staff\b|principal\b|head\b/i.test(title)) {
    seniority = "senior";
  } else {
    seniority = "mid";
  }

  // Skills and Requirements extraction
  const detectedSkills = new Set<string>(skillsIn(fullText));
  for (const s of COMMON_SKILLS) {
    if (fullText.includes(s)) detectedSkills.add(s);
  }

  const requirements: Requirement[] = Array.from(detectedSkills)
    .slice(0, 12)
    .map((skill) => ({
      skill: skillLabel(skill) || titleCase(skill),
      must: false,
    }));

  return {
    id: `pasted-${Date.now()}`,
    title,
    company,
    companyVerified: false,
    location,
    workMode,
    seniority,
    salaryMin,
    salaryMax,
    currency: "USD",
    description: description.slice(0, 12000),
    requirements,
    postedAt: new Date().toISOString(),
    expiresAt: null,
    repostCount: 0,
    filledDaysAgo: null,
    source: isUrl ? "Imported from URL" : "Pasted Job Description",
    sourceUrl,
    takeHome: false,
    coverLetterRequired: false,
  };
}
