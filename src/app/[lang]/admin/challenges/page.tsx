import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc, localizedCategory } from "@/lib/challenges";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { langFromParams } from "@/lib/i18n/params";

export default async function AdminChallengesPage(props: PageProps<"/[lang]/admin/challenges">) {
  const { lang, d } = await langFromParams(props.params);
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{d.admin.list.title}</h1>
        <Link href="/admin/challenges/new" className="inline-flex h-11 items-center rounded-md bg-lime px-5 font-medium text-ink">
          {d.admin.list.newChallenge}
        </Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <List d={d} lang={lang} />
        </Suspense>
      </div>
    </section>
  );
}

async function List({ d, lang }: { d: Dict; lang: Locale }) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("sync_challenge_statuses");
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title, status, starts_at, ends_at, categories(slug, name)")
    .order("created_at", { ascending: false });
  if (error) return <LoadError>{d.admin.list.loadError}</LoadError>;
  if (!data?.length) return <p className="text-muted">{d.admin.list.none}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => {
        const cat = Array.isArray(c.categories) ? c.categories[0] : c.categories;
        return (
          <li key={c.id}>
            <Link
              href={`/admin/challenges/${c.id}`}
              className="glass flex flex-col gap-2 rounded-lg p-5 transition-colors hover:border-lime/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {cat ? localizedCategory(d, cat).name : d.admin.list.noCategory} · {formatUtc(c.starts_at, lang)} → {formatUtc(c.ends_at, lang)}
                </p>
              </div>
              <StatusBadge status={c.status} d={d} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
