"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/[lang]/dashboard/settings/actions";
import {
  CheckboxField,
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
} from "@/components/form";
import { localizedCategory } from "@/lib/challenges";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

export type ProfileInitial = {
  displayName: string;
  bio: string;
  primaryCategorySlug: string;
  isPublic: boolean;
};

export function ProfileForm({
  initial,
  categories,
}: {
  initial: ProfileInitial;
  categories: { slug: string; name: string }[];
}) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  const v = state.values;
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label={d.auth.name}
        name="displayName"
        autoComplete="name"
        defaultValue={v?.displayName ?? initial.displayName}
        errors={e.displayName}
      />
      <TextAreaField
        label={d.dashboard.bio}
        name="bio"
        defaultValue={v?.bio ?? initial.bio}
        errors={e.bio}
        hint={d.dashboard.bioHint}
      />
      <SelectField
        label={d.auth.mainCategory}
        name="primaryCategorySlug"
        defaultValue={v?.primaryCategorySlug ?? initial.primaryCategorySlug}
        errors={e.primaryCategorySlug}
        options={categories.map((c) => ({ value: c.slug, label: localizedCategory(d, c).name }))}
        hint={d.dashboard.categoryHint}
      />
      <CheckboxField
        label={d.dashboard.publicProfile}
        name="isPublic"
        defaultChecked={v ? v.isPublic === "true" : initial.isPublic}
        hint={d.dashboard.publicHint}
      />
      <SubmitButton pendingLabel={d.auth.saving}>{d.dashboard.saveProfile}</SubmitButton>
    </form>
  );
}
