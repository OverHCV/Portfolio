import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';
import { milestoneDates } from '../../i18n/dates';
import { useWorld } from '../store';
import { MILESTONE_COLORS } from '../theme';
import type { Milestone } from '../types';

/**
 * Tarjeta breve del Acto 3: la medusa en hover o la más cercana en el recorrido (`nearMilestone`,
 * lo escribe la escena). Tipo · organización, título y fechas; el botón abre el panel del hito.
 */
export function JourneyOverlay({ milestones }: { milestones: Milestone[] }) {
  const { t, pick, lang } = useT();
  const nearId = useWorld((s) => s.nearMilestone);
  // Se conserva el último hito mientras la tarjeta se desvanece.
  const [shownId, setShownId] = useState<string | null>(null);
  useEffect(() => {
    if (nearId) setShownId(nearId);
  }, [nearId]);

  const milestone = milestones.find((m) => m.id === shownId);
  if (!milestone) return null;
  const visible = nearId !== null;
  const color = MILESTONE_COLORS[milestone.kind];

  return (
    <div
      className={`fixed inset-x-6 bottom-28 z-10 max-w-sm transition-[opacity,transform] duration-500 motion-reduce:transition-none md:inset-x-auto md:left-[8vw] md:bottom-24 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <div key={milestone.id} className="rounded-2xl border border-white/10 bg-void/70 p-5 backdrop-blur-md">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]" style={{ color }}>
          <span aria-hidden className="block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          {t(`milestone.kind.${milestone.kind}`)} <span className="text-mist">· {milestone.org}</span>
        </p>
        <h2 className="mt-3 font-display text-2xl leading-tight text-ink">{pick(milestone.title)}</h2>
        <p className="mt-2 font-mono text-xs tracking-wide text-mist">{milestoneDates(milestone, lang, t('milestone.present'))}</p>
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={() => useWorld.getState().setFocus({ kind: 'milestone', id: milestone.id })}
          className="mt-4 text-xs uppercase tracking-[0.25em] text-glow transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow"
        >
          {t('journey.open')} →
        </button>
      </div>
    </div>
  );
}
