/**
 * Shaders de blackhole-ts (Roberto Marchetti, MIT — ver ./LICENSE),
 * https://github.com/rmarchet/blackhole-ts @ ddc1cd9. Copiados sin cambios salvo lo marcado `[portfolio]`
 * (utils.glsl: coordenada de pantalla; jet.glsl: variable sin inicializar).
 * Ray marching de geodésicas (Schwarzschild/Kerr) en unidades donde el horizonte mide 1.
 */
import definitions from './glsl/definitions.glsl?raw';
import utils from './glsl/utils.glsl?raw';
import kerr from './glsl/kerr.glsl?raw';
import temperature from './glsl/temperature.glsl?raw';
import bloom from './glsl/bloom.glsl?raw';
import glow from './glsl/glow.glsl?raw';
import background from './glsl/background.glsl?raw';
import jet from './glsl/jet.glsl?raw';
import disk from './glsl/disk.glsl?raw';
import main from './glsl/main.glsl?raw';

/** Pasos de integración: el original usa 350 × 0.08 (alta) y 140 × 0.12 (baja). */
const STEPS = 200;
const STEP_SIZE = 0.1;

export const fragmentShader = [
  `#define STEP ${STEP_SIZE}`,
  `#define NSTEPS ${STEPS}`,
  definitions,
  utils,
  kerr,
  temperature,
  bloom,
  glow,
  background,
  jet,
  disk,
  main,
].join('\n');

// Quad a pantalla completa; vScreen (-1..1) reemplaza a gl_FragCoord / resolution en utils.glsl.
export const vertexShader = /* glsl */ `
varying vec2 vScreen;
void main() {
  vScreen = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
