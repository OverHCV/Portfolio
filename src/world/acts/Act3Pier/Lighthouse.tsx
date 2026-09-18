import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, type Group, type MeshBasicMaterial, ShaderMaterial } from 'three';
import { COLORS } from '../../theme';
import { LIGHTHOUSE, PIER } from './layout';
import type { PierFrame } from './frame';

const TOWER = { top: 1.55, bottom: LIGHTHOUSE.radius, height: 12.5 };
const LANTERN_Y = PIER.deck + TOWER.height + 0.95;
const BEAM_LENGTH = 48;
const WARM = new Color(COLORS.glow);

// Haz: cono abierto, más intenso junto a la linterna; sin niebla, para que se lea sobre el mar oscuro.
const beamVertex = /* glsl */ `
varying float vAlong;
void main() {
  vAlong = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const beamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying float vAlong;
void main() {
  gl_FragColor = vec4(uColor * pow(vAlong, 3.0) * uIntensity, 1.0);
}
`;

/**
 * El faro al final del muelle: base de roca, torre, linterna cálida con un haz que gira despacio y la
 * puerta que lleva al Acto 4. Sale del mar al empezar la construcción (`frame.lighthouse`).
 */
export function Lighthouse({ frame }: { frame: PierFrame }) {
  const root = useRef<Group>(null);
  const beams = useRef<Group>(null);
  const lantern = useRef<MeshBasicMaterial>(null);
  const door = useRef<MeshBasicMaterial>(null);

  const beamMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: { uColor: { value: WARM }, uIntensity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => beamMaterial.dispose(), [beamMaterial]);

  useFrame(() => {
    const rise = frame.lighthouse;
    if (!root.current) return;
    root.current.visible = rise > 0.001;
    root.current.position.y = -(1 - rise) * (TOWER.height + 5);
    if (beams.current) beams.current.rotation.y = frame.time * 0.3;
    const light = rise * rise;
    beamMaterial.uniforms.uIntensity.value = 0.09 * light;
    lantern.current?.color.copy(WARM).multiplyScalar(0.3 + 2.4 * light);
    door.current?.color.copy(WARM).multiplyScalar(0.05 + 0.45 * light);
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
        {/* Dos haces opuestos: el vértice del cono en la linterna. */}
        <group ref={beams} position={[0, LANTERN_Y, 0]}>
          {[0, Math.PI].map((yaw) => (
            <group key={yaw} rotation={[0, yaw, 0]}>
              <mesh rotation={[0, 0, -Math.PI / 2]} position={[BEAM_LENGTH / 2, 0, 0]} material={beamMaterial}>
                <coneGeometry args={[4.5, BEAM_LENGTH, 32, 1, true]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* La puerta mira al muelle; cruzarla es la transición `door` al Acto 4. */}
        <mesh position={[0, PIER.deck + 1.05, TOWER.bottom + 0.02]}>
          <planeGeometry args={[1.1, 2.1]} />
          <meshBasicMaterial ref={door} color={WARM} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
