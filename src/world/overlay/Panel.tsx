import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorld, type Focus } from '../store';
import { useT } from '../../i18n/useT';
import { revealText } from '../lib/anim';
import { DUR, MILESTONE_COLORS } from '../theme';
import { milestoneDates } from '../../i18n/dates';
import type { Lang } from '../../i18n/langs';
import type { L10n, WorldContent } from '../types';
import { useDialog } from './useDialog';

interface PanelItem {
  /** Clave de traducción. */
  eyebrow: string;
  /** Color del eyebrow (p. ej. el de la medusa). */
  accent?: string;
  title: L10n;
  /** Línea bajo el título: organización, fechas. */
  meta?: string;
  body: L10n;
  chips?: string[];
  links?: { href: string; label: string }[];
}

type Detail = Exclude<NonNullable<Focus>, { kind: 'contact' } | { kind: 'score' }>;

/**
 * Traduce el `focus` del store al contenido del panel. La bio del Acto 2 no usa panel (se lee en
 * capítulos) y el contacto tiene su propia hoja (ContactSheet).
 */
function resolve(
  focus: Detail,
  content: WorldContent,
  lang: Lang,
  t: (key: string) => string,
  pick: (field: L10n) => string,
): PanelItem | null {
  if (focus.kind === 'milestone') {
    const m = content.milestones.find((x) => x.id === focus.id);
    if (!m) return null;
    return {
      eyebrow: `milestone.kind.${m.kind}`,
      accent: MILESTONE_COLORS[m.kind],
      title: m.title,
      meta: `${m.org} · ${milestoneDates(m, lang, t('milestone.present'))}`,
      body: m.details ?? m.summary,
      chips: m.stack,
      links: m.credentialUrl ? [{ href: m.credentialUrl, label: t('panel.credential') }] : undefined,
    };
  }
  const p = content.projects.find((x) => x.id === focus.id);
  if (!p) return null;
  const links = [
    p.links.repo && { href: p.links.repo, label: t('project.repo') },
    p.links.demo && { href: p.links.demo, label: t('project.demo') },
    ...(p.links.extra ?? []).map((l) => ({ href: l.url, label: typeof l.label === 'string' ? l.label : pick(l.label) })),
  ].filter((l): l is { href: string; label: string } => Boolean(l));
  return {
    eyebrow: 'project.eyebrow',
    title: p.title,
    meta: [String(p.year), p.role && pick(p.role)].filter(Boolean).join(' · '),
    body: p.description,
    chips: p.stack,
    links,
  };
}

const isDetail = (f: Focus): f is Detail => f !== null && (f.kind === 'milestone' || f.kind === 'project');

/**
 * Panel de detalle en DOM (derecha en desktop, hoja inferior en móvil): hitos y proyectos.
 * Mientras está abierto: scroll pausado, foco atrapado, Esc o clic fuera cierra (useDialog).
 */
export function Panel({ content }: { content: WorldContent }) {
  const { t, pick, lang } = useT();
  const focus = useWorld((s) => s.focus);
  // Se conserva el último contenido mientras el panel anima la salida.
  const [shown, setShown] = useState<Detail | null>(null);
  useEffect(() => {
    if (isDetail(focus)) setShown(focus);
  }, [focus]);
  const close = () => useWorld.getState().setFocus(null);
  const { mounted, panel, backdrop, initialFocus, onKeyDown } = useDialog(isDetail(focus), close);
  const title = useRef<HTMLHeadingElement>(null);

  const item = shown ? resolve(shown, content, lang, t, pick) : null;
  const itemKey = shown ? `${JSON.stringify(shown)}-${lang}` : '';

  // Título por palabras cada vez que cambia el contenido o el idioma.
  useLayoutEffect(() => {
    if (!title.current) return;
    return revealText(title.current, { by: 'words', delay: 0.15, duration: DUR.base });
  }, [itemKey, mounted]);

  if (!mounted || !item) return null;

  return (
    <>
      <div ref={backdrop} className="fixed inset-0 z-30 bg-void/40 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onKeyDown={onKeyDown}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-void/85 p-6 pb-10 backdrop-blur-xl md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-l md:p-10"
      >
        <div className="flex items-start justify-between gap-6">
          <p className="text-xs uppercase tracking-[0.3em] text-glow" style={item.accent ? { color: item.accent } : undefined}>
            {t(item.eyebrow)}
          </p>
          <button
            ref={initialFocus}
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
        {item.meta && <p className="mt-3 font-mono text-xs tracking-wide text-mist">{item.meta}</p>}
        <p className="mt-6 leading-relaxed text-mist">{pick(item.body)}</p>
        {item.chips && item.chips.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {item.chips.map((chip) => (
              <li key={chip} className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-ink/80">
                {chip}
              </li>
            ))}
          </ul>
        )}
        {item.links && item.links.length > 0 && (
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {item.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.25em] text-glow underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
              >
                {link.label} ↗
              </a>
            ))}
          </p>
        )}
      </aside>
    </>
  );
}
