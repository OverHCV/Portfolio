import type { MilestoneKind } from './types';

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
  /** Hoja del formulario de contacto (Acto 5). */
  paper: '#f1ebdf',
  paperInk: '#1b1a17',
} as const;

/** Color de medusa (Acto 3) y de su tarjeta, por tipo de hito. */
export const MILESTONE_COLORS = {
  job: '#7fe3ff',
  internship: '#9fffd2',
  education: '#c9a7ff',
  certification: '#ffd28a',
  award: '#ff9fc6',
} as const satisfies Record<MilestoneKind, string>;

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

/**
 * Paletas de la placa del Acto 5. Cada token es un "material" de la PCB; la escena los lee como
 * uniforms compartidos (acts/Act5City/palette.ts), así que se pueden cambiar en caliente con
 * `applyCityPalette('green')` o pasando solo los tokens que cambian.
 */
export interface CityPalette {
  /** Máscara de soldadura (la superficie de la placa) y canto de la placa (FR4). */
  mask: string;
  edge: string;
  /** Cobre bajo la máscara: capa superior y la inferior, que se ve apagada a través del sustrato. */
  copper: string;
  copperDim: string;
  /** Pads y vías sin máscara (acabado ENIG) y el taladro. */
  pad: string;
  drill: string;
  /** Serigrafía: contornos, referencias y nombres. */
  silk: string;
  /** Pulsos de energía de las calles y LEDs. */
  pulse: string;
  led: string;
  /** Componentes. */
  chip: string;
  lid: string;
  metal: string;
  ceramic: string;
  resistor: string;
  can: string;
  canTop: string;
  plastic: string;
  substrate: string;
  /** Buzón. */
  post: string;
  postDark: string;
  /** Tono de cada cara del sombreado isométrico: arriba, lado +x, lado +z. */
  shade: [number, number, number];
}

export const CITY_PALETTES = {
  /** Máscara negra mate y cobre dorado: sigue al fundido dorado que sale del piano. */
  gold: {
    mask: '#0a0b0e',
    edge: '#5c4a2a',
    copper: '#6f5427',
    copperDim: '#2a2216',
    pad: '#e0b563',
    drill: '#020203',
    silk: '#d8d2c4',
    pulse: '#ffd58a',
    led: '#ffcf7a',
    chip: '#17191e',
    lid: '#2b2e35',
    metal: '#b7bac1',
    ceramic: '#a88d66',
    resistor: '#0f1013',
    can: '#c3c7ce',
    canTop: '#80858e',
    plastic: '#1c1e23',
    substrate: '#141a17',
    post: '#b3432a',
    postDark: '#5b2013',
    shade: [1, 0.66, 0.42],
  },
  /** PCB verde clásica. */
  green: {
    mask: '#0e3a22',
    edge: '#7a6a3a',
    copper: '#3f7a43',
    copperDim: '#15402a',
    pad: '#d8b25e',
    drill: '#030605',
    silk: '#f1f0e8',
    pulse: '#b8ffd8',
    led: '#9fffd2',
    chip: '#191a1e',
    lid: '#2c2f36',
    metal: '#bfc2c8',
    ceramic: '#b39a70',
    resistor: '#121316',
    can: '#c9ccd2',
    canTop: '#6e8fb0',
    plastic: '#1e2025',
    substrate: '#1d4a30',
    post: '#c0452c',
    postDark: '#5f2214',
    shade: [1, 0.68, 0.45],
  },
} as const satisfies Record<string, CityPalette>;

export type CityPaletteName = keyof typeof CITY_PALETTES;
