"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/dashboard/settings/actions";
import {
  CheckboxField,
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
} from "@/components/form";
import type { FormState } from "@/lib/forms";

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
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  const v = state.values;
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field
        label="Name"
        name="displayName"
        autoComplete="name"
        defaultValue={v?.displayName ?? initial.displayName}
        errors={e.displayName}
      />
      <TextAreaField
        label="Bio"
        name="bio"
        defaultValue={v?.bio ?? initial.bio}
        errors={e.bio}
        hint="Up to 500 characters."
      />
      <SelectField
        label="Main category"
        name="primaryCategorySlug"
        defaultValue={v?.primaryCategorySlug ?? initial.primaryCategorySlug}
        errors={e.primaryCategorySlug}
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        hint="Changing it only updates recommendations. Past results stay where they are."
      />
      <CheckboxField
        label="Public profile"
        name="isPublic"
        defaultChecked={v ? v.isPublic === "true" : initial.isPublic}
        hint="Public profiles can be seen by anyone."
      />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
