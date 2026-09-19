import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useT } from '../../i18n/useT';
import { useWorld } from '../store';
import { revealBlock, revealText } from '../lib/anim';
import { scrollToProgress } from '../lib/scrollTo';
import { chapterAt, chapterProgress, localOf } from '../acts/Act2Field/chapters';
import type { BioFragment } from '../types';

/**
 * Texto del Acto 2: un fragmento de bio por capítulo de scroll, en DOM (tipografía real, legible).
 * Es aria-hidden: la versión accesible es la <section> del HTML semántico.
 */
export function FieldOverlay({ bio }: { bio: BioFragment[] }) {
  const { t, pick, lang } = useT();
  const n = bio.length;
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLParagraphElement>(null);

  // Opacidad y capítulo según el scroll; React solo re-renderiza al cambiar de capítulo.
  useEffect(() => {
    const state = chapterAt(0, n);
    const paint = (progress: number) => {
      const el = root.current;
      if (!el) return;
      chapterAt(localOf(progress), n, state);
      el.style.opacity = String(state.text);
      el.style.visibility = state.text < 0.01 ? 'hidden' : 'visible';
      setIndex(state.index);
    };
    paint(useWorld.getState().progress);
    return useWorld.subscribe((s) => paint(s.progress));
  }, [n]);

  // Cada capítulo (o idioma) entra de nuevo: título por palabras, cuerpo como bloque.
  useLayoutEffect(() => {
    if (!title.current || !body.current) return;
    const undoTitle = revealText(title.current, { by: 'words', duration: 0.9, stagger: 0.06 });
    const undoBody = revealBlock(body.current, { delay: 0.2, y: 12, duration: 0.9 });
    return () => {
      undoTitle();
      undoBody();
    };
  }, [index, lang]);

  const fragment = bio[index];
  if (!fragment) return null;

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-10" style={{ opacity: 0, visibility: 'hidden' }}>
      {/* Scrim: oscurece solo la zona del texto para que el paisaje no lo tape. */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-void via-void/80 to-transparent md:inset-y-0 md:left-0 md:right-auto md:h-auto md:w-[58%] md:bg-gradient-to-r" />

      <div className="absolute inset-x-6 bottom-28 max-w-md md:inset-x-auto md:bottom-auto md:left-[8vw] md:top-1/2 md:-translate-y-1/2 [text-shadow:0_0_2px_#05060a,0_1px_4px_rgba(5,6,10,0.95),0_2px_18px_rgba(5,6,10,0.95)]">
        <p className="text-xs uppercase tracking-[0.35em] text-mist">{t('acts.field')}</p>
        <p className="mt-6 font-mono text-sm tracking-widest text-glow">
          {String(index + 1).padStart(2, '0')} <span className="text-mist/60">/ {String(n).padStart(2, '0')}</span>
        </p>
        <h2 key={`t-${index}-${lang}`} ref={title} className="mt-3 font-display text-4xl font-light leading-[1.1] text-ink md:text-5xl">
          {pick(fragment.title)}
        </h2>
        <p key={`b-${index}-${lang}`} ref={body} className="mt-5 text-base leading-relaxed text-ink/85 md:text-lg">
          {pick(fragment.body)}
        </p>

        <div className="pointer-events-auto mt-8 flex items-center gap-2">
          {bio.map((b, i) => (
            <button
              key={b.id}
              type="button"
              tabIndex={-1}
              title={pick(b.title)}
              onClick={() => scrollToProgress(chapterProgress(i, n), 1)}
              className="group grid h-8 w-8 place-items-center"
            >
              <span
                className={`block h-[3px] rounded-full transition-all duration-500 ${
                  i === index ? 'w-7 bg-glow' : 'w-3 bg-mist/50 group-hover:bg-ink'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="mt-4 hidden text-xs tracking-wide text-mist/70 [@media(hover:hover)]:block">{t('field.hint')}</p>
      </div>
    </div>
  );
}
