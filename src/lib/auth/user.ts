import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The signed-in user, verified against Supabase Auth (not just read from the
 * cookie). Returns null when nobody is signed in or Supabase is not configured.
 *
 * connection() first: this must be decided per request, never frozen into a
 * prerendered page at build time.
 */
export async function getCurrentUser() {
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
