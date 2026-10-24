import { RequestForm } from "@/components/companies/request-form";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/params";

export const generateMetadata = (props: PageProps<"/[lang]/companies">) =>
  localizedMetadata(props.params, (d) => ({
    title: d.companies.title,
    description: d.companies.metaDescription,
  }));

export default async function CompaniesPage(props: PageProps<"/[lang]/companies">) {
  const { d } = await langFromParams(props.params);
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.companies.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{d.companies.intro}</p>
      <div className="mt-8">
        <RequestForm />
      </div>
    </div>
  );
}
