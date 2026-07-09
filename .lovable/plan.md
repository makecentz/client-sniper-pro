
# Scroll-Based 3D Landing Page

Transform the ClientHunter AI landing page into a scroll-driven experience: a live 3D hero on the right side of the fold, and 3D accents that respond to scroll between the existing sections. Desktop-first with a lightweight mobile fallback so it still ships fast on phones.

## What it looks like

**Hero (top of page)**
- Left column: existing headline + CTAs stay.
- Right column: replace the current static split-code mockup with a **live R3F canvas** showing:
  - A floating 3D laptop tilting toward the viewer, screen showing an animated ClientHunter dashboard (leads scrolling, AI score dial spinning up).
  - A phone floating beside it displaying the outreach message being typed.
  - A subtle particle field of glowing blue dots (leads) drifting behind them.
  - Gentle idle motion (bob + rotate) plus mouse parallax.
- Scroll 0 → 100% of hero: laptop opens further, phone rises up next to it, particles condense into a "map pin" cluster.

**Between-section transitions (scroll-linked)**
- Features section: 3D wireframe globe rotates slowly on the left; connection arcs light up as each feature card enters view.
- Pro-feature section: existing AI website-scan mockup gets a scroll-tied "scan line" that sweeps down as user scrolls through.
- Testimonials: floating 3D quote cards drift on subtle Y-axis parallax (CSS transforms, no canvas).
- Pricing: 3D "cards" tilt toward cursor on hover.
- Contact / footer: particle field fades out.

**Motion feel**
- Smooth scroll via Lenis.
- Scroll-linked animations via `useScroll` + `useTransform` from framer-motion.
- 3D scenes via `@react-three/fiber` + `@react-three/drei`.
- All animations respect `prefers-reduced-motion`.

**Mobile**
- Hero 3D canvas replaced with a static rendered PNG (generated once) + the existing split-code mockup.
- Section transitions keep framer-motion fades/slides but drop the R3F canvases.
- Detected via existing `useIsMobile` hook.

## Technical details

**Packages to add (pinned for React 18):**
- `three@^0.160`
- `@react-three/fiber@^8.18`
- `@react-three/drei@^9.122`
- `lenis@^1.1` (smooth scroll)
- `framer-motion` — already in the project if present; add if missing.

**New files:**
- `src/components/landing/Hero3D.tsx` — R3F canvas: laptop + phone + particles, mouse parallax, scroll-progress prop.
- `src/components/landing/HeroLaptop.tsx` — gltf-free laptop built from primitives (RoundedBox for base + screen), animated screen texture using an HTML canvas.
- `src/components/landing/HeroPhone.tsx` — same approach, phone body + screen.
- `src/components/landing/LeadParticles.tsx` — instanced glowing points.
- `src/components/landing/GlobeAccent.tsx` — small R3F canvas with rotating wireframe sphere + arcs, used beside the features section.
- `src/components/landing/SmoothScroll.tsx` — Lenis provider wrapping `<Landing />`.
- `src/components/landing/ScrollReveal.tsx` — thin framer-motion wrapper for section fade/slide-in on view.

**Files to edit:**
- `src/pages/Landing.tsx`
  - Wrap page in `<SmoothScroll>`.
  - Replace the current right-side split-code hero mockup with `<Hero3D />` (desktop) / existing static mockup (mobile).
  - Wrap Features, Pro, Testimonials, Pricing, Contact sections in `<ScrollReveal>`.
  - Add `<GlobeAccent />` beside the Features section on desktop.
- `tailwind.config.ts` — add a couple of keyframes if needed (float, glow-pulse). Existing scan animation stays.
- `src/main.tsx` — no changes required.

**What stays untouched:**
- Nav, headline copy, CTAs, features content, Pro section content, testimonials, pricing, contact form, footer, and all business logic / routes / edge functions.

**Performance guardrails:**
- Canvas uses `dpr={[1, 1.5]}`, `frameloop="demand"` where possible, `Suspense` fallback.
- Lazy-load `Hero3D` and `GlobeAccent` with `React.lazy` so the initial JS bundle stays small.
- Pause R3F canvases when off-screen using `useInView`.
- Reduced-motion: skip Lenis + freeze 3D idle animations, keep only static frame.

## Out of scope
- No changes to Pricing, Stripe, chatbots, admin, MCP, or any backend.
- No new 3D models from external sources; everything built from R3F primitives to avoid asset weight and licensing.
- SEO metadata untouched — the `<Seo>` component and JSON-LD stay as-is.
