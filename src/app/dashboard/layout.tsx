import Link from "next/link";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
      <nav aria-label="Dashboard" className="mb-8 flex gap-6 border-b border-line pb-3 text-sm">
        <Link href="/dashboard" className="text-muted transition-colors hover:text-text">
          Overview
        </Link>
        <Link
          href="/dashboard/my-challenges"
          className="text-muted transition-colors hover:text-text"
        >
          My challenges
        </Link>
        <Link
          href="/dashboard/settings"
          className="text-muted transition-colors hover:text-text"
        >
          Settings
        </Link>
      </nav>
      {children}
    </div>
  );
}
