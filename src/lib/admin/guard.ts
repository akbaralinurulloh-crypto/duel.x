import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side admin check for pages. Signed-out visitors go to login; signed-in
 * non-admins get a 404 (the admin area is not advertised). This is one layer:
 * every admin write is ALSO enforced by row-level security and by
 * security-definer functions that call is_admin() in the database.
 */
export async function requireAdmin() {
  await connection();
  if (!isSupabaseConfigured()) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) notFound();
  return { supabase, user };
}

/** For server actions: never redirect or 404, just report. */
export async function adminClient() {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) return null;
  return { supabase, user };
}
