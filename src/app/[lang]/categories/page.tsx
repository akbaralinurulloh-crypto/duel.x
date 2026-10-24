import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { challengeCount, localizedCategory } from "@/lib/challenges";
import { listActiveCategories } from "@/lib/data/challenges";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/categories">) =>
  localizedMetadata(props.params, (d) => ({ title: d.categoriesPage.title }));

export default async function CategoriesPage(props: PageProps<"/[lang]/categories">) {
  const { d } = await langFromParams(props.params);
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.categoriesPage.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{d.categoriesPage.intro}</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <CategoryList d={d} />
        </Suspense>
      </div>
    </div>
  );
}

async function CategoryList({ d }: { d: Dict }) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  const result = await listActiveCategories();
  if (!result.ok) return <LoadError>{d.categoriesPage.loadError}</LoadError>;
  if (result.data.length === 0) return <p className="text-muted">{d.categoriesPage.empty}</p>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.map((c) => {
        const text = localizedCategory(d, c);
        return (
          <li key={c.slug} className="flex">
            <Link
              href={`/categories/${c.slug}`}
              className="glass flex w-full flex-col gap-2 rounded-lg p-5 transition-colors hover:border-lime/60"
            >
              <h2 className="text-lg font-semibold">{text.name}</h2>
              {text.description ? <p className="text-sm text-muted">{text.description}</p> : null}
              <p className="mt-auto pt-2 text-sm text-muted">{challengeCount(d, c.challengeCount)}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
