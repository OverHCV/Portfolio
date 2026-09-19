import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/motion';

/** Tiempo que se queda cada captura antes de pasar a la siguiente. */
const SHOT_MS = 3200;

interface Props {
  images: string[];
  /** Texto alternativo base; cada captura añade su número. */
  alt: string;
  /** Avanzan solas mientras es true (la burbuja visible, el panel abierto). */
  playing: boolean;
  /** Puntos para elegir captura a mano (teclado, pantallas táctiles). */
  dots?: boolean;
  /** Etiqueta accesible de cada punto: recibe el número de captura. */
  dotLabel?: (n: number) => string;
  className?: string;
  /** Proporción del visor (clases de Tailwind). */
  ratio?: string;
}

/**
 * Carrusel infinito de las capturas de un proyecto: avanza solo hacia la izquierda y, tras la
 * última, sigue con la primera sin rebobinar (la pista lleva una copia de la primera al final y
 * salta a la original sin animación). Con reduced motion cambia de captura sin deslizar.
 */
export function ProjectShots({ images, alt, playing, dots = false, dotLabel, className = '', ratio = 'aspect-video' }: Props) {
  const reduced = useReducedMotion();
  const count = images.length;
  // 0..count; `count` es la copia de la primera.
  const [slot, setSlot] = useState(0);
  const [animate, setAnimate] = useState(true);
  // Cambia al elegir a mano: reinicia la cuenta del avance automático.
  const [manual, setManual] = useState(0);

  useEffect(() => setSlot(0), [images]);

  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setInterval(() => {
      setAnimate(!reduced);
      setSlot((s) => (reduced ? (s + 1) % count : Math.min(s + 1, count)));
    }, SHOT_MS);
    return () => window.clearInterval(timer);
  }, [playing, reduced, count, manual]);

  // Tras el salto sin animación de la copia a la original, vuelve a animar en el frame siguiente.
  useEffect(() => {
    if (animate || reduced) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setAnimate(true))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [animate, reduced]);

  if (count === 0) return null;
  const current = slot % count;
  const slides = count > 1 ? [...images, images[0]] : images;

  return (
    <div className={className}>
      <div className={`relative ${ratio} overflow-hidden rounded-xl border border-white/10 bg-void`}>
        <div
          className={`flex h-full ${animate ? 'transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]' : ''}`}
          style={{ transform: `translateX(-${slot * 100}%)` }}
          onTransitionEnd={() => {
            if (slot < count) return;
            setAnimate(false);
            setSlot(0);
          }}
        >
          {slides.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt={count > 1 && i < count ? `${alt} (${i + 1}/${count})` : alt}
              aria-hidden={i !== slot || i === count}
              decoding="async"
              draggable={false}
              className="h-full w-full shrink-0 object-cover"
            />
          ))}
        </div>
      </div>
      {dots && count > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => {
                setAnimate(!reduced);
                setSlot(i);
                setManual((m) => m + 1);
              }}
              aria-label={dotLabel ? dotLabel(i + 1) : `${i + 1}`}
              aria-current={i === current}
              className="grid h-6 w-6 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
            >
              <span className={`block h-1.5 w-1.5 rounded-full transition-colors ${i === current ? 'bg-glow' : 'bg-white/25'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
