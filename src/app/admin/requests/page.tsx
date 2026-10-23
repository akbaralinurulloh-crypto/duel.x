import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestStatus } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc } from "@/lib/challenges";
import { REQUEST_TYPES, type RequestType } from "@/lib/validation/company";

export const metadata: Metadata = { title: "Company requests" };

export default function RequestsPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Company requests</h1>
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
  const { data, error } = await supabase
    .from("company_requests")
    .select("id, company_name, contact_name, contact_email, request_type, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return <LoadError>Could not load requests.</LoadError>;
  if (!data?.length) return <p className="text-muted">No requests yet.</p>;

  return (
    <ul className="flex flex-col gap-4">
      {data.map((r) => (
        <li key={r.id} className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{r.company_name}</p>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{r.status}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {r.contact_name} · <a href={`mailto:${r.contact_email}`} className="underline underline-offset-4">{r.contact_email}</a> ·{" "}
            {REQUEST_TYPES[r.request_type as RequestType] ?? r.request_type} · {formatUtc(r.created_at)}
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words">{r.message}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            {r.status !== "contacted" ? <ActionForm action={setRequestStatus} hidden={{ id: r.id, status: "contacted" }} label="Mark contacted" /> : null}
            {r.status !== "closed" ? <ActionForm action={setRequestStatus} hidden={{ id: r.id, status: "closed" }} label="Close" /> : null}
            {r.status !== "new" ? <ActionForm action={setRequestStatus} hidden={{ id: r.id, status: "new" }} label="Reopen" /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
