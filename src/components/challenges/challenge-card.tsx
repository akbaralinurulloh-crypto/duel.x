import Link from "next/link";
import {
  difficultyLabel,
  formatUtc,
  localizedCategory,
  statusLabel,
  type ChallengeSummary,
} from "@/lib/challenges";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

export function StatusBadge({ status, d }: { status: string; d: Dict }) {
  const tone =
    status === "active"
      ? "border-lime text-lime"
      : status === "published"
        ? "border-cyan text-cyan"
        : "border-line text-muted";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {statusLabel(status, d)}
    </span>
  );
}

export function ChallengeCard({
  challenge: c,
  d,
  lang,
}: {
  challenge: ChallengeSummary;
  d: Dict;
  lang: Locale;
}) {
  return (
    <li className="flex">
      <Link
        href={`/challenges/${c.slug}`}
        className="glass flex w-full flex-col gap-3 rounded-lg p-5 transition-colors hover:border-lime/60"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {c.category ? localizedCategory(d, c.category).name : d.common.uncategorized}
          </span>
          <StatusBadge status={c.status} d={d} />
        </div>
        <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
        {c.summary ? <p className="text-sm text-muted">{c.summary}</p> : null}
        <dl className="mt-auto flex flex-col gap-1 pt-2 text-sm text-muted">
          <div className="flex gap-2">
            <dt>{d.catalog.levelLabel}</dt>
            <dd className="text-text">{difficultyLabel(c.difficulty, d)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>{d.catalog.endsLabel}</dt>
            <dd className="text-text">{formatUtc(c.ends_at, lang)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

export function ChallengeGrid({
  items,
  d,
  lang,
}: {
  items: ChallengeSummary[];
  d: Dict;
  lang: Locale;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <ChallengeCard key={c.slug} challenge={c} d={d} lang={lang} />
      ))}
    </ul>
  );
}
