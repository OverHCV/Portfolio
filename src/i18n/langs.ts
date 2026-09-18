/** Idiomas activos. Para activar japonés: añadir 'ja' aquí, crear ja.json y los campos `ja` del contenido. */
export const SUPPORTED_LANGS = ['en', 'es'] as const;
export const DEFAULT_LANG = 'en';
export const LANG_STORAGE_KEY = 'lang';

export type Lang = 'en' | 'es' | 'ja';
export type ActiveLang = (typeof SUPPORTED_LANGS)[number];

export function isSupported(value: string | null | undefined): value is ActiveLang {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);
}
