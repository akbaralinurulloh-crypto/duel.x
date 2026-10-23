"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GENERIC_ERROR_MESSAGE, NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import { formString, type FormState } from "@/lib/forms";
import { fieldErrors, profileSchema } from "@/lib/validation/auth";

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    displayName: formString(formData, "displayName"),
    bio: formString(formData, "bio"),
    primaryCategorySlug: formString(formData, "primaryCategorySlug"),
    isPublic: formData.get("isPublic") === "on",
  };
  const values = {
    displayName: raw.displayName,
    bio: raw.bio,
    primaryCategorySlug: raw.primaryCategorySlug,
    isPublic: String(raw.isPublic),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
      values,
    };
  }
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE, values };

  const input = parsed.data;

  try {
    const supabase = await createClient();

    // Verified against Supabase Auth; the update below is additionally limited
    // to this user's own row by RLS.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { error: "Your session has expired. Please log in again.", values };
    }

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", input.primaryCategorySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (categoryError) return { error: GENERIC_ERROR_MESSAGE, values };
    if (!category) {
      return {
        error: "Please fix the highlighted fields.",
        fieldErrors: { primaryCategorySlug: ["Choose a main category."] },
        values,
      };
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        bio: input.bio,
        primary_category_id: category.id,
        is_public: input.isPublic,
      })
      .eq("id", userData.user.id)
      .select("id");

    // Zero rows means nothing was saved (for example, blocked by RLS).
    if (error || !updated || updated.length !== 1) {
      return { error: GENERIC_ERROR_MESSAGE, values };
    }
  } catch {
    return { error: GENERIC_ERROR_MESSAGE, values };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Profile saved.", values };
}
