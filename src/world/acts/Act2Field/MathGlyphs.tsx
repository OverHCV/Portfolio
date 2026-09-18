import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from 'three';
import { useWorld } from '../../store';
import { QUALITY } from '../../lib/quality';
import { COLORS } from '../../theme';
import { EXTENT, type Landscape } from './landscape';

/**
 * Notación que flota sobre el paisaje. Es decoración (igual en todos los idiomas), no contenido.
 * Un tramo `{ sup }` se dibuja como superíndice.
 */
type Piece = string | { sup: string };
const ENTRIES: Piece[][] = [
  ['ℝ'], ['ℂ'], ['ℍ'], ['ℕ'], ['ℤ'], ['ℚ'], ['∇f'], ['∂f/∂x'], ['∫'], ['∑'], ['∞'], ['π'], ['λ'], ['ε'], ['δ'],
  ['e', { sup: 'iπ' }, ' + 1 = 0'],
  ['xₖ₊₁ = xₖ − η∇f(xₖ)'],
  ['∇f(x*) = 0'],
  ['argmin f(x)'],
  ['‖x‖₂'],
  ['Ax = b'],
  ['∀ε > 0 ∃δ > 0'],
  ['det(A) ≠ 0'],
  ['ℝ', { sup: 'n' }],
  ['f : ℝ', { sup: 'n' }, ' → ℝ'],
  ['H(f) ⪰ 0'],
];

const FONT_PX = 64;
const SUP_SCALE = 0.62;
const ROW = Math.round(FONT_PX * 1.5);
const ATLAS_WIDTH = 1024;
const PAD = 12;
const FONT = `"STIX Two Math", "Cambria Math", "Latin Modern Math", "Times New Roman", serif`;

interface AtlasEntry {
  /** Rect UV (u, v, ancho, alto) con v hacia arriba. */
  rect: [number, number, number, number];
  aspect: number;
}

/** Dibuja todas las entradas en un canvas por filas; una textura para todo. */
function buildAtlas(): { texture: CanvasTexture; entries: AtlasEntry[] } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = (scale: number) => `${Math.round(FONT_PX * scale)}px ${FONT}`;
  const widthOf = (pieces: Piece[]) =>
    pieces.reduce((w, p) => {
      ctx.font = font(typeof p === 'string' ? 1 : SUP_SCALE);
      return w + ctx.measureText(typeof p === 'string' ? p : p.sup).width;
    }, 0);

  // Empaquetado por filas.
  const placed: { x: number; y: number; w: number }[] = [];
  let x = 0;
  let y = 0;
  for (const pieces of ENTRIES) {
    const w = Math.ceil(widthOf(pieces)) + PAD * 2;
    if (x + w > ATLAS_WIDTH) {
      x = 0;
      y += ROW;
    }
    placed.push({ x, y, w });
    x += w;
  }
  const height = y + ROW;
  canvas.width = ATLAS_WIDTH;
  canvas.height = height;

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  const baseline = ROW * 0.68;
  ENTRIES.forEach((pieces, i) => {
    let cx = placed[i].x + PAD;
    for (const p of pieces) {
      const sup = typeof p !== 'string';
      ctx.font = font(sup ? SUP_SCALE : 1);
      const text = sup ? p.sup : p;
      ctx.fillText(text, cx, placed[i].y + baseline - (sup ? FONT_PX * 0.42 : 0));
      cx += ctx.measureText(text).width;
    }
  });

  const entries = placed.map(({ x: px, y: py, w }) => ({
    rect: [px / ATLAS_WIDTH, 1 - (py + ROW) / height, w / ATLAS_WIDTH, ROW / height] as AtlasEntry['rect'],
    aspect: w / ROW,
  }));
  return { texture: new CanvasTexture(canvas), entries };
}

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uVolume; // (alto, y inferior)
attribute vec3 aBase;
attribute vec4 aRect;
attribute vec2 aSize;
attribute float aSeed;
varying vec2 vUv;
varying float vAlpha;

void main() {
  // Sube despacio y reaparece abajo; se mece en x/z.
  float h = uVolume.x;
  float rise = mod(aBase.y + uTime * (0.08 + 0.1 * aSeed), h);
  vec3 p = vec3(
    aBase.x + sin(uTime * 0.13 + aSeed * 31.0) * 0.8,
    uVolume.y + rise,
    aBase.z + cos(uTime * 0.11 + aSeed * 17.0) * 0.6
  );
  // Billboard: el quad se abre en espacio de vista.
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * aSize;
  gl_Position = projectionMatrix * mv;
  vUv = aRect.xy + uv * aRect.zw;
  float ends = smoothstep(0.0, 0.2, rise / h) * (1.0 - smoothstep(0.75, 1.0, rise / h));
  // Los que pasan muy cerca de la cámara se apagan: no deben tapar el texto ni el paisaje.
  float near = smoothstep(6.0, 12.0, -mv.z);
  vAlpha = ends * near * (0.35 + 0.65 * aSeed);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uReveal;
uniform float uCalm;
varying vec2 vUv;
varying float vAlpha;

void main() {
  float a = texture2D(uAtlas, vUv).a * vAlpha * uOpacity * uReveal * (1.0 - uCalm) * 0.35;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

const COUNT = 56;
/** Volumen donde flotan: todo el paisaje, de y = BOTTOM a BOTTOM + HEIGHT. */
const VOLUME = { height: 6, bottom: 0.5 };

export function MathGlyphs({ landscape }: { landscape: Landscape }) {
  const quality = useWorld((s) => s.quality);
  const atlas = useMemo(buildAtlas, []);

  const geometry = useMemo(() => {
    const count = Math.round(COUNT * QUALITY[quality].density);
    const quad = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.setIndex(quad.index);
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    g.instanceCount = count;
    const base = new Float32Array(count * 3);
    const rect = new Float32Array(count * 4);
    const size = new Float32Array(count * 2);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const e = atlas.entries[Math.floor(Math.random() * atlas.entries.length)];
      // Dentro del óvalo visible del paisaje.
      const r = Math.sqrt(Math.random()) * 0.85;
      const a = Math.random() * Math.PI * 2;
      base.set([Math.cos(a) * r * EXTENT.x, Math.random() * VOLUME.height, Math.sin(a) * r * EXTENT.z], i * 3);
      rect.set(e.rect, i * 4);
      const h = 0.3 + Math.random() * 0.25;
      size.set([h * e.aspect, h], i * 2);
      seed[i] = Math.random();
    }
    g.setAttribute('aBase', new InstancedBufferAttribute(base, 3));
    g.setAttribute('aRect', new InstancedBufferAttribute(rect, 4));
    g.setAttribute('aSize', new InstancedBufferAttribute(size, 2));
    g.setAttribute('aSeed', new InstancedBufferAttribute(seed, 1));
    return g;
  }, [quality, atlas]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => atlas.texture.dispose(), [atlas]);

  // Material a mano (ver Surface.tsx): comparte los uniforms del paisaje sin copiarlos.
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: landscape.uniforms.uTime,
          uOpacity: landscape.uniforms.uOpacity,
          uReveal: landscape.uniforms.uReveal,
          uCalm: landscape.uniforms.uCalm,
          uAtlas: { value: atlas.texture },
          uColor: { value: new Color(COLORS.ink) },
          uVolume: { value: new Vector2(VOLUME.height, VOLUME.bottom) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [landscape, atlas],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
