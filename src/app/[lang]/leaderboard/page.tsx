import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { localizedCategory } from "@/lib/challenges";
import { listActiveCategories } from "@/lib/data/challenges";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { fmt } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { first } from "@/lib/search-params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/leaderboard">) =>
  localizedMetadata(props.params, (d) => ({ title: d.leaderboard.title }));

export default async function LeaderboardPage({ params, searchParams }: PageProps<"/[lang]/leaderboard">) {
  const { d } = await langFromParams(params);
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.leaderboard.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{d.leaderboard.intro}</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Board searchParams={searchParams} d={d} />
        </Suspense>
      </div>
    </div>
  );
}

async function Board({
  searchParams,
  d,
}: {
  searchParams: PageProps<"/[lang]/leaderboard">["searchParams"];
  d: Dict;
}) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  const raw = first((await searchParams).category);
  const categories = await listActiveCategories();
  if (!categories.ok) return <LoadError>{d.leaderboard.loadError}</LoadError>;

  const selected = categories.data.find((c) => c.slug === raw) ?? null;
  const board = await getLeaderboard(selected?.slug ?? null);
  if (!board.ok) return <LoadError>{d.leaderboard.loadError}</LoadError>;

  const selectedName = selected ? localizedCategory(d, selected).name : d.categoriesPage.all;
  const tab = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm transition-colors ${
      active ? "border-lime text-lime" : "border-line text-muted hover:border-lime/60"
    }`;

  return (
    <>
      <nav aria-label={d.leaderboard.categoryAria} className="flex flex-wrap gap-2">
        <Link href="/leaderboard" className={tab(!selected)} aria-current={!selected ? "page" : undefined}>
          {d.categoriesPage.all}
        </Link>
        {categories.data.map((c) => (
          <Link
            key={c.slug}
            href={`/leaderboard?category=${c.slug}`}
            className={tab(selected?.slug === c.slug)}
            aria-current={selected?.slug === c.slug ? "page" : undefined}
          >
            {localizedCategory(d, c).name}
          </Link>
        ))}
      </nav>

      {board.data.length === 0 ? (
        <p className="mt-8 rounded-lg border border-line bg-surface p-6 text-muted">
          {d.leaderboard.empty}
        </p>
      ) : (
        <div className="glass mt-8 overflow-x-auto rounded-lg">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{fmt(d.leaderboard.caption, { name: selectedName })}</caption>
            <thead className="text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{d.leaderboard.rank}</th>
                <th scope="col" className="px-4 py-3 font-medium">{d.leaderboard.competitor}</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">{d.leaderboard.challenges}</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">{d.leaderboard.points}</th>
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
