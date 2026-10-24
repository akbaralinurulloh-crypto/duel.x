import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc } from "@/lib/challenges";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";

export const generateMetadata = (props: PageProps<"/[lang]/admin/audit">) =>
  localizedMetadata(props.params, (d) => ({ title: d.admin.audit.title }));

export default async function AuditPage(props: PageProps<"/[lang]/admin/audit">) {
  const { lang, d } = await langFromParams(props.params);
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{d.admin.audit.title}</h1>
      <p className="mt-2 text-muted">{d.admin.audit.intro}</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Log d={d} lang={lang} />
        </Suspense>
      </div>
    </section>
  );
}

async function Log({ d, lang }: { d: Dict; lang: Locale }) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("id", { ascending: false })
    .limit(100);
  if (error) return <LoadError>{d.admin.audit.loadError}</LoadError>;
  if (!data?.length) return <p className="text-muted">{d.admin.audit.none}</p>;

  return (
    <div className="glass overflow-x-auto rounded-lg">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">{d.admin.audit.when}</th>
            <th scope="col" className="px-4 py-3 font-medium">{d.admin.audit.action}</th>
            <th scope="col" className="px-4 py-3 font-medium">{d.admin.audit.entity}</th>
            <th scope="col" className="px-4 py-3 font-medium">{d.admin.audit.details}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap px-4 py-3">{formatUtc(l.created_at, lang)}</td>
              <td className="px-4 py-3 font-mono">{l.action}</td>
              <td className="px-4 py-3 font-mono text-muted">{l.entity_id ? String(l.entity_id).slice(0, 8) : "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{JSON.stringify(l.metadata)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
