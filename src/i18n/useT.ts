import { useCallback } from 'react';
import { useWorld } from '../world/store';
import { pickL10n, translate } from './translate';
import type { L10n } from '../world/types';

/** Cadenas de UI (`t`) y campos de contenido localizados (`pick`) en el idioma activo. */
export function useT() {
  const lang = useWorld((s) => s.lang);
  const t = useCallback((key: string, vars?: Record<string, string>) => translate(lang, key, vars), [lang]);
  const pick = useCallback((field: L10n) => pickL10n(field, lang), [lang]);
  return { lang, t, pick };
}
