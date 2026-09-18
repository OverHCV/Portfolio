import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useT } from '../../i18n/useT';
import { useWorld } from '../store';
import { smoothstep } from '../lib/motion';
import { prefersReducedMotion, revealBlock, revealText } from '../lib/anim';
import type { Site } from '../types';

/**
 * Título y rol del Acto 1 como texto DOM (tipografía real, nítida a cualquier tamaño).
 * Es aria-hidden: la versión accesible es el <header> del HTML semántico.
 */
export function HeroOverlay({ site }: { site: Site }) {
  const { t, pick, lang } = useT();
  const root = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLParagraphElement>(null);
  const role = useRef<HTMLParagraphElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const firstReveal = useRef(true);

  // Se desvanece con el scroll del Acto 1.
  useEffect(() => {
    const paint = (activeAct: number, local: number) => {
      const el = root.current;
      if (!el) return;
      const opacity = activeAct === 1 ? 1 - smoothstep(0.15, 0.6, local) : 0;
      el.style.opacity = String(opacity);
      el.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
    };
    const s = useWorld.getState();
    paint(s.activeAct, s.localProgress);
    return useWorld.subscribe((st) => paint(st.activeAct, st.localProgress));
  }, []);

  // Entrada al cargar: nombre por letras, rol por palabras, luego la pista de scroll respirando.
  useLayoutEffect(() => {
    if (!name.current || !hint.current) return;
    const undoName = revealText(name.current, { by: 'chars', delay: 0.3 });
    const undoHint = revealBlock(hint.current, { delay: 1.8, y: 8 });
    const breathe = prefersReducedMotion()
      ? null
      : gsap.to(hint.current, { opacity: 0.35, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 });
    return () => {
      undoName();
      undoHint();
      breathe?.kill();
    };
  }, []);

  // El rol cambia con el idioma: se vuelve a montar (key) y a revelar.
  useLayoutEffect(() => {
    if (!role.current) return;
    const delay = firstReveal.current ? 1.1 : 0;
    firstReveal.current = false;
    return revealText(role.current, { by: 'words', delay, stagger: 0.12 });
  }, [lang]);

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-end px-4 pb-[24vh] text-center [text-shadow:0_2px_24px_rgba(5,6,10,0.9)]"
    >
      <p ref={name} className="font-display text-5xl font-light tracking-tight text-ink sm:text-7xl">
        {site.name}
      </p>
      <p key={`role-${lang}`} ref={role} className="mt-5 text-sm uppercase tracking-[0.35em] text-mist sm:text-base">
        {pick(site.role)}
      </p>
      <p key={`hint-${lang}`} ref={hint} className="absolute bottom-24 text-xs tracking-widest text-mist/80">
        {t('hero.scroll')}
      </p>
    </div>
  );
}
