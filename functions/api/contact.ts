/**
 * POST /api/contact — Cloudflare Pages Function (PLAN.md §9a).
 *
 * validate -> spam checks -> rate limit -> send via Resend -> respond.
 * Fails closed: if the rate-limit store or the email provider is unavailable,
 * nothing is sent and the visitor is pointed at the direct routes.
 *
 * Free-tier ceilings (checked 2026-11-07): Workers Free 100,000 requests/day and
 * 10 ms CPU/request; KV 1,000 writes/day; Resend free 100 emails/day, 3,000/month.
 */
import { validate, type FieldErrors } from '../../src/contact/validate';
import { checkToken, hmacHex } from '../../server/token';
import { resultPage } from '../../server/page';

interface Env {
  RATE_KV: KVNamespace;
  CONTACT_TO: string;
  MAIL_FROM: string;
  RESEND_API_KEY?: string;
  FORM_HMAC_KEY?: string;
  /** "1" in local development: log instead of calling Resend. */
  MAIL_DRY_RUN?: string;
}

const MAX_BODY = 10 * 1024;
const WINDOW_SHORT = { seconds: 600, limit: 3 };      // 3 per 10 minutes per IP
const WINDOW_DAY = { seconds: 86400, limit: 10 };     // 10 per day per IP

type Outcome =
  | { status: 200 }
  | { status: 400; error: string; errors?: FieldErrors }
  | { status: 413 | 415; error: string }
  | { status: 429; error: string; retryAfter: number }
  | { status: 503; error: string };

const DIRECT = 'Email aaravchopra1202@gmail.com, or message 9049512356 on WhatsApp.';

function respond(o: Outcome, wantsJson: boolean): Response {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (o.status === 429) headers['Retry-After'] = String(o.retryAfter);
  if (wantsJson) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    const body = o.status === 200 ? { ok: true } : { ok: false, error: o.error, ...(o.status === 400 && o.errors ? { errors: o.errors } : {}) };
    return new Response(JSON.stringify(body), { status: o.status, headers });
  }
  headers['Content-Type'] = 'text/html; charset=utf-8';
  const html =
    o.status === 200
      ? resultPage({ ok: true, title: 'Message sent', body: 'It is on its way to Aarav’s inbox.' })
      : resultPage({
          ok: false,
          title: o.status === 400 ? 'Please check the form' : 'Message not sent',
          body: `${o.error} ${o.status === 400 ? '' : DIRECT}`.trim(),
          errors: o.status === 400 && o.errors ? Object.values(o.errors).filter(Boolean) as string[] : undefined,
        });
  return new Response(html, { status: o.status, headers });
}

interface Counter { count: number; reset: number }

async function bump(kv: KVNamespace, key: string, windowS: number, limit: number, nowS: number): Promise<number | null> {
  const cur = (await kv.get<Counter>(key, 'json')) ?? null;
  const c: Counter = cur && cur.reset > nowS ? cur : { count: 0, reset: nowS + windowS };
  if (c.count >= limit) return c.reset - nowS; // seconds until the window resets
  c.count += 1;
  // KV expiration must be at least 60s in the future.
  await kv.put(key, JSON.stringify(c), { expiration: Math.max(c.reset, nowS + 60) });
  return null;
}

async function handle(request: Request, env: Env): Promise<Outcome> {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  const raw = await request.text();
  if (raw.length > MAX_BODY) return { status: 413, error: 'That message is too long to send.' };

  let fields: Record<string, unknown>;
  if (type.includes('application/json')) {
    try {
      fields = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { status: 400, error: 'Please reload the page and try again.' };
    }
  } else if (type.includes('application/x-www-form-urlencoded')) {
    fields = Object.fromEntries(new URLSearchParams(raw));
  } else {
    return { status: 415, error: 'Unsupported form encoding.' };
  }

  // Honeypot filled: answer as if it worked, send nothing, tell the bot nothing.
  if (typeof fields.website === 'string' && fields.website.trim() !== '') return { status: 200 };

  if (!env.FORM_HMAC_KEY) return { status: 503, error: 'The contact form is not configured yet.' };
  const tok = await checkToken(env.FORM_HMAC_KEY, String(fields.t ?? ''));
  if (tok === 'too-fast') return { status: 400, error: 'That was very quick — wait a moment, then send again.' };
  if (tok !== 'ok') return { status: 400, error: 'This form has expired. Reload the page and try again.' };

  const v = validate(fields);
  if (!v.ok) return { status: 400, error: 'Please check the highlighted fields.', errors: v.errors };

  // Rate limit by a keyed hash of the IP: no raw addresses are stored.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const who = (await hmacHex(env.FORM_HMAC_KEY, `ip:${ip}`)).slice(0, 32);
  const nowS = Math.floor(Date.now() / 1000);
  try {
    const short = await bump(env.RATE_KV, `rl:10m:${who}`, WINDOW_SHORT.seconds, WINDOW_SHORT.limit, nowS);
    if (short !== null) return { status: 429, error: 'Too many messages from this connection.', retryAfter: short };
    const day = await bump(env.RATE_KV, `rl:1d:${who}`, WINDOW_DAY.seconds, WINDOW_DAY.limit, nowS);
    if (day !== null) return { status: 429, error: 'Too many messages from this connection today.', retryAfter: day };
  } catch {
    return { status: 503, error: 'The contact form is unavailable right now.' }; // fail closed
  }

  const { name, email, message } = v.value;
  const subject = `Website enquiry from ${name}`.slice(0, 140);
  const text = `Name: ${name}\nEmail: ${email}\n\n${message}\n`;

  if (env.MAIL_DRY_RUN === '1') {
    console.log(JSON.stringify({ dryRun: true, to: env.CONTACT_TO, subject, chars: message.length }));
    return { status: 200 };
  }
  if (!env.RESEND_API_KEY) return { status: 503, error: 'The contact form is not configured yet.' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      // Plain text only: no HTML from user input ever reaches the email.
      body: JSON.stringify({ from: env.MAIL_FROM, to: [env.CONTACT_TO], reply_to: email, subject, text }),
    });
    if (!res.ok) return { status: 503, error: 'The message could not be sent right now.' };
  } catch {
    return { status: 503, error: 'The message could not be sent right now.' };
  }
  return { status: 200 };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const accept = request.headers.get('accept') || '';
  const wantsJson = accept.includes('application/json') || (request.headers.get('content-type') || '').includes('json');
  return respond(await handle(request, env), wantsJson);
};

export const onRequest: PagesFunction<Env> = async () =>
  new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
