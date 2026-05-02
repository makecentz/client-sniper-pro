# Hot Feature Section: Instant Lovable.dev Demo Sites

Add a bold, attention-grabbing section to the landing page (`src/pages/Landing.tsx`) that promotes the Pro-only "Build Demo Website Prompt" feature — the one that turns a saved lead's Google listing into a one-click Lovable.dev prompt.

## Placement

Insert a new section between the **Features** ("How It Works") section and the **Pricing** section, so it's the climax of the marketing flow right before the upgrade CTA.

## Visual design

A two-column layout (stacked on mobile) inside a glowing gradient card:

**Left column — copy:**
- Small "🔥 HOT — PRO FEATURE" eyebrow badge (primary glow + flame icon)
- Headline: **"Pitch a real website in 60 seconds."**
- Sub-copy: "Every Pro lead comes with a one-click Lovable.dev prompt built from their Google listing — photos, hours, reviews, contact info, all included. Paste it into Lovable.dev and walk into your sales call with a working demo site."
- Bullet list with check icons:
  - Pulls real photos from the prospect's Google Maps listing
  - Auto-fills business name, address, phone, hours
  - Generates a copy-paste prompt for Lovable.dev
  - Open in Lovable.dev with one click
- "Powered by" row with the Lovable wordmark/logo
- Primary CTA: **"Unlock with Pro"** → routes to `/signup` (or `/dashboard/settings` for logged-in free users)

**Right column — visual mockup:**
A faux Lovable.dev editor screen (pure CSS/HTML, no external image) so we don't ship copyrighted assets:
- macOS-style window chrome (3 traffic-light dots)
- URL pill showing `lovable.dev`
- Left side: a "prompt" panel showing a syntax-highlighted snippet like:
  ```
  Build a modern marketing site for
  Joe's Pizza (Brooklyn, NY).
  Use these Google photos as the hero…
  Phone: (555) 123-4567
  Hours: Mon–Sun 11am–11pm
  ```
- Right side: a tiny mocked website preview (hero block, gallery thumbnails, contact card) inside the same window
- Soft glow + tilt/perspective for a premium look
- Floating badge over the mockup: "✨ Generated from Google Maps"

The whole card uses an animated `bg-gradient-to-br from-primary/20 via-primary/5 to-transparent` with a subtle radial glow and a thin primary border to match the existing dark theme.

## Lovable logo asset

To avoid embedding an external/copyrighted logo, render the wordmark as styled text: `<span className="font-bold tracking-tight">lovable<span className="text-primary">.dev</span></span>` paired with a small Sparkles/Wand icon. This keeps the section legally safe and visually on-brand with the rest of the dark UI. (If the user prefers an actual logo image, they can drop one into `src/assets/` later and we'll swap it in.)

## Technical changes

- Edit only `src/pages/Landing.tsx`:
  - Add `Sparkles, Flame, Wand2, ArrowRight, Check` to the existing `lucide-react` import.
  - Insert the new `<section>` between the existing Features section (around line 150) and the Pricing section (around line 153).
  - Use only existing semantic Tailwind tokens (`bg-card`, `border-border`, `text-foreground`, `text-primary`, etc.) so it matches the dark theme automatically.
- No new dependencies, no new files, no backend changes — the underlying feature already exists in the lead detail modal.

## Out of scope

- Actual Lovable.dev brand logo image (using styled text wordmark instead).
- Animated demo video — the mockup is static CSS for fast load.
- Changes to pricing copy or the Pro plan card itself.
