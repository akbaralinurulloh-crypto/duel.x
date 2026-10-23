import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <SettingsContent />
        </Suspense>
      </div>
    </section>
  );
}

async function SettingsContent() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  const supabase = await createClient();
  const [profileRes, categoriesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, bio, primary_category_id, is_public")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("display_order"),
  ]);

  if (profileRes.error || !profileRes.data || categoriesRes.error || !categoriesRes.data) {
    return (
      <LoadError>
        Your settings could not be loaded. Please try again in a moment.
      </LoadError>
    );
  }

  const profile = profileRes.data;
  const categories = categoriesRes.data;
  const current = categories.find((c) => c.id === profile.primary_category_id);

  return (
    <ProfileForm
      initial={{
        displayName: profile.display_name,
        bio: profile.bio ?? "",
        primaryCategorySlug: current?.slug ?? "",
        isPublic: profile.is_public,
      }}
      categories={categories.map(({ slug, name }) => ({ slug, name }))}
    />
  );
}
