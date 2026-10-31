import Link from "@/lib/next-compat";
import { usePathname } from "@/lib/next-compat";
import { Target, Briefcase, KanbanSquare, Inbox, UserRound, ShieldCheck, type LucideIcon } from "lucide-react";

const GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "My Account",
    items: [
      { href: "/profile", label: "Profile & Resume", icon: UserRound },
      { href: "/privacy", label: "Settings & Privacy", icon: ShieldCheck },
    ],
  },
  {
    label: "Jobs & Applications",
    items: [
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/sprint", label: "Weekly Sprint", icon: Target },
      { href: "/pipeline", label: "Applications", icon: KanbanSquare },
    ],
  },
  {
    label: "AI Copilot",
    items: [
      { href: "/updates", label: "Reply Drafter", icon: Inbox },
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
          <p className="eyebrow" style={{ margin: "0 0 8px 10px", fontSize: 10, color: "var(--color-ink-faint)" }}>
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
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
