import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listActiveCategories, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site-url";

// Without a configured public origin a sitemap would contain wrong URLs, so
// it stays empty until NEXT_PUBLIC_SITE_URL is set.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = siteUrl();
  if (!origin) return [];

  const entries: MetadataRoute.Sitemap = ["", "/challenges", "/categories", "/leaderboard", "/companies"].map(
    (path) => ({ url: `${origin}${path}` }),
  );
  if (!isSupabaseConfigured()) return entries;

  try {
    const [categories, challenges] = await Promise.all([
      listActiveCategories(),
      listChallenges({ page: 1 }),
    ]);
    if (categories.ok) {
      for (const c of categories.data) entries.push({ url: `${origin}/categories/${c.slug}` });
    }
    if (challenges.ok) {
      for (const c of challenges.data.items) entries.push({ url: `${origin}/challenges/${c.slug}` });
    }
  } catch {
    // Keep the static entries if the database is unreachable.
  }
  return entries;
}
