import { ACTS } from '../../acts.config';
import { smoothstep } from '../../lib/motion';

/**
 * Coreografía del Acto 5 sobre su progreso local. Sin three: la comparten la escena, la cámara
 * y el overlay.
 *
 *   0 ─ BOOT_START        bajo el velo dorado del `dive` (≈ 0.12 del acto): la placa entera, apagada
 *   BOOT_START ─ BOOT_END encendido: las trazas se encienden desde el centro y los componentes se
 *                         levantan, con la placa entera a la vista
 *   BOOT_END ─ PAN_START  baja hacia el primer distrito
 *   PAN_START ─ PAN_END   recorrido por los distritos (filas diagonales, layout.ts → ROUTE)
 *   PAN_END ─ MAIL_AT     se acerca al buzón
 *   MAIL_AT ─ 1           quieta frente al buzón
 */
export const BOOT_START = 0.1;
export const BOOT_END = 0.22;
export const PAN_START = 0.28;
export const PAN_END = 0.86;
export const MAIL_AT = 0.94;

const ACT = ACTS[4];
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Progreso local del Acto 5 a partir del global, acotado. */
export function cityLocal(progress: number): number {
  return clamp01((progress - ACT.start) / (ACT.end - ACT.start));
}

/** Encendido de la placa (0..1): alcance del frente de encendido. */
export function bootAt(local: number): number {
  return smoothstep(BOOT_START, BOOT_END, local);
}

/** Cercanía al buzón (0..1): la bandera sube y el overlay invita a escribir. */
export function mailboxAt(local: number): number {
  return smoothstep(PAN_END + 0.02, MAIL_AT - 0.01, local);
}

/** Tramo en que la tarjeta breve sigue al chip más cercano al centro de la pantalla. */
export function touringAt(local: number): boolean {
  return local > PAN_START - 0.03 && local < PAN_END + 0.03;
}
