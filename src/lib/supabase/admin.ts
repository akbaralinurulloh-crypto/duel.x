import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Used ONLY to call the ai_* database functions, which
 * are executable by service_role alone. Never import this from client code.
 * Returns null when the key is not configured.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
