/**
 * Medidas del Acto 4, relativas a su ancla (el suelo del faro es y = 0, el piano está en el origen
 * con el teclado mirando a +z, hacia la puerta). Sin three ni React: las comparten la escena y el
 * camino de cámara (camera/path.ts).
 *
 * Las del piano salen de `public/models/piano.glb` (scripts/models/piano.py imprime su bbox).
 */

/** Cuarto circular de la base del faro. La puerta queda en +z, detrás de la cámara al entrar. */
export const ROOM = { radius: 6, height: 7.5 } as const;

/** Teclado del modelo: sobre él se ponen las 88 teclas propias (Keys.tsx). */
export const KEYBED = {
  /** Altura de la cara superior de las teclas blancas. */
  top: 0.772,
  left: -0.601,
  right: 0.601,
  /** Borde frontal (hacia el pianista) y fondo de las teclas blancas. */
  front: 0.876,
  back: 0.652,
} as const;

/** Atril del modelo: el libro se apoya en su repisa, inclinado hacia atrás. */
export const STAND = {
  /** Lomo del libro, en su borde inferior (sobre la repisa). */
  spine: [0, 1.09, 0.622] as [number, number, number],
  /** Inclinación hacia atrás (rad). */
  tilt: 0.3,
} as const;

/** Libro abierto: cada página mide PAGE.width × PAGE.height (proporción A4 aprox.). */
export const PAGE = { width: 0.3, height: 0.42 } as const;

/** Centro de la cara del libro y su normal (hacia la cámara), para encuadrar la toma del atril. */
export const BOOK_CENTER: [number, number, number] = [
  STAND.spine[0],
  STAND.spine[1] + (PAGE.height / 2) * Math.cos(STAND.tilt),
  STAND.spine[2] - (PAGE.height / 2) * Math.sin(STAND.tilt),
];
export const BOOK_NORMAL: [number, number, number] = [0, Math.sin(STAND.tilt), Math.cos(STAND.tilt)];

/** Distancia de la cámara al libro en la toma del atril, con pantalla 16:9. */
export const BOOK_DISTANCE = 0.66;
/**
 * Punto de mira de la toma del atril, un poco bajo el centro del libro (a lo largo de la página):
 * sube el libro en pantalla y deja libre la franja inferior para el overlay y la navbar.
 */
const BOOK_FRAME_DROP = 0.07;
export const BOOK_AIM: [number, number, number] = [
  BOOK_CENTER[0],
  BOOK_CENTER[1] - BOOK_FRAME_DROP * Math.cos(STAND.tilt),
  BOOK_CENTER[2] + BOOK_FRAME_DROP * Math.sin(STAND.tilt),
];

/** Banco del pianista y el violín recostado encima. */
export const BENCH = { z: 1.5, width: 0.9, depth: 0.38, height: 0.5 } as const;
export const VIOLIN = {
  position: [0.12, BENCH.height + 0.056, BENCH.z + 0.02] as [number, number, number],
  yaw: 1.15,
} as const;

/** Foco único, sobre el piano y un poco hacia el teclado. */
export const SPOT = {
  position: [0.35, ROOM.height - 0.4, 1.1] as [number, number, number],
  target: [0, 0.8, 0.25] as [number, number, number],
} as const;
