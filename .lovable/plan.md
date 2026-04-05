

## Plan: Show Website Status and All Issue Badges on Saved Leads

### Problem
When a lead is saved and viewed on the Saved Leads page, the "No Website" status and other website quality signals don't show up. This is because the UI only renders badges for specific boolean flags (no_ssl, website_error, not_mobile_friendly, outdated_copyright) but has no badge for leads with no website at all.

### Changes

**SavedLeads.tsx** — Update the website issue badges section:

1. Add a "No Website" badge that shows when `has_website === false` — displayed prominently since this is the primary signal for a hot lead
2. Move the badge section outside the `website_issues?.length > 0` wrapper so individual boolean flags always render regardless of the array state
3. Add a "Has Website" indicator (green badge or text) when the lead does have a website but no issues, so the user always sees the website status

The updated badge section will render:
- **No Website** (destructive badge with Globe icon) — when `!has_website`
- **No SSL** — when `no_ssl === true`
- **Site Error** — when `website_error === true`
- **Not Mobile Friendly** — when `not_mobile_friendly === true`
- **Outdated Copyright** — when `outdated_copyright === true`

These badges will show unconditionally based on their boolean values, not gated behind the `website_issues` array check.

### Technical Details
- Only one file changes: `src/pages/dashboard/SavedLeads.tsx`
- Remove the outer `{lead.website_issues && lead.website_issues.length > 0 && ...}` wrapper
- Add `{!lead.has_website && <Badge>No Website</Badge>}` as the first badge
- Import `Globe` icon (already imported) for the No Website badge

