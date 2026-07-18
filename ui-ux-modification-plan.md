# SCRB Crime Intelligence Console — UI/UX Modification Plan

Reviewed against: current screenshot (sidebar nav, header toolbar, KPI cards, map, network graph, correlation charts, audit log) and the current codebase (`App.jsx`, `MapView.jsx`, `NetworkView.jsx`, `CorrelationChart.jsx`, `RoleSwitcher.jsx`, `Breadcrumbs.jsx`, `api.js`, `ui/Card.jsx`, `ui/Badge.jsx`, `ui/Button.jsx`, `ui/StatCard.jsx`, `index.css`).

**Progress since last pass:** the sidebar, breadcrumb, shared Card/Badge/Button/StatCard components, centralized `api.js` client, hotspot legend, network graph legend, dark-themed Leaflet zoom control, and the markdown-rendering bug are all in place now. This plan covers what's left, organized by priority.

---

## P0 — Trust & honesty issues (fix before this goes in front of real users)

These aren't cosmetic. For a law-enforcement-facing tool, an interface that *implies* security guarantees it doesn't have is a bigger risk than a plain-looking one.

1. **The "auth" system fabricates a real-looking JWT and the UI presents it as authenticated.**
   `RoleSwitcher.jsx` generates a token literally starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` (a real JWT header) and stores it in `localStorage`. `api.js` then attaches it as `Authorization: Bearer <token>` on every request. The backend never checks this header — any role switch just relabels the UI. The console shows **"✓ Session Token Authenticated"** in green with a shield icon, which is a genuine authentication UI pattern applied to something with no authentication behind it.
   - **Fix the copy, not just the code path:** until there's real backend validation, don't render language that claims authentication succeeded. Replace with something honest, e.g. *"Role: Analyst (client-side, unverified)"* — or gate the whole flow behind a real check.
   - If backend validation is in scope, wire `Authorization` header verification into the FastAPI routers (401 on missing/invalid role claims) so the badge is describing something real.

2. **"SUPERVISOR MODE SECURE" and "Cryptographically tracked operator access logs" overstate what the audit log actually is.**
   The log entries are `Math.random()`-generated IDs/tokens held in React state — they vanish on refresh and were never sent to a server. Calling this "cryptographically tracked" is a factual claim the app can't back up.
   - Rename to something accurate: *"Session Activity Log (local, this browser only)"*.
   - If/when this is backed by a real audit table, restore the stronger language then — not before.

3. **The date-range control and search box look interactive but do nothing.**
   "Oct 2025 – Dec 2025" and "Search suspects..." are styled exactly like working controls (same border, same focus states) but have no `onChange`/click handling. A user will click them expecting a filter or search and get silent nothing.
   - Either wire minimal functionality (even just updating a state value the map/chart doesn't yet use, with a "coming soon" tooltip), or visually mark them as disabled/placeholder so they don't read as broken.

4. **KPI trend indicators are hardcoded, not computed.**
   `StatCard` renders `trend="+2 new"` / `"+12.4%"` / `"+0.8%"` as static props in `App.jsx` regardless of what the underlying data actually shows. This is worse than the old flat KPI numbers were, because a trend arrow *specifically* signals "this is a real calculated comparison" — right now it's decoration wearing an analytics costume.
   - Compute trend from real deltas where the API supports it (e.g. compare current `riskScores` fetch to a cached previous fetch), or remove the trend row entirely until there's a real time-series to diff against.

---

## P1 — Functional/visual bugs

5. **Scatter/bar chart axis ticks render ugly, non-round numbers.**
   Visible in the screenshot: Y-axis shows values like `299996`, `3.0265`, `6.0265`, `9.0265`; X-axis shows `3.58, 4.58, 5.58...`. This comes from `CorrelationChart.jsx` computing `domain` dynamically as `[min - padding, max + padding]` with `tickCount={6}` but no rounding — Recharts is doing exact math on an ugly range instead of snapping to nice intervals.
   - Add a `tickFormatter` (e.g. round to 1–2 decimals, or use `d3-scale`'s `.nice()` equivalent by rounding the domain bounds to the nearest sensible step before passing them to `domain`).
   - Quick fix: `Math.floor`/`Math.ceil` the padded min/max to the nearest round number based on the data's magnitude.

6. **`justifyBars` typo (copy-pasted twice).**
   Appears in `App.jsx` (profile menu avatar) and `MapView.jsx` (loading overlay) as `justifyBars: 'center'` sitting alongside the correct `justifyContent: 'center'`. Harmless (invalid CSS property, browser ignores it) but it's a sign the same copy-paste error propagated — worth a repo-wide search for `Bars:` to catch any other instances.

7. **Map popup/side panel still eats a large share of the map.**
   The floating `.map-sidebar` (280px fixed width) is a real improvement over the old anchored popup, but at typical card widths it still covers roughly a third of the map, including the exact circle a user just clicked. Options, in order of effort:
   - Add a collapse/minimize toggle on the panel itself.
   - Dim/desaturate the map behind the panel slightly so it reads as "background context" rather than competing for attention.
   - On wider viewports, dock it as a true sidebar column (pushes map width rather than floating over it) instead of an overlay.

8. **`MapView.jsx` still uses a raw hardcoded `fetch("http://localhost:8000/api/hotspots")` instead of the new `api.js` client.**
   Every other component (`NetworkView`, `App`) was migrated to `api.getX()`, but `MapView` was missed — meaning `.env`'s `VITE_API_BASE_URL` is silently ignored for hotspot data specifically. This will break in any non-localhost deployment while every other panel keeps working, which is a confusing failure mode to debug later.
   - Replace with `api.getHotspots(activeDistrict)`.

9. **Emoji mixed with the new Lucide icon system.**
   `StatCard` and the sidebar were migrated to Lucide icons, but `Card.jsx`'s error state (`⚠️`) and empty state (`🗀`) still use raw emoji — `🗀` in particular is a rarely-supported character that renders as a missing-glyph box on some systems/fonts.
   - Swap both for Lucide (`AlertTriangle`, `Inbox` or `FolderOpen`) to match the rest of the icon system and guarantee consistent rendering.

---

## P2 — Visual consistency

10. **Pink is still the default "primary" and "selected" color, contradicting the app's own design direction.**
    `Button`'s default `primary` variant and `RoleSwitcher`'s selected-role background both use `var(--accent-pink)`, even though the rest of the redesign (network graph accused-node color, chart highlight dot) deliberately moved *away* from pink toward blue/red to stop overloading it. Right now pink means "primary action," "selected role," *and* used to mean "flagged suspect" — the last one was fixed, but the first two keep pink as the dominant accent while everything else shifted to blue.
    - Pick one lane: either make blue the single primary/selected accent everywhere (matching the sidebar's active-item blue) and retire pink entirely, or keep pink strictly for brand/logo and make `Button`'s primary variant blue.

11. **Redundant/competing visual weight between sidebar "disabled" nav items and their tooltips.**
    Reports/Alerts/Settings are correctly greyed out and `disabled`, but they still look clickable enough (same icon size, same hover region) that a user will try them and only discover they're inert via a native browser tooltip after a delay. Consider a small "Soon" badge or lock icon instead of relying on hover-only feedback.

12. **Committed build artifacts.**
    The `frontend/dist/` folder (compiled JS/CSS bundle) is present in the shipped archive alongside source. This should be in `.gitignore` and excluded from what gets shared/reviewed — it's generated output, not source, and it roughly doubles the payload for no benefit to a reviewer.

---

## P3 — Polish

13. **Repo hygiene:** confirm `.oxlintrc.json` rules are actually run in CI (currently only via the `lint` npm script, no evidence of it being enforced on commit/PR).
14. **Network graph fullscreen mode:** verify keyboard escape (`Esc`) closes fullscreen, not just the "Exit Full" button — a fullscreen portal without an Esc handler is a common accessibility miss.
15. **Sidebar collapse state doesn't persist** across a refresh — minor, but a returning user will have to re-collapse it every session if that's their preference.

---

## Suggested order of execution

| Order | Item(s) | Why first |
|---|---|---|
| 1 | #1, #2 (fake auth / audit copy) | Integrity issue, not just polish — misrepresents system state |
| 2 | #5 (chart axis ticks) | Visibly broken in current screenshot, quick fix |
| 3 | #8 (MapView api.js migration) | Silent deployment bug waiting to happen |
| 4 | #3, #4 (non-functional controls, fake trends) | Same "looks real, isn't" pattern as #1/#2 |
| 5 | #6, #9 (typo, emoji) | Trivial, do in the same pass as whatever file you're already touching |
| 6 | #7, #10 (map panel, pink/blue accent) | Larger visual decisions, worth a deliberate pass rather than a quick patch |
| 7 | #11–15 | Cleanup once the above is stable |

Happy to start implementing any of these — the P0 items (auth copy + audit log labeling) are the smallest change with the biggest credibility impact, so that's where I'd suggest starting if you want one place to begin.
