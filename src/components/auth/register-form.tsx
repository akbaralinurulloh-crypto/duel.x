"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/auth/actions";
import { GoogleButton } from "@/components/auth/google-button";
import { Field, FormAlert, SelectField, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";
import { localizedCategory } from "@/lib/challenges";

export type CategoryOption = { slug: string; name: string };

export function RegisterForm({ categories }: { categories: CategoryOption[] }) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(register, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-4">
    <GoogleButton next="/dashboard" />
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label={d.auth.name}
        name="displayName"
        autoComplete="name"
        defaultValue={v.displayName}
        errors={e.displayName}
      />
      <Field
        label={d.auth.username}
        name="username"
        autoComplete="username"
        defaultValue={v.username}
        errors={e.username}
        hint={d.auth.usernameHint}
      />
      <Field
        label={d.auth.email}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={v.email}
        errors={e.email}
      />
      <Field
        label={d.auth.password}
        name="password"
        type="password"
        autoComplete="new-password"
        errors={e.password}
        hint={d.auth.passwordHint}
      />
      <SelectField
        label={d.auth.mainCategory}
        name="primaryCategorySlug"
        defaultValue={v.primaryCategorySlug}
        errors={e.primaryCategorySlug}
        options={categories.map((c) => ({ value: c.slug, label: localizedCategory(d, c).name }))}
        hint={d.auth.mainCategoryHint}
      />
      <SubmitButton pendingLabel={d.auth.creating}>{d.auth.registerButton}</SubmitButton>
      <p className="text-sm text-muted">
        {d.auth.haveAccount}{" "}
        <Link href="/login" className="underline underline-offset-4">
          {d.nav.login}
        </Link>
      </p>
    </form>
    </div>
  );
}
