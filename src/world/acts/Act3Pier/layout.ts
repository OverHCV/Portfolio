/**
 * Medidas del Acto 3, relativas a su ancla (el nivel del mar es y = 0).
 * Sin three ni React: las comparten la escena y el camino de cámara (camera/path.ts).
 * El largo es fijo para que el camino no dependa del contenido; las medusas se reparten en él.
 */

export const PIER = {
  /** Extremo cercano: la última tabla en armarse queda bajo la cámara. */
  near: 4.2,
  length: 56,
  width: 2.4,
  /** Altura de la cubierta sobre el agua. */
  deck: 0.55,
  /** Paso entre tablas (tabla + rendija). */
  pitch: 0.5,
  /** Distancia entre pares de pilotes. */
  bay: 3.5,
} as const;

export const PIER_FAR = PIER.near - PIER.length;

/** Altura de los ojos al caminar sobre el muelle. */
export const EYE = PIER.deck + 1.15;

/** El faro: su puerta mira al muelle, un poco más allá del último tramo. */
export const LIGHTHOUSE = { z: PIER_FAR - 4.6, radius: 2.4, height: 15 } as const;

/** Faroles: uno cada `LAMP_STEP`, en lados alternos; el bulbo a `LAMP_HEIGHT` sobre la cubierta. */
export const LAMP_STEP = 7;
export const LAMP_HEIGHT = 1.9;
export const LAMPS: readonly { x: number; z: number }[] = Array.from(
  { length: Math.floor((PIER.length - 4) / LAMP_STEP) + 1 },
  (_, i) => ({ x: (i % 2 === 0 ? 1 : -1) * (PIER.width / 2 + 0.05), z: PIER.near - 3 - i * LAMP_STEP }),
);

/** Tramo del muelle donde flotan las medusas (el recorrido, sin la llegada ni la puerta). */
const JELLY_NEAR = PIER.near - 9;
const JELLY_FAR = PIER_FAR + 7;

/** Posición de la medusa del hito `i` de `n`: la más antigua primero, lados alternos. */
export function jellyAt(i: number, n: number): [number, number, number] {
  const t = n > 1 ? i / (n - 1) : 0.5;
  const side = i % 2 === 0 ? -1 : 1;
  return [side * (PIER.width / 2 + 2.2), 1.3 + 0.35 * Math.sin(i * 2.1), JELLY_NEAR + t * (JELLY_FAR - JELLY_NEAR)];
}
