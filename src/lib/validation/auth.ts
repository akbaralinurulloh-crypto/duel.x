import { z } from "zod";

// Shared by client forms and server actions. The server always re-validates.

// Messages are dictionary keys (d.validation), translated by fieldErrors().

// 72 = bcrypt's input limit, which Supabase Auth uses for password hashing.
const password = z
  .string()
  .min(8, "password_min")
  .max(72, "password_max");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("email_invalid"));

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,30}$/,
    "username_format",
  );

export const registerSchema = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .min(1, "name_required")
    .max(80, "name_max"),
  username: usernameSchema,
  primaryCategorySlug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "category_required"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "password_required").max(72),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwords_mismatch",
  });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "name_required")
    .max(80, "name_max"),
  bio: z
    .string()
    .trim()
    .max(500, "bio_max")
    .transform((v) => (v === "" ? null : v)),
  primaryCategorySlug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "category_required"),
  isPublic: z.boolean(),
});

export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Field errors for a form. Schema messages are dictionary keys (see
 * d.validation); pass the dictionary section to translate them. Messages that
 * are not keys (the operator-only admin forms) pass through unchanged.
 */
export function fieldErrors(
  error: z.ZodError,
  translations?: Record<string, string>,
): FieldErrors {
  const raw = z.flattenError(error).fieldErrors as FieldErrors;
  if (!translations) return raw;
  return Object.fromEntries(
    Object.entries(raw).map(([field, messages]) => [
      field,
      messages?.map((m) => (Object.hasOwn(translations, m) ? translations[m] : m)),
    ]),
  );
}
