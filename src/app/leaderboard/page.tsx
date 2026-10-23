import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { listActiveCategories } from "@/lib/data/challenges";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { first } from "@/lib/search-params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Leaderboards" };

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Leaderboards</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Points are the best approved score in each completed challenge, as a
        percentage of the rubric maximum. Only approved results count, and
        people with private profiles are not listed.
      </p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Board searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/leaderboard">["searchParams"] }) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const raw = first((await searchParams).category);
  const categories = await listActiveCategories();
  if (!categories.ok) return <LoadError>Leaderboards could not be loaded.</LoadError>;

  const selected = categories.data.find((c) => c.slug === raw) ?? null;
  const board = await getLeaderboard(selected?.slug ?? null);
  if (!board.ok) return <LoadError>Leaderboards could not be loaded.</LoadError>;

  const tab = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm transition-colors ${
      active ? "border-lime text-lime" : "border-line text-muted hover:border-lime/60"
    }`;

  return (
    <>
      <nav aria-label="Leaderboard category" className="flex flex-wrap gap-2">
        <Link href="/leaderboard" className={tab(!selected)} aria-current={!selected ? "page" : undefined}>
          All categories
        </Link>
        {categories.data.map((c) => (
          <Link
            key={c.slug}
            href={`/leaderboard?category=${c.slug}`}
            className={tab(selected?.slug === c.slug)}
            aria-current={selected?.slug === c.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {board.data.length === 0 ? (
        <p className="mt-8 rounded-lg border border-line bg-surface p-6 text-muted">
          No results yet. Rankings appear after a challenge is completed and its
          results are approved.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {selected ? selected.name : "All categories"} leaderboard
            </caption>
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">#</th>
                <th scope="col" className="px-4 py-3 font-medium">Competitor</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Challenges</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {board.data.map((r) => (
                <tr key={r.username}>
                  <td className="px-4 py-3 font-mono">{r.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/u/${r.username}`} className="font-medium underline-offset-4 hover:underline">
                      {r.displayName}
                    </Link>
                    <span className="ml-2 text-muted">@{r.username}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{r.completed}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
