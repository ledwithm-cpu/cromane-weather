# Site copy: make "free, no fees" and the home-sauna feature unmistakable

## Goal
Every visitor should quickly understand three things: the site is 100% free,
they can set a home sauna to see its tide times and weather instantly, and
booking links go straight to the operator with no fees to anyone.

## Copy changes

### 1. Landing page (`src/pages/Landing.tsx`)
- Hero sub-line: sharpen to lead with the value —
  e.g. "Free tide times, sea conditions & weather for 142 coastal saunas. Set
  your home sauna and it's the first thing you see. Book direct with the
  operator · no fees for you or them."
- "How this works" section: rewrite the third paragraph to state plainly —
  the site is free forever, no signup needed; booking links go straight to the
  sauna's own site; we never take a commission or add a booking fee; operators
  pay nothing to be listed.
- Email-capture card: add a short reassurance line ("free, occasional ·
  unsubscribe anytime" tone, minimal).

### 2. Discovery page hero (`src/pages/DiscoverMap.tsx`)
- Update hero sub-line to mention: free to use, save favourites / set a home
  sauna, direct booking links.

### 3. Sauna detail page (`src/pages/Index.tsx`)
- Near the booking button, add one small muted line: "Booking is on the
  operator's own site · no fees, no commission." so it's clear at the moment
  of action.

### 4. How It Works page (`src/pages/HowItWorks.tsx`)
- Add a short "What it costs" section near the top: "Nothing · to you or the
  saunas. The site is free, bookings happen on each operator's own site, and
  no one pays to be listed."

### 5. Metadata (`Landing.tsx` SEOHead description)
- Already mentions "100% free, no signup needed" · verify it stays accurate
  after edits and mirrors the new hero line.

## Constraints
- Copy-only changes · no layout, logic, or data changes.
- Keep calm coastal tone, mid-dots (·), existing design tokens.
- Home-sauna wording should match the existing "Set as my home sauna" toggle.

## Verification
- Typecheck + build.
- Browser check of `/`, `/discover`, a sauna detail page, and `/how-it-works`
  to confirm the new lines render.
