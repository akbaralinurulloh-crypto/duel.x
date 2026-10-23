import type { Metadata } from "next";
import { Suspense } from "react";
import { setCategoryActive } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Deactivating a category hides it from new sign-ups and blocks joining
        its challenges. Existing results are kept.
      </p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <List />
        </Suspense>
      </div>
    </section>
  );
}

async function List() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("categories").select("id, slug, name, is_active").order("display_order");
  if (error || !data) return <LoadError>Could not load categories.</LoadError>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5">
          <div>
            <p className="font-semibold">{c.name}</p>
            <p className="text-sm text-muted">{c.slug} · {c.is_active ? "Active" : "Inactive"}</p>
          </div>
          <ActionForm
            action={setCategoryActive}
            hidden={{ id: c.id, active: String(!c.is_active) }}
            label={c.is_active ? "Deactivate" : "Activate"}
            confirmLabel={c.is_active ? "Hide this category from new sign-ups and block joining." : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
