import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { transitionChallenge } from "@/app/[lang]/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { RubricForm } from "@/components/admin/rubric-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { requireAdmin } from "@/lib/admin/guard";
import { toUtcLocal } from "@/lib/admin/parse";
import { instructionSteps } from "@/lib/challenges";
import type { Dict } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/config";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { parseCriteria } from "@/lib/submissions";

export const generateMetadata = (props: PageProps<"/[lang]/admin/challenges/[id]">) =>
  localizedMetadata(props.params, (d) => ({ title: d.admin.manage.metaTitle }));

export default function ManageChallengePage({ params }: PageProps<"/[lang]/admin/challenges/[id]">) {
  return (
    <section>
      <Suspense fallback={<FormSkeleton />}>
        <Manage params={params} />
      </Suspense>
    </section>
  );
}

type Move = { status: string; label: string; confirm?: string };

function movesFor(status: string, d: Dict): Move[] {
  const m = d.admin.manage;
  const cancel: Move = { status: "cancelled", label: m.cancel, confirm: m.cancelConfirm };
  switch (status) {
    case "draft": return [{ status: "published", label: m.publish }, cancel];
    case "published": return [cancel];
    case "active": return [{ status: "closed", label: m.closeNow, confirm: m.closeConfirm }, cancel];
    case "closed": return [{ status: "under_review", label: m.startReview }, cancel];
    case "under_review": return [{ status: "completed", label: m.complete }, cancel];
    default: return [];
  }
}

async function Manage({ params }: { params: PageProps<"/[lang]/admin/challenges/[id]">["params"] }) {
  const { d } = await langFromParams(params);
  const m = d.admin.manage;
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  await supabase.rpc("sync_challenge_statuses");
  const [challengeRes, categoriesRes, rubricRes] = await Promise.all([
    supabase.from("challenges").select("*, categories(slug)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("slug, name").order("display_order"),
    supabase.from("rubrics").select("version, criteria").eq("challenge_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (challengeRes.error || categoriesRes.error || rubricRes.error) {
    return <LoadError>{m.loadError}</LoadError>;
  }
  const c = challengeRes.data;
  if (!c) notFound();

  const cat = Array.isArray(c.categories) ? c.categories[0] : c.categories;
  const editable = c.status === "draft" || c.status === "published";
  const criteria = parseCriteria(rubricRes.data?.criteria);
  const rubricText = criteria.map((k) => `${k.key} | ${k.label} | ${k.max_points}`).join("\n");
  const moves = movesFor(c.status, d);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
        <StatusBadge status={c.status} d={d} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {c.status === "draft" ? m.notPublic : (
          <Link href={`/challenges/${c.slug}`} className="underline underline-offset-4">{m.viewPublic}</Link>
        )}
        {" · "}
        <Link href={`/admin/challenges/${c.id}/submissions`} className="underline underline-offset-4">{m.submissionsLink}</Link>
      </p>

      <h2 className="mt-10 text-xl font-semibold">{m.status}</h2>
      {moves.length === 0 ? (
        <p className="mt-3 text-muted">{m.final}</p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {moves.map((m) => (
            <ActionForm key={m.status} action={transitionChallenge} hidden={{ id: c.id, status: m.status }} label={m.label} confirmLabel={m.confirm} />
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted">
        {m.autoNote}
      </p>

      <h2 className="mt-10 text-xl font-semibold">{m.details}</h2>
      <div className="mt-4">
        {editable ? (
          <ChallengeForm
            mode="edit"
            categories={categoriesRes.data ?? []}
            initial={{
              id: c.id,
              title: c.title,
              slug: c.slug,
              categorySlug: cat?.slug ?? "",
              summary: c.summary ?? "",
              description: c.description ?? "",
              instructions: instructionSteps(c.instructions).join("\n"),
              difficulty: c.difficulty,
              evaluationMethod: c.evaluation_method,
              startsAt: toUtcLocal(c.starts_at),
              endsAt: toUtcLocal(c.ends_at),
              maxParticipants: c.max_participants == null ? "" : String(c.max_participants),
              maxSubmissions: String(c.max_submissions),
            }}
          />
        ) : (
          <p className="text-muted">{m.locked}</p>
        )}
      </div>

      <h2 className="mt-10 text-xl font-semibold">{m.rubric}</h2>
      <p className="mt-2 text-sm text-muted">
        {rubricRes.data ? fmt(m.rubricCurrent, { version: rubricRes.data.version }) : m.rubricNone}
      </p>
      <div className="mt-4">
        <RubricForm challengeId={c.id} initial={rubricText} />
      </div>
    </>
  );
}
