import type { FieldErrors } from "@/lib/validation/auth";

/** State returned by every form server action (never contains passwords). */
export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
