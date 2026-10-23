import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, primary_category_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <LoadError>
        Your profile could not be loaded. Please try again in a moment.
      </LoadError>
    );
  }

  let categoryName: string | null = null;
  if (profile.primary_category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", profile.primary_category_id)
      .maybeSingle();
    categoryName = category?.name ?? null;
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome, {profile.display_name}
      </h1>
      <dl className="mt-8 grid max-w-md gap-4 text-sm">
        <div>
          <dt className="text-muted">Username</dt>
          <dd className="mt-1 font-medium">@{profile.username}</dd>
        </div>
        <div>
          <dt className="text-muted">Main category</dt>
          <dd className="mt-1 font-medium">{categoryName ?? "Not chosen"}</dd>
        </div>
      </dl>
      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/dashboard/my-challenges" className="text-lime underline underline-offset-4">
          My challenges
        </Link>
        <Link href={`/u/${profile.username}`} className="text-lime underline underline-offset-4">
          View my public profile
        </Link>
      </p>
    </section>
  );
}
