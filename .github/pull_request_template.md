<!-- Keep PRs small and short-lived. See CONTRIBUTING.md and docs/WORKFLOW.md. -->

## Summary

<!-- What does this change do, and why? -->

Closes #

## Type of change

- [ ] `feat` — new functionality
- [ ] `fix` — bug fix
- [ ] `chore` — tooling / deps / config
- [ ] `docs` — documentation
- [ ] `refactor` / `test` / `ci`

## Feature flag

- [ ] Not needed — this change is safe to release immediately.
- [ ] Behind a flag: `______________`
  - [ ] Registered in `flags/flags.json` with `production: false`.
  - [ ] Dead code path is safe while the flag is off.

## Testing

<!-- How was this verified? Include steps, and staging notes once deployed. -->

## Checklist

- [ ] CI is green (`build-test`, `validate-flags`).
- [ ] Docs / `CHANGELOG.md` updated if behavior changed.
- [ ] Rollback plan is clear (flag off, or redeploy previous tag).
