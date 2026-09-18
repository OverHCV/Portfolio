import { Vector3 } from 'three';

type Vec = [number, number, number];

/** Pozo gaussiano: un mínimo del paisaje de soluciones. */
interface Well {
  center: Vector3;
  depth: number;
  width: number;
}

/** Límites de la red de conos (unidades relativas al ancla del acto). */
export const BOUNDS = { x: 7.7, y: 2.2, z: 5.5 };

// Mínimos locales que no son ningún fragmento de bio: no todo camino llega a una solución.
const DECOYS: Vec[] = [
  [-5.5, -1.2, -3.8],
  [5.2, 0.8, 3.6],
];

const WAVE = { amplitude: 0.18, kx: 0.7, kz: 0.55 };
const BOWL = 0.06;

/**
 * Paisaje fijo f(x, y, z): un pozo profundo en cada nodo de bio, dos pozos poco profundos,
 * una onda suave y un cuenco en y. Devuelve la dirección de descenso −∇f (analítica).
 */
export function createField(nodes: Vec[]) {
  const wells: Well[] = [
    ...nodes.map((c) => ({ center: new Vector3(...c), depth: 1.3, width: 2.2 })),
    ...DECOYS.map((c) => ({ center: new Vector3(...c), depth: 0.55, width: 1.6 })),
  ];
  const d = new Vector3();

  function descent(p: Vector3, out: Vector3): Vector3 {
    // ∇ de −depth·e^(−|p−c|²/2w²) = depth·e^(−q)·(p−c)/w²
    out.set(0, 0, 0);
    for (const w of wells) {
      d.subVectors(p, w.center);
      const w2 = w.width * w.width;
      const g = w.depth * Math.exp(-d.lengthSq() / (2 * w2)) / w2;
      out.addScaledVector(d, g);
    }
    const { amplitude: a, kx, kz } = WAVE;
    out.x += a * kx * Math.cos(kx * p.x) * Math.cos(kz * p.z);
    out.z += -a * kz * Math.sin(kx * p.x) * Math.sin(kz * p.z);
    out.y += 2 * BOWL * p.y;
    // out es ∇f; el descenso es su opuesto.
    return out.negate();
  }

  return { descent, wells };
}

export type Field = ReturnType<typeof createField>;

/** Integra una línea de corriente desde `seed` siguiendo el descenso hasta caer en un pozo. */
export function streamline(field: Field, seed: Vector3, step = 0.07, maxSteps = 220): Vector3[] {
  const points = [seed.clone()];
  const p = seed.clone();
  const dir = new Vector3();
  for (let i = 0; i < maxSteps; i++) {
    field.descent(p, dir);
    const len = dir.length();
    if (len < 1e-3) break;
    p.addScaledVector(dir, step / len);
    if (Math.abs(p.x) > BOUNDS.x || Math.abs(p.y) > BOUNDS.y + 0.5 || Math.abs(p.z) > BOUNDS.z) break;
    points.push(p.clone());
    if (field.wells.some((w) => w.center.distanceToSquared(p) < 0.04)) break;
  }
  return points;
}
