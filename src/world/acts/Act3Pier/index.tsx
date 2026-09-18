import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ACTS } from '../../acts.config';
import { ACT_ANCHORS } from '../../camera/path';
import { useWorld } from '../../store';
import { useReducedMotion } from '../../lib/motion';
import type { ActProps } from '../types';
import { seaHandoff } from '../Act2Field/chapters';
import { LAMPS, jellyAt } from './layout';
import { BUILD_END, WALK_END, buildAt, builtAt, gridAt, lampGlow, lighthouseAt, orderAt, pierLocal } from './timeline';
import { createPierFrame } from './frame';
import { Ocean } from './Ocean';
import { Moon } from './Moon';
import { Pier } from './Pier';
import { Lamps } from './Lamps';
import { Jellyfish } from './Jellyfish';
import { Lighthouse } from './Lighthouse';

const ACT = ACTS[2];
/** Distancia (en z) a la que una medusa pasa a la tarjeta sin hover. */
const NEAR_RANGE = 7;

/**
 * Muelle y mar: el paisaje del Acto 2 se vuelve mar bajo los pies, el faro sale del agua, el muelle
 * se arma hacia la cámara y se recorre entre medusas (una por hito). Coreografía en timeline.ts.
 */
export default function Act3Pier({ content }: ActProps) {
  const reducedMotion = useReducedMotion();
  const anchor = ACT_ANCHORS[3];
  const { milestones } = content;
  const frame = useMemo(createPierFrame, []);
  const hover = useRef<string | null>(null);
  const jellyZ = useMemo(() => milestones.map((_, i) => jellyAt(i, milestones.length)[2]), [milestones]);

  useFrame(({ camera }, delta) => {
    // Con reduced motion el mar, las medusas y el haz apenas se mueven (ARCHITECTURE.md §13).
    frame.time += Math.min(delta, 0.1) * (reducedMotion ? 0.2 : 1);
    const { progress, setNearMilestone } = useWorld.getState();
    const local = pierLocal(progress);
    frame.local = local;
    frame.sea = seaHandoff(progress);
    frame.grid = gridAt(local);
    frame.build.value = buildAt(local);
    frame.lighthouse = lighthouseAt(local);
    frame.cameraZ = camera.position.z - anchor.z;
    LAMPS.forEach((lamp, i) => {
      frame.lampGlow[i] = builtAt(orderAt(lamp.z), frame.build.value) * lampGlow(lamp.z, frame.cameraZ);
    });

    // Tarjeta: la medusa en hover o, al caminar, la más cercana a la cámara.
    let card: string | null = null;
    if (progress >= ACT.start && progress <= ACT.end) {
      card = hover.current;
      if (!card && local > BUILD_END - 0.02 && local < WALK_END) {
        let best = NEAR_RANGE;
        jellyZ.forEach((z, i) => {
          const d = frame.cameraZ - z;
          if (d > -2 && Math.abs(d) < best) {
            best = Math.abs(d);
            card = milestones[i].id;
          }
        });
      }
    }
    setNearMilestone(card);
  });

  useEffect(
    () => () => {
      useWorld.getState().setNearMilestone(null);
      document.body.style.cursor = '';
    },
    [],
  );

  // El mar y la luna van con la cámara: viven en coordenadas de mundo, fuera del ancla.
  return (
    <group>
      <Ocean frame={frame} anchor={anchor} />
      <Moon frame={frame} />
      <group position={anchor}>
        <Lighthouse frame={frame} />
        <Pier frame={frame} />
        <Lamps frame={frame} />
        <Jellyfish milestones={milestones} frame={frame} hover={hover} />
      </group>
    </group>
  );
}
