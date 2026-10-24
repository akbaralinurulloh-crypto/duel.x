"use server";

import { getRequestDict } from "@/lib/i18n/server";
import { formString, type FormState } from "@/lib/forms";
import { fieldErrors } from "@/lib/validation/auth";
import { companyErrorMessage, companyRequestSchema } from "@/lib/validation/company";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function sendCompanyRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { d } = await getRequestDict();
  const values = {
    companyName: formString(formData, "companyName"),
    contactName: formString(formData, "contactName"),
    contactEmail: formString(formData, "contactEmail"),
    requestType: formString(formData, "requestType"),
    message: formString(formData, "message"),
  };

  // Honeypot: real people never see or fill this field. Pretend success.
  if (formString(formData, "website")) {
    return { message: d.companies.thanks };
  }

  const parsed = companyRequestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: d.common.fixFields,
      fieldErrors: fieldErrors(parsed.error, d.validation),
      values,
    };
  }
  if (!isSupabaseConfigured()) return { error: d.common.notConfigured, values };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_company_request", {
      p_company_name: parsed.data.companyName,
      p_contact_name: parsed.data.contactName,
      p_contact_email: parsed.data.contactEmail,
      p_request_type: parsed.data.requestType,
      p_message: parsed.data.message,
    });
    if (error) return { error: companyErrorMessage(error.message, d), values };
  } catch {
    return { error: d.companies.generic, values };
  }

  return { message: d.companies.thanks };
}
