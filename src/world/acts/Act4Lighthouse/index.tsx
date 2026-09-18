import { Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { ACT_ANCHORS } from '../../camera/path';
import { useWorld } from '../../store';
import { useReducedMotion } from '../../lib/motion';
import type { ActProps } from '../types';
import { createLighthouseFrame } from './frame';
import { albumAt, keysAt, lighthouseLocal } from './timeline';
import { useStudioEnv } from './models';
import { Room } from './Room';
import { Piano } from './Piano';
import { Keys } from './Keys';
import { Violin } from './Violin';
import { Album } from './album/Album';

/**
 * El faro por dentro: un cuarto circular con un solo foco sobre el piano, el violín recostado en el
 * banco y, en el atril, el álbum del stack. Coreografía en timeline.ts; cámara en camera/path.ts.
 */
export default function Act4Lighthouse({ content }: ActProps) {
  const reducedMotion = useReducedMotion();
  const anchor = ACT_ANCHORS[4];
  const frame = useMemo(createLighthouseFrame, []);
  const envMap = useStudioEnv();

  useFrame((_, delta) => {
    frame.time += Math.min(delta, 0.1) * (reducedMotion ? 0.2 : 1);
    const local = lighthouseLocal(useWorld.getState().progress);
    frame.local = local;
    frame.album = albumAt(local);
    frame.keys = keysAt(local);
  });

  return (
    <group position={anchor}>
      <Room frame={frame} />
      {/* Los modelos llegan por su cuenta: el cuarto y el álbum no los esperan. */}
      <Suspense fallback={null}>
        <Piano envMap={envMap} />
      </Suspense>
      <Suspense fallback={null}>
        <Violin envMap={envMap} />
      </Suspense>
      <Keys frame={frame} />
      <Album frame={frame} stack={content.stack} name={content.site.name} />
    </group>
  );
}
