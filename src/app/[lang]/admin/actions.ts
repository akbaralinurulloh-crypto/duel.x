"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminClient } from "@/lib/admin/guard";
import { challengeSchema, parseRubricText, parseScores } from "@/lib/admin/parse";
import { formString, type FormState } from "@/lib/forms";
import { getRequestDict } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dictionaries";
import { parseCriteria } from "@/lib/submissions";
import { fieldErrors } from "@/lib/validation/auth";

const DB_ERROR_CODES = [
  "invalid_status_transition",
  "unevaluated_submissions",
  "no_rubric",
  "challenge_not_evaluable",
  "invalid_scores",
  "already_approved",
  "invalid_rubric",
] as const;

function dbMessage(message: string | undefined, d: Dict): string {
  if (!message) return d.common.generic;
  for (const code of DB_ERROR_CODES) {
    if (message.includes(code)) return d.admin.msg[code];
  }
  if (message.includes("row-level security") || message.includes("not_admin")) {
    return d.common.notAllowed;
  }
  return d.common.generic;
}

const uuid = z.uuid();

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------
function challengeFormValues(formData: FormData) {
  const keys = [
    "title", "slug", "categorySlug", "summary", "description", "instructions",
    "difficulty", "evaluationMethod", "startsAt", "endsAt", "maxParticipants", "maxSubmissions", "aiBriefGuide",
  ];
  return Object.fromEntries(keys.map((k) => [k, formString(formData, k)]));
}

export async function createChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const values = challengeFormValues(formData);
  const parsed = challengeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: d.common.fixFields, fieldErrors: fieldErrors(parsed.error, d.validation), values };
  }
  const input = parsed.data;

  let id: string;
  try {
    const { data: category } = await ctx.supabase
      .from("categories")
      .select("id")
      .eq("slug", input.categorySlug)
      .maybeSingle();
    if (!category) {
      return { error: d.common.fixFields, fieldErrors: { categorySlug: [d.admin.msg.chooseCategory] }, values };
    }

    const { data, error } = await ctx.supabase
      .from("challenges")
      .insert({
        slug: input.slug,
        category_id: category.id,
        title: input.title,
        summary: input.summary,
        description: input.description,
        instructions: input.instructions,
        difficulty: input.difficulty,
        evaluation_method: input.evaluationMethod,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        max_participants: input.maxParticipants,
        max_submissions: input.maxSubmissions,
        ai_brief_guide: input.aiBriefGuide,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: d.common.fixFields, fieldErrors: { slug: [d.admin.msg.slugUsed] }, values };
      }
      return { error: dbMessage(error.message, d), values };
    }
    id = data.id;
  } catch {
    return { error: d.common.generic, values };
  }

  revalidatePath("/admin/challenges");
  redirect(`/admin/challenges/${id}`);
}

export async function updateChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const id = formString(formData, "id");
  if (!uuid.safeParse(id).success) return { error: d.common.generic };

  const values = challengeFormValues(formData);
  const parsed = challengeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: d.common.fixFields, fieldErrors: fieldErrors(parsed.error, d.validation), values };
  }
  const input = parsed.data;

  try {
    const { data: category } = await ctx.supabase
      .from("categories")
      .select("id")
      .eq("slug", input.categorySlug)
      .maybeSingle();
    if (!category) {
      return { error: d.common.fixFields, fieldErrors: { categorySlug: [d.admin.msg.chooseCategory] }, values };
    }

    // The URL name (slug) is deliberately not editable after creation.
    const { data, error } = await ctx.supabase
      .from("challenges")
      .update({
        category_id: category.id,
        title: input.title,
        summary: input.summary,
        description: input.description,
        instructions: input.instructions,
        difficulty: input.difficulty,
        evaluation_method: input.evaluationMethod,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        max_participants: input.maxParticipants,
        max_submissions: input.maxSubmissions,
        ai_brief_guide: input.aiBriefGuide,
      })
      .eq("id", id)
      .in("status", ["draft", "published"])
      .select("id");
    if (error) return { error: dbMessage(error.message, d), values };
    if (!data || data.length !== 1) {
      return { error: d.admin.msg.onlyEditable, values };
    }
  } catch {
    return { error: d.common.generic, values };
  }

  revalidatePath(`/admin/challenges/${id}`);
  revalidatePath("/challenges", "layout");
  return { message: d.admin.msg.challengeSaved, values };
}

const STATUSES = ["published", "closed", "under_review", "completed", "cancelled"] as const;

/** Status moves. The database trigger is the authority on what is allowed. */
export async function transitionChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!uuid.safeParse(id).success || !(STATUSES as readonly string[]).includes(status)) {
    return { error: d.common.generic };
  }
  if ((status === "cancelled" || status === "closed") && formString(formData, "confirm") !== "on") {
    return { error: d.admin.msg.tickConfirm };
  }

  try {
    const { data, error } = await ctx.supabase
      .from("challenges")
      .update({ status })
      .eq("id", id)
      .select("id");
    if (error) return { error: dbMessage(error.message, d) };
    if (!data || data.length !== 1) return { error: d.common.notAllowed };
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath(`/admin/challenges/${id}`);
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges", "layout");
  revalidatePath("/leaderboard");
  return { message: d.admin.msg.statusUpdated };
}

// ---------------------------------------------------------------------------
// Rubrics and evaluation
// ---------------------------------------------------------------------------
export async function addRubricVersion(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const id = formString(formData, "id");
  if (!uuid.safeParse(id).success) return { error: d.common.generic };

  const rubric = parseRubricText(formString(formData, "criteria"), d);
  if (!rubric.ok) return { error: rubric.error, values: { criteria: formString(formData, "criteria") } };

  try {
    const { error } = await ctx.supabase
      .from("rubrics")
      .insert({ challenge_id: id, criteria: rubric.criteria });
    if (error) return { error: dbMessage(error.message, d), values: { criteria: formString(formData, "criteria") } };
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath(`/admin/challenges/${id}`);
  revalidatePath("/challenges", "layout");
  return { message: d.admin.msg.rubricSaved };
}

export async function saveEvaluation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const submissionId = formString(formData, "submissionId");
  const challengeId = formString(formData, "challengeId");
  if (!uuid.safeParse(submissionId).success || !uuid.safeParse(challengeId).success) {
    return { error: d.common.generic };
  }

  try {
    // Score against the newest rubric; the database re-validates every value.
    const { data: rubric } = await ctx.supabase
      .from("rubrics")
      .select("criteria")
      .eq("challenge_id", challengeId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!rubric) return { error: d.admin.msg.no_rubric };

    const scores = parseScores((n) => formString(formData, n), parseCriteria(rubric.criteria), d);
    if (!scores.ok) return { error: scores.error };

    const { error } = await ctx.supabase.rpc("evaluate_submission", {
      p_submission_id: submissionId,
      p_scores: scores.scores,
      p_feedback: formString(formData, "feedback").slice(0, 5000),
    });
    if (error) return { error: dbMessage(error.message, d) };
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath(`/admin/challenges/${challengeId}/submissions`);
  return { message: d.admin.msg.evalSaved };
}

export async function approveEvaluation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const evaluationId = formString(formData, "evaluationId");
  const challengeId = formString(formData, "challengeId");
  if (!uuid.safeParse(evaluationId).success || !uuid.safeParse(challengeId).success) {
    return { error: d.common.generic };
  }

  try {
    const { error } = await ctx.supabase.rpc("approve_evaluation", { p_evaluation_id: evaluationId });
    if (error) return { error: dbMessage(error.message, d) };
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath(`/admin/challenges/${challengeId}/submissions`);
  return { message: d.admin.msg.evalApproved };
}

// ---------------------------------------------------------------------------
// Company requests and categories
// ---------------------------------------------------------------------------
export async function setRequestStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!uuid.safeParse(id).success || !["new", "contacted", "closed"].includes(status)) {
    return { error: d.common.generic };
  }

  try {
    const { data, error } = await ctx.supabase
      .from("company_requests")
      .update({ status, handled_by: ctx.user.id })
      .eq("id", id)
      .select("id");
    if (error) return { error: dbMessage(error.message, d) };
    if (!data || data.length !== 1) return { error: d.common.notAllowed };
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  return { message: d.admin.msg.updated };
}

export async function setCategoryActive(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const ctx = await adminClient();
  if (!ctx) return { error: d.common.notAllowed };

  const id = formString(formData, "id");
  const active = formString(formData, "active") === "true";
  if (!uuid.safeParse(id).success) return { error: d.common.generic };

  try {
    const { data, error } = await ctx.supabase
      .from("categories")
      .update({ is_active: active })
      .eq("id", id)
      .select("id");
    if (error) return { error: dbMessage(error.message, d) };
    if (!data || data.length !== 1) return { error: d.common.notAllowed };
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  return { message: d.admin.msg.updated };
}
