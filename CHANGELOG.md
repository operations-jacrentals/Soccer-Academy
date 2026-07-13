# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims
to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Add entries under **Unreleased** as you merge to trunk; move them under a version
heading when you cut a release for production.

## [Unreleased]

### Added
- Trunk-based development workflow: feature branches, feature flags, staging, and
  production promotion pipeline.
- CI (`build-test`, `validate-flags`) and staging/production deploy workflows.
- In-repo, environment-scoped feature flag registry (`flags/`).
