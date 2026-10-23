"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
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
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
      <div className="flex justify-between text-sm text-muted">
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot password?
        </Link>
        <Link href="/register" className="underline underline-offset-4">
          Create an account
        </Link>
      </div>
    </form>
  );
}
