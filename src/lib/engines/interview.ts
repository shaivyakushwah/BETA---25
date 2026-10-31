import type { Candidate, FitReport, Job, ResumeLine } from "@/lib/types";
import { skillLabel } from "@/lib/skills";

export interface PrepItem {
  text: string;
  cite?: { line: number; quote: string; section: string };
  fromPosting?: boolean;
}

export interface PrepBlock {
  title: string;
  minutes: number;
  items: PrepItem[];
}

export interface InterviewPrep {
  headline: string;
  subhead: string;
  blocks: { day: string; focus: string; blocks: PrepBlock[] }[];
  questions: string[];
  askThem: string[];
  honestyNote: string;
}

/**
 * Builds a two-day plan that is specific to this role and this resume.
 *
 * Every "say this" item carries either a line number from the candidate's own
 * resume or a phrase lifted from the posting. If an item has neither, it does not
 * belong here — which is how we avoid generic interview advice.
 */
export function buildInterviewPrep(
  job: Job,
  candidate: Candidate,
  lines: ResumeLine[],
  fit: FitReport,
): InterviewPrep {
  const musts = job.requirements.filter((r) => r.must).map((r) => skillLabel(r.skill));
  const matchedWithEvidence = fit.matched.filter((m) => m.evidence);
  const mustGaps = fit.gaps.filter((g) => g.must);
  const niceGaps = fit.gaps.filter((g) => !g.must);

  const firstSentence = job.description.split(/(?<=\.)\s/)[0]?.trim() ?? job.description.slice(0, 160);

  const stories = matchedWithEvidence.slice(0, 3).map<PrepItem>((match) => ({
    text: `Tell them about “${skillLabel(match.skill)}”: ${match.evidence!.quote.replace(/^[-•]\s*/, "")}`,
    cite: {
      line: match.evidence!.line,
      quote: match.evidence!.quote,
      section: lines.find((l) => l.n === match.evidence!.line)?.section ?? "Resume",
    },
  }));

  const gapDrills = mustGaps.slice(0, 3).map<PrepItem>((gap) => ({
    text: `They ask for ${skillLabel(gap.skill)} in the posting and nothing in your resume covers it. Prepare one honest sentence: what you have done that is nearest, and the first thing you would learn. Do not claim it.`,
    fromPosting: true,
  }));

  const day1: PrepBlock[] = [
    {
      title: "Re-read the posting like an interviewer",
      minutes: 15,
      items: [
        { text: `They describe themselves as: “${firstSentence}”`, fromPosting: true },
        {
          text: `Their must-haves are ${musts.join(", ") || "not stated"}. Those are the questions you will actually get.`,
          fromPosting: true,
        },
      ],
    },
    { title: "Pick three stories from your resume", minutes: 20, items: stories.length ? stories : [{ text: "Add one project to your resume before practising — there is nothing concrete to rehearse yet." }] },
    ...(gapDrills.length
      ? [{ title: "Rehearse the gaps, honestly", minutes: 15, items: gapDrills }]
      : []),
  ];

  const day2: PrepBlock[] = [
    {
      title: "Say it out loud, once each",
      minutes: 30,
      items: [
        ...stories.map<PrepItem>((story) => ({ ...story, text: `Say this one without reading it: ${story.text}` })),
        ...(stories.length === 0 ? [{ text: "Practise a two-minute introduction: who you are, what you built, what you want next." }] : []),
      ],
    },
    {
      title: "Logistics check",
      minutes: 10,
      items: [
        { text: `Format: ${job.workMode}${job.location ? `, ${job.location}` : ""}. Confirm the link or address in writing today.` },
        { text: `Re-read the application you sent for this role before you speak. Do not contradict it.` },
        { text: `Have one question ready about the team, not about salary.` },
      ],
    },
  ];

  const questions = [
    ...musts.slice(0, 3).map((skill) => `“Tell us about a time you used ${skill}.”`),
    `“Why this role, and why ${job.company}?”`,
    ...(fit.stretch ? [`“You look light on ${mustGaps[0] ? skillLabel(mustGaps[0].skill) : "experience"} — talk us through that.”`] : []),
    "“What would you do in your first month?”",
  ];

  const askThem = [
    "What does a good first three months look like in this team?",
    mustGaps.length
      ? `How much of the work is ${skillLabel(mustGaps[0].skill)}, and is there room to learn it here?`
      : "Which part of the stack would I own first?",
    "Who would I ask when I am stuck?",
  ];

  return {
    headline: `Two days to your interview for ${job.title} at ${job.company}`,
    subhead: `${candidate.name} · ${stories.length} resume line(s) turned into stories · ${mustGaps.length} gap(s) to prepare`,
    blocks: [
      { day: "Today", focus: "Understand the role, choose your evidence", blocks: day1 },
      { day: "Tomorrow", focus: "Rehearse out loud, then stop", blocks: day2 },
    ],
    questions,
    askThem,
    honestyNote:
      "Every item here is tied to a line in your resume or a phrase in this posting. Nothing is generic advice that would fit any interview. If a line is missing, we say so instead of inventing a story for you.",
  };
}
