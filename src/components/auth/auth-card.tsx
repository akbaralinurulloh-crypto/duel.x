import type { Dict } from "@/lib/i18n/dictionaries";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function FormSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-72 animate-pulse rounded-md border border-line bg-surface"
    />
  );
}

export function NotConfigured({ d }: { d: Dict }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200"
    >
      {d.common.notConfigured}
    </p>
  );
}

export function LoadError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200"
    >
      {children}
    </p>
  );
}
