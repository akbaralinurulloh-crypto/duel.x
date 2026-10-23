"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOrigin } from "@/lib/auth/origin";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  GENERIC_ERROR_MESSAGE,
  NOT_CONFIGURED_MESSAGE,
  authErrorMessage,
} from "@/lib/auth/errors";
import { formString, type FormState } from "@/lib/forms";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

// NOTE: redirect() works by throwing, so it is always called OUTSIDE try/catch.

export async function register(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    displayName: formString(formData, "displayName"),
    username: formString(formData, "username"),
    primaryCategorySlug: formString(formData, "primaryCategorySlug"),
  };
  const values = {
    email: raw.email,
    displayName: raw.displayName,
    username: raw.username,
    primaryCategorySlug: raw.primaryCategorySlug,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
      values,
    };
  }
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE, values };

  const input = parsed.data;
  let signedIn = false;

  try {
    const supabase = await createClient();

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

    const { data: available, error: availableError } = await supabase.rpc(
      "is_username_available",
      { candidate: input.username },
    );
    if (availableError) return { error: GENERIC_ERROR_MESSAGE, values };
    if (available === false) {
      return {
        error: "Please fix the highlighted fields.",
        fieldErrors: { username: ["That username is taken."] },
        values,
      };
    }

    const origin = await getOrigin();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          username: input.username,
          display_name: input.displayName,
          primary_category_slug: input.primaryCategorySlug,
        },
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) return { error: authErrorMessage(error, "register"), values };

    signedIn = Boolean(data.session);
  } catch {
    return { error: GENERIC_ERROR_MESSAGE, values };
  }

  if (signedIn) redirect("/dashboard");

  // Email confirmation is enabled: no session until the link is clicked.
  return {
    message:
      "Check your inbox: we sent a confirmation link. Open it to finish creating your account.",
  };
}

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  };
  const next = safeNextPath(formString(formData, "next"));
  const values = { email: raw.email };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
      values,
    };
  }
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE, values };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: authErrorMessage(error, "login"), values };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE, values };
  }

  redirect(next);
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function forgotPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = { email: formString(formData, "email") };
  const values = { email: raw.email };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
      values,
    };
  }
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE, values };

  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${origin}/auth/callback?next=/reset-password` },
    );
    if (error) return { error: authErrorMessage(error, "forgot"), values };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE, values };
  }

  // Same answer whether or not the address has an account (no enumeration).
  return {
    message:
      "If an account exists for that email, we sent a link to reset the password.",
  };
}

export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE };

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return {
        error: "This reset link is invalid or has expired. Request a new one.",
      };
    }
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return { error: authErrorMessage(error, "reset") };
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  redirect("/dashboard");
}
