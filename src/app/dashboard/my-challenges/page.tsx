import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { getCurrentUser } from "@/lib/auth/user";
import { formatUtc } from "@/lib/challenges";
import { listMyChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "My challenges" };

export default function MyChallengesPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">My challenges</h1>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <MyChallenges />
        </Suspense>
      </div>
    </section>
  );
}

async function MyChallenges() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/my-challenges");

  const result = await listMyChallenges(user.id);
  if (!result.ok) {
    return <LoadError>Your challenges could not be loaded. Please try again in a moment.</LoadError>;
  }
  if (result.data.length === 0) {
    return (
      <p className="text-muted">
        You have not joined any challenge yet.{" "}
        <Link href="/challenges" className="text-lime underline underline-offset-4">
          Browse challenges
        </Link>
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {result.data.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/challenges/${c.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-lime/60 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-muted">
                {c.category?.name ?? "Uncategorized"} · ends {formatUtc(c.endsAt)}
              </p>
            </div>
            <StatusBadge status={c.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
