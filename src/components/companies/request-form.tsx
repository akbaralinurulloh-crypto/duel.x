"use client";

import { useActionState } from "react";
import { sendCompanyRequest } from "@/app/companies/actions";
import { Field, FormAlert, SelectField, SubmitButton, TextAreaField } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { REQUEST_TYPES } from "@/lib/validation/company";

export function RequestForm() {
  const [state, action] = useActionState<FormState, FormData>(sendCompanyRequest, {});
  const v = state.values;
  const e = state.fieldErrors ?? {};

  if (state.message) {
    return <FormAlert state={state} />;
  }

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4" noValidate>
      <FormAlert state={state} />
      <Field label="Company" name="companyName" autoComplete="organization" defaultValue={v?.companyName} errors={e.companyName} />
      <Field label="Your name" name="contactName" autoComplete="name" defaultValue={v?.contactName} errors={e.contactName} />
      <Field label="Work email" name="contactEmail" type="email" autoComplete="email" defaultValue={v?.contactEmail} errors={e.contactEmail} />
      <SelectField
        label="What do you need?"
        name="requestType"
        defaultValue={v?.requestType}
        errors={e.requestType}
        options={Object.entries(REQUEST_TYPES).map(([value, label]) => ({ value, label }))}
      />
      <TextAreaField label="Message" name="message" rows={5} defaultValue={v?.message} errors={e.message} hint="Up to 2000 characters." />
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
    </form>
  );
}
