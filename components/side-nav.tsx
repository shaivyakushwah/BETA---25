"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { label: string; items: { href: string; label: string; index: string }[] }[] = [
  {
    label: "This week",
    items: [
      { href: "/", label: "Plan", index: "01" },
      { href: "/jobs", label: "Listings", index: "02" },
      { href: "/pipeline", label: "Pipeline", index: "03" },
    ],
  },
  {
    label: "Signals",
    items: [
      { href: "/updates", label: "Updates", index: "04" },
      { href: "/insights", label: "Evidence", index: "05" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile & resume", index: "06" },
      { href: "/privacy", label: "Data & privacy", index: "07" },
    ],
  },
];

export function SideNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav aria-label="Main">
      {GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: 18 }}>
          <p className="eyebrow" style={{ margin: "0 0 6px 9px" }}>
            {group.label}
          </p>
          <div className="nav-group">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-active={isActive(item.href)}
              >
                <span className="nav-index">{item.index}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
