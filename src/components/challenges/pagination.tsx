import Link from "next/link";
import { PAGE_SIZE, catalogHref, type CatalogParams } from "@/lib/challenges";

export function Pagination({ params, total }: { params: CatalogParams; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;

  const linkClass =
    "rounded-md border border-line px-4 py-2 text-sm transition-colors hover:border-lime/60";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
      {params.page > 1 ? (
        <Link href={catalogHref({ ...params, page: params.page - 1 })} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted">
        Page {params.page} of {pages}
      </p>
      {params.page < pages ? (
        <Link href={catalogHref({ ...params, page: params.page + 1 })} className={linkClass}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
