import { ACTS } from '../../acts.config';
import { smoothstep } from '../../lib/motion';

/**
 * Coreografía del Acto 5 sobre su progreso local. Sin three: la comparten la escena, la cámara
 * y el overlay.
 *
 *   0 ─ BOOT_START        bajo el velo dorado del `dive` (≈ 0.12 del acto): la placa entera, apagada
 *   BOOT_START ─ BOOT_END encendido: las trazas se encienden desde el centro y los componentes se
 *                         levantan, con la placa entera a la vista
 *   BOOT_END ─ FOCUS_AT   acerca la vista al primer proyecto (SLOTS[0])
 *   FOCUS_AT ─ MAIL_AT    exploración libre: se arrastra en XY (pan.ts) y el scroll solo acerca o
 *                         aleja; bajando, la vista se va hacia el buzón y el desplazamiento del
 *                         usuario se desvanece (panWeightAt), subiendo vuelve al primer proyecto
 *   MAIL_AT ─ 1           quieta frente al buzón
 */
export const BOOT_START = 0.1;
export const BOOT_END = 0.22;
export const FOCUS_AT = 0.32;
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
  return smoothstep(MAIL_AT - 0.08, MAIL_AT - 0.01, local);
}

/** Tramo de exploración: la tarjeta sigue al chip cercano al cursor (o al centro, sin cursor). */
export function exploringAt(local: number): boolean {
  return local > FOCUS_AT - 0.05 && local < MAIL_AT - 0.03;
}

/**
 * Cuánto pesa el desplazamiento del usuario en la cámara (0..1): entra al llegar al primer
 * proyecto y se desvanece en proporción al avance hacia el buzón, así el scroll siempre lleva a él.
 */
export function panWeightAt(local: number): number {
  return smoothstep(BOOT_END, FOCUS_AT, local) * (1 - clamp01((local - FOCUS_AT) / (MAIL_AT - FOCUS_AT)));
}
