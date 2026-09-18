import { DEFAULT_LANG, SUPPORTED_LANGS, type Lang } from './langs';
import type { L10n } from '../world/types';
import en from './en.json';
import es from './es.json';

// Módulo puro (sin store ni DOM): lo usan tanto Astro en build como la isla en el navegador.

type Dict = Record<string, string>;
const DICTS: Partial<Record<Lang, Dict>> = { en, es };

export function translate(lang: Lang, key: string, vars?: Record<string, string>): string {
  const raw = DICTS[lang]?.[key] ?? DICTS[DEFAULT_LANG]?.[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? `{${name}}`);
}

export function pickL10n(field: L10n, lang: Lang): string {
  return field[lang] ?? field[DEFAULT_LANG];
}

/** Una cadena de UI en todos los idiomas activos, para el HTML semántico. */
export function uiL10n(key: string): L10n {
  const out = { en: '', es: '' } as L10n;
  for (const lang of SUPPORTED_LANGS) out[lang] = translate(lang, key);
  return out;
}
