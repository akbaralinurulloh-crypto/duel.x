import { Suspense } from "react";
import { setRequestStatus } from "@/app/[lang]/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc } from "@/lib/challenges";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";
import type { RequestType } from "@/lib/validation/company";

export const generateMetadata = (props: PageProps<"/[lang]/admin/requests">) =>
  localizedMetadata(props.params, (d) => ({ title: d.admin.requests.title }));

export default async function RequestsPage(props: PageProps<"/[lang]/admin/requests">) {
  const { lang, d } = await langFromParams(props.params);
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{d.admin.requests.title}</h1>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <List d={d} lang={lang} />
        </Suspense>
      </div>
    </section>
  );
}

async function List({ d, lang }: { d: Dict; lang: Locale }) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("company_requests")
    .select("id, company_name, contact_name, contact_email, request_type, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return <LoadError>{d.admin.requests.loadError}</LoadError>;
  if (!data?.length) return <p className="text-muted">{d.admin.requests.none}</p>;

  return (
    <ul className="flex flex-col gap-4">
      {data.map((r) => (
        <li key={r.id} className="glass rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{r.company_name}</p>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
              {d.admin.requests.statuses[r.status] ?? r.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {r.contact_name} · <a href={`mailto:${r.contact_email}`} className="underline underline-offset-4">{r.contact_email}</a> ·{" "}
            {d.companies.types[r.request_type as RequestType] ?? r.request_type} · {formatUtc(r.created_at, lang)}
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words">{r.message}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            {r.status !== "contacted" ? <ActionForm action={setRequestStatus} hidden={{ id: r.id, status: "contacted" }} label={d.admin.requests.markContacted} /> : null}
            {r.status !== "closed" ? <ActionForm action={setRequestStatus} hidden={{ id: r.id, status: "closed" }} label={d.admin.requests.close} /> : null}
            {r.status !== "new" ? <ActionForm action={setRequestStatus} hidden={{ id: r.id, status: "new" }} label={d.admin.requests.reopen} /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
