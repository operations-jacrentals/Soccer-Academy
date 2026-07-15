# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims
to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Add entries under **Unreleased** as you merge to trunk; move them under a version
heading when you cut a release for production.

## [Unreleased]

## [0.1.0] - 2026-07-15

### Added
- Curriculum **knowledge index** (`curriculum/index/`) build-out with researched,
  source-cited additions across metrics & statistics (09), tactics & systems (07),
  training methodology (03), player development (11), psychology (05), coaching
  pedagogy (10), laws & youth formats (12), and the teaching-cues vocabulary
  library (13).
- Reference backbone (`curriculum/references/sources.md`) expanded with
  **Metrics & analytics**, **Tactics/methodology/development**, **Psychology &
  coaching**, and **US Soccer heading-safety** blocks, each with per-item
  confidence labels (✅ / ⚠️) per the Documentation Standard.
- Curriculum foundation: academy-model research (Benfica, La Masia, Ajax) and the
  merged model, the comprehensive knowledge index, the Documentation Standard, and
  the age-8 starting unit.
- Trunk-based development workflow: feature branches, feature flags, staging, and
  production promotion pipeline.
- CI (`build-test`, `validate-flags`) and staging/production deploy workflows.
- In-repo, environment-scoped feature flag registry (`flags/`).

[Unreleased]: https://github.com/operations-jacrentals/Soccer-Academy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/operations-jacrentals/Soccer-Academy/releases/tag/v0.1.0
