import type { Metadata } from "next";
import { RequestForm } from "@/components/companies/request-form";

export const metadata: Metadata = {
  title: "For companies",
  description: "Ask to sponsor a challenge or discover AI talent on Duel.X AI.",
};

export default function CompaniesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">For companies</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Tell us what you are looking for. A member of our team reads every
        request. Talent contact only ever happens with the consent of the
        person involved.
      </p>
      <div className="mt-8">
        <RequestForm />
      </div>
    </div>
  );
}
