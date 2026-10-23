"use client";

import { useActionState } from "react";
import { createChallenge, updateChallenge } from "@/app/admin/actions";
import { Field, FormAlert, SelectField, SubmitButton, TextAreaField } from "@/components/form";
import { DIFFICULTIES, difficultyLabel, evaluationLabel } from "@/lib/challenges";
import type { FormState } from "@/lib/forms";

export type ChallengeFormInitial = {
  id?: string;
  title: string;
  slug: string;
  categorySlug: string;
  summary: string;
  description: string;
  instructions: string;
  difficulty: string;
  evaluationMethod: string;
  startsAt: string;
  endsAt: string;
  maxParticipants: string;
  maxSubmissions: string;
};

export function ChallengeForm({
  mode,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  initial: ChallengeFormInitial;
  categories: { slug: string; name: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    mode === "create" ? createChallenge : updateChallenge,
    {},
  );
  const v = (key: keyof ChallengeFormInitial) => state.values?.[key] ?? initial[key] ?? "";
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <FormAlert state={state} />
      <Field label="Title" name="title" defaultValue={v("title")} errors={e.title} />
      {mode === "create" ? (
        <Field
          label="URL name"
          name="slug"
          required={false}
          defaultValue={v("slug")}
          errors={e.slug}
          hint="Leave empty to build it from the title. It cannot be changed later."
        />
      ) : (
        <input type="hidden" name="slug" value={initial.slug} />
      )}
      <SelectField
        label="Category"
        name="categorySlug"
        defaultValue={v("categorySlug")}
        errors={e.categorySlug}
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
      />
      <TextAreaField label="Summary" name="summary" rows={2} defaultValue={v("summary")} errors={e.summary} hint="Up to 300 characters, shown on cards." />
      <TextAreaField label="Description" name="description" rows={6} defaultValue={v("description")} errors={e.description} hint="Blank line between paragraphs." />
      <TextAreaField label="Instructions" name="instructions" rows={6} defaultValue={v("instructions")} errors={e.instructions} hint="One step per line." />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Level"
          name="difficulty"
          defaultValue={v("difficulty")}
          errors={e.difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d, label: difficultyLabel(d) }))}
        />
        <SelectField
          label="Evaluation"
          name="evaluationMethod"
          defaultValue={v("evaluationMethod")}
          errors={e.evaluationMethod}
          options={["automated", "rubric", "hybrid"].map((m) => ({ value: m, label: evaluationLabel(m) }))}
        />
        <Field label="Starts (UTC)" name="startsAt" type="datetime-local" defaultValue={v("startsAt")} errors={e.startsAt} />
        <Field label="Ends (UTC)" name="endsAt" type="datetime-local" defaultValue={v("endsAt")} errors={e.endsAt} />
        <Field label="Max participants" name="maxParticipants" required={false} defaultValue={v("maxParticipants")} errors={e.maxParticipants} hint="Empty means no limit." />
        <Field label="Submission attempts" name="maxSubmissions" required={false} defaultValue={v("maxSubmissions") || "3"} errors={e.maxSubmissions} hint="1–20 per participant." />
      </div>
      <SubmitButton pendingLabel="Saving…">{mode === "create" ? "Create draft" : "Save changes"}</SubmitButton>
    </form>
  );
}
