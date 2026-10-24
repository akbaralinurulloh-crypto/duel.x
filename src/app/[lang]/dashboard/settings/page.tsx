import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCurrentUser } from "@/lib/auth/user";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = (props: PageProps<"/[lang]/dashboard/settings">) =>
  localizedMetadata(props.params, (d) => ({ title: d.dashboard.settings }));

export default async function SettingsPage(props: PageProps<"/[lang]/dashboard/settings">) {
  const { d } = await langFromParams(props.params);
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{d.dashboard.settings}</h1>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <SettingsContent d={d} />
        </Suspense>
      </div>
    </section>
  );
}

async function SettingsContent({ d }: { d: Dict }) {
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
    return <LoadError>{d.dashboard.settingsLoadError}</LoadError>;
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
