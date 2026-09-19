import { useEffect, useMemo, useState } from 'react';
import {
  CanvasTexture,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
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
 * Cada entrada es TeX real: MathJax la compila a SVG (glifos como trazados, sin fuentes web)
 * y se hornea en un atlas con una sombra oscura por detrás para que las letras
 * no se mezclen con la malla del paisaje.
 */
const ENTRIES = [
  String.raw`\mathbb{R}`,
  String.raw`\mathbb{C}`,
  String.raw`\mathbb{H}`,
  String.raw`\mathbb{N}`,
  String.raw`\mathbb{Z}`,
  String.raw`\mathbb{Q}`,
  String.raw`\nabla f`,
  String.raw`\frac{\partial f}{\partial x}`,
  String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`,
  String.raw`\sum_{i=1}^{n}`,
  String.raw`\infty`,
  String.raw`\lambda`,
  String.raw`\varepsilon`,
  String.raw`\delta`,
  String.raw`e^{i\pi} + 1 = 0`,
  String.raw`x_{k+1} = x_k - \eta\,\nabla f(x_k)`,
  String.raw`\nabla f(x^{*}) = 0`,
  String.raw`\hat{f}(x) = \frac{1}{nh} \sum_{i=1}^{n} K\!\left(\frac{x - x_i}{h}\right)`,
  String.raw`d^2(x) = (x - \bar{x})^{\top} S^{-1} (x - \bar{x})`,
  String.raw`\det(A) \ne 0`,
  String.raw`f : \mathbb{R}^{n} \to \mathbb{R}`,
  String.raw`H(f) \succeq 0`,
];
// String.raw`\mathbb{R}^{n}`,
// String.raw`\lVert x \rVert_2`,

/** Tamaño tipográfico (em/ex) con el que MathJax compila cada fórmula. */
const FONT_PX = 64;
const EX_PX = FONT_PX / 2;
const ATLAS_WIDTH = 2048;
/**
 * Sombra horneada con la forma de cada fórmula (como un text-shadow): sin ella, las letras se
 * mezclan con la malla. Dos capas de la silueta negra difuminada: un contorno ceñido que despega
 * el trazo y un halo ancho que apaga los puntos de alrededor. `passes` apila la capa (más densa);
 * `bleed` es el margen de la celda para que el halo no se corte.
 */
const SHADOW = {
  layers: [
    { blur: 3, passes: 3 },
    { blur: 12, passes: 6 },
  ],
  bleed: 26,
};

interface AtlasEntry {
  /** Rect UV (u, v, ancho, alto) con v hacia arriba. */
  rect: [number, number, number, number];
  aspect: number;
}

interface Atlas {
  texture: CanvasTexture;
  entries: AtlasEntry[];
}

/** Documento MathJax: módulo pesado que se carga como chunk aparte y se crea una sola vez. */
async function createCompiler() {
  const [{ mathjax }, { TeX }, { SVG }, { browserAdaptor }, { RegisterHTMLHandler }, { AllPackages }] =
    await Promise.all([
      import('mathjax-full/js/mathjax.js'),
      import('mathjax-full/js/input/tex.js'),
      import('mathjax-full/js/output/svg.js'),
      import('mathjax-full/js/adaptors/browserAdaptor.js'),
      import('mathjax-full/js/handlers/html.js'),
      import('mathjax-full/js/input/tex/AllPackages.js'),
    ]);
  RegisterHTMLHandler(browserAdaptor());
  return mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    // fontCache local: cada SVG lleva sus trazados dentro (autosuficiente para rasterizar).
    OutputJax: new SVG({ fontCache: 'local' }),
  });
}
type Compiler = Awaited<ReturnType<typeof createCompiler>>;
let compiler: Promise<Compiler> | null = null;

/** El SVG llega con width/height en ex/em: los pasa a px con la escala de FONT_PX. */
function toPx(attr: string | null): number {
  const m = attr?.match(/^([\d.]+)(em|ex|px)?$/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  return m[2] === 'em' ? v * FONT_PX : m[2] === 'ex' ? v * EX_PX : v;
}

async function rasterize(doc: Compiler, tex: string) {
  const node = doc.convert(tex, { display: true, em: FONT_PX, ex: EX_PX, containerWidth: ATLAS_WIDTH });
  const svg = (node as unknown as Element).firstElementChild as SVGSVGElement | null;
  if (!svg) throw new Error(`MathJax no produjo SVG para: ${tex}`);
  // Los trazados usan fill="currentColor": se tiñen de blanco (el color definitivo llega por shader).
  svg.style.color = '#ffffff';
  let w = toPx(svg.getAttribute('width'));
  let h = toPx(svg.getAttribute('height'));
  svg.setAttribute('width', `${Math.max(w, 1)}px`);
  svg.setAttribute('height', `${Math.max(h, 1)}px`);
  const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { img, w: Math.ceil(w || img.naturalWidth), h: Math.ceil(h || img.naturalHeight) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Copia negra (mismo alfa) de una fórmula, para hornear su sombra. */
function silhouetteOf(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** Compila todas las fórmulas y las empaqueta por filas en un canvas; una textura para todo. */
async function buildAtlas(): Promise<Atlas> {
  compiler ??= createCompiler();
  const doc = await compiler;
  const glyphs = await Promise.all(ENTRIES.map((tex) => rasterize(doc, tex)));

  // Empaquetado por filas con alturas reales (fracciones y límites son altos).
  // Cada celda deja margen (bleed) para que la sombra no se corte.
  const margin = SHADOW.bleed;
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const g of glyphs) {
    const w = g.w + margin * 2;
    const h = g.h + margin * 2;
    if (x + w > ATLAS_WIDTH && x > 0) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    placed.push({ x, y, w, h });
    x += w;
    rowH = Math.max(rowH, h);
  }
  const height = Math.max(Math.ceil(y + rowH), 1);

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // Silueta negra de cada fórmula, difuminada varias veces por detrás: la sombra sigue al glifo.
  glyphs.forEach((g, i) => {
    const silhouette = silhouetteOf(g.img, g.w, g.h);
    for (const { blur, passes } of SHADOW.layers) {
      ctx.filter = `blur(${blur}px)`;
      for (let k = 0; k < passes; k++) ctx.drawImage(silhouette, placed[i].x + margin, placed[i].y + margin);
    }
  });
  ctx.filter = 'none';
  // Fórmula blanca encima de su sombra.
  glyphs.forEach((g, i) => ctx.drawImage(g.img, placed[i].x + margin, placed[i].y + margin, g.w, g.h));

  const entries = placed.map(({ x: px, y: py, w, h }) => ({
    rect: [px / ATLAS_WIDTH, 1 - (py + h) / height, w / ATLAS_WIDTH, h / height] as AtlasEntry['rect'],
    aspect: w / h,
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
  vAlpha = ends * near * (0.6 + 0.4 * aSeed);
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
  // Fórmula blanca (teñida con uColor) sobre su sombra negra horneada en el atlas.
  vec4 t = texture2D(uAtlas, vUv);
  float a = t.a * vAlpha * uOpacity * uReveal * (1.0 - uCalm) * 0.9;
  if (a < 0.004) discard;
  gl_FragColor = vec4(t.rgb * uColor, a);
}
`;

const COUNT = 56;
/** Volumen donde flotan: todo el paisaje, de y = BOTTOM a BOTTOM + HEIGHT. */
const VOLUME = { height: 6, bottom: 0.5 };

export function MathGlyphs({ landscape }: { landscape: Landscape }) {
  const quality = useWorld((s) => s.quality);
  // El atlas llega async (MathJax se descarga aparte); hasta entonces no hay glifos.
  const [atlas, setAtlas] = useState<Atlas | null>(null);

  useEffect(() => {
    let alive = true;
    buildAtlas().then((a) => {
      if (alive) setAtlas(a);
      else a.texture.dispose();
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => () => atlas?.texture.dispose(), [atlas]);

  const geometry = useMemo(() => {
    if (!atlas) return null;
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

  useEffect(() => () => geometry?.dispose(), [geometry]);

  // Material a mano (ver Surface.tsx): comparte los uniforms del paisaje sin copiarlos.
  const material = useMemo(() => {
    if (!atlas) return null;
    return new ShaderMaterial({
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
      // Mezcla normal (no aditiva): la sombra negra horneada tiene que poder oscurecer.
      blending: NormalBlending,
      toneMapped: false,
    });
  }, [landscape, atlas]);
  useEffect(() => () => material?.dispose(), [material]);

  if (!geometry || !material) return null;
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
