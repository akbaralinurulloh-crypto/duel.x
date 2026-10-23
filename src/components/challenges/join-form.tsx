"use client";

import { useActionState } from "react";
import { joinChallenge } from "@/app/challenges/actions";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";

export function JoinForm({ challengeId, slug }: { challengeId: string; slug: string }) {
  const [state, action] = useActionState<FormState, FormData>(joinChallenge, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="challengeId" value={challengeId} />
      <input type="hidden" name="slug" value={slug} />
      <FormAlert state={state} />
      <SubmitButton pendingLabel="Joining…">Join challenge</SubmitButton>
    </form>
  );
}
