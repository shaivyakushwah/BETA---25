/**
 * Metadata for the free job feeds. Kept separate from the adapters so the
 * client-side import form can list the sources without bundling server code.
 */

export type SourceKind = "api" | "rss";

export interface SourceMeta {
  id: string;
  label: string;
  kind: SourceKind;
  homepage: string;
  note: string;
}

export const SOURCES: SourceMeta[] = [
  {
    id: "remotive",
    label: "Remotive",
    kind: "api",
    homepage: "https://remotive.com",
    note: "Public JSON API. Remote roles across engineering, data and design.",
  },
  {
    id: "arbeitnow",
    label: "Arbeitnow",
    kind: "api",
    homepage: "https://www.arbeitnow.com",
    note: "Public job-board API, Europe-heavy. Remote and on-site roles.",
  },
  {
    id: "jobicy",
    label: "Jobicy",
    kind: "api",
    homepage: "https://jobicy.com",
    note: "Public JSON API of remote roles; sometimes publishes a salary band.",
  },
  {
    id: "himalayas",
    label: "Himalayas",
    kind: "api",
    homepage: "https://himalayas.app",
    note: "Public JSON API of remote roles with level and location limits.",
  },
  {
    id: "remoteok",
    label: "Remote OK",
    kind: "api",
    homepage: "https://remoteok.com",
    note: "Public JSON API. We link back to the original post, as their terms ask.",
  },
  {
    id: "workingnomads",
    label: "Working Nomads",
    kind: "api",
    homepage: "https://www.workingnomads.com",
    note: "Public JSON API of curated remote roles.",
  },
  {
    id: "wwr-programming",
    label: "We Work Remotely — Programming",
    kind: "rss",
    homepage: "https://weworkremotely.com/categories/remote-programming-jobs",
    note: "RSS feed for programming roles.",
  },
  {
    id: "wwr-design",
    label: "We Work Remotely — Design",
    kind: "rss",
    homepage: "https://weworkremotely.com/categories/remote-design-jobs",
    note: "RSS feed for design roles.",
  },
  {
    id: "wwr-support",
    label: "We Work Remotely — Customer Support",
    kind: "rss",
    homepage: "https://weworkremotely.com/categories/remote-customer-support-jobs",
    note: "RSS feed for customer-support roles.",
  },
  {
    id: "wwr-devops",
    label: "We Work Remotely — DevOps & Sysadmin",
    kind: "rss",
    homepage: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs",
    note: "RSS feed for infrastructure roles.",
  },
  {
    id: "wwr-product",
    label: "We Work Remotely — Product",
    kind: "rss",
    homepage: "https://weworkremotely.com/categories/remote-product-jobs",
    note: "RSS feed for product roles.",
  },
];
