# Releasing the Family Weekly Calendar

The calendar has a split ownership model, and it is deliberate.

| | Owns |
| --- | --- |
| **GitHub** (`main`) | the source of truth for `apps/family-calendar/` |
| **ChatGPT / Codex** | publishing to the Sites project |

Sites cannot auto-deploy from an external GitHub repository, and publishing needs
a Sites connector that mints short-lived, project-scoped credentials. So code
lands here through ordinary branches and pull requests, and a release is a
separate, deliberate step performed by the agent that holds that connector.

## Releasing

Merge to `main` as usual, then send this:

> Publish the latest Family Weekly Calendar from
> `operations-jacrentals/Soccer-Academy` main, using `apps/family-calendar/`.
> Pull GitHub first, preserve D1/public access/`.openai/hosting.json`, sync the
> Sites source, deploy, and verify live.

## Confirming a release actually rolled forward

A publish can report success while the old build is still being served — this has
happened. Check the deployed site, not the deploy log:

```bash
SITE=https://family-weekly-calendar.operations644647.chatgpt.site
curl -s "$SITE/" | grep -o planner-app                 # page renders
curl -s "$SITE/api/calendar" | head -c 120             # events still present
CSS=$(curl -s "$SITE/" | grep -o '/assets/[^"]*\.css' | head -1)
curl -s "$SITE$CSS" | grep -c -- --fc-ink              # 0 means the old build
```

`--fc-ink` and `@container eventcard` exist only in the post-audit build, so they
are how you tell a real rollout from a stale one. `/api/calendar` should return
the family's real events — a fresh seed would mean the document was reinitialised
and something has gone badly wrong.

## What must never change in a release

- **D1.** The live `calendar_state` table holds the family's only real schedule.
  Never reset, reseed, migrate or otherwise alter it. The application reads and
  writes the same table with the same shape, so no migration is needed.
- **Public access.** The site is open to anyone with the link and must stay that
  way — two people use it from different devices with no sign-in. Do not set
  `CALENDAR_ACCESS_MODE=identified` or `CALENDAR_ALLOWED_EMAILS`; either would
  require identity headers the host does not send, and would lock both of them
  out. See the access-mode section of the app README.
- **`.openai/hosting.json`.** The `DB` binding name and the Sites project id must
  stay exactly as they are.

## Two routes that were deliberately closed

Both create a **divergent deployment** — a second Worker and a second database,
with the family's edits splitting between two calendars that never reconcile.

- **Deploying to Cloudflare directly.** A workflow and a self-hosting script for
  this existed briefly and were removed. If you find yourself recreating them,
  stop.
- **Handing a Sites credential to another agent.** The connector's temporary
  credential is not a general handoff mechanism, and a live token should never be
  pasted into a chat transcript in any case.

## If a publish fails

A publish once failed twice with
`400 Bad Request … /service/siwc/sites/clients/<id>/callbacks`, *after* the
artifact had built and been saved as version 44.

That is a platform failure, not an artifact problem. An audit compared the build
against the archived source of the running release and found `.openai/hosting.json`,
all three `drizzle/` files, and every build script byte-identical; the artifact
passed `validate-artifact.sh`; the worker's default export exposed `fetch`; and
the asset graph and route set matched the live release.

So if this recurs, do not re-audit the application. Ask instead for:

1. the underlying error behind the `400` — request or correlation id, not the
   bare status;
2. whether the stored artifact can be released without a rebuild;
3. whether the project's client registration is in a bad state — stale or
   duplicate callback registrations are the usual cause of a `/callbacks` 400.

## Local development

`npm run dev` serves the app. Local D1 does not start on every machine — on
Windows, workerd fails to open its sqlite store — so the calendar falls back to
device-local storage and says so in the header. Shared persistence is only
genuinely exercised on the deployed site.
