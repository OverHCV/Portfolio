import { useEffect, useRef } from 'react';
import { useWorld } from '../store';
import { veilAt, type TransitionKind } from '../transitions.config';
import { COLORS } from '../theme';

// 'sea' (2→3) no tiene velo: el paisaje se funde con el mar a la vista.
const BACKGROUNDS: Record<Exclude<TransitionKind, 'sea'>, string> = {
  lens: COLORS.void,
  door: 'radial-gradient(circle at 50% 45%, #fffdf7 0%, #fff4dc 55%, #f3dcae 100%)',
  dive: `radial-gradient(circle at 50% 50%, #fff4da 0%, ${COLORS.glow} 45%, #9c6a2c 100%)`,
};

/** Constantes de tiempo del fundido (s): entra un poco más rápido de lo que sale. */
const RISE = 0.22;
const FALL = 0.45;

/**
 * Capa DOM que tapa el viaje de cámara entre actos. Se pinta fuera de React (como la barra
 * de la navbar) y su objetivo depende solo del progreso, así que es reversible al volver con el scroll.
 *
 * La opacidad mostrada persigue a la del progreso con un suavizado en el tiempo: un giro de rueda
 * puede cruzar medio fundido de golpe, y un velo claro (la puerta del faro) que aparece de un salto
 * es un destello. Por eso tampoco hay corte con reduced motion: un fundido de opacidad no es
 * movimiento, y un salto a blanco es justo lo que esa preferencia pide evitar.
 */
export function TransitionVeil() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let kind: TransitionKind | null = null;
    let target = 0;
    let shown = 0;
    let frame = 0;
    let last = 0;

    const draw = () => {
      const node = el.current;
      if (!node) return;
      node.style.opacity = String(shown);
      node.style.visibility = shown < 0.001 ? 'hidden' : 'visible';
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const tau = target > shown ? RISE : FALL;
      shown += (target - shown) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target - shown) < 0.002) shown = target;
      draw();
      frame = shown === target ? 0 : requestAnimationFrame(step);
    };

    const paint = (progress: number) => {
      const node = el.current;
      if (!node) return;
      const { transition, opacity } = veilAt(progress);
      if (transition && transition.kind !== 'sea' && transition.kind !== kind) {
        kind = transition.kind;
        node.style.background = BACKGROUNDS[transition.kind];
      }
      target = opacity;
      if (!frame && target !== shown) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };

    // Al cargar en medio de un velo, sin fundido.
    shown = target = veilAt(useWorld.getState().progress).opacity;
    paint(useWorld.getState().progress);
    draw();
    const unsubscribe = useWorld.subscribe((s) => paint(s.progress));
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={el} aria-hidden className="pointer-events-none fixed inset-0 z-[5]" style={{ opacity: 0 }} />;
}
