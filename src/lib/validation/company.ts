import { z } from "zod";
import type { Dict } from "@/lib/i18n/dictionaries";

export const REQUEST_TYPE_KEYS = ["sponsor_challenge", "talent_access", "other"] as const;
export type RequestType = (typeof REQUEST_TYPE_KEYS)[number];

// English labels for the operator-only admin area. Public text: d.companies.types.
export const REQUEST_TYPES: Record<RequestType, string> = {
  sponsor_challenge: "Sponsor or run a challenge",
  talent_access: "Discover talent",
  other: "Something else",
};

// Messages are dictionary keys (d.validation), translated by fieldErrors().
export const companyRequestSchema = z.object({
  companyName: z.string().trim().min(2, "company_required").max(120, "company_max"),
  contactName: z.string().trim().min(2, "contact_required").max(120, "contact_max"),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email("email_invalid")),
  requestType: z.enum(REQUEST_TYPE_KEYS, { error: "request_type_required" }),
  message: z.string().trim().min(10, "message_min").max(2000, "message_max"),
});

export function companyErrorMessage(message: string | undefined, d: Dict): string {
  if (message?.includes("rate_limited")) return d.companies.rateLimited;
  if (message?.includes("invalid_request")) return d.companies.invalidRequest;
  return d.companies.generic;
}
