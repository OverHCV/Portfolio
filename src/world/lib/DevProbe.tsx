import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useWorld } from '../store';

/** Solo en dev: expone escena, cámara y store en `window.__world` para depurar desde la consola. */
export function DevProbe() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    (window as unknown as { __world: unknown }).__world = { scene, camera, gl, store: useWorld };
  }, [scene, camera, gl]);
  return null;
}
