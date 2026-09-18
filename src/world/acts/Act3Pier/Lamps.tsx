import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  type PointLight,
  SphereGeometry,
} from 'three';
import { COLORS } from '../../theme';
import { LAMP_HEIGHT, LAMPS, PIER } from './layout';
import { setBuildOrder, withBuild } from './build';
import { nearestLamps, type PierFrame } from './frame';

/** Luces reales: solo en los faroles más cercanos; el resto es emisivo + bloom (ARCHITECTURE.md §12). */
const REAL_LIGHTS = 2;
const WARM = new Color(COLORS.glow);
const zs = LAMPS.map((l) => l.z);

/** Postes, sombreretes y bulbos instanciados; los bulbos se encienden según `frame.lampGlow`. */
export function Lamps({ frame }: { frame: PierFrame }) {
  const posts = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const bulbs = useRef<InstancedMesh>(null);
  const lights = useRef<(PointLight | null)[]>([]);
  const shown = useRef(new Float32Array(LAMPS.length).fill(-1));
  const nearest = useMemo<number[]>(() => [], []);
  const color = useMemo(() => new Color(), []);

  const { geometries, materials } = useMemo(() => {
    const geometries = {
      post: new CylinderGeometry(0.035, 0.05, LAMP_HEIGHT + 0.1, 8),
      cap: new ConeGeometry(0.16, 0.14, 8),
      bulb: new SphereGeometry(0.085, 16, 12),
    };
    for (const g of Object.values(geometries)) setBuildOrder(g, zs);
    const materials = {
      metal: withBuild(new MeshStandardMaterial({ color: '#15171b', roughness: 0.6, metalness: 0.4 }), frame.build),
      // Blanco: el color lo pone cada instancia (por encima de 1 para el bloom).
      bulb: withBuild(new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), frame.build),
    };
    return { geometries, materials };
  }, [frame.build]);
  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometries, materials],
  );

  useLayoutEffect(() => {
    const dummy = new Object3D();
    LAMPS.forEach(({ x, z }, i) => {
      const place = (mesh: InstancedMesh | null, y: number) => {
        if (!mesh) return;
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      };
      place(posts.current, PIER.deck + (LAMP_HEIGHT + 0.1) / 2);
      place(caps.current, PIER.deck + LAMP_HEIGHT + 0.14);
      place(bulbs.current, PIER.deck + LAMP_HEIGHT);
      bulbs.current?.setColorAt(i, color.setScalar(0));
    });
    for (const mesh of [posts.current, caps.current, bulbs.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [color]);

  useFrame(() => {
    const mesh = bulbs.current;
    if (mesh) {
      let dirty = false;
      for (let i = 0; i < LAMPS.length; i++) {
        const glow = frame.lampGlow[i];
        if (Math.abs(shown.current[i] - glow) < 0.004) continue;
        shown.current[i] = glow;
        mesh.setColorAt(i, color.copy(WARM).multiplyScalar(0.12 + 3.4 * glow));
        dirty = true;
      }
      if (dirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    nearestLamps(frame, REAL_LIGHTS, nearest);
    for (let k = 0; k < REAL_LIGHTS; k++) {
      const light = lights.current[k];
      if (!light) continue;
      const i = nearest[k];
      if (i === undefined) {
        light.intensity = 0;
        continue;
      }
      light.position.set(LAMPS[i].x, PIER.deck + LAMP_HEIGHT - 0.05, LAMPS[i].z);
      light.intensity = 7 * frame.lampGlow[i];
    }
  });

  return (
    <group>
      <instancedMesh ref={posts} args={[geometries.post, materials.metal, LAMPS.length]} frustumCulled={false} />
      <instancedMesh ref={caps} args={[geometries.cap, materials.metal, LAMPS.length]} frustumCulled={false} />
      <instancedMesh ref={bulbs} args={[geometries.bulb, materials.bulb, LAMPS.length]} frustumCulled={false} />
      {Array.from({ length: REAL_LIGHTS }, (_, k) => (
        <pointLight
          key={k}
          ref={(l) => {
            lights.current[k] = l;
          }}
          color={COLORS.glow}
          intensity={0}
          distance={11}
          decay={2}
        />
      ))}
    </group>
  );
}
