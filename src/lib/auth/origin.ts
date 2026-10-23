import "server-only";
import { headers } from "next/headers";

/**
 * The public origin used in auth email links. Prefer an explicit
 * NEXT_PUBLIC_SITE_URL; otherwise derive it from the request. Whatever we
 * produce must also be allow-listed in Supabase (Auth → URL Configuration).
 */
export async function getOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host && host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
