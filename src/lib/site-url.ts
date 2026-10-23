/** Public origin for metadata/sitemap. Undefined when not configured. */
export function siteUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!v) return undefined;
  try {
    return new URL(v).origin;
  } catch {
    return undefined;
  }
}
