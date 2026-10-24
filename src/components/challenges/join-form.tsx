"use client";

import { useActionState } from "react";
import { joinChallenge } from "@/app/[lang]/challenges/actions";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

export function JoinForm({ challengeId, slug }: { challengeId: string; slug: string }) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(joinChallenge, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="challengeId" value={challengeId} />
      <input type="hidden" name="slug" value={slug} />
      <FormAlert state={state} />
      <SubmitButton pendingLabel={d.challenge.joining}>{d.challenge.join}</SubmitButton>
    </form>
  );
}
