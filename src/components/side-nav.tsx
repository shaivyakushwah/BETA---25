
import Link from "@/lib/next-compat";
import { usePathname } from "@/lib/next-compat";
import { Target, Briefcase, KanbanSquare, Inbox, LineChart, UserRound, ShieldCheck, type LucideIcon } from "lucide-react";

const GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon; index: string }[] }[] = [
  {
    label: "Core Workspace",
    items: [
      { href: "/sprint", label: "Weekly Sprint", icon: Target, index: "01" },
      { href: "/jobs", label: "AI Job Matches", icon: Briefcase, index: "02" },
      { href: "/pipeline", label: "Application Tracker", icon: KanbanSquare, index: "03" },
    ],
  },
  {
    label: "AI Intelligence",
    items: [
      { href: "/updates", label: "Status Ingestion", icon: Inbox, index: "04" },
      { href: "/insights", label: "Market & Evidence", icon: LineChart, index: "05" },
    ],
  },
  {
    label: "Control Center",
    items: [
      { href: "/profile", label: "Profile & Resume", icon: UserRound, index: "06" },
      { href: "/privacy", label: "Trust & Storage", icon: ShieldCheck, index: "07" },
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
                <item.icon size={16} strokeWidth={1.75} aria-hidden />
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
