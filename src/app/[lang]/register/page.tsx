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
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/register">) =>
  localizedMetadata(props.params, (d) => ({ title: d.auth.registerTitle }));

export default async function RegisterPage(props: PageProps<"/[lang]/register">) {
  const { d } = await langFromParams(props.params);
  return (
    <AuthCard title={d.auth.registerTitle} subtitle={d.auth.registerSubtitle}>
      <Suspense fallback={<FormSkeleton />}>
        <RegisterContent d={d} />
      </Suspense>
    </AuthCard>
  );
}

async function RegisterContent({ d }: { d: Dict }) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;
  if (await getCurrentUser()) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");

  if (error) return <LoadError>{d.auth.categoriesLoadError}</LoadError>;
  if (!data || data.length === 0) return <LoadError>{d.auth.signupClosed}</LoadError>;

  return <RegisterForm categories={data} />;
}
