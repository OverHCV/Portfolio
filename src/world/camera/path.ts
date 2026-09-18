import { CatmullRomCurve3, Vector3 } from 'three';
import { ACTS, type ActId } from '../acts.config';

/** Centro de cada acto en el mundo. Las escenas se construyen alrededor de su ancla. */
export const ACT_ANCHORS: Record<ActId, Vector3> = {
  1: new Vector3(0, 0, 0),
  2: new Vector3(0, 0, -80),
  3: new Vector3(12, -2, -170),
  4: new Vector3(12, 0, -260),
  5: new Vector3(0, 0, -340),
};

type Vec = [number, number, number];

/** Pose de cámara relativa al ancla del acto, en un instante `t` (0..1) del acto. */
interface Shot {
  t: number;
  position: Vec;
  target: Vec;
}

/**
 * Tomas de cámara por acto. Viven aquí y no en cada acto para que el camino completo
 * esté disponible sin cargar los chunks de los actos.
 */
const SHOTS: Record<ActId, Shot[]> = {
  // Frente al agujero negro → se acerca → entra en el horizonte de eventos (transición `lens`).
  1: [
    // El target bajo deja el agujero negro en el tercio superior y libre el título debajo.
    { t: 0, position: [0, 1.1, 15], target: [0, -2.2, 0] },
    { t: 0.55, position: [0, 0.7, 9], target: [0, -0.8, 0] },
    { t: 1, position: [0, 0.05, 1.1], target: [0, 0, 0] },
  ],
  // Tres cuartos con una órbita lenta alrededor del campo.
  2: [
    { t: 0, position: [11, 6, 10], target: [0, -0.5, 0] },
    { t: 0.5, position: [5, 4, 10], target: [0, 0, 0] },
    { t: 1, position: [-2.5, 3.5, 9], target: [0, 0, 0] },
  ],
  // Provisional hasta M2.
  3: [
    { t: 0, position: [0, 1.2, 10], target: [0, 0, 0] },
    { t: 1, position: [0, 0.6, 5], target: [0, 0, 0] },
  ],
  // Plano del piano → vista cenital → picado dentro del piano (transición `dive`).
  4: [
    { t: 0, position: [0, 1.5, 8], target: [0, 0, 0] },
    { t: 0.45, position: [0, 1.2, 4.5], target: [0, 0, 0] },
    { t: 0.8, position: [0, 7, 0.6], target: [0, -0.4, 0] },
    { t: 1, position: [0, 0.6, 0.1], target: [0, -0.5, 0] },
  ],
  // Casi isométrica desde arriba; la cámara ortográfica llega en M4.
  5: [
    { t: 0, position: [0, 10, 10], target: [0, 0, 0] },
    { t: 1, position: [4, 7, 7], target: [2, 0, 0] },
  ],
};

/**
 * Fracción de progreso a cada lado de un límite entre actos reservada al viaje de un acto al siguiente.
 * Durante ese viaje el velo de transición está opaco (ver transitions.config.ts).
 */
export const TRAVEL_HALF_WINDOW = 0.015;

interface Keyframe {
  p: number;
  position: Vector3;
  target: Vector3;
}

const KEYFRAMES: Keyframe[] = ACTS.flatMap((act, i) => {
  const from = i === 0 ? act.start : act.start + TRAVEL_HALF_WINDOW;
  const to = i === ACTS.length - 1 ? act.end : act.end - TRAVEL_HALF_WINDOW;
  const anchor = ACT_ANCHORS[act.id];
  return SHOTS[act.id].map((shot) => ({
    p: from + shot.t * (to - from),
    position: anchor.clone().add(new Vector3(...shot.position)),
    target: anchor.clone().add(new Vector3(...shot.target)),
  }));
});

const positionCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => k.position), false, 'centripetal');
const targetCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => k.target), false, 'centripetal');

/**
 * `getPoint(t)` (no `getPointAt`) pasa por el punto de control j en t = j / (n - 1),
 * así que basta mapear `progress` a t de forma lineal entre keyframes.
 */
function progressToT(progress: number): number {
  const last = KEYFRAMES.length - 1;
  if (progress <= KEYFRAMES[0].p) return 0;
  if (progress >= KEYFRAMES[last].p) return 1;
  let j = 0;
  while (progress > KEYFRAMES[j + 1].p) j++;
  const u = (progress - KEYFRAMES[j].p) / (KEYFRAMES[j + 1].p - KEYFRAMES[j].p);
  return (j + u) / last;
}

export function sampleCamera(progress: number, outPosition: Vector3, outTarget: Vector3) {
  const t = progressToT(progress);
  positionCurve.getPoint(t, outPosition);
  targetCurve.getPoint(t, outTarget);
}
