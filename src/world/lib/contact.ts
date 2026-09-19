/**
 * Envío del formulario del buzón (ARCHITECTURE.md §10). Web3Forms desde el navegador: la
 * `access_key` es pública por diseño (solo permite escribirme a mí). Sin key, o si falla, queda el
 * `mailto:` con los campos pre-rellenados.
 */
export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: si un bot lo llena, no se envía. */
  botcheck: string;
}

const ENDPOINT = 'https://api.web3forms.com/submit';
const KEY: string | undefined = import.meta.env.PUBLIC_WEB3FORMS_KEY;

export const MESSAGE_MAX = 5000;

/** true si hay servicio de envío configurado; si no, el formulario abre Gmail web pre-rellenado. */
export const canSubmit = Boolean(KEY);

export type ContactErrors = Partial<Record<'name' | 'email' | 'message', true>>;

export function validateContact(m: ContactMessage): ContactErrors {
  const errors: ContactErrors = {};
  if (!m.name.trim() || m.name.length > 120) errors.name = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim()) || m.email.length > 200) errors.email = true;
  if (!m.message.trim() || m.message.length > MESSAGE_MAX) errors.message = true;
  return errors;
}

type Draft = Pick<ContactMessage, 'name' | 'subject' | 'message'>;

function composeBody(m: Draft): string {
  return m.name ? `${m.message}\n\n— ${m.name}` : m.message;
}

export function mailtoHref(to: string, m: Draft): string {
  return `mailto:${to}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(composeBody(m))}`;
}

/** Redacción de Gmail web pre-rellenada: no depende de que el sistema tenga cliente de correo. */
export function gmailHref(to: string, m: Draft): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: m.subject, body: composeBody(m) });
  return `https://mail.google.com/mail/?${params}`;
}

/** Envía el mensaje. Resuelve true si llegó; false si falló (el llamador ofrece el mailto). */
export async function submitContact(m: ContactMessage): Promise<boolean> {
  if (m.botcheck) return true;
  if (!KEY) return false;
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: KEY,
        name: m.name.trim(),
        email: m.email.trim(),
        subject: m.subject.trim() || `Portfolio — ${m.name.trim()}`,
        message: m.message.trim(),
        from_name: 'Portfolio',
      }),
    });
    const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
    return response.ok && data?.success === true;
  } catch {
    return false;
  }
}
