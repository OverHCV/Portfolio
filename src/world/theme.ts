/**
 * Paleta y tokens de movimiento compartidos por el mundo 3D y la interfaz 2D.
 * `src/styles/global.css` (@theme) es un espejo de estos valores: si cambias uno, cambia el otro.
 */
export const COLORS = {
  void: '#05060a',
  ink: '#e8e6e3',
  mist: '#8a8f98',
  glow: '#f3c77a',
  ember: '#b34a14',
  cyan: '#7fe3ff',
  violet: '#c9a7ff',
} as const;

export const EASE = {
  enter: 'expo.out',
  exit: 'power2.in',
  inOut: 'power3.inOut',
} as const;

/** Segundos. */
export const DUR = {
  fast: 0.25,
  base: 0.6,
  slow: 1.2,
} as const;
