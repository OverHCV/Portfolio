import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { ACT_ANCHORS } from '../../camera/path';
import { ActLabel } from '../ActLabel';
import type { ActProps } from '../types';

// M0: un bloque por proyecto en su parcela y una línea por conexión. Ciudad, pulsos y buzón llegan en M4.
export default function Act5City({ content }: ActProps) {
  const anchor = ACT_ANCHORS[5];
  const byId = useMemo(() => new Map(content.projects.map((p) => [p.id, p])), [content.projects]);

  return (
    <group>
      <ActLabel actKey="city" anchor={anchor} />
      <group position={anchor}>
        {content.projects.map((p) => {
          const [x, z] = p.building.plot;
          return (
            <mesh key={p.id} position={[x, p.building.height / 2 - 1.5, z]}>
              <boxGeometry args={[1.2, p.building.height, 1.2]} />
              <meshBasicMaterial color="#1c2a3a" />
            </mesh>
          );
        })}
        {content.projects.flatMap((p) =>
          p.building.connectsTo
            .filter((id) => byId.has(id))
            .map((id) => {
              const [x1, z1] = p.building.plot;
              const [x2, z2] = byId.get(id)!.building.plot;
              return (
                <Line
                  key={`${p.id}-${id}`}
                  points={[
                    [x1, -1.45, z1],
                    [x2, -1.45, z1],
                    [x2, -1.45, z2],
                  ]}
                  color="#7fe3ff"
                  lineWidth={2}
                />
              );
            }),
        )}
      </group>
    </group>
  );
}
