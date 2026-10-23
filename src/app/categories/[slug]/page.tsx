import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { ChallengeGrid } from "@/components/challenges/challenge-card";
import { catalogHref } from "@/lib/challenges";
import { getActiveCategory, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Category" };

export default function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <Link href="/categories" className="text-sm text-muted underline underline-offset-4">
        All categories
      </Link>
      <div className="mt-6">
        <Suspense fallback={<FormSkeleton />}>
          <CategoryDetail params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function CategoryDetail({
  params,
}: {
  params: PageProps<"/categories/[slug]">["params"];
}) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { slug } = await params;
  const category = await getActiveCategory(slug);
  if (!category.ok) {
    return <LoadError>This category could not be loaded. Please try again in a moment.</LoadError>;
  }
  if (!category.data) notFound();

  const list = await listChallenges({ category: slug, page: 1 });
  if (!list.ok) {
    return <LoadError>Challenges could not be loaded. Please try again in a moment.</LoadError>;
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{category.data.name}</h1>
      {category.data.description ? (
        <p className="mt-2 max-w-2xl text-muted">{category.data.description}</p>
      ) : null}
      <div className="mt-8">
        {list.data.items.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-muted">
            No challenges in this category yet.
          </p>
        ) : (
          <>
            <ChallengeGrid items={list.data.items} />
            {list.data.total > list.data.items.length ? (
              <p className="mt-6">
                <Link
                  href={catalogHref({ category: slug })}
                  className="text-lime underline underline-offset-4"
                >
                  See all {list.data.total} challenges in this category
                </Link>
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
