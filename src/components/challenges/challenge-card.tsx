import Link from "next/link";
import {
  difficultyLabel,
  formatUtc,
  statusLabel,
  type ChallengeSummary,
} from "@/lib/challenges";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "border-lime text-lime"
      : status === "published"
        ? "border-cyan text-cyan"
        : "border-line text-muted";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

export function ChallengeCard({ challenge: c }: { challenge: ChallengeSummary }) {
  return (
    <li className="flex">
      <Link
        href={`/challenges/${c.slug}`}
        className="flex w-full flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-lime/60"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{c.category?.name ?? "Uncategorized"}</span>
          <StatusBadge status={c.status} />
        </div>
        <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
        {c.summary ? <p className="text-sm text-muted">{c.summary}</p> : null}
        <dl className="mt-auto flex flex-col gap-1 pt-2 text-sm text-muted">
          <div className="flex gap-2">
            <dt>Level:</dt>
            <dd className="text-text">{difficultyLabel(c.difficulty)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>Ends:</dt>
            <dd className="text-text">{formatUtc(c.ends_at)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

export function ChallengeGrid({ items }: { items: ChallengeSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <ChallengeCard key={c.slug} challenge={c} />
      ))}
    </ul>
  );
}
