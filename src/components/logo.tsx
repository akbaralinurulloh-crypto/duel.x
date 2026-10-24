import { SITE } from "@/lib/site";

// Mark: two thin blades crossing into an X with a glowing core and a coral spark.
// Drawn in code (no raster), so it stays crisp at any size.
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={`${SITE.name} logo`}
    >
      <defs>
        <linearGradient id="dx-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55d9ff" />
          <stop offset="0.55" stopColor="#8b72ff" />
          <stop offset="1" stopColor="#ff5fb0" />
        </linearGradient>
        <linearGradient id="dx-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5fb0" />
          <stop offset="0.5" stopColor="#8b72ff" />
          <stop offset="1" stopColor="#55d9ff" />
        </linearGradient>
        <radialGradient id="dx-core">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d9ccff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#8b72ff" stopOpacity="0" />
        </radialGradient>
        <filter id="dx-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <g filter="url(#dx-blur)" opacity="0.55">
        <path d="M32 3 L35.2 32 L32 61 L28.8 32 Z" fill="url(#dx-a)" transform="rotate(45 32 32)" />
        <path d="M32 3 L35.2 32 L32 61 L28.8 32 Z" fill="url(#dx-b)" transform="rotate(-45 32 32)" />
      </g>
      <path d="M32 3 L34.6 32 L32 61 L29.4 32 Z" fill="url(#dx-a)" transform="rotate(45 32 32)" />
      <path d="M32 3 L34.6 32 L32 61 L29.4 32 Z" fill="url(#dx-b)" transform="rotate(-45 32 32)" />
      <circle cx="32" cy="32" r="9" fill="url(#dx-core)" />
      <path d="M32 21 L33.2 30.8 L43 32 L33.2 33.2 L32 43 L30.8 33.2 L21 32 L30.8 30.8 Z" fill="#fff" />
      <circle cx="28" cy="15" r="2" fill="#ff4d5e" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-xl font-light tracking-wide lowercase">
        duel<span className="text-violet">.</span>x
        <span className="ml-1.5 text-muted">ai</span>
      </span>
    </span>
  );
}
