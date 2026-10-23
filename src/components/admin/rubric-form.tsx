"use client";

import { useActionState } from "react";
import { addRubricVersion } from "@/app/admin/actions";
import { FormAlert, SubmitButton, TextAreaField } from "@/components/form";
import type { FormState } from "@/lib/forms";

export function RubricForm({ challengeId, initial }: { challengeId: string; initial: string }) {
  const [state, action] = useActionState<FormState, FormData>(addRubricVersion, {});
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="id" value={challengeId} />
      <FormAlert state={state} />
      <TextAreaField
        label="Criteria"
        name="criteria"
        rows={6}
        defaultValue={state.values?.criteria ?? initial}
        hint='One per line: key | Label | max points. Example: clarity | Clarity of the prompt | 10. Saving creates a new version; old versions are kept.'
      />
      <SubmitButton pendingLabel="Saving…">Save as new version</SubmitButton>
    </form>
  );
}
