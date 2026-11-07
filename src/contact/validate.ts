/**
 * Contact validation — shared by the browser (inline errors) and the Pages
 * Function (the real check). Same rules, same messages, one file.
 */
export interface ContactInput {
  name: string;
  email: string;
  message: string;
}
export type Field = keyof ContactInput;
export type FieldErrors = Partial<Record<Field, string>>;

export const LIMITS = { name: 100, email: 254, messageMin: 10, messageMax: 5000 } as const;

// Pragmatic address check: something@something.tld, no spaces or angle brackets.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

/** Strip control characters (keeps newlines and tabs in the message) and trim. */
export function clean(v: unknown, multiline = false): string {
  const s = typeof v === 'string' ? v : '';
  // eslint-disable-next-line no-control-regex
  const re = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return s.replace(re, '').trim();
}

export function validateField(field: Field, raw: string): string | undefined {
  const v = clean(raw, field === 'message');
  switch (field) {
    case 'name':
      if (!v) return 'Enter your name.';
      if (v.length > LIMITS.name) return `Keep your name under ${LIMITS.name} characters.`;
      return;
    case 'email':
      if (!v) return 'Enter your email address, so Aarav can reply.';
      if (v.length > LIMITS.email || !EMAIL_RE.test(v)) return 'Enter an email address like name@example.com.';
      return;
    case 'message':
      if (v.length < LIMITS.messageMin) return `Tell Aarav a little about the project — at least ${LIMITS.messageMin} characters.`;
      if (v.length > LIMITS.messageMax) return 'Keep the message under 5,000 characters.';
      return;
  }
}

export function validate(input: Record<string, unknown>): { ok: true; value: ContactInput } | { ok: false; errors: FieldErrors } {
  const value: ContactInput = {
    name: clean(input.name),
    email: clean(input.email),
    message: clean(input.message, true),
  };
  const errors: FieldErrors = {};
  (['name', 'email', 'message'] as Field[]).forEach((f) => {
    const e = validateField(f, value[f]);
    if (e) errors[f] = e;
  });
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
