import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { useWorld, type Focus } from '../store';
import { useT } from '../../i18n/useT';
import { prefersReducedMotion, revealText } from '../lib/anim';
import { DUR, EASE } from '../theme';
import type { L10n, WorldContent } from '../types';

interface PanelItem {
  eyebrow: string;
  title: L10n;
  body: L10n;
}

/**
 * Traduce el `focus` del store al contenido del panel. Cada tipo llega con su acto (hitos en M2,
 * proyectos en M4); la bio del Acto 2 ya no usa panel: se lee en capítulos (FieldOverlay).
 */
function resolve(_focus: NonNullable<Focus>, _content: WorldContent): PanelItem | null {
  return null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isDesktop() {
  return window.matchMedia('(min-width: 768px)').matches;
}

/**
 * Panel de detalle en DOM (derecha en desktop, hoja inferior en móvil).
 * Mientras está abierto: scroll pausado, foco atrapado, Esc o clic fuera cierra.
 */
export function Panel({ content }: { content: WorldContent }) {
  const { t, pick, lang } = useT();
  const focus = useWorld((s) => s.focus);
  const [shown, setShown] = useState<NonNullable<Focus> | null>(null);
  const panel = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = () => useWorld.getState().setFocus(null);

  // Abrir con el nuevo focus; cerrar animando antes de desmontar.
  useEffect(() => {
    if (focus) {
      if (!shown) returnFocus.current = document.activeElement as HTMLElement | null;
      setShown(focus);
      return;
    }
    if (!shown || !panel.current) return;
    const reduced = prefersReducedMotion();
    const tl = gsap.timeline({ onComplete: () => setShown(null) });
    tl.to(panel.current, {
      ...(isDesktop() ? { xPercent: 100 } : { yPercent: 100 }),
      opacity: 0,
      duration: reduced ? 0 : DUR.base * 0.7,
      ease: EASE.exit,
    }).to(backdrop.current, { opacity: 0, duration: reduced ? 0 : DUR.fast }, 0);
    return () => {
      tl.kill();
    };
  }, [focus]);

  // Entrada, bloqueo de scroll y devolución del foco.
  const isOpen = shown !== null;
  useLayoutEffect(() => {
    if (!isOpen || !panel.current) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const reduced = prefersReducedMotion();
    gsap.fromTo(
      panel.current,
      { ...(isDesktop() ? { xPercent: 100 } : { yPercent: 100 }), opacity: 0 },
      { xPercent: 0, yPercent: 0, opacity: 1, duration: reduced ? 0 : DUR.base, ease: EASE.enter },
    );
    gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : DUR.base });
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = previousOverflow;
      returnFocus.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const item = shown ? resolve(shown, content) : null;
  const itemKey = shown ? `${JSON.stringify(shown)}-${lang}` : '';

  // Título por palabras cada vez que cambia el contenido o el idioma.
  useLayoutEffect(() => {
    if (!title.current) return;
    return revealText(title.current, { by: 'words', delay: 0.15, duration: DUR.base });
  }, [itemKey]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  function trapTab(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!shown || !item) return null;

  return (
    <>
      <div ref={backdrop} className="fixed inset-0 z-30 bg-void/40 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onKeyDown={trapTab}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-void/85 p-6 pb-10 backdrop-blur-xl md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-l md:p-10"
      >
        <div className="flex items-start justify-between gap-6">
          <p className="text-xs uppercase tracking-[0.3em] text-glow">{t(item.eyebrow)}</p>
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label={t('panel.close')}
            className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-mist transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <h2 key={itemKey} ref={title} id="panel-title" className="mt-6 font-display text-3xl leading-tight text-ink md:text-4xl">
          {pick(item.title)}
        </h2>
        <p className="mt-6 leading-relaxed text-mist">{pick(item.body)}</p>
      </aside>
    </>
  );
}
