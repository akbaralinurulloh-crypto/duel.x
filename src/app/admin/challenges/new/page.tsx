import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "New challenge" };

export default function NewChallengePage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">New challenge</h1>
      <p className="mt-2 text-muted">It is saved as a draft. Nothing is public until you publish it.</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Form />
        </Suspense>
      </div>
    </section>
  );
}

async function Form() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");
  if (error || !data) return <LoadError>Could not load categories.</LoadError>;

  return (
    <ChallengeForm
      mode="create"
      categories={data}
      initial={{
        title: "", slug: "", categorySlug: "", summary: "", description: "", instructions: "",
        difficulty: "", evaluationMethod: "", startsAt: "", endsAt: "", maxParticipants: "", maxSubmissions: "3",
      }}
    />
  );
}
