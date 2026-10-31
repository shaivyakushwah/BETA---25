import { listApplications, listEvents } from "@/lib/db";
import type { OutcomeSample } from "@/lib/engines/honesty";
import type { Application } from "@/lib/types";

const RESPONSE_STATUSES: Application["status"][] = ["screening", "interview", "offer", "rejected"];

export interface ResultsView {
  sample: OutcomeSample;
  byStatus: Record<string, number>;
  /** Response rate per role family, but only where the sample allows it. */
  byFamily: { family: string; applications: number; responses: number }[];
  sentThisMonth: number;
  medianDaysToReply: number | null;
}

export function getResults(): ResultsView {
  // Only applications the candidate has actually sent belong in the outcomes
  // sample. A draft or a "ready" application is not a data point.
  const applications = listApplications().filter((a) => a.submittedAt);
  const events = listEvents();

  const responses = applications.filter((a) => RESPONSE_STATUSES.includes(a.status));
  const interviews = applications.filter((a) => a.status === "interview" || a.status === "offer");
  const offers = applications.filter((a) => a.status === "offer");

  const byStatus: Record<string, number> = {};
  for (const application of applications) {
    byStatus[application.status] = (byStatus[application.status] ?? 0) + 1;
  }

  const replyDelays: number[] = [];
  for (const application of applications) {
    const sent = application.submittedAt;
    if (!sent) continue;
    const replies = events
      .filter((e) => e.applicationId === application.id && RESPONSE_STATUSES.includes(e.kind as Application["status"]))
      .map((e) => new Date(e.at).getTime())
      .sort((a, b) => a - b);
    if (replies.length) {
      replyDelays.push((replies[0] - new Date(sent).getTime()) / 86_400_000);
    }
  }

  const now = Date.now();
  const sentThisMonth = applications.filter(
    (a) => a.submittedAt && now - new Date(a.submittedAt).getTime() < 30 * 86_400_000,
  ).length;

  return {
    sample: {
      applications: applications.length,
      responses: responses.length,
      interviews: interviews.length,
      offers: offers.length,
    },
    byStatus,
    byFamily: [],
    sentThisMonth,
    medianDaysToReply: replyDelays.length
      ? Math.round(replyDelays.sort((a, b) => a - b)[Math.floor(replyDelays.length / 2)])
      : null,
  };
}
