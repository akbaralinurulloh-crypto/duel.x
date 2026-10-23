import Link from "next/link";
import {
  DIFFICULTIES,
  STATUS_FILTER_LABELS,
  STATUS_FILTERS,
  difficultyLabel,
  type CatalogParams,
  type StatusFilter,
} from "@/lib/challenges";

const selectClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-text";

// A plain GET form: filtering works without JavaScript and is shareable by URL.
export function CatalogFilters({
  params,
  categories,
}: {
  params: CatalogParams;
  categories: { slug: string; name: string }[];
}) {
  const hasFilters = Boolean(params.category || params.status || params.difficulty);

  return (
    <form
      method="get"
      action="/challenges"
      aria-label="Filter challenges"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select id="category" name="category" defaultValue={params.category ?? ""} className={selectClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select id="status" name="status" defaultValue={params.status ?? ""} className={selectClass}>
          <option value="">Any status</option>
          {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_FILTER_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="difficulty" className="text-sm font-medium">
          Level
        </label>
        <select id="difficulty" name="difficulty" defaultValue={params.difficulty ?? ""} className={selectClass}>
          <option value="">Any level</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {difficultyLabel(d)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-lime px-5 font-medium text-ink"
        >
          Apply filters
        </button>
        {hasFilters ? (
          <Link href="/challenges" className="text-sm text-muted underline underline-offset-4">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
