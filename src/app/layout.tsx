import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthNav } from "@/components/auth-nav";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const origin = siteUrl();

export const metadata: Metadata = {
  ...(origin ? { metadataBase: new URL(origin) } : {}),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
  },
  twitter: { card: "summary", title: SITE.name, description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#080b12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
            <Link href="/" aria-label={`${SITE.name} home`}>
              <Logo />
            </Link>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link href="/challenges" className="text-muted transition-colors hover:text-text">
                Challenges
              </Link>
              <Link href="/categories" className="text-muted transition-colors hover:text-text">
                Categories
              </Link>
              <Link href="/leaderboard" className="text-muted transition-colors hover:text-text">
                Leaderboard
              </Link>
              <Suspense fallback={<div aria-hidden="true" className="h-9 w-40" />}>
                <AuthNav />
              </Suspense>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 text-sm text-muted">
            © {SITE.name}
          </div>
        </footer>
      </body>
    </html>
  );
}
