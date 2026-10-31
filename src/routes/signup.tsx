import { createFileRoute } from "@tanstack/react-router";

import Link from "@/lib/next-compat";
import { useActionState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { go } from "@/lib/app-runtime";

type AuthState = { error?: string; message?: string } | null;

async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your name" };
  if (!email.includes("@")) return { error: "Please enter a valid email address" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: window.location.origin + "/login" },
  });
  if (error) return { error: error.message };
  if (data.session) {
    go("/sprint");
    return null;
  }
  return { message: "Check your inbox to confirm your email, then sign in." };
}

function Page() {
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) go("/sprint");
    });
  }, []);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUpAction, null);

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-200">
      <div className="w-full max-w-[420px] bg-surface rounded-2xl border border-line shadow-xl p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <svg
              width="36"
              height="36"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transition-transform duration-200 group-hover:scale-105"
            >
              <path
                d="M18 64C18 42 36 24 58 24C68 24 76 28 82 34L88 28C79 19 69 16 58 16C31 16 10 37 10 64C10 77 16 88 26 95L32 87C23 82 18 73 18 64Z"
                fill="#00D084"
              />
              <path d="M82 34L44 72L30 58L22 66L44 88L90 42L82 34Z" fill="#00D084" />
              <path d="M44 72L58 86L94 50L86 42L44 72Z" fill="#059669" />
              <circle cx="68" cy="38" r="4" fill="#003B26" />
            </svg>
            <span className="text-2xl font-black text-ink tracking-tight">Shortlist</span>
            <span className="text-[10px] font-bold uppercase bg-accent-soft text-accent border border-accent-border px-1.5 py-0.5 rounded-full">
              AI
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Create your account</h1>
          <p className="text-xs text-ink-faint mt-1">
            Join 3,000,000+ job seekers using AI to apply with precision
          </p>
        </div>

        {/* Error notification */}
        {state?.error ? (
          <div className="mb-5 p-3 rounded-xl bg-danger-soft border border-danger-border text-danger text-xs font-semibold">
            {state.error}
          </div>
        ) : null}
        {state?.message ? (
          <div className="mb-5 p-3 rounded-xl bg-accent-soft border border-accent-border text-accent text-xs font-semibold">
            {state.message}
          </div>
        ) : null}

        {/* Sign Up Form */}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Alex Chen"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="alex@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full mt-2 py-3 px-4 rounded-full bg-ink hover:bg-slate-800 text-surface font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create Free Account"}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
              if (result.error) { alert(result.error.message ?? "Google sign-in failed"); return; }
              if (!result.redirected) go("/sprint");
            }}
            className="w-full py-3 px-4 rounded-full border border-line bg-surface hover:bg-slate-50 text-ink font-bold text-sm transition-all"
          >
            Continue with Google
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-line text-center text-xs text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-accent hover:underline">
            Sign in here →
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-[11px] text-ink-soft">
        Zero spam · Local SQLite storage · Human confirmation gate
      </div>
    </div>
  );
}

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Shortlist" },
      { name: "description", content: "Create your account to Shortlist, the job search that fits your week." },
      { property: "og:title", content: "Create your account — Shortlist" },
      { property: "og:description", content: "Create your account to Shortlist, the job search that fits your week." },
    ],
  }),
  component: Page,
});
