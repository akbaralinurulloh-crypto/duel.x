import { z } from "zod";

// Shared by client forms and server actions. The server always re-validates.

// 72 = bcrypt's input limit, which Supabase Auth uses for password hashing.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,30}$/,
    "Username must be 3–30 characters: letters, numbers and underscores.",
  );

export const registerSchema = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Name must be at most 80 characters."),
  username: usernameSchema,
  primaryCategorySlug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Choose a main category."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Name must be at most 80 characters."),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must be at most 500 characters.")
    .transform((v) => (v === "" ? null : v)),
  primaryCategorySlug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Choose a main category."),
  isPublic: z.boolean(),
});

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
