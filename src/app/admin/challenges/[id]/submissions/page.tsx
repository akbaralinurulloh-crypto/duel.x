import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { EvaluationForm } from "@/components/admin/evaluation-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc } from "@/lib/challenges";
import { parseCriteria } from "@/lib/submissions";

export const metadata: Metadata = { title: "Submissions" };

export default function SubmissionsPage({ params }: PageProps<"/admin/challenges/[id]/submissions">) {
  return (
    <section>
      <Suspense fallback={<FormSkeleton />}>
        <Submissions params={params} />
      </Suspense>
    </section>
  );
}

async function Submissions({ params }: { params: PageProps<"/admin/challenges/[id]/submissions">["params"] }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  await supabase.rpc("sync_challenge_statuses");
  const [challenge, subs, rubric] = await Promise.all([
    supabase.from("challenges").select("id, title, status").eq("id", id).maybeSingle(),
    supabase
      .from("submissions")
      .select("id, user_id, version, content, file_name, created_at, profiles(username, display_name)")
      .eq("challenge_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("rubrics").select("criteria").eq("challenge_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (challenge.error || subs.error || rubric.error) return <LoadError>Could not load submissions.</LoadError>;
  if (!challenge.data) notFound();

  // Latest version per participant is the one that is evaluated.
  const latest = new Map<string, NonNullable<typeof subs.data>[number]>();
  for (const s of subs.data ?? []) {
    const current = latest.get(s.user_id);
    if (!current || s.version > current.version) latest.set(s.user_id, s);
  }
  const rows = [...latest.values()];

  const evals = rows.length
    ? await supabase
        .from("evaluations")
        .select("id, submission_id, status, scores, feedback, total, max_total")
        .in("submission_id", rows.map((r) => r.id))
    : { data: [], error: null };
  if (evals.error) return <LoadError>Could not load evaluations.</LoadError>;
  const evalBySubmission = new Map((evals.data ?? []).map((e) => [e.submission_id, e]));

  const criteria = parseCriteria(rubric.data?.criteria);
  const evaluable = ["closed", "under_review"].includes(challenge.data.status);
  const approvedCount = rows.filter((r) => evalBySubmission.get(r.id)?.status === "approved").length;

  return (
    <>
      <Link href={`/admin/challenges/${id}`} className="text-sm text-muted underline underline-offset-4">Back to challenge</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{challenge.data.title}</h1>
      <p className="mt-2 text-muted">
        {rows.length} participant{rows.length === 1 ? "" : "s"} submitted · {approvedCount} approved
      </p>
      {!evaluable ? (
        <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          Evaluation opens after the challenge closes (status: {challenge.data.status}).
        </p>
      ) : criteria.length === 0 ? (
        <p className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          Add a rubric on the challenge page before evaluating.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-8 text-muted">No submissions.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {rows.map((s) => {
            const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            const ev = evalBySubmission.get(s.id);
            return (
              <li key={s.id} className="rounded-lg border border-line bg-surface">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-5">
                    <span className="font-medium">
                      {profile?.display_name ?? "Unknown"} <span className="text-muted">@{profile?.username}</span>
                    </span>
                    <span className="text-sm text-muted">
                      v{s.version} · {formatUtc(s.created_at)} ·{" "}
                      {ev ? `${ev.status === "approved" ? "Approved" : "Draft"} ${Number(ev.total)}/${Number(ev.max_total)}` : "Not evaluated"}
                    </span>
                  </summary>
                  <div className="flex flex-col gap-5 border-t border-line p-5">
                    <div>
                      <h2 className="text-sm font-medium text-muted">Answer</h2>
                      <p className="mt-2 whitespace-pre-wrap break-words">{s.content}</p>
                      {s.file_name ? (
                        <p className="mt-3 text-sm">
                          <a href={`/api/submissions/${s.id}/file`} className="text-lime underline underline-offset-4">{s.file_name}</a>
                        </p>
                      ) : null}
                    </div>
                    {evaluable && criteria.length > 0 ? (
                      <EvaluationForm
                        submissionId={s.id}
                        challengeId={id}
                        criteria={criteria}
                        saved={ev ? { evaluationId: ev.id, status: ev.status, scores: (ev.scores ?? {}) as Record<string, number>, feedback: ev.feedback } : null}
                      />
                    ) : null}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
