
# ClientHunter AI — Phase 1: Core UI & Foundation

## Overview
Build the complete frontend UI with dark theme, authentication flow, and lead management — all wired up and ready for integrations in later phases.

## Design System
- **Theme**: Dark-first (black/deep navy background, blue accents `#3B82F6`, white text)
- **Style**: Modern SaaS — clean card layouts, subtle borders, rounded corners
- **Font**: Inter for body, bold headings
- **Components**: shadcn/ui components throughout

## Pages & Layout

### 1. Landing Page (`/`)
- Hero section: "Snipe high-value clients in minutes" tagline
- Feature highlights (Search → Score → AI Message → Close)
- Pricing section (Free vs Pro $29/mo, or $10 for 15 leads)
- CTA buttons → Login/Sign Up

### 2. Auth Pages (`/login`, `/signup`)
- Email/password authentication via Supabase Auth
- Clean centered card design
- Redirect to dashboard after login

### 3. Dashboard (`/dashboard`) — Protected Route
- **Sidebar navigation**: Search, Saved Leads, AI Tools, Settings
- **Search Panel**: City, State, Business Type inputs + Search button (UI only — Outscraper integration comes in Phase 2)
- **Lead Results**: Card/table view showing business name, address, phone, website, score badge (🔥 Hot Lead / ⚠️ Needs Upgrade)
- **Saved Leads**: List with filters (All / Contacted / Not Contacted), notes, export CSV button
- **AI Tools Panel**: Generate Outreach (Email/DM/SMS), Generate Offer, Generate Follow-Up buttons (UI only — AI integration in Phase 2)

### 4. Admin Dashboard (`/admin`) — Role-protected
- Users list, subscription stats, usage stats, webhook logs (UI shells)

## Database Tables (Supabase)
- `profiles` — user profile data (linked to auth.users)
- `user_roles` — admin/user roles (security-compliant separate table)
- `leads` — business_name, phone, address, website, score, screenshot_url, ai_audit, contacted, notes, user_id
- `messages` — lead_id, type (email/dm/sms), content
- `offers` — lead_id, content
- `webhook_logs` — source, event_type, payload
- `usage_tracking` — user_id, searches_today, leads_remaining, plan

## Key Functionality in Phase 1
- Full auth flow (login, signup, logout, protected routes)
- Lead CRUD: save, edit notes, mark contacted, delete
- CSV export of saved leads
- Mock/sample lead data to demonstrate the UI
- Usage tracking display (searches remaining, plan status)
- Responsive layout (desktop-first, mobile-friendly)

## What's Deferred to Later Phases
- Phase 2: Outscraper search integration, ScreenshotOne captures
- Phase 3: AI features (Lovable AI for outreach, offers, audits)
- Phase 4: Stripe payments & subscription management
- Phase 5: Resend email sending integration
