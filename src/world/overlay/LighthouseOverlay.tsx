import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';
import { useWorld } from '../store';
import { albumAt, keysAt, lighthouseLocal } from '../acts/Act4Lighthouse/timeline';
import { roman } from '../lib/roman';
import type { StackSheet } from '../types';

const arrow =
  'grid h-11 w-11 place-items-center rounded-full border border-white/10 text-mist transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow';

/**
 * Overlay del Acto 4: la pista del piano mientras las teclas se pueden tocar y, frente al atril,
 * el control del álbum (movimiento actual, ← →, teclado) con la lista de la hoja para lectores de
 * pantalla (el texto de las páginas vive en un canvas).
 */
export function LighthouseOverlay({ stack }: { stack: StackSheet[] }) {
  const { t, pick } = useT();
  const page = useWorld((s) => s.albumPage);
  const muted = useWorld((s) => s.audio.muted);
  const [album, setAlbum] = useState(false);
  const [keys, setKeys] = useState(false);
  const n = stack.length;

  // Visibilidad según el scroll; React solo re-renderiza al cruzar los umbrales.
  useEffect(() => {
    const paint = (progress: number) => {
      const local = lighthouseLocal(progress);
      const inAct = useWorld.getState().activeAct === 4;
      setAlbum(inAct && albumAt(local) > 0.5);
      setKeys(inAct && keysAt(local) > 0.5);
    };
    paint(useWorld.getState().progress);
    return useWorld.subscribe((s) => paint(s.progress));
  }, []);

  const go = (delta: number) => {
    const { albumPage, setAlbumPage } = useWorld.getState();
    setAlbumPage(Math.min(Math.max(albumPage + delta, 0), n - 1));
  };

  useEffect(() => {
    if (!album) return;
    const onKey = (e: KeyboardEvent) => {
      if (useWorld.getState().focus || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [album, n]);

  const sheet = stack[Math.min(page, n - 1)];
  if (!sheet) return null;
  const label = (item: StackSheet['items'][number]) => (typeof item.label === 'string' ? item.label : pick(item.label));

  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 bottom-28 z-10 text-center transition-opacity duration-700 motion-reduce:transition-none ${
          keys ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-xs uppercase tracking-[0.35em] text-mist [text-shadow:0_2px_14px_rgba(5,6,10,0.9)]">{t('piano.hint')}</p>
        {muted && <p className="mt-2 text-xs text-mist/70">{t('piano.muted')}</p>}
      </div>

      <div
        className={`fixed inset-x-0 bottom-24 z-10 flex justify-center px-4 transition-[opacity,transform] duration-500 motion-reduce:transition-none ${
          album ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-void/70 py-1.5 pl-1.5 pr-1.5 backdrop-blur-md">
          <button type="button" tabIndex={album ? 0 : -1} disabled={page <= 0} onClick={() => go(-1)} aria-label={t('stack.prev')} className={arrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="min-w-[10rem] text-center">
            <p className="font-mono text-[11px] tracking-widest text-glow">
              {roman(page + 1)} <span className="text-mist/60">/ {roman(n)}</span>
            </p>
            <p className="font-display text-lg leading-tight text-ink">{pick(sheet.title)}</p>
          </div>
          <button type="button" tabIndex={album ? 0 : -1} disabled={page >= n - 1} onClick={() => go(1)} aria-label={t('stack.next')} className={arrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <p className={`pointer-events-none fixed inset-x-0 bottom-[4.6rem] z-10 hidden text-center text-[11px] tracking-wide text-mist/70 transition-opacity duration-500 [@media(hover:hover)]:block ${album ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
        {t('stack.hint')} · {t('stack.keys')}
      </p>

      {/* Lo que dice la hoja abierta, para lectores de pantalla. */}
      <div className="sr-only" aria-live="polite">
        {album && (
          <>
            <p>
              {t('stack.page', { n: String(page + 1), total: String(n) })}: {pick(sheet.title)}. {pick(sheet.epigraph)}
            </p>
            <ul>
              {sheet.items.map((item) => (
                <li key={label(item)}>
                  {label(item)}
                  {item.note ? ` (${pick(item.note)})` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
