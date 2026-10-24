"use client";

import { useActionState } from "react";
import { approveEvaluation, saveEvaluation } from "@/app/[lang]/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";
import type { RubricCriterion } from "@/lib/submissions";

export function EvaluationForm({
  submissionId,
  challengeId,
  criteria,
  saved,
}: {
  submissionId: string;
  challengeId: string;
  criteria: RubricCriterion[];
  saved: {
    evaluationId: string;
    status: string;
    scores: Record<string, number>;
    feedback: string | null;
  } | null;
}) {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(saveEvaluation, {});
  const locked = saved?.status === "approved";

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="submissionId" value={submissionId} />
        <input type="hidden" name="challengeId" value={challengeId} />
        <FormAlert state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          {criteria.map((c) => (
            <div key={c.key} className="flex flex-col gap-1.5">
              <label htmlFor={`${submissionId}-${c.key}`} className="text-sm font-medium">
                {c.label} <span className="text-muted">(0–{c.max_points})</span>
              </label>
              <input
                id={`${submissionId}-${c.key}`}
                name={`score_${c.key}`}
                type="number"
                step="any"
                min={0}
                max={c.max_points}
                required
                disabled={locked}
                defaultValue={saved?.scores[c.key]}
                className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-text disabled:opacity-60"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${submissionId}-feedback`} className="text-sm font-medium">
            {d.admin.evaluation.feedback}
          </label>
          <textarea
            id={`${submissionId}-feedback`}
            name="feedback"
            rows={3}
            maxLength={5000}
            disabled={locked}
            defaultValue={saved?.feedback ?? ""}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-text disabled:opacity-60"
          />
        </div>
        {locked ? (
          <p className="text-sm text-muted">{d.admin.evaluation.locked}</p>
        ) : (
          <div>
            <SubmitButton pendingLabel={d.admin.evaluation.saving}>{d.admin.evaluation.saveDraft}</SubmitButton>
          </div>
        )}
      </form>

      {saved && !locked ? (
        <ActionForm
          action={approveEvaluation}
          hidden={{ evaluationId: saved.evaluationId, challengeId }}
          label={d.admin.evaluation.approve}
          pendingLabel={d.admin.evaluation.approving}
        />
      ) : null}
    </div>
  );
}
