import { createFileRoute } from "@tanstack/react-router";
import Link from "@/lib/next-compat";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, ShieldCheck, Target, FileCheck2, Clock, CheckCircle2, Sparkles } from "lucide-react";

function ShortlistLogo() {
  return (
    <Link href="/" aria-label="Shortlist home" className="flex items-center gap-2.5 no-underline group">
      <svg width="32" height="32" viewBox="0 0 100 100" fill="none" aria-hidden className="transition-transform duration-200 group-hover:scale-105">
        <path d="M18 64C18 42 36 24 58 24C68 24 76 28 82 34L88 28C79 19 69 16 58 16C31 16 10 37 10 64C10 77 16 88 26 95L32 87C23 82 18 73 18 64Z" fill="var(--color-accent)" />
        <path d="M82 34L44 72L30 58L22 66L44 88L90 42L82 34Z" fill="var(--color-accent)" />
        <path d="M44 72L58 86L94 50L86 42L44 72Z" fill="var(--color-ink)" opacity="0.85" />
      </svg>
      <span className="text-[22px] font-extrabold tracking-tight text-ink">Shortlist</span>
    </Link>
  );
}

const NAV = [
  { href: "/sprint", label: "Weekly plan" },
  { href: "/jobs", label: "Listings" },
  { href: "/profile", label: "Resume" },
  { href: "/pipeline", label: "Tracker" },
];

const PROOF = [
  { value: "0", label: "invented resume claims — every line is cited" },
  { value: "100%", label: "of sends confirmed by you, never auto-spam" },
  { value: "7", label: "trust checks run on every listing" },
];

const FEATURES = [
  { icon: Target, title: "Fit scoring that respects your week", body: "Ranks open roles by what you can realistically win from transferable skills, budgeted to the hours you actually have.", href: "/sprint", cta: "See the weekly plan" },
  { icon: ShieldCheck, title: "Listings you can trust", body: "Flags duplicates, suspicious recruiters, hidden prompt injections and stale listings — with a plain reason for each.", href: "/jobs", cta: "Browse listings" },
  { icon: FileCheck2, title: "Tailoring without invention", body: "Every tailored line points back to your own resume. Nothing gets added that you did not write.", href: "/profile", cta: "Add your resume" },
];

function HomePage() {
  return (
    <div className="min-h-screen text-ink flex flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <ShortlistLogo />
          <nav aria-label="Main" className="hidden md:flex items-center gap-1 text-sm font-medium text-ink-soft">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-md hover:text-ink hover:bg-surface-hover transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-ink-soft hover:text-ink px-3 py-2">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-semibold text-surface bg-ink hover:opacity-90 px-4 py-2 rounded-lg transition-opacity">
              Get started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <section className="grid-surface">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent-soft border border-accent-border px-3 py-1 rounded-full">
              <Sparkles size={13} /> Job search, planned around your week
            </span>
            <h1 className="mt-6 text-[44px] sm:text-[56px] font-extrabold tracking-tight leading-[1.04] text-ink">
              Apply to fewer jobs.<br />
              <span className="text-accent">Win more of them.</span>
            </h1>
            <p className="mt-5 text-lg text-ink-soft leading-relaxed max-w-lg">
              Shortlist checks every listing, picks the roles worth your limited hours, and drafts applications that never claim anything you did not do.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-ink text-surface font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                Start for free <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="inline-flex items-center bg-surface border border-line text-ink font-semibold px-6 py-3 rounded-lg hover:bg-surface-hover transition-colors">
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line bg-paper">
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="ml-3 text-[11px] font-mono text-ink-faint">shortlist / weekly plan</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                { t: "Senior Full-Stack Engineer", c: "Remote · 12 min to apply", s: 96 },
                { t: "Frontend Engineer, Platform", c: "Hybrid · 20 min to apply", s: 88 },
                { t: "Software Engineer II", c: "On-site · 35 min to apply", s: 71 },
              ].map((j) => (
                <div key={j.t} className="flex items-center justify-between gap-3 border border-line rounded-xl p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{j.t}</p>
                    <p className="text-xs text-ink-faint mt-0.5 flex items-center gap-1"><Clock size={12} /> {j.c}</p>
                  </div>
                  <span className="text-xs font-bold text-accent bg-accent-soft border border-accent-border px-2.5 py-1 rounded-full">{j.s}% fit</span>
                </div>
              ))}
              <p className="text-xs text-ink-soft flex items-center gap-1.5 pt-1">
                <CheckCircle2 size={14} className="text-accent" /> Listing verified · resume lines cited · waiting for your approval
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-px bg-line border border-line rounded-2xl overflow-hidden">
          {PROOF.map((p) => (
            <div key={p.label} className="bg-surface p-6">
              <p className="text-3xl font-extrabold tracking-tight text-ink">{p.value}</p>
              <p className="text-sm text-ink-soft mt-1">{p.label}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface/80 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink max-w-xl">
            Spend your limited hours where they count
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-surface p-6 hover:border-accent-border transition-colors">
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                  <f.icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">{f.body}</p>
                <Link href={f.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                  {f.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-soft">
          <ShortlistLogo />
          <div className="flex items-center gap-6">
            <Link href="/sprint" className="hover:text-ink">Weekly plan</Link>
            <Link href="/jobs" className="hover:text-ink">Listings</Link>
            <Link href="/pipeline" className="hover:text-ink">Tracker</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shortlist — the job search that fits your week" },
      { name: "description", content: "A job tracker that checks listings, spends your limited application hours where they count, and never writes claims you did not make." },
      { property: "og:title", content: "Shortlist — the job search that fits your week" },
      { property: "og:description", content: "A job tracker that checks listings, spends your limited application hours where they count, and never writes claims you did not make." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});
