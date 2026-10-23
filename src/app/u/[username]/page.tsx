import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { getPortfolio, getPublicProfile } from "@/lib/data/leaderboard";
import { formatUtc } from "@/lib/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Profile" };

const USERNAME = /^[a-z0-9_]{3,30}$/;

export default function ProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <Suspense fallback={<FormSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

async function Profile({ params }: { params: PageProps<"/u/[username]">["params"] }) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { username } = await params;
  if (!USERNAME.test(username)) notFound();

  const profile = await getPublicProfile(username);
  if (!profile.ok) return <LoadError>This profile could not be loaded.</LoadError>;
  if (!profile.data) notFound();

  const portfolio = await getPortfolio(username);
  if (!portfolio.ok) return <LoadError>This profile could not be loaded.</LoadError>;

  const p = profile.data;
  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight">{p.displayName}</h1>
      <p className="mt-1 text-muted">@{p.username}</p>
      {!p.isPublic ? (
        <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          Your profile is private. Only you can see this page.
        </p>
      ) : null}
      {p.bio ? <p className="mt-4 whitespace-pre-line text-muted">{p.bio}</p> : null}
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Main category</dt>
          <dd className="mt-1 font-medium">{p.categoryName ?? "Not chosen"}</dd>
        </div>
        <div>
          <dt className="text-muted">Member since</dt>
          <dd className="mt-1 font-medium">{formatUtc(p.createdAt).split(",")[0]}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Results</h2>
        {portfolio.data.length === 0 ? (
          <p className="mt-3 text-muted">No approved results yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {portfolio.data.map((i) => (
              <li key={i.challengeSlug} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <Link href={`/challenges/${i.challengeSlug}`} className="font-medium underline-offset-4 hover:underline">
                    {i.challengeTitle}
                  </Link>
                  <p className="text-muted">{i.categoryName}</p>
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
