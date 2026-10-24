import type { Metadata } from "next";
import Link from "next/link";
import { langFromParams } from "@/lib/i18n/params";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { d } = await langFromParams(params);
  const links = [
    ["/admin", d.admin.nav.overview],
    ["/admin/challenges", d.admin.nav.challenges],
    ["/admin/categories", d.admin.nav.categories],
    ["/admin/requests", d.admin.nav.requests],
    ["/admin/audit", d.admin.nav.audit],
  ] as const;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
      <nav aria-label={d.admin.navAria} className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="text-muted transition-colors hover:text-text">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
