"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/app/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <div className="min-h-screen bg-[#ebf9e8] flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-200">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
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
            <span className="text-2xl font-black text-slate-950 tracking-tight">Shortlist</span>
            <span className="text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-800 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
              AI
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Welcome back</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your autonomous job search workspace
          </p>
        </div>

        {/* Error notification */}
        {state?.error ? (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            ⚠️ {state.error}
          </div>
        ) : null}

        {/* Sign In Form */}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full mt-2 py-3 px-4 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign In to Workspace"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-emerald-700 hover:underline">
            Create one for free →
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-[11px] text-slate-600">
        🛡️ 100% Local-first database · Zero auto-spam · Encrypted session
      </div>
    </div>
  );
}
