"use server";

import { NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import { formString, type FormState } from "@/lib/forms";
import { fieldErrors } from "@/lib/validation/auth";
import {
  COMPANY_GENERIC_ERROR,
  companyErrorMessage,
  companyRequestSchema,
} from "@/lib/validation/company";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function sendCompanyRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    companyName: formString(formData, "companyName"),
    contactName: formString(formData, "contactName"),
    contactEmail: formString(formData, "contactEmail"),
    requestType: formString(formData, "requestType"),
    message: formString(formData, "message"),
  };

  // Honeypot: real people never see or fill this field. Pretend success.
  if (formString(formData, "website")) {
    return { message: "Thank you. We will be in touch." };
  }

  const parsed = companyRequestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
      values,
    };
  }
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE, values };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_company_request", {
      p_company_name: parsed.data.companyName,
      p_contact_name: parsed.data.contactName,
      p_contact_email: parsed.data.contactEmail,
      p_request_type: parsed.data.requestType,
      p_message: parsed.data.message,
    });
    if (error) return { error: companyErrorMessage(error.message), values };
  } catch {
    return { error: COMPANY_GENERIC_ERROR, values };
  }

  return { message: "Thank you. We will be in touch." };
}
