import { connection } from "next/server";
import { Suspense } from "react";
import {
  AuthCard,
  FormSkeleton,
  NotConfigured,
} from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/forgot-password">) =>
  localizedMetadata(props.params, (d) => ({ title: d.auth.forgotTitle }));

export default async function ForgotPasswordPage(props: PageProps<"/[lang]/forgot-password">) {
  const { d } = await langFromParams(props.params);
  return (
    <AuthCard title={d.auth.forgotTitle} subtitle={d.auth.forgotSubtitle}>
      <Suspense fallback={<FormSkeleton />}>
        <ForgotPasswordContent d={d} />
      </Suspense>
    </AuthCard>
  );
}

async function ForgotPasswordContent({ d }: { d: Dict }) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;
  return <ForgotPasswordForm />;
}
