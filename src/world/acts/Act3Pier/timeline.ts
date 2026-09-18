import { ACTS } from '../../acts.config';
import { smoothstep } from '../../lib/motion';
import { PIER, PIER_FAR } from './layout';

/**
 * Coreografía del Acto 3 sobre su progreso local. Sin three: la comparten la escena,
 * la cámara (FOV del ojo de pez), el overlay y el audio.
 *
 *   0 ─ ARRIVE_END          llegada: solo mar bajo los pies (el paisaje del Acto 2 ya se volvió agua)
 *   ARRIVE_END ─ BUILD_END  construcción: el faro sale del mar y el muelle se arma hacia la cámara
 *   BUILD_END ─ WALK_END    recorrido: medusas a los lados, faroles que se encienden al pasar
 *   WALK_END ─ 1            la puerta del faro se abre (velo `door` hacia el Acto 4)
 */
export const ARRIVE_END = 0.07;
export const BUILD_END = 0.22;
export const WALK_END = 0.95;

/** Ancho del frente de construcción, en fracción del muelle: cuántas tablas se arman a la vez. */
export const BUILD_STAGGER = 0.12;

const ACT = ACTS[2];
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Progreso local del Acto 3 a partir del global, acotado: vale también antes y después del acto. */
export function pierLocal(progress: number): number {
  return clamp01((progress - ACT.start) / (ACT.end - ACT.start));
}

/** El faro sale del mar antes que el muelle: es el destino. */
export function lighthouseAt(local: number): number {
  return smoothstep(ARRIVE_END, ARRIVE_END + 0.05, local);
}

/**
 * Apertura de la puerta del faro, al llegar frente a ella. Termina antes del velo `door`, que cubre
 * el último ~8% del acto (su zona opaca y el fundido, transitions.config.ts): hay que verla abrirse.
 */
export function doorOpenAt(local: number): number {
  return smoothstep(WALK_END - 0.12, WALK_END - 0.04, local);
}

/** Avance de la construcción del muelle (0..1), del faro hacia la cámara. */
export function buildAt(local: number): number {
  return clamp01((local - (ARRIVE_END + 0.03)) / (BUILD_END - ARRIVE_END - 0.03));
}

/**
 * Cuánto está armada una pieza según su orden (0 = junto al faro, 1 = bajo la cámara).
 * Espejo del cálculo en GLSL de `buildMaterial` (Pier.tsx).
 */
export function builtAt(order: number, build: number): number {
  return smoothstep(0, 1, (build * (1 + BUILD_STAGGER) - order) / BUILD_STAGGER);
}

/** Orden de construcción de una pieza en `z`. */
export function orderAt(z: number): number {
  return clamp01((z - PIER_FAR) / PIER.length);
}

/** Ojo de pez: nulo al llegar y al terminar la construcción, máximo a mitad de camino. */
export function fisheyeAt(local: number): number {
  const u = clamp01((local - ARRIVE_END) / (BUILD_END - ARRIVE_END));
  return Math.sin(Math.PI * u) ** 2;
}

/** Luz de un farol según dónde va la cámara: se enciende al acercarse y queda encendido detrás. */
export function lampGlow(lampZ: number, cameraZ: number): number {
  return smoothstep(lampZ + 16, lampZ + 8, cameraZ);
}

/** Volumen del Nocturno: casi inaudible al terminar el muelle, sube al caminar, se apaga en la puerta. */
export function musicAt(local: number): number {
  const start = smoothstep(BUILD_END - 0.03, BUILD_END, local) * 0.08;
  const walk = smoothstep(BUILD_END, 0.6, local) * 0.72;
  return (start + walk) * (1 - smoothstep(WALK_END - 0.03, 0.995, local));
}
