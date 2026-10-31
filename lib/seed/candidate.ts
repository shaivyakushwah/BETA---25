export const DEMO_RESUME = "";

export const DEMO_CANDIDATE = {
  name: "Job Seeker",
  email: "candidate@example.com",
  headline: "Software Engineer",
  location: "Remote",
  seniority: "entry" as const,
  yearsExperience: 1,
  targetRoles: ["frontend", "backend", "data"],
  workModes: ["remote", "hybrid"] as const,
  minSalary: 0,
  hoursPerWeek: 10,
  longShotGoal: "",
};
