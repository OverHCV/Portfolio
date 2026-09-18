import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ACT_ANCHORS } from '../../camera/path';
import { useWorld } from '../../store';
import { useReducedMotion } from '../../lib/motion';
import type { ActProps } from '../types';
import { chapterAt, localOf } from './chapters';
import { createLandscape } from './landscape';
import { Surface } from './Surface';
import { MathGlyphs } from './MathGlyphs';
import { BioNodes } from './BioNodes';
import { GradientProbe } from './GradientProbe';

/**
 * Espacio de soluciones: un paisaje f(x, z, t) que respira, cuyos mínimos son los fragmentos de bio.
 * El scroll recorre un capítulo por fragmento (el texto vive en overlay/FieldOverlay.tsx) y al final
 * el paisaje se calma como un mar antes de bajar al muelle.
 */
export default function Act2Field({ content }: ActProps) {
  const reducedMotion = useReducedMotion();
  const anchor = ACT_ANCHORS[2];
  const n = content.bio.length;
  const landscape = useMemo(() => createLandscape(content.bio.map((b) => b.gridPos)), [content.bio]);
  // Estado del frame compartido con los hijos (se muta, no provoca renders).
  const chapter = useMemo(() => chapterAt(0, n), [n]);
  const time = useRef(0);

  useFrame((_, delta) => {
    // Con reduced motion el paisaje apenas se mueve (ARCHITECTURE.md §13: "estáticos o muy lentos").
    time.current += Math.min(delta, 0.1) * (reducedMotion ? 0.2 : 1);
    chapterAt(localOf(useWorld.getState().progress), n, chapter);
    landscape.update(time.current, chapter.calm, chapter.reveal, chapter.opacity, chapter.focus);
  });

  return (
    <group position={anchor}>
      <Surface landscape={landscape} />
      <MathGlyphs landscape={landscape} />
      <BioNodes bio={content.bio} landscape={landscape} chapter={chapter} />
      <GradientProbe landscape={landscape} chapter={chapter} anchor={anchor} />
    </group>
  );
}
