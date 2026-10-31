import { describe, expect, it } from "vitest";
import { isProfileReady, normalizeRankings, profileKey } from "@/lib/profile-ready";
import type { Candidate } from "@/lib/types";

const candidate: Candidate = { id: 1, name: "Alex", email: "alex@example.com", headline: "Python student", location: "India", seniority: "intern", yearsExperience: 0, targetRoles: ["python"], workModes: ["remote"], minSalary: null, hoursPerWeek: 3, longShotGoal: null };
describe("profile-first matching", () => {
  it("keeps a newly created account in profile setup before job fetching", () => {
    expect(isProfileReady({ ...candidate, location: "", headline: "", targetRoles: [] }, "")).toBe(false);
  });
  it("allows a student profile without a resume to start matching", () => {
    expect(isProfileReady(candidate, "")).toBe(true);
  });
  it("requires a location and target role before matching", () => {
    expect(isProfileReady({ ...candidate, location: "" }, "resume")).toBe(false);
    expect(isProfileReady({ ...candidate, targetRoles: [] }, "resume")).toBe(false);
  });
  it("invalidates prior rankings when the profile changes", () => {
    expect(profileKey(candidate, "")).not.toBe(profileKey({ ...candidate, targetRoles: ["design"] }, ""));
  });
  it("only accepts Gemini rankings for fetched job IDs", () => {
    expect(normalizeRankings([{ jobId: "real", score: 84, reason: "Python match" }, { jobId: "fake", score: 100, reason: "Invented" }], [{ id: "real" }])).toEqual([{ jobId: "real", score: 84, reason: "Python match" }]);
  });
});