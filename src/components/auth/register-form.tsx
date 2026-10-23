"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/auth/actions";
import { Field, FormAlert, SelectField, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";

export type CategoryOption = { slug: string; name: string };

export function RegisterForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action] = useActionState<FormState, FormData>(register, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label="Name"
        name="displayName"
        autoComplete="name"
        defaultValue={v.displayName}
        errors={e.displayName}
      />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        defaultValue={v.username}
        errors={e.username}
        hint="3–30 characters: letters, numbers, underscores."
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={v.email}
        errors={e.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        errors={e.password}
        hint="8–72 characters."
      />
      <SelectField
        label="Main category"
        name="primaryCategorySlug"
        defaultValue={v.primaryCategorySlug}
        errors={e.primaryCategorySlug}
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        hint="Used for recommendations. You can still compete in every category."
      />
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
