import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useWorld } from '../store';
import { applyCityPalette } from '../acts/Act5City/palette';

/**
 * Solo en dev: expone escena, cámara, store y `advance` en `window.__world` para depurar desde la consola.
 * `__world.city.applyPalette('green')` (o `{ pulse: '#ff0' }`) cambia la paleta de la placa en vivo.
 */
export function DevProbe() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  // `advance(ms)` dibuja un frame a mano: sirve para depurar con la pestaña en segundo plano (sin rAF).
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    (window as unknown as { __world: unknown }).__world = { scene, camera, gl, advance, store: useWorld, city: { applyPalette: applyCityPalette } };
  }, [scene, camera, gl, advance]);
  return null;
}
