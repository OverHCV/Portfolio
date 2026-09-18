import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useWorld } from '../store';

gsap.registerPlugin(ScrollTrigger);

/** Única fuente de `progress`: nada más en la app escucha el evento scroll. */
export function ScrollDriver({ track }: { track: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => useWorld.getState().setProgress(self.progress),
    });
    useWorld.getState().setProgress(trigger.progress);
    return () => trigger.kill();
  }, [track]);

  return null;
}
