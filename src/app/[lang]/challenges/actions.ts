"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestDict } from "@/lib/i18n/server";
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
  const { d } = await getRequestDict();
  const parsed = joinSchema.safeParse({
    challengeId: formString(formData, "challengeId"),
    slug: formString(formData, "slug"),
  });
  if (!parsed.success) return { error: d.common.generic };
  if (!isSupabaseConfigured()) return { error: d.common.notConfigured };

  const { challengeId, slug } = parsed.data;
  let alreadyJoined = false;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: d.joinErrors.not_authenticated };

    // All rules (open, capacity, duplicates) are enforced in the database.
    const { data, error } = await supabase.rpc("join_challenge", {
      p_challenge_id: challengeId,
    });
    if (error) return { error: joinErrorMessage(error.message, d) };

    alreadyJoined = Boolean((data as { already_joined?: boolean } | null)?.already_joined);
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath(`/challenges/${slug}`);
  revalidatePath("/dashboard/my-challenges");
  return {
    message: alreadyJoined ? d.joinErrors.alreadyJoined : d.joinErrors.joined,
  };
}
