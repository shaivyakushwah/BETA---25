/**
 * Demo candidate. A deliberately *thin* profile: a third-year student with one
 * part-time job and two course projects. This is the profile the product has to
 * be useful for, so it is the one we demo with.
 */
export const DEMO_RESUME = `AISHA RAHMAN
London, UK · aisha.rahman@example.com · github.com/aishar

SUMMARY
Third-year Computer Science student at Queen Mary University of London.
Looking for a junior frontend or data role where I can keep learning.

EDUCATION
Queen Mary University of London — BSc Computer Science, 2024-2027 (expected 2:1)
Relevant modules: Data Structures & Algorithms, Databases, Web Programming, Statistics

EXPERIENCE
Campus Tech Support Assistant — Queen Mary IT Services, Sep 2025 - present
- Troubleshoot Wi-Fi, VPN and account issues for around 40 students a week
- Wrote a Python script that reset 200+ lab accounts in one batch instead of by hand
- Documented the 12 most common fixes in a Notion page the team still uses

Course project: Recipe Finder — Jan 2026 - Mar 2026
- Built a React app with 4 teammates that searches 300 recipes by ingredient
- Wrote the search filter and the ingredient picker in TypeScript
- Set up the GitHub repo and ran our weekly code review

Volunteer Web Assistant — Small Green Planet (charity), Jun 2025 - Aug 2025
- Rebuilt 6 pages of their Wix site and fixed the mobile layout
- Wrote short copy for the donation page with the fundraising lead

SKILLS
JavaScript, TypeScript, React, HTML/CSS, Python (pandas basics), SQL (PostgreSQL), Git
Figma (wireframes), Excel, basic statistics from my degree

PROJECTS
Weather Dashboard — personal project, 2025
- Fetches a public weather API and renders a 5-day forecast in React and Tailwind
- Deployed on Vercel; about 30 classmates used it during exam week

WHAT I WANT
A junior frontend or data role in London, hybrid or remote, at least £32,000.
I learn fastest when I can ship something and get feedback.
`;

export const DEMO_CANDIDATE = {
  name: "Aisha Rahman",
  email: "aisha.rahman@example.com",
  headline: "Third-year CS student · frontend and data",
  location: "London, UK",
  seniority: "junior" as const,
  yearsExperience: 0.8,
  targetRoles: ["frontend", "data"],
  workModes: ["hybrid", "remote"] as const,
  minSalary: 32000,
  hoursPerWeek: 5,
  longShotGoal: "Machine learning engineer at a product company",
};
