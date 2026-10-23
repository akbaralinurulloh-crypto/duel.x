import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  AuthCard,
  FormSkeleton,
  LoadError,
  NotConfigured,
} from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Pick a main category. You can still compete in all of them."
    >
      <Suspense fallback={<FormSkeleton />}>
        <RegisterContent />
      </Suspense>
    </AuthCard>
  );
}

async function RegisterContent() {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured />;
  if (await getCurrentUser()) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return (
      <LoadError>
        Categories could not be loaded. Please try again in a moment.
      </LoadError>
    );
  }
  if (!data || data.length === 0) {
    return <LoadError>Sign-up is not open yet: no categories are available.</LoadError>;
  }

  return <RegisterForm categories={data} />;
}
