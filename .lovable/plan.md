## Goal
Replace the free-text "Business Type" input in the dashboard Search panel with a searchable dropdown of 40+ industries.

## Changes
1. **New file `src/lib/industries.ts`** — export a curated list of 45 industries (Plumber, Electrician, HVAC, Roofer, Landscaper, Painter, Dentist, Chiropractor, Med Spa, Veterinarian, Optometrist, Law Firm, Accountant, Real Estate Agent, Insurance Agency, Mortgage Broker, Auto Repair, Auto Dealer, Car Wash, Restaurant, Cafe, Bakery, Bar, Caterer, Hotel, Gym, Yoga Studio, Hair Salon, Barber Shop, Nail Salon, Spa, Pet Groomer, Daycare, Tutor, Photographer, Wedding Planner, Cleaning Service, Pest Control, Locksmith, Moving Company, Solar Installer, Pool Service, Florist, Jeweler, Tattoo Studio).

2. **Edit `src/pages/dashboard/SearchPanel.tsx`** (line 257) — replace the `<Input>` with a shadcn `<Select>` populated from the industries list, bound to the existing `businessType` state. Keep the existing validation/submit logic unchanged.

## Notes
- Uses the existing shadcn `Select` component (already in the project).
- Heatmap page is left as-is (user only asked about the search section).
- No backend/business-logic changes; the value sent as `business_type` is the selected label string, matching the current API contract.