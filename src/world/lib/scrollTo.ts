import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useWorld } from '../store';
import { prefersReducedMotion } from './anim';

gsap.registerPlugin(ScrollToPlugin);

/** Posición de scroll para un progreso global (un par de px dentro, para que ya cuente como ese punto). */
function scrollYFor(progress: number): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return progress <= 0 ? 0 : progress * max + 2;
}

/**
 * Mueve el scroll real hasta `progress`: cámara, velos y audio siguen igual que con la rueda.
 * Cierra el panel abierto, si lo hay. Con reduced motion el viaje es más corto, pero no un salto:
 * un corte seco desorienta más que un desplazamiento breve provocado por el propio usuario.
 */
export function scrollToProgress(progress: number, duration = 1.4) {
  useWorld.getState().setFocus(null);
  gsap.to(window, {
    scrollTo: { y: scrollYFor(progress), autoKill: true },
    duration: prefersReducedMotion() ? Math.min(duration, 0.6) : duration,
    ease: 'power2.inOut',
  });
}
