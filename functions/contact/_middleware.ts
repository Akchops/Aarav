/**
 * Runs in front of /contact/: injects a freshly signed timestamp into the form,
 * so the spam timing check works with or without JavaScript.
 */
import { makeToken } from '../../server/token';

interface Env {
  FORM_HMAC_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const res = await ctx.next();
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html') || !ctx.env.FORM_HMAC_KEY) return res;

  const token = await makeToken(ctx.env.FORM_HMAC_KEY);
  const out = new HTMLRewriter()
    .on('input[data-form-token]', {
      element(el) {
        el.setAttribute('value', token);
      },
    })
    .transform(res);
  const headers = new Headers(out.headers);
  // The token is per view: never cache this page in a shared cache.
  headers.set('Cache-Control', 'private, no-store');
  return new Response(out.body, { status: out.status, headers });
};
