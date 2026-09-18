import type { Lang } from './langs';
import type { Milestone } from '../world/types';

/** "2021-01" → "ene 2021" / "Jan 2021". */
export function formatMonth(ym: string, lang: Lang): string {
  const [year, month] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Fechas de un hito. Certificaciones y reconocimientos sin `end` tienen fecha de emisión, no un periodo
 * (mismo criterio que el HTML semántico de index.astro).
 */
export function milestoneDates(m: Milestone, lang: Lang, present: string): string {
  const start = formatMonth(m.start, lang);
  if (!m.end && (m.kind === 'certification' || m.kind === 'award')) return start;
  return `${start} – ${m.end ? formatMonth(m.end, lang) : present}`;
}
