import type { Job, Seniority } from "@/lib/types";
import { skillsIn } from "@/lib/skills";
import { SOURCES, type SourceMeta, type SourceKind } from "@/lib/sources";

export type { SourceMeta, SourceKind };

/**
 * Free, keyless job feeds.
 *
 * The seeded board exists so the demo is deterministic. These adapters are here
 * to prove the pipeline is not a mock: each source is fetched live, normalised
 * into the same shape as every other listing, and handed to the same trust and
 * fit engines. Nothing gets special treatment.
 *
 * Two rules keep the result honest:
 *   1. Every imported listing is marked unverified. We have not confirmed that
 *      the company behind a feed item exists.
 *   2. Salaries are imported only when the feed publishes GBP. We will not
 *      convert dollars at a rate we invented and then compare it to UK pay.
 */

export interface RawJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedAt: string | number | undefined;
  remote?: boolean;
  seniority?: string | string[] | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
}

export interface SourceResult {
  id: string;
  label: string;
  kind: SourceKind;
  ok: boolean;
  error: string | null;
  fetched: number;
  jobs: Job[];
  durationMs: number;
}

const UA = "ShortlistDemo/1.0 (local job-search demo)";


/* ------------------------------------------------------------------ */
/* Shared normalisation                                                */
/* ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    const key = code.toLowerCase();
    if (key.startsWith("#x")) {
      const value = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : " ";
    }
    if (key.startsWith("#")) {
      const value = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : " ";
    }
    return ENTITIES[key] ?? " ";
  });
}

/** Turns a feed's HTML description into the plain text the rest of the app stores. */
export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|div|h[1-6]|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function iso(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return new Date().toISOString();
  if (typeof value === "number") {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function money(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

/**
 * Only GBP survives. A USD figure shown with a £ sign would be a lie, and
 * comparing it to UK pay in the trust engine would be a worse one.
 */
function gbp(
  currency: string | null | undefined,
  min: number | null,
  max: number | null,
): { salaryMin: number | null; salaryMax: number | null; currency: string } {
  const code = (currency ?? "GBP").toUpperCase();
  if (code !== "GBP") return { salaryMin: null, salaryMax: null, currency: "GBP" };
  return { salaryMin: min, salaryMax: max ?? min, currency: "GBP" };
}

function seniorityFromHint(hint: string | string[] | null | undefined): Seniority | null {
  const value = Array.isArray(hint) ? hint.join(" ") : hint;
  if (!value) return null;
  const text = value.toLowerCase();
  if (/intern|student|placement|trainee/.test(text)) return "intern";
  if (/junior|entry|graduate|associate/.test(text)) return "junior";
  if (/senior|lead|principal|staff|director|head|executive|manager|c-level/.test(text)) return "senior";
  if (/mid|intermediate/.test(text)) return "mid";
  return null;
}

function detectSeniority(title: string): Seniority {
  if (/\bintern(ship)?\b|\bplacement\b|\bstudent\b/i.test(title)) return "intern";
  if (/\bjunior\b|\bgraduate\b|\bentry[- ]level\b|\bnew grad\b/i.test(title)) return "junior";
  if (/\b(senior|staff|principal|lead|head of|director|manager)\b/i.test(title)) return "senior";
  if (/\bmid[- ]?level\b|\bintermediate\b/i.test(title)) return "mid";
  // Unknown level: assume mid rather than flattering the candidate with a junior score.
  return "mid";
}

function shortHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/** Tokens must all appear. Keeps "frontend" from importing "Head of Sales". */
function matchesQuery(haystack: string, query: string): boolean {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 1);
  if (tokens.length === 0) return true;
  const text = haystack.toLowerCase();
  return tokens.every((token) => text.includes(token));
}

function toJob(raw: RawJob, source: SourceMeta): Job | null {
  // JSON APIs sometimes ship HTML entities in plain fields ("hims &#038; hers"),
  // so decode names as well as bodies.
  const title = decodeEntities(raw.title ?? "").replace(/\s+/g, " ").trim();
  const company = decodeEntities(raw.company ?? "").replace(/\s+/g, " ").trim();
  const description = stripHtml(raw.description ?? "").slice(0, 4000);
  if (!title || !company || description.length < 120) return null;

  const skills = skillsIn(`${title}. ${description}`).slice(0, 10);
  const salary = gbp(raw.currency, raw.salaryMin ?? null, raw.salaryMax ?? null);

  return {
    id: `${source.id}-${shortHash(raw.url || `${company}|${title}`)}`,
    title,
    company,
    companyDomain: null,
    companyVerified: false,
    location: decodeEntities(raw.location ?? "").replace(/\s+/g, " ").trim() || "Remote",
    workMode: raw.remote === false ? "onsite" : "remote",
    seniority: seniorityFromHint(raw.seniority) ?? detectSeniority(title),
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    currency: salary.currency,
    description,
    requirements: skills.map((skill) => ({ skill, must: false })),
    postedAt: iso(raw.postedAt),
    expiresAt: null,
    repostCount: 0,
    filledDaysAgo: null,
    contactEmail: null,
    source: `${source.label} (live)`,
    sourceUrl: raw.url,
    takeHome: false,
    coverLetterRequired: false,
  };
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`the feed replied ${response.status}`);
  return (await response.json()) as T;
}

async function getText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": UA },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`the feed replied ${response.status}`);
  return await response.text();
}

/* ------------------------------------------------------------------ */
/* API adapters                                                        */
/* ------------------------------------------------------------------ */

interface RemotiveJob {
  url: string;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  description?: string;
  publication_date: string;
  tags?: string[];
}

async function remotive(query: string, limit: number) {
  const search = query.trim();
  const url = `https://remotive.com/api/remote-jobs?limit=${Math.min(50, Math.max(limit * 4, 20))}${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }`;
  const data = await getJson<{ jobs?: RemotiveJob[] }>(url);
  const all = data.jobs ?? [];
  const matched = all.filter((job) =>
    matchesQuery(`${job.title} ${job.description ?? ""} ${(job.tags ?? []).join(" ")}`, query),
  );
  const raw: RawJob[] = matched.slice(0, limit).map((job) => ({
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location?.trim() || "Remote",
    description: job.description ?? "",
    url: job.url,
    postedAt: job.publication_date,
    remote: true,
  }));
  return { raw, fetched: matched.length };
}

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  location?: string;
  created_at?: number;
}

async function arbeitnow(query: string, limit: number) {
  const data = await getJson<{ data?: ArbeitnowJob[] }>("https://www.arbeitnow.com/api/job-board-api");
  const all = data.data ?? [];
  const matched = all.filter((job) =>
    matchesQuery(`${job.title} ${job.description} ${(job.tags ?? []).join(" ")}`, query),
  );
  const raw: RawJob[] = matched.slice(0, limit).map((job) => ({
    title: job.title,
    company: job.company_name,
    location: job.location?.trim() || (job.remote ? "Remote" : "Not stated"),
    description: job.description,
    url: job.url,
    postedAt: job.created_at,
    remote: job.remote,
  }));
  return { raw, fetched: matched.length };
}

interface JobicyJob {
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo?: string;
  jobLevel?: string;
  jobDescription?: string;
  jobExcerpt?: string;
  pubDate?: string;
  annualSalaryMin?: string | number;
  annualSalaryMax?: string | number;
  salaryCurrency?: string;
}

async function jobicy(query: string, limit: number) {
  // Jobicy supports a tag filter, which is far better than pulling 50 random
  // sales roles and hoping "frontend" appears in one of them.
  const tag = query.trim().split(/\s+/)[0] ?? "";
  const params = new URLSearchParams({ count: String(Math.min(50, Math.max(limit * 6, 20))) });
  if (tag) params.set("tag", tag);
  const data = await getJson<{ jobs?: JobicyJob[] }>(
    `https://jobicy.com/api/v2/remote-jobs?${params.toString()}`,
  );
  const all = data.jobs ?? [];
  const matched = all.filter((job) =>
    matchesQuery(`${job.jobTitle} ${job.jobDescription ?? job.jobExcerpt ?? ""}`, query),
  );
  const raw: RawJob[] = matched.slice(0, limit).map((job) => ({
    title: job.jobTitle,
    company: job.companyName,
    location: job.jobGeo?.trim() || "Remote",
    description: job.jobDescription ?? job.jobExcerpt ?? "",
    url: job.url,
    postedAt: job.pubDate,
    remote: true,
    seniority: job.jobLevel,
    salaryMin: money(job.annualSalaryMin),
    salaryMax: money(job.annualSalaryMax),
    currency: job.salaryCurrency,
  }));
  return { raw, fetched: matched.length };
}

interface HimalayasJob {
  title: string;
  companyName: string;
  description?: string;
  excerpt?: string;
  applicationLink?: string;
  guid?: string;
  pubDate?: string;
  seniority?: string[];
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  locationRestrictions?: string[];
}

async function himalayas(query: string, limit: number) {
  // Himalayas ignores limit and search, returning 20 roles per page. Two pages
  // give the query filter a fairer sample without making the import feel slow.
  const pages = await Promise.allSettled([
    getJson<{ jobs?: HimalayasJob[] }>("https://himalayas.app/jobs/api?offset=0"),
    getJson<{ jobs?: HimalayasJob[] }>("https://himalayas.app/jobs/api?offset=20"),
  ]);
  const all = pages.flatMap((page) => (page.status === "fulfilled" ? (page.value.jobs ?? []) : []));
  if (all.length === 0) {
    const failure = pages.find((page) => page.status === "rejected");
    throw failure && failure.status === "rejected" ? failure.reason : new Error("the feed returned nothing");
  }
  const matched = all.filter((job) =>
    matchesQuery(`${job.title} ${job.description ?? job.excerpt ?? ""}`, query),
  );
  const raw: RawJob[] = matched.slice(0, limit).map((job) => ({
    title: job.title,
    company: job.companyName,
    location: job.locationRestrictions?.join(", ") || "Remote",
    description: job.description ?? job.excerpt ?? "",
    url: job.applicationLink ?? job.guid ?? "https://himalayas.app",
    postedAt: job.pubDate,
    remote: true,
    seniority: job.seniority,
    salaryMin: job.minSalary,
    salaryMax: job.maxSalary,
    currency: job.currency,
  }));
  return { raw, fetched: matched.length };
}

interface RemoteOkJob {
  id?: string;
  slug?: string;
  company?: string;
  position?: string;
  description?: string;
  location?: string;
  tags?: string[];
  url?: string;
  apply_url?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
}

async function remoteok(query: string, limit: number) {
  const data = await getJson<unknown>("https://remoteok.com/api");
  const all = (Array.isArray(data) ? data : []).filter(
    (item): item is RemoteOkJob => Boolean(item && typeof item === "object" && "position" in item),
  );
  const matched = all.filter((job) =>
    matchesQuery(`${job.position} ${job.description ?? ""} ${(job.tags ?? []).join(" ")}`, query),
  );
  const raw: RawJob[] = matched.slice(0, limit).map((job) => ({
    title: job.position ?? "",
    company: job.company ?? "",
    location: job.location?.trim() || "Remote",
    description: job.description ?? "",
    url: job.url ?? job.apply_url ?? "https://remoteok.com",
    postedAt: job.date,
    remote: true,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    currency: "USD",
  }));
  return { raw, fetched: matched.length };
}

interface WorkingNomadsJob {
  url: string;
  title: string;
  description?: string;
  company_name?: string;
  category_name?: string;
  tags?: string;
  location?: string;
  pub_date?: string;
}

async function workingnomads(query: string, limit: number) {
  const data = await getJson<WorkingNomadsJob[]>(
    "https://www.workingnomads.com/api/exposed_jobs/",
  );
  const all = Array.isArray(data) ? data : [];
  const matched = all.filter((job) =>
    matchesQuery(`${job.title} ${job.description ?? ""} ${job.tags ?? ""}`, query),
  );
  const raw: RawJob[] = matched.slice(0, limit).map((job) => ({
    title: job.title,
    company: job.company_name?.trim() || "Not stated",
    location: job.location?.trim() || "Remote",
    description: job.description ?? "",
    url: job.url,
    postedAt: job.pub_date,
    remote: true,
  }));
  return { raw, fetched: matched.length };
}

/* ------------------------------------------------------------------ */
/* RSS adapter                                                         */
/* ------------------------------------------------------------------ */

function decodeXml(value: string): string {
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : value).trim());
}

function xmlValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]) : null;
}

function parseRss(xml: string, source: SourceMeta): RawJob[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  const raw: RawJob[] = [];
  for (const item of items) {
    const link = xmlValue(item, "link") ?? xmlValue(item, "guid");
    const title = xmlValue(item, "title");
    const description = xmlValue(item, "description") ?? xmlValue(item, "content:encoded") ?? "";
    if (!link || !title) continue;

    // We Work Remotely titles look like "Company: Role". Split once, so a role
    // with a colon in its own name survives.
    let company = xmlValue(item, "company") ?? xmlValue(item, "dc:creator") ?? "";
    let role = title;
    const separator = title.indexOf(": ");
    if (!company && separator > 0) {
      company = title.slice(0, separator).trim();
      role = title.slice(separator + 2).trim();
    }

    raw.push({
      title: role,
      company: company || "Not stated",
      location: xmlValue(item, "region") ?? "Remote",
      description,
      url: link,
      postedAt: xmlValue(item, "pubDate") ?? undefined,
      remote: true,
    });
  }
  return raw;
}

async function rss(url: string, query: string, limit: number, source: SourceMeta) {
  const xml = await getText(url);
  const all = parseRss(xml, source);
  const matched = all.filter((job) =>
    matchesQuery(`${job.title} ${job.company} ${job.description}`, query),
  );
  return { raw: matched.slice(0, limit), fetched: matched.length };
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

type Adapter = (query: string, limit: number, source: SourceMeta) => Promise<{ raw: RawJob[]; fetched: number }>;

const RSS_URLS: Record<string, string> = {
  "wwr-programming": "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "wwr-design": "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "wwr-support": "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "wwr-devops": "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  "wwr-product": "https://weworkremotely.com/categories/remote-product-jobs.rss",
};

const ADAPTERS: Record<string, Adapter> = {
  remotive,
  arbeitnow,
  jobicy,
  himalayas,
  remoteok,
  workingnomads,
};

function adapterFor(source: SourceMeta): Adapter {
  const direct = ADAPTERS[source.id];
  if (direct) return direct;
  const url = RSS_URLS[source.id];
  if (!url) throw new Error("No adapter registered for this source.");
  return (query, limit, meta) => rss(url, query, limit, meta);
}

/**
 * Fetches every selected source in parallel. A dead feed never hides the rest:
 * its failure comes back in the result list and is shown to the candidate.
 */
export async function fetchFromSources(
  sourceIds: string[],
  query: string,
  limitPerSource = 5,
): Promise<SourceResult[]> {
  const chosen = SOURCES.filter((source) => sourceIds.includes(source.id));
  const limit = Math.min(10, Math.max(1, Math.round(limitPerSource)));

  const settled = await Promise.allSettled(
    chosen.map(async (source) => {
      const started = Date.now();
      const { raw, fetched } = await adapterFor(source)(query, limit, source);
      const jobs = raw
        .map((item) => toJob(item, source))
        .filter((job): job is Job => job !== null);
      return { source, jobs, fetched, durationMs: Date.now() - started };
    }),
  );

  return settled.map((result, index) => {
    const source = chosen[index];
    if (result.status === "fulfilled") {
      return {
        id: source.id,
        label: source.label,
        kind: source.kind,
        ok: true,
        error: null,
        fetched: result.value.fetched,
        jobs: result.value.jobs,
        durationMs: result.value.durationMs,
      };
    }
    const message = result.reason instanceof Error ? result.reason.message : "unknown error";
    return {
      id: source.id,
      label: source.label,
      kind: source.kind,
      ok: false,
      error: message,
      fetched: 0,
      jobs: [],
      durationMs: 0,
    };
  });
}
