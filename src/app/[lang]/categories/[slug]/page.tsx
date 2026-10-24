import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { ChallengeGrid } from "@/components/challenges/challenge-card";
import { catalogHref, localizedCategory } from "@/lib/challenges";
import { getActiveCategory, listChallenges } from "@/lib/data/challenges";
import { fmt } from "@/lib/i18n/config";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/categories/[slug]">) =>
  localizedMetadata(props.params, (d) => ({ title: d.categoriesPage.categoryTitle }));

export default function CategoryPage({ params }: PageProps<"/[lang]/categories/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <Suspense fallback={<FormSkeleton />}>
        <CategoryDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CategoryDetail({ params }: { params: PageProps<"/[lang]/categories/[slug]">["params"] }) {
  const { lang, d } = await langFromParams(params);
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  const { slug } = await params;
  const category = await getActiveCategory(slug);
  if (!category.ok) return <LoadError>{d.categoriesPage.detailLoadError}</LoadError>;
  if (!category.data) notFound();

  const list = await listChallenges({ category: slug, page: 1 });
  if (!list.ok) return <LoadError>{d.categoriesPage.challengesLoadError}</LoadError>;

  const text = localizedCategory(d, category.data);

  return (
    <>
      <Link href="/categories" className="text-sm text-muted underline underline-offset-4">
        {d.categoriesPage.all}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{text.name}</h1>
      {text.description ? <p className="mt-2 max-w-2xl text-muted">{text.description}</p> : null}
      <div className="mt-8">
        {list.data.items.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-muted">
            {d.categoriesPage.noChallenges}
          </p>
        ) : (
          <>
            <ChallengeGrid items={list.data.items} d={d} lang={lang} />
            {list.data.total > list.data.items.length ? (
              <p className="mt-6">
                <Link
                  href={catalogHref({ category: slug })}
                  className="text-lime underline underline-offset-4"
                >
                  {fmt(d.categoriesPage.seeAll, { n: list.data.total })}
                </Link>
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
