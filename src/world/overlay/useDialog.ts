import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../lib/anim';
import { DUR, EASE } from '../theme';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isDesktop() {
  return window.matchMedia('(min-width: 768px)').matches;
}

/**
 * De dónde entra la hoja: `side` = desde la derecha en desktop y desde abajo en móvil (Panel);
 * `rise` = siempre desde abajo, como una hoja que sale del buzón (ContactSheet).
 */
type Enter = 'side' | 'rise';

function offscreen(enter: Enter): gsap.TweenVars {
  if (enter === 'rise') return { yPercent: 40, opacity: 0, rotate: -2 };
  return isDesktop() ? { xPercent: 100, opacity: 0 } : { yPercent: 100, opacity: 0 };
}

/**
 * Comportamiento común de los diálogos del overlay (Panel, ContactSheet): monta al abrirse, anima
 * entrada y salida, bloquea el scroll mientras está abierto, atrapa el Tab, cierra con Esc y
 * devuelve el foco al elemento que lo abrió. `mounted` sigue en true mientras anima la salida.
 */
export function useDialog(open: boolean, onClose: () => void, enter: Enter = 'side') {
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Abrir monta; cerrar anima la salida y luego desmonta.
  useEffect(() => {
    if (open) {
      if (!mounted) returnFocus.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      return;
    }
    if (!mounted || !panel.current) return;
    const reduced = prefersReducedMotion();
    const tl = gsap.timeline({ onComplete: () => setMounted(false) });
    tl.to(panel.current, { ...offscreen(enter), duration: reduced ? 0 : DUR.base * 0.7, ease: EASE.exit }).to(
      backdrop.current,
      { opacity: 0, duration: reduced ? 0 : DUR.fast },
      0,
    );
    return () => {
      tl.kill();
    };
  }, [open]);

  // Entrada, bloqueo de scroll y devolución del foco.
  useLayoutEffect(() => {
    if (!mounted || !panel.current) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const reduced = prefersReducedMotion();
    gsap.fromTo(
      panel.current,
      offscreen(enter),
      { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, duration: reduced ? 0 : DUR.base, ease: EASE.enter },
    );
    gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : DUR.base });
    initialFocus.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = previousOverflow;
      returnFocus.current?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
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

  return { mounted, panel, backdrop, initialFocus, onKeyDown };
}
