import { SITE } from "@/lib/site";

// Original mark: two blades crossing into an X inside a rounded tile.
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={`${SITE.name} logo`}
    >
      <defs>
        <linearGradient id="dx-blade-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c6ff4d" />
          <stop offset="1" stopColor="#55d9ff" />
        </linearGradient>
        <linearGradient id="dx-blade-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b72ff" />
          <stop offset="1" stopColor="#55d9ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#111725" />
      <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="#f4f7fb" strokeOpacity="0.14" strokeWidth="2" />
      <path d="M16 14 L26 14 L48 50 L38 50 Z" fill="url(#dx-blade-a)" />
      <path d="M48 14 L38 14 L16 50 L26 50 Z" fill="url(#dx-blade-b)" fillOpacity="0.92" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">
        Duel<span className="text-lime">.X</span>
        <span className="ml-1 text-muted">AI</span>
      </span>
    </span>
  );
}
