import { ACT_ANCHORS } from '../../camera/path';
import { ActLabel } from '../ActLabel';
import type { ActProps } from '../types';

// M0: bloque en lugar del piano. El modelo, las teclas y la partitura llegan en M3.
export default function Act4Lighthouse(_: ActProps) {
  const anchor = ACT_ANCHORS[4];
  return (
    <group>
      <ActLabel actKey="lighthouse" anchor={anchor} />
      <group position={anchor}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[2.8, 1, 1.6]} />
          <meshBasicMaterial color="#15161a" />
        </mesh>
        <mesh position={[0, 0.35, -0.6]} rotation={[-0.3, 0, 0]}>
          <planeGeometry args={[1.2, 0.8]} />
          <meshBasicMaterial color="#e8e1d0" />
        </mesh>
      </group>
    </group>
  );
}
