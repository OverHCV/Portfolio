import { useEffect, useRef, type ReactNode } from 'react';
import { cityAnchor } from '../acts/Act5City/anchor';
import { useReducedMotion } from '../lib/motion';

type Side = 'above' | 'right' | 'left' | 'below';

/** Margen con los bordes de la pantalla. */
const MARGIN = 16;
/** Franja inferior que ocupa el navbar. */
const NAV_RESERVE = 96;
/** Separación entre el chip y la burbuja (la cola la cruza). */
const GAP = 18;
/** Distancia mínima de la cola a las esquinas redondeadas. */
const TAIL_INSET = 22;
/** Alto de la cola (su base mide el doble). */
const TAIL = 12;
/** Rapidez con que la burbuja sigue al chip mientras la cámara se mueve. */
const FOLLOW = 14;

/** Giro de la cola (apunta hacia abajo sin girar) según el lado en que queda la burbuja. */
const TAIL_ROTATION: Record<Side, number> = { above: 0, below: 180, right: 90, left: -90 };

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), Math.max(lo, hi));

interface Placement {
  side: Side;
  x: number;
  y: number;
  /** false: no cabe entera en ningún lado y se pegó al borde (tapa parte de la placa). */
  fits: boolean;
}

/**
 * Dónde cabe la burbuja junto al chip: arriba si hay sitio, si no al lado con más espacio, luego
 * abajo. Conserva el lado anterior mientras siga cabiendo, para que no salte durante el paneo.
 * En pantallas estrechas solo arriba o abajo.
 */
function place(w: number, h: number, prev: Side | null): Placement {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const { left, right, top, bottom } = cityAnchor;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const floor = H - NAV_RESERVE;
  const narrow = W < 768;

  const centerX = clamp(cx - w / 2, MARGIN, W - MARGIN - w);
  const centerY = clamp(cy - h / 2, MARGIN, floor - h);
  const fits: Record<Side, () => Placement | null> = {
    above: () => (top - GAP - h >= MARGIN ? { side: 'above', x: centerX, y: top - GAP - h, fits: true } : null),
    below: () => (bottom + GAP + h <= floor ? { side: 'below', x: centerX, y: bottom + GAP, fits: true } : null),
    right: () => (!narrow && right + GAP + w <= W - MARGIN ? { side: 'right', x: right + GAP, y: centerY, fits: true } : null),
    left: () => (!narrow && left - GAP - w >= MARGIN ? { side: 'left', x: left - GAP - w, y: centerY, fits: true } : null),
  };
  const sides: Side[] = W - right > left ? ['above', 'right', 'left', 'below'] : ['above', 'left', 'right', 'below'];
  if (prev) sides.unshift(prev);
  for (const side of sides) {
    const p = fits[side]();
    if (p) return p;
  }
  // No cabe entera en ningún lado: arriba o abajo, donde haya más sitio, pegada al borde.
  return top > floor - bottom
    ? { side: 'above', x: centerX, y: MARGIN, fits: false }
    : { side: 'below', x: centerX, y: floor - h, fits: false };
}

/**
 * Burbuja que sale del chip del Acto 5: sigue su rectángulo en pantalla (`cityAnchor`, escrito por
 * la escena) en un rAF propio, sin renders de React, y apunta al chip con una cola. Solo informa:
 * no recibe el puntero, así nunca tapa la interacción con los chips (se abre con clic en el chip).
 */
export function ProjectBubble({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLDivElement>(null);
  const leader = useRef<SVGLineElement>(null);
  const dot = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let side: Side | null = null;
    let pos: { x: number; y: number } | null = null;
    // Sin sitio para la burbuja entera, se esconden las capturas de ese proyecto (hasta cambiar de chip).
    let compact = false;
    let compactFor = -1;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const el = box.current;
      if (!el || !tail.current) return;
      if (!cityAnchor.visible) {
        // Al volver a aparecer, salta directo al chip en vez de cruzar la pantalla.
        pos = null;
        side = null;
        return;
      }
      if (compactFor !== cityAnchor.project) {
        compact = false;
        compactFor = cityAnchor.project;
      }
      const shots = el.querySelector<HTMLElement>('[data-bubble-shots]');
      if (shots) shots.hidden = compact;

      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const target = place(w, h, side);
      side = target.side;
      if (!target.fits && shots && !compact) compact = true;
      const k = reduced || !pos ? 1 : 1 - Math.exp(-dt * FOLLOW);
      pos = pos ?? { x: target.x, y: target.y };
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      // «Clic para abrir» se enciende cuando el cursor está justo sobre el chip.
      el.querySelector('[data-click-hint]')?.classList.toggle('text-ink', cityAnchor.onChip);
      el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;

      const cx = (cityAnchor.left + cityAnchor.right) / 2 - pos.x;
      const cy = (cityAnchor.top + cityAnchor.bottom) / 2 - pos.y;
      const tx = side === 'above' || side === 'below' ? clamp(cx, TAIL_INSET, w - TAIL_INSET) : side === 'right' ? -TAIL / 2 : w + TAIL / 2;
      const ty = side === 'left' || side === 'right' ? clamp(cy, TAIL_INSET, h - TAIL_INSET) : side === 'above' ? h + TAIL / 2 : -TAIL / 2;
      tail.current.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) translate(-50%, -50%) rotate(${TAIL_ROTATION[side]}deg)`;

      // Línea guía de la punta de la cola al chip: la burbuja se lee como salida de ese chip.
      const tip = TAIL / 2;
      const x1 = pos.x + tx + (side === 'right' ? -tip : side === 'left' ? tip : 0);
      const y1 = pos.y + ty + (side === 'above' ? tip : side === 'below' ? -tip : 0);
      const x2 = (cityAnchor.left + cityAnchor.right) / 2;
      const y2 = cityAnchor.top + (cityAnchor.bottom - cityAnchor.top) * 0.35;
      leader.current?.setAttribute('x1', x1.toFixed(1));
      leader.current?.setAttribute('y1', y1.toFixed(1));
      leader.current?.setAttribute('x2', x2.toFixed(1));
      leader.current?.setAttribute('y2', y2.toFixed(1));
      dot.current?.setAttribute('cx', x2.toFixed(1));
      dot.current?.setAttribute('cy', y2.toFixed(1));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const fade = `transition-opacity duration-300 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <>
      <svg aria-hidden className={`pointer-events-none fixed inset-0 z-[15] h-full w-full overflow-visible ${fade}`}>
        <line ref={leader} className="stroke-glow/70" strokeWidth="1" strokeDasharray="3 3" />
        <circle ref={dot} r="3.5" className="fill-glow" style={{ filter: 'drop-shadow(0 0 6px var(--color-glow))' }} />
      </svg>
      <div ref={box} className="pointer-events-none fixed left-0 top-0 z-[15] w-[min(360px,calc(100vw-32px))]">
        <div
          className={`relative rounded-2xl border border-glow/60 bg-void/90 p-4 shadow-[0_0_40px_-12px_var(--color-glow)] backdrop-blur-md md:p-5 ${fade}`}
        >
          {children}
          <div ref={tail} aria-hidden className="absolute left-0 top-0">
            <svg width={TAIL * 2} height={TAIL + 1} viewBox={`0 0 ${TAIL * 2} ${TAIL + 1}`} className="block overflow-visible">
              <path d={`M0 0 L${TAIL} ${TAIL} L${TAIL * 2} 0`} className="fill-void/90 stroke-glow/60" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
