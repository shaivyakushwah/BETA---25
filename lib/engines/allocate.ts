import type { JobInsight } from "@/lib/types";

export interface SkipEntry {
  insight: JobInsight;
  reason: string;
  detail: string;
}

export interface WeeklyPlan {
  budgetMinutes: number;
  minutesUsed: number;
  applyNow: JobInsight[];
  maybe: JobInsight[];
  skip: SkipEntry[];
  /** Applications already sent — excluded from the plan rather than re-suggested. */
  alreadySent: number;
  /** Why the planner chose what it chose, in one line each. */
  rationale: string[];
}

function trustFactor(insight: JobInsight): number {
  if (insight.trust.verdict === "clear") return 1;
  if (insight.trust.verdict === "check") return 0.85;
  return 0.5;
}

function deadlineUrgency(insight: JobInsight, now: Date): number {
  if (!insight.job.expiresAt) return 0;
  const days = (new Date(insight.job.expiresAt).getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return -100;
  if (days <= 3) return 12;
  if (days <= 7) return 8;
  if (days <= 14) return 3;
  return 0;
}

export function isClosed(insight: JobInsight, now: Date): boolean {
  if (insight.job.filledDaysAgo !== null && insight.job.filledDaysAgo !== undefined) return true;
  return Boolean(insight.job.expiresAt && new Date(insight.job.expiresAt) < now);
}

/**
 * Builds the week's plan. The candidate tells us how many hours they have; the
 * planner spends them in fit-per-hour order and, just as importantly, explains
 * every listing it tells them to skip.
 */
export function planWeek(
  insights: JobInsight[],
  hoursPerWeek: number,
  now: Date = new Date(),
  excludeJobIds: Set<string> = new Set(),
): WeeklyPlan {
  const budgetMinutes = Math.round(hoursPerWeek * 60);
  const undecided = insights.filter(
    (i) => i.decision !== "skip" && i.decision !== "apply" && !excludeJobIds.has(i.job.id),
  );

  const scored = undecided
    .map((insight) => {
      const worth = insight.fit.score * trustFactor(insight) + deadlineUrgency(insight, now);
      return { insight, worth };
    })
    .filter((row) => !isClosed(row.insight, now))
    .sort((a, b) => b.worth - a.worth);

  const applyNow: JobInsight[] = [];
  const maybe: JobInsight[] = [];
  let minutesUsed = 0;
  const rationale: string[] = [];

  for (const row of scored) {
    const { insight } = row;
    if (insight.fit.score < 42) continue;
    if (minutesUsed + insight.minutes <= budgetMinutes && applyNow.length < 4) {
      applyNow.push(insight);
      minutesUsed += insight.minutes;
    } else {
      maybe.push(insight);
    }
  }

  // Fallback for thin or transitioning profiles:
  // Requirement 1: "A first-year student, or someone switching fields, should still get useful suggestions, not an empty list."
  if (applyNow.length === 0 && scored.length > 0) {
    const emerging = scored
      .filter((row) => row.insight.trust.verdict !== "doubtful" && (row.insight.job.seniority === "intern" || row.insight.job.seniority === "junior" || row.worth > 0))
      .slice(0, 3);
    for (const row of emerging) {
      if (minutesUsed + row.insight.minutes <= budgetMinutes || applyNow.length === 0) {
        applyNow.push(row.insight);
        minutesUsed += row.insight.minutes;
      }
    }
    const count: number = Number(applyNow.length);
    if (count > 0) {
      rationale.push(
        `Emerging or transitional profile: Showing ${count} high-potential entry role${count > 1 ? "s" : ""} with transferable skill overlap so you never face an empty list.`,
      );
    }
  }

  const applyNowIds = new Set(applyNow.map((a) => a.job.id));

  const skip: SkipEntry[] = [];
  let alreadySent = 0;
  for (const insight of insights) {
    if (insight.decision === "apply") continue;
    if (applyNowIds.has(insight.job.id)) continue;
    // Already sent? It belongs in the pipeline, not in "leave these alone".
    if (excludeJobIds.has(insight.job.id)) {
      alreadySent += 1;
      continue;
    }
    const closed = isClosed(insight, now);
    const untrustworthy = insight.trust.verdict === "doubtful";
    const lowFit = insight.fit.score < 42;
    const overLevel = insight.fit.stretch && insight.fit.score < 60;

    if (closed) {
      skip.push({
        insight,
        reason: insight.job.filledDaysAgo ? "Already filled" : "Closing date has passed",
        detail: "Applying would use time you cannot get back. We keep it visible so you can check the employer's site yourself.",
      });
    } else if (untrustworthy) {
      // Name the reason that actually disqualified it. "Could not verify" is
      // wrong for a listing we did verify — and then caught trying to instruct
      // the software.
      const serious = insight.trust.flags.filter((f) => f.severity === "serious");
      const cautions = insight.trust.flags.filter((f) => f.severity === "caution");
      // Show the most actionable serious reason first, not whichever was pushed
      // into the array first.
      const priority = ["payment-request", "injection", "free-mail-contact", "duplicate"];
      const seriousSorted = [...serious].sort(
        (a, b) => priority.indexOf(a.code) - priority.indexOf(b.code),
      );
      const primary = seriousSorted[0] ?? cautions[0];
      const reasonByCode: Record<string, string> = {
        injection: "Posting tries to instruct software, not people",
        "payment-request": "Asks for money or rushes you",
        "free-mail-contact": "Recruiter writes from a personal email",
        duplicate: "Copy of another employer's advert",
        "unverified-company": "Could not verify this listing",
        "salary-outlier": "Pay is far above the advertised level",
        "salary-low": "Pay is well below the advertised level",
        "thin-description": "Too little detail to check",
      };
      const count = serious.length || cautions.length;
      skip.push({
        insight,
        reason: primary ? (reasonByCode[primary.code] ?? primary.label) : "Could not verify this listing",
        detail: `${count} ${serious.length > 0 ? "serious " : ""}warning ${count === 1 ? "sign" : "signs"}. Read the reasons before deciding — this is your call, not ours.`,
      });
    } else if (lowFit) {
      skip.push({
        insight,
        reason: `Low match (${insight.fit.score}%)`,
        detail: insight.fit.summary,
      });
    } else if (overLevel) {
      skip.push({
        insight,
        reason: "Level gap is too wide for this week",
        detail: "The requirements assume more experience than your profile shows. Better as a stretch goal after one or two adjacent roles.",
      });
    } else if (insight.decision === "skip") {
      skip.push({ insight, reason: "You skipped it", detail: insight.decisionReason ?? "" });
    }
  }

  if (applyNow.length > 0) {
    rationale.push(
      `Fits your ${hoursPerWeek} hour${hoursPerWeek === 1 ? "" : "s"}: ${applyNow.length} application${applyNow.length === 1 ? "" : "s"} at about ${Math.round(minutesUsed / applyNow.length)} minutes each.`,
    );
  }
  if (applyNow.length === 4 && minutesUsed + 20 < budgetMinutes) {
    rationale.push(
      `We stop at four applications on purpose, leaving ${budgetMinutes - minutesUsed} minutes unspent so each draft gets a proper edit rather than a rushed one.`,
    );
  }
  if (skip.length > 0) {
    rationale.push(`${skip.length} listing(s) left alone this week, each with the reason shown.`);
  }
  if (alreadySent > 0) {
    rationale.push(
      `${alreadySent} listing(s) already have an application, so they are counted in your pipeline instead of being suggested again.`,
    );
  }
  const closedCount = insights.filter((i) => isClosed(i, now)).length;
  if (closedCount > 0) rationale.push(`${closedCount} listing(s) are closed but still visible, flagged rather than hidden.`);

  return { budgetMinutes, minutesUsed, applyNow, maybe, skip, alreadySent, rationale };
}
