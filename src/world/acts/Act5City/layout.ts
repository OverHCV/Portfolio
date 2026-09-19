/**
 * Geometría de la placa del Acto 5, sin three: la comparten la escena, `board.ts`, `camera/path.ts`
 * e `index.astro` (límite de proyectos). Coordenadas (x, z) relativas al ancla del acto; y = 0 es
 * la superficie de la placa.
 *
 * La placa es una grilla de 4 × 4 distritos vista en isométrico: el distrito (0, 0) queda arriba
 * en pantalla y el (3, 3) abajo, junto al buzón. La cámara la recorre por filas diagonales, así
 * que el camino es fijo y no depende de cuántos proyectos haya (como el largo del muelle).
 */

/** Zócalos para proyectos: uno por distrito. */
export const CITY_SLOTS = 16;
const GRID = 4;
/** Lado de un distrito. */
export const DISTRICT = 12;
/** Media placa: los distritos ocupan ±24 y el resto es margen para conectores y el buzón. */
export const HALF = 30;
/** Celda de la grilla de ruteo. */
export const CELL = 0.5;

/** Cámara telefoto casi ortográfica: ver ARCHITECTURE.md §4.3. */
export const CITY_FOV = 10;
/** Distancia de la cámara al punto que mira durante el recorrido. */
export const CITY_DISTANCE = 125;
/** Plano cercano de la cámara en el acto: con la cámara tan lejos, más precisión de profundidad. */
export const CITY_NEAR = 10;
/** Dirección de la cámara desde su objetivo: azimut 45°, elevación ≈ 35.26° (isométrica). */
export const ISO_DIR: [number, number, number] = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];

/** Esquina inferior de la pantalla: el buzón, donde termina el recorrido. */
export const MAILBOX: [number, number] = [24.6, 24.6];
/** Centro desde el que se enciende la placa y alcance del encendido. */
export const BOOT_ORIGIN: [number, number] = [0, 0];
export const BOOT_RADIUS = 48;

export type XZ = [number, number];

const center = (i: number) => (i - (GRID - 1) / 2) * DISTRICT;

/** Distritos agrupados por fila diagonal (i + j), en serpentina: izquierda→derecha, luego al revés. */
const ROWS: XZ[][] = Array.from({ length: GRID * 2 - 1 }, (_, s) => {
  const row: [number, number][] = [];
  for (let i = 0; i < GRID; i++) {
    const j = s - i;
    if (j >= 0 && j < GRID) row.push([i, j]);
  }
  // En pantalla, x crece con (i − j).
  row.sort((a, b) => (a[0] - a[1] - (b[0] - b[1])) * (s % 2 === 0 ? 1 : -1));
  return row.map(([i, j]) => [center(i), center(j)] as XZ);
});

/** Zócalos en orden de la placa: el proyecto n ocupa `SLOTS[n]` (el primero es donde se acerca la vista). */
export const SLOTS: XZ[] = ROWS.flat();
