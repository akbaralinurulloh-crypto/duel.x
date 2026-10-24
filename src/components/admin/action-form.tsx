"use client";

import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";

/** A button-only form for one server action, with inline success/error. */
export function ActionForm({
  action,
  hidden,
  label,
  pendingLabel,
  confirmLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  label: string;
  pendingLabel?: string;
  confirmLabel?: string;
}) {
  const { d } = useI18n();
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormAlert state={state} />
      {confirmLabel ? (
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="confirm" className="mt-1 size-4 accent-[var(--lime)]" />
          {confirmLabel}
        </label>
      ) : null}
      <div>
        <SubmitButton pendingLabel={pendingLabel ?? d.common.pending}>{label}</SubmitButton>
      </div>
    </form>
  );
}
