"use client";

import { useI18n } from "@/lib/i18n/client";

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const { d } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">{d.errors.title}</h1>
      <p className="mt-3 text-muted">{d.errors.body}</p>
      <div className="mt-6">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex h-11 items-center rounded-md bg-lime px-5 font-medium text-ink"
        >
          {d.errors.retry}
        </button>
      </div>
    </main>
  );
}
