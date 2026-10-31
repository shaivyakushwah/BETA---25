/**
 * Skill vocabulary used by the fit engine.
 *
 * Deliberately a fixed, inspectable lexicon rather than an embedding model: every
 * match can be pointed back to a word in the candidate's own resume, and every
 * gap can be counted across listings. That is what makes the advice defensible.
 */

export interface SkillDef {
  id: string;
  label: string;
  /** Other surface forms that count as this skill. */
  aliases: string[];
  /** Neighbouring skills a partial match can be credited to, with a note. */
  adjacent?: { skill: string; note: string }[];
  family: string;
}

export const SKILLS: SkillDef[] = [
  {
    id: "javascript",
    label: "JavaScript",
    aliases: ["js", "es6", "ecmascript"],
    adjacent: [{ skill: "typescript", note: "TypeScript is JavaScript with types" }],
    family: "frontend",
  },
  {
    id: "typescript",
    label: "TypeScript",
    aliases: ["ts"],
    adjacent: [{ skill: "javascript", note: "you already write JavaScript" }],
    family: "frontend",
  },
  {
    id: "react",
    label: "React",
    aliases: ["react.js", "reactjs"],
    adjacent: [{ skill: "javascript", note: "React is a JavaScript library you can learn on top of it" }],
    family: "frontend",
  },
  {
    id: "nextjs",
    label: "Next.js",
    aliases: ["nextjs", "next.js"],
    adjacent: [{ skill: "react", note: "Next.js is a React framework" }],
    family: "frontend",
  },
  {
    id: "css",
    label: "HTML/CSS",
    aliases: ["html", "css", "html5", "css3", "sass", "scss"],
    family: "frontend",
  },
  {
    id: "tailwind",
    label: "Tailwind CSS",
    aliases: ["tailwind", "tailwindcss"],
    adjacent: [{ skill: "css", note: "Tailwind is CSS utility classes" }],
    family: "frontend",
  },
  {
    id: "accessibility",
    label: "Accessibility (a11y)",
    aliases: ["accessibility", "a11y", "wcag", "screen reader"],
    family: "frontend",
  },
  {
    id: "designsystems",
    label: "Design systems",
    aliases: ["design system", "design systems", "component library", "storybook"],
    family: "frontend",
  },
  {
    id: "testing",
    label: "Automated testing",
    aliases: ["unit test", "unit tests", "jest", "vitest", "playwright", "cypress", "testing library", "test coverage"],
    adjacent: [{ skill: "javascript", note: "your JavaScript is the base for JS testing tools" }],
    family: "engineering",
  },
  {
    id: "git",
    label: "Git",
    aliases: ["git", "github", "gitlab", "version control"],
    family: "engineering",
  },
  {
    id: "node",
    label: "Node.js",
    aliases: ["node", "node.js", "nodejs", "express"],
    adjacent: [{ skill: "javascript", note: "Node.js runs the JavaScript you already know" }],
    family: "backend",
  },
  {
    id: "python",
    label: "Python",
    aliases: ["python", "python3"],
    family: "data",
  },
  {
    id: "pandas",
    label: "pandas",
    aliases: ["pandas", "dataframe", "dataframes"],
    adjacent: [{ skill: "python", note: "pandas is a Python library" }],
    family: "data",
  },
  {
    id: "sql",
    label: "SQL",
    aliases: ["sql", "postgres", "postgresql", "mysql", "sqlite", "queries"],
    family: "data",
  },
  {
    id: "excel",
    label: "Excel / spreadsheets",
    aliases: ["excel", "spreadsheet", "spreadsheets", "google sheets", "vlookup"],
    family: "data",
  },
  {
    id: "tableau",
    label: "Tableau",
    aliases: ["tableau"],
    adjacent: [{ skill: "excel", note: "you already build reports in spreadsheets" }],
    family: "data",
  },
  {
    id: "powerbi",
    label: "Power BI",
    aliases: ["power bi", "powerbi"],
    adjacent: [{ skill: "excel", note: "you already build reports in spreadsheets" }],
    family: "data",
  },
  {
    id: "statistics",
    label: "Statistics",
    aliases: ["statistics", "statistical", "hypothesis test", "regression", "probability"],
    family: "data",
  },
  {
    id: "abtesting",
    label: "A/B testing",
    aliases: ["a/b", "ab test", "ab testing", "experimentation", "split test"],
    adjacent: [{ skill: "statistics", note: "A/B testing is applied statistics" }],
    family: "data",
  },
  {
    id: "ml",
    label: "Machine learning",
    aliases: ["machine learning", "ml", "deep learning", "neural network", "scikit-learn", "sklearn"],
    adjacent: [{ skill: "python", note: "Python is the language ML tooling runs on" }],
    family: "data",
  },
  {
    id: "pytorch",
    label: "PyTorch",
    aliases: ["pytorch", "tensorflow", "torch"],
    adjacent: [{ skill: "python", note: "PyTorch is a Python library" }],
    family: "data",
  },
  {
    id: "etl",
    label: "ETL / pipelines",
    aliases: ["etl", "elt", "data pipeline", "airflow", "dbt", "data warehouse"],
    adjacent: [{ skill: "sql", note: "pipelines are mostly SQL plus scheduling" }],
    family: "data",
  },
  {
    id: "docker",
    label: "Docker",
    aliases: ["docker", "container", "containers", "containerised"],
    family: "platform",
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    aliases: ["kubernetes", "k8s", "helm"],
    family: "platform",
  },
  {
    id: "aws",
    label: "AWS",
    aliases: ["aws", "amazon web services", "s3", "ec2", "lambda"],
    family: "platform",
  },
  {
    id: "cicd",
    label: "CI/CD",
    aliases: ["ci/cd", "continuous integration", "github actions", "jenkins", "deployment pipeline"],
    family: "platform",
  },
  {
    id: "linux",
    label: "Linux",
    aliases: ["linux", "bash", "shell", "unix"],
    family: "platform",
  },
  {
    id: "cicd2",
    label: "Release engineering",
    aliases: ["release engineering", "build pipeline"],
    family: "platform",
  },
  {
    id: "figma",
    label: "Figma",
    aliases: ["figma", "sketch", "wireframe", "wireframes"],
    family: "design",
  },
  {
    id: "userresearch",
    label: "User research",
    aliases: ["user research", "usability test", "user interview", "discovery"],
    family: "design",
  },
  {
    id: "prototyping",
    label: "Prototyping",
    aliases: ["prototype", "prototyping", "clickable prototype"],
    family: "design",
  },
  {
    id: "communication",
    label: "Communication",
    aliases: ["communication", "stakeholder", "presentation", "presenting", "written"],
    family: "soft",
  },
  {
    id: "support",
    label: "Customer support",
    aliases: ["support", "troubleshooting", "helpdesk", "ticket", "tickets", "customer facing"],
    family: "soft",
  },
  {
    id: "copywriting",
    label: "Copywriting",
    aliases: ["copywriting", "copy", "content writing"],
    family: "marketing",
  },
  {
    id: "seo",
    label: "SEO",
    aliases: ["seo", "search engine optimisation", "search engine optimization"],
    family: "marketing",
  },
  {
    id: "rest",
    label: "REST APIs",
    aliases: ["rest", "rest api", "restful", "api integration", "apis"],
    family: "engineering",
  },
  {
    id: "graphql",
    label: "GraphQL",
    aliases: ["graphql", "apollo"],
    family: "engineering",
  },
  {
    id: "php",
    label: "PHP",
    aliases: ["php", "laravel"],
    family: "backend",
  },
  {
    id: "java",
    label: "Java",
    aliases: ["java", "spring boot"],
    family: "backend",
  },
  {
    id: "go",
    label: "Go",
    aliases: ["golang", "go language"],
    family: "backend",
  },
  {
    id: "cpp",
    label: "C++",
    aliases: ["c++", "cpp"],
    family: "systems",
  },
  {
    id: "csharp",
    label: "C#",
    aliases: ["c#", "csharp", ".net"],
    family: "backend",
  },
];

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

const ALIAS_INDEX: { id: string; pattern: RegExp }[] = SKILLS.flatMap((s) =>
  [s.id, ...s.aliases].map((alias) => ({
    id: s.id,
    pattern: new RegExp(`(^|[^a-z0-9+#])${escapeRegex(alias.toLowerCase())}([^a-z0-9+#]|$)`, "i"),
  })),
);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every skill id mentioned in a piece of text. */
export function skillsIn(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const entry of ALIAS_INDEX) {
    if (entry.pattern.test(lower)) found.add(entry.id);
  }
  return [...found];
}

export function hasSkill(text: string, skillId: string): boolean {
  return skillsIn(text).includes(skillId);
}

export function skillLabel(id: string): string {
  return SKILL_BY_ID.get(id)?.label ?? id;
}

/** Every surface form of a skill, for scanning free text the candidate wrote. */
export function skillAliases(id: string): string[] {
  const def = SKILL_BY_ID.get(id);
  if (!def) return [id];
  return [...new Set([def.label, ...def.aliases])];
}

/**
 * Skills the candidate could defensibly claim as "adjacent" — used when a profile
 * is thin so that a first-year student sees near-miss roles instead of an empty list.
 */
export function adjacencyNote(candidateSkills: Set<string>, wanted: string): string | null {
  const def = SKILL_BY_ID.get(wanted);
  if (!def) return null;
  for (const adj of def.adjacent ?? []) {
    if (candidateSkills.has(adj.skill)) return adj.note;
  }
  return null;
}
