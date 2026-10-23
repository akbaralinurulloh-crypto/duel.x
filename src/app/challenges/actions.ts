"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GENERIC_ERROR_MESSAGE, NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import { joinErrorMessage } from "@/lib/challenges";
import { formString, type FormState } from "@/lib/forms";

const joinSchema = z.object({
  challengeId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

export async function joinChallenge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = joinSchema.safeParse({
    challengeId: formString(formData, "challengeId"),
    slug: formString(formData, "slug"),
  });
  if (!parsed.success) return { error: GENERIC_ERROR_MESSAGE };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE };

  const { challengeId, slug } = parsed.data;
  let alreadyJoined = false;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: "Log in to join this challenge." };

    // All rules (open, capacity, duplicates) are enforced in the database.
    const { data, error } = await supabase.rpc("join_challenge", {
      p_challenge_id: challengeId,
    });
    if (error) return { error: joinErrorMessage(error.message) };

    alreadyJoined = Boolean((data as { already_joined?: boolean } | null)?.already_joined);
  } catch {
    return { error: GENERIC_ERROR_MESSAGE };
  }

  revalidatePath(`/challenges/${slug}`);
  revalidatePath("/dashboard/my-challenges");
  return {
    message: alreadyJoined
      ? "You have already joined this challenge."
      : "You joined the challenge.",
  };
}
