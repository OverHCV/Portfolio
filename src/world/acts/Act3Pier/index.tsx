import { ACT_ANCHORS } from '../../camera/path';
import { ActLabel } from '../ActLabel';
import type { MilestoneKind } from '../../types';
import type { ActProps } from '../types';

/** Color de medusa por tipo de hito (provisional). */
export const MILESTONE_COLORS: Record<MilestoneKind, string> = {
  job: '#7fe3ff',
  internship: '#9fffd2',
  education: '#c9a7ff',
  certification: '#ffd28a',
  award: '#ff9fc6',
};

const PIER_LENGTH = 14;

// M0: tablas del muelle + una esfera por hito, en orden cronológico. Medusas, mar y faro llegan en M2.
export default function Act3Pier({ content }: ActProps) {
  const anchor = ACT_ANCHORS[3];
  const n = content.milestones.length;
  return (
    <group>
      <ActLabel actKey="pier" anchor={anchor} />
      <group position={anchor}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial color="#070b14" />
        </mesh>
        {Array.from({ length: PIER_LENGTH }, (_, i) => (
          <mesh key={i} position={[0, -1, 4 - i * 0.9]}>
            <boxGeometry args={[2, 0.1, 0.7]} />
            <meshBasicMaterial color="#3a3026" />
          </mesh>
        ))}
        {content.milestones.map((m, i) => (
          <mesh key={m.id} position={[i % 2 === 0 ? -2 : 2, 0, 3 - (i / Math.max(n - 1, 1)) * 10]}>
            <sphereGeometry args={[0.35, 24, 24]} />
            <meshBasicMaterial color={MILESTONE_COLORS[m.kind]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
