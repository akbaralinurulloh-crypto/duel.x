import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc } from "@/lib/challenges";

export const metadata: Metadata = { title: "Challenges" };

export default function AdminChallengesPage() {
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Challenges</h1>
        <Link href="/admin/challenges/new" className="inline-flex h-11 items-center rounded-md bg-lime px-5 font-medium text-ink">
          New challenge
        </Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <List />
        </Suspense>
      </div>
    </section>
  );
}

async function List() {
  const { supabase } = await requireAdmin();
  await supabase.rpc("sync_challenge_statuses");
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title, status, starts_at, ends_at, categories(name)")
    .order("created_at", { ascending: false });
  if (error) return <LoadError>Could not load challenges.</LoadError>;
  if (!data?.length) return <p className="text-muted">No challenges yet.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => {
        const cat = Array.isArray(c.categories) ? c.categories[0] : c.categories;
        return (
          <li key={c.id}>
            <Link
              href={`/admin/challenges/${c.id}`}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-lime/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {cat?.name ?? "No category"} · {formatUtc(c.starts_at)} → {formatUtc(c.ends_at)}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
