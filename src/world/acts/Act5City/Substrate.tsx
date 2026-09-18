import { useEffect, useMemo } from 'react';
import { BoxGeometry, PlaneGeometry, ShaderMaterial } from 'three';
import { HALF } from './layout';
import { cityPalette, ROLE } from './palette';
import { CITY_FRAGMENT, CITY_VERTEX } from './glsl';
import { createIsoMaterial } from './isoMaterial';
import type { CityFrame } from './frame';

const vertexShader = /* glsl */ `
${CITY_VERTEX}
varying vec2 vXZ;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vXZ = position.xz;
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;
}
`;

const fragmentShader = /* glsl */ `
${CITY_FRAGMENT}
uniform vec3 uMask;
uniform float uHalf;
varying vec2 vXZ;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // Máscara mate: una variación muy leve de grano y el borde un poco más claro, donde la
  // máscara es más delgada.
  float grain = hash(floor(vXZ * 6.0)) * 0.04;
  float edge = 1.0 - smoothstep(0.0, 1.2, uHalf - max(abs(vXZ.x), abs(vXZ.y)));
  vec3 color = uMask * (0.97 + grain) + uMask * edge * 0.6;
  gl_FragColor = vec4(applyFog(color), 1.0);
  #include <colorspace_fragment>
}
`;

/** Espesor del sustrato: el canto se ve en las esquinas cercanas de la placa. */
const THICKNESS = 0.7;

/** La placa: máscara de soldadura arriba y el canto de FR4 alrededor. */
export function Substrate({ frame }: { frame: CityFrame }) {
  const top = useMemo(() => new PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2), []);
  const slab = useMemo(() => new BoxGeometry(HALF * 2, THICKNESS, HALF * 2).translate(0, -THICKNESS / 2 - 0.02, 0), []);
  const topMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { ...frame.uniforms, uMask: { value: cityPalette.colors.mask }, uHalf: { value: HALF } },
      }),
    [frame],
  );
  const slabMaterial = useMemo(() => createIsoMaterial(frame, { edges: true, role: ROLE.edge }), [frame]);
  useEffect(
    () => () => {
      [top, slab, topMaterial, slabMaterial].forEach((x) => x.dispose());
    },
    [top, slab, topMaterial, slabMaterial],
  );

  return (
    <group>
      <mesh geometry={top} material={topMaterial} />
      <mesh geometry={slab} material={slabMaterial} />
    </group>
  );
}
