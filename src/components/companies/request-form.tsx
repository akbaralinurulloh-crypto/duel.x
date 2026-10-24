"use client";

import { useActionState } from "react";
import { sendCompanyRequest } from "@/app/[lang]/companies/actions";
import { Field, FormAlert, SelectField, SubmitButton, TextAreaField } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { useI18n } from "@/lib/i18n/client";
import { REQUEST_TYPE_KEYS } from "@/lib/validation/company";

export function RequestForm() {
  const { d } = useI18n();
  const [state, action] = useActionState<FormState, FormData>(sendCompanyRequest, {});
  const v = state.values;
  const e = state.fieldErrors ?? {};

  if (state.message) {
    return <FormAlert state={state} />;
  }

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field label={d.companies.company} name="companyName" autoComplete="organization" defaultValue={v?.companyName} errors={e.companyName} />
      <Field label={d.companies.yourName} name="contactName" autoComplete="name" defaultValue={v?.contactName} errors={e.contactName} />
      <Field label={d.companies.workEmail} name="contactEmail" type="email" autoComplete="email" defaultValue={v?.contactEmail} errors={e.contactEmail} />
      <SelectField
        label={d.companies.need}
        name="requestType"
        defaultValue={v?.requestType}
        errors={e.requestType}
        options={REQUEST_TYPE_KEYS.map((value) => ({ value, label: d.companies.types[value] }))}
      />
      <TextAreaField label={d.companies.message} name="message" rows={5} defaultValue={v?.message} errors={e.message} hint={d.companies.messageHint} />
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingLabel={d.companies.sending}>{d.companies.send}</SubmitButton>
    </form>
  );
}
