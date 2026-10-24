"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

export function ResetPasswordForm() {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(resetPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label={d.auth.newPassword}
        name="password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
        hint={d.auth.passwordHint}
      />
      <Field
        label={d.auth.confirmPassword}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton pendingLabel={d.auth.saving}>{d.auth.setPassword}</SubmitButton>
    </form>
  );
}
