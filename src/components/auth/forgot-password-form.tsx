"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "@/app/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

export function ForgotPasswordForm() {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label={d.auth.email}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <SubmitButton pendingLabel={d.auth.sending}>{d.auth.sendReset}</SubmitButton>
      <Link href="/login" className="text-sm text-muted underline underline-offset-4">
        {d.auth.backToLogin}
      </Link>
    </form>
  );
}
