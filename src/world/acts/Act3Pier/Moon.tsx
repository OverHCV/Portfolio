import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, Color, type Group, type SpriteMaterial, Vector3 } from 'three';
import { getHaloTexture } from '../../lib/haloTexture';
import type { PierFrame } from './frame';

/** Luna baja sobre el horizonte, a la izquierda del faro: la única luz del mar. */
export const MOON_DIR = new Vector3(-0.42, 0.17, -1).normalize();
export const MOON_COLOR = new Color('#dfe6ff');
const DISTANCE = 300;

/** Disco con el borde apenas difuso (se crea una vez). */
function discTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/** Luna (disco + halo) que va con la cámara, y las luces de la escena: la luna y un cielo tenue. */
export function Moon({ frame }: { frame: PierFrame }) {
  const group = useRef<Group>(null);
  const disc = useRef<SpriteMaterial>(null);
  const halo = useRef<SpriteMaterial>(null);
  const discMap = useMemo(discTexture, []);
  useEffect(() => () => discMap.dispose(), [discMap]);
  const haloMap = useMemo(getHaloTexture, []);
  const lightPosition = useMemo(() => MOON_DIR.clone().multiplyScalar(100), []);
  // Por encima de 1 para que el bloom la recoja.
  const discColor = useMemo(() => MOON_COLOR.clone().multiplyScalar(2.2), []);

  useFrame(({ camera }) => {
    group.current?.position.copy(camera.position).addScaledVector(MOON_DIR, DISTANCE);
    if (disc.current) disc.current.opacity = frame.sea;
    if (halo.current) halo.current.opacity = 0.35 * frame.sea;
  });

  return (
    <>
      <group ref={group}>
        <sprite scale={9}>
          <spriteMaterial ref={disc} map={discMap} color={discColor} transparent depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
        <sprite scale={70}>
          <spriteMaterial ref={halo} map={haloMap} color={MOON_COLOR} transparent blending={AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
      </group>
      <directionalLight position={lightPosition} color="#9fb4ff" intensity={0.45} />
      <hemisphereLight args={['#1a2438', '#020409', 0.35]} />
    </>
  );
}
