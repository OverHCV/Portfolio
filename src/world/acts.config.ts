export type ActId = 1 | 2 | 3 | 4 | 5;

export interface ActDef {
  id: ActId;
  /** Clave de traducción: `acts.<key>`; también es el id de la sección semántica. */
  key: 'galaxy' | 'field' | 'pier' | 'lighthouse' | 'city';
  start: number;
  end: number;
}

/** Rangos de `progress` por acto (ARCHITECTURE.md §4.2). Deben ser contiguos y cubrir 0..1. */
export const ACTS: readonly ActDef[] = [
  { id: 1, key: 'galaxy', start: 0.0, end: 0.1 },
  { id: 2, key: 'field', start: 0.29, end: 0.3 },
  { id: 3, key: 'pier', start: 0.6, end: 0.7 },
  { id: 4, key: 'lighthouse', start: 0.8, end: 0.81 },
  { id: 5, key: 'city', start: 0.9, end: 1.0 },
];

/** Largo total del recorrido de scroll, en alturas de viewport. */
export const SCROLL_LENGTH_VH = 1000;

export function actAt(progress: number): { act: ActDef; local: number } {
  const p = Math.min(Math.max(progress, 0), 1);
  const act = ACTS.find((a) => p < a.end) ?? ACTS[ACTS.length - 1];
  return { act, local: (p - act.start) / (act.end - act.start) };
}
