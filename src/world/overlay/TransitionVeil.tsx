import { useEffect, useRef } from 'react';
import { useWorld } from '../store';
import { veilAt, type TransitionKind } from '../transitions.config';
import { useReducedMotion } from '../lib/motion';
import { COLORS } from '../theme';

const BACKGROUNDS: Record<TransitionKind, string> = {
  lens: COLORS.void,
  // La línea del horizonte aparece en el centro mientras el velo se abre sobre el mar.
  horizon: `linear-gradient(to bottom, ${COLORS.void} 0%, ${COLORS.void} 49.7%, rgba(243, 199, 122, 0.85) 50%, ${COLORS.void} 50.3%, ${COLORS.void} 100%)`,
  door: '#000000',
  dive: `radial-gradient(circle at 50% 50%, #fff4da 0%, ${COLORS.glow} 45%, #9c6a2c 100%)`,
};

/**
 * Capa DOM que tapa el viaje de cámara entre actos. Se pinta fuera de React (como la barra
 * de la navbar) y depende solo del progreso, así que es reversible al volver con el scroll.
 */
export function TransitionVeil() {
  const el = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let kind: TransitionKind | null = null;
    const paint = (progress: number) => {
      const node = el.current;
      if (!node) return;
      const { transition, opacity } = veilAt(progress);
      if (transition && transition.kind !== kind) {
        kind = transition.kind;
        node.style.background = BACKGROUNDS[kind];
      }
      // Con reduced motion, cortes: el velo solo aparece mientras cubre el viaje.
      const value = reducedMotion ? (opacity >= 1 ? 1 : 0) : opacity;
      node.style.opacity = String(value);
      node.style.visibility = value < 0.001 ? 'hidden' : 'visible';
    };
    paint(useWorld.getState().progress);
    return useWorld.subscribe((s) => paint(s.progress));
  }, [reducedMotion]);

  return <div ref={el} aria-hidden className="pointer-events-none fixed inset-0 z-[5]" style={{ opacity: 0 }} />;
}
