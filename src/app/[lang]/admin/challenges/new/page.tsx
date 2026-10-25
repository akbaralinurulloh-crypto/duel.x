import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { requireAdmin } from "@/lib/admin/guard";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";

export const generateMetadata = (props: PageProps<"/[lang]/admin/challenges/new">) =>
  localizedMetadata(props.params, (d) => ({ title: d.admin.create.title }));

export default async function NewChallengePage(props: PageProps<"/[lang]/admin/challenges/new">) {
  const { d } = await langFromParams(props.params);
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{d.admin.create.title}</h1>
      <p className="mt-2 text-muted">{d.admin.create.intro}</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Form d={d} />
        </Suspense>
      </div>
    </section>
  );
}

async function Form({ d }: { d: Dict }) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");
  if (error || !data) return <LoadError>{d.admin.create.categoriesError}</LoadError>;

  return (
    <ChallengeForm
      mode="create"
      categories={data}
      initial={{
        title: "", slug: "", categorySlug: "", summary: "", description: "", instructions: "",
        difficulty: "", evaluationMethod: "", startsAt: "", endsAt: "", maxParticipants: "", maxSubmissions: "3", aiBriefGuide: "",
      }}
    />
  );
}
