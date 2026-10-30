import type { Job, TrustFlag, TrustReport, Verdict } from "@/lib/types";
import { daysBetween, hiddenCharacters, instructionShapedLines, isFreeMail, paymentSignals, similarity } from "@/lib/text";

const SEVERITY_COST = { info: 4, caution: 14, serious: 32 } as const;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Scores how much a listing can be trusted. Deliberately additive and inspectable:
 * every point lost has a flag that names what we saw and how to settle it.
 *
 * Nothing here hides a listing. A doubtful job still appears, with the reason and
 * with the candidate's override stored alongside it.
 */
export function assessTrust(job: Job, all: Job[], now: Date = new Date()): TrustReport {
  const flags: TrustFlag[] = [];
  const checked: string[] = [];
  const posted = new Date(job.postedAt);
  const ageDays = daysBetween(posted, now);

  // 1. Duplicate / re-listed copy
  let duplicateOf: string | null = null;
  let duplicateSimilarity: number | null = null;
  for (const other of all) {
    if (other.id === job.id) continue;
    const sim = similarity(job.description, other.description);
    if (sim >= 0.7 && (duplicateSimilarity === null || sim > duplicateSimilarity)) {
      duplicateSimilarity = sim;
      duplicateOf = other.id;
    }
  }
  if (duplicateOf) {
    const other = all.find((j) => j.id === duplicateOf)!;
    const sameCompany = other.company === job.company;
    // Which side of the duplicate pair are we looking at? The employer's own
    // listing is not the problem; the copy is. Saying "doubtful" about the
    // original would be wrong, so the severity and wording follow the evidence.
    const employerOwn = Boolean(job.companyVerified) && !other.companyVerified;
    const middlemanCopy = !job.companyVerified && Boolean(other.companyVerified);
    const pctMatch = Math.round((duplicateSimilarity ?? 0) * 100);

    flags.push(
      employerOwn
        ? {
            code: "duplicate",
            label: "This is the employer's own listing",
            severity: "info",
            observed: `${pctMatch}% of this text also appears in a posting by ${other.company}, which is not the employer.`,
            why: "The copy is the one to be careful with, not this listing. Your application here goes straight to the employer.",
            resolve: `Apply to this listing, and treat the ${other.company} version as a duplicate.`,
          }
        : {
            code: "duplicate",
            label: sameCompany
              ? "Looks like a repost of a role already listed"
              : "Two listings, almost the same text",
            severity: sameCompany ? "caution" : "serious",
            observed: middlemanCopy
              ? `${pctMatch}% of the wording matches “${other.title}” at ${other.company}, which is the employer's own listing.`
              : `${pctMatch}% of the wording matches “${other.title}” at ${other.company}.`,
            why: sameCompany
              ? "It may be a refresh rather than a second job. Applying twice adds nothing."
              : middlemanCopy
                ? "This looks like a recruiter or agency reposting the employer's advert. It is not automatically a scam, but your application may go through a middleman."
                : "Recruiters and agencies copy the same posting. One of these is probably a middleman, which changes who sees your application.",
            resolve: sameCompany
              ? "Apply once, to the version with the more complete company details."
              : "Open both and compare the employer named in the body, then apply to the employer's own listing.",
          },
    );
  } else {
    checked.push("No near-identical posting found");
  }

  // 2. Filled
  if (job.filledDaysAgo !== null && job.filledDaysAgo !== undefined) {
    flags.push({
      code: "filled",
      label: "Company says this role is filled",
      severity: "serious",
      observed: `Marked as filled ${job.filledDaysAgo} day(s) ago, but the listing is still being served.`,
      why: "Applying here is very unlikely to reach a person.",
      resolve: "Skip it, or check the employer's careers page for a different opening.",
    });
  }

  // 3. Expired
  if (job.expiresAt && new Date(job.expiresAt) < now) {
    const daysPast = daysBetween(new Date(job.expiresAt), now);
    flags.push({
      code: "expired",
      label: "Closing date has passed",
      severity: "serious",
      observed: `The stated closing date was ${daysPast} day(s) ago.`,
      why: "Most application forms close automatically at the deadline, so any work you do is likely wasted.",
      resolve: "Check the original portal — if the form still accepts applications, the date may just be stale.",
    });
  }

  // 4. Stale / repeatedly reposted
  if ((job.repostCount ?? 0) >= 3 || ageDays >= 45) {
    flags.push({
      code: "stale",
      label: "Old or repeatedly reposted",
      severity: "caution",
      observed:
        (job.repostCount ?? 0) >= 3
          ? `Reposted ${job.repostCount} times; first seen ${ageDays} days ago.`
          : `First posted ${ageDays} days ago and never closed.`,
      why: "Either the role is hard to fill or the listing is being kept alive automatically. Both mean slower replies.",
      resolve: "Look for a posting date on the employer's own site; if it is also old, treat it as low priority.",
    });
  } else {
    checked.push(`Posted ${ageDays} day(s) ago`);
  }

  // 5. Salary outlier for the advertised level
  const peers = all
    .filter((j) => j.id !== job.id && j.seniority === job.seniority && j.salaryMin)
    .map((j) => j.salaryMin!);
  const peerMedian = median(peers);
  if (job.salaryMin && peerMedian > 0) {
    const ratio = job.salaryMin / peerMedian;
    if (ratio >= 2.2) {
      flags.push({
        code: "salary-outlier",
        label: "Pay is far above the advertised level",
        severity: "caution",
        observed: `£${job.salaryMin.toLocaleString()} at ${job.seniority} level, against a median of £${Math.round(peerMedian).toLocaleString()} for similar listings.`,
        why: "Sometimes this is a real premium for a hard-to-fill role. Sometimes the number is a range ceiling or a commission estimate.",
        resolve: "Ask for the salary band in writing before investing time in a long application.",
      });
    } else if (ratio <= 0.6) {
      flags.push({
        code: "salary-low",
        label: "Pay is well below the advertised level",
        severity: "caution",
        observed: `£${job.salaryMin.toLocaleString()} against a median of £${Math.round(peerMedian).toLocaleString()} for ${job.seniority} roles.`,
        why: "Worth knowing before you spend an evening on it.",
        resolve: "Decide whether the experience is worth the gap, or negotiate before applying.",
      });
    } else {
      checked.push("Salary is in line with similar listings");
    }
  }

  // 6. Company identity
  if (job.companyVerified) {
    checked.push(`Company domain recorded (${job.companyDomain})`);
  } else {
    flags.push({
      code: "unverified-company",
      label: "No verifiable company website",
      severity: "caution",
      observed: "This listing was not matched to a company domain or registry entry.",
      why: "It can be a genuine small employer, but you cannot confirm who is on the other side.",
      resolve: "Search the company name plus 'Companies House' and look for a real address before sharing personal details.",
    });
  }

  if (job.contactEmail && isFreeMail(job.contactEmail)) {
    flags.push({
      code: "free-mail-contact",
      label: "Recruiter uses a personal email address",
      severity: "serious",
      observed: `Contact address is ${job.contactEmail}, not a company domain.`,
      why: "Legitimate employers almost always write from their own domain. Personal addresses are common in advance-fee scams.",
      resolve: "Do not send ID or bank details. Ask for a company email and a named hiring manager.",
    });
  }

  // 7. Payment / urgency language
  const payments = paymentSignals(`${job.title}\n${job.description}`);
  if (payments.length > 0) {
    flags.push({
      code: "payment-request",
      label: "Asks for money, or rushes you",
      severity: "serious",
      observed: `Phrases found: ${payments.map((p) => `“${p}”`).join(", ")}.`,
      why: "No legitimate employer charges a candidate to start work. Upfront fees, equipment deposits and WhatsApp-only hiring are the standard pattern of job scams.",
      resolve: "Do not pay anything. Report the listing to the portal. If you already paid, contact your bank.",
    });
  }

  // 8. Hidden / instruction-shaped text
  const hidden = hiddenCharacters(job.description);
  const instructions = instructionShapedLines(job.description);
  if (hidden.length > 0 || instructions.length > 0) {
    flags.push({
      code: "injection",
      label: "Posting contains text aimed at software, not at you",
      severity: "serious",
      observed: [
        hidden.length ? `Hidden characters: ${hidden.join(", ")}.` : null,
        instructions.length ? `Instruction-shaped line: “${instructions[0]}”.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      why: "Someone is trying to make automated screening tools rank this job higher or hide its problems. Your score below is calculated from your resume only — this text was ignored.",
      resolve: "Treat the rest of the posting with suspicion and apply through the employer's site if the role is real.",
    });
  } else {
    checked.push("No hidden characters or instruction-shaped text");
  }

  // 9. Too little to check
  if (job.description.length < 420 && job.requirements.length < 2) {
    flags.push({
      code: "thin-description",
      label: "Very little detail to check",
      severity: "caution",
      observed: `The posting is ${job.description.length} characters long and lists ${job.requirements.length} concrete requirement(s).`,
      why: "We cannot tell whether the role matches what you want, and the employer has not told you what the job is.",
      resolve: "Ask for a full job description before applying.",
    });
  } else {
    checked.push("Description is specific about the work");
  }

  // 10. Location vs mode
  if (job.workMode === "onsite" && !job.location.toLowerCase().includes("london")) {
    flags.push({
      code: "location",
      label: "On-site outside your city",
      severity: "info",
      observed: `On-site in ${job.location}.`,
      why: "Not a trust problem, but it changes the real cost of the job.",
      resolve: "Decide whether you would relocate before applying.",
    });
  }

  const score = Math.max(
    0,
    Math.min(100, 100 - flags.reduce((total, flag) => total + SEVERITY_COST[flag.severity], 0)),
  );
  // A score alone would call a single caution "clear" (100 - 14 = 86), which
  // contradicts the flag sitting right next to it. The verdict follows the worst
  // thing we actually found: any serious or caution flag means "check" at best.
  const serious = flags.filter((flag) => flag.severity === "serious").length;
  const caution = flags.filter((flag) => flag.severity === "caution").length;
  const verdict: Verdict =
    serious >= 1 || score < 55 ? "doubtful" : caution >= 1 || score < 82 ? "check" : "clear";

  return { score, verdict, flags, duplicateOf, duplicateSimilarity, checked };
}

export const VERDICT_COPY: Record<Verdict, { label: string; short: string }> = {
  clear: { label: "Looks legitimate", short: "Clear" },
  check: { label: "Worth checking first", short: "Check" },
  doubtful: { label: "Serious warning signs", short: "Doubtful" },
};
