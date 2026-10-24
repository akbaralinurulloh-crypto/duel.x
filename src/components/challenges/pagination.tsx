import Link from "next/link";
import { PAGE_SIZE, catalogHref, type CatalogParams } from "@/lib/challenges";
import { fmt } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

export function Pagination({
  params,
  total,
  d,
}: {
  params: CatalogParams;
  total: number;
  d: Dict;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;

  const linkClass =
    "rounded-md border border-line px-4 py-2 text-sm transition-colors hover:border-lime/60";

  return (
    <nav aria-label={d.catalog.paginationAria} className="mt-8 flex items-center justify-between">
      {params.page > 1 ? (
        <Link href={catalogHref({ ...params, page: params.page - 1 })} className={linkClass}>
          {d.common.previous}
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted">{fmt(d.common.pageOf, { page: params.page, pages })}</p>
      {params.page < pages ? (
        <Link href={catalogHref({ ...params, page: params.page + 1 })} className={linkClass}>
          {d.common.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
