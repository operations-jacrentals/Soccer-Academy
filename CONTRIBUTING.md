# Contributing

Day-to-day guide for working in this repo. For the big picture, read
[`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## The short version

```bash
git switch main && git pull                 # start from fresh trunk
git switch -c feat/parent-dashboard         # short-lived branch
# ...make changes, hide unfinished work behind a flag...
git commit -m "feat: parent progress dashboard"
git push -u origin feat/parent-dashboard    # open a PR
# CI green + review → squash merge → auto-deploys to staging
```

## Branch naming

Cut every branch from the latest `main` and keep it short-lived:

| Prefix   | Use for                          |
| -------- | -------------------------------- |
| `feat/`  | new functionality                |
| `fix/`   | bug fixes                        |
| `chore/` | tooling, deps, config            |
| `docs/`  | documentation only               |

Example: `feat/video-drill-library`.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): summary`, e.g. `feat(flags): add parent-dashboard flag`. Types:
`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`. This keeps release
notes readable (see `.github/release.yml`).

## Feature flags

If a change isn't ready to be visible to users, put it behind a flag instead of
sitting on a long branch.

1. Add an entry to [`flags/flags.json`](flags/flags.json) (default
   `production: false`).
2. Guard the new code path with it. Reference resolvers:
   [`flags/examples/`](flags/examples/).
3. CI validates the registry on every PR.

Full lifecycle and conventions: [`flags/README.md`](flags/README.md).

## Pull requests

- Fill in the PR template (it includes a feature-flag checklist).
- CI must be green: `build-test` and `validate-flags`.
- Get a review, then **squash merge**. Your branch is deleted automatically.
- After merge, your change deploys to **staging** — validate it there.

## Local checks before pushing

```bash
python scripts/validate-flags.py     # validate the flag registry
cd apps/family-calendar
npm ci
npm run lint
npm test
```

## Releasing

Production is a deliberate promotion, not an auto-deploy. See
[Releasing & promoting to production](docs/WORKFLOW.md#releasing--promoting-to-production).
