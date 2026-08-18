# Family Calendar handoff

## Purpose

`apps/family-calendar` is the production-tested family planning surface that
will eventually join WALL BALL. It is intentionally handed off as a separate
application: that preserves a working calendar while the combined product's
route structure, account model, and shared data ownership are decided.

The handoff is gated by `family-calendar`, enabled in development and staging
and disabled in production.

## What is ready

- A complete Monday-through-Friday calendar with optional Saturday expansion
- a true single-day view rather than a horizontally offset Week view
- mouse and long-hold event movement, direct time resizing, and 15-minute time
  selection
- compact phone density, keyboard controls, overlap focus, filters, undo, and
  linked recurring edits
- distinct Leave/Arrive travel segments
- a shared D1 document API with revision-safe patching
- installable PWA assets and backup/restore
- rendered interaction contracts in `tests/rendered-html.test.mjs`

## Current boundaries

| Concern | Calendar owner today | Merge decision |
| --- | --- | --- |
| UI shell | `app/page.tsx` and `app/globals.css` | Replace the duplicated header with WALL BALL navigation after the calendar is mounted. |
| Time controls | Calendar-specific clock picker | Share visual tokens and interaction rules; retain calendar start/end validation. |
| Calendar rules | Pure modules under `app/calendar-*.ts` | Keep as the domain boundary and import from the combined route. |
| Persistence | `app/api/calendar/route.ts` + D1 `DB` | Decide whether WALL BALL uses the same database before moving the API. |
| Identity | Hosting access policy / optional ChatGPT headers | Choose the combined app's family membership and write authorization policy. |
| Offline recovery | service worker + local cache | Preserve API bypasses and backup semantics when merging service workers. |

## Recommended merge sequence

1. Land this handoff with `family-calendar` disabled in production.
2. Run the standalone app from `apps/family-calendar` and verify its existing D1
   calendar before changing routes or data.
3. Extract the shared WALL BALL colors, typography, clock surface, motion, and
   focus rules into product tokens. Do not copy session-duration logic into
   calendar start/end controls.
4. Mount the calendar behind the feature flag in the combined shell while its
   API and D1 migration remain unchanged.
5. Add shared navigation and identity; verify that every write path still goes
   through the revision-safe calendar API.
6. Test Week, Day, Compact, overlap focus, drag, resize, Leave/Arrive, backup,
   and two-browser synchronization.
7. Enable the flag in production only after the shared deployment has been
   compared against the standalone reference build.

## Required infrastructure

- Node.js `>=22.13.0`
- a Cloudflare D1 binding named `DB`
- migration `apps/family-calendar/drizzle/0000_ambiguous_namora.sql`
- the existing `.openai/hosting.json` only while the standalone Sites deployment
  remains the canonical reference

No credentials or D1 data are committed in this handoff.

## Verification

From `apps/family-calendar`:

```bash
npm ci
npm run lint
npm test
```

Before enabling the combined route, perform a phone-width pass in both normal
and Compact modes and verify a second browser receives saved changes.

For a perception-first review, invoke `/vibe`. For interaction, responsive,
gesture, accessibility, or persistence coverage, invoke `/audit`. Both portable
skills are vendored under `.claude/skills/` and described in `CLAUDE.md`.
