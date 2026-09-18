import { CatmullRomCurve3, Vector3 } from 'three';
import { ACTS, type ActId } from '../acts.config';
import { EYE, PIER, PIER_FAR } from '../acts/Act3Pier/layout';
import { ARRIVE_END, BUILD_END, WALK_END, fisheyeAt, pierLocal } from '../acts/Act3Pier/timeline';

/** Centro de cada acto en el mundo. Las escenas se construyen alrededor de su ancla. */
export const ACT_ANCHORS: Record<ActId, Vector3> = {
  1: new Vector3(0, 0, 0),
  2: new Vector3(0, 0, -80),
  // Junto al Acto 2 y con el mar a la altura del paisaje en calma: la frontera 2→3 no tiene viaje.
  // El desfase es múltiplo de la celda del paisaje, así su malla y la del mar coinciden.
  3: new Vector3(-3, 0, -78),
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

/** Cuánto se corre el encuadre hacia la izquierda de la cámara: deja libre la columna de texto. */
const TEXT_LEAD = 3.5;

/** Toma que mira al centro del acto pero desplazada a la izquierda, para que el sujeto quede a la derecha. */
function framed(t: number, position: Vec): Shot {
  const [x, , z] = position;
  const len = Math.hypot(x, z) || 1;
  // Izquierda de la cámara en el plano xz = (fz, −fx) con f = dirección hacia el centro.
  return { t, position, target: [(-z / len) * TEXT_LEAD, 0, (x / len) * TEXT_LEAD] };
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
  // Sale del agujero negro mirando desde arriba → órbita a tres cuartos durante los capítulos,
  // con el paisaje a la derecha del texto → se acerca y pica hacia la superficie ya en calma.
  2: [
    { t: 0, position: [0, 15, 9], target: [0, -1, 0] },
    framed(0.14, [8, 7.5, 15]),
    framed(0.48, [1, 7, 16]),
    framed(0.82, [-7, 7.5, 14]),
    { t: 1, position: [-3, 2.4, 6], target: [-3.5, -1.4, -1.5] },
  ],
  // Flotando sobre el mar, aún mirando hacia abajo (sigue el picado del Acto 2) → levanta la vista
  // al horizonte → quieta mientras el muelle llega bajo ella → camina hasta la puerta del faro.
  3: [
    { t: 0, position: [0, EYE, PIER.near - 0.7], target: [0, -0.4, PIER.near - 8] },
    { t: ARRIVE_END, position: [0, EYE, PIER.near - 0.8], target: [0, 1.2, PIER.near - 40] },
    { t: BUILD_END, position: [0, EYE, PIER.near - 1], target: [0, 1.5, PIER.near - 40] },
    { t: (BUILD_END + WALK_END) / 2, position: [0, EYE, (PIER.near - 1 + PIER_FAR + 2.5) / 2], target: [0, 1.6, PIER_FAR - 20] },
    { t: WALK_END, position: [0, EYE, PIER_FAR + 2.5], target: [0, EYE + 0.2, PIER_FAR - 8] },
    { t: 1, position: [0, EYE - 0.05, PIER_FAR + 0.6], target: [0, EYE, PIER_FAR - 8] },
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

/**
 * Ventana de viaje de la frontera que sale del acto `from`. La 2→3 casi no tiene: los actos están
 * pegados y la cámara pasa del picado sobre el paisaje a flotar sobre el mar a la vista, sin velo.
 */
export function travelHalfWindow(from: ActId): number {
  return from === 2 ? 0.004 : TRAVEL_HALF_WINDOW;
}

interface Keyframe {
  p: number;
  position: Vector3;
  target: Vector3;
}

const KEYFRAMES: Keyframe[] = ACTS.flatMap((act, i) => {
  const from = i === 0 ? act.start : act.start + travelHalfWindow(ACTS[i - 1].id);
  const to = i === ACTS.length - 1 ? act.end : act.end - travelHalfWindow(act.id);
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

/** FOV normal y el máximo del ojo de pez durante la construcción del muelle. */
export const BASE_FOV = 55;
const FISHEYE_FOV = 72;

export function fovAt(progress: number): number {
  return BASE_FOV + (FISHEYE_FOV - BASE_FOV) * fisheyeAt(pierLocal(progress));
}
