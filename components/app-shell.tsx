"use client";

import { usePathname } from "next/navigation";
import React, { Suspense } from "react";

function ShellContent({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <main id="main">{children}</main>;
  }

  return (
    <div className="shell">
      <aside className="sidebar">{sidebar}</aside>
      <main id="main" className="page">
        {children}
      </main>
    </div>
  );
}

export function AppShell(props: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<main id="main">{props.children}</main>}>
      <ShellContent {...props} />
    </Suspense>
  );
}
