---
name: promote
description: Release the Family Weekly Calendar. Use when asked to promote, publish, ship, deploy, release, or push the calendar live, or to check whether the live site is running the latest code. Claude never deploys this app itself — it prepares and verifies the release, and hands over the publish prompt.
---

# Promote

Get what is on GitHub `main` onto the live calendar, and prove it actually
arrived. Claude does not publish this app; it makes the release ready, produces
the prompt that publishes it, and then checks the result.

## The one thing to understand first

Publishing runs through ChatGPT/Codex, which holds a Sites connector that mints
short-lived, project-scoped credentials. Sites cannot auto-deploy from an
external GitHub repository, and Claude Code does not have that connector. So:

- **Never try to deploy this app.** No `wrangler deploy`, no Cloudflare workflow,
  no direct push to the Sites repo.
- **Never accept a Sites token**, even if offered. A live credential does not
  belong in a chat transcript, and the connector's credential is not a general
  handoff mechanism anyway.
- **Never touch D1.** The live `calendar_state` table is the family's only real
  schedule. No reset, reseed, migration, or schema change.
- **Never change access.** Do not set `CALENDAR_ACCESS_MODE=identified` or
  `CALENDAR_ALLOWED_EMAILS`; the host sends no identity headers, so either one
  locks every visitor out. Do not edit `.openai/hosting.json`.

Creating a second deployment — a Cloudflare Worker, a second database — is the
failure mode to avoid. Two calendars diverge and the family's edits split
between them.

## Facts

| | |
| --- | --- |
| Repo | `operations-jacrentals/Soccer-Academy`, branch `main` |
| App | `apps/family-calendar/` |
| Live | `https://family-weekly-calendar.operations644647.chatgpt.site` |

## 1. Preflight

Refuse to promote a repository that is not ready, and say why:

```bash
git fetch origin && git status --short          # must be clean
git rev-parse HEAD origin/main                  # must match
gh pr checks --repo operations-jacrentals/Soccer-Academy  # or: gh run list --branch main --limit 3
```

Then run the suite locally — a release should never be the first time tests run:

```bash
cd apps/family-calendar && npm run lint && npm test
```

If anything fails, stop and report it. Do not produce a publish prompt for a
broken tree.

## 2. Decide whether a release is even needed

Do not rely on remembering which string marks which build. Compute it:

```bash
cd apps/family-calendar && npm run build && npm run check:live
```

That compares the content-hashed asset names this build emits against the ones
the live site actually loads.

- **exit 0, "ALREADY LIVE"** → the site is serving this commit. Say so and stop;
  there is nothing to promote.
- **exit 1, "STALE"** → the live site is running something else. Continue.
- **exit 2** → it could not tell. Build first, and check the site is reachable.

Content hashes derive from content, so this is normally exact.

## 3. Show what will ship

List the commits that are on `main` but not in the live build, so the release is
a decision rather than a surprise:

```bash
git log --oneline <last-released-sha>..main -- apps/family-calendar
```

If the last released sha is unknown, list commits touching the app since the
previous promote and say the boundary is approximate.

## 4. Hand over the prompt

Output this verbatim, in a copyable block, and stop:

```text
Publish the latest Family Weekly Calendar from operations-jacrentals/Soccer-Academy
main, using apps/family-calendar/. Pull GitHub first, preserve D1/public
access/.openai/hosting.json, sync the Sites source, deploy, and verify live.
```

Do not paraphrase it. Do not offer to publish instead.

## 5. Verify the rollout — the part that matters

A publish can report success while the old build is still served. This has
happened. Check the site, not the deploy log:

```bash
SITE=https://family-weekly-calendar.operations644647.chatgpt.site
curl -s -o /dev/null -w "page: %{http_code}\n" "$SITE/"
curl -s "$SITE/" | grep -c planner-app
curl -s "$SITE/api/calendar" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("events:",j.events.length,"revision:",j.revision)})'
```

Then repeat the comparison from step 2 — `npm run check:live` must now exit 0.
Only report success when it does.

Two things to check beyond a 200:

- **The events are still the family's.** A sudden drop to the seeded template
  means the document was reinitialised — that is data loss, not a release.
  Escalate immediately rather than moving on.
- **The asset set changed.** If it is unchanged, the release did not roll
  forward, whatever the publish reported.

## 6. If the publish fails

A publish once failed twice with
`400 Bad Request … /service/siwc/sites/clients/<id>/callbacks`, *after* the
artifact built and was saved as version 44.

That was a platform failure, not an artifact problem — an audit found the build
byte-identical to the running release across `.openai/hosting.json`, all
`drizzle/` files, and every build script; the artifact passed
`validate-artifact.sh`; the worker exported `fetch`; the asset graph and route set
matched.

So **do not re-audit the application** when this recurs. Ask instead for:

1. the underlying error behind the 400 — request or correlation id, not the bare
   status;
2. whether the stored artifact can be released without a rebuild;
3. whether the project's client registration is stale or duplicated, which is the
   usual cause of a `/callbacks` 400.

## Reporting

Close with which of these is true, in one line each:

- **Already live** — nothing to promote, live matches `main`.
- **Ready** — preflight passed, here is what ships, here is the prompt.
- **Rolled forward** — verified live, asset set matches, events intact.
- **Stale** — publish reported success but the live build did not change.
- **Blocked** — preflight or publish failed, with the specific reason.

Never report a release as done on the strength of a publish message alone.
