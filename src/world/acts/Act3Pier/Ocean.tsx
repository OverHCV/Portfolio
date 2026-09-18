import { useFrame, useLoader } from '@react-three/fiber';
import { Color, PlaneGeometry, RepeatWrapping, type Texture, TextureLoader, type Vector3 } from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { useWorld } from '../../store';
import { MOON_COLOR, MOON_DIR } from './Moon';
import type { PierFrame } from './frame';

const NORMALS_URL = '/textures/water/waternormals.jpg';
/** Escala del rizo: la textura se repite cada ~100 / SIZE unidades. */
const SIZE = 7;
const DISTORTION = 3.7;
/** Velocidad de la animación de las normales respecto a `frame.time`. */
const FLOW = 0.5;

let water: Water | null = null;

/**
 * El `Water` de three.js (el mismo que envuelve react-three-ocean): reflejo planar real de la escena
 * + normales animadas en cuatro capas, que dan los rizos finos. Una sola instancia por página:
 * Water no expone su render target para liberarlo, así que se reutiliza al volver al acto.
 */
function getWater(normals: Texture, highQuality: boolean): Water {
  if (water) return water;
  normals.wrapS = normals.wrapT = RepeatWrapping;
  const size = highQuality ? 512 : 256;
  water = new Water(new PlaneGeometry(1000, 1000), {
    textureWidth: size,
    textureHeight: size,
    waterNormals: normals,
    // La luna hace el papel del sol: su estela en el agua.
    sunDirection: MOON_DIR.clone(),
    sunColor: MOON_COLOR.clone(),
    waterColor: new Color('#01050b'),
    distortionScale: DISTORTION,
    fog: true,
    alpha: 0,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.transparent = true;
  water.material.uniforms.size.value = SIZE;
  water.frustumCulled = false;
  // Después de las estrellas (−2): las cubre por alfa mientras aparece.
  water.renderOrder = -1;
  return water;
}

/**
 * Mar nocturno bajo la luna. Sigue a la cámara en xz (las normales se muestrean en coordenadas
 * de mundo, así que no se deslizan). Sin mar visible no se hace el render espejo.
 */
export function Ocean({ frame, anchor }: { frame: PierFrame; anchor: Vector3 }) {
  const normals = useLoader(TextureLoader, NORMALS_URL);
  const quality = useWorld((s) => s.quality);
  const mesh = getWater(normals, quality === 'high');

  useFrame(({ camera }) => {
    const u = mesh.material.uniforms;
    u.time.value = frame.time * FLOW;
    u.alpha.value = frame.sea;
    mesh.visible = frame.sea > 0.001;
    // Mientras aparece, sin profundidad: no tapa el paisaje del Acto 2, que está casi a la misma altura.
    mesh.material.depthWrite = frame.sea > 0.999;
    mesh.position.set(camera.position.x, anchor.y, camera.position.z);
  });

  return <primitive object={mesh} dispose={null} />;
}
