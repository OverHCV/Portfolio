import type { Quality } from '../store';

export interface QualitySettings {
  dpr: [number, number];
  /** Multiplicador de densidades (estrellas, conos, medusas). */
  density: number;
  bloom: boolean;
  /** Lente, grano y viñeta. */
  fullFx: boolean;
}

/** ARCHITECTURE.md §12. */
export const QUALITY: Record<Quality, QualitySettings> = {
  high: { dpr: [1, 2], density: 1, bloom: true, fullFx: true },
  mid: { dpr: [1, 1.5], density: 0.7, bloom: true, fullFx: false },
  low: { dpr: [1, 1], density: 0.4, bloom: false, fullFx: false },
};

export function lowerQuality(q: Quality): Quality {
  return q === 'high' ? 'mid' : 'low';
}

export function tierToQuality(tier: number, isMobile: boolean): Quality {
  if (tier >= 3 && !isMobile) return 'high';
  if (tier >= 2) return 'mid';
  return 'low';
}
