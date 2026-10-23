import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

const linkClass = "text-sm text-muted transition-colors hover:text-text";

// Reads the session, so it must be rendered inside <Suspense>.
export async function AuthNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav aria-label="Account" className="flex items-center gap-4 sm:gap-5">
        <Link href="/login" className={linkClass}>
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-lime px-4 py-2 text-sm font-medium text-ink"
        >
          Sign up
        </Link>
      </nav>
    );
  }

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  return (
    <nav aria-label="Account" className="flex items-center gap-4 sm:gap-5">
      {isAdmin === true ? (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      ) : null}
      <Link href="/dashboard" className={linkClass}>
        Dashboard
      </Link>
      <form action={logout}>
        <button type="submit" className={linkClass}>
          Log out
        </button>
      </form>
    </nav>
  );
}
