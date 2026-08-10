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

- [`AGENTS.md`](AGENTS.md) — **new contributor or AI agent? read this first**:
  what the repo is, the zero-invention documentation rule, commands, gotchas.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — current state of play, in-flight pull
  requests, backlog, and what to build next.
- [`curriculum/README.md`](curriculum/README.md) — the curriculum itself (the
  product): knowledge index, academy-model research, age units.
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — the full workflow and pipeline diagram.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — day-to-day: branches, commits, PRs.
- [`flags/README.md`](flags/README.md) — feature flag lifecycle & conventions.
- [`docs/environments.md`](docs/environments.md) — GitHub setup (branch
  protection, environments, approval gate).
