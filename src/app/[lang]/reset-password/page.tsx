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
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/reset-password">) =>
  localizedMetadata(props.params, (d) => ({ title: d.auth.resetTitle }));

export default async function ResetPasswordPage(props: PageProps<"/[lang]/reset-password">) {
  const { d } = await langFromParams(props.params);
  return (
    <AuthCard title={d.auth.resetTitle}>
      <Suspense fallback={<FormSkeleton />}>
        <ResetPasswordContent d={d} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetPasswordContent({ d }: { d: Dict }) {
  await connection();
  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;

  // The email link goes through /auth/callback, which signs the user in for
  // this one purpose. No session means the link is missing, used or expired.
  if (!(await getCurrentUser())) {
    return (
      <div className="flex flex-col gap-4">
        <LoadError>{d.auth.resetInvalid}</LoadError>
        <Link href="/forgot-password" className="text-sm underline underline-offset-4">
          {d.auth.requestNew}
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
