import { describe, expect, it } from "vitest";
import { buildWorkspace } from "@/lib/insights";
import type { Snapshot } from "@/lib/snapshot";
import type { Job } from "@/lib/types";

function job(id: string): Job {
  return {
    id,
    title: "Frontend Engineer",
    company: `Company ${id}`,
    location: "Remote",
    workMode: "remote",
    seniority: "junior",
    description: "Build React and TypeScript interfaces with Node.js and SQL. Friendly remote team.",
    requirements: [{ skill: "react", must: true }],
    postedAt: new Date().toISOString(),
    expiresAt: null,
    repostCount: 0,
    source: "test",
    sourceUrl: `https://example.com/${id}`,
  };
}

function snapshot(): Snapshot {
  return {
    user: { id: "u1", email: "a@example.com", name: "A" },
    candidate: {
      id: 1,
      name: "A",
      email: "a@example.com",
      headline: "",
      location: "Remote",
      seniority: "junior",
      yearsExperience: 1,
      targetRoles: ["frontend"],
      workModes: ["remote"],
      minSalary: null,
      hoursPerWeek: 10,
      longShotGoal: null,
    },
    resumeText: "A\nEXPERIENCE\nBuilt React and TypeScript dashboards",
    jobs: [job("sent"), job("open")],
    decisions: [],
    applications: [
      {
        id: 1,
        jobId: "sent",
        status: "applied",
        highlights: [],
        draft: "x",
        coverLetter: "",
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
      },
    ],
    events: [],
    proposals: [],
    status: { aiAvailable: false, aiModel: "", aiNote: "", resendAvailable: false, fromEmail: "" },
  };
}

describe("weekly plan", () => {
  it("never re-suggests a job whose application was already sent", () => {
    const plan = buildWorkspace(snapshot()).plan;
    const suggested = [...plan.applyNow, ...plan.maybe].map((i) => i.job.id);
    expect(suggested).not.toContain("sent");
    expect(plan.alreadySent).toBe(1);
  });
});
