import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { CatalogFilters } from "@/components/challenges/catalog-filters";
import { ChallengeGrid } from "@/components/challenges/challenge-card";
import { Pagination } from "@/components/challenges/pagination";
import { challengeCount, parseCatalogParams } from "@/lib/challenges";
import { listActiveCategories, listChallenges } from "@/lib/data/challenges";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/challenges">) =>
  localizedMetadata(props.params, (d) => ({ title: d.catalog.title }));

export default async function ChallengesPage({ params, searchParams }: PageProps<"/[lang]/challenges">) {
  const { lang, d } = await langFromParams(params);
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.catalog.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{d.catalog.intro}</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Catalog searchParams={searchParams} d={d} lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}

async function Catalog({
  searchParams,
  d,
  lang,
}: {
  searchParams: PageProps<"/[lang]/challenges">["searchParams"];
  d: Dict;
  lang: Locale;
}) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  const params = parseCatalogParams(await searchParams);
  const [categories, list] = await Promise.all([
    listActiveCategories(),
    listChallenges(params),
  ]);

  if (!categories.ok || !list.ok) {
    return <LoadError>{d.catalog.loadError}</LoadError>;
  }

  const { items, total } = list.data;
  const filtered = Boolean(params.category || params.status || params.difficulty);

  return (
    <>
      <CatalogFilters params={params} categories={categories.data} d={d} />
      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {challengeCount(d, total)}
      </p>
      {items.length === 0 ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-6 text-muted">
          {filtered ? d.catalog.noMatch : d.catalog.noneYet}
        </p>
      ) : (
        <div className="mt-4">
          <ChallengeGrid items={items} d={d} lang={lang} />
          <Pagination params={params} total={total} d={d} />
        </div>
      )}
    </>
  );
}
