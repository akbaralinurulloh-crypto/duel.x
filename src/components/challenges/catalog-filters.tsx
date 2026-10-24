import Link from "next/link";
import {
  DIFFICULTIES,
  STATUS_FILTERS,
  difficultyLabel,
  localizedCategory,
  type CatalogParams,
  type StatusFilter,
} from "@/lib/challenges";
import type { Dict } from "@/lib/i18n/dictionaries";

const selectClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-text";

// A plain GET form: filtering works without JavaScript and is shareable by URL.
export function CatalogFilters({
  params,
  categories,
  d,
}: {
  params: CatalogParams;
  categories: { slug: string; name: string }[];
  d: Dict;
}) {
  const hasFilters = Boolean(params.category || params.status || params.difficulty);

  return (
    <form
      method="get"
      action="/challenges"
      aria-label={d.catalog.filterAria}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          {d.catalog.category}
        </label>
        <select id="category" name="category" defaultValue={params.category ?? ""} className={selectClass}>
          <option value="">{d.categoriesPage.all}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {localizedCategory(d, c).name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          {d.catalog.status}
        </label>
        <select id="status" name="status" defaultValue={params.status ?? ""} className={selectClass}>
          <option value="">{d.catalog.anyStatus}</option>
          {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((s) => (
            <option key={s} value={s}>
              {d.statusFilters[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="difficulty" className="text-sm font-medium">
          {d.catalog.level}
        </label>
        <select id="difficulty" name="difficulty" defaultValue={params.difficulty ?? ""} className={selectClass}>
          <option value="">{d.catalog.anyLevel}</option>
          {DIFFICULTIES.map((x) => (
            <option key={x} value={x}>
              {difficultyLabel(x, d)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-lime px-5 font-medium text-ink"
        >
          {d.catalog.apply}
        </button>
        {hasFilters ? (
          <Link href="/challenges" className="text-sm text-muted underline underline-offset-4">
            {d.common.clear}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
