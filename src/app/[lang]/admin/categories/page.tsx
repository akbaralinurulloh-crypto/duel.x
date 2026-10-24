import { Suspense } from "react";
import { setCategoryActive } from "@/app/[lang]/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { localizedCategory } from "@/lib/challenges";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";

export const generateMetadata = (props: PageProps<"/[lang]/admin/categories">) =>
  localizedMetadata(props.params, (d) => ({ title: d.admin.categories.title }));

export default async function AdminCategoriesPage(props: PageProps<"/[lang]/admin/categories">) {
  const { d } = await langFromParams(props.params);
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{d.admin.categories.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{d.admin.categories.intro}</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <List d={d} />
        </Suspense>
      </div>
    </section>
  );
}

async function List({ d }: { d: Dict }) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("categories").select("id, slug, name, is_active").order("display_order");
  if (error || !data) return <LoadError>{d.admin.categories.loadError}</LoadError>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => (
        <li key={c.id} className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-5">
          <div>
            <p className="font-semibold">{localizedCategory(d, c).name}</p>
            <p className="text-sm text-muted">{c.slug} · {c.is_active ? d.admin.categories.active : d.admin.categories.inactive}</p>
          </div>
          <ActionForm
            action={setCategoryActive}
            hidden={{ id: c.id, active: String(!c.is_active) }}
            label={c.is_active ? d.admin.categories.deactivate : d.admin.categories.activate}
            confirmLabel={c.is_active ? d.admin.categories.deactivateConfirm : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
