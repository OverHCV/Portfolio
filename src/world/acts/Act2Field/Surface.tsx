import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, Color, PlaneGeometry, ShaderMaterial } from 'three';
import { useWorld } from '../../store';
import { QUALITY } from '../../lib/quality';
import { COLORS } from '../../theme';
import { CELL, EXTENT, LANDSCAPE_GLSL, type Landscape } from './landscape';

const INK = new Color(COLORS.ink);

const meshVertex = /* glsl */ `
${LANDSCAPE_GLSL}
varying vec3 vPos;

void main() {
  vec3 p = position;
  p.y = landscape(p.xz);
  vPos = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

// Líneas de la malla por celda (antialias con fwidth); los valles un poco más encendidos.
const meshFragment = /* glsl */ `
${LANDSCAPE_GLSL}
uniform vec3 uColor;
varying vec3 vPos;

void main() {
  vec2 c = vPos.xz / ${CELL.toFixed(4)};
  vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float valley = smoothstep(0.8, -1.8, vPos.y);
  float a = line * (0.16 + 0.22 * valley) * edgeFade(vPos.xz) * revealMask(vPos.xz) * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

const pointsVertex = /* glsl */ `
${LANDSCAPE_GLSL}
uniform float uPixelRatio;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.y = landscape(p.xz);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPixelRatio * 36.0 / -mv.z, 1.0, 4.5 * uPixelRatio);
  float valley = smoothstep(0.8, -1.8, p.y);
  float twinkle = 0.75 + 0.25 * sin(uTime * (0.8 + aSeed) + aSeed * 40.0);
  vAlpha = (0.3 + 0.6 * valley) * twinkle * edgeFade(p.xz) * revealMask(p.xz) * uOpacity;
}
`;

const pointsFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

/** Plano horizontal (xz) de la extensión del paisaje; la altura la pone el shader. */
function plane(segmentsX: number, segmentsZ: number): PlaneGeometry {
  const g = new PlaneGeometry(EXTENT.x * 2, EXTENT.z * 2, segmentsX, segmentsZ);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Malla + nube de puntos sobre el mismo f(x, z, t): dos draw calls. */
export function Surface({ landscape }: { landscape: Landscape }) {
  const quality = useWorld((s) => s.quality);
  const dpr = useThree((s) => s.viewport.dpr);
  const density = QUALITY[quality].density;

  const meshGeometry = useMemo(() => {
    const segments = Math.round(240 * Math.max(density, 0.45));
    return plane(segments, Math.round((segments * EXTENT.z) / EXTENT.x));
  }, [density]);

  const pointsGeometry = useMemo(() => {
    // Un punto en cada cruce de la malla y otro a media celda: ~6k en alta.
    const perAxis = Math.sqrt(density);
    const g = plane(Math.round(((EXTENT.x * 4) / CELL) * perAxis), Math.round(((EXTENT.z * 4) / CELL) * perAxis));
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    const seeds = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return g;
  }, [density]);

  useEffect(() => () => meshGeometry.dispose(), [meshGeometry]);
  useEffect(() => () => pointsGeometry.dispose(), [pointsGeometry]);

  // Los materiales se crean a mano: pasar `uniforms` como prop de JSX los copia, y los del paisaje
  // tienen que ser los mismos objetos que el acto actualiza cada frame.
  const meshMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: meshVertex,
        fragmentShader: meshFragment,
        uniforms: { ...landscape.uniforms, uColor: { value: INK } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [landscape],
  );
  const pointsMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: pointsVertex,
        fragmentShader: pointsFragment,
        uniforms: { ...landscape.uniforms, uColor: { value: INK }, uPixelRatio: { value: dpr } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [landscape, dpr],
  );
  useEffect(() => () => meshMaterial.dispose(), [meshMaterial]);
  useEffect(() => () => pointsMaterial.dispose(), [pointsMaterial]);

  return (
    <group>
      <mesh geometry={meshGeometry} material={meshMaterial} frustumCulled={false} />
      <points geometry={pointsGeometry} material={pointsMaterial} frustumCulled={false} />
    </group>
  );
}
