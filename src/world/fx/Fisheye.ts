import { Effect } from 'postprocessing';
import { Uniform } from 'three';

// Barril: el píxel a distancia r del centro muestrea más adentro, así el centro se abomba
// y los bordes se comprimen. Acompaña al FOV ancho de la construcción del muelle (path.ts, `fovAt`).
const fragmentShader = /* glsl */ `
uniform float strength;
uniform float aspect;

void mainUv(inout vec2 uv) {
  if (strength <= 0.0) return;
  vec2 d = uv - 0.5;
  d.x *= aspect;
  float r2 = dot(d, d);
  d *= 1.0 - strength * r2;
  d.x /= aspect;
  uv = 0.5 + d;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`;

/** Deforma el UV: como el lente, va en su propio EffectPass (Effects.tsx). */
export class FisheyeEffect extends Effect {
  constructor() {
    super('FisheyeEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['strength', new Uniform(0)],
        ['aspect', new Uniform(1)],
      ]),
    });
  }

  set(strength: number, aspect: number) {
    this.uniforms.get('strength')!.value = strength;
    this.uniforms.get('aspect')!.value = aspect;
  }
}
