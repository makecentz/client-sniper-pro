

## Plan: Add Copy Buttons to Lead Detail Modal Overview

### What Changes
**`src/components/LeadDetailModal.tsx`** — lines 247-251 in the Overview tab

Replace the plain text display of phone, email, address, and website with rows that include a small copy button on the right side. The existing `copyContent` helper (line 179) already handles clipboard + toast.

Each contact field row becomes a flex container with `justify-between`:
- Left side: icon + text (or link for website)
- Right side: a ghost `Copy` icon button calling `copyContent(value)`

This keeps the layout clean and consistent. Only the Overview tab is changed — the Details tab already has editable inputs.

### Example Structure
```tsx
<div className="flex items-center justify-between group">
  <p className="flex items-center gap-2">
    <Phone className="h-4 w-4 text-muted-foreground" /> {lead.phone}
  </p>
  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => copyContent(lead.phone)}>
    <Copy className="h-3 w-3" />
  </Button>
</div>
```

Applied to: `phone`, `address`, `email`, `website` — each conditionally rendered as before. The copy button appears on hover for a clean look.

