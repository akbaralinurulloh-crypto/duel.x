"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

export default function NotFound() {
  const { d } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24">
      <p className="font-mono text-sm text-lime">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{d.errors.notFoundTitle}</h1>
      <p className="mt-3 text-muted">{d.errors.notFoundBody}</p>
      <p className="mt-6">
        <Link href="/" className="text-lime underline underline-offset-4">{d.errors.backHome}</Link>
      </p>
    </main>
  );
}
