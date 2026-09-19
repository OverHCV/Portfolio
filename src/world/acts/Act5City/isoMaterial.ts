import { ShaderMaterial } from 'three';
import { cityPalette, ROLE, ROLE_KEYS, roleColors } from './palette';
import { CITY_FRAGMENT, CITY_VERTEX } from './glsl';
import type { CityFrame } from './frame';

const vertexShader = /* glsl */ `
${CITY_VERTEX}
uniform vec3 uRoleColor[${ROLE_KEYS.length}];
uniform vec3 uShade;
#ifdef USE_INSTANCING
attribute float aRole;
attribute float aOwner;
#else
uniform float uRole;
uniform float uOwner;
#endif
varying vec3 vColor;
varying float vShade;
varying float vGlow;
varying float vLed;
varying vec2 vUv;

void main() {
#ifdef USE_INSTANCING
  float role = aRole;
  float owner = aOwner;
  mat4 local = modelMatrix * instanceMatrix;
#else
  float role = uRole;
  float owner = uOwner;
  mat4 local = modelMatrix;
#endif
  vec3 origin = (local * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float rise = riseAt(origin.xz);
  vec4 world = local * vec4(position, 1.0);
  // Al encenderse, cada pieza sube desde la placa (y = 0 del acto).
  world.y = world.y * rise + ownerLift(owner) * rise;
  vec4 mv = viewMatrix * world;
  gl_Position = rise <= 0.001 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * mv;
  vDepth = -mv.z;

  // Sombreado isométrico plano: un tono por orientación de cara, sin luces.
  vec3 n = normalize(mat3(local) * normal);
  vec3 n2 = n * n;
  vShade = n2.y * (n.y > 0.0 ? uShade.x : 0.2) + n2.x * (n.x > 0.0 ? uShade.y : 0.25) + n2.z * (n.z > 0.0 ? uShade.z : 0.25);
  int r = int(role + 0.5);
  vColor = uRoleColor[r];
  vLed = r == ${ROLE.led} ? 1.0 : 0.0;
  vGlow = ownerGlow(owner);
  vUv = uv;
}
`;

const fragmentShader = /* glsl */ `
${CITY_FRAGMENT}
uniform float uLed;
uniform vec3 uAccent;
varying vec3 vColor;
varying float vShade;
varying float vGlow;
varying float vLed;
varying vec2 vUv;

void main() {
  vec3 color = vColor * vShade;
#ifdef FACE_EDGES
  // Filo claro en el borde de cada cara, de ancho constante en pantalla: trazo de ilustración.
  vec2 e = min(vUv, 1.0 - vUv);
  vec2 w = fwidth(vUv);
  float edge = 1.0 - min(smoothstep(w.x * 0.6, w.x * 1.6, e.x), smoothstep(w.y * 0.6, w.y * 1.6, e.y));
  color += (vColor * 0.5 + 0.025) * edge;
  // En hover y foco el filo se enciende con el acento (por encima de 1: lo toma el bloom).
  color += uAccent * edge * smoothstep(0.5, 0.8, vGlow) * 2.5;
#endif
  color *= 1.0 + vGlow * 0.35;
  // Los LEDs emiten: por encima de 1 para que los tome el bloom.
  if (vLed > 0.5) color = vColor * (uLed + vGlow * 3.0);
  gl_FragColor = vec4(applyFog(color), 1.0);
  #include <colorspace_fragment>
}
`;

interface IsoOptions {
  /** Filo en los bordes de cada cara (cajas; en cilindros marcaría la costura). */
  edges?: boolean;
  /** Papel y dueño fijos para una malla sin instancias (el buzón). */
  role?: number;
  owner?: number;
}

/**
 * Material de todas las piezas 3D de la placa: color por papel desde la paleta viva, tres tonos
 * por cara (arriba, +x, +z) y los uniforms del frame (encendido, alzado, brillo, niebla).
 */
export function createIsoMaterial(frame: CityFrame, { edges = false, role, owner = -1 }: IsoOptions = {}) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    defines: edges ? { FACE_EDGES: '' } : {},
    uniforms: {
      ...frame.uniforms,
      uRoleColor: { value: roleColors },
      uShade: { value: cityPalette.shade },
      uRole: { value: role ?? 0 },
      uOwner: { value: owner },
    },
  });
}
