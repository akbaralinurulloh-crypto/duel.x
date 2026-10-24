import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { localizedCategory } from "@/lib/challenges";
import { getPortfolio, getPublicProfile } from "@/lib/data/leaderboard";
import { formatDateUtc } from "@/lib/i18n/config";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/u/[username]">) =>
  localizedMetadata(props.params, (d) => ({ title: d.profile.title }));

const USERNAME = /^[a-z0-9_]{3,30}$/;

export default function ProfilePage({ params }: PageProps<"/[lang]/u/[username]">) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Suspense fallback={<FormSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

async function Profile({ params }: { params: PageProps<"/[lang]/u/[username]">["params"] }) {
  const { lang, d } = await langFromParams(params);
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  const { username } = await params;
  if (!USERNAME.test(username)) notFound();

  const profile = await getPublicProfile(username);
  if (!profile.ok) return <LoadError>{d.profile.loadError}</LoadError>;
  if (!profile.data) notFound();

  const portfolio = await getPortfolio(username);
  if (!portfolio.ok) return <LoadError>{d.profile.loadError}</LoadError>;

  const p = profile.data;
  const categoryName = p.categoryName
    ? localizedCategory(d, { slug: p.categorySlug ?? "", name: p.categoryName }).name
    : null;
  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight">{p.displayName}</h1>
      <p className="mt-1 text-muted">@{p.username}</p>
      {!p.isPublic ? (
        <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          {d.profile.private}
        </p>
      ) : null}
      {p.bio ? <p className="mt-4 whitespace-pre-line text-muted">{p.bio}</p> : null}
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">{d.profile.mainCategory}</dt>
          <dd className="mt-1 font-medium">{categoryName ?? d.common.notChosen}</dd>
        </div>
        <div>
          <dt className="text-muted">{d.profile.memberSince}</dt>
          <dd className="mt-1 font-medium">{formatDateUtc(p.createdAt, lang)}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{d.profile.results}</h2>
        {portfolio.data.length === 0 ? (
          <p className="mt-3 text-muted">{d.profile.noResults}</p>
        ) : (
          <ul className="glass mt-4 divide-y divide-line rounded-lg">
            {portfolio.data.map((i) => (
              <li key={i.challengeSlug} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <Link href={`/challenges/${i.challengeSlug}`} className="font-medium underline-offset-4 hover:underline">
                    {i.challengeTitle}
                  </Link>
                  <p className="text-muted">{localizedCategory(d, { slug: i.categorySlug, name: i.categoryName }).name}</p>
                </div>
                <span className="font-medium">{i.percent}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
