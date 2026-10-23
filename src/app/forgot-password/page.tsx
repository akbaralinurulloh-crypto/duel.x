import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  AuthCard,
  FormSkeleton,
  NotConfigured,
} from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <Suspense fallback={<FormSkeleton />}>
        <ForgotPasswordContent />
      </Suspense>
    </AuthCard>
  );
}

async function ForgotPasswordContent() {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;
  return <ForgotPasswordForm />;
}
