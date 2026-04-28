## Link / Unlink Google Account in Settings

Let users who signed up with email/password connect (or disconnect) a Google account from their profile. Once linked, they can sign in with either method.

### What the user sees

A new **"Connected Accounts"** card on the Settings page (`/dashboard/settings`), placed right under the **Account** card.

It lists each sign-in method available on their profile:

- **Email & Password** — always shown, marked "Primary".
- **Google** — shows one of two states:
  - Not linked: "Connect your Google account to sign in faster" + **Connect Google** button.
  - Linked: shows the Google email + **Disconnect** button (with confirmation dialog).

Toasts confirm success/failure for both actions. Disconnect is blocked (with an explanatory toast) if Google is the user's only remaining sign-in method — they must keep at least one way to log in.

### How it works (technical)

1. **Enable Google as a managed OAuth provider** in Lovable Cloud (uses the built-in managed credentials — no Google Cloud Console setup needed from the user).

2. **Read identities**: `supabase.auth.getUserIdentities()` returns the list of providers attached to the current user (`email`, `google`, etc.). The Settings card derives its UI state from this list.

3. **Link Google**:
   ```ts
   await supabase.auth.linkIdentity({
     provider: "google",
     options: { redirectTo: `${window.location.origin}/dashboard/settings` },
   });
   ```
   This redirects the user through Google's consent screen, then back to Settings. Supabase attaches the new identity to the existing account (no new user is created). On return, we re-fetch identities and show the linked state.

4. **Unlink Google**:
   ```ts
   const { data: { identities } } = await supabase.auth.getUserIdentities();
   const googleIdentity = identities.find(i => i.provider === "google");
   await supabase.auth.unlinkIdentity(googleIdentity);
   ```
   Guarded so the user always has at least one identity left.

5. **Prerequisite — enable identity linking** on the auth project (`configure_auth` with `manual_linking_enabled: true`). Without this flag, `linkIdentity` returns an error.

### Files touched

- `src/pages/dashboard/DashboardSettings.tsx` — add the new "Connected Accounts" card + handlers.
- (new) `src/hooks/use-linked-identities.ts` — small hook wrapping `getUserIdentities`, used by the card.
- Cloud auth config — enable Google provider + manual identity linking via the configure tools (no code file).

### Out of scope

- No changes to the Login or Signup pages (Google sign-in on those pages is a separate request).
- No DB schema changes — identities live in `auth.users` and are managed by Supabase.
- No changes to `AuthContext` — identities are read directly where needed.

### Edge cases handled

- User clicks Connect, completes Google flow → returns to `/dashboard/settings`, list refreshes automatically.
- User cancels Google consent → toast "Google connection canceled", state unchanged.
- Unlink attempted when Google is the only identity → blocked with "You must keep at least one sign-in method" toast.
- Google account already linked to a different ClientHunter user → Supabase rejects with a clear error, surfaced as a toast.
