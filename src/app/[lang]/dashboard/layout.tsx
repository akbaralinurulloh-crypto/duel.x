import Link from "next/link";
import { langFromParams } from "@/lib/i18n/params";

const linkClass = "text-muted transition-colors hover:text-text";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[lang]/dashboard">) {
  const { d } = await langFromParams(params);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
      <nav aria-label={d.dashboard.navAria} className="mb-8 flex gap-6 border-b border-line pb-3 text-sm">
        <Link href="/dashboard" className={linkClass}>
          {d.dashboard.overview}
        </Link>
        <Link href="/dashboard/my-challenges" className={linkClass}>
          {d.dashboard.myChallenges}
        </Link>
        <Link href="/dashboard/settings" className={linkClass}>
          {d.dashboard.settings}
        </Link>
      </nav>
      {children}
    </div>
  );
}
