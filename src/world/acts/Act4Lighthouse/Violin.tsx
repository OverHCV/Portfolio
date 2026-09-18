import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { type Mesh, MeshStandardMaterial, type Texture } from 'three';
import { VIOLIN } from './layout';
import { DRACO, MODELS } from './models';

/** Materiales del sitio por nombre de material del .blend original (scripts/models/violin.py). */
const FINISHES: Record<string, { color: string; roughness: number; metalness?: number }> = {
  wood: { color: '#6e2d10', roughness: 0.32 },
  'piano.009': { color: '#5c250c', roughness: 0.34 },
  wood5: { color: '#3d1a0a', roughness: 0.4 },
  wood2: { color: '#c7a077', roughness: 0.7 },
  black: { color: '#0a0a0a', roughness: 0.3 },
  gold: { color: '#b8923a', roughness: 0.3, metalness: 0.85 },
};

/** El violín (Blend Swap #92873, CC0), recostado sobre el banco del pianista. */
export function Violin({ envMap }: { envMap: Texture }) {
  const { scene } = useGLTF(MODELS.violin, DRACO);
  const materials = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(FINISHES).map(([name, f]) => [name, new MeshStandardMaterial({ ...f, envMap, envMapIntensity: 0.6 })]),
      ),
    [envMap],
  );
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const name = Array.isArray(mesh.material) ? '' : mesh.material.name;
      mesh.material = materials[name] ?? materials.wood;
    });
    return () => Object.values(materials).forEach((m) => m.dispose());
  }, [scene, materials]);

  return <primitive object={scene} position={VIOLIN.position} rotation={[0, VIOLIN.yaw, 0]} />;
}

useGLTF.preload(MODELS.violin, DRACO);
