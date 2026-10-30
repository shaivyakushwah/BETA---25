"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { label: string; items: { href: string; label: string; icon: string; index: string }[] }[] = [
  {
    label: "Core Workspace",
    items: [
      { href: "/", label: "Weekly Sprint", icon: "🎯", index: "01" },
      { href: "/jobs", label: "AI Job Matches", icon: "💼", index: "02" },
      { href: "/pipeline", label: "Application Tracker", icon: "📊", index: "03" },
    ],
  },
  {
    label: "AI Intelligence",
    items: [
      { href: "/updates", label: "Status Ingestion", icon: "📬", index: "04" },
      { href: "/insights", label: "Market & Evidence", icon: "📈", index: "05" },
    ],
  },
  {
    label: "Control Center",
    items: [
      { href: "/profile", label: "Profile & Resume", icon: "👤", index: "06" },
      { href: "/privacy", label: "Trust & Storage", icon: "🛡️", index: "07" },
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
        <div key={group.label} style={{ marginBottom: 20 }}>
          <p className="eyebrow" style={{ margin: "0 0 8px 10px", fontSize: 10 }}>
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
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span className="nav-index">{item.index}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
