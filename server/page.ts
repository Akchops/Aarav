/**
 * The no-JS response page for a contact form post. Self-contained (inline CSS,
 * system fonts) so it renders without the hashed site assets.
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function resultPage(opts: { ok: boolean; title: string; body: string; errors?: string[] }): string {
  const list = opts.errors?.length ? `<ul>${opts.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B0B0A"><meta name="color-scheme" content="dark">
<title>${esc(opts.title)} — Aarav, Website Builder</title>
<style>
  html{background:#0B0B0A;color:#EDE9E1;color-scheme:dark}
  body{margin:0;min-height:100svh;display:grid;align-content:center;padding:24px max(16px,4vw);font:16px/1.55 system-ui,sans-serif}
  p.l{font:500 12px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8C877D}
  h1{font:800 clamp(2.5rem,8vw,4.5rem)/0.95 'Arial Narrow',system-ui,sans-serif;margin:8px 0 16px;letter-spacing:-.02em}
  li{color:#FF4A1C}
  a{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;margin-top:16px;background:#FF4A1C;color:#0B0B0A;font:500 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
  :focus-visible{outline:2px solid #FF4A1C;outline-offset:3px}
</style></head>
<body><main>
<p class="l">${opts.ok ? 'Sent' : 'Not sent'}</p>
<h1>${esc(opts.title)}</h1>
<p>${esc(opts.body)}</p>${list}
<p><a href="/contact/">Back to Contact</a></p>
</main></body></html>`;
}
