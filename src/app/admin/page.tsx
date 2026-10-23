import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { statusLabel } from "@/lib/challenges";

export const metadata: Metadata = { title: "Overview" };

export default function AdminPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Overview />
        </Suspense>
      </div>
    </section>
  );
}

async function Overview() {
  const { supabase } = await requireAdmin();

  const [challenges, requests, drafts, pending] = await Promise.all([
    supabase.from("challenges").select("status"),
    supabase.from("company_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("challenges").select("id", { count: "exact", head: true }).in("status", ["closed", "under_review"]),
  ]);
  if (challenges.error || requests.error || drafts.error || pending.error) {
    return <LoadError>Could not load the overview.</LoadError>;
  }

  const byStatus = new Map<string, number>();
  for (const row of challenges.data ?? []) byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);

  const cards: [string, number, string][] = [
    ["New company requests", requests.count ?? 0, "/admin/requests"],
    ["Challenges awaiting evaluation", pending.count ?? 0, "/admin/challenges"],
    ["Draft evaluations to approve", drafts.count ?? 0, "/admin/challenges"],
  ];

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <li key={label}>
            <Link href={href} className="block rounded-lg border border-line bg-surface p-5 transition-colors hover:border-lime/60">
              <p className="text-3xl font-semibold">{value}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Challenges by status</h2>
      {byStatus.size === 0 ? (
        <p className="mt-3 text-muted">
          No challenges yet.{" "}
          <Link href="/admin/challenges/new" className="text-lime underline underline-offset-4">Create the first one</Link>
        </p>
      ) : (
        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          {[...byStatus.entries()].map(([status, count]) => (
            <div key={status} className="rounded-md border border-line px-4 py-3">
              <dt className="text-sm text-muted">{statusLabel(status)}</dt>
              <dd className="mt-1 text-xl font-semibold">{count}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
