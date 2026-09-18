import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ACTS, type ActDef } from '../acts.config';
import { useWorld } from '../store';
import { useT } from '../../i18n/useT';
import { SUPPORTED_LANGS } from '../../i18n/langs';
import { useReducedMotion } from '../lib/motion';
import { revealBlock } from '../lib/anim';
import { scrollToProgress } from '../lib/scrollTo';
import { DUR, EASE } from '../theme';
import { ACT_ICONS, SoundIcon } from './icons';

const buttonBase =
  'relative grid h-11 w-11 place-items-center rounded-full text-mist transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow';

export function Navbar() {
  const { t, lang } = useT();
  const activeAct = useWorld((s) => s.activeAct);
  const muted = useWorld((s) => s.audio.muted);
  const hd = useWorld((s) => s.hd);
  const reducedMotion = useReducedMotion();
  const bar = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const pillPlaced = useRef(false);

  // Entrada tras el título del Hero.
  useLayoutEffect(() => (nav.current ? revealBlock(nav.current, { delay: 1.6, y: 20 }) : undefined), []);

  // La pastilla del acto activo se desliza entre íconos en vez de saltar.
  useLayoutEffect(() => {
    const target = buttons.current[activeAct - 1];
    if (!target || !pill.current) return;
    // El <li> es el que se posiciona respecto al <ol> (el botón lo hace respecto a su <li>).
    const x = target.parentElement?.offsetLeft ?? 0;
    if (!pillPlaced.current || reducedMotion) {
      gsap.set(pill.current, { x });
      pillPlaced.current = true;
    } else {
      gsap.to(pill.current, { x, duration: DUR.base, ease: EASE.inOut, overwrite: true });
    }
  }, [activeAct, reducedMotion]);

  // La barra de progreso se actualiza fuera de React: no re-renderizar la navbar en cada scroll.
  useEffect(() => {
    const paint = (p: number) => {
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    paint(useWorld.getState().progress);
    return useWorld.subscribe((s) => paint(s.progress));
  }, []);

  function goTo(act: ActDef) {
    scrollToProgress(act.start);
  }

  function cycleLang() {
    const i = SUPPORTED_LANGS.indexOf(lang as (typeof SUPPORTED_LANGS)[number]);
    useWorld.getState().setLang(SUPPORTED_LANGS[(i + 1) % SUPPORTED_LANGS.length]);
  }

  return (
    <nav
      ref={nav}
      aria-label={t('nav.label')}
      className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 overflow-hidden rounded-full border border-white/10 bg-void/70 px-2 py-1 shadow-lg backdrop-blur-md"
    >
      <ol className="relative flex items-center gap-0.5">
        <span
          ref={pill}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-11 w-11 rounded-full border border-glow/25 bg-white/[0.07]"
        />
        {ACTS.map((act, index) => {
          const name = t(`acts.${act.key}`);
          const current = act.id === activeAct;
          return (
            <li key={act.id} className="group relative">
              <button
                ref={(el) => {
                  buttons.current[index] = el;
                }}
                type="button"
                onClick={() => goTo(act)}
                aria-label={t('nav.goTo', { act: name })}
                aria-current={current ? 'step' : undefined}
                className={`${buttonBase} ${current ? 'text-glow' : ''}`}
              >
                {ACT_ICONS[act.key]}
              </button>
              <span
                role="presentation"
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-void/90 px-2 py-1 text-xs text-ink opacity-0 transition-opacity group-hover:opacity-100 md:block"
              >
                {name}
              </span>
            </li>
          );
        })}
      </ol>

      <span aria-hidden className="mx-1 h-6 w-px bg-white/10" />

      <button
        type="button"
        onClick={cycleLang}
        aria-label={`${t('nav.language')}: ${lang.toUpperCase()}`}
        className={`${buttonBase} text-xs font-medium tracking-wider`}
      >
        {lang.toUpperCase()}
      </button>
      <button
        type="button"
        onClick={() => useWorld.getState().toggleHd()}
        aria-pressed={hd}
        aria-label={hd ? t('nav.hd.on') : t('nav.hd.off')}
        title={hd ? t('nav.hd.on') : t('nav.hd.off')}
        className={`${buttonBase} text-[10px] font-semibold tracking-wider`}
      >
        <span className={`rounded border px-1 py-px transition-colors ${hd ? 'border-glow text-glow' : 'border-current'}`}>HD</span>
      </button>
      <button
        type="button"
        onClick={() => useWorld.getState().toggleMute()}
        aria-pressed={!muted}
        aria-label={muted ? t('nav.sound.off') : t('nav.sound.on')}
        className={buttonBase}
      >
        <SoundIcon muted={muted} />
      </button>

      <div
        ref={bar}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-glow/70"
        style={{ transform: 'scaleX(0)' }}
      />
    </nav>
  );
}
