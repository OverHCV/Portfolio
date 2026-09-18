import type { ChipKind, Project } from '../../types';
import { CELL, DISTRICT, HALF, MAILBOX, SLOTS, type XZ } from './layout';
import { ROLE } from './palette';

/**
 * La placa del Acto 5 generada desde los proyectos, sin three y determinista (RNG con semilla):
 * la misma lista de proyectos da siempre la misma placa. Se calcula una vez al montar el acto.
 *
 *  1. Un chip por proyecto en su zócalo (layout.ts); los zócalos libres quedan como huellas sin
 *     poblar (DNP), así la placa siempre se ve completa.
 *  2. Calles: cada `connectsTo` se rutea con A* sobre una grilla con ocupación, en tramos rectos y a
 *     45° como una PCB real, y se dibuja como un bus de tres pistas.
 *  3. Relleno: abanicos de pistas desde los pines de cada chip hasta vías, buses largos en la capa
 *     inferior y en los pasillos entre distritos, pasivos con sus pads, conectores en el borde.
 *
 * Todo sale como listas planas (cajas, cilindros, pads, pistas, serigrafía, rótulos) que la escena
 * convierte en un puñado de draw calls.
 */

export interface BoxPart {
  /** Centro en x/z; `y` es la base. */
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rot: number;
  role: number;
  /** Proyecto dueño (se levanta y brilla con él) o −1. */
  owner: number;
}

export interface CylPart {
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
  role: number;
  owner: number;
}

/** 0 = pad redondo, 1 = vía / agujero pasante (anillo con taladro), 2 = pad rectangular. */
export type PadShape = 0 | 1 | 2;

export interface Pad {
  x: number;
  z: number;
  w: number;
  h: number;
  rot: number;
  shape: PadShape;
}

export interface Trace {
  pts: XZ[];
  width: number;
  /** 0 = capa superior, 1 = inferior (se ve apagada a través del sustrato). */
  layer: 0 | 1;
  /** Proyectos que une si es una calle; −1 en el relleno. */
  a: number;
  b: number;
  seed: number;
  /** Largo recorrido antes de esta pieza (las calles que cambian de capa siguen su pulso). */
  arc0?: number;
}

export interface Label {
  /** Texto fijo o el título de un proyecto (se resuelve con el idioma activo). */
  text: string | { project: number };
  x: number;
  y: number;
  z: number;
  /** Alto de la letra. */
  size: number;
  align: 'left' | 'center';
  owner: number;
  /** 0 = serigrafía, 1 = grabado láser sobre un chip (gris). */
  tone: 0 | 1;
}

export interface ChipSite {
  /** Índice del proyecto o −1 si el zócalo está vacío. */
  project: number;
  kind: ChipKind;
  x: number;
  z: number;
  hw: number;
  hd: number;
  /** Altura de la cara superior. */
  top: number;
  ref: string;
}

export interface Board {
  boxes: BoxPart[];
  cyls: CylPart[];
  pads: Pad[];
  traces: Trace[];
  /** Segmentos de serigrafía: x1, z1, x2, z2 por segmento. */
  silk: number[];
  labels: Label[];
  chips: ChipSite[];
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const add = (a: XZ, b: XZ, k = 1): XZ => [a[0] + b[0] * k, a[1] + b[1] * k];
const len = (a: XZ, b: XZ) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const norm = (v: XZ): XZ => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/** Normal izquierda del segmento a→b. */
function leftNormal(a: XZ, b: XZ): XZ {
  const [dx, dz] = norm([b[0] - a[0], b[1] - a[1]]);
  return [-dz, dx];
}

/** Polilínea desplazada `d` a la izquierda, con uniones a inglete (sirve para buses y cintas). */
export function offsetPolyline(pts: XZ[], d: number): XZ[] {
  const last = pts.length - 1;
  return pts.map((p, i) => {
    const n1 = i > 0 ? leftNormal(pts[i - 1], p) : leftNormal(p, pts[i + 1]);
    const n2 = i < last ? leftNormal(p, pts[i + 1]) : n1;
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const k = d / Math.max(m[0] * n1[0] + m[1] * n1[1], 0.35);
    return [p[0] + m[0] * k, p[1] + m[1] * k];
  });
}

/** Rota (dx, dz) un ángulo recto: solo se usan 0 y π/2. */
function turn(dx: number, dz: number, rot: number): XZ {
  return rot === 0 ? [dx, dz] : [-dz, dx];
}

// ─── Ocupación ─────────────────────────────────────────────────────────────────

const N = Math.round((HALF * 2) / CELL);
const FREE = 0;
/** Bloqueo duro (componente) de nadie en particular. */
const BLOCK = -1;
/** Bloqueo de la huella del chip `c`: sus propias pistas sí pueden pasar. */
const chipBlock = (c: number) => -(c + 2);
/** Dueño de pistas: las de un mismo dueño pueden compartir celdas. */
const chipOwner = (c: number) => 1000 + c;

class Occupancy {
  readonly layers = [new Int32Array(N * N), new Int32Array(N * N)];

  cell(x: number, z: number): number {
    const i = Math.floor((x + HALF) / CELL);
    const j = Math.floor((z + HALF) / CELL);
    return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i;
  }

  fillRect(layer: 0 | 1, x: number, z: number, hw: number, hd: number, value: number, overwrite = true) {
    const grid = this.layers[layer];
    for (let zz = z - hd; zz <= z + hd + 1e-6; zz += CELL / 2) {
      for (let xx = x - hw; xx <= x + hw + 1e-6; xx += CELL / 2) {
        const c = this.cell(xx, zz);
        if (c >= 0 && (overwrite || grid[c] === FREE)) grid[c] = value;
      }
    }
  }

  rectFree(layer: 0 | 1, x: number, z: number, hw: number, hd: number): boolean {
    const grid = this.layers[layer];
    for (let zz = z - hd; zz <= z + hd + 1e-6; zz += CELL / 2) {
      for (let xx = x - hw; xx <= x + hw + 1e-6; xx += CELL / 2) {
        const c = this.cell(xx, zz);
        if (c < 0 || grid[c] !== FREE) return false;
      }
    }
    return true;
  }

  passable(layer: 0 | 1, x: number, z: number, owners: number[]): boolean {
    const c = this.cell(x, z);
    if (c < 0) return false;
    const v = this.layers[layer][c];
    return v === FREE || owners.includes(v);
  }

  /** Hasta dónde (0..1) se puede recorrer a→b sin chocar. */
  clearUntil(layer: 0 | 1, a: XZ, b: XZ, owners: number[]): number {
    const steps = Math.max(1, Math.ceil(len(a, b) / 0.2));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      if (!this.passable(layer, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, owners)) return (s - 1) / steps;
    }
    return 1;
  }

  markPolyline(layer: 0 | 1, pts: XZ[], value: number, radius = 0) {
    const grid = this.layers[layer];
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const steps = Math.max(1, Math.ceil(len(a, b) / 0.2));
      for (let s = 0; s <= steps; s++) {
        const x = a[0] + ((b[0] - a[0]) * s) / steps;
        const z = a[1] + ((b[1] - a[1]) * s) / steps;
        for (let dz = -radius; dz <= radius; dz++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const c = this.cell(x + dx * CELL, z + dz * CELL);
            if (c >= 0 && grid[c] >= FREE) grid[c] = value;
          }
        }
      }
    }
  }
}

// ─── A* con giros a 45° ────────────────────────────────────────────────────────

const DIRS: XZ[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

function dirOf(v: XZ): number {
  const a = Math.atan2(v[1], v[0]);
  return (Math.round(a / (Math.PI / 4)) + 8) % 8;
}

const turnDelta = (a: number, b: number) => Math.min(Math.abs(a - b), 8 - Math.abs(a - b));

class Heap {
  private items: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, key: number) {
    const { items, keys } = this;
    let i = items.length;
    items.push(item);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      items[i] = items[p];
      keys[i] = keys[p];
      i = p;
    }
    items[i] = item;
    keys[i] = key;
  }
  pop(): number {
    const { items, keys } = this;
    const top = items[0];
    const item = items.pop()!;
    const key = keys.pop()!;
    if (items.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        if (l >= items.length) break;
        const r = l + 1;
        const c = r < items.length && keys[r] < keys[l] ? r : l;
        if (keys[c] >= key) break;
        items[i] = items[c];
        keys[i] = keys[c];
        i = c;
      }
      items[i] = item;
      keys[i] = key;
    }
    return top;
  }
}

/** Celdas ocupadas por calles: otra calle puede cruzarlas por la capa inferior. */
const isStreet = (v: number) => v >= 100 && v < 1000;

/**
 * Camino de celdas libres entre dos puertos. Estado = (celda, dirección): los giros de 45° cuestan
 * poco, los de 90° mucho y los más cerrados no existen; así las calles salen como pistas de PCB.
 * Cruzar otra calle se permite, caro: ese tramo baja a la capa inferior (`under`).
 */
function route(grid: Int32Array, from: XZ, fromDir: number, to: XZ, toDir: number): { cells: XZ[]; under: boolean[] } | null {
  const toCell = (p: XZ): [number, number] => [Math.floor((p[0] + HALF) / CELL), Math.floor((p[1] + HALF) / CELL)];
  const [si, sj] = toCell(from);
  const [gi, gj] = toCell(to);
  const free = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < N && j < N && (grid[j * N + i] === FREE || isStreet(grid[j * N + i]) || (i === gi && j === gj));
  const crossing = (i: number, j: number) => isStreet(grid[j * N + i]);
  if (!free(si, sj)) return null;

  const g = new Float32Array(N * N * 8).fill(Infinity);
  const came = new Int32Array(N * N * 8).fill(-1);
  const heap = new Heap();
  const h = (i: number, j: number) => {
    const dx = Math.abs(i - gi);
    const dz = Math.abs(j - gj);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  const start = (sj * N + si) * 8 + fromDir;
  g[start] = 0;
  heap.push(start, h(si, sj));

  let found = -1;
  let expanded = 0;
  while (heap.size && expanded++ < 400_000) {
    const s = heap.pop();
    const d = s % 8;
    const c = (s - d) / 8;
    const i = c % N;
    const j = (c - i) / N;
    if (i === gi && j === gj && turnDelta(d, toDir) <= 1) {
      found = s;
      break;
    }
    for (const t of [-2, -1, 0, 1, 2]) {
      const nd = (d + t + 8) % 8;
      const [dx, dz] = DIRS[nd];
      const ni = i + dx;
      const nj = j + dz;
      if (!free(ni, nj)) continue;
      // Sin cortar esquinas en diagonal.
      if (dx !== 0 && dz !== 0 && (!free(i + dx, j) || !free(i, j + dz))) continue;
      // Bajar de capa solo en tramos rectos: el cruce queda limpio.
      if (crossing(ni, nj) && t !== 0) continue;
      const cost = (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1) + (t === 0 ? 0 : Math.abs(t) === 1 ? 0.6 : 4) + (crossing(ni, nj) ? 6 : 0);
      const ns = (nj * N + ni) * 8 + nd;
      const ng = g[s] + cost;
      if (ng < g[ns]) {
        g[ns] = ng;
        came[ns] = s;
        heap.push(ns, ng + h(ni, nj) * 1.05);
      }
    }
  }
  if (found < 0) return null;

  const cells: XZ[] = [];
  const under: boolean[] = [];
  for (let s = found; s >= 0; s = came[s]) {
    const c = (s - (s % 8)) / 8;
    const i = c % N;
    const j = (c - i) / N;
    cells.push([(i + 0.5) * CELL - HALF, (j + 0.5) * CELL - HALF]);
    under.push(crossing(i, j));
  }
  return { cells: cells.reverse(), under: under.reverse() };
}

/** Solo los vértices donde cambia la dirección. */
function simplify(cells: XZ[]): XZ[] {
  return cells.filter((p, k) => {
    if (k === 0 || k === cells.length - 1) return true;
    const a = dirOf([p[0] - cells[k - 1][0], p[1] - cells[k - 1][1]]);
    const b = dirOf([cells[k + 1][0] - p[0], cells[k + 1][1] - p[1]]);
    return a !== b;
  });
}

/**
 * Parte un camino en tramos por capa: los cruces bajo otra calle van por la capa inferior, con un
 * margen de una celda a cada lado para que las vías no caigan sobre la otra calle.
 */
function splitByLayer(cells: XZ[], under: boolean[]): { pts: XZ[]; layer: 0 | 1 }[] {
  const low = under.map((_, k) => under.slice(Math.max(0, k - 2), k + 3).some(Boolean));
  const runs: { pts: XZ[]; layer: 0 | 1 }[] = [];
  let start = 0;
  for (let k = 1; k <= cells.length; k++) {
    if (k === cells.length || low[k] !== low[start]) {
      // El tramo incluye la celda de frontera para que las piezas queden unidas.
      runs.push({ pts: simplify(cells.slice(start, Math.min(k + 1, cells.length))), layer: low[start] ? 1 : 0 });
      start = k;
    }
  }
  return runs;
}

// ─── Chips ─────────────────────────────────────────────────────────────────────

/** Medidas de cada encapsulado: medio ancho/fondo del cuerpo y alto base (se escala por proyecto). */
const CHIP: Record<ChipKind, { hw: number; hd: number; h: number }> = {
  qfp: { hw: 1.6, hd: 1.6, h: 0.9 },
  bga: { hw: 2.1, hd: 2.1, h: 0.8 },
  dip: { hw: 2.6, hd: 1.0, h: 0.9 },
  can: { hw: 1.3, hd: 1.3, h: 2.4 },
  module: { hw: 2.7, hd: 2.0, h: 0.8 },
};

/** Un lado del chip con pines: origen de sus abanicos de pistas y de sus calles. */
interface Side {
  n: XZ;
  t: XZ;
  /** Punta de cada pin, a lo largo de `t`. */
  pins: XZ[];
  pitch: number;
  /** Mitad del largo del lado (para ubicar los puertos de las calles). */
  half: number;
  /** Punto del borde (centro del lado) donde terminan los pines. */
  edge: XZ;
  width: number;
}

/** Los cuatro lados de un rectángulo (−z, +x, +z, −x), con `pins` pines espaciados `pitch`. */
function rectSides(x: number, z: number, hw: number, hd: number, reach: number, pitch: number, which = [0, 1, 2, 3], width = 0.1): Side[] {
  const all: Side[] = [];
  const specs: { n: XZ; t: XZ; half: number; depth: number }[] = [
    { n: [0, -1], t: [1, 0], half: hw, depth: hd },
    { n: [1, 0], t: [0, 1], half: hd, depth: hw },
    { n: [0, 1], t: [-1, 0], half: hw, depth: hd },
    { n: [-1, 0], t: [0, -1], half: hd, depth: hw },
  ];
  for (const k of which) {
    const { n, t, half, depth } = specs[k];
    const edge: XZ = [x + n[0] * (depth + reach), z + n[1] * (depth + reach)];
    const count = Math.max(1, Math.floor((half * 2 - pitch * 0.6) / pitch) + 1);
    const span = (count - 1) * pitch;
    const pins = Array.from({ length: count }, (_, i) => add(edge, t, -span / 2 + i * pitch));
    all.push({ n, t, pins, pitch, half, edge, width });
  }
  return all;
}

// ─── Generador ─────────────────────────────────────────────────────────────────

export function buildBoard(projects: Project[], density: number, seed = 7): Board {
  const rand = mulberry32(seed);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const range = (a: number, b: number) => a + (b - a) * rand();

  const occ = new Occupancy();
  const boxes: BoxPart[] = [];
  const cyls: CylPart[] = [];
  const pads: Pad[] = [];
  const traces: Trace[] = [];
  const silk: number[] = [];
  const labels: Label[] = [];
  const chips: ChipSite[] = [];
  const sidesOf: Side[][] = [];
  const counters: Record<string, number> = {};
  const nextRef = (prefix: string) => `${prefix}${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`;

  const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, role: number, owner = -1, rot = 0) =>
    boxes.push({ x, y, z, sx, sy, sz, rot, role, owner });
  const line = (a: XZ, b: XZ) => silk.push(a[0], a[1], b[0], b[1]);
  const rect = (x: number, z: number, hw: number, hd: number) => {
    line([x - hw, z - hd], [x + hw, z - hd]);
    line([x + hw, z - hd], [x + hw, z + hd]);
    line([x + hw, z + hd], [x - hw, z + hd]);
    line([x - hw, z + hd], [x - hw, z - hd]);
  };
  const circle = (x: number, z: number, r: number, segments = 20) => {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      line([x + Math.cos(a0) * r, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, z + Math.sin(a1) * r]);
    }
  };
  /** Esquinas en L (contorno de serigrafía de un chip). */
  const brackets = (x: number, z: number, hw: number, hd: number, arm: number) => {
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const c: XZ = [x + sx * hw, z + sz * hd];
      line(c, [c[0] - sx * arm, c[1]]);
      line(c, [c[0], c[1] - sz * arm]);
    }
  };
  const via = (p: XZ, size = 0.26) => pads.push({ x: p[0], z: p[1], w: size, h: size, rot: 0, shape: 1 });

  // 1. Chips en sus zócalos ─────────────────────────────────────────────────────
  SLOTS.forEach((slot, s) => {
    const project = s < projects.length ? s : -1;
    const kind: ChipKind = project >= 0 ? projects[project].building.chip : pick(['qfp', 'dip', 'module', 'bga'] as const);
    const spec = CHIP[kind];
    const [x, z] = slot;
    const owner = project;
    const H = project >= 0 ? (projects[project].building.height ?? 1) : 1;
    const populated = project >= 0;
    let top = 0;
    let sides: Side[] = [];
    const { hw, hd } = spec;

    if (kind === 'qfp') {
      top = 0.05 + spec.h * H;
      sides = rectSides(x, z, hw, hd, 0.6, 0.25);
      if (populated) {
        box(x, 0.05, z, hw * 2, spec.h * H, hd * 2, ROLE.chip, owner);
        box(x - hw + 0.35, top, z - hd + 0.35, 0.28, 0.035, 0.28, ROLE.led, owner);
      }
      for (const side of sides) {
        for (const pin of side.pins) {
          const base = add(pin, side.n, -0.3);
          const horizontal = side.n[0] !== 0;
          pads.push({ x: base[0], z: base[1], w: horizontal ? 0.6 : 0.14, h: horizontal ? 0.14 : 0.6, rot: 0, shape: 2 });
          if (populated) {
            const foot = add(pin, side.n, -0.38);
            box(foot[0], 0, foot[1], horizontal ? 0.5 : 0.1, 0.1, horizontal ? 0.1 : 0.5, ROLE.metal, owner);
          }
        }
      }
      brackets(x, z, hw + 0.2, hd + 0.2, 0.5);
    } else if (kind === 'bga') {
      top = 0.18 + spec.h * H;
      sides = rectSides(x, z, hw, hd, 0.15, 0.3);
      if (populated) {
        box(x, 0.04, z, hw * 2, 0.14, hd * 2, ROLE.substrate, owner);
        box(x, 0.18, z, hw * 1.45, spec.h * H, hd * 1.45, ROLE.lid, owner);
        box(x - hw * 0.72 + 0.3, top, z - hd * 0.72 + 0.3, 0.26, 0.035, 0.26, ROLE.led, owner);
      } else {
        // Huella BGA sin poblar: la matriz de pads a la vista.
        for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) pads.push({ x: x + i * 0.36, z: z + j * 0.36, w: 0.2, h: 0.2, rot: 0, shape: 0 });
      }
      rect(x, z, hw + 0.2, hd + 0.2);
      line([x - hw - 0.2, z - hd + 0.6], [x - hw + 0.6, z - hd - 0.2]);
    } else if (kind === 'dip') {
      top = 0.35 + spec.h * H;
      sides = rectSides(x, z, hw, hd, 0.55, 0.5, [0, 2]);
      if (populated) {
        box(x, 0.35, z, hw * 2, spec.h * H, hd * 2, ROLE.chip, owner);
        box(x - hw + 0.4, top, z, 0.3, 0.035, 0.3, ROLE.led, owner);
      }
      for (const side of sides) {
        for (const pin of side.pins) {
          const hole = add(pin, side.n, -0.3);
          pads.push({ x: hole[0], z: hole[1], w: 0.44, h: 0.44, rot: 0, shape: 1 });
          if (populated) {
            const leg = add(pin, side.n, -0.38);
            box(leg[0], 0, leg[1], 0.14, 0.5, 0.08, ROLE.metal, owner);
            const shoulder = add(pin, side.n, -0.5);
            box(shoulder[0], 0.4, shoulder[1], 0.14, 0.08, 0.26, ROLE.metal, owner);
          }
        }
      }
      rect(x, z, hw + 0.15, hd + 0.15);
      line([x - hw - 0.15, z - 0.3], [x - hw + 0.2, z]);
      line([x - hw + 0.2, z], [x - hw - 0.15, z + 0.3]);
    } else if (kind === 'can') {
      top = 0.15 + spec.h * H;
      // Electrolítico grande: pocas pistas y gruesas (alimentación).
      sides = rectSides(x, z, hw, hd, 0.35, 0.36, [1, 3], 0.26).map((side) => ({ ...side, pins: side.pins.slice(1, -1) }));
      if (populated) {
        cyls.push({ x, y: 0, z, r: hw * 1.04, h: 0.16, role: ROLE.plastic, owner });
        cyls.push({ x, y: 0.15, z, r: hw, h: spec.h * H, role: ROLE.can, owner });
        cyls.push({ x, y: top, z, r: hw * 0.86, h: 0.04, role: ROLE.canTop, owner });
      }
      for (const side of sides) for (const pin of side.pins) pads.push({ x: pin[0] - side.n[0] * 0.2, z: pin[1], w: 0.5, h: 0.5, rot: 0, shape: 2 });
      circle(x, z, hw + 0.25, 28);
      line([x - hw - 0.9, z - 0.35], [x - hw - 0.9, z + 0.35]);
      line([x - hw - 1.25, z], [x - hw - 0.55, z]);
    } else {
      top = 0.16 + spec.h * H;
      sides = rectSides(x, z, hw, hd, 0.12, 0.45, [0, 2, 3]);
      if (populated) {
        box(x, 0.02, z, hw * 2, 0.14, hd * 2, ROLE.substrate, owner);
        box(x - 0.55, 0.16, z, hw * 2 - 1.5, spec.h * H, hd * 2 - 0.4, ROLE.metal, owner);
        box(x + hw - 0.45, 0.16, z, 0.35, 0.12, 1.1, ROLE.ceramic, owner);
        box(x + hw - 0.35, 0.16, z - hd + 0.4, 0.26, 0.035, 0.26, ROLE.led, owner);
      }
      for (const side of sides) {
        for (const pin of side.pins) {
          const base = add(pin, side.n, -0.12);
          const horizontal = side.n[0] !== 0;
          pads.push({ x: base[0], z: base[1], w: horizontal ? 0.4 : 0.22, h: horizontal ? 0.22 : 0.4, rot: 0, shape: 2 });
        }
      }
      rect(x, z, hw + 0.15, hd + 0.15);
      // Zona de antena: sin cobre debajo.
      line([x + hw - 1.0, z - hd - 0.15], [x + hw - 1.0, z + hd + 0.15]);
    }

    const ref = `U${s + 1}`;
    const reach = kind === 'qfp' ? 0.9 : kind === 'dip' ? 0.7 : 0.4;
    // Huella bloqueada para el ruteo: solo sus propias pistas salen de ahí.
    occ.fillRect(0, x, z, hw + reach, hd + reach, chipBlock(s));
    chips.push({ project, kind, x, z, hw, hd, top: populated ? top : 0.02, ref });
    sidesOf.push(sides);

    labels.push({ text: ref, x: x - hw - 0.2, y: 0, z: z - hd - reach - 0.55, size: 0.42, align: 'left', owner, tone: 0 });
    if (populated) {
      labels.push({ text: { project }, x, y: 0, z: z + hd + reach + 1.0, size: 0.5, align: 'center', owner, tone: 0 });
      if (kind !== 'can') {
        const p = projects[project];
        labels.push({ text: `${p.stack[0] ?? ''} · ${p.year}`.toUpperCase(), x, y: top + 0.004, z, size: 0.26, align: 'center', owner, tone: 1 });
      }
    } else {
      labels.push({ text: 'DNP', x, y: 0, z: z + hd + reach + 0.8, size: 0.38, align: 'center', owner: -1, tone: 0 });
    }
  });

  // Reservas: buzón y márgenes del borde.
  rect(MAILBOX[0], MAILBOX[1], 1.6, 1.6);
  labels.push({ text: 'MAIL · CONTACT', x: MAILBOX[0] - 1.6, y: 0, z: MAILBOX[1] + 2.25, size: 0.42, align: 'left', owner: -1, tone: 0 });
  occ.fillRect(0, MAILBOX[0], MAILBOX[1], 2.6, 2.6, BLOCK);
  occ.fillRect(1, MAILBOX[0], MAILBOX[1], 2.6, 2.6, BLOCK);

  // 2. Calles entre proyectos ───────────────────────────────────────────────────
  const reserved = new Set<string>();
  const portsUsed: number[][] = chips.map(() => [0, 0, 0, 0]);
  const pairs: [number, number][] = [];
  projects.forEach((p, a) => {
    for (const id of p.building.connectsTo) {
      const b = projects.findIndex((q) => q.id === id);
      if (b < 0 || b === a || pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
      pairs.push([a, b]);
    }
  });

  /** Lado del chip que mira hacia `target` y el puerto (fuera de la huella) donde arranca la calle. */
  const portOf = (c: number, target: XZ) => {
    const chip = chips[c];
    const dx = target[0] - chip.x;
    const dz = target[1] - chip.z;
    const sideIndex = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : dz > 0 ? 2 : 0;
    const n: XZ = [[0, -1], [1, 0], [0, 1], [-1, 0]][sideIndex] as XZ;
    const t: XZ = [-n[1], n[0]];
    const depth = n[0] !== 0 ? chip.hw : chip.hd;
    const half = n[0] !== 0 ? chip.hd : chip.hw;
    const used = portsUsed[c][sideIndex]++;
    const shift = used === 0 ? 0 : (used % 2 ? 1 : -1) * Math.min(half * 0.55, 1.1);
    const edge: XZ = add(add([chip.x, chip.z], n, depth + 0.4), t, shift);
    const port: XZ = add(edge, n, 1.6);
    reserved.add(`${c}:${sideIndex}:${shift.toFixed(2)}`);
    return { edge, port, n, sideIndex, shift };
  };

  pairs.forEach(([a, b], k) => {
    const from = portOf(a, [chips[b].x, chips[b].z]);
    const to = portOf(b, [chips[a].x, chips[a].z]);
    const owner = 100 + k;
    // El puerto está justo fuera de la huella; se abre para el A* y se vuelve a cerrar.
    const path = route(occ.layers[0], from.port, dirOf(from.n), to.port, dirOf([-to.n[0], -to.n[1]]));
    if (!path) return;
    const runs = splitByLayer([from.edge, ...path.cells, to.edge], [false, ...path.under, false]);
    const seed = rand();
    for (const off of [-0.3, 0, 0.3]) {
      let arc0 = 0;
      runs.forEach((run, r) => {
        const pts = offsetPolyline(run.pts, off);
        traces.push({ pts, width: 0.14, layer: run.layer, a, b, seed, arc0 });
        arc0 += pts.slice(1).reduce((sum, p, i) => sum + len(pts[i], p), 0);
        if (r > 0) via(pts[0], 0.3);
      });
    }
    for (const run of runs) if (run.layer === 0) occ.markPolyline(0, run.pts, owner, 1);
    for (const run of runs) if (run.layer === 1) occ.markPolyline(1, run.pts, owner, 1);
  });

  // 3. Abanicos de pistas desde los pines ──────────────────────────────────────
  const bottomVias: { p: XZ; n: XZ; owner: number }[] = [];
  chips.forEach((chip, c) => {
    const owners = [chipOwner(c), chipBlock(c)];
    sidesOf[c].forEach((side) => {
      const count = side.pins.length;
      const groupSize = count <= 4 ? count : pick([3, 4, 4, 5, 6]);
      for (let g0 = 0; g0 < count; g0 += groupSize) {
        const group = side.pins.slice(g0, g0 + groupSize);
        // Posición del grupo a lo largo del lado: −1 (inicio) … 1 (final).
        const mid = (g0 + (group.length - 1) / 2) / Math.max(count - 1, 1);
        const u = mid * 2 - 1;
        // No tapar el puerto de una calle: el grupo del centro del lado queda libre si hay calle.
        const sideIndex = side.n[1] === -1 ? 0 : side.n[0] === 1 ? 1 : side.n[1] === 1 ? 2 : 3;
        const blockedByStreet = [...reserved].some((key) => {
          const [kc, ks, shift] = key.split(':');
          if (Number(kc) !== c || Number(ks) !== sideIndex) return false;
          const along = (Number(shift) / side.half + 1) / 2;
          return Math.abs(along - (mid)) < 0.22;
        });
        if (blockedByStreet || rand() < 0.12) continue;

        const straight = Math.abs(u) < 0.3 || rand() < 0.2;
        const dir = u >= 0 ? 1 : -1;
        const tDir: XZ = [side.t[0] * dir, side.t[1] * dir];
        const diag = norm(add(side.n, tDir));
        // k = 0 es el pin más cercano hacia donde gira el grupo.
        const ordered = dir > 0 ? [...group].reverse() : group;
        const a0 = range(0.25, 0.7);
        const b = range(0.8, 3.2);
        const c0 = range(0.4, 3.5);
        ordered.forEach((pin, k) => {
          let pts: XZ[];
          if (straight) {
            pts = [pin, add(pin, side.n, a0 + 0.6 + (k % 3) * 0.45)];
          } else {
            const c1 = add(pin, side.n, a0 + k * side.pitch * (Math.SQRT2 - 1));
            const c2 = add(c1, diag, b);
            pts = [pin, c1, c2, add(c2, side.n, c0 + (k % 3) * 0.45)];
          }
          // Recorta donde choque con otra cosa; termina en vía.
          const kept: XZ[] = [pts[0]];
          for (let i = 1; i < pts.length; i++) {
            const t = occ.clearUntil(0, kept[kept.length - 1], pts[i], owners);
            const prev = kept[kept.length - 1];
            const end: XZ = [prev[0] + (pts[i][0] - prev[0]) * t, prev[1] + (pts[i][1] - prev[1]) * t];
            if (len(prev, end) > 0.05) kept.push(end);
            if (t < 1) break;
          }
          const total = kept.slice(1).reduce((sum, p, i) => sum + len(kept[i], p), 0);
          if (kept.length < 2 || total < 0.5) return;
          occ.markPolyline(0, kept, chipOwner(c));
          traces.push({ pts: kept, width: side.width, layer: 0, a: -1, b: -1, seed: rand() });
          const tip = kept[kept.length - 1];
          via(tip);
          if (rand() < 0.35) bottomVias.push({ p: tip, n: side.n, owner: chipOwner(c) });
        });
      }
    });
  });

  // 4. Buses largos ─────────────────────────────────────────────────────────────
  const corridors = [-DISTRICT, 0, DISTRICT];
  // Capa inferior: a lo largo de z por los pasillos entre distritos.
  corridors.forEach((cx, k) => {
    const width = 6 + Math.floor(rand() * 4);
    const jogAt = range(-12, 12);
    const jog = pick([-1.4, 1.4]);
    const center: XZ[] = [
      [cx, -HALF + 2.5],
      [cx, jogAt - 1],
      [cx + jog, jogAt - 1 + Math.abs(jog)],
      [cx + jog, HALF - 2.5],
    ];
    for (let i = 0; i < width; i++) {
      const pts = offsetPolyline(center, (i - (width - 1) / 2) * 0.32);
      occ.markPolyline(1, pts, 2000 + k);
      traces.push({ pts, width: 0.12, layer: 1, a: -1, b: -1, seed: rand() });
      via(pts[0], 0.24);
      via(pts[pts.length - 1], 0.24);
    }
  });
  // Capa superior: a lo largo de x; se corta donde hay otra cosa y cambia de capa con vías.
  corridors.forEach((cz, k) => {
    const width = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < width; i++) {
      const z = cz + (i - (width - 1) / 2) * 0.32 + 0.16;
      let runStart: XZ | null = null;
      const flush = (end: XZ) => {
        if (runStart && len(runStart, end) > 1.6) {
          const pts: XZ[] = [runStart, end];
          occ.markPolyline(0, pts, 3000 + k);
          traces.push({ pts, width: 0.12, layer: 0, a: -1, b: -1, seed: rand() });
          via(runStart, 0.24);
          via(end, 0.24);
        }
        runStart = null;
      };
      for (let x = -HALF + 2.5; x <= HALF - 2.5; x += 0.25) {
        const own = [3000 + k];
        const ok = occ.passable(0, x, z, own) && occ.passable(0, x, z - 0.25, own) && occ.passable(0, x, z + 0.25, own);
        if (ok && !runStart) runStart = [x + 0.3, z];
        else if (!ok && runStart) flush([x - 0.35, z]);
      }
      if (runStart) flush([HALF - 2.5, z]);
    }
  });

  // Continuaciones por la capa inferior desde algunas vías de los abanicos.
  for (const { p, n, owner } of bottomVias) {
    const turnSign = rand() < 0.5 ? -1 : 1;
    const d1 = norm(add(n, [-n[1] * turnSign, n[0] * turnSign]));
    const a = add(p, n, range(0.6, 3));
    const pts: XZ[] = [p, a, add(a, d1, range(1, 5))];
    const kept: XZ[] = [p];
    for (let i = 1; i < pts.length; i++) {
      const t = occ.clearUntil(1, kept[kept.length - 1], pts[i], [owner]);
      const prev = kept[kept.length - 1];
      const end: XZ = [prev[0] + (pts[i][0] - prev[0]) * t, prev[1] + (pts[i][1] - prev[1]) * t];
      if (len(prev, end) > 0.05) kept.push(end);
      if (t < 1) break;
    }
    if (kept.length < 2) continue;
    occ.markPolyline(1, kept, owner);
    traces.push({ pts: kept, width: 0.1, layer: 1, a: -1, b: -1, seed: rand() });
    via(kept[kept.length - 1]);
  }

  // 5. Conectores del borde, agujeros de montaje y fiduciales ────────────────
  {
    // J1: tira de pines doble a lo largo del borde inferior izquierdo (z+).
    const z = HALF - 2.6;
    const pinsPerRow = 24;
    const x0 = -9;
    box(x0 + (pinsPerRow - 1) * 0.25, 0, z, pinsPerRow * 0.5 + 0.1, 0.45, 1.05, ROLE.plastic);
    for (let i = 0; i < pinsPerRow; i++) {
      for (const dz of [-0.25, 0.25]) {
        const px = x0 + i * 0.5;
        pads.push({ x: px, z: z + dz, w: 0.36, h: 0.36, rot: 0, shape: 1 });
        box(px, 0, z + dz, 0.12, 1.25, 0.12, ROLE.pad);
      }
    }
    occ.fillRect(0, x0 + (pinsPerRow - 1) * 0.25, z, pinsPerRow * 0.25 + 0.4, 0.9, BLOCK);
    rect(x0 + (pinsPerRow - 1) * 0.25, z, pinsPerRow * 0.25 + 0.2, 0.75);
    labels.push({ text: 'J1', x: x0 - 0.2, y: 0, z: z - 1.5, size: 0.42, align: 'left', owner: -1, tone: 0 });
    labels.push({ text: 'GPIO · 3V3 · GND', x: x0 + 7, y: 0, z: z - 1.5, size: 0.34, align: 'left', owner: -1, tone: 0 });

    // J2: USB-C y J3: jack de alimentación en el borde derecho (x+).
    const ux = HALF - 1.9;
    box(ux, 0, -8, 1.8, 0.75, 2.5, ROLE.metal);
    occ.fillRect(0, ux, -8, 1.4, 1.7, BLOCK);
    rect(ux - 0.2, -8, 1.3, 1.55);
    labels.push({ text: 'J2 USB-C', x: ux - 3.4, y: 0, z: -10.1, size: 0.38, align: 'left', owner: -1, tone: 0 });
    box(ux - 0.2, 0, 6, 2.4, 1.2, 2.0, ROLE.plastic);
    cyls.push({ x: ux + 1.02, y: 0.2, z: 6, r: 0.35, h: 0.8, role: ROLE.metal, owner: -1 });
    occ.fillRect(0, ux - 0.2, 6, 1.6, 1.4, BLOCK);
    rect(ux - 0.2, 6, 1.5, 1.3);
    labels.push({ text: 'J3 5V', x: ux - 3.2, y: 0, z: 4.1, size: 0.38, align: 'left', owner: -1, tone: 0 });

    // Agujeros de montaje (la cuarta esquina es del buzón) y fiduciales.
    for (const [hx, hz] of [
      [-HALF + 2, -HALF + 2],
      [HALF - 2, -HALF + 2],
      [-HALF + 2, HALF - 2],
    ]) {
      pads.push({ x: hx, z: hz, w: 2.2, h: 2.2, rot: 0, shape: 1 });
      circle(hx, hz, 1.55, 32);
      occ.fillRect(0, hx, hz, 1.8, 1.8, BLOCK);
      occ.fillRect(1, hx, hz, 1.8, 1.8, BLOCK);
    }
    for (const [fx, fz] of [
      [-HALF + 4.6, -HALF + 1.6],
      [HALF - 1.6, -HALF + 4.6],
      [-HALF + 1.6, HALF - 4.6],
    ]) {
      pads.push({ x: fx, z: fz, w: 0.55, h: 0.55, rot: 0, shape: 0 });
      circle(fx, fz, 0.6, 20);
      occ.fillRect(0, fx, fz, 0.7, 0.7, BLOCK);
    }

    rect(10, 0, HALF - 0.6, HALF - 0.6);
    labels.push({ text: 'OHCV · PROJECTS', x: -HALF + 4.2, y: 0, z: -HALF + 1.7, size: 1.05, align: 'left', owner: -1, tone: 0 });
    labels.push({ text: 'REV 5.0 · 2026 · MANIZALES, CO', x: -HALF + 4.2, y: 0, z: -HALF + 3.1, size: 0.42, align: 'left', owner: -1, tone: 0 });
    occ.fillRect(0, -HALF + 12, -HALF + 2.4, 8.5, 1.4, BLOCK);
  }

  // 6. Pasivos ──────────────────────────────────────────────────────────────────
  type Kind = 'cap' | 'res' | 'ind' | 'sot' | 'xtal' | 'elec' | 'led' | 'tp';
  const KINDS: [Kind, number][] = [
    ['cap', 34],
    ['res', 26],
    ['sot', 9],
    ['ind', 7],
    ['elec', 7],
    ['xtal', 4],
    ['led', 6],
    ['tp', 7],
  ];
  const totalWeight = KINDS.reduce((s, [, w]) => s + w, 0);
  const randomKind = (): Kind => {
    let r = rand() * totalWeight;
    for (const [kind, w] of KINDS) if ((r -= w) < 0) return kind;
    return 'cap';
  };
  const target = Math.round(420 * density);
  let placed = 0;
  for (let attempt = 0; attempt < target * 8 && placed < target; attempt++) {
    const kind = randomKind();
    let x: number;
    let z: number;
    if (rand() < 0.72) {
      const chip = pick(chips);
      const a = rand() * Math.PI * 2;
      const d = Math.max(chip.hw, chip.hd) + range(1.4, 4.6);
      x = chip.x + Math.cos(a) * d;
      z = chip.z + Math.sin(a) * d;
    } else {
      x = range(-HALF + 3, HALF - 3);
      z = range(-HALF + 4, HALF - 3);
    }
    x = Math.round(x * 4) / 4;
    z = Math.round(z * 4) / 4;
    const rot = rand() < 0.5 ? 0 : Math.PI / 2;
    const size: Record<Kind, XZ> = {
      cap: [0.55, 0.3],
      res: [0.8, 0.42],
      ind: [1.1, 1.1],
      sot: [0.7, 0.9],
      xtal: [1.6, 0.65],
      elec: [1.4, 1.4],
      led: [0.55, 0.3],
      tp: [0.6, 0.6],
    };
    const [L, W] = size[kind];
    const [fw, fd] = turn(L / 2 + 0.3, W / 2 + 0.3, rot).map(Math.abs) as XZ;
    if (!occ.rectFree(0, x, z, fw, fd)) continue;
    occ.fillRect(0, x, z, fw, fd, BLOCK);
    placed++;

    const at = (dx: number, dz: number): XZ => add([x, z], turn(dx, dz, rot));
    const bx = (dx: number, y: number, sx: number, sy: number, sz: number, role: number) => {
      const p = at(dx, 0);
      const [wx, wz] = rot === 0 ? [sx, sz] : [sz, sx];
      box(p[0], y, p[1], wx, sy, wz, role);
    };
    const padAt = (dx: number, w: number, h: number) => {
      const p = at(dx, 0);
      const [pw, ph] = rot === 0 ? [w, h] : [h, w];
      pads.push({ x: p[0], z: p[1], w: pw, h: ph, rot: 0, shape: 2 });
      return p;
    };
    let ends: XZ[] = [];
    let prefix = 'C';
    if (kind === 'cap' || kind === 'res' || kind === 'ind' || kind === 'led') {
      const h = { cap: 0.28, res: 0.22, ind: 0.6, led: 0.2 }[kind];
      const bodyRole = kind === 'cap' ? ROLE.ceramic : kind === 'res' ? ROLE.resistor : kind === 'ind' ? ROLE.lid : ROLE.ceramic;
      ends = [padAt(-L * 0.42, L * 0.34, W * 1.15), padAt(L * 0.42, L * 0.34, W * 1.15)];
      bx(0, 0.02, L * 0.62, h, W, bodyRole);
      bx(-L * 0.4, 0.02, L * 0.2, h * 0.96, W * 0.98, ROLE.metal);
      bx(L * 0.4, 0.02, L * 0.2, h * 0.96, W * 0.98, ROLE.metal);
      if (kind === 'led') bx(0, 0.02 + h, L * 0.45, 0.04, W * 0.65, ROLE.led);
      prefix = { cap: 'C', res: 'R', ind: 'L', led: 'D' }[kind];
      if (kind === 'ind') rect(x, z, fw - 0.2, fd - 0.2);
    } else if (kind === 'sot') {
      bx(0, 0.06, L, 0.35, 0.45, ROLE.chip);
      for (const [dx, dz] of [
        [-0.25, -0.38],
        [0.25, -0.38],
        [0, 0.38],
      ] as XZ[]) {
        const p = at(dx, dz);
        box(p[0], 0, p[1], 0.12, 0.1, 0.12, ROLE.metal);
        pads.push({ x: p[0], z: p[1], w: 0.24, h: 0.24, rot: 0, shape: 2 });
      }
      ends = [at(0, 0.38)];
      prefix = 'Q';
    } else if (kind === 'xtal') {
      ends = [padAt(-L * 0.45, 0.35, W * 1.1), padAt(L * 0.45, 0.35, W * 1.1)];
      bx(0, 0.02, L * 0.85, 0.45, W, ROLE.metal);
      prefix = 'Y';
    } else if (kind === 'elec') {
      const r = range(0.45, 0.68);
      cyls.push({ x, y: 0, z, r: r * 1.05, h: 0.12, role: ROLE.plastic, owner: -1 });
      cyls.push({ x, y: 0.12, z, r, h: range(0.9, 1.6), role: ROLE.can, owner: -1 });
      circle(x, z, r + 0.15, 20);
      ends = [padAt(-r, 0.3, 0.4), padAt(r, 0.3, 0.4)];
    } else {
      pads.push({ x, z, w: 0.5, h: 0.5, rot: 0, shape: 0 });
      circle(x, z, 0.42, 16);
      prefix = 'TP';
    }

    if (kind !== 'tp' && rand() < 0.22 * (kind === 'cap' || kind === 'res' ? 1 : 2.5)) {
      rect(x, z, fw - 0.12, fd - 0.12);
    }
    if (rand() < 0.35 || kind === 'tp' || kind === 'xtal' || kind === 'sot') {
      const [ox, oz] = turn(0, W / 2 + 0.45, rot);
      labels.push({ text: nextRef(prefix), x: x + ox - 0.3, y: 0, z: z + oz, size: 0.28, align: 'left', owner: -1, tone: 0 });
    } else nextRef(prefix);

    // Pistas cortas desde los pads hasta una vía.
    for (const end of ends) {
      if (rand() > 0.62) continue;
      const out = norm([end[0] - x || 0.001, end[1] - z || 0.001]);
      const dir = DIRS[dirOf(out)];
      const d = norm(dir as XZ);
      const stubEnd = add(end, d, range(0.5, 1.6));
      const t = occ.clearUntil(0, add(end, d, 0.3), stubEnd, []);
      if (t < 0.5) continue;
      const tip: XZ = [end[0] + (stubEnd[0] - end[0]) * t, end[1] + (stubEnd[1] - end[1]) * t];
      traces.push({ pts: [end, tip], width: 0.1, layer: 0, a: -1, b: -1, seed: rand() });
      occ.markPolyline(0, [end, tip], 4000 + placed);
      via(tip);
    }
  }

  // 7. Vías de costura a lo largo del borde ─────────────────────────────────────
  for (let s = -HALF + 1.2; s <= HALF - 1.2; s += 1.1) {
    for (const [x, z] of [
      [s, -HALF + 1.0],
      [s, HALF - 1.0],
      [-HALF + 1.0, s],
      [HALF - 1.0, s],
    ] as XZ[]) {
      if (occ.passable(0, x, z, [])) via([x, z], 0.22);
    }
  }

  // Esquinas de cada distrito, como manzanas.
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = (i - 1.5) * DISTRICT;
      const cz = (j - 1.5) * DISTRICT;
      brackets(cx, cz, DISTRICT / 2 - 0.9, DISTRICT / 2 - 0.9, 0.7);
    }
  }

  return { boxes, cyls, pads, traces, silk, labels, chips };
}
