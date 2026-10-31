export interface OutcomeSample {
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
}

export interface HonestyReport {
  sample: OutcomeSample;
  rate: number;
  interval: [number, number] | null;
  reliability: "none" | "anecdote" | "directional" | "moderate" | "reasonable";
  headline: string;
  body: string;
  caveats: string[];
  /** Specific claims the data cannot support yet. */
  cannotConclude: string[];
}

/**
 * Wilson score interval: the honest range for a proportion observed on a small
 * sample. A 1-in-8 response rate is not "12.5%" — it is somewhere around 2-45%,
 * and the UI says so.
 */
export function wilson(successes: number, total: number, z = 1.96): [number, number] | null {
  if (total === 0) return null;
  const p = successes / total;
  const denom = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return [Math.max(0, (centre - spread) / denom), Math.min(1, (centre + spread) / denom)];
}

export function describeOutcomes(sample: OutcomeSample): HonestyReport {
  const { applications, responses, interviews, offers } = sample;
  const rate = applications ? responses / applications : 0;
  const interval = wilson(responses, applications);

  const reliability: HonestyReport["reliability"] =
    applications === 0
      ? "none"
      : applications < 5
        ? "anecdote"
        : applications < 15
          ? "directional"
          : applications < 30
            ? "moderate"
            : "reasonable";

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const range = interval ? `${pct(interval[0])}–${pct(interval[1])}` : "unknown";

  const caveats = [
    "Your applications are not a random sample: you chose the roles, and you chose the ones you thought you could win. So this rate describes your choices, not your worth.",
    "Silence is not a rejection. Many employers never reply, so non-response mixes 'no' with 'never read'.",
    "Timing matters. A month is too short for some employers and long enough for others, so the sample is unevenly aged.",
  ];

  if (reliability === "none") {
    return {
      sample,
      rate: 0,
      interval: null,
      reliability,
      headline: "No results recorded yet",
      body: "There is nothing to learn from zero applications. Record one outcome — even 'no reply after three weeks' — and this page starts working.",
      caveats,
      cannotConclude: [
        "Whether your resume is working",
        "Whether your target roles are realistic",
        "Whether your cover letters help",
      ],
    };
  }

  if (reliability === "anecdote" || reliability === "directional") {
    return {
      sample,
      rate,
      interval,
      reliability,
      headline: `${applications} application${applications === 1 ? "" : "s"}, ${responses} repl${responses === 1 ? "y" : "ies"}`,
      body: `Your observed reply rate is ${pct(rate)}. With a sample this small, the true rate is plausibly anywhere from ${range}. That range is too wide to justify rewriting your resume or abandoning a role type. Keep the experiment running.`,
      caveats,
      cannotConclude: [
        "Whether one version of your resume performs better than another",
        "Whether a specific role family is out of reach",
        "Whether your reply rate is above or below the market",
      ],
    };
  }

  return {
    sample,
    rate,
    interval,
    reliability,
    headline: `${applications} applications, ${responses} replies, ${interviews} interview${interviews === 1 ? "" : "s"}`,
    body: `Your observed reply rate is ${pct(rate)}, with a 95% range of ${range}. ${
      reliability === "moderate"
        ? "Patterns are starting to mean something, but a single month can still move this a long way."
        : "This is a reasonable sample to act on, provided you keep tracking the same way."
    }`,
    caveats,
    cannotConclude: [
      ...(interviews < 3 ? ["Whether your interview technique is the bottleneck — that needs interview data, not application data"] : []),
      ...(offers === 0 ? ["Whether salary expectations are filtering you out"] : []),
      "What would have happened if you had applied to the listings you skipped",
    ],
  };
}
