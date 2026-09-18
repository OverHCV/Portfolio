import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { AdditiveBlending, type ShaderMaterial } from 'three';
import { HORIZON_RADIUS } from './constants';
import { NOISE_GLSL, vertexShader } from './AccretionDisk';

const INNER = HORIZON_RADIUS * 1.02;
const OUTER = HORIZON_RADIUS * 1.75;

// La parte trasera del disco, cuya luz se curva alrededor del agujero: en pantalla es un anillo
// que abraza la sombra, grueso por arriba y fino por abajo (el disco está casi de canto).
// La escena 3D no puede dibujarla porque la esfera la tapa; por eso es un billboard aparte.
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uHot;
uniform vec3 uWarm;
varying vec2 vPos;

${NOISE_GLSL}

void main() {
  float r = length(vPos);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float angle = atan(vPos.y, vPos.x);
  float up = sin(angle);

  // Espesor aparente según el ángulo: arco ancho arriba, hilo fino abajo, casi nada a los lados.
  float reach = mix(0.18, 1.0, smoothstep(-0.2, 0.9, up)) * (0.35 + 0.65 * abs(up));
  float profile = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.0, reach, t));

  float n = fbm(vec2(angle * 3.0 - uTime * 0.25, t * 6.0));
  vec3 color = mix(uWarm, uHot, pow(1.0 - t, 2.0));
  float intensity = profile * (0.55 + 0.8 * n) * 1.6;
  gl_FragColor = vec4(color * intensity, 1.0);
}
`;

export function LensedHalo() {
  const material = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <Billboard>
      {/* Un poco por detrás del centro para que el disco frontal quede por delante. */}
      <mesh position={[0, 0, -0.05]} renderOrder={0}>
        <ringGeometry args={[INNER, OUTER, 192, 8]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uInner: { value: INNER },
            uOuter: { value: OUTER },
            uHot: { value: [1.9, 1.7, 1.4] },
            uWarm: { value: [1.2, 0.72, 0.32] },
          }}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}
