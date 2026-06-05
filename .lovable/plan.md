## Goal
Add an "AI Presence Score" to each lead that detects whether a business's website uses AI features (chatbot, AI voice assistant, AI scheduler, etc.), and if not, shows an estimated monthly revenue loss and number of missed customers. Displayed in the Saved Leads → Lead Detail Modal → Overview tab.

## What gets detected

The website analyzer will scan the page HTML for fingerprints of common AI tools:

- **Chatbots**: Intercom, Drift, Tidio, Tawk.to, LiveChat, Crisp, HubSpot Chat, Zendesk, Ada, LivePerson, ChatGPT widgets, custom `chatbot`/`ai-assistant` markers
- **AI voice assistants**: Vapi, Bland, Retell, Synthflow, Air.ai, voiceflow embeds
- **AI schedulers/assistants**: GoHighLevel AI, Calendly AI, ServiceTitan AI
- **Generic AI markers**: `openai`, `anthropic`, `gemini`, `dialogflow`, `rasa`, "Powered by AI", "AI Assistant" copy

Each match adds to an `ai_score` (0–100). A site with no detectable AI = 0.

## New lead fields (database migration)

Add to `leads`:
- `ai_score` int (0–100)
- `ai_features_detected` text[] (e.g. `["Intercom Chatbot"]`)
- `has_chatbot` bool
- `has_ai_voice` bool
- `estimated_monthly_revenue_loss` numeric (USD)
- `estimated_monthly_missed_customers` int

## Revenue loss formula

Industry-standard estimate based on the business's review count as a proxy for monthly traffic/leads:

```text
monthly_visitors        = max(review_count * 20, 200)
baseline_conversion     = 2%
ai_conversion_uplift    = 35%   (chatbot capture of after-hours + abandonment)
missed_customers        = round(monthly_visitors * baseline_conversion * ai_conversion_uplift)
avg_customer_value      = $150  (configurable default per category later)
revenue_loss            = missed_customers * avg_customer_value
```

If the site already has a chatbot AND voice AI → loss = $0, missed = 0.
If it has one but not the other → loss is halved.

## Backend changes

**`supabase/functions/analyze-website/index.ts`**
- Add `detectAIFeatures(html)` that returns `{ ai_score, features, has_chatbot, has_ai_voice }`.
- Add `calculateRevenueLoss({ has_chatbot, has_ai_voice, review_count })` returning `{ revenue_loss, missed_customers }`.
- Include all six new fields in the `updateData` object so existing analyze flow persists them.

**`supabase/functions/search-businesses/index.ts`**
- During the per-result website check, populate the same six fields so newly searched leads get an AI score immediately.

## Frontend changes

**`src/lib/mock-data.ts`**
- Add the six new fields to the `Lead` interface (optional/nullable).

**`src/components/LeadDetailModal.tsx`** (Overview tab)
- New "AI Presence" card below the existing issue badges showing:
  - Big score number (e.g. `AI Score 0/100`) color-coded red/yellow/green
  - Two status pills: "Chatbot: ❌ None" / "Voice AI: ❌ None" (✅ green if detected, listing the tool name)
  - When score is low, a "Missed Opportunity" panel:
    - `$X,XXX/mo estimated revenue loss`
    - `~XX customers/month going to competitors`
    - One-line copy: "Adding an AI chatbot + voice assistant could recover this revenue."

## Out of scope
- No changes to pricing, auth, or other lead tabs (Details/Notes/AI Content stay as-is).
- No new admin settings — formula constants live in the edge function for now.
- No re-analysis of already-saved leads in bulk; new field populates on next analyze/search. A small "Rescan website" button could be added later.

## Open question
The revenue formula above uses `review_count × 20` as a traffic proxy and a flat `$150` avg customer value. Want me to tune these (e.g. per-category customer values like $500 for contractors, $80 for salons), or ship with the flat default and iterate later?
