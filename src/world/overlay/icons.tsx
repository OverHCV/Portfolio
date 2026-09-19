import type { ActDef } from '../acts.config';

const common = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Un ícono por acto: galaxia, campo de vectores, ola, faro, circuito. */
export const ACT_ICONS: Record<ActDef['key'], React.ReactNode> = {
  galaxy: (
    <svg {...common}>
      <circle cx="12" cy="12" r="2.2" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-25 12 12)" />
    </svg>
  ),
  field: (
    <svg {...common}>
      <path d="M4 8l3-3M4 5h3v3M11 8l3-3M11 5h3v3M18 8l3-3M18 5h3v3" />
      <path d="M4 18l3-3M4 15h3v3M11 18l3-3M11 15h3v3M18 18l3-3M18 15h3v3" />
    </svg>
  ),
  pier: (
    <svg {...common}>
      <path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
      <path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
      <path d="M12 4v5M9.5 6.5L12 4l2.5 2.5" />
    </svg>
  ),
  lighthouse: (
    <svg {...common}>
      <path d="M9 21l1.2-12h3.6L15 21z" />
      <path d="M9.5 9h5M10 5.5h4V9h-4zM12 3v2.5" />
      <path d="M16.5 6.5L21 5M16.5 8L21 9.5" />
    </svg>
  ),
  city: (
    <svg {...common}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
      <path d="M10 7h4a3 3 0 013 3v4M7 10v7h7" />
      <circle cx="7" cy="17" r="0.8" fill="currentColor" />
    </svg>
  ),
};

export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg {...common}>
      <path d="M4 10v4h3l5 4V6L7 10z" />
      {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11" />}
    </svg>
  );
}

/** Puntero con destellos: «clic aquí» (en táctil, el mismo gesto de tocar). */
export function ClickIcon() {
  return (
    <svg {...common} width={16} height={16}>
      <path d="M9 9l5 12 1.8-5.2L21 14z" />
      <path d="M7.2 2.2 8 5.1M5.1 8 2.2 7.2M14 4.1 12 6M6 12l-1.9 2" />
    </svg>
  );
}

const brand = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
};

/** Glifos de las redes (rellenos, no de trazo): los enlaces del inicio. */
export const SOCIAL_ICONS: Record<'github' | 'linkedin' | 'twitter', React.ReactNode> = {
  github: (
    <svg {...brand}>
      <path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3" />
    </svg>
  ),
  linkedin: (
    <svg {...brand}>
      <path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 110-4.1 2.1 2.1 0 010 4.1zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z" />
    </svg>
  ),
  twitter: (
    <svg {...brand}>
      <path d="M18.2 2.3h3.4l-7.4 8.4L23 21.7h-6.8l-5.3-7-6.1 7H1.4l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 17.4h1.9L7 4.2H5z" />
    </svg>
  ),
};
