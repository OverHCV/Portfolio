import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Group,
  LatheGeometry,
  ShaderMaterial,
  type SpriteMaterial,
  Vector2,
} from 'three';
import { useWorld } from '../../store';
import { MILESTONE_COLORS } from '../../theme';
import { getHaloTexture } from '../../lib/haloTexture';
import type { Milestone } from '../../types';
import { jellyAt } from './layout';
import { builtAt, orderAt } from './timeline';
import type { PierFrame } from './frame';

const BELL_HEIGHT = 0.42;
const TENTACLES = 9;
const TENTACLE_SEGMENTS = 18;
const TENTACLE_LENGTH = 1.5;

const bellVertex = /* glsl */ `
uniform float uTime;
uniform float uPhase;
varying vec3 vNormal;
varying vec3 vView;
varying float vY;

void main() {
  // Latido: la campana se cierra por el borde y se estira un poco al contraerse.
  float pulse = sin(uTime * 1.6 + uPhase);
  vec3 p = position;
  float lip = 1.0 - smoothstep(0.0, ${BELL_HEIGHT.toFixed(2)}, p.y);
  p.xz *= 1.0 - 0.1 * pulse * (0.35 + lip);
  p.y *= 1.0 + 0.06 * pulse;
  vY = position.y / ${BELL_HEIGHT.toFixed(2)};
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const bellFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
varying float vY;

void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
  float ribs = 0.85 + 0.15 * sin(atan(vNormal.x, vNormal.z) * 8.0);
  vec3 c = uColor * (0.12 + 1.7 * rim * ribs + 0.25 * (1.0 - vY)) * uGlow;
  gl_FragColor = vec4(c * uOpacity, 1.0);
}
`;

const tentacleVertex = /* glsl */ `
uniform float uTime;
uniform float uPhase;
attribute float aT;
attribute float aStrand;
varying float vT;

void main() {
  vec3 p = position;
  float s = aT * aT;
  p.x += sin(uTime * 1.1 + aT * 5.0 + aStrand * 1.7 + uPhase) * 0.14 * s;
  p.z += cos(uTime * 0.9 + aT * 4.0 + aStrand * 2.3 + uPhase) * 0.14 * s;
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const tentacleFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uOpacity;
varying float vT;

void main() {
  gl_FragColor = vec4(uColor * (1.0 - vT) * 0.9 * uGlow * uOpacity, 1.0);
}
`;

/** Campana: media cúpula con el borde apenas abierto. */
function bellGeometry(): LatheGeometry {
  const profile = Array.from({ length: 17 }, (_, k) => {
    const a = (k / 16) * (Math.PI / 2) * 1.08;
    return new Vector2(0.5 * Math.sin(a) + 0.001, BELL_HEIGHT * Math.cos(a));
  });
  return new LatheGeometry(profile, 32);
}

/** Tentáculos: segmentos que cuelgan del borde; el shader los ondula más hacia la punta. */
function tentacleGeometry(): BufferGeometry {
  const positions: number[] = [];
  const ts: number[] = [];
  const strands: number[] = [];
  for (let s = 0; s < TENTACLES; s++) {
    const angle = (s / TENTACLES) * Math.PI * 2;
    const r = s % 3 === 0 ? 0.12 : 0.38;
    const length = TENTACLE_LENGTH * (s % 3 === 0 ? 1.25 : 0.8 + 0.2 * Math.sin(s * 2.7));
    for (let k = 0; k < TENTACLE_SEGMENTS; k++) {
      for (const t of [k / TENTACLE_SEGMENTS, (k + 1) / TENTACLE_SEGMENTS]) {
        positions.push(r * Math.cos(angle) * (1 - 0.3 * t), -t * length, r * Math.sin(angle) * (1 - 0.3 * t));
        ts.push(t);
        strands.push(s);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('aT', new BufferAttribute(new Float32Array(ts), 1));
  g.setAttribute('aStrand', new BufferAttribute(new Float32Array(strands), 1));
  return g;
}

function jellyMaterial(vertexShader: string, fragmentShader: string, color: Color, phase: number) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: phase },
      uColor: { value: color },
      uGlow: { value: 1 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
}

interface JellyProps {
  milestone: Milestone;
  index: number;
  count: number;
  frame: PierFrame;
  hover: { current: string | null };
  geometries: { bell: BufferGeometry; tentacles: BufferGeometry };
}

/** Un hito = una medusa. Hover la agranda y la destaca en la tarjeta; clic abre su panel. */
function Jelly({ milestone, index, count, frame, hover, geometries }: JellyProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const halo = useRef<SpriteMaterial>(null);
  const [x, y, z] = useMemo(() => jellyAt(index, count), [index, count]);
  const color = useMemo(() => new Color(MILESTONE_COLORS[milestone.kind]), [milestone.kind]);
  const core = useMemo(() => color.clone().multiplyScalar(2.6), [color]);
  const haloMap = useMemo(getHaloTexture, []);
  const phase = index * 1.9;
  const materials = useMemo(
    () => ({ bell: jellyMaterial(bellVertex, bellFragment, color, phase), tentacles: jellyMaterial(tentacleVertex, tentacleFragment, color, phase) }),
    [color, phase],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  useFrame((_, delta) => {
    if (!root.current || !body.current) return;
    const visible = builtAt(orderAt(z), frame.build.value) * frame.sea;
    root.current.visible = visible > 0.01;
    if (!root.current.visible) return;

    const t = frame.time;
    root.current.position.set(x + 0.15 * Math.sin(t * 0.3 + phase), y + 0.22 * Math.sin(t * 0.55 + phase), z);
    root.current.rotation.y = 0.2 * Math.sin(t * 0.2 + phase);

    const hovered = hover.current === milestone.id;
    const near = useWorld.getState().nearMilestone === milestone.id;
    const goal = hovered ? 1.3 : near ? 1.12 : 1;
    const s = body.current.scale.x + (goal - body.current.scale.x) * Math.min(1, delta * 8);
    body.current.scale.setScalar(s);

    const glow = hovered ? 1.8 : near ? 1.35 : 1;
    for (const m of Object.values(materials)) {
      m.uniforms.uTime.value = t;
      m.uniforms.uGlow.value = glow;
      m.uniforms.uOpacity.value = visible;
    }
    if (halo.current) halo.current.opacity = 0.3 * glow * visible;
  });

  return (
    <group ref={root} visible={false}>
      <group ref={body}>
        <mesh geometry={geometries.bell} material={materials.bell} />
        <lineSegments geometry={geometries.tentacles} material={materials.tentacles} />
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshBasicMaterial color={core} toneMapped={false} />
        </mesh>
        <sprite scale={2.4} position={[0, 0.1, 0]}>
          <spriteMaterial ref={halo} map={haloMap} color={color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      {/* Zona de hover/clic más grande que la medusa visible. */}
      <mesh
        position={[0, -0.3, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!root.current?.visible) return;
          hover.current = milestone.id;
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (hover.current === milestone.id) hover.current = null;
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!root.current?.visible) return;
          useWorld.getState().setFocus({ kind: 'milestone', id: milestone.id });
        }}
      >
        <sphereGeometry args={[0.95, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Una medusa por hito, en orden cronológico a lo largo del muelle (layout.ts, `jellyAt`). */
export function Jellyfish({ milestones, frame, hover }: { milestones: Milestone[]; frame: PierFrame; hover: { current: string | null } }) {
  const geometries = useMemo(() => ({ bell: bellGeometry(), tentacles: tentacleGeometry() }), []);
  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries]);

  return (
    <group>
      {milestones.map((m, i) => (
        <Jelly key={m.id} milestone={m} index={i} count={milestones.length} frame={frame} hover={hover} geometries={geometries} />
      ))}
    </group>
  );
}
