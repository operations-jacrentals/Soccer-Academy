# Deploying the Family Calendar

Soccer-Academy is the source of truth for the calendar. Merging a change under
`apps/family-calendar/` deploys staging automatically; publishing a release
promotes the same commit to production behind the reviewer gate.

The workflow is [`.github/workflows/deploy-calendar.yml`](../.github/workflows/deploy-calendar.yml).
It runs on its own track rather than through the curriculum's MkDocs publish,
because the calendar is a Cloudflare Worker with a D1 database rather than a
static site.

## What replaced the ChatGPT Sites project

The calendar used to be deployed by a ChatGPT Sites project
(`appgprj_6a79c002d434819188901105e3b76150`) fed from a `git.chatgpt-team.site`
remote, which is why `apps/family-calendar/.openai/hosting.json` exists. That
project could not be repointed at GitHub from inside this repository — the source
a Sites project builds from is a setting in OpenAI's own console.

Deploying straight to Cloudflare removes the middleman instead. The app was
already a Cloudflare Worker: `npm run build` emits `dist/server/index.js`, the
client assets, and a ready `dist/server/wrangler.json`. The workflow fills in the
environment's real names and deploys that.

Two consequences worth knowing:

- **The Sites URL stops being the live calendar** once you point people at the
  Cloudflare one. Retire the Sites project when you are satisfied with the new
  deployment; nothing in this repository depends on it any more.
- **`.openai/hosting.json` stays**, because `vite.config.ts` reads it to decide
  which local bindings to create for `npm run dev`. It no longer affects deploys.

## One-time setup

### 1. Create the two D1 databases

Staging and production get separate databases so a staging change can never
touch the family's real schedule.

```bash
cd apps/family-calendar
npx wrangler d1 create wall-ball-calendar
npx wrangler d1 create wall-ball-calendar-staging
```

You do not need to record the ids. The workflow resolves them by name at deploy
time, so there is no id to keep in sync.

### 2. Create a Cloudflare API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token → Custom token**.
Give it these permissions, all on the account that owns the databases above:

| Scope | Permission |
| --- | --- |
| Account → Workers Scripts | Edit |
| Account → D1 | Edit |
| Account → Workers R2 Storage | Edit *(only if you later add R2)* |

Your **Account ID** is on the right-hand side of the Cloudflare dashboard
overview, or from `npx wrangler whoami`.

### 3. Add the environment secrets

**Settings → Environments** on GitHub. Add these as *environment* secrets on
**both** `staging` and `production`, not as repository secrets, so the two
environments stay separable:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account id |

The workflow checks for both before doing anything else and fails with a message
naming what is missing, rather than a wrangler authentication error.

### 4. Set the URL variables

Still under **Settings → Environments**, as environment *variables*:

| Variable | Environment | Value |
| --- | --- | --- |
| `STAGING_URL` | `staging` | `https://family-calendar-staging.<subdomain>.workers.dev` |
| `PRODUCTION_URL` | `production` | `https://family-calendar.<subdomain>.workers.dev` |

The first deploy prints the real URL, so it is fine to deploy once and then fill
these in. They drive the GitHub deployment link and the post-deploy smoke test;
without them the smoke test is skipped with a warning rather than failing.

### 5. Decide who can open the calendar

Optional, as environment *variables*. Leaving them unset means any signed-in
visitor may use the calendar, and everyone shares the existing `family`
household.

| Variable | Effect |
| --- | --- |
| `CALENDAR_ACCESS_MODE` | `public` (default) — anyone with the link, one shared household. `identified` — the host must authenticate visitors. |
| `CALENDAR_ALLOWED_EMAILS` | Comma-separated allowlist. Anyone else gets 403. Setting it implies `identified`. |
| `CALENDAR_HOUSEHOLDS` | JSON object mapping email to household id, for more than one family. |
| `CALENDAR_DEFAULT_HOUSEHOLD` | Household for anyone not named above. Defaults to `family`. |
| `CALENDAR_WORKER_NAME` | Overrides the Worker name. Defaults to `family-calendar`. |
| `CALENDAR_D1_NAME` | Overrides the database name. Defaults to `wall-ball-calendar`. |

Non-production environments get `-staging` appended to the Worker and database
names automatically, so you only set the base name.

## What a deploy does

1. Fails early if the Cloudflare secrets are absent.
2. Runs lint and the full test suite — a failing test does not deploy.
3. Resolves the Worker and database names for the environment.
4. Resolves the real D1 id by name, failing with the `wrangler d1 create`
   command if the database does not exist.
5. Builds, then rewrites `dist/server/wrangler.json` via
   [`scripts/prepare-deploy-config.mjs`](../apps/family-calendar/scripts/prepare-deploy-config.mjs).
6. Validates the packaged artifact and dry-runs the deploy.
7. Applies any pending D1 migrations with `--remote`.
8. Deploys.
9. Fetches the URL and checks the response actually contains the calendar, so a
   green job means a working page rather than a successful upload.

## Promoting to production

Publish a GitHub release. The `production` environment has required reviewers, so
the job pauses for approval before it deploys — the gate described in
[`environments.md`](environments.md).

To redeploy or roll back without a release, use **Actions → Deploy Family
Calendar → Run workflow** and choose `production`.

## Running the config step locally

The config rewrite is a committed script rather than an inline expression, so you
can check what CI will produce:

```bash
cd apps/family-calendar
npm run build
CALENDAR_WORKER=family-calendar-staging \
CALENDAR_D1_NAME=wall-ball-calendar-staging \
CALENDAR_D1_ID=00000000-0000-4000-8000-000000000000 \
ALLOW_PLACEHOLDER_D1=1 \
  npm run deploy:config
npx wrangler deploy -c dist/server/wrangler.json --dry-run
```

## Known limits

- **Local D1 does not run on every machine.** On Windows, workerd fails to open
  its sqlite store, so `npm run db:migrate` and two-device sync cannot be
  verified locally. The deployed environments are the first place shared
  persistence is genuinely exercised.
- **The calendar is still mounted nowhere in WALL BALL.** This workflow deploys
  the standalone app. The `family-calendar` flag in `flags/flags.json` gates the
  eventual combined route and is read by no code yet, as
  [`family-calendar-handoff.md`](family-calendar-handoff.md) records.
