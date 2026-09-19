import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/motion';

/** Tiempo que se queda cada captura mientras rotan. */
const SHOT_MS = 2500;

interface Props {
  images: string[];
  /** Texto alternativo base; cada captura añade su número. */
  alt: string;
  /** Rotan solo mientras es true (hover del chip o del propio visor). */
  playing: boolean;
  /** Puntos para elegir captura a mano (teclado, pantallas táctiles). */
  dots?: boolean;
  /** Etiqueta accesible de cada punto: recibe el número de captura. */
  dotLabel?: (n: number) => string;
  className?: string;
  /** Proporción del visor (clases de Tailwind). */
  ratio?: string;
}

/** Capturas de un proyecto apiladas (16:9 por defecto), con fundido entre una y otra. */
export function ProjectShots({ images, alt, playing, dots = false, dotLabel, className = '', ratio = 'aspect-video' }: Props) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = images.length;

  useEffect(() => setIndex(0), [images]);

  useEffect(() => {
    if (!playing || reduced || count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), SHOT_MS);
    return () => window.clearInterval(timer);
  }, [playing, reduced, count]);

  if (count === 0) return null;

  return (
    <div className={className}>
      <div className={`relative ${ratio} overflow-hidden rounded-xl border border-white/10 bg-void`}>
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={count > 1 ? `${alt} (${i + 1}/${count})` : alt}
            aria-hidden={i !== index}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      {dots && count > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={dotLabel ? dotLabel(i + 1) : `${i + 1}`}
              aria-current={i === index}
              className="grid h-6 w-6 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
            >
              <span className={`block h-1.5 w-1.5 rounded-full transition-colors ${i === index ? 'bg-glow' : 'bg-white/25'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
