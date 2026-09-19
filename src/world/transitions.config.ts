import { ACTS, type ActId } from './acts.config';
import { travelHalfWindow } from './camera/path';
import { SEA_HANDOFF } from './acts/Act2Field/chapters';
import { COLORS } from './theme';

export type TransitionKind = 'lens' | 'sea' | 'door' | 'dive';

export interface TransitionDef {
  from: ActId;
  to: ActId;
  kind: TransitionKind;
  /** Progreso global del límite entre actos. */
  at: number;
  /** false: no hay velo, los actos se funden a la vista (2→3: el paisaje se vuelve mar). */
  veil: boolean;
  /** Distancia a `at` durante la que el velo está totalmente opaco (cubre el viaje de cámara). */
  hold: number;
  /** Distancia a `at` durante la que se dibujan ambos actos (ActGate). */
  overlap: number;
  /** Largo del fundido de entrada/salida alrededor de la zona opaca. */
  fade: number;
  color: string;
}

type KindDef = Pick<TransitionDef, 'kind' | 'veil' | 'fade' | 'color'> & { overlap?: number };

const KINDS: Record<string, KindDef> = {
  '1-2': { kind: 'lens', veil: true, fade: 0.02, color: COLORS.void },
  // Sin velo: la malla del paisaje en calma se funde con el mar en el mismo sitio (chapters.ts).
  '2-3': { kind: 'sea', veil: false, fade: 0, color: COLORS.void, overlap: SEA_HANDOFF },
  // Cruzar la puerta es entrar en su luz: blanco cálido que crece mientras la cámara se acerca y se
  // disuelve ya dentro del faro (los ojos que se acostumbran a la penumbra del cuarto).
  '3-4': { kind: 'door', veil: true, fade: 0.035, color: '#fff4dc' },
  '4-5': { kind: 'dive', veil: true, fade: 0.018, color: COLORS.glow },
};

/** ARCHITECTURE.md §4.5: una transición por frontera entre actos. */
export const TRANSITIONS: TransitionDef[] = ACTS.slice(0, -1).map((act, i) => {
  const next = ACTS[i + 1];
  const { overlap, ...def } = KINDS[`${act.id}-${next.id}`];
  const hold = travelHalfWindow(act.id);
  return { from: act.id, to: next.id, at: act.end, hold, overlap: overlap ?? hold, ...def };
});

/** Progreso global en que empieza a aparecer el velo de la frontera que sale del acto `from`. */
export function veilStartAt(from: ActId): number {
  const tr = TRANSITIONS.find((t) => t.from === from)!;
  return tr.at - tr.hold - tr.fade;
}

/** Opacidad del velo (0..1) y la transición activa para un progreso dado. */
export function veilAt(progress: number): { transition: TransitionDef | null; opacity: number } {
  for (const tr of TRANSITIONS) {
    if (!tr.veil) continue;
    const d = Math.abs(progress - tr.at);
    if (d <= tr.hold + tr.fade) {
      const x = Math.max(0, d - tr.hold) / tr.fade;
      return { transition: tr, opacity: 1 - x * x * (3 - 2 * x) };
    }
  }
  return { transition: null, opacity: 0 };
}
