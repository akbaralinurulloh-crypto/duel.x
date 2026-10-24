import { SITE } from "@/lib/site";

// Mark: two thin gradient blades crossing into an X with a bright core, lens flare and a red spark.
// Drawn in code (no raster), so it stays crisp at any size.
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={`${SITE.name} logo`}>
<defs>
  <linearGradient id="dx-a" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56">
    <stop offset="0" stopColor="#3fe0ff"/><stop offset=".45" stopColor="#8f7bff"/><stop offset="1" stopColor="#ff4fa8"/>
  </linearGradient>
  <linearGradient id="dx-b" gradientUnits="userSpaceOnUse" x1="56" y1="8" x2="8" y2="56">
    <stop offset="0" stopColor="#ff4fa8"/><stop offset=".5" stopColor="#9a7bff"/><stop offset="1" stopColor="#3fe0ff"/>
  </linearGradient>
  <radialGradient id="dx-core">
    <stop offset="0" stopColor="#fff"/><stop offset=".3" stopColor="#e9e0ff" stopOpacity=".95"/><stop offset=".7" stopColor="#9a7bff" stopOpacity=".35"/><stop offset="1" stopColor="#9a7bff" stopOpacity="0"/>
  </radialGradient>
  <filter id="dx-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.8"/></filter>
  <filter id="dx-tight" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="0.9"/></filter>
</defs>
<g style={{ mixBlendMode: "screen" }}>
  <g filter="url(#dx-glow)" opacity=".75">
    <path d="M6 6 L33 31 L58 58 L31 33 Z" fill="url(#dx-a)"/>
    <path d="M58 6 L33 33 L6 58 L31 31 Z" fill="url(#dx-b)"/>
  </g>
  <g filter="url(#dx-tight)" opacity=".9">
    <path d="M6 6 L32.6 31.4 L58 58 L31.4 32.6 Z" fill="url(#dx-a)"/>
    <path d="M58 6 L32.6 32.6 L6 58 L31.4 31.4 Z" fill="url(#dx-b)"/>
  </g>
  <path d="M6 6 L32.4 31.6 L58 58 L31.6 32.4 Z" fill="url(#dx-a)"/>
  <path d="M58 6 L32.4 32.4 L6 58 L31.6 31.6 Z" fill="url(#dx-b)"/>
</g>
<circle cx="32" cy="32" r="13" fill="url(#dx-core)"/>
<g filter="url(#dx-tight)" opacity=".8"><path d="M32 17 L33 31 L47 32 L33 33 L32 47 L31 33 L17 32 L31 31 Z" fill="#fff"/></g>
<path d="M32 21 L32.9 31.1 L43 32 L32.9 32.9 L32 43 L31.1 32.9 L21 32 L31.1 31.1 Z" fill="#fff"/>
<circle cx="27" cy="12.5" r="3.4" fill="#ff3b4e" opacity=".45" filter="url(#dx-tight)"/>
<circle cx="27" cy="12.5" r="1.7" fill="#ff4d5e"/>
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
