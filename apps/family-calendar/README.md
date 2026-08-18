# Family Calendar

The editable family schedule that is being prepared for integration with WALL
BALL. This directory is a complete, independently runnable application so its
calendar behavior and shared data can be reviewed without changing the academy
runtime.

## Current product surface

- Week and true single-day planning views
- direct event movement and 15-minute resizing
- click-to-select clock controls inspired by the WALL BALL builder
- Leave/Arrive travel bands
- compact phone layout and overlap focus
- shared calendar persistence through Cloudflare D1
- installable PWA and JSON backup/restore

The currently deployed reference build is
[family-weekly-calendar.operations644647.chatgpt.site](https://family-weekly-calendar.operations644647.chatgpt.site/).
This handoff was copied from calendar source commit
`9d4b29556ec1533b1f8efe2069107beda0189fc3`.

## Run locally

Prerequisites: Node.js `>=22.13.0` and a Unix-compatible shell (Linux, macOS,
or WSL) for the bounded build scripts.

```bash
npm ci
npm run dev
```

Quality gates:

```bash
npm run lint
npm test
```

`npm test` builds the deployable Vinext artifact and then runs the rendered
source contracts.

## Storage contract

The API at `app/api/calendar/route.ts` persists one canonical family calendar
document in the `calendar_state` D1 table. Writes use revision-checked patches,
and the UI keeps local storage only as a cache and recovery source.

The binding name is `DB`; the schema and first migration live in `db/` and
`drizzle/`. The existing Sites project identity remains in
`.openai/hosting.json` so the standalone deployment can continue during the
merge.

## Integration boundary

Keep the calendar standalone until WALL BALL and this app agree on identity,
navigation, and storage ownership. The pure calendar domain modules are:

- `app/calendar-events.ts`
- `app/calendar-time.ts`
- `app/calendar-display.ts`
- `app/calendar-filters.ts`

The detailed merge sequence and validation checklist are in
[`../../docs/family-calendar-handoff.md`](../../docs/family-calendar-handoff.md).
