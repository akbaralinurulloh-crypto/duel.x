import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  AuthCard,
  FormSkeleton,
  LoadError,
  NotConfigured,
} from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password">
      <Suspense fallback={<FormSkeleton />}>
        <ResetPasswordContent />
      </Suspense>
    </AuthCard>
  );
}

async function ResetPasswordContent() {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;

  // The email link goes through /auth/callback, which signs the user in for
  // this one purpose. No session means the link is missing, used or expired.
  if (!(await getCurrentUser())) {
    return (
      <div className="flex flex-col gap-4">
        <LoadError>
          This reset link is invalid or has expired. Request a new one.
        </LoadError>
        <Link href="/forgot-password" className="text-sm underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
