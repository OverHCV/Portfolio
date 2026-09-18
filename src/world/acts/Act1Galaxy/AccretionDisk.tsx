import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, type ShaderMaterial } from 'three';
import { HORIZON_RADIUS } from './constants';

export const DISK_INNER = HORIZON_RADIUS * 1.15;
export const DISK_OUTER = HORIZON_RADIUS * 6.6;

export const vertexShader = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Ruido de valor + fbm, compartido con el halo lenteado. */
export const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 1.5 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 2; i++) { v += a * noise(p); p *= 12.03; a *= 0.5; }
  return v;
}
`;

// Disco con rotación kepleriana (más rápido cerca del centro), gradiente de temperatura
// y un lado más brillante (beaming relativista, aproximado).
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uHot;
uniform vec3 uWarm;
uniform vec3 uCool;
varying vec2 vPos;

${NOISE_GLSL}
void main() {
  float r = length(vPos);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float angle = atan(vPos.y, vPos.x);

  float spin = uTime * 0.6 / pow(r, 1.5);
  float c = cos(spin), s = sin(spin);
  vec2 swirl = mat2(c, -s, s, c) * vPos;
  float n = fbm(swirl * 1.6 + vec2(r * 2.2, 0.0));
  float streaks = fbm(vec2(angle * 2.0 + spin * 3.0, r * 9.0));

  float heat = pow(1.0 - t, 1.6);
  vec3 color = mix(uCool, uWarm, smoothstep(0.0, 0.6, heat));
  color = mix(color, uHot, smoothstep(0.7, 1.0, heat));

  float beaming = 1.0 + 0.6 * sin(angle);
  float edges = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.55, 1.0, t));
  float intensity = (0.3 + 0.8 * n + 0.35 * streaks) * (0.22 + 1.5 * heat) * beaming * edges;

  gl_FragColor = vec4(color * intensity, 1.0);
}
`;

export function AccretionDisk() {
  const material = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[Math.PI / 2 + 0.2, 0, 9.82]}>
      <ringGeometry args={[DISK_INNER, DISK_OUTER, 6, 6]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uInner: { value: DISK_INNER },
          uOuter: { value: DISK_OUTER },
          uHot: { value: [2.9, 1.75, 1.5] },
          uWarm: { value: [1.35, 0.85, 0.4] },
          uCool: { value: [0.55, 0.18, 0.05] },
        }}
        side={DoubleSide}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
