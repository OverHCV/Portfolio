import { DoubleSide, PlaneGeometry, ShaderMaterial, type Texture, Vector2 } from 'three';
import { PAGE } from '../layout';

/**
 * Una hoja del álbum: plano subdividido con el lomo en x = 0, que se dobla en el vertex shader.
 *
 * La hoja gira alrededor del lomo un ángulo `uTurn` (0 = sobre la pila derecha, π = sobre la izquierda).
 * A mitad de vuelta no es rígida: el ángulo crece hacia el borde libre (`uCurl`, rizo) y la altura
 * por la que se tomó (`uGrab`, 0 = abajo, 1 = arriba) va por delante (`uPeel`), como al pasar una
 * hoja desde la esquina. Ambos se anulan en 0 y π (∝ sin uTurn), así la hoja queda plana en reposo.
 *
 * La posición se integra a lo largo de la hoja (su largo se conserva al curvarse): cada tramo avanza
 * en la dirección de su ángulo. Frente = recto (uFront); reverso = verso de la página siguiente (uBack).
 */
const vertexShader = /* glsl */ `
uniform float uTurn;
uniform float uCurl;
uniform float uPeel;
uniform float uGrab;
uniform float uLift;
uniform vec2 uSize;
varying vec2 vUv;
varying vec3 vNormal;

const int STEPS = 24;
const float PI = 3.14159265;

float angleAt(float u, float v) {
  float bend = sin(uTurn);
  float lead = 1.0 - abs(v - uGrab);
  return clamp(uTurn + bend * (uCurl * u * u + uPeel * (lead - 0.5) * u), 0.0, PI);
}

void main() {
  vUv = uv;
  float ds = position.x / float(STEPS);
  vec2 p = vec2(0.0);
  float a = angleAt(0.0, uv.y);
  for (int i = 0; i < STEPS; i++) {
    a = angleAt((float(i) + 0.5) * ds / uSize.x, uv.y);
    p += vec2(cos(a), sin(a)) * ds;
  }
  // Un leve abombado junto al lomo, como un libro que no abre del todo plano.
  float swell = 0.006 * smoothstep(0.0, 0.25, uv.x) * (1.0 - smoothstep(0.25, 1.0, uv.x));
  vec3 pos = vec3(p.x, position.y, p.y + uLift + swell);
  vNormal = normalize(normalMatrix * vec3(-sin(a), 0.0, cos(a)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform float uLight;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 color = gl_FrontFacing ? texture2D(uFront, vUv).rgb : texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)).rgb;
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  // Luz del foco, desde arriba y un poco de frente (espacio de vista).
  float diffuse = 0.62 + 0.38 * max(dot(n, normalize(vec3(0.15, 0.55, 0.82))), 0.0);
  // Sombra del canal junto al lomo.
  float gutter = mix(0.7, 1.0, smoothstep(0.0, 0.09, vUv.x));
  gl_FragColor = vec4(color * diffuse * gutter * uLight, 1.0);
  #include <colorspace_fragment>
}
`;

/** Geometría compartida por todas las hojas: x ∈ [0, W] desde el lomo, y ∈ [0, H] desde abajo. */
export function createPageGeometry(): PlaneGeometry {
  const g = new PlaneGeometry(PAGE.width, PAGE.height, 36, 10);
  g.translate(PAGE.width / 2, PAGE.height / 2, 0);
  return g;
}

export interface PageUniforms {
  uTurn: { value: number };
  uCurl: { value: number };
  uPeel: { value: number };
  uGrab: { value: number };
  uLift: { value: number };
  uFront: { value: Texture | null };
  uBack: { value: Texture | null };
}

export function createPageMaterial(): ShaderMaterial & { uniforms: PageUniforms } {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    uniforms: {
      uTurn: { value: 0 },
      uCurl: { value: 0.6 },
      uPeel: { value: 0.3 },
      uGrab: { value: 0.1 },
      uLift: { value: 0 },
      uSize: { value: new Vector2(PAGE.width, PAGE.height) },
      uFront: { value: null },
      uBack: { value: null },
      uLight: { value: 1.25 },
    },
  }) as ShaderMaterial & { uniforms: PageUniforms };
}
