import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, type Group, type MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { COLORS } from '../../theme';
import { createBeamMaterial } from '../../lib/beamMaterial';
import { getHaloTexture } from '../../lib/haloTexture';
import { LIGHTHOUSE, PIER } from './layout';
import type { PierFrame } from './frame';

const TOWER = { top: 1.55, bottom: LIGHTHOUSE.radius, height: 12.5 };
const LANTERN_Y = PIER.deck + TOWER.height + 0.95;
const BEAM_LENGTH = 48;
const WARM = new Color(COLORS.glow);
const DOOR = { width: 1.1, height: 2.1 } as const;
/** Cuánto gira cada hoja al abrirse del todo (rad), hacia el muelle. */
const DOOR_SWING = 1.75;

/**
 * El faro al final del muelle: base de roca, torre, linterna cálida con un haz que gira despacio y la
 * puerta que lleva al Acto 4. Sale del mar al empezar la construcción (`frame.lighthouse`); al final
 * del recorrido la puerta se abre hacia el muelle y deja salir la luz del interior (`frame.door`).
 */
export function Lighthouse({ frame }: { frame: PierFrame }) {
  const root = useRef<Group>(null);
  const beams = useRef<Group>(null);
  const lantern = useRef<MeshBasicMaterial>(null);
  const doorway = useRef<MeshBasicMaterial>(null);
  const spill = useRef<MeshBasicMaterial>(null);
  const leaves = useRef<(Group | null)[]>([]);

  const beamMaterial = useMemo(() => createBeamMaterial(WARM), []);
  const leafMaterial = useMemo(() => new MeshStandardMaterial({ color: '#2b2019', roughness: 0.8, emissive: WARM.clone() }), []);
  useEffect(
    () => () => {
      beamMaterial.dispose();
      leafMaterial.dispose();
    },
    [beamMaterial, leafMaterial],
  );

  useFrame(() => {
    const rise = frame.lighthouse;
    if (!root.current) return;
    root.current.visible = rise > 0.001;
    root.current.position.y = -(1 - rise) * (TOWER.height + 5);
    if (beams.current) beams.current.rotation.y = frame.time * 0.3;
    const light = rise * rise;
    beamMaterial.uniforms.uIntensity.value = 0.07 * light;
    lantern.current?.color.copy(WARM).multiplyScalar(0.3 + 2.4 * light);
    // Cerrada, la puerta es un rectángulo cálido tenue (el destino); abierta, la luz del interior sale al muelle.
    const open = frame.door;
    doorway.current?.color.copy(WARM).multiplyScalar(0.05 + 0.45 * light + 2.2 * open);
    leafMaterial.emissive.copy(WARM).multiplyScalar(0.06 + 0.2 * light);
    if (spill.current) spill.current.opacity = 0.55 * open;
    leaves.current.forEach((leaf, i) => {
      if (leaf) leaf.rotation.y = (i === 0 ? -1 : 1) * DOOR_SWING * open * open * (3 - 2 * open);
    });
  });

  return (
    <group position={[0, 0, LIGHTHOUSE.z]}>
      <group ref={root} visible={false}>
        {/* Roca: el muelle termina contra ella. */}
        <mesh position={[0, (PIER.deck - 3) / 2, 0]}>
          <cylinderGeometry args={[LIGHTHOUSE.radius + 1.8, LIGHTHOUSE.radius + 2.6, PIER.deck + 3, 9]} />
          <meshStandardMaterial color="#121418" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, PIER.deck + TOWER.height / 2, 0]}>
          <cylinderGeometry args={[TOWER.top, TOWER.bottom, TOWER.height, 40]} />
          <meshStandardMaterial color="#8b8781" roughness={0.85} />
        </mesh>
        {/* Balcón, linterna y techo. */}
        <mesh position={[0, PIER.deck + TOWER.height + 0.08, 0]}>
          <cylinderGeometry args={[TOWER.top + 0.55, TOWER.top + 0.55, 0.16, 32]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, LANTERN_Y, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 1.6, 24]} />
          <meshBasicMaterial ref={lantern} color={WARM} toneMapped={false} fog={false} />
        </mesh>
        <mesh position={[0, LANTERN_Y + 1.35, 0]}>
          <coneGeometry args={[1.45, 1.1, 24]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Dos haces opuestos. El cono gira +90° en z: su vértice (+y) apunta a −x y, con el
            desplazamiento +L/2, queda justo en la linterna; la boca se abre hacia +x. */}
        <group ref={beams} position={[0, LANTERN_Y, 0]}>
          {[0, Math.PI].map((yaw) => (
            <group key={yaw} rotation={[0, yaw, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} position={[BEAM_LENGTH / 2, 0, 0]} material={beamMaterial}>
                <coneGeometry args={[4.5, BEAM_LENGTH, 32, 1, true]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* La puerta mira al muelle; cruzarla es la transición `door` al Acto 4. Detrás de las hojas,
            el vano iluminado del interior. */}
        <group position={[0, PIER.deck + DOOR.height / 2, TOWER.bottom]}>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[DOOR.width, DOOR.height]} />
            <meshBasicMaterial ref={doorway} color={WARM} toneMapped={false} />
          </mesh>
          {[-1, 1].map((side, i) => (
            <group
              key={side}
              ref={(g) => {
                leaves.current[i] = g;
              }}
              position={[(side * DOOR.width) / 2, 0, 0.03]}
            >
              <mesh position={[(-side * DOOR.width) / 4, 0, 0]} material={leafMaterial}>
                <boxGeometry args={[DOOR.width / 2 - 0.01, DOOR.height - 0.02, 0.05]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* La luz de la puerta abierta sobre las tablas. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PIER.deck + 0.02, TOWER.bottom + 1.4]}>
          <planeGeometry args={[2.6, 3.4]} />
          <meshBasicMaterial ref={spill} map={getHaloTexture()} color={WARM} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
