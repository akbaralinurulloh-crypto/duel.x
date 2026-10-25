"use client";

import { useActionState } from "react";
import { createChallenge, updateChallenge } from "@/app/[lang]/admin/actions";
import { Field, FormAlert, SelectField, SubmitButton, TextAreaField } from "@/components/form";
import { DIFFICULTIES, difficultyLabel, evaluationLabel, localizedCategory } from "@/lib/challenges";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

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
  aiBriefGuide: string;
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
  const { d } = useI18n();
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
      <Field label={d.admin.form.title} name="title" defaultValue={v("title")} errors={e.title} />
      {mode === "create" ? (
        <Field
          label={d.admin.form.urlName}
          name="slug"
          required={false}
          defaultValue={v("slug")}
          errors={e.slug}
          hint={d.admin.form.urlNameHint}
        />
      ) : (
        <input type="hidden" name="slug" value={initial.slug} />
      )}
      <SelectField
        label={d.admin.form.category}
        name="categorySlug"
        defaultValue={v("categorySlug")}
        errors={e.categorySlug}
        options={categories.map((c) => ({ value: c.slug, label: localizedCategory(d, c).name }))}
      />
      <TextAreaField label={d.admin.form.summary} name="summary" rows={2} defaultValue={v("summary")} errors={e.summary} hint={d.admin.form.summaryHint} />
      <TextAreaField label={d.admin.form.description} name="description" rows={6} defaultValue={v("description")} errors={e.description} hint={d.admin.form.descriptionHint} />
      <TextAreaField label={d.admin.form.instructions} name="instructions" rows={6} defaultValue={v("instructions")} errors={e.instructions} hint={d.admin.form.instructionsHint} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={d.admin.form.level}
          name="difficulty"
          defaultValue={v("difficulty")}
          errors={e.difficulty}
          options={DIFFICULTIES.map((x) => ({ value: x, label: difficultyLabel(x, d) }))}
        />
        <SelectField
          label={d.admin.form.evaluation}
          name="evaluationMethod"
          defaultValue={v("evaluationMethod")}
          errors={e.evaluationMethod}
          options={["automated", "rubric", "hybrid"].map((m) => ({ value: m, label: evaluationLabel(m, d) }))}
        />
        <Field label={d.admin.form.starts} name="startsAt" type="datetime-local" defaultValue={v("startsAt")} errors={e.startsAt} />
        <Field label={d.admin.form.ends} name="endsAt" type="datetime-local" defaultValue={v("endsAt")} errors={e.endsAt} />
        <Field label={d.admin.form.maxParticipants} name="maxParticipants" required={false} defaultValue={v("maxParticipants")} errors={e.maxParticipants} hint={d.admin.form.maxParticipantsHint} />
        <Field label={d.admin.form.attempts} name="maxSubmissions" required={false} defaultValue={v("maxSubmissions") || "3"} errors={e.maxSubmissions} hint={d.admin.form.attemptsHint} />
      <TextAreaField label={d.ai.guide} name="aiBriefGuide" rows={4} defaultValue={v("aiBriefGuide")} errors={e.aiBriefGuide} hint={d.ai.guideHint} />
      </div>
      <SubmitButton pendingLabel={d.admin.form.saving}>{mode === "create" ? d.admin.form.createDraft : d.admin.form.saveChanges}</SubmitButton>
    </form>
  );
}
