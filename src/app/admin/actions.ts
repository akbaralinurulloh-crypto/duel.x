"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminClient } from "@/lib/admin/guard";
import { challengeSchema, parseRubricText, parseScores } from "@/lib/admin/parse";
import { GENERIC_ERROR_MESSAGE } from "@/lib/auth/errors";
import { formString, type FormState } from "@/lib/forms";
import { parseCriteria } from "@/lib/submissions";
import { fieldErrors } from "@/lib/validation/auth";

const NOT_ALLOWED = "You do not have permission to do this.";

const ERROR_TEXT: Record<string, string> = {
  invalid_status_transition: "That status change is not allowed from the current status.",
  unevaluated_submissions:
    "Every participant's latest submission needs an approved evaluation before completing.",
  no_rubric: "Add a rubric before evaluating.",
  challenge_not_evaluable: "Evaluation is only possible after the challenge has closed.",
  invalid_scores: "The scores do not match the rubric.",
  already_approved: "This evaluation is already approved and cannot be changed.",
  invalid_rubric: "The rubric was rejected. Check keys, labels and points.",
};

function dbMessage(message: string | undefined): string {
  if (!message) return GENERIC_ERROR_MESSAGE;
  for (const [code, text] of Object.entries(ERROR_TEXT)) {
    if (message.includes(code)) return text;
  }
  if (message.includes("row-level security") || message.includes("not_admin")) return NOT_ALLOWED;
  return GENERIC_ERROR_MESSAGE;
}

const uuid = z.uuid();

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------
function challengeFormValues(formData: FormData) {
  const keys = [
    "title", "slug", "categorySlug", "summary", "description", "instructions",
    "difficulty", "evaluationMethod", "startsAt", "endsAt", "maxParticipants", "maxSubmissions",
  ];
  return Object.fromEntries(keys.map((k) => [k, formString(formData, k)]));
}

export async function createChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const values = challengeFormValues(formData);
  const parsed = challengeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
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
      return { error: "Please fix the highlighted fields.", fieldErrors: { categorySlug: ["Choose a category."] }, values };
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
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "Please fix the highlighted fields.", fieldErrors: { slug: ["This URL name is already used."] }, values };
      }
      return { error: dbMessage(error.message), values };
    }
    id = data.id;
  } catch {
    return { error: GENERIC_ERROR_MESSAGE, values };
  }

  revalidatePath("/admin/challenges");
  redirect(`/admin/challenges/${id}`);
}

export async function updateChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const id = formString(formData, "id");
  if (!uuid.safeParse(id).success) return { error: GENERIC_ERROR_MESSAGE };

  const values = challengeFormValues(formData);
  const parsed = challengeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
  }
  const input = parsed.data;

  try {
    const { data: category } = await ctx.supabase
      .from("categories")
      .select("id")
      .eq("slug", input.categorySlug)
      .maybeSingle();
    if (!category) {
      return { error: "Please fix the highlighted fields.", fieldErrors: { categorySlug: ["Choose a category."] }, values };
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
      })
      .eq("id", id)
      .in("status", ["draft", "published"])
      .select("id");
    if (error) return { error: dbMessage(error.message), values };
    if (!data || data.length !== 1) {
      return { error: "Only draft or published challenges can be edited.", values };
    }
  } catch {
    return { error: GENERIC_ERROR_MESSAGE, values };
  }

  revalidatePath(`/admin/challenges/${id}`);
  revalidatePath("/challenges", "layout");
  return { message: "Challenge saved.", values };
}

const STATUSES = ["published", "closed", "under_review", "completed", "cancelled"] as const;

/** Status moves. The database trigger is the authority on what is allowed. */
export async function transitionChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!uuid.safeParse(id).success || !(STATUSES as readonly string[]).includes(status)) {
    return { error: GENERIC_ERROR_MESSAGE };
  }
  if ((status === "cancelled" || status === "closed") && formString(formData, "confirm") !== "on") {
    return { error: "Tick the box to confirm." };
  }

  try {
    const { data, error } = await ctx.supabase
      .from("challenges")
      .update({ status })
      .eq("id", id)
      .select("id");
    if (error) return { error: dbMessage(error.message) };
    if (!data || data.length !== 1) return { error: NOT_ALLOWED };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath(`/admin/challenges/${id}`);
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges", "layout");
  revalidatePath("/leaderboard");
  return { message: "Status updated." };
}

// ---------------------------------------------------------------------------
// Rubrics and evaluation
// ---------------------------------------------------------------------------
export async function addRubricVersion(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const id = formString(formData, "id");
  if (!uuid.safeParse(id).success) return { error: GENERIC_ERROR_MESSAGE };

  const rubric = parseRubricText(formString(formData, "criteria"));
  if (!rubric.ok) return { error: rubric.error, values: { criteria: formString(formData, "criteria") } };

  try {
    const { error } = await ctx.supabase
      .from("rubrics")
      .insert({ challenge_id: id, criteria: rubric.criteria });
    if (error) return { error: dbMessage(error.message), values: { criteria: formString(formData, "criteria") } };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath(`/admin/challenges/${id}`);
  revalidatePath("/challenges", "layout");
  return { message: "New rubric version saved." };
}

export async function saveEvaluation(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const submissionId = formString(formData, "submissionId");
  const challengeId = formString(formData, "challengeId");
  if (!uuid.safeParse(submissionId).success || !uuid.safeParse(challengeId).success) {
    return { error: GENERIC_ERROR_MESSAGE };
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
    if (!rubric) return { error: ERROR_TEXT.no_rubric };

    const scores = parseScores((n) => formString(formData, n), parseCriteria(rubric.criteria));
    if (!scores.ok) return { error: scores.error };

    const { error } = await ctx.supabase.rpc("evaluate_submission", {
      p_submission_id: submissionId,
      p_scores: scores.scores,
      p_feedback: formString(formData, "feedback").slice(0, 5000),
    });
    if (error) return { error: dbMessage(error.message) };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath(`/admin/challenges/${challengeId}/submissions`);
  return { message: "Evaluation saved as draft." };
}

export async function approveEvaluation(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const evaluationId = formString(formData, "evaluationId");
  const challengeId = formString(formData, "challengeId");
  if (!uuid.safeParse(evaluationId).success || !uuid.safeParse(challengeId).success) {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  try {
    const { error } = await ctx.supabase.rpc("approve_evaluation", { p_evaluation_id: evaluationId });
    if (error) return { error: dbMessage(error.message) };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath(`/admin/challenges/${challengeId}/submissions`);
  return { message: "Evaluation approved." };
}

// ---------------------------------------------------------------------------
// Company requests and categories
// ---------------------------------------------------------------------------
export async function setRequestStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!uuid.safeParse(id).success || !["new", "contacted", "closed"].includes(status)) {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  try {
    const { data, error } = await ctx.supabase
      .from("company_requests")
      .update({ status, handled_by: ctx.user.id })
      .eq("id", id)
      .select("id");
    if (error) return { error: dbMessage(error.message) };
    if (!data || data.length !== 1) return { error: NOT_ALLOWED };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  return { message: "Updated." };
}

export async function setCategoryActive(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await adminClient();
  if (!ctx) return { error: NOT_ALLOWED };

  const id = formString(formData, "id");
  const active = formString(formData, "active") === "true";
  if (!uuid.safeParse(id).success) return { error: GENERIC_ERROR_MESSAGE };

  try {
    const { data, error } = await ctx.supabase
      .from("categories")
      .update({ is_active: active })
      .eq("id", id)
      .select("id");
    if (error) return { error: dbMessage(error.message) };
    if (!data || data.length !== 1) return { error: NOT_ALLOWED };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  return { message: "Updated." };
}
