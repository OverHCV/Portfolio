import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';
import { useWorld } from '../store';
import { ACTS } from '../acts.config';
import { cityLocal, mailboxAt } from '../acts/Act5City/timeline';
import type { Project } from '../types';

/** Umbral de `mailboxAt` a partir del que la tarjeta del proyecto deja paso a la del buzón. */
const MAILBOX_CARD = 0.5;

/**
 * Overlay del Acto 5: tarjeta breve del chip en hover o del más cercano (`nearProject`), la
 * invitación del buzón al final del recorrido y, para teclado y lectores de pantalla, la lista de
 * proyectos como botones (se ve al recibir foco).
 */
export function CityOverlay({ projects }: { projects: Project[] }) {
  const { t, pick } = useT();
  const active = useWorld((s) => s.activeAct === 5);
  const nearId = useWorld((s) => s.nearProject);
  const atMailbox = useWorld((s) => s.activeAct === 5 && mailboxAt(cityLocal(s.progress)) > MAILBOX_CARD);
  const hint = useWorld((s) => s.activeAct === 5 && s.progress < ACTS[4].start + (ACTS[4].end - ACTS[4].start) * 0.3);
  // Se conserva el último proyecto mientras la tarjeta se desvanece.
  const [shownId, setShownId] = useState<string | null>(null);
  useEffect(() => {
    if (nearId) setShownId(nearId);
  }, [nearId]);

  if (!active) return null;
  const project = projects.find((p) => p.id === shownId);
  const index = projects.findIndex((p) => p.id === shownId);
  const cardVisible = nearId !== null && !atMailbox;
  const open = (id: string) => useWorld.getState().setFocus({ kind: 'project', id });

  const card = 'rounded-2xl border border-white/10 bg-void/70 p-5 backdrop-blur-md';
  const cta =
    'mt-4 text-xs uppercase tracking-[0.25em] text-glow transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow';

  return (
    <>
      <div
        className={`fixed inset-x-6 bottom-28 z-10 max-w-sm transition-[opacity,transform] duration-500 motion-reduce:transition-none md:inset-x-auto md:left-[8vw] md:bottom-24 ${
          cardVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {project && (
          <div key={project.id} className={card}>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-glow">
              <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-glow shadow-[0_0_10px_var(--color-glow)]" />
              U{index + 1} <span className="text-mist">· {project.year}</span>
            </p>
            <h2 className="mt-3 font-display text-2xl leading-tight text-ink">{pick(project.title)}</h2>
            {project.role && <p className="mt-1 font-mono text-xs tracking-wide text-mist">{pick(project.role)}</p>}
            <p className="mt-3 text-sm leading-relaxed text-mist">{pick(project.summary)}</p>
            <button type="button" tabIndex={cardVisible ? 0 : -1} onClick={() => open(project.id)} className={cta}>
              {t('city.open')} →
            </button>
          </div>
        )}
      </div>

      <div
        className={`fixed inset-x-6 bottom-28 z-10 max-w-sm transition-[opacity,transform] duration-500 motion-reduce:transition-none md:inset-x-auto md:left-[8vw] md:bottom-24 ${
          atMailbox ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <div className={card}>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-glow">{t('contact.title')}</p>
          <h2 className="mt-3 font-display text-2xl leading-tight text-ink">{t('city.mail.title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-mist">{t('city.mail.body')}</p>
          <button type="button" tabIndex={atMailbox ? 0 : -1} onClick={() => useWorld.getState().setFocus({ kind: 'contact' })} className={cta}>
            {t('city.mail.open')} →
          </button>
        </div>
      </div>

      <p
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-8 z-10 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-mist transition-opacity duration-700 ${
          hint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {t('city.hint')}
      </p>

      {/* Índice para teclado: invisible hasta que recibe el foco. */}
      <nav aria-label={t('city.list')} className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:right-6 focus-within:top-6 focus-within:z-20">
        <ul className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-void/85 p-3 backdrop-blur-md">
          {projects.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => open(p.id)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
              >
                <span className="font-mono text-xs text-glow">U{i + 1}</span> {pick(p.title)}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => useWorld.getState().setFocus({ kind: 'contact' })}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
            >
              <span className="font-mono text-xs text-glow">✉</span> {t('city.mail.open')}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
