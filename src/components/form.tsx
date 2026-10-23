"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-text placeholder:text-muted aria-[invalid=true]:border-red-400";

type BaseProps = {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
};

function Wrapper({
  label,
  name,
  errors,
  hint,
  children,
}: BaseProps & { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !errors?.length ? (
        <p id={`${name}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-sm text-red-300">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, errors?: string[], hint?: string) {
  if (errors?.length) return `${name}-error`;
  if (hint) return `${name}-hint`;
  return undefined;
}

export function Field({
  type = "text",
  defaultValue,
  autoComplete,
  required = true,
  ...base
}: BaseProps & {
  type?: "text" | "email" | "password" | "datetime-local";
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <Wrapper {...base}>
      <input
        id={base.name}
        name={base.name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={base.errors?.length ? true : undefined}
        aria-describedby={describedBy(base.name, base.errors, base.hint)}
        className={inputClass}
      />
    </Wrapper>
  );
}

export function TextAreaField({
  defaultValue,
  rows = 4,
  ...base
}: BaseProps & { defaultValue?: string; rows?: number }) {
  return (
    <Wrapper {...base}>
      <textarea
        id={base.name}
        name={base.name}
        rows={rows}
        defaultValue={defaultValue}
        aria-invalid={base.errors?.length ? true : undefined}
        aria-describedby={describedBy(base.name, base.errors, base.hint)}
        className={inputClass}
      />
    </Wrapper>
  );
}

export function SelectField({
  options,
  defaultValue,
  placeholder = "Choose…",
  ...base
}: BaseProps & {
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <Wrapper {...base}>
      <select
        id={base.name}
        name={base.name}
        required
        defaultValue={defaultValue ?? ""}
        aria-invalid={base.errors?.length ? true : undefined}
        aria-describedby={describedBy(base.name, base.errors, base.hint)}
        className={inputClass}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="mt-1 size-4 accent-[var(--lime)]"
      />
      <div className="flex flex-col">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        {hint ? (
          <p id={`${name}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-lime px-5 font-medium text-ink transition-opacity disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormAlert({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200"
      >
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p
        role="status"
        className="rounded-md border border-lime/40 bg-lime/10 px-3 py-2 text-sm"
      >
        {state.message}
      </p>
    );
  }
  return null;
}
