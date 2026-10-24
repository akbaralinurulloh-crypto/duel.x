import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChallengeGrid } from "@/components/challenges/challenge-card";
import { LogoMark } from "@/components/logo";
import { challengeCount, localizedCategory } from "@/lib/challenges";
import { listActiveCategories, listChallenges } from "@/lib/data/challenges";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import type { Locale } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]">) =>
  localizedMetadata(props.params, (d) => ({ title: { absolute: d.meta.siteName } }));

const buttonPrimary =
  "inline-flex h-12 items-center rounded-md bg-lime px-6 font-medium text-ink transition-opacity hover:opacity-90";
const buttonSecondary =
  "inline-flex h-12 items-center rounded-md border border-line px-6 font-medium transition-colors hover:border-lime/60";

export default async function Home(props: PageProps<"/[lang]">) {
  const { lang, d } = await langFromParams(props.params);
  const steps = [
    [d.home.s1Title, d.home.s1Body],
    [d.home.s2Title, d.home.s2Body],
    [d.home.s3Title, d.home.s3Body],
    [d.home.s4Title, d.home.s4Body],
  ] as const;

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-grid relative overflow-hidden">
        <div className="hero-glow absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-sm font-medium tracking-[0.2em] text-lime">{d.home.eyebrow}</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {d.home.titleA}
              <br />
              <span className="bg-gradient-to-r from-cyan via-violet to-[#ff5fb0] bg-clip-text text-transparent">
                {d.home.titleB}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{d.meta.description}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/challenges" className={buttonPrimary}>
                {d.home.browse}
              </Link>
              <Link href="#how" className={buttonSecondary}>
                {d.home.howItWorks}
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
            <div className="glass float-slow absolute inset-8 flex items-center justify-center rounded-[2rem]">
              <LogoMark className="size-56 drop-shadow-[0_0_40px_rgb(139_114_255/0.6)]" />
            </div>
            <div className="glass float-slower absolute -left-2 top-10 rounded-xl px-4 py-3 text-sm">
              <span className="text-lime">●</span> {d.home.statOpen}
            </div>
            <div className="glass float-slow absolute -right-2 bottom-16 rounded-xl px-4 py-3 text-sm">
              <span className="text-cyan">●</span> {d.home.s3Title}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-10">
          <Suspense fallback={<div aria-hidden="true" className="h-24 animate-pulse rounded-lg bg-surface" />}>
            <Stats d={d} />
          </Suspense>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight">{d.home.liveTitle}</h2>
            <Link href="/challenges" className="text-sm text-lime underline underline-offset-4">
              {d.home.viewAll}
            </Link>
          </div>
          <div className="mt-8">
            <Suspense fallback={<div aria-hidden="true" className="h-40 animate-pulse rounded-lg bg-surface" />}>
              <Live d={d} lang={lang} />
            </Suspense>
          </div>
        </div>
      </section>

      <section id="how" className="border-t border-line scroll-mt-4">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{d.home.howTitle}</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, body], i) => (
              <li key={title} className="glass rounded-lg p-6">
                <p className="font-mono text-sm text-lime">0{i + 1}</p>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{d.home.categoriesTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted">{d.home.categoriesBody}</p>
          <div className="mt-8">
            <Suspense fallback={<div aria-hidden="true" className="h-32 animate-pulse rounded-lg bg-surface" />}>
              <CategoryCards d={d} />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">{d.home.companiesTitle}</h2>
            <p className="mt-2 max-w-xl text-muted">{d.home.companiesBody}</p>
          </div>
          <Link href="/companies" className={buttonSecondary}>
            {d.home.companiesCta}
          </Link>
        </div>
      </section>
    </main>
  );
}

// All three blocks below read real data. Nothing here is a placeholder number.

async function Stats({ d }: { d: Dict }) {
  await connection();
  if (!isSupabaseConfigured()) return null;
  const [categories, open, all] = await Promise.all([
    listActiveCategories(),
    listChallenges({ status: "open", page: 1 }),
    listChallenges({ page: 1 }),
  ]);
  if (!categories.ok || !open.ok || !all.ok) return null;

  const stats = [
    [categories.data.length, d.home.statCategories],
    [open.data.total, d.home.statOpen],
    [all.data.total, d.home.statTotal],
  ] as const;
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {stats.map(([value, label]) => (
        <div key={label} className="glass rounded-lg px-6 py-5">
          <dd className="text-4xl font-semibold tracking-tight">{value}</dd>
          <dt className="mt-1 text-sm text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

async function Live({ d, lang }: { d: Dict; lang: Locale }) {
  await connection();
  if (!isSupabaseConfigured()) return null;
  const [open, upcoming] = await Promise.all([
    listChallenges({ status: "open", page: 1 }),
    listChallenges({ status: "upcoming", page: 1 }),
  ]);
  const items = [
    ...(open.ok ? open.data.items : []),
    ...(upcoming.ok ? upcoming.data.items : []),
  ].slice(0, 6);
  if (items.length === 0) {
    return <p className="glass rounded-lg p-6 text-muted">{d.home.liveEmpty}</p>;
  }
  return <ChallengeGrid items={items} d={d} lang={lang} />;
}

async function CategoryCards({ d }: { d: Dict }) {
  await connection();
  const fallback = (
    <Link href="/categories" className="text-lime underline underline-offset-4">
      {d.home.viewAllCategories}
    </Link>
  );
  if (!isSupabaseConfigured()) return fallback;
  const result = await listActiveCategories();
  if (!result.ok || result.data.length === 0) return fallback;
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((c) => {
          const text = localizedCategory(d, c);
          return (
            <li key={c.slug} className="flex">
              <Link
                href={`/categories/${c.slug}`}
                className="glass flex w-full flex-col gap-2 rounded-lg p-5 transition-colors hover:border-lime/60"
              >
                <h3 className="text-lg font-semibold">{text.name}</h3>
                {text.description ? <p className="text-sm text-muted">{text.description}</p> : null}
                <p className="mt-auto pt-2 text-sm text-muted">{challengeCount(d, c.challengeCount)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-6">
        <Link href="/categories" className="text-lime underline underline-offset-4">
          {d.home.viewAllCategories}
        </Link>
      </p>
    </>
  );
}
