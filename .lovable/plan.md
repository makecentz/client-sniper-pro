# Client Chatbots — Plan

Let ClientHunter users build a branded chatbot for each client, powered by **their own OpenAI API key** via the OpenAI **Assistants API + File Search**, fed by uploaded documents and crawled site pages, and embeddable on the client's site as a floating chat bubble.

## What the user sees

A new **"Chatbots"** section in the dashboard sidebar.

1. **Settings → AI Integrations**
   - Field to paste their OpenAI API key.
   - We store it encrypted (per-user secret in a new table) and validate it with a test call before saving.
   - A "Remove key" button.

2. **Chatbots list page (`/dashboard/chatbots`)**
   - Table of all bots they've built (client name, status, message count, created).
   - "Create chatbot" button.

3. **Create / edit chatbot wizard**
   - **Step 1 — Client info:** name, logo (optional), brand color, welcome message, suggested questions.
   - **Step 2 — Knowledge base:**
     - Drag-and-drop file uploads (PDF, DOCX, TXT, MD).
     - "Crawl website" input — paste a URL, we fetch up to N pages and add them as KB sources.
     - List of all current KB sources with delete buttons.
   - **Step 3 — Behavior:** system prompt template (pre-filled with a good default referencing the brand), tone selector, fallback message when the bot doesn't know.
   - **Step 4 — Deploy:** shows the embed snippet + a live preview of the bubble.

4. **Chatbot detail page**
   - Lightweight analytics card: total conversations, total messages, last-7-days chart.
   - KB management (add/remove sources, "re-sync").
   - Embed snippet (copy button) with floating-bubble preview.
   - "Test chat" panel so the user can talk to the bot themselves.

5. **Embed snippet** (what they hand to their client)
   ```html
   <script src="https://clienthunterai.com/widget.js"
           data-bot-id="abc123" async></script>
   ```
   Drops a bottom-right chat bubble matching the bot's brand color/logo.

## How it works (technical)

**OpenAI Assistants API + File Search**
- When a chatbot is created, an edge function calls the user's OpenAI key to:
  1. Create a **Vector Store** for that bot.
  2. Upload KB files (and crawled-page text as `.md` files) to that vector store.
  3. Create an **Assistant** wired to the vector store, with the system prompt.
- We store `openai_assistant_id`, `openai_vector_store_id`, `openai_thread_id` per conversation.
- Editing the KB = add/remove files in the vector store (no re-creation needed).

**Website crawl**
- New edge function `crawl-website` that fetches the URL, follows same-domain links (depth-limited, max ~20 pages), strips HTML, stores markdown chunks as files in the bot's vector store.

**Widget runtime**
- `public/widget.js` — vanilla JS that injects a shadow-DOM bubble + chat panel using `data-bot-id`.
- It POSTs messages to a public edge function `chatbot-message` which:
  1. Looks up the bot, loads the user's OpenAI key.
  2. Creates a thread on first message (cookie-stored thread id for continuity).
  3. Streams the Assistant run back as SSE.
  4. Increments `message_count` / `conversation_count` on the bot row (no transcript stored).
- CORS open so the widget works on any client domain.

**Security**
- OpenAI keys stored in a new `user_api_keys` table, only readable by the owner via RLS, decrypted server-side in edge functions using `SUPABASE_SERVICE_ROLE_KEY`.
- Widget endpoint is rate-limited per `bot_id` + IP to prevent abuse running up the user's OpenAI bill.
- Each bot has an `is_active` toggle the user can flip to instantly disable.

## Database changes

New tables (all RLS-scoped to `auth.uid()`, with grants):
- `user_api_keys` — user_id, provider ('openai'), encrypted_key, last_validated_at.
- `chatbots` — user_id, name, client_name, brand_color, logo_url, welcome_message, suggested_questions, system_prompt, fallback_message, openai_assistant_id, openai_vector_store_id, is_active, message_count, conversation_count.
- `chatbot_kb_sources` — chatbot_id, type ('file'|'url'), name, openai_file_id, size_bytes, status.

New storage bucket: `chatbot-kb` (private) for original uploaded files.

## New edge functions

- `validate-openai-key` — quick test call to verify the key works.
- `chatbot-create` — provisions vector store + assistant on OpenAI.
- `chatbot-kb-upload` — pushes a file/URL crawl result into the bot's vector store.
- `chatbot-kb-delete` — removes a file from the vector store.
- `crawl-website` — fetches pages and pipes them into `chatbot-kb-upload`.
- `chatbot-message` (public, CORS-open) — the widget's chat endpoint, streams the Assistant response.

## Out of scope (for this first build)

- Full transcript storage / inbox view (we agreed: counts only).
- Lead capture forms inside the bot.
- Multi-language UI for the widget.
- Image/voice messages.

These can be added later without rework — the schema leaves room.

## Build order

1. DB migration + `user_api_keys` UI in Settings + validate-key edge function.
2. Chatbots list + create wizard (steps 1, 3 — no KB yet) + `chatbot-create` edge function.
3. KB upload (files only) + storage bucket + `chatbot-kb-upload`.
4. Website crawl + `crawl-website`.
5. `chatbot-message` edge function + `public/widget.js` + embed-snippet UI + test chat panel.
6. Analytics counters + bot detail page polish.
