export type ActId = 1 | 2 | 3 | 4 | 5;

export interface ActDef {
  id: ActId;
  /** Clave de traducción: `acts.<key>`; también es el id de la sección semántica. */
  key: 'galaxy' | 'field' | 'pier' | 'lighthouse' | 'city';
  start: number;
  end: number;
  /** Progreso global donde aterriza la navbar: pasado el velo y la intro, ya con el acto a la vista. */
  land: number;
}

/**
 * Peso de cada acto en el recorrido: cuánto scroll ocupa respecto a los demás.
 * Los rangos de `progress` se calculan a partir de aquí y siempre quedan contiguos,
 * así que se puede alargar o acortar un acto sin romper el resto.
 * `land` es el punto de llegada desde la navbar, en progreso local del acto (0..1): así
 * sigue cayendo en el mismo momento de la coreografía aunque cambien los pesos.
 */
const WEIGHTS: readonly { id: ActId; key: ActDef['key']; weight: number; land: number }[] = [
  { id: 1, key: 'galaxy', weight: 1, land: 0 },
  { id: 2, key: 'field', weight: 3, land: 0.203 },
  { id: 3, key: 'pier', weight: 3, land: 0.078 },
  { id: 4, key: 'lighthouse', weight: 3, land: 0.593 },
  { id: 5, key: 'city', weight: 4, land: 0.24 },
];

const TOTAL_WEIGHT = WEIGHTS.reduce((sum, a) => sum + a.weight, 0);

/** Rangos de `progress` por acto (ARCHITECTURE.md §4.2), derivados de WEIGHTS. */
export const ACTS: readonly ActDef[] = WEIGHTS.reduce<ActDef[]>((acts, { id, key, weight, land }) => {
  const start = acts.length ? acts[acts.length - 1].end : 0;
  const end = id === WEIGHTS[WEIGHTS.length - 1].id ? 1 : start + weight / TOTAL_WEIGHT;
  acts.push({ id, key, start, end, land: start + land * (end - start) });
  return acts;
}, []);

/** Alturas de viewport de scroll por unidad de peso: el largo total sale de los pesos. */
const VH_PER_WEIGHT = 82;

/** Largo total del recorrido de scroll, en alturas de viewport. */
export const SCROLL_LENGTH_VH = Math.round(TOTAL_WEIGHT * VH_PER_WEIGHT);

export function actAt(progress: number): { act: ActDef; local: number } {
  const p = Math.min(Math.max(progress, 0), 1);
  const act = ACTS.find((a) => p < a.end) ?? ACTS[ACTS.length - 1];
  return { act, local: (p - act.start) / (act.end - act.start) };
}
