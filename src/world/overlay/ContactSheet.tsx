import { useEffect, useId, useState, type FormEvent } from 'react';
import { useWorld } from '../store';
import { useT } from '../../i18n/useT';
import { canSubmit, mailtoHref, MESSAGE_MAX, submitContact, validateContact, type ContactErrors, type ContactMessage } from '../lib/contact';
import type { Post, Site } from '../types';
import { useDialog } from './useDialog';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const EMPTY: ContactMessage = { name: '', email: '', subject: '', message: '', botcheck: '' };

const NETWORKS: Record<string, string> = { github: 'GitHub', linkedin: 'LinkedIn', dribbble: 'Dribbble', twitter: 'Twitter' };

/**
 * La hoja que sale del buzón (Acto 5): formulario de contacto en papel, la mención del blog si hay
 * posts y los sellos postales con las redes. Envía por Web3Forms; sin servicio o si falla, `mailto:`.
 */
export function ContactSheet({ site, posts }: { site: Site; posts: Post[] }) {
  const { t, pick } = useT();
  const open = useWorld((s) => s.focus?.kind === 'contact');
  const close = () => useWorld.getState().setFocus(null);
  const { mounted, panel, backdrop, initialFocus, onKeyDown } = useDialog(open, close, 'rise');
  const [form, setForm] = useState<ContactMessage>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const id = useId();

  // Una carta enviada no se reabre enviada: la siguiente vez la hoja vuelve en blanco.
  useEffect(() => {
    if (!mounted && status === 'sent') {
      setForm(EMPTY);
      setStatus('idle');
    }
  }, [mounted]);

  if (!mounted) return null;

  const set = (field: keyof ContactMessage) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (field in errors) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateContact(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (!canSubmit) {
      window.location.href = mailtoHref(site.email, form);
      return;
    }
    setStatus('sending');
    setStatus((await submitContact(form)) ? 'sent' : 'error');
  }

  const field =
    'w-full border-0 border-b border-paper-ink/25 bg-transparent px-0 py-2 text-paper-ink placeholder:text-paper-ink/35 focus:border-paper-ink focus:outline-none focus:ring-0';
  const label = 'block font-mono text-[11px] uppercase tracking-[0.2em] text-paper-ink/60';
  const error = 'mt-1 text-xs text-ember';
  const socials = Object.entries(site.socials).filter(([, url]) => url);

  return (
    <>
      <div ref={backdrop} className="fixed inset-0 z-30 bg-void/55 backdrop-blur-[3px]" onClick={close} aria-hidden />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
        className="fixed inset-x-3 bottom-3 top-auto z-40 mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-sm bg-paper p-6 text-paper-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:p-10"
        style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 31px, rgba(27,26,23,0.06) 31px 32px)' }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-paper-ink/55">
              {t('contact.to')} · {site.email}
            </p>
            <h2 id={`${id}-title`} className="mt-3 font-display text-3xl leading-tight md:text-4xl">
              {t('city.mail.title')}
            </h2>
          </div>
          <button
            ref={initialFocus}
            type="button"
            onClick={close}
            aria-label={t('panel.close')}
            className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper-ink/60 transition-colors hover:text-paper-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-paper-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {status === 'sent' ? (
          <div className="mt-8" role="status">
            <p className="font-display text-2xl">{t('contact.sent.title')}</p>
            <p className="mt-2 text-paper-ink/70">{t('contact.sent.body', { email: form.email.trim() })}</p>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setStatus('idle');
              }}
              className="mt-6 font-mono text-xs uppercase tracking-[0.25em] underline-offset-4 hover:underline"
            >
              {t('contact.again')}
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor={`${id}-name`} className={label}>
                  {t('contact.name')}
                </label>
                <input id={`${id}-name`} className={field} value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={errors.name} maxLength={120} />
                {errors.name && <p className={error}>{t('contact.invalid.name')}</p>}
              </div>
              <div>
                <label htmlFor={`${id}-email`} className={label}>
                  {t('contact.from')}
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  className={field}
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  aria-invalid={errors.email}
                  maxLength={200}
                />
                {errors.email && <p className={error}>{t('contact.invalid.email')}</p>}
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-subject`} className={label}>
                {t('contact.subject')}
              </label>
              <input id={`${id}-subject`} className={field} value={form.subject} onChange={set('subject')} maxLength={160} />
            </div>
            <div>
              <label htmlFor={`${id}-message`} className={label}>
                {t('contact.message')}
              </label>
              <textarea
                id={`${id}-message`}
                rows={5}
                className={`${field} resize-none`}
                value={form.message}
                onChange={set('message')}
                aria-invalid={errors.message}
                maxLength={MESSAGE_MAX}
              />
              {errors.message && <p className={error}>{t('contact.invalid.message')}</p>}
            </div>
            {/* Honeypot: invisible para personas, tentador para bots. */}
            <input type="text" name="botcheck" tabIndex={-1} autoComplete="off" className="hidden" value={form.botcheck} onChange={set('botcheck')} aria-hidden />

            {status === 'error' && (
              <p className="text-sm text-ember" role="alert">
                {t('contact.error')}{' '}
                <a className="underline underline-offset-4" href={mailtoHref(site.email, form)}>
                  {t('contact.fallback')}
                </a>
              </p>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="rounded-full bg-paper-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] text-paper transition-opacity hover:opacity-85 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-ink"
              >
                {status === 'sending' ? t('contact.sending') : t('contact.send')}
              </button>
              <a className="text-right text-xs text-paper-ink/60 underline-offset-4 hover:underline" href={mailtoHref(site.email, form)}>
                {t('contact.fallback')}
              </a>
            </div>
          </form>
        )}

        {posts.length > 0 && (
          <div className="mt-8 border-t border-paper-ink/15 pt-5">
            <p className={label}>{t('contact.alsoWrite')}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {posts.slice(0, 3).map((post) => (
                <li key={post.slug}>{pick(post.title)}</li>
              ))}
            </ul>
          </div>
        )}

        {socials.length > 0 && (
          <div className="mt-8 border-t border-paper-ink/15 pt-5">
            <p className={label}>{t('contact.socials')}</p>
            <ul className="mt-4 flex flex-wrap gap-4">
              {socials.map(([network, url], i) => (
                <li key={network}>
                  {/* Sello postal: círculo con borde dentado y el nombre de la red. */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('contact.stamp', { network: NETWORKS[network] ?? network })}
                    className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-paper-ink/45 text-center font-mono text-[10px] uppercase leading-tight tracking-[0.15em] text-paper-ink/80 transition-transform duration-300 hover:scale-105 hover:border-paper-ink hover:text-paper-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-ink motion-reduce:transition-none"
                    style={{ transform: `rotate(${[-8, 6, -3, 9][i % 4]}deg)` }}
                  >
                    <span className="grid h-[4.1rem] w-[4.1rem] place-items-center rounded-full border border-paper-ink/30">{NETWORKS[network] ?? network}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </>
  );
}
