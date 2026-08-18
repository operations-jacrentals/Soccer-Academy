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
npm run db:migrate
npm run dev
```

`db:migrate` creates the `calendar_state` table in the local D1 store. Without
it the calendar still opens, but it runs on this device only and shows a
"Not syncing" warning in the header.

Quality gates:

```bash
npm run lint
npm test
```

`npm test` builds the deployable Vinext artifact and then runs the rendered
source contracts.

## Access and storage

Every call to `app/api/calendar/route.ts` is identified before it touches
storage. The hosting platform authenticates the visitor and forwards the
signed-in identity as headers; `app/calendar-access.ts` turns that identity into
an authorization decision and a storage key. Unidentified requests get 401 and
requests outside the allowlist get 403.

**Access mode.** The calendar defaults to `public`: anyone with the link can
open and edit it, and everyone shares one household. That is deliberate, because
it is how this calendar has always been deployed and because its host injects no
identity headers — defaulting to `identified` there would return 401 to every
visitor rather than protecting anything.

The cost is real and worth stating plainly: anyone who has the URL can read the
family's week, including which child is where and when. Treat the link as the
secret. Set `CALENDAR_ACCESS_MODE=identified` (or set an allowlist, which implies
it) on any host that authenticates visitors, and the allowlist and per-household
routing start working.

In development there are no platform identity headers, so the route falls back
to a local development identity. That branch sits behind `import.meta.env.DEV`,
which Vite replaces at build time, so it does not exist in a production bundle.

| Variable | Effect |
| --- | --- |
| `CALENDAR_ACCESS_MODE` | `public` (default) or `identified`. See below. |
| `CALENDAR_ALLOWED_EMAILS` | Comma-separated allowlist. Setting it implies `identified`. |
| `CALENDAR_HOUSEHOLDS` | JSON object mapping email to household id, for more than one family. |
| `CALENDAR_DEFAULT_HOUSEHOLD` | Household for anyone not named above. Defaults to `family`, the existing row. |
| `CALENDAR_DEV_EMAIL` | Development identity only. Ignored in production builds. |

The API stores one document per household in the `calendar_state` D1 table,
keyed by household id. Writes use revision-checked compare-and-swap, and a change
to an existing event is sent as only the fields that changed, so two people
editing different fields of one event merge instead of overwriting each other.
The UI keeps local storage as a cache and recovery source.

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
