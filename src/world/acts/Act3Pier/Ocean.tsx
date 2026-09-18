import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, type Mesh, PlaneGeometry, ShaderMaterial, Vector3, Vector4 } from 'three';
import { useWorld } from '../../store';
import { QUALITY } from '../../lib/quality';
import { COLORS } from '../../theme';
import { CELL } from '../Act2Field/landscape';
import { LAMP_HEIGHT, LAMPS, PIER } from './layout';
import { MOON_COLOR, MOON_DIR } from './Moon';
import { nearestLamps, type PierFrame } from './frame';

/** Olas lentas del mar en calma: h += a·sin(k·p + w·t + phase). Las mismas en vertex y fragment. */
const WAVES = [
  { a: 0.25, k: [0.21, 0.13], w: 0.32, phase: 0 },
  { a: 0.25, k: [-0.16, 0.27], w: -0.35, phase: 1.9 },
  { a: 0.025, k: [0.52, -0.38], w: 0.7, phase: 4.2 },
  { a: 0.012, k: [-0.9, -0.7], w: 1.1, phase: 2.6 },
];
/** Rizos finos: solo para las normales (el brillo de la luna), se apagan con la distancia. */
const RIPPLES = [
  { a: 0.006, k: [2.3, 1.1], w: 1.9, phase: 0.4 },
  { a: 0.0004, k: [-1.7, 2.9], w: -2.3, phase: 3.1 },
  { a: 0.003, k: [3.8, -2.6], w: 2.8, phase: 5.3 },
];
const MAX_LAMPS = 4;
/** Semiextensión del plano; sigue a la cámara, así que el borde nunca se alcanza. */
const HALF = 320;

const f = (n: number) => n.toFixed(4);
const sum = (waves: typeof WAVES, body: (w: (typeof WAVES)[number]) => string) => waves.map(body).join('\n');

const WAVES_GLSL = /* glsl */ `
uniform float uTime;

float seaHeight(vec2 p) {
  float h = 0.0;
${sum(WAVES, (w) => `  h += ${f(w.a)} * sin(${f(w.k[0])} * p.x + ${f(w.k[1])} * p.y + ${f(w.w)} * uTime + ${f(w.phase)});`)}
  return h;
}

/** ∇h analítico; los rizos se suman con peso \`detail\`. */
vec2 seaGradient(vec2 p, float detail) {
  vec2 g = vec2(0.0);
${sum(WAVES, (w) => `  g += ${f(w.a)} * vec2(${f(w.k[0])}, ${f(w.k[1])}) * cos(${f(w.k[0])} * p.x + ${f(w.k[1])} * p.y + ${f(w.w)} * uTime + ${f(w.phase)});`)}
${sum(RIPPLES, (w) => `  g += detail * ${f(w.a)} * vec2(${f(w.k[0])}, ${f(w.k[1])}) * cos(${f(w.k[0])} * p.x + ${f(w.k[1])} * p.y + ${f(w.w)} * uTime + ${f(w.phase)});`)}
  return g;
}
`;

const vertexShader = /* glsl */ `
${WAVES_GLSL}
varying vec3 vWorld;
varying float vDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  world.y += seaHeight(world.xz);
  vWorld = world.xyz;
  vec4 mv = viewMatrix * world;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
${WAVES_GLSL}
#define MAX_LAMPS ${MAX_LAMPS}
uniform float uOpacity;
uniform float uGrid;
uniform vec3 uDeep;
uniform vec3 uSky;
uniform vec3 uInk;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform vec3 uLampColor;
uniform vec4 uLamps[MAX_LAMPS];
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorld;
varying float vDepth;

void main() {
  float detail = 1.0 - smoothstep(12.0, 45.0, vDepth);
  vec2 g = seaGradient(vWorld.xz, detail);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 r = reflect(-v, n);

  // Agua casi negra que refleja un cielo nocturno apenas azul.
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 sky = mix(uSky * 0.35, uSky, smoothstep(-0.05, 0.35, r.y));
  vec3 color = mix(uDeep, sky, fresnel);

  // La estela de la luna: brillo fino en los rizos + un resplandor ancho y tenue.
  float m = max(dot(r, uMoonDir), 0.0);
  color += uMoonColor * (pow(m, 7000.0) * 5.0 + pow(m, 40.0) * 0.12);

  // Reflejos cálidos de los faroles encendidos.
  for (int i = 0; i < MAX_LAMPS; i++) {
    vec4 lamp = uLamps[i];
    if (lamp.w <= 0.0) continue;
    vec3 toLamp = lamp.xyz - vWorld;
    float d2 = dot(toLamp, toLamp);
    float s = pow(max(dot(r, toLamp * inversesqrt(d2)), 0.0), 60.0);
    color += uLampColor * lamp.w * (s * 0.2 + 0.25 / (1.0 + d2 * 0.35));
  }

  // La malla del espacio de soluciones, en la misma posición que la del Acto 2, disolviéndose en agua.
  vec2 c = vWorld.xz / ${f(CELL)};
  vec2 cell = abs(fract(c - 0.5) - 0.5) / fwidth(c);
  float line = 1.0 - min(min(cell.x, cell.y), 1.0);
  color += uInk * line * 0.32 * uGrid;

  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(color, uFogColor, fog), uOpacity);
}
`;

/** Plano con los vértices concentrados cerca del centro (donde está la cámara). */
function seaGeometry(segments: number): PlaneGeometry {
  const g = new PlaneGeometry(2, 2, segments, segments);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setXYZ(i, Math.sign(x) * x * x * HALF, 0, Math.sign(z) * z * z * HALF);
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return g;
}

/**
 * Mar nocturno bajo la luna. Sigue a la cámara en xz (las olas se calculan en coordenadas de mundo,
 * así que no se deslizan). Se dibuja después de las estrellas y antes que lo aditivo del acto:
 * cubre por alfa el cielo bajo el horizonte y su profundidad tapa lo que queda bajo el agua.
 */
export function Ocean({ frame, anchor }: { frame: PierFrame; anchor: Vector3 }) {
  const quality = useWorld((s) => s.quality);
  const fog = useThree((s) => s.scene.fog);
  const mesh = useRef<Mesh>(null);
  const segments = Math.round(220 * Math.max(QUALITY[quality].density, 0.5));
  const geometry = useMemo(() => seaGeometry(segments), [segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(() => {
    const sceneFog = fog instanceof Fog ? fog : null;
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uGrid: { value: 1 },
        uDeep: { value: new Color('#020409') },
        uSky: { value: new Color('#0d1626') },
        uInk: { value: new Color(COLORS.ink) },
        uMoonDir: { value: MOON_DIR },
        uMoonColor: { value: MOON_COLOR },
        uLampColor: { value: new Color(COLORS.glow) },
        uLamps: { value: Array.from({ length: MAX_LAMPS }, () => new Vector4()) },
        uFogColor: { value: new Color(sceneFog?.color ?? COLORS.void) },
        uFogNear: { value: sceneFog?.near ?? 30 },
        uFogFar: { value: sceneFog?.far ?? 140 },
      },
      transparent: true,
    });
  }, [fog]);
  useEffect(() => () => material.dispose(), [material]);

  const lamps = useMemo<number[]>(() => [], []);

  useFrame(({ camera }) => {
    const u = material.uniforms;
    u.uTime.value = frame.time;
    u.uOpacity.value = frame.sea;
    u.uGrid.value = frame.grid;
    // Mientras aparece, sin profundidad: la malla del Acto 2 (casi a la misma altura) no queda tapada.
    material.depthWrite = frame.sea > 0.999;
    mesh.current?.position.set(camera.position.x, anchor.y, camera.position.z);

    nearestLamps(frame, MAX_LAMPS, lamps);
    const slots = u.uLamps.value as Vector4[];
    for (let i = 0; i < MAX_LAMPS; i++) {
      const lamp = LAMPS[lamps[i]];
      if (lamp) slots[i].set(anchor.x + lamp.x, anchor.y + PIER.deck + LAMP_HEIGHT, anchor.z + lamp.z, frame.lampGlow[lamps[i]]);
      else slots[i].w = 0;
    }
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />;
}
