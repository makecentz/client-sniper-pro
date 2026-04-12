

## Plan: Light/Dark Theme Toggle

### Approach
Use Tailwind's `darkMode: ["class"]` (already configured) with a `.dark` class on `<html>`. Store preference in localStorage. Add a theme toggle in both the dashboard settings page and the sidebar.

### Changes

**1. `src/index.css`** — Add light theme variables
- Current `:root` becomes the dark theme (move under `.dark`)
- New `:root` gets light theme values: white background, dark text, light grays for cards/borders, same blue primary

```text
:root (light)                    .dark (current values)
--background: 0 0% 100%         --background: 222 47% 6%
--foreground: 222 47% 11%       --foreground: 210 40% 98%
--card: 0 0% 99%                --card: 222 47% 8%
--border: 220 13% 91%           --border: 217 33% 17%
--muted: 220 14% 96%            --muted: 217 33% 14%
--primary: 217 91% 60% (same)   --primary: 217 91% 60%
... etc
```

**2. `src/hooks/use-theme.ts`** — New hook
- Reads/writes `theme` in localStorage (`"light"` | `"dark"`)
- Defaults to `"dark"` (current behavior)
- Toggles `.dark` class on `document.documentElement`
- Returns `{ theme, setTheme, toggleTheme }`

**3. `src/components/ThemeToggle.tsx`** — New component
- Sun/Moon icon button using the hook
- Compact, reusable

**4. `src/components/DashboardSidebar.tsx`** — Add toggle
- Add `ThemeToggle` in the sidebar footer, before the logout button

**5. `src/components/DashboardLayout.tsx`** — Add toggle in header
- Add `ThemeToggle` next to the avatar dropdown for quick access

**6. `src/pages/dashboard/DashboardSettings.tsx`** — Add theme section
- New card "Appearance" with light/dark selection (radio or switch)

**7. `src/pages/Admin.tsx`** — Theme toggle available via header (no extra work needed since layout already covers it)

### Scope
- 0 migrations
- 2 new files (hook + component)
- 4 files updated (index.css, DashboardSidebar, DashboardLayout, DashboardSettings)

