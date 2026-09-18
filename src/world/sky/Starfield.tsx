import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, ShaderMaterial } from 'three';
import { useWorld } from '../store';
import { QUALITY } from '../lib/quality';
import { ACTS } from '../acts.config';
import { TRANSITIONS } from '../transitions.config';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPixelRatio * (220.0 / -mv.z), 1.0, 6.0 * uPixelRatio);
  vTwinkle = 0.7 + 0.3 * sin(uTime * (0.4 + aSeed * 1.8) + aSeed * 40.0);
  vColor = aColor;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * vTwinkle * alpha, alpha);
}
`;

/** Tres cáscaras a distinta distancia: la paralaje sale sola al mover la cámara. */
const LAYERS = [
  { count: 1800, inner: 45, outer: 80, size: 2.2 },
  { count: 3200, inner: 110, outer: 170, size: 2.6 },
  { count: 4200, inner: 230, outer: 340, size: 3.2 },
];

const PALETTE = [
  { color: new Color('#dfe8ff'), weight: 0.68 },
  { color: new Color('#ffd9a0'), weight: 0.2 },
  { color: new Color('#a8c4ff'), weight: 0.12 },
];

function pickColor(r: number): Color {
  let acc = 0;
  for (const p of PALETTE) {
    acc += p.weight;
    if (r <= acc) return p.color;
  }
  return PALETTE[0].color;
}

function buildGeometry(density: number): BufferGeometry {
  const total = LAYERS.reduce((n, l) => n + Math.round(l.count * density), 0);
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const seeds = new Float32Array(total);
  let i = 0;
  for (const layer of LAYERS) {
    const n = Math.round(layer.count * density);
    for (let k = 0; k < n; k++, i++) {
      // Punto uniforme en una cáscara esférica.
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = layer.inner + Math.random() * (layer.outer - layer.inner);
      positions.set([r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)], i * 3);
      // Unas pocas estrellas por encima de 1 para que el bloom las recoja.
      const brightness = Math.random() < 0.04 ? 2.2 : 0.55 + Math.random() * 0.6;
      const c = pickColor(Math.random());
      colors.set([c.r * brightness, c.g * brightness, c.b * brightness], i * 3);
      sizes[i] = layer.size * (0.5 + Math.random());
      seeds[i] = Math.random();
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  return geometry;
}

// El cielo estrellado acompaña a los dos actos "espaciales" y se apaga bajo el velo hacia el mar.
const SKY_END = ACTS[1].end + (TRANSITIONS[1].hold + TRANSITIONS[1].fade);

export function Starfield() {
  const quality = useWorld((s) => s.quality);
  const points = useRef<Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => buildGeometry(QUALITY[quality].density), [quality]);
  const material = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
    if (points.current) {
      const { progress, activeAct, hd } = useWorld.getState();
      // En HD el shader del Acto 1 dibuja su propio cielo, ya lenteado.
      points.current.visible = progress <= SKY_END && !(hd && activeAct === 1);
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 }, uPixelRatio: { value: dpr } }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
