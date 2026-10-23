import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listActiveCategories } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SITE } from "@/lib/site";

const STEPS = [
  {
    title: "Pick a challenge",
    body: "Choose a main category when you sign up, then join any open challenge in any category.",
  },
  {
    title: "Submit your work",
    body: "Upload your solution before the deadline. Every submission is stored privately and versioned.",
  },
  {
    title: "Get evaluated",
    body: "Results follow a published rubric and are approved by a human before they count.",
  },
  {
    title: "Build your profile",
    body: "Approved results feed category leaderboards and your public skill profile.",
  },
];

const buttonPrimary =
  "inline-flex h-12 items-center rounded-md bg-lime px-6 font-medium text-ink";
const buttonSecondary =
  "inline-flex h-12 items-center rounded-md border border-line px-6 font-medium transition-colors hover:border-lime/60";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32">
        <p className="mb-4 text-sm font-medium tracking-[0.2em] text-lime">
          THE GLOBAL AI SKILL ARENA
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">
          Don&apos;t Just Use AI.
          <br />
          Prove What You Can Do.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{SITE.description}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/challenges" className={buttonPrimary}>
            Browse challenges
          </Link>
          <Link href="/register" className={buttonSecondary}>
            Create account
          </Link>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-line bg-surface p-6">
                <p className="font-mono text-sm text-lime">0{i + 1}</p>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Categories</h2>
          <div className="mt-8">
            <Suspense fallback={<div aria-hidden="true" className="h-24" />}>
              <CategoryChips />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Hiring or sponsoring?</h2>
            <p className="mt-2 max-w-xl text-muted">
              Companies can ask to run a challenge or discover talent.
            </p>
          </div>
          <Link href="/companies" className={buttonSecondary}>
            For companies
          </Link>
        </div>
      </section>
    </main>
  );
}

async function CategoryChips() {
  await connection();
  if (!isSupabaseConfigured()) {
    return (
      <Link href="/categories" className="text-lime underline underline-offset-4">
        View all categories
      </Link>
    );
  }
  const result = await listActiveCategories();
  if (!result.ok || result.data.length === 0) {
    return (
      <Link href="/categories" className="text-lime underline underline-offset-4">
        View all categories
      </Link>
    );
  }
  return (
    <ul className="flex flex-wrap gap-3">
      {result.data.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/categories/${c.slug}`}
            className="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-lime/60"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
