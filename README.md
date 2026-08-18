# Soccer-Academy

Soccer + Smarts Homeschooling. Ensure a mastery of all areas of education AND soccer, within 5 years.

[![CI](https://github.com/operations-jacrentals/Soccer-Academy/actions/workflows/ci.yml/badge.svg)](https://github.com/operations-jacrentals/Soccer-Academy/actions/workflows/ci.yml)
[![Deploy to Staging](https://github.com/operations-jacrentals/Soccer-Academy/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/operations-jacrentals/Soccer-Academy/actions/workflows/deploy-staging.yml)

## Development workflow

Trunk-based development with feature flags and a staging → production promotion
pipeline:

**`feature/*` → PR + CI → `main` (trunk) → Staging → Production**

- Cut short-lived `feature/*` branches from `main`.
- Hide unfinished work behind a **feature flag** so trunk stays releasable.
- Merges to `main` **auto-deploy to staging**.
- **Production** deploys on a tagged release, behind a manual approval gate.

Start here:

- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — the full workflow and pipeline diagram.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — day-to-day: branches, commits, PRs.
- [`flags/README.md`](flags/README.md) — feature flag lifecycle & conventions.
- [`docs/environments.md`](docs/environments.md) — GitHub setup (branch
  protection, environments, approval gate).
- [`docs/calendar-deploy.md`](docs/calendar-deploy.md) — how the calendar is
  released, and what must never change in a release.

## Applications

- [`apps/family-calendar`](apps/family-calendar) — the editable family schedule
  being prepared for integration with WALL BALL. See the
  [handoff and merge guide](docs/family-calendar-handoff.md).
