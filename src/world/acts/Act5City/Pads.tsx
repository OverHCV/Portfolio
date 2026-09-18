import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, type InstancedMesh } from 'three';
import { cityPalette } from './palette';
import { CITY_FRAGMENT, CITY_VERTEX } from './glsl';
import type { Pad } from './board';
import type { CityFrame } from './frame';

const vertexShader = /* glsl */ `
${CITY_VERTEX}
attribute float aShape;
varying vec2 vUv;
varying float vShape;
varying float vReveal;

void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vReveal = riseAt(origin.xz);
  vUv = uv;
  vShape = aShape;
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;
}
`;

const fragmentShader = /* glsl */ `
${CITY_FRAGMENT}
uniform vec3 uPad;
uniform vec3 uDrill;
varying vec2 vUv;
varying float vShape;
varying float vReveal;

void main() {
  if (vReveal <= 0.0) discard;
  vec2 p = vUv * 2.0 - 1.0;
  vec2 fw = fwidth(p);
  float alpha;
  vec3 color = uPad * (0.88 + 0.16 * (p.x - p.y) * 0.5);
  if (vShape < 0.5) {
    float d = length(p);
    alpha = 1.0 - smoothstep(1.0 - fw.x * 1.5, 1.0, d);
  } else if (vShape < 1.5) {
    // Vía: anillo de cobre con el taladro oscuro al centro.
    float d = length(p);
    alpha = 1.0 - smoothstep(1.0 - fw.x * 1.5, 1.0, d);
    color = mix(uDrill, color, smoothstep(0.42, 0.42 + fw.x * 1.5, d));
  } else {
    vec2 q = abs(p);
    alpha = (1.0 - smoothstep(1.0 - fw.x * 1.5, 1.0, q.x)) * (1.0 - smoothstep(1.0 - fw.y * 1.5, 1.0, q.y));
  }
  gl_FragColor = vec4(applyFog(color), alpha * vReveal);
  #include <colorspace_fragment>
}
`;

/** Pads, vías y agujeros en un draw call: un quad plano por pieza, la forma sale del shader. */
export function Pads({ pads, frame }: { pads: Pad[]; frame: CityFrame }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    g.setAttribute('aShape', new InstancedBufferAttribute(Float32Array.from(pads, (p) => p.shape), 1));
    return g;
  }, [pads]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { ...frame.uniforms, uPad: { value: cityPalette.colors.pad }, uDrill: { value: cityPalette.colors.drill } },
        transparent: true,
        depthWrite: false,
      }),
    [frame],
  );

  useLayoutEffect(() => {
    const m = new Matrix4();
    pads.forEach((p, i) => {
      m.makeScale(p.w, 1, p.h).setPosition(p.x, 0.05, p.z);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [pads]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <instancedMesh ref={mesh} args={[geometry, material, pads.length]} renderOrder={3} frustumCulled={false} />;
}
