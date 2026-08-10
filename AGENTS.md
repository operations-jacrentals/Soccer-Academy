# AGENTS.md

Operating manual for AI coding agents (OpenAI Codex, Claude Code, etc.) and new
human contributors working in this repository. Read this before making changes.

For *what is currently in flight and what to do next*, read
[`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## 1. What this repository is

**Soccer-Academy** is the curriculum and delivery pipeline for a homeschool
"Soccer + Smarts" micro-academy: one child, ages **8 → 13**, five years, aiming at
mastery of both academics and soccer.

**There is no application code yet.** As of this writing the repo contains:

- a **curriculum** written in Markdown (`curriculum/`) — this is the product;
- a **publishing pipeline** that turns that Markdown into a MkDocs site on
  GitHub Pages;
- a **trunk-based development workflow** (branch protection, CI, staging →
  production promotion) and a **feature-flag registry**, scaffolded ahead of the
  app that will eventually exist.

Do not go looking for a web app, a backend, or a test suite — they have not been
built. If a task implies application code, you are creating it from scratch, and
that is a design decision worth raising before you start.

The only executable code in the tree is `scripts/validate-flags.py` and the two
reference flag resolvers in `flags/examples/`.

---

## 2. The one rule that matters most: zero invention

The curriculum is governed by [`curriculum/DOC_STANDARD.md`](curriculum/DOC_STANDARD.md).
It is not a style guide — it is a correctness contract, and it is the single
easiest thing for a language model to violate. Restated here so it cannot be
missed:

### Rule 1 — Zero invention

- **Every number, benchmark, standard, threshold, dimension, age, count, or
  ratio must come from a real, verifiable source**, cited at the point of use.
- **Every formula must be a real, published formula**, cited by name and origin.
  Never invent a metric definition, a formula, or a study.
- **No fabricated citations, quotes, statistics, or results.** A link must
  actually support the claim attached to it. Do not cite a URL you have not
  confirmed says what you claim it says.
- If there is no source, **do not state it as fact**. Label it (below) as a
  coaching judgment, a placeholder, or a question.

### Rule 2 — Pick the higher standard

When credible sources disagree: for **development/performance** targets adopt the
*more demanding* figure; for **safety/health** limits adopt the *more protective*
figure. Name the source, and note the range when sources differ.

### Confidence labels — every factual claim carries one, inline

| Label | Meaning |
|---|---|
| ✅ **Sourced** | cited to a real primary/reputable source |
| ⚠️ **Unverified** | secondary source, or not yet confirmed against a primary |
| ✏️ **Coaching judgment** | a reasoned default with no authoritative source — never presented as a standard |
| ❓ **Needs source** | placeholder, must be resolved before it is treated as fact |

Citations go in [`curriculum/references/sources.md`](curriculum/references/sources.md),
and every number used elsewhere should trace back to an entry there.

**If you cannot reach a primary source, say so.** Existing docs disclose that a
network egress policy blocked direct fetches of some primary PDFs; those claims
are marked ⚠️ rather than dressed up as verified. Keep that honesty — an
unverifiable claim gets a label, not a confident sentence.

---

## 3. Repository map

```
curriculum/              ← the product. This directory IS the published site.
  DOC_STANDARD.md          integrity rules (read first)
  references/sources.md    the cited source backbone
  index/                   13-domain knowledge index — the building blocks ("what")
  research/                Benfica / La Masia / Ajax models + merged model ("how")
  age-08/                  the age-8 unit — first of the 8→13 build
docs/                    ← workflow docs. NOT published to the site.
  WORKFLOW.md              trunk-based development, the five pillars
  environments.md          GitHub settings: branch protection, environments, gate
  HANDOFF.md               current state of play + next steps
flags/                   feature-flag registry, JSON schema, reference resolvers
scripts/                 validate-flags.py (runs in CI), setup-repo.sh (one-time gh setup)
config/environments/     *.env.example templates only — never commit real env files
.github/workflows/       ci.yml, deploy-staging.yml, deploy-production.yml
mkdocs.yml               site config; docs_dir is `curriculum`
```

### How the curriculum fits together

1. The **index** (`curriculum/index/`) catalogs every building block — skills,
   moves, drills, attributes, tactics, metrics, laws, teaching cues.
2. The **merged academy model** (`curriculum/research/merged-model.md`) says how
   to teach them.
3. Each **age unit** (8 → 13) sequences the age-appropriate blocks, taught the
   merged-model way, with every benchmark grounded per the Documentation
   Standard.

Only **age 8** exists so far. Ages 9–13 are unwritten.

---

## 4. Commands that actually run

```bash
# Validate the feature-flag registry (this is a real CI gate)
python scripts/validate-flags.py
python scripts/validate-flags.py --strict     # treat warnings as failures

# Build the curriculum site locally (same as the deploy workflows do)
pip install mkdocs mkdocs-material
mkdocs build --site-dir site                  # output is gitignored
mkdocs serve                                  # live preview at 127.0.0.1:8000

# Inspect flag state for an environment
APP_ENV=staging python flags/examples/read_flags.py
APP_ENV=staging node flags/examples/readFlags.mjs
```

There is **no lint, test, or build command for the project itself** — the CI
`build-test` job is a placeholder that echoes a TODO. Do not claim tests pass;
there are none. If you add application code, add the real steps to
`.github/workflows/ci.yml` and to `CONTRIBUTING.md` in the same change.

---

## 5. Working in this repo

### Branches and commits

Cut short-lived branches from the latest `main`:

| Prefix | Use for |
|---|---|
| `feat/` | new functionality |
| `fix/` | bug fixes |
| `chore/` | tooling, deps, config |
| `docs/` | documentation only |

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): summary` — e.g. `docs(curriculum): age-9 technical unit`. Types:
`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`. Release notes are
generated from these (see `.github/release.yml`).

### Pull requests

- Fill in [`.github/pull_request_template.md`](.github/pull_request_template.md)
  — it includes a feature-flag checklist.
- CI must be green: `Build & test` and `Validate feature flags`.
- **Squash merge** only; the branch is deleted automatically.
- Keep PRs small. A merged PR should be releasable on its own.

### The pipeline

`feature/*` → PR + CI → `main` (trunk) → **staging on every merge** → **production
on a published release, behind a manual approval gate**.

Full detail in [`docs/WORKFLOW.md`](docs/WORKFLOW.md). Note what deploy actually
means here today: staging *validates that the MkDocs site builds*; production
*publishes it* to the `gh-pages` branch via `mkdocs gh-deploy`.

### Feature flags

Anything not ready for users goes behind a flag rather than onto a long-lived
branch. Register it in [`flags/flags.json`](flags/flags.json) with
`production: false`, guard the code path, and give it a `cleanupBy` date. Flags
are temporary; delete the flag *and* the dead path once rollout is complete. Full
lifecycle: [`flags/README.md`](flags/README.md).

Values resolve from the **deployed build**, so flipping a production flag takes
effect on the next release/redeploy — not on merge.

---

## 6. Gotchas specific to this repo

- **`docs_dir` is `curriculum/`, not `docs/`.** Anything you add under
  `curriculum/` is published publicly. The top-level `docs/` directory holds
  internal workflow docs and is *intentionally not published*.
- **The site nav is implicit** — `mkdocs.yml` has no `nav:` block, so pages are
  ordered by path. A new curriculum page that no index links to is reachable but
  effectively orphaned; link it from the relevant `README.md`.
- **MkDocs is installed unpinned in both deploy workflows.** Material for MkDocs
  warns that MkDocs 2.0 is backward-incompatible with no migration path, so an
  upstream release can break the production deploy without any change on our
  side. Pinning is on the backlog in `docs/HANDOFF.md`.
- **`mkdocs build` is not run with `--strict`,** so broken in-page anchors are
  logged at INFO and do not fail CI. Read the build output anyway.
- **Never commit real env files.** Only `*.env.example` is tracked; `.gitignore`
  enforces the rest. Deploy credentials belong in GitHub *Environment secrets*.
- **`CODEOWNERS` is entirely commented out**, so "require review from code
  owners" currently enforces nothing.
- **The repo uses birth-year age groups (US Soccer).** A chronological
  8-year-old spans U8→U9. Don't silently equate "age 8" with a single age group.

---

## 7. What not to do

- Do not invent a statistic, benchmark, formula, study, or citation. Ever. See §2.
- Do not upgrade a ⚠️ claim to ✅ without actually opening a primary source.
- Do not push directly to `main` — every change lands through a reviewed PR.
- Do not add unpinned build dependencies to the deploy workflows.
- Do not create a parallel, differently-named copy of an existing curriculum
  doc. If two versions of the same unit exist, reconcile them (this has already
  happened once — see `docs/HANDOFF.md`).
- Do not present a coaching opinion as a federation standard. Label it ✏️.
