import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

// Lente "barata": desvía el muestreo hacia el centro con una caída 1/r, que es suficiente
// para que el fondo y el disco se curven alrededor del horizonte de eventos.
const fragmentShader = /* glsl */ `
uniform vec2 center;
uniform float radius;
uniform float strength;
uniform float aspect;

void mainUv(inout vec2 uv) {
  if (strength <= 0.0) return;
  vec2 d = uv - center;
  d.x *= aspect;
  float r = length(d);
  // Ángulo de desviación ~ θE² / r: el píxel en r muestra lo que en realidad está en r - α.
  float alpha = strength * radius * radius / max(r, 1e-4);
  alpha *= 1.0 - smoothstep(radius * 3.0, radius * 7.0, r);
  float source = r - alpha;
  // Si el rayo "cae" dentro del horizonte, es sombra: se muestrea el centro (negro).
  if (source < radius) {
    uv = center;
    return;
  }
  vec2 offset = (d / r) * alpha;
  offset.x /= aspect;
  uv -= offset;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`;

/**
 * Modifica el UV, así que no puede compartir pass con convoluciones (bloom):
 * Effects.tsx lo monta en su propio EffectPass.
 */
export class GravitationalLensEffect extends Effect {
  constructor() {
    super('GravitationalLensEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['center', new Uniform(new Vector2(0.5, 0.5))],
        ['radius', new Uniform(0)],
        ['strength', new Uniform(0)],
        ['aspect', new Uniform(1)],
      ]),
    });
  }

  set(center: Vector2, radius: number, strength: number, aspect: number) {
    (this.uniforms.get('center')!.value as Vector2).copy(center);
    this.uniforms.get('radius')!.value = radius;
    this.uniforms.get('strength')!.value = strength;
    this.uniforms.get('aspect')!.value = aspect;
  }
}
