# decisions.md — homepage v2 (one line per decision: "date: decision — reason")

## Direction
2026-11-07: Brand and mood — "slate and gate": a film-set contact sheet on #0B0B0A, every image in a 1px gate with four registration crosses and a mono slate — the brief's palette and type read as a cutting room, which suits someone showing finished builds.
2026-11-07: Spectacle thesis — "the name is built in front of you, then the work is cut to full frame" — the two pinned films bracket the page, so the first and last things a visitor does are both scroll-driven transformations.
2026-11-07: First 10 seconds (at a steady scroll) — 0–1s header and 120 scattered cells over grain; 1–4s the cells fly together into AARAV CHOPRA; 4–7s a lens with a chromatic rim crosses the name (pointer, or a scroll sweep); 7–10s every cell travels into "Website Builder", the grain falls and the status line rises — the visitor has the name, the role and the availability before the first piece of work.
2026-11-07: Signature 1, assembly under scroll (immersive-motion-qa category 2) — Scroll Film 1 beat 1: 24 x 5 cells cut from the rasterised name fly from seeded offsets into place — the name is literally built under the visitor's scroll.
2026-11-07: Signature 2, shader pointer interaction (category 3) — the lens in Scroll Film 1 beat 2 and in The Set's Lens: per-pixel 1.6x magnify with a chromatic rim in a fragment shader — the pointer touches the work, not a CSS filter.
2026-11-07: Signature 3, full-screen morph (category 5) — Scroll Film 2 beat 2: the top featured frame's own image opens to the viewport edges under scroll — the brief's "not a cross-fade" requirement, done with clip-path and transform only.
2026-11-07: Beat 3 of Scroll Film 1 is a per-cell travel from the name grid to the role-line grid, each cell blending its texture from name to role while it moves — continuous transformation, left columns first (0.25-beat column stagger), never a cross-fade between two words.

## Values
2026-11-07: Beat size desktop min(800, innerHeight x 0.9), mobile (<768px) min(480, innerHeight x 0.85), recomputed on refresh — under ~350px a wheel flick skips a beat; a thumb fling covers far more document per gesture.
2026-11-07: #reveal pins 4 beats (4 x 800 = 3200px at most on desktop, 2880px at 1280x800, 4 x 480 = 1920px on a 390x844 phone) and #close pins 3 beats (2400px at most, 1440px on phones), arithmetic commented beside each ScrollTrigger — the brief's beat counts at the brief's beat size.
2026-11-07: ScrollTrigger scrub 0.6s, invalidateOnRefresh, ignoreMobileResize — 0.6s absorbs wheel steps without feeling detached; the URL bar must not rebuild the pins mid-scroll.
2026-11-07: Physics — friction v *= 0.94^(dt/16.67); walls reverse the component x0.5; fling = average velocity over the last 80ms, clamped to 2500px/s; rotation = clamp(vx x 0.004, ±6°), easing back to 0 — the brief's values, frame-rate independent.
2026-11-07: Physics additions — a release under 60px/s gives no fling, dt is clamped to 64ms, and the loop runs only while something moves or is held — a slow drop must stay where it is put, and a background tab must not teleport frames.
2026-11-07: During a drag, rotation follows the drag's instantaneous horizontal velocity (damped 0.3 per move) — with the drag held in place by the pointer, release velocity alone would leave frames upright while thrown.
2026-11-07: Piece A frames do not collide with each other in this version — the brief says so; overlap reads as a pile of prints on a table, and collisions would double the step cost for no new information.
2026-11-07: Strip start layout — a staggered row (alternately 14% and 62% down) where neighbours in a row clear each other by 12px; otherwise an even grid with the last row centred and a 4px inset — at 320px the row overlapped slates by 12px (break-ui finding).
2026-11-07: Strip keyboard — Enter or Space jumps the frame to a random free spot (24 tries), instantly, no press scale — the brief's keyboard rule; keyboard actions never animate.
2026-11-07: Lens values — 1.6x at the centre, cubed falloff (x^3, no plateau, no visible edge), channel split peaking mid-rim at 6 device px; radius 18% of the short side in The Set, 16% (max 160px) over the name — the brief's 1.6x and rim split, sized to cover two letters of the name.
2026-11-07: Lens follow — damping 0.25 per frame (~120ms settle), presence 0.15 per frame; on touch the lens jumps to the finger; in Scroll Film 1 an idle pointer glides back to the scroll sweep after 2.5s — direct manipulation must feel attached, and the lens must never sit still on a dead spot.
2026-11-07: Develop — 1.6s linear hold, top down, by clip-path inset; release shrinks back over 200ms --ease-out; once fully developed it latches for the session (sessionStorage) and the slate reads "Developed"; aria-pressed carries the state — the brief's values.
2026-11-07: Unlock — the three pieces fade and rise 12px over 240ms --ease-out, 80ms apart, once, on the reveal's onLeave; a deep link or a fast scroll to #set unlocks at once — the brief's stagger; transform and opacity only.
2026-11-07: Featured count rule — featuredOf(list) = entries with featured: true, in array order, first three; 0 removes #featured and leaves #close one beat (closing copy only) — the index is the array position, so nothing is invented.
2026-11-07: Kessel and Prayatn are both featured: true — the portfolio has exactly these two, so Featured Work shows two frames.
2026-11-07: Slate numbers ("SC 01") are the project's position in projects.ts, not its featured position — the brief: "the index is the array position".

## Loading and tiers
2026-11-07: First load = HTML + CSS + home entry (10.5 kB gzip measured) — under the 100 kB budget with room; every film and piece is lazy.
2026-11-07: Lazy split — #reveal or #close within one viewport (IntersectionObserver, rootMargin 100%) loads reveal + GSAP core (29.9 kB gz), close (1.8 kB) and ScrollTrigger (17.4 kB); the tier module after the probe (reveal-gl 3.9 kB, lens-gl 1.9 kB, tier2 1.1 kB, probe 0.75 kB, raw 0.74 kB); #set within half a viewport loads set + physics (3.0 kB) — nothing loads before it can be seen.
2026-11-07: Tier thresholds — tier 1 when the silent probe (failIfMajorPerformanceCaveat, MAX_TEXTURE_SIZE read, WEBGL_lose_context release) succeeds on a hardware renderer; tier 2 when it fails or the renderer is software (SwiftShader, llvmpipe); tier 3 under prefers-reduced-motion or ?tier=3 — a software rasteriser runs Canvas 2D faster than WebGL.
2026-11-07: Watchdog — rolling 60-frame window; 45 frames over 22ms is "sustained"; it steps DPR 2 → 1.5 → 1, then drops to tier 2, re-armed 1.5s after each step — the brief's 22ms and 60 frames, with a grace period so one hitch does not degrade a fast device.
2026-11-07: webglcontextlost → preventDefault and swap to tier 2 in place, for both the reveal and the Lens — the brief's rule; the scene survives without a reload.
2026-11-07: Scroll Film 1 draws nothing while the tab is hidden (document.hidden) or #reveal is off screen (IntersectionObserver); the Lens draws only while the pointer moves or the lens settles — the brief's rule; no idle GPU work.
2026-11-07: ?tier=1|2|3 forces a tier for QA only — the brief's override; headless Chromium is SwiftShader, so QA forces tier 1 to see the shader.
2026-11-07: GSAP 3.15 + ScrollTrigger — free under GSAP's own "no charge" licence (Webflow), NOT OSI open source; kept because the brief names it — stated in the report.
2026-11-07: No Three.js — raw WebGL1, two programs and one dynamic quad buffer (reveal-gl 3.9 kB + lens-gl 1.9 kB gz against ~150 kB for Three) — the brief asks for raw WebGL; 120 quads need no scene graph.
2026-11-07: Fonts — Archivo variable (800/900, wdth 75), Instrument Sans variable, IBM Plex Mono 400/500, self-hosted via Fontsource, all OFL — the brief's type, licence checked.

## Deviations from the brief
2026-11-07: Featured frames are 16:10 while the placeholder (and requested) screenshots are 16:9; the image cover-crops inside the frame — the brief asks for both; cropping keeps both true.
2026-11-07: One featured entry spans columns 3–9 of 12 (span 7) and 2–7 of 8 — "centred on the 8-column grid, offset to column 3, never centre it" contradicts itself; this is off-centre in both grids, with more space on the right.
2026-11-07: The header keeps the name and nav on one row at every width; under 768px the status line sits under the name inside the identity block — at 320px name + status + two 44px nav targets do not fit on one line.
2026-11-07: touch-action is set statically (Strip frames none, Lens pan-y, Develop manipulation, stage and #featured pan-y) rather than "only while dragged or held" — browsers read touch-action at touchstart, so switching it during the gesture has no effect; pan-y keeps vertical scroll working over the Lens.
2026-11-07: Develop prevents the long-press context menu and text selection — a 1.6s hold would otherwise open the iOS callout.
2026-11-07: Lens keyboard — Enter or Space moves the lens across three spots (30%, 50%, 70% across), instantly — the brief gives the Lens no keyboard behaviour; a button must do something.
2026-11-07: Develop uses featured[1], else featured[0], else the placeholder — the Lens already shows featured[0]; two pieces with the same image read as a bug.
2026-11-07: Strip frames beyond the featured count are labelled "Empty frame" — five frames with two projects; inventing content is forbidden.
2026-11-07: Reduced motion keeps The Set playable in "instant" mode (Develop toggles on click, frames jump on Enter/Space/drag 1:1 with no fling, the lens tracks 1:1) — direct manipulation is not animation, and the brief asks for exactly these instant behaviours.
2026-11-07: #close carries its own aria-hidden copies of the featured frames, built from the same data — the real links stay in #featured and the footer, so screen readers and tab order meet each link once.
2026-11-07: Keyboard focus entering the closing copy while it is still transparent jumps the scroll to the end of the #close pin, instantly — a keyboard user must never land on an invisible link.
2026-11-07: With no pointer (touch, keyboard, idle), beat 2's lens sweeps across the name with scroll — beat 2 must never be an empty beat on a phone.
2026-11-07: Beat 4 lifts "Website Builder" to 16% of the frame instead of sliding it out — QA showed an empty black frame at the hand-off; the release now lands on a title card and the page carries it on up.
2026-11-07: The full-screen morph's image is the whole picture at viewport-cover scale (wider or taller than the viewport) and scaled by frame-cover / viewport-cover — a viewport-sized cover image held only a portrait strip on phones and could not fill the landscape end slate (QA finding).
2026-11-07: In the #close stack the slates list below the lowest image (+8px for turned corners) — QA showed frame 2's image covering frame 1's slate.
2026-11-07: Tier 2 has no film grain — Canvas 2D grain per frame costs more than it adds; the brief excludes only "shader distortion" from tier 2, so the beats and interactions are all kept.
2026-11-07: Featured hover tightens the frame-line by scale(0.99) — ~2px per side on the 1280px card (~430px wide); a transform cannot be specified in px of inset, and animating inset would repaint.
2026-11-07: Header name link has a 44px hit area laid out as 28px (-8px block margins) — web-visual-qa found it 28px tall at every width.
2026-11-07: The Lens and Develop buttons restate the 2px Tally Red focus ring — their 1px frame-line outline beat the global :focus-visible (web-visual-qa finding).
2026-11-07: The brand reads "Aarav Chopra" on every page via site.ts — About, Contact and Work are otherwise untouched, but the brand is shared data.
2026-11-07: The motion layer is chosen before first paint (html.motion from an inline script) and removed if the reveal is not live after 10s — avoids layout shift, and nothing can stay locked or hidden if a chunk fails.
2026-11-07: Phone country code +91 is assumed for tel: and wa.me — the brief gives a 10-digit Indian mobile number; flagged as a TODO.
2026-11-07: break-ui "long" fixture uses a long name with no years — the brief forbids invented dates, even in test data.
2026-11-07: scripts/motion-qa.mjs gains --sizes WxH,... — the brief's matrix (320x568, 390x844, 768x1024, 1280x800 x 9 depths = 36) is not the skill's default six viewports.
2026-11-07: remove-animations — the Featured hover now runs only on frames that link somewhere (a.gate__clip present); with both urls still TODO nothing moves on hover today — motion on "Link not yet published" promised a click that does nothing; everything else passed the gate.
