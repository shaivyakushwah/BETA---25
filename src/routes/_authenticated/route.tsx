import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SideNav } from "@/components/side-nav";
import { ProfileCompletionModal } from "@/components/profile-completion-modal";
import { getWorkspace } from "@/lib/insights";
import { listProposals } from "@/lib/db";
import { providerStatus, resendStatus } from "@/lib/status";
import { useSnapshot } from "@/lib/app-runtime";
import Link from "@/lib/next-compat";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AuthedLayout,
});

function SidebarFooter() {
  const snapshot = useSnapshot();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const ws = getWorkspace();
  const user = snapshot.user;
  const pending = listProposals().filter((p) => p.state === "pending").length;
  const provider = providerStatus();
  const resend = resendStatus();
  const displayName = ws.candidate.name || user.name || "Job Seeker";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div style={{ marginTop: "auto" }}>
      {pending > 0 ? (
        <div style={{ background: "var(--color-warn-soft)", border: "1px solid var(--color-warn-border)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          <p className="mono-xs" style={{ color: "var(--color-warn)", margin: 0, fontWeight: 600 }}>
            {pending} update{pending === 1 ? "" : "s"} waiting for confirmation
          </p>
        </div>
      ) : null}
      <div className="card" style={{ padding: "14px", background: "var(--color-paper)", borderRadius: 12, border: "1px solid var(--color-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar-badge">{displayName.charAt(0).toUpperCase() || "U"}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-ink)" }}>
              {displayName}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email || `${ws.candidate.hoursPerWeek}h/wk · ${ws.jobs.length} jobs`}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--color-line)", display: "grid", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono-xs" style={{ color: provider.available ? "var(--color-accent)" : "var(--color-ink-faint)", fontWeight: 600 }} title={provider.note}>
              ● {provider.available ? "Gemini Live" : "Local Engine"}
            </span>
            <span className="mono-xs" style={{ color: resend.available ? "var(--color-accent)" : "var(--color-ink-faint)", fontWeight: 600 }}>
              {resend.available ? "Resend Ready" : "Mail Draft"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <button
              type="button"
              onClick={signOut}
              className="mono-xs"
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-ink-soft)", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign out
            </button>
            <span className="mono-xs" style={{ color: "var(--color-ink-faint)", fontSize: 10 }}>v2.0</span>
          </div>
        </div>
      </div>
      <p className="mono-xs" style={{ color: "var(--color-ink-faint)", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
        Zero auto-spam · 100% human confirmed
      </p>
    </div>
  );
}

function AuthedLayout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" aria-label="Shortlist home" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
              <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path
                  d="M18 64C18 42 36 24 58 24C68 24 76 28 82 34L88 28C79 19 69 16 58 16C31 16 10 37 10 64C10 77 16 88 26 95L32 87C23 82 18 73 18 64Z"
                  fill="#00D084"
                />
                <path d="M82 34L44 72L30 58L22 66L44 88L90 42L82 34Z" fill="#00D084" />
                <path d="M44 72L58 86L94 50L86 42L44 72Z" fill="#059669" />
                <circle cx="68" cy="38" r="4" fill="#003B26" />
              </svg>
              <p className="wordmark" style={{ margin: 0, fontSize: 19 }}>
                Shortlist
              </p>
            </Link>
            <span className="wordmark-badge">AI COPILOT</span>
          </div>
          <p style={{ margin: "8px 0 16px", fontSize: 11.5, color: "var(--color-ink-faint)", lineHeight: 1.4 }}>
            Autonomous Career Agent · For Job Seekers
          </p>
        </div>
        <SideNav />
        <Suspense fallback={null}>
          <SidebarFooter />
        </Suspense>
      </aside>
      <main id="main" className="page">
        <ProfileCompletionModal />
        <Suspense fallback={<p className="mono-xs">Loading your workspace…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
