

## Plan: Add Zip Code Field and State Dropdown to Search

### Changes

**1. SearchPanel.tsx (Frontend)**
- Add a `zipCode` state field
- Replace the State `Input` with a `Select` dropdown pre-populated with all 50 US state abbreviations
- Make the State select narrower (use a smaller grid column)
- Add a Zip Code input field
- Change the grid from 4 columns to 5 to accommodate the new field (State and Zip can be narrow)
- Pass `zip_code` in the request body to the edge function

**2. search-businesses/index.ts (Edge Function)**
- Accept optional `zip_code` from the request body
- Validate it (optional, string, max 10 chars, digits only)
- When zip code is provided, append it to the Outscraper query string (e.g. `"Plumber in Austin, TX 78701"`) so results are scoped to that zip code area

### Layout
The grid will be restructured so State and Zip are narrow fields:

```text
| City (wider) | State (narrow dropdown) | Zip (narrow) | Business Type (wider) | Search btn |
```

Using `md:grid-cols-[1.5fr_0.7fr_0.7fr_1.5fr_auto]` or similar to keep State and Zip compact.

### Technical Details
- US state abbreviations hardcoded as a constant array
- Using shadcn `Select` component for the state dropdown
- Zip code appended to the Outscraper query string after state, which naturally constrains Google Maps results to that area

