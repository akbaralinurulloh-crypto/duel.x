import type { Metadata } from "next";
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
import { first } from "@/lib/search-params";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <AuthCard title="Log in" subtitle="Welcome back.">
      <Suspense fallback={<FormSkeleton />}>
        <LoginContent searchParams={props.searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const next = safeNextPath(first(sp.next));

  if (!isSupabaseConfigured()) return <NotConfigured />;
  if (await getCurrentUser()) redirect(next);

  const notice =
    first(sp.error) === "callback"
      ? "That link is invalid or has expired. Log in, or request a new link."
      : undefined;

  return <LoginForm next={next} notice={notice} />;
}
