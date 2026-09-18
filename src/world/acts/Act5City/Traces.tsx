import { useEffect, useMemo } from 'react';
import { ribbonGeometry } from './ribbon';
import { createTraceMaterial } from './traceMaterial';
import type { Trace } from './board';
import type { CityFrame } from './frame';

/** Alto sobre la máscara de cada capa (la inferior queda debajo al solaparse). */
const LAYER_Y = [0.04, 0.02];

/** Todas las pistas de la placa en dos draw calls (capa inferior y superior), un solo material. */
export function Traces({ traces, frame }: { traces: Trace[]; frame: CityFrame }) {
  const material = useMemo(() => createTraceMaterial(frame), [frame]);
  const layers = useMemo(
    () =>
      ([1, 0] as const).map((layer) =>
        ribbonGeometry(
          traces.filter((t) => t.layer === layer),
          () => LAYER_Y[layer],
          {
            aProj: { size: 2, value: (t) => [t.a, t.b] },
            aLayer: { size: 1, value: (t) => t.layer },
            aSeed: { size: 1, value: (t) => t.seed },
            aArc0: { size: 1, value: (t) => t.arc0 ?? 0 },
          },
        ),
      ),
    [traces],
  );
  useEffect(() => () => layers.forEach((g) => g.dispose()), [layers]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      {layers.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} renderOrder={1 + i} frustumCulled={false} />
      ))}
    </group>
  );
}
