"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "@/app/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      <Link href="/login" className="text-sm text-muted underline underline-offset-4">
        Back to log in
      </Link>
    </form>
  );
}
