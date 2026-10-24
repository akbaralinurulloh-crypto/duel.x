import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { getCurrentUser } from "@/lib/auth/user";
import { formatUtc, localizedCategory } from "@/lib/challenges";
import { listMyChallenges } from "@/lib/data/challenges";
import { getMyResultsSummary } from "@/lib/data/submissions";
import { fmt, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = (props: PageProps<"/[lang]/dashboard">) =>
  localizedMetadata(props.params, (d) => ({ title: d.dashboard.title }));

export default async function DashboardPage(props: PageProps<"/[lang]/dashboard">) {
  const { lang, d } = await langFromParams(props.params);
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DashboardContent d={d} lang={lang} />
    </Suspense>
  );
}

async function DashboardContent({ d, lang }: { d: Dict; lang: Locale }) {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, primary_category_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return <LoadError>{d.dashboard.profileLoadError}</LoadError>;

  let categoryName: string | null = null;
  if (profile.primary_category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("slug, name")
      .eq("id", profile.primary_category_id)
      .maybeSingle();
    categoryName = category ? localizedCategory(d, category).name : null;
  }

  const [mine, results] = await Promise.all([
    listMyChallenges(user.id),
    getMyResultsSummary(user.id),
  ]);
  const challenges = mine.ok ? mine.data : [];
  const active = challenges.filter((c) => c.status === "active");

  // A figure is only shown when it could actually be loaded.
  const stats: [string, string][] = [];
  if (mine.ok) {
    stats.push([d.dashboard.statJoined, String(challenges.length)]);
    stats.push([d.dashboard.statActive, String(active.length)]);
    stats.push([
      d.dashboard.statCompleted,
      String(challenges.filter((c) => c.status === "completed").length),
    ]);
  }
  if (results.ok) stats.push([d.dashboard.statResults, String(results.data.challenges)]);

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">
        {fmt(d.dashboard.welcome, { name: profile.display_name })}
      </h1>
      <p className="mt-2 text-sm text-muted">
        @{profile.username} · {d.dashboard.mainCategory}: {categoryName ?? d.common.notChosen}
      </p>

      {stats.length ? (
        <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="glass rounded-lg px-5 py-4">
              <dd className="text-3xl font-semibold tracking-tight">{value}</dd>
              <dt className="mt-1 text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      ) : null}

      <h2 className="mt-10 text-xl font-semibold">{d.dashboard.continueTitle}</h2>
      {active.length === 0 ? (
        <p className="mt-3 text-muted">
          {d.dashboard.continueEmpty}{" "}
          <Link href="/challenges" className="text-lime underline underline-offset-4">
            {d.dashboard.browse}
          </Link>
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {active.slice(0, 3).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/challenges/${c.slug}`}
                className="glass flex flex-col gap-2 rounded-lg p-5 transition-colors hover:border-lime/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {c.category ? localizedCategory(d, c.category).name : d.common.uncategorized} ·{" "}
                    {fmt(d.dashboard.endsInline, { date: formatUtc(c.endsAt, lang) })}
                  </p>
                </div>
                <StatusBadge status={c.status} d={d} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/dashboard/my-challenges" className="text-lime underline underline-offset-4">
          {d.dashboard.myChallenges}
        </Link>
        <Link href={`/u/${profile.username}`} className="text-lime underline underline-offset-4">
          {d.dashboard.viewProfile}
        </Link>
      </p>
    </section>
  );
}
