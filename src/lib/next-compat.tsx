/**
 * Small stand-ins for the Next.js helpers the original pages used, built on
 * TanStack Router.
 */
import { Link as RouterLink, useLocation, useRouter as useTanRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children?: ReactNode };

export default function Link({ href, children, ...rest }: LinkProps) {
  if (/^(https?:|mailto:|tel:|#)/.test(href) || rest.target === "_blank") {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <RouterLink to={href as any} {...(rest as any)}>
      {children}
    </RouterLink>
  );
}

export function usePathname(): string {
  return useLocation({ select: (l) => l.pathname });
}

export function useRouter() {
  const router = useTanRouter();
  return {
    push: (href: string) => router.navigate({ href }),
    replace: (href: string) => router.navigate({ href, replace: true }),
    refresh: () => router.invalidate(),
  };
}
