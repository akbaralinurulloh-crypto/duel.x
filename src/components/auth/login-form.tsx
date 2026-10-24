"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {notice && !state.error ? (
        <p role="status" className="rounded-md border border-line px-3 py-2 text-sm text-muted">
          {notice}
        </p>
      ) : null}
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />
      <Field
        label={d.auth.email}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <Field
        label={d.auth.password}
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel={d.auth.loggingIn}>{d.auth.loginButton}</SubmitButton>
      <div className="flex justify-between text-sm text-muted">
        <Link href="/forgot-password" className="underline underline-offset-4">
          {d.auth.forgotLink}
        </Link>
        <Link href="/register" className="underline underline-offset-4">
          {d.auth.createLink}
        </Link>
      </div>
    </form>
  );
}
