import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24">
      <p className="font-mono text-sm text-lime">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">The page you are looking for does not exist or has moved.</p>
      <p className="mt-6">
        <Link href="/" className="text-lime underline underline-offset-4">Back to the home page</Link>
      </p>
    </main>
  );
}
