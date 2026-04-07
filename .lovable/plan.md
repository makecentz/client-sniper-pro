

## Plan: Add Profile Dropdown to Dashboard Top Bar

### What Changes

**`src/components/DashboardLayout.tsx`**
- Import `useAuth`, `Avatar`, `AvatarFallback`, `DropdownMenu` components, and icons (`User`, `Settings`, `LogOut`)
- In the `<header>`, add a profile dropdown on the right side (using `ml-auto`) containing:
  - **Trigger**: An `Avatar` showing the user's initials (derived from email) with a chevron
  - **Dropdown content**:
    - User email label at the top
    - "Settings" link → `/dashboard/settings`
    - "Log out" action → calls `logout()` and navigates to `/`
- Keep the `SidebarTrigger` on the left as-is

### Visual Layout
```text
[ ☰ ]                                    [ JD ▾ ]
  ^                                         ^
  sidebar trigger                     avatar dropdown
```

### Scope
One file changed. Uses existing `Avatar`, `DropdownMenu`, and `useAuth` — no new dependencies.

