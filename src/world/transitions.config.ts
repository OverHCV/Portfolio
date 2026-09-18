import { ACTS, type ActId } from './acts.config';
import { TRAVEL_HALF_WINDOW } from './camera/path';
import { COLORS } from './theme';

export type TransitionKind = 'lens' | 'horizon' | 'door' | 'dive';

export interface TransitionDef {
  from: ActId;
  to: ActId;
  kind: TransitionKind;
  /** Progreso global del límite entre actos. */
  at: number;
  /** Distancia a `at` durante la que el velo está totalmente opaco (cubre el viaje de cámara). */
  hold: number;
  /** Largo del fundido de entrada/salida alrededor de la zona opaca. */
  fade: number;
  color: string;
}

const KINDS: Record<string, { kind: TransitionKind; fade: number; color: string }> = {
  '1-2': { kind: 'lens', fade: 0.02, color: COLORS.void },
  '2-3': { kind: 'horizon', fade: 0.025, color: COLORS.void },
  '3-4': { kind: 'door', fade: 0.006, color: '#000000' },
  '4-5': { kind: 'dive', fade: 0.018, color: COLORS.glow },
};

/** ARCHITECTURE.md §4.5: una transición por frontera entre actos. */
export const TRANSITIONS: TransitionDef[] = ACTS.slice(0, -1).map((act, i) => {
  const next = ACTS[i + 1];
  const def = KINDS[`${act.id}-${next.id}`];
  return { from: act.id, to: next.id, at: act.end, hold: TRAVEL_HALF_WINDOW, ...def };
});

/** Opacidad del velo (0..1) y la transición activa para un progreso dado. */
export function veilAt(progress: number): { transition: TransitionDef | null; opacity: number } {
  for (const tr of TRANSITIONS) {
    const d = Math.abs(progress - tr.at);
    if (d <= tr.hold + tr.fade) {
      const x = Math.max(0, d - tr.hold) / tr.fade;
      return { transition: tr, opacity: 1 - x * x * (3 - 2 * x) };
    }
  }
  return { transition: null, opacity: 0 };
}
