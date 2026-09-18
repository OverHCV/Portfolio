import { ACTS } from '../../acts.config';
import { smoothstep } from '../../lib/motion';

/**
 * Coreografía del Acto 2 sobre su progreso local. Sin three: la comparten la escena,
 * el overlay DOM y el cielo.
 *
 *   0 ─ INTRO_END            salida del agujero negro: negro → el paisaje se revela
 *   INTRO_END ─ OUTRO_START  un capítulo por fragmento de bio, todos del mismo largo
 *   OUTRO_START ─ OUTRO_END  calma: el paisaje se aplana, se apaga y vuelven las estrellas
 *   OUTRO_END ─ 1            solo estrellas: el velo hacia el muelle cubre el viaje de cámara
 */
export const INTRO_END = 0.08;
export const OUTRO_START = 0.85;
export const OUTRO_END = 0.94;

const ACT = ACTS[1];
const SPAN = OUTRO_START - INTRO_END;

export interface ChapterState {
  /** Capítulo más cercano (0..n-1). */
  index: number;
  /** Radio de revelado del paisaje (0..1). */
  reveal: number;
  /** 0 = paisaje vivo, 1 = mar en calma. */
  calm: number;
  /** Opacidad global del paisaje. */
  opacity: number;
  /** Opacidad del texto de los capítulos. */
  text: number;
  /** Peso de cada capítulo (0..1): cuánto se hunde su pozo y brilla su nodo. */
  focus: number[];
}

/** Progreso local del Acto 2 a partir del global, acotado: vale también antes y después del acto. */
export function localOf(progress: number): number {
  return Math.min(Math.max((progress - ACT.start) / (ACT.end - ACT.start), 0), 1);
}

export function chapterAt(local: number, n: number, out?: ChapterState): ChapterState {
  const s = out ?? { index: 0, reveal: 0, calm: 0, opacity: 0, text: 0, focus: [] };
  // Posición continua en capítulos: i + 0.5 es el centro del capítulo i.
  const c = ((local - INTRO_END) / SPAN) * n;
  s.index = Math.min(Math.max(Math.floor(c), 0), Math.max(n - 1, 0));
  s.reveal = smoothstep(0, INTRO_END + 0.05, local);
  s.calm = smoothstep(OUTRO_START, OUTRO_END - 0.02, local);
  s.opacity = 1 - smoothstep(OUTRO_START + 0.03, OUTRO_END, local);
  s.text = smoothstep(INTRO_END - 0.02, INTRO_END + 0.03, local) * (1 - smoothstep(OUTRO_START - 0.03, OUTRO_START + 0.01, local));
  s.focus.length = n;
  for (let i = 0; i < n; i++) s.focus[i] = smoothstep(0, 1, 1 - Math.abs(c - (i + 0.5)) * 1.4) * s.text;
  return s;
}

/** Opacidad del cielo en el Acto 2: sin estrellas dentro del agujero negro, vuelven al salir. */
export function starsAt(local: number): number {
  return smoothstep(OUTRO_START, OUTRO_END, local);
}

/** Progreso global donde el capítulo `i` queda centrado (para navegar hacia él). */
export function chapterProgress(i: number, n: number): number {
  const local = INTRO_END + ((i + 0.5) / n) * SPAN;
  return ACT.start + local * (ACT.end - ACT.start);
}
