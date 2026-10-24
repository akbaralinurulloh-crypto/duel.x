"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequestDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";
import { formString, type FormState } from "@/lib/forms";
import { MAX_CONTENT_LENGTH, MAX_FILE_BYTES, submitErrorMessage } from "@/lib/submissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const submitSchema = z.object({
  challengeId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  content: z.string().trim().min(1, "write_answer").max(MAX_CONTENT_LENGTH, "too_long"),
  filePath: z.string().max(300).optional(),
  fileName: z.string().min(1).max(200).optional(),
  fileSize: z.coerce.number().int().min(1).max(MAX_FILE_BYTES).optional(),
});

/**
 * The browser uploads the file straight to private Storage (Vercel limits
 * request bodies to a few MB), then calls this with the text and the path. All
 * rules — participation, deadline, attempt limit, path ownership — are enforced
 * by submit_solution() in the database.
 */
export async function submitSolution(_prev: FormState, formData: FormData): Promise<FormState> {
  const { d } = await getRequestDict();
  const optional = (key: string) => formString(formData, key) || undefined;
  const parsed = submitSchema.safeParse({
    challengeId: formString(formData, "challengeId"),
    slug: formString(formData, "slug"),
    content: formString(formData, "content"),
    filePath: optional("filePath"),
    fileName: optional("fileName"),
    fileSize: optional("fileSize"),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    if (message === "write_answer") return { error: d.submit.writeAnswer };
    if (message === "too_long") return { error: d.submit.tooLong };
    return { error: d.common.generic };
  }
  if (!isSupabaseConfigured()) return { error: d.common.notConfigured };

  const { challengeId, slug, content, filePath, fileName, fileSize } = parsed.data;
  let version: number;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: d.submitErrors.not_authenticated };

    const { data, error } = await supabase.rpc("submit_solution", {
      p_challenge_id: challengeId,
      p_content: content,
      p_file_path: filePath ?? null,
      p_file_name: fileName ?? null,
      p_file_size: fileSize ?? null,
    });
    if (error) return { error: submitErrorMessage(error.message, d) };
    version = Number((data as { version?: number } | null)?.version ?? 0);
  } catch {
    return { error: d.common.generic };
  }

  revalidatePath(`/challenges/${slug}`);
  return { message: fmt(d.submit.saved, { version }) };
}
