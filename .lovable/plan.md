

# Cromane Watch — Implementation Plan

## Overview
A minimalist coastal companion app for Cromane, Co. Kerry. Built as a web app with Capacitor for native Android deployment. MVP focuses on the stunning glassmorphism UI with real/free data sources, no authentication required.

---

## Phase 1: The Interface — "Quiet Hardware" Design

### Home Screen Layout
- **Single scrollable view** — no navigation menus, no tabs
- **Glassmorphism cards** with frosted translucent backgrounds that shift based on weather state:
  - **Clear conditions**: Pale frosted blue palette
  - **Warning/Lightning active**: Deep charcoal with subtle amber pulsing border animation
- **Typography**: Inter Light, large data-first hierarchy — tide time and wind speed readable in under 3 seconds
- **Swipe gesture support** for refreshing data (pull-to-refresh)

### Card Stack (top to bottom)
1. **Current Conditions Card** — Wind speed (knots + Beaufort), direction, temperature
2. **Met Éireann Warnings Card** — Yellow/Orange/Red status for Kerry, with color-coded badges
3. **Tide Card** — Next high/low tide times for Cromane Point, with a minimal tide curve visual
4. **Marine Card** — Small Craft Warnings for Southwest Coast

### Lifestyle Action Links
- "Book Sauna" link appears on the Tide Card when conditions are calm
- "Book Golf" link appears on the Conditions Card when wind < 25kts and no Red/Orange warnings
- Styled as subtle, elegant text links — not buttons

---

## Phase 2: Data Integration (Free/Open Sources)

### Weather & Wind
- **Open-Meteo API** (free, no key required) — current wind speed, direction, temperature for Cromane's coordinates (51.9356, -9.9067)
- Wind displayed in knots + Beaufort scale with 3-hour trend arrow

### Tides
- **WorldTides API** (free tier) or open tide data — high/low predictions for Cromane Point
- Cache last 12 hours of tide data locally for offline resilience

### Met Éireann Warnings
- **Met Éireann RSS/XML feed** — parsed for Kerry-specific weather warnings via a backend edge function
- Small Craft Warnings from the marine forecast feed

### Lightning (Placeholder for MVP)
- Display a "Lightning monitoring" status indicator
- Note: Real-time lightning proximity requires a paid API (e.g., Blitzortung, XWeather) — flagged for Phase 3

---

## Phase 3: Backend with Lovable Cloud

- **Edge functions** to proxy and parse external API feeds (Met Éireann RSS, Open-Meteo, tides)
- **Caching layer** — edge functions cache responses to reduce API calls and enable offline-friendly data
- Periodic data refresh (every 15 minutes for weather, hourly for tides)

---

## Phase 4: Native Android via Capacitor

- Capacitor setup for native Android build
- PWA-style offline caching of last-known data
- Guidance provided for Android Studio build and Google Play deployment
- Note: Push notifications (lightning alerts, warning changes) will be scoped for a future phase as they require Firebase Cloud Messaging setup on your end

---

## What's Included in MVP
✅ Glassmorphism UI with weather-reactive theming  
✅ Real-time wind data (Open-Meteo)  
✅ Tide times for Cromane  
✅ Met Éireann warnings for Kerry  
✅ Contextual booking links (Sauna + Golf)  
✅ Offline data caching  
✅ Capacitor Android setup  

## What's Deferred (Post-MVP)
⏳ Real-time lightning strike notifications (paid API)  
⏳ Push notifications via Firebase  
⏳ Google Play Store publishing  

