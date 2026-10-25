import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { FormSkeleton, LoadError, NotConfigured } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { JoinForm } from "@/components/challenges/join-form";
import { SubmitForm } from "@/components/challenges/submit-form";
import { BriefButton } from "@/components/challenges/brief-button";
import {
  descriptionParagraphs,
  difficultyLabel,
  evaluationLabel,
  formatUtc,
  instructionSteps,
  localizedCategory,
  type ChallengeDetail,
} from "@/lib/challenges";
import { getCurrentUser } from "@/lib/auth/user";
import { getChallenge, getParticipation } from "@/lib/data/challenges";
import { getRubric, listMyEvaluations, listMySubmissions } from "@/lib/data/submissions";
import { fmt, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { preview } from "@/lib/submissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/challenges/[slug]">) =>
  localizedMetadata(props.params, (d) => ({ title: d.challenge.title }));

// Server actions on this page (AI review of a submission) can take up to a minute.
export const maxDuration = 60;

export default function ChallengePage({ params }: PageProps<"/[lang]/challenges/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <Suspense fallback={<FormSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: PageProps<"/[lang]/challenges/[slug]">["params"] }) {
  const { lang, d } = await langFromParams(params);
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  const { slug } = await params;
  const result = await getChallenge(slug);
  if (!result.ok) return <LoadError>{d.challenge.loadError}</LoadError>;
  const c = result.data;
  if (!c) notFound();

  const steps = instructionSteps(c.instructions);
  const paragraphs = descriptionParagraphs(c.description);

  return (
    <article>
      <Link href="/challenges" className="text-sm text-muted underline underline-offset-4">
        {d.challenge.allChallenges}
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        {c.category ? (
          <Link href={`/categories/${c.category.slug}`} className="underline underline-offset-4">
            {localizedCategory(d, c.category).name}
          </Link>
        ) : null}
        <StatusBadge status={c.status} d={d} />
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{c.title}</h1>
      {c.summary ? <p className="mt-3 text-lg text-muted">{c.summary}</p> : null}

      <dl className="glass mt-8 grid gap-4 rounded-lg p-5 text-sm sm:grid-cols-2">
        <Fact label={d.challenge.level} value={difficultyLabel(c.difficulty, d)} />
        <Fact label={d.challenge.evaluation} value={evaluationLabel(c.evaluation_method, d)} />
        <Fact label={d.challenge.starts} value={formatUtc(c.starts_at, lang)} />
        <Fact label={d.challenge.ends} value={formatUtc(c.ends_at, lang)} />
      </dl>

      {paragraphs.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{d.challenge.about}</h2>
          <div className="mt-3 flex flex-col gap-3 text-muted">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      ) : null}

      {steps.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{d.challenge.instructions}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <Suspense fallback={null}>
        <RubricSection challengeId={c.id} d={d} />
      </Suspense>

      <section className="glass mt-10 rounded-lg p-5">
        <h2 className="text-xl font-semibold">{d.challenge.takePart}</h2>
        <div className="mt-4">
          <JoinPanel challenge={c} d={d} lang={lang} />
        </div>
      </section>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

async function JoinPanel({
  challenge: c,
  d,
  lang,
}: {
  challenge: ChallengeDetail;
  d: Dict;
  lang: Locale;
}) {
  const user = await getCurrentUser();
  const participation = await getParticipation(c.id, user?.id ?? null);
  if (!participation.ok) return <LoadError>{d.challenge.participationError}</LoadError>;
  const { count, joined } = participation.data;
  const capacity =
    c.max_participants == null
      ? fmt(d.challenge.joinedCount, { n: count })
      : fmt(d.challenge.placesTaken, { n: count, max: c.max_participants });

  let action: React.ReactNode;
  if (joined) {
    action = (
      <p role="status" className="font-medium text-lime">
        {d.challenge.youJoined}
      </p>
    );
  } else if (c.status === "published") {
    action = <p className="text-muted">{d.challenge.joiningOpens}</p>;
  } else if (c.status !== "active") {
    action = <p className="text-muted">{d.challenge.closedToNew}</p>;
  } else if (!user) {
    action = (
      <p className="text-muted">
        <Link
          href={`/login?next=/challenges/${c.slug}`}
          className="font-medium text-lime underline underline-offset-4"
        >
          {d.challenge.loginTo}
        </Link>{" "}
        {d.challenge.or}{" "}
        <Link href="/register" className="font-medium text-lime underline underline-offset-4">
          {d.challenge.createAccountLink}
        </Link>{" "}
        {d.challenge.toJoin}
      </p>
    );
  } else if (c.max_participants != null && count >= c.max_participants) {
    action = <p className="text-muted">{d.challenge.full}</p>;
  } else {
    action = <JoinForm challengeId={c.id} slug={c.slug} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{capacity}</p>
      {action}
      {joined && user ? <SubmissionArea challenge={c} userId={user.id} d={d} lang={lang} /> : null}
    </div>
  );
}

async function RubricSection({ challengeId, d }: { challengeId: string; d: Dict }) {
  const rubric = await getRubric(challengeId);
  if (!rubric.ok || !rubric.data || rubric.data.criteria.length === 0) return null;
  const total = rubric.data.criteria.reduce((sum, k) => sum + k.max_points, 0);
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{d.challenge.rubricTitle}</h2>
      <p className="mt-2 text-sm text-muted">
        {fmt(d.challenge.rubricMeta, { version: rubric.data.version, total })}
      </p>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {rubric.data.criteria.map((k) => (
          <li key={k.key} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <span>{k.label}</span>
            <span className="text-muted">
              {k.max_points} {d.common.ptsShort}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function SubmissionArea({
  challenge: c,
  userId,
  d,
  lang,
}: {
  challenge: ChallengeDetail;
  userId: string;
  d: Dict;
  lang: Locale;
}) {
  const subs = await listMySubmissions(c.id, userId);
  if (!subs.ok) return <LoadError>{d.challenge.submissionsLoadError}</LoadError>;

  const supabase = await createClient();
  const { data: partRow } = await supabase
    .from("challenge_participants")
    .select("brief")
    .eq("challenge_id", c.id)
    .eq("user_id", userId)
    .maybeSingle();
  const brief = (partRow?.brief as string | null) ?? null;

  const evals = await listMyEvaluations(subs.data.map((s) => s.id));
  const results = evals.ok ? evals.data : [];
  const best = results.reduce<(typeof results)[number] | null>(
    (top, r) => (!top || r.total > top.total ? r : top),
    null,
  );

  // Statuses are synced with the clock on load, so "active" means before the deadline.
  const open = c.status === "active";
  const used = subs.data.length;
  const limit = c.max_submissions;

  return (
    <div className="flex flex-col gap-6 border-t border-line pt-6">
      <section className="rounded-md border border-lime/40 bg-lime/5 p-4">
        <h3 className="text-lg font-semibold">{d.ai.yourTask}</h3>
        {brief ? (
          <>
            <p className="mt-1 text-xs text-muted">{d.ai.taskNote}</p>
            <p className="mt-3 whitespace-pre-wrap break-words">{brief}</p>
          </>
        ) : (
          <div className="mt-2">
            <BriefButton challengeId={c.id} slug={c.slug} />
          </div>
        )}
      </section>

      <h3 className="text-lg font-semibold">{d.challenge.yourSubmissions}</h3>

      {best ? (
        <div className="rounded-md border border-lime/40 bg-lime/10 p-4" role="status">
          <p className="font-medium">
            {fmt(d.challenge.result, { total: best.total, max: best.maxTotal })}
          </p>
          {best.feedback ? <p className="mt-2 text-sm text-muted">{best.feedback}</p> : null}
        </div>
      ) : c.status === "completed" ? (
        <p className="text-sm text-muted">{d.challenge.noApproved}</p>
      ) : null}

      {open ? (
        used < limit ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {fmt(d.challenge.attemptOf, {
                n: used + 1,
                limit,
                deadline: formatUtc(c.ends_at, lang),
              })}
            </p>
            <SubmitForm challengeId={c.id} slug={c.slug} userId={userId} />
          </div>
        ) : (
          <p className="text-muted">{fmt(d.challenge.usedAll, { limit })}</p>
        )
      ) : (
        <p className="text-sm text-muted">{d.challenge.submissionsClosed}</p>
      )}

      {subs.data.length ? (
        <ul className="flex flex-col gap-3">
          {subs.data.map((s) => (
            <li key={s.id} className="rounded-md border border-line p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{fmt(d.challenge.version, { n: s.version })}</span>
                <span className="text-muted">{formatUtc(s.createdAt, lang)}</span>
              </div>
              <p className="mt-2 text-muted">{preview(s.content)}</p>
              {s.fileName ? (
                <p className="mt-2">
                  <a
                    href={`/api/submissions/${s.id}/file`}
                    className="text-lime underline underline-offset-4"
                  >
                    {s.fileName}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
