# PLAN.md — Aarav portfolio (Phase 0)

> Status: **Approved 2026-11-07** with two changes: QA matrix trimmed to 320/390/1440; castle entry removed. Phase 1 in progress.

## Context

The repo is empty: no commits, no files. The site's job is to make a visitor think "is this a movie or a website?" within ten seconds, then want Aarav to build their site. The work shown is two real projects, so the craft of the site has to carry the pitch. It must not invent facts. This plan locks the creative direction, visual system, beat sheet, fallbacks, stack and QA gates before any code.

**Decisions locked in the Q&A round:**
1. Use GSAP. Its licence is free but not OSI open source, and the report says so.
2. The contact form posts to a serverless function that sends through a free email API (§9a).
3. Project URLs stay TODO.
4. The toast is a vanilla implementation of the Sonner pattern, with no React.

**Changes made at approval:**
1. The QA screenshot matrix is trimmed to **320, 390 and 1440 wide** (3 viewports × 9 scroll depths = 27 captures) for both web-visual-qa and immersive-motion-qa. Kept in full: the immersive-motion-qa verdict, the console and network checks, and the reduced-motion, no-WebGL and no-JS passes. The verdict records `27/27` and notes this as an approved deviation from the skill's 54.
2. The castle entry is removed entirely. The portfolio shows only Kessel (the demo site) and Prayatn.

Skills read for this plan: web-spectacle-director (and its spectacle-patterns reference), web-art-director, web-motion-director, immersive-scroll-engineer, webgl-shader-interaction-engineer, web-interaction-engineer, animate, apple-design, mobile-native, world-class-web-director and immersive-motion-qa. The detail and QA skills (choreograph, animation-performance, emil-design-eng, ask-sonner, break-ui, web-visual-qa, remove-animations) are read before the build step each one governs. No irrelevant skills are loaded: no write-swift, no animate-expo, no Figma or Canva.

---

## 1. Spectacle thesis

**Aarav's name is a strip of film under a projector lens. Scrolling dollies the camera *through* the letterforms into a corridor where his work hangs as lit frames, and the frames then land in the real page as if the film had been cut into it.**

A normal freelancer site shows a headline and a card grid. This one runs a single continuous camera move from the title card into the work.

### Visual world
- **Density rhythm:** IMPACT (title card) → BUILD (corridor) → IMPACT (full-frame card) → RELEASE (grid lands) → QUIET (settle and CTA).
- **Lighting:** one projector source. Frames glow against a warm black, and there are no gradients.
- **Texture:** fine per-pixel film grain. It is hash-based, not value noise (shader trap #1 avoided).
- **Type behaviour:** the name is the object: huge, condensed, anchored bottom-left and cropped by the gate frame-line. Everything else is quiet slate text.
- **Depth:** foreground is the slate, timecode and nav. The middle ground is the name. The background is the corridor of project planes.
- **Edges:** hard square edges everywhere, 1px frame-lines and registration crosses.
- **Motion character:** a cinematic dolly, smooth and weighty, never elastic. Bounce appears only as the decay of a touch ripple, after a gesture.

### First-10-seconds storyboard
| t | What the visitor sees | Source |
|---|---|---|
| 0.0s | Frame 1, painted before any JS: a warm-black field, film-gate frame-lines with registration crosses, top-left slate `AARAV — WEBSITE BUILDER`, the tally light lit beside **"Taking new clients"**, and the timecode `00:00:00:00` bottom-right. | HTML + CSS |
| 0.2–1.6s | The name **develops out of the dark** like emulsion: bottom-up clip and grain threshold, 1.4s, `--ease-out`. | CSS keyframes (off main thread), so it never waits for Three.js |
| ~0.8–1.6s | The WebGL canvas mounts over the DOM name with `uDevelop` matched to the elapsed CSS progress, so the handoff can't be seen. | Lazy Three.js chunk |
| 2–4s | **First action:** the pointer moves and the letterforms bend under a projector lens. RGB channels split at the lens rim, and the distortion smears in the direction of travel with the pointer's speed. On touch, a horizontal drag smears and a tap sends a ripple. | Shader, signature S1 |
| 4–7s | **First scroll:** the camera dollies into the name until the letters overfill the frame. It passes *through the counter of the first "A"*, and the dark opens into a corridor: Kessel's frame on the left, Prayatn's on the right, each with its slate. The timecode runs with scroll. | Signature S2 |
| 7–10s | Kessel's frame swings to face the camera and **fills the screen** as a full-frame card: `SC 01 · Kessel · A demo website · Visit live site`. | Signature S3 |

### Signature moments (3). Each still reads without naming the technology.
- **S1 — Film under a lens** (qualifying category 3, shader pointer interaction): the name distorts per pixel under the pointer or finger. Visible within the first 2s.
- **S2 — Through the A** (category 1, camera travel): the camera flies through a letter's counter into a corridor of the work. Home, beats 1–2.
- **S3 — The frame becomes the stage, the stage becomes the grid** (categories 5 and 2): the featured plane fills the frame, then every plane flies to the exact pixel rect of its real DOM frame in the Work grid. Home, beats 3–4.

Supporting moment, not a signature: on Home→Work navigation, the project frames carry over between pages with cross-document View Transitions.

**Anti-slop check:** it can't be swapped onto five other businesses, because the name and his own work are the scene. No centred hero copy, no cards-for-the-sake-of-cards, no gradients, no glass, no bento, no particles, and no repeated fade-up.

**Biggest creative risk:** two projects with placeholder images could make the corridor feel thin. The name carries the opening, and the corridor spacing scales with project count. Real screenshots are required before launch (see TODOs).
**Biggest technical risk:** this container only has SwiftShader (software GL), so tier 1 can't be measured on a real GPU here. See §10, "Unverified".

---

## 2. Brand and mood decision

**Brand: "Aarav" with the role line "Website Builder".** The name is literally the hero object, the thing the shader distorts and the camera flies through, so it has to be the brand. A studio name would be an invented fact, and it would put a second word between the visitor and the person they would be hiring. The role line is needed because a cold visitor, three seconds into a cinematic title card, still has to learn what he sells. In beat 4 the name settles into exactly that subtitle position.

**Mood: dark and cinematic.** The thesis is a projector, and light only reads as light against a dark field. The two projects' own palettes are unknown and will differ from each other. Lit frames in a dark room present any palette well, whereas a bold-colourful site would compete with the work and a light editorial one would kill the projector metaphor.

**Availability:** the line reads exactly "Taking new clients". It is set as a slate field in the hero composition, beside a red tally light (the camera "recording" lamp), and lit from frame 1. The lamp does not loop or pulse: it flickers on once as the name develops.

---

## 3. Visual system

### Palette: five colours
| Name | HEX | Role | Use / don't |
|---|---|---|---|
| Projector Black | `#0B0B0A` | Field and page background | Everywhere behind content. Warm, not `#000`. |
| Gate Grey | `#1C1B19` | Raised surfaces: inputs, frame interiors, toast | Never for text. |
| Silver Screen | `#EDE9E1` | Primary text and the name | Contrast on black ≈ 16:1. |
| Dust | `#8C877D` | Secondary text, slate and timecode. At 35% alpha it draws frame-lines and crosses. | ≈ 5.5:1 on black, so AA holds for body sizes. |
| Tally Red | `#FF4A1C` | Tally light, primary CTA, focus ring, form errors | ≈ 5.9:1 on black. Never a fill larger than a button, never in a gradient. |

There is no sixth colour: frame-lines are a tint of Dust.

### Type: free Google Fonts, self-hosted via Fontsource, all SIL OFL 1.1
| Role | Face | Weights | Usage |
|---|---|---|---|
| Display | **Archivo** (variable, wght + wdth) | 800, 900 at wdth 75 | The name: `clamp(5.5rem, 26vw, 19rem)`, line-height 0.82, tracking −0.035em. Page titles: 800 at `clamp(2.5rem, 7vw, 5.5rem)`, tracking −0.02em. |
| Body | **Instrument Sans** | 400, 500, 600 | 17px/1.55 desktop, 16px/1.55 mobile, tracking 0. Inputs are always 16px. |
| Utility | **IBM Plex Mono** | 400, 500 | Slates, timecode, nav and labels: 12–13px, uppercase, +0.08em tracking. |

Tracking is size-specific, per apple-design: negative on large type, 0 on body, positive on small caps. The availability of Archivo's `wdth` axis is verified at install. If it's missing, the fallback is Archivo at 900 (no width axis).

### Grid, radius, borders
- **Grid:** 4 columns under 768px, 8 columns at 768–1023px, and 12 columns at 1024px and up. The outer margin is `clamp(16px, 4vw, 48px)` plus safe-area insets, and the gutter is `clamp(12px, 2vw, 24px)`.
- **Composition:** asymmetric. Content hangs from an off-centre "gate line" at column 3, and nothing is centred except the full-frame card in beat 3.
- **Radius:** 0 everywhere, because film frames are square. The one circle is the 8px tally light.
- **Borders:** 1px frame-lines (Dust at 35%). There are no shadows, no glass and no gradients. The header is solid black and uses a 24px scroll-edge fade mask, not a divider.

### Motif: "Slate and gate"
Every image sits in a **film gate**: a 1px frame-line with four registration crosses (+) just outside its corners. A mono **slate line** runs underneath, for example `SC 01 · KESSEL · DEMO WEBSITE`. The scene numbers come from array order in `projects.ts`, so nothing is invented. The hero corner carries a **timecode** that is an honest readout of scroll position at 24 fps of scroll, not a claim about anything. You can recognise the site from this motif without the logo.

### Work grid: a contact sheet, not a bento
Frames are staggered in two offset columns: odd projects start high on the left, even ones start low on the right. All frames share a 16:10 aspect. A single project spans 8 of the 12 columns, offset. Zero projects shows an honest empty slate (§8). The grid uses `touch-action: pan-y`.

---

## 4. Hero beat sheet: Home "stage", one pinned ScrollTrigger

`beatPx = Math.round(Math.min(innerWidth < 768 ? 420 : 700, innerHeight * 0.9))`, recomputed on resize (`invalidateOnRefresh: true`). The pinned distance is `beats × beatPx`, and the same arithmetic is written in a comment next to the trigger.

| Beat | What changes | Desktop px | Mobile px |
|---|---|---|---|
| Pre-roll (time, not scroll) | The name develops out of the dark in 1.4s. Pointer distortion is live. If the user scrolls early, the timeline takes over from the current value, with no jump. | 0 | 0 |
| 1 — Name | The camera dollies from z=0 into the name, which overfills the frame. The camera passes through the counter of the first "A". The grain is at its heaviest. | 700 | 420 |
| 2 — Corridor | The camera travels down the corridor, with project planes alternating left and right (Kessel left, Prayatn right). Slates are DOM labels positioned by projected transforms. | 700 | 420 |
| 3 — Full frame | The featured plane (`featured`, else `projects[0]`) rotates to face the camera and scales to full frame. The card's DOM text (name, summary, "Visit live site") sits on it. | 700 | 420 |
| 4 — Assembly | The card shrinks and every plane flies to the measured rect of its DOM frame in the grid beneath, staggered at 0.04 of a beat. The name drops to the subtitle slot. In the last 5% of the beat the canvas hands off to the DOM at identical pixels. | 700 | 420 |
| 5 — Settle | The grain falls to ambient level, and "Start a project" (→ `/contact/`) and the tally line take their final positions. The pin releases into a document layout identical to the final frame. | 700 | 420 |
| **Total pinned** | | **5 × 700 = 3500px** | **5 × 420 = 2100px** |

Worked values: 1440×900 → min(700, 810) = 700 → 3500. 1024×768 → min(700, 691) = 691 → 3455. 768×1024 → 700 → 3500. 390×844 → min(420, 760) = 420 → 2100. 320×568 → min(420, 511) = 420 → 2100.

**Project-count rules:** the beats stay at 5 for 1–6 projects, and the corridor spacing scales so beat 2 still fits in one beat. With more than 6, only the `featured` and first 6 enter the corridor, while the grid shows all of them. With 0 projects, beats 2–4 are dropped and the scene runs 2 beats (`2 × beatPx`).

**Real-time vs pre-rendered (scroll Gate 5).** Is the output a function of scroll position alone? **No**, for three reasons:
1. The pointer and touch distortion runs through every beat.
2. The plane textures and count come from `projects.ts` and change without an offline re-render.
3. Beat 4 targets DOM rects that vary with the viewport.

So the scene is real-time, and it is deliberately light: N+1 textured quads, no lights, no shadows and no post-processing (grain is computed in the same fragment pass). The scene ships only if a 4× CPU-throttled 390×844 scrub holds p95 ≥ 55 fps with no frame over 32ms. If that fails, mobile drops to tier 2. A degraded tier 1 never ships.

---

## 5. Continuity at each boundary (scroll Gate 1)

| Boundary | Mechanism |
|---|---|
| Pre-roll → beat 1 | The same element (the name). Scroll retargets from the live `uDevelop` value. |
| Beat 1 → 2 (name → corridor) | Continuous camera through both states (scroll-linked 3D). The frame at the boundary is mid-flight through the "A". |
| Beat 2 → 3 (corridor → card) | Shared-element morph of the featured plane. |
| Beat 3 → 4 (card → grid) | Shared-element morph, with the card returning to its grid slot while the other planes assemble. Happens inside the pin. |
| Beat 4/5 → document | Canvas→DOM handoff at identical rects inside the pin. The pin's end state equals the natural layout, so release causes no jump. |
| Page ↔ page | Cross-document View Transitions with shared `view-transition-name`s (brand mark; `frame-<slug>` Home↔Work). They are skipped under reduced motion and for keyboard-initiated navigation. |
| Work, About and Contact pages | Single-state pages with no section boundaries to morph. Work frames get a CSS scroll-driven crop migration (inner image translate in its gate, `animation-timeline: view()`, progressive). remove-animations decides whether it survives. |
| Hard cuts | **None used.** |

---

## 6. Motion personality and interaction map

**Personality:** cinematic and spatial: weighty dollies, held frames and nothing elastic. The easing tokens come from the animate skill and are shared by CSS and GSAP through a small cubic-bezier solver in `src/motion/easing.ts`:
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`
- `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`

No ease-in anywhere.

| Surface | Behaviour | Timing |
|---|---|---|
| First load | Frame 1 is static, then the name develops. The tally light flickers on once. | 1.4s `--ease-out` (rare, first-time tier) |
| Scroll | One pinned stage on Home (above). Elsewhere, only the Work crop migration. | Scrub, `scrub: 0.6`; `--ease-in-out` inside camera segments |
| Hover (gated `(hover:hover) and (pointer:fine)`) | Frames: the frame-line tightens 2px inward and the inner image scales to 1.03. Links: underline wipe (`scaleX`). | 200ms `ease` |
| Press | `.is-pressed` is set on **pointerdown** (not `:active`, so Space and Enter don't trigger it). Scale 0.97. | 120ms `--ease-out` |
| Keyboard | No motion: no press scale, no view transition, and the focus ring appears instantly. | 0ms |
| Touch | On the stage (`touch-action: pan-y`), a horizontal drag smears the name and a tap sends a ripple that decays as a damped spring (bounce only after a gesture). Vertical drag always scrolls. | Ripple: damping ≈ 0.8, response 0.4 |
| Cursor | Native cursor, no custom one. | — |
| Nav | Brand on the left, Work / About / Contact inline on the right at every width (they fit at 320px in 12px mono). No hamburger. | — |
| Page transitions | View Transitions with shared frames and brand. | 400ms `--ease-in-out` (large-surface, marketing) |
| Toast | Enters and exits along the same path (from the bottom). | 250ms in / 200ms out, `--ease-out` |
| Reduced motion | Designed state (§7, tier 3 plus stacked frames). Opacity-only toast, no view transitions, no shader distortion. | — |

Only `transform` and `opacity` are animated, plus `clip-path` for the develop and wipe effects, which the animate skill sanctions. No `transition: all`.

---

## 7. Fallback plan and reduced motion / no-JS

| Tier | When | What renders | Behaviour preserved |
|---|---|---|---|
| **1 — WebGL (Three.js)** | The silent probe passes: WebGL2/1, `failIfMajorPerformanceCaveat: true`, MAX_TEXTURE_SIZE read, probe context released | Full scene, S1–S3 | All of it |
| **2 — Canvas 2D** | Probe fails, context lost, or the watchdog drops the scene | The name drawn to canvas with a pointer/finger **lens reveal** (a circular clip showing an offset-channel version). The **two project images** travel by perspective-projected `drawImage`, fill the frame in beat 3 and land on the DOM rects in beat 4. | Same timeline module and beats. Only the liquid displacement is lost. |
| **3 — Static DOM** | No JS, reduced motion, or a script error | The `<h1>` name, role line, tally line and a `<img class="stage__still">` poster (TODO asset), always in the HTML. Below it, every project frame stacked with its slate and link, then the CTA. No pin. | Every fact and image |

- **Probe** (`src/hero/probe.ts`): it guards against a missing constructor, wraps `getContext` in try/catch and returns `null` without logging. It releases its context with `WEBGL_lose_context`.
- **Context loss:** `webglcontextlost` calls `preventDefault()` and drops to tier 2.
- **Watchdog:** a rolling 60-frame window. Sustained frames over 22ms step the DPR down (2 → 1.5 → 1), then drop to tier 2. Rendering stops when the tab is hidden or the stage is offscreen.
- **No-JS:** the inline `<script>` adds the `.js` class. The base CSS never hides content: `opacity: 0` exists only under `.js` and never under `prefers-reduced-motion: reduce`. All four pages are real HTML (Vite multi-page), readable with JS and CSS off.
- **Overrides:** a `?tier=1|2|3` query override exists for QA, because headless Chromium is software GL and would otherwise always get tier 2.

---

## 8. Architecture, file tree, dependencies

**Single source of truth:** `src/data/projects.ts`. A small local Vite plugin renders the grid HTML at build and dev time from that file into both `index.html` and `work/index.html`, so the grid exists without JS. The Home scene reads the rendered DOM frames through their `data-*` attributes. Adding a project means editing one entry.

```ts
// src/data/projects.ts (shape)
export interface Project {
  slug: string; name: string; summary: string;
  url?: string;                         // missing → no link, slate reads "Link not yet published"
  image?: { src: string; alt: string; width: number; height: number; todo?: true };
  featured?: boolean;
}
export const projects: Project[] = [
  { slug: 'kessel',  name: 'Kessel',  summary: 'A demo website.',
    url: undefined /* TODO: [KESSEL_URL] */,  image: /* TODO placeholder */ },
  { slug: 'prayatn', name: 'Prayatn', summary: 'A volunteer website for a non-profit.',
    url: undefined /* TODO: [PRAYATN_URL] */, image: /* TODO placeholder */ },
];
```

```
/
├── PLAN.md
├── index.html                 Home
├── work/index.html            Work
├── about/index.html           About
├── contact/index.html         Contact
├── package.json  tsconfig.json  vite.config.ts
├── plugins/projects-html.ts   build-time grid renderer (+ PROJECTS_FIXTURE env for break-ui)
├── functions/api/contact.ts   Cloudflare Pages Function: validate → rate-limit → send via Resend
├── wrangler.toml              Pages config: KV binding RATE_KV, var CONTACT_TO (key is a secret, never in repo)
├── public/
│   ├── favicon.svg
│   └── img/{projects/kessel, projects/prayatn, hero/still, about/portrait}.*   ← all TODO placeholders
├── scripts/
│   ├── perf-scrub.mjs         4× CPU-throttled frame-time measurement (Playwright, preinstalled)
│   └── capture-projects.mjs   screenshots of live sites once URLs exist (if approved)
└── src/
    ├── data/{projects.ts, site.ts}             site.ts = brand + contact details
    ├── styles/{tokens.css, base.css, layout.css, gate.css, hero.css, work.css, contact.css}
    ├── entries/{home.ts, work.ts, about.ts, contact.ts}   tiny per-page entries
    ├── core/{modality.ts, view-transitions.ts, prefs.ts, press.ts}
    ├── motion/easing.ts
    ├── work/render-grid.ts                     pure string renderer, escapes all fields
    ├── hero/{bootstrap.ts, probe.ts, beats.ts, timeline.ts, tier1-webgl.ts,
    │        tier2-canvas.ts, watchdog.ts, name-texture.ts}
    ├── hero/shaders/{name.vert.glsl, name.frag.glsl, plane.frag.glsl}   imported ?raw, every term commented
    └── contact/{form.ts, toast.ts}
```

**Loading:** `entries/home.ts` (target ≤ 5 kB gz) sets up an IntersectionObserver on the stage. On intersect, it dynamically imports `gsap` + `ScrollTrigger` and the probe, then `tier1-webgl` (Three.js) or `tier2-canvas`. All ScrollTrigger scenes are created inside `gsap.matchMedia()`, with `(prefers-reduced-motion: no-preference)` gating the pin and separate desktop and mobile contexts.

**Dependencies:**
| Package | Licence | Notes |
|---|---|---|
| vite (dev) | MIT | Multi-page app |
| typescript (dev) | Apache-2.0 | |
| three | MIT | Lazy chunk only, tree-shaken |
| @types/three (dev) | MIT | |
| **gsap** (+ ScrollTrigger) | **GSAP Standard "no charge" licence** | Free, including commercial use, but **not OSI open source**. Accepted by you; stated in the report. Lazy chunk. |
| wrangler (dev) | MIT OR Apache-2.0 | Local Pages Functions dev server and deploy |
| @cloudflare/workers-types (dev) | MIT OR Apache-2.0 | Types for the function |
| @fontsource-variable/archivo, @fontsource-variable/instrument-sans, @fontsource/ibm-plex-mono | Font files OFL-1.1, package code MIT | Self-hosting avoids third-party font requests |
| lenis | MIT | **Not installed.** Added only if the scrub feels wrong without it; reported if so. |

There is no CSS framework, no React and no Sonner package. The toast is a vanilla implementation of the Sonner pattern: one toaster, bottom position, `role="status"` / `aria-live="polite"`, 4s, pause on hover/focus, swipe to dismiss, and the error toast stays until dismissed. The email API is called with plain `fetch`, so no SDK is needed. Playwright for QA is the preinstalled copy and is not added to `package.json`. GLSL is imported with Vite's built-in `?raw`, so no plugin is needed.

---

## 9. Pages and contact

- **Home:** stage (§4), tally line "Taking new clients", the grid (rendered from `projects.ts`), a "See all work" link to `/work/`, and "Start a project" → `/contact/`.
- **Work:** the contact-sheet grid. Each frame links to its live site (`target="_blank" rel="noopener"`), and a frame without a URL shows no link.
- **About:** one page of text with visible, styled `TODO — copy from Aarav` slates where biography goes. There is a portrait gate with a TODO placeholder and no invented facts.
- **Contact:** a form with name, email and message. It validates inline (on blur, then live once an error has shown) and uses `aria-describedby` with specific error copy, 16px inputs, and `type`/`inputmode`/`enterkeyhint` set. Alongside it are three routes as real anchors:
  - Email: **aaravchopra1202@gmail.com** → `mailto:aaravchopra1202@gmail.com`
  - Call: displayed as **9049512356** → `tel:+919049512356`. ⚠ **Assumption: +91 (India) country code.** Confirm.
  - WhatsApp → `https://wa.me/919049512356`. ⚠ **Assumption: the same number is on WhatsApp, with +91.** Confirm.
  - The form posts to the serverless function in §9a.
- **Mobile layer:** `viewport-fit=cover`, `env(safe-area-inset-*)` on the header, footer and toast, a `100svh` stage, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` on controls, and `overscroll-behavior-y: none` on Home only. `theme-color` is `#0B0B0A` for both colour schemes, because the site is dark-only with `color-scheme: dark`. Zoom is never disabled.
- **Apple layer:** feedback on pointerdown, size-specific tracking, no translucent materials, and a `prefers-reduced-transparency` rule that removes the header fade mask.

### 9a. Contact form delivery: serverless function

**Host: Cloudflare Pages (free plan) with a Pages Function at `/api/contact`.**
- **Why not Vercel:** Vercel's Hobby plan is restricted to non-commercial personal use under its fair-use guidelines, and a freelancer's sales site is commercial.
- **Netlify** was not chosen, so that the static hosting and the function stay on one free plan with documented limits.
- I found no non-commercial restriction on the Cloudflare free plan in the docs I searched. Aarav should still confirm the current terms when signing up.

**Email API: Resend (free plan), called with `fetch`.** It needs a Resend account, which is not a form-service account. Without a verified domain, Resend's `onboarding@resend.dev` sender can only deliver to the address that owns the Resend account. **Aarav therefore signs up to Resend with aaravchopra1202@gmail.com**, and no domain is needed. The visitor's address goes in `reply_to`, so he can answer directly. If a domain is added later, the sender switches to it.

**Free-tier limits, as checked on 2026-11-07:**
| Service | Limit | What happens when it's hit |
|---|---|---|
| Cloudflare Pages static assets | Free and unlimited | — |
| Pages Functions | Count against Workers Free: **100,000 requests/day** (resets 00:00 UTC), **10 ms CPU per request** (waiting on network doesn't count), 1,000 requests/min burst, 50 subrequests per request | Over the cap: fail-closed shows error 1027, fail-open skips the function. We set **fail closed**, and the client shows the error toast plus the direct email, WhatsApp and call routes. |
| Workers KV (rate-limit store) | **1,000 writes/day**, 100,000 reads/day | Writes fail, and the function then refuses to send (fail closed) |
| Resend free | **100 emails/day, 3,000/month** | Sends are refused, and the function returns a 503 with the same fallback routes |

The real ceiling is about 100 enquiries a day, which is far above a portfolio's expected volume. Pages build quotas are not stated here because I couldn't confirm them from an official source in this session.

**Function behaviour** (`functions/api/contact.ts`):
1. Accept `POST` only, with `application/x-www-form-urlencoded` (no-JS) or JSON (fetch). Reject bodies over 10 kB.
2. **Validate server-side** with the same rules as the client: name 1–100 characters, a valid email up to 254, message 10–5,000. Strip control characters, and never put user input in headers except `reply_to` after validation.
3. **Spam:** a hidden honeypot field, plus a minimum fill time of 3s (a timestamp field signed with HMAC so it can't be forged; the key is a secret).
4. **Rate limit:** the key is `CF-Connecting-IP` hashed with SHA-256 (no raw IPs stored). **3 submissions per 10 minutes and 10 per day per IP**, kept as KV counters with a TTL. KV is eventually consistent, so this is a soft limit, and Resend's 100/day cap is the hard one. If the Rate Limiting binding turns out to be supported on Pages when checked at build, it replaces KV for the per-minute window.
5. **Send** to `CONTACT_TO = aaravchopra1202@gmail.com` with the subject `Website enquiry from <name>`, as plain text with no HTML injection.
6. **Respond:** JSON `{ok}` / `{error, field?}` for fetch, with 400 for validation, 429 for the rate limit (with `Retry-After`) and 503 for the provider. For no-JS posts it returns a small server-rendered HTML page in the site's styles, either "Message sent" or the specific error, with a link back. The form therefore works with JS off.

**Secrets:**
- `RESEND_API_KEY` and `FORM_HMAC_KEY` are set as Cloudflare secrets (`wrangler pages secret put`) and never committed. `.dev.vars` is git-ignored.
- `CONTACT_TO` is a plain variable in `wrangler.toml`.

**Local verification:**
- `wrangler pages dev dist` runs the function locally with `MAIL_DRY_RUN=1`, which logs instead of calling Resend, because this container can't reach resend.com.
- Validation, rate limiting, honeypot, timing and both response modes are tested here.
- **Real delivery is unverified until it's deployed with Aarav's key.**

---

## 10. Build order, QA and verification

**Phase 1 build order** (as briefed):
1. Semantic no-JS HTML for the four pages
2. Tokens and visual system
3. Grid from `projects.ts`
4. Home scene (tier 3 → tier 1)
5. About and Contact
6. Motion layer
7. Tier 2 and the watchdog

**Phase 2 QA:**
1. `npm run build`, then `node <webgl skill>/scripts/first-load-budget.mjs dist/` for every page. The budget is under 100 kB gzip excluding the Three.js chunk; the figure is reported as measured.
2. **break-ui** via `PROJECTS_FIXTURE=long|nourl|single|empty`, plus a dev-only "Demo data / Worst case" toggle. It covers a very long name, a missing URL, one project and zero projects, on the grid and the hero.
3. **web-visual-qa** at 320, 390 and 1440 wide (trimmed at approval).
4. `scripts/perf-scrub.mjs`: 390×844, 4× CPU throttle, forced tier 1, p95 frame time through the pin.
4a. Contact function tests run against `wrangler pages dev dist` with `MAIL_DRY_RUN=1`. They cover valid sends, each validation error, the honeypot, a too-fast submission, rate-limit 429s, and a no-JS form post returning the HTML page. All QA serves through `wrangler pages dev`, so `/api/contact` exists and the network check stays clean.
5. **immersive-motion-qa:** `node <qa skill>/scripts/motion-qa.mjs http://localhost:4173 --out ./qa-run`. That is 27 captures (320, 390 and 1440 wide × 9 depths, trimmed at approval) plus the reduced-motion, no-WebGL and no-JS passes, with screenshots inspected. The claimed signature is category 1 (S2) at 320px and above, with S1 as a second qualifier. The verdict is reported in its exact format.
6. Fix every P0 and P1 finding and re-run the affected checks.
7. **remove-animations** once at the end, with its removals reported.
8. Commit and push to `claude/great-wright-1lxe1o`.

**Unverified in this container, and stated in the final report:** tier 1 on a real GPU, since only SwiftShader is available, so the throttled measurement is pessimistic and not proof. Also unverified until checked on a real phone: iOS Safari behaviour (safe areas, `svh`, touch smear and ripple feel), sticky hover, and real-phone frame rate.

---

## 11. Acceptance criteria (all must hold)
- First-load bundle, excluding the lazy Three.js chunk, is **under 100 kB gzip**. The measured number is reported.
- The Home beat sheet's scrub distances are declared in comments, with the arithmetic.
- At 320px the signature works, or another qualifying signature replaces it there. "Disabled on mobile with nothing in its place" is a fail.
- With WebGL disabled, the console is clean and tier 2 or tier 3 renders.
- With reduced motion on, no content is lost.
- With JS disabled, all text and images on all four pages are readable.
- Console and network are clean at every QA breakpoint (320, 390 and 1440).
- The text contains no invented facts, numbers, testimonials, clients or awards.
- Every dependency and font is free, with its licence named in the report.
- The contact details match §9 exactly.
- immersive-motion-qa returns **PASS**.

## 12. Copy and assets still needed from Aarav (all TODO in code)
1. **TODO** Kessel live URL (the brief contained the literal placeholder `[KESSEL_URL]`).
2. **TODO** Prayatn live URL (`[PRAYATN_URL]`).
3. **TODO** Confirm the +91 country code for tel: and WhatsApp, and that the number is on WhatsApp.
4. **TODO** Project images: one 16:10 screenshot or still per project, at least 2400×1500. Alternatively, approval for a script to capture them from the live URLs.
5. **TODO** Hero poster still (tier 3). This can be captured from the finished scene once the project images exist.
6. **TODO** Portrait photo for About, 4:5, at least 1600×2000.
7. **TODO** About copy: who Aarav is, how he works, and anything else he wants said.
8. **TODO** Any longer project description beyond "A demo website." and "A volunteer website for a non-profit.", plus whether to name the non-profit behind Prayatn.
9. **TODO** A Cloudflare account (free) to host the site, plus a KV namespace for rate limiting. The build includes the config, and the deploy steps go in the report.
10. **TODO** A Resend account created **with aaravchopra1202@gmail.com**, an API key stored as a Cloudflare secret, and an HMAC secret. Real email delivery is unverified until then.
11. **TODO** Optional production domain (canonical URLs, OG tags and a branded sender address), plus an OG share image. Until then the site runs on the `*.pages.dev` address.
