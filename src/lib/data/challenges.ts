import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  PAGE_SIZE,
  STATUS_FILTERS,
  type CatalogParams,
  type CategoryRef,
  type ChallengeDetail,
  type ChallengeSummary,
} from "@/lib/challenges";

export type Result<T> = { ok: true; data: T } | { ok: false };

type Row = Record<string, unknown>;

const SUMMARY_COLUMNS =
  "slug, title, summary, difficulty, status, starts_at, ends_at, max_participants, categories!inner(slug, name)";

function toCategory(raw: unknown): CategoryRef | null {
  const c = (Array.isArray(raw) ? raw[0] : raw) as Row | null | undefined;
  if (!c || typeof c.slug !== "string" || typeof c.name !== "string") return null;
  return { slug: c.slug, name: c.name };
}

function toSummary(r: Row): ChallengeSummary {
  return {
    slug: String(r.slug),
    title: String(r.title),
    summary: (r.summary as string | null) ?? null,
    difficulty: String(r.difficulty),
    status: String(r.status),
    starts_at: String(r.starts_at),
    ends_at: String(r.ends_at),
    max_participants: (r.max_participants as number | null) ?? null,
    category: toCategory(r.categories),
  };
}

/** Idempotent clock-driven status update; a failure just means stale statuses. */
async function syncStatuses(supabase: Awaited<ReturnType<typeof createClient>>) {
  await supabase.rpc("sync_challenge_statuses");
}

export async function listChallenges(
  params: CatalogParams,
): Promise<Result<{ items: ChallengeSummary[]; total: number }>> {
  const supabase = await createClient();
  await syncStatuses(supabase);

  let query = supabase
    .from("challenges")
    .select(SUMMARY_COLUMNS, { count: "exact" });
  if (params.category) query = query.eq("categories.slug", params.category);
  if (params.status) query = query.in("status", [...STATUS_FILTERS[params.status]]);
  if (params.difficulty) query = query.eq("difficulty", params.difficulty);

  const from = (params.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("starts_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // PGRST103: the requested page is past the end. That is an empty page.
  if (error?.code === "PGRST103") return { ok: true, data: { items: [], total: 0 } };
  if (error || !data) return { ok: false };

  return {
    ok: true,
    data: { items: (data as Row[]).map(toSummary), total: count ?? data.length },
  };
}

export async function getChallenge(
  slug: string,
): Promise<Result<ChallengeDetail | null>> {
  const supabase = await createClient();
  await syncStatuses(supabase);

  const { data, error } = await supabase
    .from("challenges")
    .select(
      "id, slug, title, summary, description, instructions, difficulty, status, starts_at, ends_at, max_participants, evaluation_method, max_submissions, categories!inner(slug, name)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) return { ok: false };
  if (!data) return { ok: true, data: null };

  const r = data as Row;
  return {
    ok: true,
    data: {
      ...toSummary(r),
      id: String(r.id),
      description: (r.description as string | null) ?? null,
      instructions: r.instructions,
      evaluation_method: String(r.evaluation_method),
      max_submissions: Number(r.max_submissions),
    },
  };
}

export async function getParticipation(
  challengeId: string,
  userId: string | null,
): Promise<Result<{ count: number; joined: boolean }>> {
  const supabase = await createClient();

  const { data: count, error } = await supabase.rpc("challenge_participant_count", {
    p_challenge_id: challengeId,
  });
  if (error || typeof count !== "number") return { ok: false };

  let joined = false;
  if (userId) {
    const { data, error: joinedError } = await supabase
      .from("challenge_participants")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .neq("status", "withdrawn")
      .maybeSingle();
    if (joinedError) return { ok: false };
    joined = Boolean(data);
  }

  return { ok: true, data: { count, joined } };
}

export type CategoryWithCount = {
  slug: string;
  name: string;
  description: string | null;
  challengeCount: number;
};

export async function listActiveCategories(): Promise<Result<CategoryWithCount[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, description, challenges(count)")
    .eq("is_active", true)
    .order("display_order");
  if (error || !data) return { ok: false };

  return {
    ok: true,
    data: (data as Row[]).map((r) => {
      const counts = r.challenges as { count: number }[] | undefined;
      return {
        slug: String(r.slug),
        name: String(r.name),
        description: (r.description as string | null) ?? null,
        challengeCount: counts?.[0]?.count ?? 0,
      };
    }),
  };
}

export async function getActiveCategory(
  slug: string,
): Promise<Result<{ slug: string; name: string; description: string | null } | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, data: data ?? null };
}

export type MyChallenge = {
  joinedAt: string;
  slug: string;
  title: string;
  status: string;
  endsAt: string;
  category: CategoryRef | null;
};

export async function listMyChallenges(userId: string): Promise<Result<MyChallenge[]>> {
  const supabase = await createClient();
  await syncStatuses(supabase);

  const { data, error } = await supabase
    .from("challenge_participants")
    .select(
      "joined_at, challenges(slug, title, status, ends_at, categories(slug, name))",
    )
    .eq("user_id", userId)
    .neq("status", "withdrawn")
    .order("joined_at", { ascending: false });
  if (error || !data) return { ok: false };

  const items: MyChallenge[] = [];
  for (const row of data as Row[]) {
    const c = (Array.isArray(row.challenges) ? row.challenges[0] : row.challenges) as
      | Row
      | null
      | undefined;
    if (!c) continue;
    items.push({
      joinedAt: String(row.joined_at),
      slug: String(c.slug),
      title: String(c.title),
      status: String(c.status),
      endsAt: String(c.ends_at),
      category: toCategory(c.categories),
    });
  }
  return { ok: true, data: items };
}
