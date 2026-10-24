"use client";

import { useActionState } from "react";
import { addRubricVersion } from "@/app/[lang]/admin/actions";
import { FormAlert, SubmitButton, TextAreaField } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

export function RubricForm({ challengeId, initial }: { challengeId: string; initial: string }) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(addRubricVersion, {});
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="id" value={challengeId} />
      <FormAlert state={state} />
      <TextAreaField
        label={d.admin.form.criteria}
        name="criteria"
        rows={6}
        defaultValue={state.values?.criteria ?? initial}
        hint={d.admin.form.criteriaHint}
      />
      <SubmitButton pendingLabel={d.admin.form.saving}>{d.admin.form.saveRubric}</SubmitButton>
    </form>
  );
}
