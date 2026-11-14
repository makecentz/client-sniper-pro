# Architecture rules
- Keep search-result dismissal in a pure helper that reindexes screenshot and selection state; list and map use the same result array to prevent mismatched businesses.
- Do not send leads to another project until it exposes an authenticated receiving integration; never reuse this app's session on another origin.
- Proxy Lead Tracker transfers through a session-validated edge function with a fixed receiver URL and server-only shared key; the browser must never hold cross-project credentials.