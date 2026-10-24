import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/user";
import type { Dict } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

const linkClass = "text-sm text-muted transition-colors hover:text-text";

// Reads the session, so it must be rendered inside <Suspense>.
export async function AuthNav({ d }: { d: Dict }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav aria-label={d.nav.account} className="flex items-center gap-4 sm:gap-5">
        <Link href="/login" className={linkClass}>
          {d.nav.login}
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-lime px-4 py-2 text-sm font-medium text-ink"
        >
          {d.nav.signup}
        </Link>
      </nav>
    );
  }

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  return (
    <nav aria-label={d.nav.account} className="flex items-center gap-4 sm:gap-5">
      {isAdmin === true ? (
        <Link href="/admin" className={linkClass}>
          {d.nav.admin}
        </Link>
      ) : null}
      <Link href="/dashboard" className={linkClass}>
        {d.nav.dashboard}
      </Link>
      <form action={logout}>
        <button type="submit" className={linkClass}>
          {d.nav.logout}
        </button>
      </form>
    </nav>
  );
}
