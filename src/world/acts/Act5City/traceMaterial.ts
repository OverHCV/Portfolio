import { DoubleSide, ShaderMaterial } from 'three';
import { cityPalette } from './palette';
import { CITY_FRAGMENT, CITY_VERTEX } from './glsl';
import type { CityFrame } from './frame';

const vertexShader = /* glsl */ `
${CITY_VERTEX}
attribute float aArc;
attribute float aArc0;
attribute float aAcross;
attribute vec2 aProj;
attribute float aLayer;
attribute float aSeed;
varying float vArc;
varying float vAcross;
varying float vLayer;
varying float vSeed;
varying float vStreet;
varying float vGlow;
varying float vReveal;
varying float vFront;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float d = length(world.xz - uBootOrigin);
  float front = uBoot * uBootRadius;
  vReveal = clamp((front - d) / 1.5, 0.0, 1.0);
  // Frente de encendido: una franja brillante que avanza por las pistas.
  vFront = uBoot < 0.999 ? 1.0 - smoothstep(0.0, 3.5, abs(front - d)) : 0.0;
  vStreet = aProj.x > -0.5 ? 1.0 : 0.0;
  vGlow = vStreet > 0.5 ? max(ownerGlow(aProj.x), ownerGlow(aProj.y)) : 0.0;
  vArc = aArc + aArc0;
  vAcross = aAcross;
  vLayer = aLayer;
  vSeed = aSeed;
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;
}
`;

const fragmentShader = /* glsl */ `
${CITY_FRAGMENT}
uniform float uTime;
uniform vec3 uCopper;
uniform vec3 uCopperDim;
uniform vec3 uPulse;
varying float vArc;
varying float vAcross;
varying float vLayer;
varying float vSeed;
varying float vStreet;
varying float vGlow;
varying float vReveal;
varying float vFront;

void main() {
  if (vReveal <= 0.0) discard;
  float aa = 1.0 - smoothstep(1.0 - fwidth(vAcross) * 1.5, 1.0, abs(vAcross));

  vec3 base = mix(uCopper, uCopperDim, vLayer);
  // Las calles (conexiones entre proyectos) se ven más vivas que el relleno, y más con el foco.
  base = mix(base, uPulse * 0.6, vStreet * (0.35 + 0.5 * vGlow) * (1.0 - vLayer * 0.6));

  // Pulsos de energía: una cabeza brillante con estela que avanza por la pista.
  float speed = mix(1.2, 3.4 + vGlow * 2.0, vStreet);
  float spacing = mix(28.0, 7.0, vStreet);
  float ph = fract((vArc - uTime * speed) / spacing + vSeed);
  float head = pow(ph, mix(22.0, 9.0, vStreet)) * (1.0 - smoothstep(0.985, 1.0, ph));
  // Solo algunas pistas del relleno llevan pulso: se nota que todo está conectado sin ser ruido.
  float live = vStreet > 0.5 ? 1.0 : step(0.74, vSeed);
  float pulse = head * live * mix(0.8, 2.4 + vGlow * 3.0, vStreet) * (1.0 - vLayer * 0.7);

  vec3 color = base + uPulse * (pulse + vFront * 1.8);
  gl_FragColor = vec4(applyFog(color), aa * vReveal);
  #include <colorspace_fragment>
}
`;

/** Pistas de cobre (relleno y calles) con pulsos, encendido y foco por proyecto. */
export function createTraceMaterial(frame: CityFrame) {
  const { colors } = cityPalette;
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      ...frame.uniforms,
      uCopper: { value: colors.copper },
      uCopperDim: { value: colors.copperDim },
      uPulse: { value: colors.pulse },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}
