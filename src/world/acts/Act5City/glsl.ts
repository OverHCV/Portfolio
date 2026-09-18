import { CITY_SLOTS } from './layout';

/**
 * GLSL compartido por los materiales del Acto 5: encendido por distancia, alzado/brillo por
 * proyecto y niebla propia (los materiales de la placa no usan la niebla de la escena).
 */
export const CITY_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uBoot;
uniform vec2 uBootOrigin;
uniform float uBootRadius;
uniform float uLift[${CITY_SLOTS}];
uniform float uGlow[${CITY_SLOTS}];
varying float vDepth;

// 0 aún apagado … 1 encendido, según la distancia (en el mundo) al origen del encendido.
float riseAt(vec2 p) {
  return clamp((uBoot * uBootRadius - length(p - uBootOrigin)) / 5.0, 0.0, 1.0);
}
float ownerLift(float owner) {
  return owner < -0.5 ? 0.0 : uLift[int(owner + 0.5)];
}
float ownerGlow(float owner) {
  return owner < -0.5 ? 0.0 : uGlow[int(owner + 0.5)];
}
`;

export const CITY_FRAGMENT = /* glsl */ `
uniform vec2 uFog;
uniform vec3 uFogColor;
varying float vDepth;

vec3 applyFog(vec3 color) {
  return mix(color, uFogColor, smoothstep(uFog.x, uFog.y, vDepth));
}
`;
