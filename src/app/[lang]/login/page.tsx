import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  AuthCard,
  FormSkeleton,
  NotConfigured,
} from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/user";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { first } from "@/lib/search-params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const generateMetadata = (props: PageProps<"/[lang]/login">) =>
  localizedMetadata(props.params, (d) => ({ title: d.auth.loginTitle }));

export default async function LoginPage(props: PageProps<"/[lang]/login">) {
  const { d } = await langFromParams(props.params);
  return (
    <AuthCard title={d.auth.loginTitle} subtitle={d.auth.loginSubtitle}>
      <Suspense fallback={<FormSkeleton />}>
        <LoginContent searchParams={props.searchParams} d={d} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginContent({
  searchParams,
  d,
}: {
  searchParams: PageProps<"/[lang]/login">["searchParams"];
  d: Dict;
}) {
  await connection();
  const sp = await searchParams;
  const next = safeNextPath(first(sp.next));

  if (!isSupabaseConfigured()) return <NotConfigured d={d} />;
  if (await getCurrentUser()) redirect(next);

  const notice = first(sp.error) === "callback" ? d.auth.callbackError : undefined;

  return <LoginForm next={next} notice={notice} />;
}
