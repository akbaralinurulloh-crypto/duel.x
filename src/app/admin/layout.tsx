import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

const links = [
  ["/admin", "Overview"],
  ["/admin/challenges", "Challenges"],
  ["/admin/categories", "Categories"],
  ["/admin/requests", "Company requests"],
  ["/admin/audit", "Audit log"],
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
      <nav aria-label="Admin" className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 text-sm">
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
