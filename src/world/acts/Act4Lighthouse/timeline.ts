import { ACTS } from '../../acts.config';
import { smoothstep } from '../../lib/motion';

/**
 * Coreografía del Acto 4 sobre su progreso local. Sin three: la comparten la escena, la cámara,
 * el overlay y el audio.
 *
 *   0 ─ ENTER_END           entrada: recién cruzada la puerta, el piano bajo el foco
 *   ENTER_END ─ PIANO_END   plano del piano: las teclas se pueden tocar
 *   PIANO_END ─ STAND       acercamiento al atril
 *   STAND ─ ALBUM_END       cámara quieta frente al álbum: las hojas se pasan con clic o arrastrando
 *   ALBUM_END ─ 1           sube a vista cenital y se hunde en el piano (transición `dive`)
 */
export const ENTER_END = 0.08;
export const PIANO_END = 0.35;
export const STAND = 0.48;
export const ALBUM_END = 0.85;

const ACT = ACTS[3];
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Progreso local del Acto 4 a partir del global, acotado. */
export function lighthouseLocal(progress: number): number {
  return clamp01((progress - ACT.start) / (ACT.end - ACT.start));
}

/** Álbum activo (interacción + overlay): pleno mientras la cámara está quieta en el atril. */
export function albumAt(local: number): number {
  return smoothstep(STAND - 0.04, STAND, local) * (1 - smoothstep(ALBUM_END, ALBUM_END + 0.03, local));
}

/** Teclas tocables: desde la entrada hasta que la cámara se va hacia el atril. */
export function keysAt(local: number): number {
  return smoothstep(0.01, ENTER_END, local) * (1 - smoothstep(PIANO_END + 0.02, STAND - 0.05, local));
}
