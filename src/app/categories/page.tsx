import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { listActiveCategories } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Each competitor has one main category, and can join challenges in any of them.
      </p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <CategoryList />
        </Suspense>
      </div>
    </div>
  );
}

async function CategoryList() {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const result = await listActiveCategories();
  if (!result.ok) {
    return <LoadError>Categories could not be loaded. Please try again in a moment.</LoadError>;
  }
  if (result.data.length === 0) {
    return <p className="text-muted">No categories are available yet.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.map((c) => (
        <li key={c.slug} className="flex">
          <Link
            href={`/categories/${c.slug}`}
            className="flex w-full flex-col gap-2 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-lime/60"
          >
            <h2 className="text-lg font-semibold">{c.name}</h2>
            {c.description ? <p className="text-sm text-muted">{c.description}</p> : null}
            <p className="mt-auto pt-2 text-sm text-muted">
              {c.challengeCount} {c.challengeCount === 1 ? "challenge" : "challenges"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
