import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseCriteria, type RubricCriterion } from "@/lib/submissions";
import type { Result } from "@/lib/data/challenges";

export type MySubmission = {
  id: string;
  version: number;
  content: string;
  fileName: string | null;
  createdAt: string;
};

export type MyEvaluation = {
  submissionId: string;
  total: number;
  maxTotal: number;
  scores: Record<string, number>;
  feedback: string | null;
};

export async function listMySubmissions(
  challengeId: string,
  userId: string,
): Promise<Result<MySubmission[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, version, content, file_name, created_at")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .order("version", { ascending: false });
  if (error || !data) return { ok: false };
  return {
    ok: true,
    data: data.map((r) => ({
      id: r.id,
      version: r.version,
      content: r.content,
      fileName: r.file_name,
      createdAt: r.created_at,
    })),
  };
}

export async function getRubric(
  challengeId: string,
): Promise<Result<{ version: number; criteria: RubricCriterion[] } | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rubrics")
    .select("version, criteria")
    .eq("challenge_id", challengeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false };
  if (!data) return { ok: true, data: null };
  return { ok: true, data: { version: data.version, criteria: parseCriteria(data.criteria) } };
}

/** Row-level security only returns approved evaluations of a completed challenge. */
export async function listMyEvaluations(
  submissionIds: string[],
): Promise<Result<MyEvaluation[]>> {
  if (submissionIds.length === 0) return { ok: true, data: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .select("submission_id, total, max_total, scores, feedback")
    .in("submission_id", submissionIds);
  if (error || !data) return { ok: false };
  return {
    ok: true,
    data: data.map((r) => ({
      submissionId: r.submission_id,
      total: Number(r.total),
      maxTotal: Number(r.max_total),
      scores: (r.scores ?? {}) as Record<string, number>,
      feedback: r.feedback,
    })),
  };
}
