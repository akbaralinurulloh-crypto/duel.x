import { z } from "zod";

export const REQUEST_TYPES = {
  sponsor_challenge: "Sponsor or run a challenge",
  talent_access: "Discover talent",
  other: "Something else",
} as const;

export type RequestType = keyof typeof REQUEST_TYPES;

export const companyRequestSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name.").max(120, "Company name is too long."),
  contactName: z.string().trim().min(2, "Enter your name.").max(120, "Name is too long."),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  requestType: z.enum(Object.keys(REQUEST_TYPES) as [RequestType, ...RequestType[]], {
    error: "Choose what you need.",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters).")
    .max(2000, "Message must be at most 2000 characters."),
});

export const COMPANY_GENERIC_ERROR = "Could not send your request. Please try again.";

export function companyErrorMessage(message: string | undefined): string {
  if (message?.includes("rate_limited")) {
    return "Too many requests from this email. Please try again later.";
  }
  if (message?.includes("invalid_request")) {
    return "Please check your details and try again.";
  }
  return COMPANY_GENERIC_ERROR;
}
