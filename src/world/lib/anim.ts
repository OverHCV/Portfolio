import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { DUR, EASE } from '../theme';

gsap.registerPlugin(SplitText);

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface RevealOptions {
  by?: 'chars' | 'words';
  delay?: number;
  stagger?: number;
  duration?: number;
}

/**
 * Entrada de texto por letras o palabras, cada una sube desde detrás de una máscara.
 * Devuelve la limpieza (revierte el split). Con reduced motion no anima.
 */
export function revealText(el: HTMLElement, { by = 'chars', delay = 0, stagger, duration = DUR.slow }: RevealOptions = {}) {
  if (prefersReducedMotion()) return () => {};
  const split = SplitText.create(el, { type: by, mask: by });
  const targets = by === 'chars' ? split.chars : split.words;
  const tween = gsap.from(targets, {
    yPercent: 110,
    opacity: 0,
    duration,
    delay,
    ease: EASE.enter,
    stagger: stagger ?? (by === 'chars' ? 0.035 : 0.08),
  });
  return () => {
    tween.kill();
    split.revert();
  };
}

/** Entrada simple: sube y aparece. */
export function revealBlock(el: HTMLElement, { delay = 0, y = 24, duration = DUR.slow as number } = {}) {
  if (prefersReducedMotion()) return () => {};
  const tween = gsap.from(el, { y, opacity: 0, duration, delay, ease: EASE.enter });
  return () => tween.kill();
}
