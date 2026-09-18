import { LAMPS } from './layout';

/**
 * Estado del Acto 3 en el frame actual. Lo escribe `index.tsx` una vez por frame y lo leen
 * los hijos en su propio `useFrame` (se muta, no provoca renders).
 */
export interface PierFrame {
  /** Segundos de animación (más lentos con reduced motion). */
  time: number;
  /** Progreso local del acto (0..1), acotado. */
  local: number;
  /** Opacidad del mar: 0 → 1 mientras el paisaje del Acto 2 se funde con él. */
  sea: number;
  /** Avance de la construcción del muelle. */
  build: { value: number };
  /** El faro saliendo del mar. */
  lighthouse: number;
  /** Apertura de la puerta del faro (0..1). */
  door: number;
  /** z de la cámara en coordenadas del acto. */
  cameraZ: number;
  /** Luz de cada farol (0..1), ya multiplicada por lo armado que está. */
  lampGlow: Float32Array;
}

export function createPierFrame(): PierFrame {
  return {
    time: 0,
    local: 0,
    sea: 0,
    build: { value: 0 },
    lighthouse: 0,
    door: 0,
    cameraZ: 0,
    lampGlow: new Float32Array(LAMPS.length),
  };
}

/** Índices de los `k` faroles encendidos más cercanos a la cámara (para las luces reales). */
export function nearestLamps(frame: PierFrame, k: number, out: number[]): number[] {
  out.length = 0;
  const order = LAMPS.map((_, i) => i)
    .filter((i) => frame.lampGlow[i] > 0.01)
    .sort((a, b) => Math.abs(LAMPS[a].z - frame.cameraZ) - Math.abs(LAMPS[b].z - frame.cameraZ));
  for (let i = 0; i < Math.min(k, order.length); i++) out.push(order[i]);
  return out;
}
