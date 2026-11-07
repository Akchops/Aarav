/**
 * Contact form: inline validation (on blur, then live once a field has shown an
 * error), a fetch submit to the Pages Function, and toasts for the outcome.
 * Without JS the form still posts and the function answers with an HTML page.
 */
import { site } from '../data/site';
import { validateField, type Field } from './validate';
import { toast } from './toast';

const FIELDS: Field[] = ['name', 'email', 'message'];

export function initContactForm() {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const touched = new Set<Field>();

  const input = (f: Field) => form.elements.namedItem(f) as HTMLInputElement | HTMLTextAreaElement;
  const errorEl = (f: Field) => form.querySelector<HTMLElement>(`[data-error-for="${f}"]`)!;

  const show = (f: Field, msg?: string) => {
    const el = input(f);
    errorEl(f).textContent = msg ?? '';
    if (msg) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  };
  const check = (f: Field) => {
    const msg = validateField(f, input(f).value);
    show(f, msg);
    return !msg;
  };

  FIELDS.forEach((f) => {
    const el = input(f);
    el.addEventListener('blur', () => {
      if (el.value.trim() || touched.has(f)) {
        touched.add(f);
        check(f);
      }
    });
    el.addEventListener('input', () => {
      if (touched.has(f)) check(f);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    FIELDS.forEach((f) => touched.add(f));
    const results = FIELDS.map((f) => [f, check(f)] as const);
    const firstBad = results.find(([, ok]) => !ok);
    if (firstBad) {
      input(firstBad[0]).focus();
      return;
    }

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    const label = submit.textContent;
    submit.textContent = 'Sending…';
    const fallback = `Email ${site.email}, or message ${site.phoneDisplay} on WhatsApp.`;

    try {
      const body = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: Partial<Record<Field, string>> };

      if (res.ok && data.ok) {
        toast.dismiss();
        toast.success('Message sent', { description: 'It is on its way to Aarav’s inbox.' });
        form.reset();
        touched.clear();
        FIELDS.forEach((f) => show(f));
      } else if (res.status === 400 && data.errors) {
        FIELDS.forEach((f) => show(f, data.errors?.[f]));
        const bad = FIELDS.find((f) => data.errors?.[f]);
        if (bad) input(bad).focus();
        else toast.error(data.error || 'Please check the form and try again.', { id: 'contact' });
      } else if (res.status === 429) {
        toast.error('Too many messages from this connection', { id: 'contact', description: `Try again later. ${fallback}` });
      } else {
        toast.error(data.error || 'The message could not be sent', { id: 'contact', description: fallback });
      }
    } catch {
      toast.error('The message could not be sent', { id: 'contact', description: `Check your connection. ${fallback}` });
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
    }
  });
}
