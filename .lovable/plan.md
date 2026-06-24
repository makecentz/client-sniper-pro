## Plan

In `src/pages/dashboard/SearchPanel.tsx`, after a lead is successfully saved (line 169, right after the insert succeeds), remove that result from the displayed search results list so it no longer appears.

### Changes
- After `if (error) throw error;` in the save handler, remove the saved result from the `results` state (filter out by index `idx`).
- Also clean up the associated `screenshots[idx]` entry so the remaining results render correctly.
- No backend changes — the lead already lives in the `leads` table and will show under Saved Leads.