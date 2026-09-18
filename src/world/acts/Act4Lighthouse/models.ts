import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator, type Texture } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** Modelos del acto (scripts/models/*.py) y el decoder Draco, servidos desde public/ (sin CDN). */
export const MODELS = {
  piano: `${BASE}models/piano.glb`,
  violin: `${BASE}models/violin.glb`,
} as const;
export const DRACO = `${BASE}draco/`;

/**
 * Reflejo suave para la laca del piano y el barniz del violín: un estudio genérico prefiltrado una
 * sola vez. No ilumina (el foco es la única luz), solo da brillo a las superficies pulidas.
 */
export function useStudioEnv(): Texture {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return env;
}
