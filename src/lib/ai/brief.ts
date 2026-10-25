import "server-only";
import { AI_MODEL, createAi, textOf } from "./client";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/config";

type ChallengeForBrief = {
  title: string;
  description: string | null;
  instructions: unknown;
  ai_brief_guide: string | null;
};

const LANGUAGE: Record<Locale, string> = { en: "English", uz: "Uzbek (Latin script)" };

/**
 * Writes this participant's personal task with Claude and stores it once.
 * Returns the brief, or null when AI is not configured / the call failed.
 */
export async function createBrief(
  challengeId: string,
  userId: string,
  c: ChallengeForBrief,
  locale: Locale,
): Promise<string | null> {
  const ai = createAi();
  const service = createServiceClient();
  if (!ai || !service) return null;

  const steps = Array.isArray(c.instructions) ? (c.instructions as unknown[]).map(String) : [];
  const prompt = [
    `Challenge title: ${c.title}`,
    c.description ? `Challenge description:\n${c.description}` : "",
    steps.length ? `Official steps:\n- ${steps.join("\n- ")}` : "",
    c.ai_brief_guide ? `Organizer guidance for the task you write:\n${c.ai_brief_guide}` : "",
    `Write the participant's personal task in ${LANGUAGE[locale]}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 900,
      system:
        "You write personal task briefs for an AI-skills competition. Each participant gets a concrete, " +
        "specific task consistent with the challenge: a clear deliverable, a specific subject or scenario " +
        "(invent one; make it different each time), constraints (length, format), and what a strong result " +
        "looks like. 120-220 words. Plain text, no markdown headings. Do not mention that you are an AI " +
        "writing a brief. Never ask the participant to share secrets or personal data.",
      messages: [{ role: "user", content: prompt }],
    });
    const brief = textOf(res).slice(0, 7500);
    if (!brief) return null;
    const { error } = await service.rpc("ai_save_brief", {
      p_challenge_id: challengeId,
      p_user_id: userId,
      p_brief: brief,
    });
    return error ? null : brief;
  } catch {
    return null;
  }
}
