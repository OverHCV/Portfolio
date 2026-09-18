import { AdditiveBlending, type Color, DoubleSide, ShaderMaterial } from 'three';

// Haz: cono abierto que nace en la fuente (el vértice, uv.y = 1) y se apaga hacia la boca.
// Volumétrico barato: más luz donde el cono se ve de frente (más grosor), nada en sus bordes.
const vertexShader = /* glsl */ `
varying float vAlong;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vAlong = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFalloff;
varying float vAlong;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float thickness = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.5);
  // pow() con base negativa da NaN, y el bloom lo esparce por toda la pantalla: la interpolación
  // puede dejar vAlong apenas bajo 0 en la boca del cono.
  float along = pow(clamp(vAlong, 0.0, 1.0), uFalloff);
  gl_FragColor = vec4(uColor * along * thickness * uIntensity, 1.0);
}
`;

/**
 * Material del haz de luz (faro del Acto 3, foco del Acto 4) para un `ConeGeometry` abierto.
 * `uIntensity` se anima desde fuera; `falloff` controla cuán rápido se apaga hacia la boca.
 */
export function createBeamMaterial(color: Color, falloff = 3): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uColor: { value: color }, uIntensity: { value: 0 }, uFalloff: { value: falloff } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
}
