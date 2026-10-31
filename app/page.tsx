import Link from "next/link";
import React from "react";

// --- SVG Components for Jobright Icons & Accolades ---

function ShortlistLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-decoration-none group">
      {/* Origami bird logo in Jobright green style */}
      <svg
        width="38"
        height="38"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-200 group-hover:scale-105"
      >
        <path
          d="M18 64C18 42 36 24 58 24C68 24 76 28 82 34L88 28C79 19 69 16 58 16C31 16 10 37 10 64C10 77 16 88 26 95L32 87C23 82 18 73 18 64Z"
          fill="#00D084"
        />
        <path
          d="M82 34L44 72L30 58L22 66L44 88L90 42L82 34Z"
          fill="#00D084"
        />
        <path
          d="M44 72L58 86L94 50L86 42L44 72Z"
          fill="#059669"
        />
        <circle cx="68" cy="38" r="4" fill="#003B26" />
      </svg>
      <div className="flex items-baseline gap-1">
        <span className="text-[26px] font-extrabold tracking-tight text-slate-950 font-sans">
          Shortlist
        </span>
        <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/20">
          AI
        </span>
      </div>
    </Link>
  );
}

function LaurelWreath({
  top,
  middle,
  bottom,
}: {
  top: string;
  middle: string;
  bottom: string;
}) {
  return (
    <div className="flex items-center gap-2 text-center select-none">
      {/* Left Laurel Branch */}
      <svg
        width="28"
        height="56"
        viewBox="0 0 32 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-900 shrink-0"
      >
        <path
          d="M26 4C24 12 18 20 10 24C18 25 24 30 22 38C20 46 14 52 4 56C8 58 14 59 20 58"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="20" cy="8" rx="4" ry="2" transform="rotate(-30 20 8)" fill="currentColor" />
        <ellipse cx="14" cy="18" rx="4" ry="2" transform="rotate(-15 14 18)" fill="currentColor" />
        <ellipse cx="14" cy="30" rx="4" ry="2.2" transform="rotate(10 14 30)" fill="currentColor" />
        <ellipse cx="18" cy="42" rx="4.2" ry="2.2" transform="rotate(35 18 42)" fill="currentColor" />
        <ellipse cx="12" cy="50" rx="3.5" ry="2" transform="rotate(45 12 50)" fill="currentColor" />
      </svg>

      {/* Center Text */}
      <div className="flex flex-col items-center justify-center px-1">
        <span className="text-[10px] md:text-[11px] font-medium text-slate-700 uppercase tracking-tight">
          {top}
        </span>
        <span className="text-[12px] md:text-[13px] font-bold text-slate-950 uppercase tracking-tight">
          {middle}
        </span>
        <span className="text-[15px] md:text-[17px] font-black text-slate-950 tracking-tight leading-none mt-0.5">
          {bottom}
        </span>
      </div>

      {/* Right Laurel Branch */}
      <svg
        width="28"
        height="56"
        viewBox="0 0 32 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-900 shrink-0"
      >
        <path
          d="M6 4C8 12 14 20 22 24C14 25 8 30 10 38C12 46 18 52 28 56C24 58 18 59 12 58"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="8" rx="4" ry="2" transform="rotate(30 12 8)" fill="currentColor" />
        <ellipse cx="18" cy="18" rx="4" ry="2" transform="rotate(15 18 18)" fill="currentColor" />
        <ellipse cx="18" cy="30" rx="4" ry="2.2" transform="rotate(-10 18 30)" fill="currentColor" />
        <ellipse cx="14" cy="42" rx="4.2" ry="2.2" transform="rotate(-35 14 42)" fill="currentColor" />
        <ellipse cx="20" cy="50" rx="3.5" ry="2" transform="rotate(-45 20 50)" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#ebf9e8] text-slate-900 font-sans selection:bg-emerald-200 selection:text-emerald-950 flex flex-col justify-between">
      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION BAR (Exact Jobright Header Layout) */}
      {/* ============================================================== */}
      <header className="w-full px-6 md:px-12 lg:px-16 py-4 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <ShortlistLogo />

        {/* Center: Rounded Pill Navigation Container */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center bg-white/80 backdrop-blur-md border border-slate-900/10 rounded-full p-1 shadow-sm"
        >
          {/* Pill Switch */}
          <div className="flex items-center bg-slate-950 rounded-full p-0.5">
            <span className="bg-white text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer">
              Job seekers
            </span>
            <span className="text-white/80 hover:text-white text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer transition-colors">
              Employers
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-1 pl-3 pr-2 text-xs font-semibold text-slate-700">
            <Link
              href="/jobs"
              className="px-3 py-1.5 rounded-full hover:text-slate-950 hover:bg-black/5 transition-colors flex items-center gap-1"
            >
              Features
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70">
                <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
            <Link
              href="/sprint"
              className="px-3 py-1.5 rounded-full hover:text-slate-950 hover:bg-black/5 transition-colors"
            >
              AI Agent
            </Link>
            <Link
              href="/profile"
              className="px-3 py-1.5 rounded-full hover:text-slate-950 hover:bg-black/5 transition-colors"
            >
              Resume AI
            </Link>
          </div>
        </nav>

        {/* Right: Auth & CTA Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/sprint"
            className="hidden sm:inline-flex items-center justify-center text-xs font-extrabold uppercase tracking-wider text-slate-800 bg-[#d8f3d4] hover:bg-[#c2ecc0] px-5 py-2.5 rounded-full transition-all"
          >
            SIGN IN
          </Link>
          <Link
            href="/sprint"
            className="inline-flex items-center justify-center text-xs font-extrabold uppercase tracking-wider text-white bg-slate-950 hover:bg-slate-800 px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            JOIN NOW
          </Link>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION (Window Mockup on Left + Giant Typography on Right) */}
      {/* ============================================================== */}
      <section className="w-full px-6 md:px-12 lg:px-16 pt-6 pb-12 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Browser / Laptop Product Mockup */}
          <div className="lg:col-span-6 xl:col-span-6 w-full">
            <div className="relative rounded-[22px] border-2 border-slate-950 bg-slate-950 shadow-2xl overflow-hidden aspect-[16/11] flex flex-col group">
              {/* Top Window Header with 3 Dots */}
              <div className="bg-white border-b-2 border-slate-950 px-4 py-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-950 inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-950 inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-950 inline-block" />
                </div>
                <div className="bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600 px-4 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  shortlist.ai/copilot
                </div>
                <div className="w-12 text-right">
                  <span className="text-[10px] font-mono text-slate-400">LIVE</span>
                </div>
              </div>

              {/* Window Body: High-Contrast Interactive Product Showcase */}
              <div className="flex-1 bg-[#0f172a] p-5 text-white flex flex-col justify-between relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Copilot Header in Window */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-xs font-semibold text-white leading-none">
                        AI Job Agent
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        11 Active Feeds · 2,400+ Verified Listings
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    94% High Fit Match
                  </span>
                </div>

                {/* Job Card Spotlight */}
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 my-auto shadow-inner">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-white text-base">
                        S
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          Senior Full-Stack Engineer
                        </h4>
                        <p className="text-[12px] text-slate-400">
                          Stripe · Remote (US/UK) · $165,000–$195,000
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      ✨ 96%
                    </span>
                  </div>

                  {/* Trust & Provenance Pills */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
                    <span className="text-[11px] bg-slate-800 text-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      🛡️ Verified ATS Listing (0% Scam)
                    </span>
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md">
                      ⏱️ 12 min to apply
                    </span>
                    <span className="text-[11px] bg-slate-800 text-amber-300 px-2.5 py-0.5 rounded-md">
                      Audit Provenance: 4 Lines Cited
                    </span>
                  </div>

                  {/* AI Match Rationale */}
                  <p className="text-[11px] text-slate-300 mt-2.5 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400">Why You Can Win:</strong> Direct
                    overlap with React, Node.js, and Distributed Systems. 0 hallucinated claims.
                  </p>
                </div>

                {/* Action Bar Inside Window */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-slate-300 font-mono">
                      100% Human Confirmed Gate
                    </span>
                  </div>
                  <Link
                    href="/sprint"
                    className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    Open Application Pack ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Content & Call to Action */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center lg:pl-4">
            <h2 className="text-[32px] sm:text-[42px] md:text-[48px] font-medium text-slate-900 tracking-tight leading-tight">
              No More Solo Job Hunting
            </h2>
            <h1 className="text-[56px] sm:text-[70px] md:text-[84px] font-black text-slate-950 tracking-tight leading-[0.98] mt-1 mb-6">
              Do it with AI
            </h1>

            <p className="text-[17px] sm:text-[19px] text-slate-700 leading-relaxed max-w-[500px] mb-8 font-normal">
              Get matched jobs, autofill applications, tailored resume, and
              recommended insider connections in less than 1 min!
            </p>

            <div>
              <Link
                href="/sprint"
                className="inline-flex items-center justify-center bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-[17px] sm:text-[19px] px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 tracking-wider uppercase"
              >
                TRY FOR FREE
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. ACCOLADES & SOCIAL PROOF ROW (Exact Match from Screenshot) */}
      {/* ============================================================== */}
      <section className="w-full px-6 md:px-12 lg:px-16 pt-4 pb-12 max-w-7xl mx-auto border-t border-slate-900/10 mt-2">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-6">
          {/* Left: 3 Laurel Wreath Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 sm:gap-10">
            <LaurelWreath
              top="Product of the month"
              middle="Product Hunt"
              bottom="1st"
            />
            <LaurelWreath
              top="Featured by"
              middle="OpenAI"
              bottom="TOP PICK"
            />
            <LaurelWreath
              top="★★★★★"
              middle="Trustpilot Reviews"
              bottom="4.8/5.0"
            />
          </div>

          {/* Right: Curved Arrow + 3,000,000 Trusted Users + Dotted Line + Smiley */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Curving dashed arrow */}
            <div className="hidden sm:block text-slate-800">
              <svg
                width="36"
                height="32"
                viewBox="0 0 40 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 32C10 16 22 8 34 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
                <path
                  d="M26 4L35 6L32 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Trusted Users Stat */}
            <div className="text-left">
              <p className="text-[28px] sm:text-[34px] font-black text-slate-950 tracking-tight leading-none">
                3,000,000
              </p>
              <p className="text-[12px] sm:text-[13px] font-semibold text-slate-700 mt-1">
                trusted users
              </p>
            </div>

            {/* Dotted horizontal connector line */}
            <div className="hidden md:block w-24 border-b-2 border-dotted border-slate-700/60" />

            {/* Round Smiley Face Icon */}
            <div className="w-12 h-12 rounded-full border-2 border-slate-950 bg-white flex items-center justify-center shadow-sm shrink-0">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-950"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. VALUE PROPOSITION FEATURE GRID (Jobright Style) */}
      {/* ============================================================== */}
      <section className="w-full bg-white/60 border-t border-slate-900/10 py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold font-mono tracking-widest text-emerald-800 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Autonomous Career Agent
            </span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight mt-3">
              Spend Your Limited Hours Where They Count
            </h3>
            <p className="text-sm md:text-base text-slate-600 mt-2">
              Built for precision job seekers. No ghost listings, no hallucinated resumes, and zero auto-spam.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl mb-4">
                🎯
              </div>
              <h4 className="text-lg font-bold text-slate-950">AI Fit Scoring & Time ROI</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Ranks open roles by what you can realistically win based on transferable skills, budgeted strictly to your weekly hours.
              </p>
              <Link href="/sprint" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-4 hover:underline">
                View Weekly Plan →
              </Link>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl mb-4">
                🛡️
              </div>
              <h4 className="text-lg font-bold text-slate-950">Trust Shield & Anti-Ghost</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Flags duplicate posts, suspicious free-email recruiters, prompt injections, and stale zombie listings with transparent reasons.
              </p>
              <Link href="/jobs" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 mt-4 hover:underline">
                Explore Verified Listings →
              </Link>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl mb-4">
                📝
              </div>
              <h4 className="text-lg font-bold text-slate-950">Zero-Hallucination Tailoring</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Every line in your tailored application cites exact line numbers from your uploaded resume. Nothing invented, 100% human approved.
              </p>
              <Link href="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 mt-4 hover:underline">
                Upload Resume →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. FOOTER (Minimalist & Clean) */}
      {/* ============================================================== */}
      <footer className="w-full bg-[#e3f4e0] border-t border-slate-900/10 py-8 px-6 md:px-12 lg:px-16 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShortlistLogo />
            <span className="text-slate-400">|</span>
            <span>Zero auto-spam · 100% human confirmed gate · Local-first privacy</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-slate-700">
            <Link href="/sprint" className="hover:text-slate-950">
              Weekly Sprint
            </Link>
            <Link href="/jobs" className="hover:text-slate-950">
              Listings
            </Link>
            <Link href="/pipeline" className="hover:text-slate-950">
              Tracker
            </Link>
            <Link href="/privacy" className="hover:text-slate-950">
              Storage & Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
