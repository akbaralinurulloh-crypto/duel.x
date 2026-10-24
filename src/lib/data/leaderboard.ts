import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/data/challenges";

type BoardRaw = {
  rank: number | string;
  username: string;
  display_name: string;
  completed_challenges: number;
  points: number | string;
};

type PortfolioRaw = {
  challenge_slug: string;
  challenge_title: string;
  category_slug: string;
  category_name: string;
  percent: number | string;
  ended_at: string;
};

export type LeaderboardRow = {
  rank: number;
  username: string;
  displayName: string;
  completed: number;
  points: number;
};

export async function getLeaderboard(
  categorySlug: string | null,
): Promise<Result<LeaderboardRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("category_leaderboard", {
    p_category_slug: categorySlug,
    p_limit: 50,
  });
  if (error || !data) return { ok: false };
  return {
    ok: true,
    data: (data as BoardRaw[]).map((r) => ({
      rank: Number(r.rank),
      username: r.username,
      displayName: r.display_name,
      completed: r.completed_challenges,
      points: Number(r.points),
    })),
  };
}

export type PublicProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  createdAt: string;
  categoryName: string | null;
  categorySlug: string | null;
  isPublic: boolean;
};

export async function getPublicProfile(username: string): Promise<Result<PublicProfile | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, bio, created_at, is_public, primary_category_id")
    .eq("username", username)
    .maybeSingle();
  if (error) return { ok: false };
  if (!data) return { ok: true, data: null };

  let categoryName: string | null = null;
  let categorySlug: string | null = null;
  if (data.primary_category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("slug, name")
      .eq("id", data.primary_category_id)
      .maybeSingle();
    categoryName = cat?.name ?? null;
    categorySlug = cat?.slug ?? null;
  }
  return {
    ok: true,
    data: {
      username: data.username,
      displayName: data.display_name,
      bio: data.bio,
      createdAt: data.created_at,
      categoryName,
      categorySlug,
      isPublic: data.is_public,
    },
  };
}

export type PortfolioItem = {
  challengeSlug: string;
  challengeTitle: string;
  categorySlug: string;
  categoryName: string;
  percent: number;
  endedAt: string;
};

export async function getPortfolio(username: string): Promise<Result<PortfolioItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_portfolio", { p_username: username });
  if (error || !data) return { ok: false };
  return {
    ok: true,
    data: (data as PortfolioRaw[]).map((r) => ({
      challengeSlug: r.challenge_slug,
      challengeTitle: r.challenge_title,
      categorySlug: r.category_slug,
      categoryName: r.category_name,
      percent: Number(r.percent),
      endedAt: r.ended_at,
    })),
  };
}
