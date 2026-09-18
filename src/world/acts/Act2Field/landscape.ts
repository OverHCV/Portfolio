import { Vector2, Vector3, Vector4, type Ray } from 'three';

/**
 * Paisaje de soluciones: una altura f(x, z, t) sobre el plano del acto.
 * Se define una sola vez (las constantes de abajo) y de ahí salen las dos versiones:
 * la de GPU (`LANDSCAPE_GLSL`, desplaza la malla y los puntos) y la de CPU (`height`,
 * `gradient`, `raycast`, que usan los nodos y la sonda del cursor). Así ambas coinciden.
 */

/** Semiextensión del paisaje (unidades relativas al ancla del acto). */
export const EXTENT = { x: 12, z: 8 } as const;
/** Lado de una celda de la malla. */
export const CELL = 0.5;
export const MAX_WELLS = 8;

/** Pozo de un fragmento de bio: un mínimo claro del paisaje. */
const WELL = { depth: 1.5, width: 1.25, focusBoost: 0.9 };

// Mínimos locales que no son ningún fragmento de bio: no todo camino llega a una solución.
const DECOYS: { x: number; z: number; depth: number; width: number }[] = [
  { x: -7, z: 4, depth: 0.7, width: 1.4 },
  { x: 7.5, z: 3.5, depth: 0.6, width: 1.2 },
];

/** Ondas lentas: el paisaje respira y se desplaza. h += a·sin(kx·x + kz·z + w·t + phase). */
const WAVES = [
  { a: 0.5, kx: 0.34, kz: 0.22, w: 0.3, phase: 0 },
  { a: 0.32, kx: -0.25, kz: 0.48, w: -0.24, phase: 1.7 },
  { a: 0.16, kx: 0.82, kz: -0.61, w: 0.5, phase: 4.1 },
];
/** Cuánta ola queda al calmarse: la superficie del mar. */
const CALM_WAVES = 0.85;
/** Cuenco suave: los bordes suben, los caminos tienden al centro. */
const BOWL = 0.012;

const f = (n: number) => n.toFixed(4);

/** Chunk GLSL: uniforms + `landscape(p)` + máscaras compartidas por la malla y los puntos. */
export const LANDSCAPE_GLSL = /* glsl */ `
#define MAX_WELLS ${MAX_WELLS}
const vec2 EXTENT = vec2(${f(EXTENT.x)}, ${f(EXTENT.z)});
uniform float uTime;
uniform float uCalm;
uniform float uReveal;
uniform float uOpacity;
uniform vec4 uWells[MAX_WELLS];

float landscape(vec2 p) {
  float h = ${f(BOWL)} * (1.0 - uCalm) * dot(p, p);
  float g = 1.0 - ${f(CALM_WAVES)} * uCalm;
${WAVES.map((w) => `  h += g * ${f(w.a)} * sin(${f(w.kx)} * p.x + ${f(w.kz)} * p.y + ${f(w.w)} * uTime + ${f(w.phase)});`).join('\n')}
  for (int i = 0; i < MAX_WELLS; i++) {
    vec4 w = uWells[i];
    vec2 d = p - w.xy;
    h -= w.z * exp(-dot(d, d) / (2.0 * w.w * w.w));
  }
  return h;
}

/** Los bordes se disuelven en el vacío. */
float edgeFade(vec2 p) {
  return 1.0 - smoothstep(0.55, 1.0, length(p / EXTENT));
}

/** Revelado radial desde el centro al salir del agujero negro. */
float revealMask(vec2 p) {
  float r = uReveal * (length(EXTENT) + 3.0);
  return 1.0 - smoothstep(r - 3.0, r, length(p));
}
`;

export interface WellDef {
  x: number;
  z: number;
  depth: number;
  width: number;
}

export function createLandscape(nodes: [number, number][]) {
  const defs: WellDef[] = [
    ...nodes.map(([x, z]) => ({ x, z, depth: WELL.depth, width: WELL.width })),
    ...DECOYS,
  ].slice(0, MAX_WELLS);
  // Pozos sin usar: profundidad 0 y ancho 1 (evita dividir por cero en el shader).
  const wells = Array.from({ length: MAX_WELLS }, () => new Vector4(0, 0, 0, 1));

  const uniforms = {
    uTime: { value: 0 },
    uCalm: { value: 0 },
    uReveal: { value: 0 },
    uOpacity: { value: 1 },
    uWells: { value: wells },
  };

  /** Escribe el estado del frame; `focus[i]` hunde el pozo del nodo i. */
  function update(time: number, calm: number, reveal: number, opacity: number, focus: readonly number[]) {
    uniforms.uTime.value = time;
    uniforms.uCalm.value = calm;
    uniforms.uReveal.value = reveal;
    uniforms.uOpacity.value = opacity;
    defs.forEach((d, i) => {
      const depth = (d.depth + (focus[i] ?? 0) * WELL.focusBoost) * (1 - calm);
      wells[i].set(d.x, d.z, depth, d.width);
    });
  }

  /** Espejo de `landscape()` en GLSL. */
  function height(x: number, z: number): number {
    const t = uniforms.uTime.value;
    const calm = uniforms.uCalm.value;
    let h = BOWL * (1 - calm) * (x * x + z * z);
    const g = 1 - CALM_WAVES * calm;
    for (const w of WAVES) h += g * w.a * Math.sin(w.kx * x + w.kz * z + w.w * t + w.phase);
    for (const w of wells) {
      const dx = x - w.x;
      const dz = z - w.y;
      h -= w.z * Math.exp(-(dx * dx + dz * dz) / (2 * w.w * w.w));
    }
    return h;
  }

  /** ∇f analítico: (∂f/∂x, ∂f/∂z). */
  function gradient(x: number, z: number, out: Vector2): Vector2 {
    const t = uniforms.uTime.value;
    const calm = uniforms.uCalm.value;
    let gx = 2 * BOWL * (1 - calm) * x;
    let gz = 2 * BOWL * (1 - calm) * z;
    const g = 1 - CALM_WAVES * calm;
    for (const w of WAVES) {
      const c = g * w.a * Math.cos(w.kx * x + w.kz * z + w.w * t + w.phase);
      gx += c * w.kx;
      gz += c * w.kz;
    }
    for (const w of wells) {
      const dx = x - w.x;
      const dz = z - w.y;
      const w2 = w.w * w.w;
      // ∂/∂x de −d·e^(−r²/2w²) = d·e^(−r²/2w²)·(x−cx)/w²
      const k = (w.z * Math.exp(-(dx * dx + dz * dz) / (2 * w2))) / w2;
      gx += k * dx;
      gz += k * dz;
    }
    return out.set(gx, gz);
  }

  const probe = new Vector3();
  const Y_TOP = 3;
  const Y_BOTTOM = -4;

  /**
   * Primer corte del rayo (en coordenadas del acto) con la superficie visible.
   * Marcha a pasos fijos entre dos planos que acotan la altura y refina por bisección.
   */
  function raycast(ray: Ray, out: Vector3): boolean {
    const { origin: o, direction: d } = ray;
    if (Math.abs(d.y) < 1e-4) return false;
    let t0 = Math.max((Y_TOP - o.y) / d.y, 0);
    let t1 = (Y_BOTTOM - o.y) / d.y;
    if (t1 < t0) [t0, t1] = [t1, t0];
    if (t1 <= 0) return false;
    t0 = Math.max(t0, 0);

    const above = (t: number) => {
      ray.at(t, probe);
      return probe.y - height(probe.x, probe.z);
    };
    const STEPS = 48;
    let prevT = t0;
    let prev = above(t0);
    for (let i = 1; i <= STEPS; i++) {
      const t = t0 + ((t1 - t0) * i) / STEPS;
      const cur = above(t);
      if (prev > 0 && cur <= 0) {
        let lo = prevT;
        let hi = t;
        for (let k = 0; k < 10; k++) {
          const mid = (lo + hi) / 2;
          if (above(mid) > 0) lo = mid;
          else hi = mid;
        }
        ray.at(hi, out);
        // Fuera del óvalo visible el paisaje ya está disuelto: no cuenta.
        return (out.x / EXTENT.x) ** 2 + (out.z / EXTENT.z) ** 2 < 0.8;
      }
      prevT = t;
      prev = cur;
    }
    return false;
  }

  return { uniforms, update, height, gradient, raycast };
}

export type Landscape = ReturnType<typeof createLandscape>;
