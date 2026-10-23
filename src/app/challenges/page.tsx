import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { CatalogFilters } from "@/components/challenges/catalog-filters";
import { ChallengeGrid } from "@/components/challenges/challenge-card";
import { Pagination } from "@/components/challenges/pagination";
import { parseCatalogParams } from "@/lib/challenges";
import { listActiveCategories, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Challenges" };

export default function ChallengesPage({ searchParams }: PageProps<"/challenges">) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Challenges</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Real AI-skill challenges across categories. Join any open challenge,
        whatever your main category is.
      </p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Catalog({
  searchParams,
}: {
  searchParams: PageProps<"/challenges">["searchParams"];
}) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const params = parseCatalogParams(await searchParams);
  const [categories, list] = await Promise.all([
    listActiveCategories(),
    listChallenges(params),
  ]);

  if (!categories.ok || !list.ok) {
    return <LoadError>Challenges could not be loaded. Please try again in a moment.</LoadError>;
  }

  const { items, total } = list.data;
  const filtered = Boolean(params.category || params.status || params.difficulty);

  return (
    <>
      <CatalogFilters params={params} categories={categories.data} />
      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {total} {total === 1 ? "challenge" : "challenges"}
      </p>
      {items.length === 0 ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-6 text-muted">
          {filtered
            ? "No challenges match these filters."
            : "No challenges have been published yet. Check back soon."}
        </p>
      ) : (
        <div className="mt-4">
          <ChallengeGrid items={items} />
          <Pagination params={params} total={total} />
        </div>
      )}
    </>
  );
}
