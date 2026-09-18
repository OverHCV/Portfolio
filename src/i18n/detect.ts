import { DEFAULT_LANG, LANG_STORAGE_KEY, isSupported, type ActiveLang } from './langs';

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Orden: ?lang= → localStorage → navigator.languages → inglés.
 * Base.astro repite esta lógica en un script inline para fijar <html lang> antes del primer paint;
 * si cambias una, cambia la otra.
 */
export function detectLang(): ActiveLang {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isSupported(fromUrl)) return fromUrl;

  const stored = safeStorageGet(LANG_STORAGE_KEY);
  if (isSupported(stored)) return stored;

  for (const tag of navigator.languages ?? [navigator.language]) {
    const prefix = tag.toLowerCase().split('-')[0];
    if (isSupported(prefix)) return prefix;
  }
  return DEFAULT_LANG;
}

/** Idioma ya resuelto por el script inline de Base.astro. */
export function initialLang(): ActiveLang {
  const fromHtml = document.documentElement.lang;
  return isSupported(fromHtml) ? fromHtml : detectLang();
}

export function persistLang(lang: ActiveLang) {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Modo privado / almacenamiento bloqueado: la elección vale solo para esta visita.
  }
}
