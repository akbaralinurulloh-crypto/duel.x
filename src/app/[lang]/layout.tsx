import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthNav } from "@/components/auth-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { LOCALES, fmt, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/client";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const origin = siteUrl();

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title: { default: d.meta.siteName, template: `%s | ${d.meta.siteName}` },
    description: d.meta.description,
    openGraph: {
      type: "website",
      siteName: d.meta.siteName,
      title: d.meta.siteName,
      description: d.meta.description,
      locale: lang === "uz" ? "uz_UZ" : "en_US",
    },
    twitter: { card: "summary", title: d.meta.siteName, description: d.meta.description },
  };
}

export const viewport: Viewport = {
  themeColor: "#080b12",
};

const navLink = "text-muted transition-colors hover:text-text";

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = getDictionary(lang);

  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={lang} dict={d}>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-lime focus:px-4 focus:py-2 focus:text-ink"
          >
            {d.nav.skip}
          </a>
          <header className="border-b border-line bg-ink/80 backdrop-blur">
            <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
              <Link href="/" aria-label={fmt(d.nav.home, { site: d.meta.siteName })}>
                <Logo />
              </Link>
              <nav aria-label={d.nav.main} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Link href="/challenges" className={navLink}>{d.nav.challenges}</Link>
                <Link href="/categories" className={navLink}>{d.nav.categories}</Link>
                <Link href="/leaderboard" className={navLink}>{d.nav.leaderboard}</Link>
                <Link href="/companies" className={navLink}>{d.nav.forCompanies}</Link>
                <Link href="/about" className={navLink}>{d.nav.about}</Link>
                <LanguageSwitcher locale={lang} label={d.nav.language} />
                <Suspense fallback={<div aria-hidden="true" className="h-9 w-40" />}>
                  <AuthNav d={d} />
                </Suspense>
              </nav>
            </div>
          </header>
          <div id="content" className="flex flex-1 flex-col">{children}</div>
          <footer className="border-t border-line">
            <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-3">
                <Logo />
                <p className="text-muted">{d.footer.tagline}</p>
              </div>
              <FooterColumn title={d.footer.product}>
                <Link href="/challenges" className={navLink}>{d.nav.challenges}</Link>
                <Link href="/categories" className={navLink}>{d.nav.categories}</Link>
                <Link href="/leaderboard" className={navLink}>{d.nav.leaderboard}</Link>
              </FooterColumn>
              <FooterColumn title={d.footer.company}>
                <Link href="/about" className={navLink}>{d.nav.about}</Link>
                <Link href="/companies" className={navLink}>{d.nav.forCompanies}</Link>
              </FooterColumn>
              <FooterColumn title={d.footer.account}>
                <Link href="/login" className={navLink}>{d.nav.login}</Link>
                <Link href="/register" className={navLink}>{d.nav.signup}</Link>
              </FooterColumn>
            </div>
            <div className="border-t border-line">
              <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-muted">
                <p>{fmt(d.footer.rights, { site: d.meta.siteName })}</p>
                <p>{d.footer.note}</p>
              </div>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
