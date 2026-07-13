# Feature flags

Flags decouple **deploy** (code is on the server) from **release** (users can see
it). That's what makes trunk-based development safe: you merge small increments
to `main` continuously, and anything unfinished stays dark behind a flag instead
of living on a long branch.

## Where flags live

- [`flags.json`](flags.json) — the registry (source of truth).
- [`schema.json`](schema.json) — JSON Schema for editor autocompletion/validation.
- [`examples/`](examples/) — reference resolvers you copy into your app.
- Validated in CI by [`../scripts/validate-flags.py`](../scripts/validate-flags.py).

## Anatomy of a flag

```json
"parent-dashboard": {
  "description": "Parent-facing progress dashboard.",
  "owner": "operations@jacrentals.com",
  "created": "2026-07-13",
  "cleanupBy": "2026-10-13",
  "environments": {
    "development": true,
    "staging": true,
    "production": false
  }
}
```

| Field          | Rule                                                            |
| -------------- | -------------------------------------------------------------- |
| key            | kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`)                         |
| `description`  | required, non-empty — what the flag guards                     |
| `owner`        | required — who is responsible for retiring it                  |
| `created`      | required — `YYYY-MM-DD`                                         |
| `cleanupBy`    | required — `YYYY-MM-DD`, when the flag should be gone          |
| `environments` | required — must include `staging` and `production` (bools); `development` optional |

## Values per environment

Each environment resolves the flag to its own boolean. The running app picks the
environment via the `APP_ENV` variable (`development` | `staging` | `production`).

| Environment   | `APP_ENV`     | Typical default |
| ------------- | ------------- | --------------- |
| Local dev     | `development` | `true`          |
| Staging       | `staging`     | `true`          |
| Production    | `production`  | `false` at first |

## Lifecycle

1. **Add** the flag with `production: false` when you start the work.
2. **Guard** the new code path with it and merge small increments to trunk.
3. **Validate** on staging (where it's on).
4. **Roll out**: flip `production: true` in a one-line PR when ready.
5. **Retire**: once fully rolled out and stable, delete the flag *and* the old
   code path, and remove the entry here. Don't let flags accumulate — the
   `cleanupBy` date and CI warnings are there to nag you.

## Using a flag in code

Copy a resolver from [`examples/`](examples/) into your app:

```python
from flags import is_enabled          # examples/read_flags.py
if is_enabled("parent-dashboard"):
    render_parent_dashboard()
```

```js
import { isEnabled } from './flags/readFlags.mjs';
if (isEnabled('video-drill-library')) renderDrillLibrary();
```

Both read `APP_ENV` from the environment and fall back to `false` for unknown
flags.

## Validation rules (enforced in CI)

`scripts/validate-flags.py` fails the build on:
- non-kebab-case keys, or missing required fields;
- missing `staging` / `production`, non-boolean values, or unknown environments;
- `cleanupBy` before `created`, or unparseable dates.

It **warns** (non-fatal, `--strict` to fail) on:
- a flag enabled in `production` but not `staging` (promote through staging first);
- a `cleanupBy` date that has already passed (stale flag).
