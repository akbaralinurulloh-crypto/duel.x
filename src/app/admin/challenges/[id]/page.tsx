import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { transitionChallenge } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { RubricForm } from "@/components/admin/rubric-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { StatusBadge } from "@/components/challenges/challenge-card";
import { requireAdmin } from "@/lib/admin/guard";
import { toUtcLocal } from "@/lib/admin/parse";
import { instructionSteps } from "@/lib/challenges";
import { parseCriteria } from "@/lib/submissions";

export const metadata: Metadata = { title: "Manage challenge" };

export default function ManageChallengePage({ params }: PageProps<"/admin/challenges/[id]">) {
  return (
    <section>
      <Suspense fallback={<FormSkeleton />}>
        <Manage params={params} />
      </Suspense>
    </section>
  );
}

type Move = { status: string; label: string; confirm?: string };

const MOVES: Record<string, Move[]> = {
  draft: [{ status: "published", label: "Publish" }, { status: "cancelled", label: "Cancel challenge", confirm: "I understand this cannot be undone." }],
  published: [{ status: "cancelled", label: "Cancel challenge", confirm: "I understand this cannot be undone." }],
  active: [
    { status: "closed", label: "Close submissions now", confirm: "Participants will no longer be able to submit." },
    { status: "cancelled", label: "Cancel challenge", confirm: "I understand this cannot be undone." },
  ],
  closed: [{ status: "under_review", label: "Start review" }, { status: "cancelled", label: "Cancel challenge", confirm: "I understand this cannot be undone." }],
  under_review: [{ status: "completed", label: "Complete and release results" }, { status: "cancelled", label: "Cancel challenge", confirm: "I understand this cannot be undone." }],
};

async function Manage({ params }: { params: PageProps<"/admin/challenges/[id]">["params"] }) {
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
    return <LoadError>Could not load this challenge.</LoadError>;
  }
  const c = challengeRes.data;
  if (!c) notFound();

  const cat = Array.isArray(c.categories) ? c.categories[0] : c.categories;
  const editable = c.status === "draft" || c.status === "published";
  const criteria = parseCriteria(rubricRes.data?.criteria);
  const rubricText = criteria.map((k) => `${k.key} | ${k.label} | ${k.max_points}`).join("\n");
  const moves = MOVES[c.status] ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
        <StatusBadge status={c.status} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {c.status === "draft" ? "Not public yet." : (
          <Link href={`/challenges/${c.slug}`} className="underline underline-offset-4">View public page</Link>
        )}
        {" · "}
        <Link href={`/admin/challenges/${c.id}/submissions`} className="underline underline-offset-4">Submissions and evaluation</Link>
      </p>

      <h2 className="mt-10 text-xl font-semibold">Status</h2>
      {moves.length === 0 ? (
        <p className="mt-3 text-muted">This challenge is final.</p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {moves.map((m) => (
            <ActionForm key={m.status} action={transitionChallenge} hidden={{ id: c.id, status: m.status }} label={m.label} confirmLabel={m.confirm} />
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted">
        Published challenges open and close automatically at their start and end times.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Details</h2>
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
          <p className="text-muted">Details are locked once a challenge has started.</p>
        )}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Rubric</h2>
      <p className="mt-2 text-sm text-muted">
        {rubricRes.data ? `Current version: v${rubricRes.data.version}.` : "No rubric yet. Participants see it on the challenge page, and it is required before evaluation."}
      </p>
      <div className="mt-4">
        <RubricForm challengeId={c.id} initial={rubricText} />
      </div>
    </>
  );
}
