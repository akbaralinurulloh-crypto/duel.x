import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { getCurrentUser } from "@/lib/auth/user";
import { formatUtc, localizedCategory } from "@/lib/challenges";
import { listMyChallenges } from "@/lib/data/challenges";
import { fmt, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/dashboard/my-challenges">) =>
  localizedMetadata(props.params, (d) => ({ title: d.dashboard.myChallenges }));

export default async function MyChallengesPage(props: PageProps<"/[lang]/dashboard/my-challenges">) {
  const { lang, d } = await langFromParams(props.params);
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{d.dashboard.myChallenges}</h1>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <MyChallenges d={d} lang={lang} />
        </Suspense>
      </div>
    </section>
  );
}

async function MyChallenges({ d, lang }: { d: Dict; lang: Locale }) {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/my-challenges");

  const result = await listMyChallenges(user.id);
  if (!result.ok) return <LoadError>{d.dashboard.myChallengesLoadError}</LoadError>;
  if (result.data.length === 0) {
    return (
      <p className="text-muted">
        {d.dashboard.noneJoined}{" "}
        <Link href="/challenges" className="text-lime underline underline-offset-4">
          {d.dashboard.browse}
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
  );
}
