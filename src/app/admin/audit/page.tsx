import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton, LoadError } from "@/components/auth/auth-card";
import { requireAdmin } from "@/lib/admin/guard";
import { formatUtc } from "@/lib/challenges";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-2 text-muted">The latest 100 administrative actions. Entries cannot be edited.</p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <Log />
        </Suspense>
      </div>
    </section>
  );
}

async function Log() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("id", { ascending: false })
    .limit(100);
  if (error) return <LoadError>Could not load the audit log.</LoadError>;
  if (!data?.length) return <p className="text-muted">Nothing recorded yet.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">When (UTC)</th>
            <th scope="col" className="px-4 py-3 font-medium">Action</th>
            <th scope="col" className="px-4 py-3 font-medium">Entity</th>
            <th scope="col" className="px-4 py-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap px-4 py-3">{formatUtc(l.created_at)}</td>
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
