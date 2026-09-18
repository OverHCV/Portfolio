import { BufferGeometry, Float32BufferAttribute } from 'three';
import { offsetPolyline } from './board';
import type { XZ } from './layout';

interface RibbonItem {
  pts: XZ[];
  width: number;
}

type Extra<T> = Record<string, { size: 1 | 2; value: (item: T) => number | [number, number] }>;

/**
 * Cintas planas (pistas, serigrafía) de muchas polilíneas en una sola geometría: uniones a inglete,
 * extremos cuadrados. Atributos: `aArc` (largo recorrido), `aAcross` (−1..1 a lo ancho, para el
 * antialias en el shader) y los que pida el llamador, constantes por polilínea.
 */
export function ribbonGeometry<T extends RibbonItem>(items: T[], y: (item: T) => number, extra: Extra<T> = {}): BufferGeometry {
  const positions: number[] = [];
  const arcs: number[] = [];
  const across: number[] = [];
  const extras: Record<string, number[]> = Object.fromEntries(Object.keys(extra).map((k) => [k, []]));
  const index: number[] = [];

  for (const item of items) {
    const pts = extendEnds(item.pts, item.width / 2);
    if (pts.length < 2) continue;
    const left = offsetPolyline(pts, item.width / 2);
    const right = offsetPolyline(pts, -item.width / 2);
    const h = y(item);
    const values = Object.entries(extra).map(([k, { value }]) => [k, value(item)] as const);
    const base = positions.length / 3;
    let arc = 0;
    pts.forEach((p, i) => {
      if (i > 0) arc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      for (const [side, q] of [
        [-1, left[i]],
        [1, right[i]],
      ] as const) {
        positions.push(q[0], h, q[1]);
        arcs.push(arc);
        across.push(side);
        for (const [k, v] of values) {
          if (typeof v === 'number') extras[k].push(v);
          else extras[k].push(v[0], v[1]);
        }
      }
      if (i > 0) {
        const a = base + (i - 1) * 2;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aArc', new Float32BufferAttribute(arcs, 1));
  geometry.setAttribute('aAcross', new Float32BufferAttribute(across, 1));
  for (const [k, { size }] of Object.entries(extra)) geometry.setAttribute(k, new Float32BufferAttribute(extras[k], size));
  geometry.setIndex(index);
  return geometry;
}

/** Alarga los extremos medio ancho: las puntas quedan cuadradas y tapan el pad o la vía. */
function extendEnds(pts: XZ[], d: number): XZ[] {
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-4);
  if (clean.length < 2) return clean;
  const out = clean.map((p) => [...p] as XZ);
  const push = (i: number, j: number) => {
    const dx = out[i][0] - out[j][0];
    const dz = out[i][1] - out[j][1];
    const l = Math.hypot(dx, dz) || 1;
    out[i] = [out[i][0] + (dx / l) * d, out[i][1] + (dz / l) * d];
  };
  push(0, 1);
  push(out.length - 1, out.length - 2);
  return out;
}
