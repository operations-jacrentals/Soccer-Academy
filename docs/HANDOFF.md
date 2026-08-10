# Handoff — state of play

Onboarding brief for whoever picks this repo up next (human or agent). For the
rules of the road — conventions, commands, the zero-invention documentation
standard — read [`../AGENTS.md`](../AGENTS.md) first. This file covers *where
things stand and what to do next*.

**Snapshot taken:** 2026-08-10 · **Trunk:** `main` at `46fe248` · **Released:**
`v0.1.0` (2026-07-15)

---

## 1. Where things stand

The repo is a **curriculum in Markdown plus the pipeline that publishes it**.
There is no application code yet (see `AGENTS.md` §1).

### Landed on trunk

| Area | State |
|---|---|
| **Trunk-based workflow** | Complete. Branch protection, CI, staging/production workflows, `scripts/setup-repo.sh` for the one-time GitHub setup. |
| **Feature flags** | Complete. Registry (`flags/flags.json`), JSON Schema, CI validator, Python + Node reference resolvers. Two flags registered; neither guards anything yet. |
| **Documentation Standard** | Complete and enforced by convention (`curriculum/DOC_STANDARD.md`), with a compliance backlog tracked inside it. |
| **Knowledge index** | Drafted across all 13 domains (`curriculum/index/`). Breadth-first; entries are deliberately concise. |
| **Academy-model research** | Complete for Benfica, La Masia, Ajax, plus the merged model and the 8→13 blueprint. |
| **Reference backbone** | `curriculum/references/sources.md` — ~30 cited frameworks/standards with per-item ✅/⚠️ labels. |
| **Age 8** | Table of contents only (`curriculum/age-08/README.md`): entry → exit expectations per corner. **No term plan, session plans, or assessment sheet on trunk.** |
| **Publishing** | MkDocs Material. Staging validates the build on every merge; production publishes to `gh-pages` on a released tag, behind the approval gate. |
| **Ages 9–13** | Not started. |

### Verified locally at snapshot time

```
python scripts/validate-flags.py     → OK: flag registry valid (0 warnings)
mkdocs build                         → builds clean in ~0.6s
```

---

## 2. In-flight work — read this before starting anything

Three pull requests are **open**. There are no open issues.

### ⚠️ PR #5 and PR #10 are two competing versions of the same work

Both build out the age-8 unit past the table of contents, and both add
overlapping files. They cannot both be merged as-is.

| | [**#5**](https://github.com/operations-jacrentals/Soccer-Academy/pull/5) | [**#10**](https://github.com/operations-jacrentals/Soccer-Academy/pull/10) |
|---|---|---|
| Title | age-8 unit — trimester plan, Rondo→Individual→Group sessions, 18 day-plans | Soccer + Smarts interactive tracker — spec, evidence base, 3-week cycle & Heraldic Scoreboard |
| Branch | `claude/workflow-setup-48j05i` | `claude/soccer-academy-redesign-spec-59m143` |
| Opened | 2026-07-14 | 2026-07-15 (newer) |
| Cycle model | **trimester** (`01-trimester-plan.md`) | **3-week cycle** (`01-cycle-plan.md`) |
| Interactive piece | `animations.html` + `tracker-core.js` + `metrics.json` + its own `HANDOFF.md` | single `tracker.html` (~1,700 lines) + `DESIGN-SPEC.md` |
| Session docs | 3 × trimester session files | 3 × week-A/B/C session files |
| Also adds | `curriculum/mastery-model.md`, `research/training-regimen.md`, `research/youth-method-foundations.md` | — |

**Direct collisions** — both modify or add: `curriculum/age-08/README.md`,
`curriculum/references/sources.md`, `curriculum/age-08/02-session-template.md`,
`03-assessment.md`, `04-reports-and-player-profile.md`, and
`curriculum/age-08/interactive/`.

**The first decision the next owner has to make** is which cycle model the
program uses — trimester or rolling 3-week — because everything downstream
(session templates, assessment cadence, the tracker, and ages 9–13) inherits it.
Pick one, close or rewrite the other, and salvage the genuinely additive parts
(#5's `mastery-model.md` and the two extra research docs have no equivalent
in #10).

Note also that #5's branch, `claude/workflow-setup-48j05i`, is the same
long-lived branch that produced merged PRs #1–#4. It has drifted a long way from
the short-lived-branch convention in `CONTRIBUTING.md`; rebasing on current
`main` is likely to be non-trivial.

### PR #6 — brainstorming skill

[**#6**](https://github.com/operations-jacrentals/Soccer-Academy/pull/6) adds a
single file, `.claude/skills/brainstorming/SKILL.md` — a design-gate skill
vendored from the community `obra/superpowers` repo, with the auto-trigger
softened to opt-in. Self-contained, no conflicts, tooling-only. Merge or close it
on its own merits; it does not block the curriculum work.

---

## 3. Backlog

Concrete, checkable items found while surveying the repo. None are blocking, all
are real.

### Correctness / content

1. **Cyrillic character in two docs.** `curriculum/references/sources.md:25` and
   `:36`, and `curriculum/index/12-laws-and-formats.md:23`, contain `yд` — a
   Cyrillic *д* instead of a Latin *d* in "10 yd" / "yd". Cosmetic but it lands
   on the published site.
2. **Four broken in-page anchors** in `curriculum/age-08/README.md` — the
   contents line links to `#2-physical-p`, `#4-social--character-s`,
   `#5-game-understanding`, `#6-smarts-soccer--smarts`, none of which match the
   generated heading slugs. MkDocs reports these at INFO and does not fail,
   because the build is not run with `--strict`.
3. **Primary-source verification backlog** — the ⚠️ items in
   `curriculum/DOC_STANDARD.md`: CIES academy-production counts, Benfica/Ajax
   facility statistics, the Ajax stage-age split, and the US Soccer field/goal
   dimension ranges. These were blocked by network egress at the time of
   writing; if an environment can reach the primaries, upgrading them is
   high-value, low-risk work.

### Pipeline / tooling

4. **`build-test` CI job is a placeholder** (`.github/workflows/ci.yml`) — it
   echoes "No build/test steps defined yet." Branch protection requires the
   check, so it currently gates on nothing. Fill it in when application code
   arrives; consider running `mkdocs build --strict` there in the meantime, which
   would give the job real teeth and catch items 1–2 above.
5. **MkDocs is unpinned** in both deploy workflows (`pip install mkdocs
   mkdocs-material`). Material for MkDocs warns that MkDocs 2.0 is
   backward-incompatible with no migration path. Pin the versions, ideally via a
   `requirements-docs.txt` shared by both workflows and local development.
6. **`CODEOWNERS` is entirely commented out**, so "require review from code
   owners" enforces nothing. Set a real owner or drop the rule.
7. **Stale deploy instructions.** `docs/environments.md` §3 and the closing note
   in `scripts/setup-repo.sh` both tell you to "fill in the TODO deploy steps in
   `.github/workflows/deploy-*.yml`". That TODO no longer exists — the workflows
   build and publish the MkDocs site. The surrounding advice about environment
   secrets still applies; the TODO reference should go.
8. **Environment configuration is placeholder-only.** `STAGING_URL` /
   `PRODUCTION_URL` and the `*.env.example` base URLs still point at
   `*.example` hosts. Confirm whether GitHub Pages is actually enabled
   (Settings → Pages → deploy from the `gh-pages` branch) — the production
   workflow assumes it.
9. **Two flags guard nothing.** `parent-dashboard` and `video-drill-library` are
   registered against an app that does not exist, with `cleanupBy: 2026-10-13`.
   After that date the validator starts warning on every run. Either build behind
   them or retire them.

---

## 4. What to build next

The roadmap is already written down — `curriculum/research/synthesis-and-blueprint.md`
sets the age-by-age emphasis for 8 through 13, and
`curriculum/age-08/README.md` ends with the intended next step:

> Term plan → weekly session template (PPP) → assessment sheet — each built on
> sourced standards, then repeat for age 9.

That is precisely what PRs #5 and #10 both attempt, which is why resolving them
is step one. Suggested order:

1. **Decide the cycle model** (trimester vs. rolling 3-week) and land one
   coherent age-8 unit: cycle plan, session template, session plans, assessment.
2. **Decide whether the interactive tracker is in scope at all.** Both PRs ship
   large hand-written HTML/JS into a docs repo with no build, no tests, and no
   flag guarding it. If it stays, it is the first real application code and
   should get a `build-test` job and a feature flag; if it goes, the curriculum
   stays pure Markdown and the pipeline stays trivial.
3. **Clear the backlog items above** — they are small and make CI meaningful.
4. **Repeat the age-8 template for age 9**, then 10 → 13.

---

## 5. Open questions for the new owner

- **Cycle model:** trimester or rolling 3-week? (Blocks everything downstream.)
- **Is this a docs site or an app?** The workflow scaffolding, feature flags, and
  env config all anticipate an application. If the answer is "a docs site with a
  tracker page," a lot of the scaffolding can be simplified rather than carried.
- **Who reviews?** The workflow requires one approving review and code-owner
  review, but `CODEOWNERS` is empty and every PR so far has come from an agent.
  Decide who the human gate is.
- **Verification budget:** how much effort goes into converting ⚠️ claims to ✅?
  The Documentation Standard is the project's main quality differentiator, and it
  degrades quietly if nobody re-opens the primaries.
