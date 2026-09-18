import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  CanvasTexture,
  DoubleSide,
  InstancedBufferAttribute,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  type InstancedMesh,
} from 'three';
import { useT } from '../../../i18n/useT';
import { cityPalette } from './palette';
import { CITY_FRAGMENT, CITY_VERTEX } from './glsl';
import { ribbonGeometry } from './ribbon';
import type { Label } from './board';
import type { CityFrame } from './frame';
import type { XZ } from './layout';
import type { Project } from '../../types';

// ─── Contornos ─────────────────────────────────────────────────────────────────

const lineVertex = /* glsl */ `
${CITY_VERTEX}
attribute float aAcross;
varying float vAcross;
varying float vReveal;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vReveal = riseAt(world.xz);
  vAcross = aAcross;
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;
}
`;

const lineFragment = /* glsl */ `
${CITY_FRAGMENT}
uniform vec3 uSilk;
varying float vAcross;
varying float vReveal;
void main() {
  if (vReveal <= 0.0) discard;
  float aa = 1.0 - smoothstep(1.0 - fwidth(vAcross) * 1.5, 1.0, abs(vAcross));
  gl_FragColor = vec4(applyFog(uSilk * 0.82), aa * vReveal * 0.9);
  #include <colorspace_fragment>
}
`;

function SilkLines({ silk, frame }: { silk: number[]; frame: CityFrame }) {
  const geometry = useMemo(() => {
    const items: { pts: XZ[]; width: number }[] = [];
    for (let i = 0; i < silk.length; i += 4) items.push({ pts: [[silk[i], silk[i + 1]], [silk[i + 2], silk[i + 3]]], width: 0.07 });
    return ribbonGeometry(items, () => 0.06);
  }, [silk]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: lineVertex,
        fragmentShader: lineFragment,
        uniforms: { ...frame.uniforms, uSilk: { value: cityPalette.colors.silk } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [frame],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} renderOrder={4} frustumCulled={false} />;
}

// ─── Rótulos ───────────────────────────────────────────────────────────────────

/** Píxeles por alto de letra en el atlas. */
const FONT_PX = 56;
const PAD_PX = 10;
const ATLAS_WIDTH = 2048;
const FONT = `600 ${FONT_PX}px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`;

interface Atlas {
  texture: CanvasTexture;
  /** Por rótulo: rect UV (u, v, ancho, alto) con v hacia arriba y proporción ancho/alto. */
  entries: { rect: [number, number, number, number]; aspect: number }[];
}

/** Todos los rótulos en un canvas (texto blanco; el color llega por shader). */
function buildAtlas(texts: string[]): Atlas {
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = FONT;
  const cellH = Math.ceil(FONT_PX * 1.25 + PAD_PX * 2);
  const placed: { x: number; y: number; w: number }[] = [];
  let x = 0;
  let y = 0;
  for (const text of texts) {
    const w = Math.ceil(measure.measureText(text).width + PAD_PX * 2);
    if (x + w > ATLAS_WIDTH && x > 0) {
      x = 0;
      y += cellH;
    }
    placed.push({ x, y, w });
    x += w;
  }
  const height = y + cellH;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.font = FONT;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  texts.forEach((text, i) => ctx.fillText(text, placed[i].x + PAD_PX, placed[i].y + cellH / 2));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return {
    texture,
    entries: placed.map((p) => ({
      rect: [p.x / ATLAS_WIDTH, 1 - (p.y + cellH) / height, p.w / ATLAS_WIDTH, cellH / height],
      aspect: p.w / cellH,
    })),
  };
}

const labelVertex = /* glsl */ `
${CITY_VERTEX}
attribute vec4 aRect;
attribute float aOwner;
attribute float aTone;
varying vec2 vUv;
varying float vTone;
varying float vGlow;
varying float vReveal;
void main() {
  vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float rise = riseAt(origin.xz);
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  // Los grabados sobre un chip suben y se levantan con él.
  world.y = world.y * rise + ownerLift(aOwner) * rise * aTone;
  vReveal = rise;
  vUv = aRect.xy + uv * aRect.zw;
  vTone = aTone;
  vGlow = ownerGlow(aOwner);
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;
}
`;

const labelFragment = /* glsl */ `
${CITY_FRAGMENT}
uniform sampler2D uAtlas;
uniform vec3 uSilk;
uniform vec3 uLaser;
uniform vec3 uPulse;
varying vec2 vUv;
varying float vTone;
varying float vGlow;
varying float vReveal;
void main() {
  float alpha = texture2D(uAtlas, vUv).a;
  if (alpha < 0.01 || vReveal <= 0.0) discard;
  vec3 color = mix(uSilk * 0.9, uLaser, vTone);
  // El nombre del proyecto en foco se enciende con el color de los pulsos.
  color = mix(color, uPulse * 1.4, vGlow * (1.0 - vTone) * 0.8);
  gl_FragColor = vec4(applyFog(color), alpha * vReveal);
  #include <colorspace_fragment>
}
`;

function Labels({ labels, projects, frame }: { labels: Label[]; projects: Project[]; frame: CityFrame }) {
  const { pick, lang } = useT();
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const mesh = useRef<InstancedMesh>(null);

  const atlas = useMemo(() => {
    const texts = labels.map((l) => (typeof l.text === 'string' ? l.text : pick(projects[l.text.project].title).toUpperCase()));
    const built = buildAtlas(texts);
    // Texto plano visto en diagonal: sin anisotropía se emborrona.
    built.texture.anisotropy = maxAnisotropy;
    return built;
    // `lang` cambia `pick`: el atlas se rehace con los títulos en el idioma nuevo.
  }, [labels, projects, pick, lang, maxAnisotropy]);

  const geometry = useMemo(() => {
    // Quad plano: +x a lo largo del texto, −z hacia arriba de la letra.
    const g = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    g.setAttribute('aRect', new InstancedBufferAttribute(new Float32Array(atlas.entries.flatMap((e) => e.rect)), 4));
    g.setAttribute('aOwner', new InstancedBufferAttribute(Float32Array.from(labels, (l) => l.owner), 1));
    g.setAttribute('aTone', new InstancedBufferAttribute(Float32Array.from(labels, (l) => l.tone), 1));
    return g;
  }, [atlas, labels]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: labelVertex,
        fragmentShader: labelFragment,
        uniforms: {
          ...frame.uniforms,
          uAtlas: { value: null },
          uSilk: { value: cityPalette.colors.silk },
          uLaser: { value: cityPalette.colors.canTop },
          uPulse: { value: cityPalette.colors.pulse },
        },
        transparent: true,
        depthWrite: false,
      }),
    [frame],
  );
  material.uniforms.uAtlas.value = atlas.texture;

  useLayoutEffect(() => {
    const m = new Matrix4();
    labels.forEach((l, i) => {
      const { aspect } = atlas.entries[i];
      // La celda del atlas es más alta que la letra (margen): se escala para que la letra mida `size`.
      const h = (l.size * (FONT_PX * 1.25 + PAD_PX * 2)) / FONT_PX;
      const w = h * aspect;
      const x = l.align === 'left' ? l.x + w / 2 : l.x;
      m.makeScale(w, 1, h).setPosition(x, l.y > 0 ? l.y + 0.01 : 0.07, l.z);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [labels, atlas]);

  useEffect(() => () => atlas.texture.dispose(), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <instancedMesh ref={mesh} args={[geometry, material, labels.length]} renderOrder={5} frustumCulled={false} />;
}

/** Serigrafía de la placa: contornos de componentes y rótulos (referencias, nombres, marcas). */
export function Silkscreen({ silk, labels, projects, frame }: { silk: number[]; labels: Label[]; projects: Project[]; frame: CityFrame }) {
  return (
    <group>
      <SilkLines silk={silk} frame={frame} />
      <Labels labels={labels} projects={projects} frame={frame} />
    </group>
  );
}
