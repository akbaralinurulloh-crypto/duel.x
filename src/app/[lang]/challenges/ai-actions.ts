"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestDict } from "@/lib/i18n/server";
import { isAiConfigured } from "@/lib/ai/client";
import { createBrief } from "@/lib/ai/brief";
import { evaluateSubmission } from "@/lib/ai/evaluate";
import type { FormState } from "@/lib/forms";

const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Writes (once) this participant's personal task. */
export async function requestBrief(challengeId: string, slug: string): Promise<FormState> {
  const { d, locale } = await getRequestDict();
  if (!z.uuid().safeParse(challengeId).success || !slugRe.test(slug)) return { error: d.common.generic };
  if (!isSupabaseConfigured()) return { error: d.common.notConfigured };
  if (!isAiConfigured()) return { error: d.ai.notConfigured };

  try {
    const supabase = await createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { error: d.submitErrors.not_authenticated };

    const [{ data: part }, { data: c }] = await Promise.all([
      supabase.from("challenge_participants").select("brief, status").eq("challenge_id", challengeId).eq("user_id", u.user.id).maybeSingle(),
      supabase.from("challenges").select("title, description, instructions, ai_brief_guide").eq("id", challengeId).maybeSingle(),
    ]);
    if (!part || part.status === "withdrawn" || !c) return { error: d.common.generic };
    if (!part.brief) {
      const brief = await createBrief(challengeId, u.user.id, c, locale);
      if (!brief) return { error: d.ai.taskFailed };
    }
  } catch {
    return { error: d.ai.taskFailed };
  }
  revalidatePath(`/challenges/${slug}`);
  return { message: d.ai.yourTask };
}

const analyzeSchema = z.object({
  challengeId: z.uuid(),
  slug: z.string().regex(slugRe),
  framePaths: z.array(z.string().max(300)).max(8),
});

/** AI-drafts an evaluation for the caller's latest submission. */
export async function analyzeLatestSubmission(input: {
  challengeId: string;
  slug: string;
  framePaths: string[];
}): Promise<FormState> {
  const { d, locale } = await getRequestDict();
  const parsed = analyzeSchema.safeParse(input);
  if (!parsed.success) return { error: d.common.generic };
  if (!isSupabaseConfigured()) return { error: d.common.notConfigured };
  if (!isAiConfigured()) return { message: d.ai.analysisSkipped };

  const { challengeId, slug, framePaths } = parsed.data;
  try {
    const supabase = await createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { error: d.submitErrors.not_authenticated };

    const { data: latest } = await supabase
      .from("submissions")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", u.user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return { error: d.common.generic };

    // One AI review per submission (each call costs money).
    const service = createServiceClient();
    const { data: existing } = await service!.from("evaluations").select("id").eq("submission_id", latest.id).maybeSingle();
    if (existing) return { message: d.ai.alreadyAnalyzed };

    const out = await evaluateSubmission({
      supabase,
      userId: u.user.id,
      submissionId: latest.id,
      framePaths,
      locale,
    });
    revalidatePath(`/challenges/${slug}`);
    if (out.ok) return { message: d.ai.analysisSaved };
    if (out.reason === "no_rubric" || out.reason === "not_configured") return { message: d.ai.analysisSkipped };
    return { message: d.ai.analysisFailed };
  } catch {
    return { message: d.ai.analysisFailed };
  }
}
