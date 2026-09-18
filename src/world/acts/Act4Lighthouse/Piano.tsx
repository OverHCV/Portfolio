import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { type BufferGeometry, type Mesh, MeshStandardMaterial, type Texture } from 'three';
import { DRACO, MODELS } from './models';

/**
 * Piano de cola (Printables #1287354, CC-BY 4.0). El STL no trae materiales: se pinta con laca negra
 * propia. Sus teclas son un relieve fijo; encima van las 88 teclas tocables (Keys.tsx).
 */
export function Piano({ envMap }: { envMap: Texture }) {
  const { scene } = useGLTF(MODELS.piano, DRACO);
  const geometry = useMemo(() => {
    let found: BufferGeometry | null = null;
    scene.traverse((o) => {
      if (!found && (o as Mesh).isMesh) found = (o as Mesh).geometry;
    });
    return found!;
  }, [scene]);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.24, metalness: 0.05, envMap, envMapIntensity: 0.45 }),
    [envMap],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} />;
}

useGLTF.preload(MODELS.piano, DRACO);
