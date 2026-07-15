# Age-8 interactive — HANDOFF (for a fresh UI attempt)

This folder preserves the **substance** of the age-8 interactive doc — the backend
logic, the drills↔metrics mapping, and the drill animations — **without any of the
old UI/skin**. A new session can build a completely new look on top of these, or
redesign from scratch. The previous UI (an "EA Sports FC 26"-style dark skin) was
**deliberately not saved** — only the reusable substance below.

---

## What's in this folder (reuse these)

| File | What it is | How to reuse |
|---|---|---|
| **`tracker-core.js`** | The whole self-referential card engine, **UI-free** (no DOM). Config (spokes, metrics, day→metric map), single-PR recording, the monotone mastery math, `profile()`, and roster CRUD (add/rename/remove with data re-keying). | `import` it; feed it a `mem` object; render `profile(mem, player)` however you like. |
| **`metrics.json`** | Machine-readable index: every metric → spoke/unit/direction/step, the **3-week cycle** structure, per-day metric mapping (D1–D15), intensity by day, and the **family-lock** rule. | Drive the day list / tracker inputs / metric labels from this. |
| **`animations.html`** | Standalone gallery of all **47 drill animations** (SVG + CSS keyframes), self-contained and **skin-agnostic** (colours are `:root` CSS vars — swap for any theme). Shared `#ball`/`#foot` symbols defined once. | Lift the `<style>` anim block + the `<defs>` svg + the sketches you need. Framework: **animate the jargon, not the plain English.** |

Also already in the repo (the "docs"):
- `../README.md`, `../01-trimester-plan.md`, `../02-session-template.md`, `../03-assessment.md` — the unit.
- `../04-reports-and-player-profile.md` — the full **MY CARD / reports** spec (the source of `tracker-core.js`).
- `../sessions/*.md` — the authoritative **drill text** for all 15 day-plans.
- `../../references/sources.md`, `../../DOC_STANDARD.md` — citations + the ✅sourced / ✏️judgment / ⚠️unverified discipline.

## What was NOT saved (rebuild fresh)
The **pure UI**: the FC26 dark/electric-green skin, condensed-uppercase type, angular
tiles, the metallic FC card *visual*, and all layout/section CSS. None of it is here on
purpose. (The hexagon-card *math* survives in `tracker-core.js`; only its styling is gone.)

---

## The model in one screen (so the new UI honors it)

**Curriculum — a repeating 3-week cycle** (this replaced the old "3 trimesters"):
- **Week A** = Me & the Ball (Ball Mastery), **Week B** = Me, the Ball & a Friend
  (Passing + 1v1), **Week C** = Playing the Game (Group Play).
- The cycle **loops ~13 times across ~40 training weeks** — literally the 3 weeks on
  repeat. Each loop the **drills level up**, and the **emphasis shifts A→C** across the year.
- Each week is **Mon–Fri = D1…D5 / D6…D10 / D11…D15**. Every day is one **60-min plan**
  (Warm-up 15 → Individual 20 → Group 20 → Huddle 5) run in **all 3 of that day's sessions**.
- Intensity **builds then recovers** across the week (Tactical Periodization): Mon ease-in,
  Tue build, Wed peak, Thu recover, Fri light.

**Reports — a single PR per player per day:** run the test **every session**, log the
best; the number **only ever climbs**. No AM/PM. Attendance = 3 tick-boxes per day
(**1 tick = 1 attended session = 1 hour**).

**MY CARD — self-referential, never a rank:** a hexagon **PAC·SHO·PAS·DRI·DEF·PHY** with
a **HEART in place of the overall rating** (it only *brightens* with brave tries — never a
number). Every spoke grows **only from the child's own past marks**. Superpower = highest
within-child z-score; Next Quest = lowest technical spoke (Pace/Physical guarded out —
they grow on biology's clock). Bronze/Silver/Gold are **self-referential journey frames,
not ranks.**

**Customising drills — family-locked:** coaches may rewrite/replace any drill **on the
fly**, with **one rule**: keep it in the day's **metric family** (a Dribbling day stays
Dribbling). The metric is locked to the family, so a swap never breaks tracking. (This
replaced an earlier "route every change through Claude to re-map metrics" idea — the
family-lock is simpler and needs no round-trip.)

**Ethos:** development over winning, no standings, **effort & bravery are the headline
metrics**. The no-overall-number / no-cross-child rule is enforced in the data model itself.

---

## Backend (persistence)
Live Google Drive backend: one Sheet **"Soccer Academy — Age 8 Tracker"** (folder
`Soccer Academy — Backend`) with tabs: **Start Here · Roster · Attendance Log ·
Reports Log · Metrics Reference · Height Log**. The `Reports Log` is an **append-only**
source of truth (a correction is a new row); the card is a derived rollup. The
`tracker-core.js` `mem` shape mirrors these tabs and can round-trip to them. (Sheet id
is in the session history; the Drive `create_file` MCP tool has no delete/update, so
edits are new files or manual.)

---

## Open decisions / pending (carry these forward)
1. **Card-vs-card vs the ethos.** The last UI request put **every player's card in a row**
   (with bronze/silver/gold visible side-by-side). That contradicts the documented
   `04-…§5.4` rule ("tier frames NEVER co-displayed across children — a gold beside a
   bronze reads as a standing"). **Decide:** keep the row but neutralize the ranking cue
   (one neutral frame for all / hide tier word), or go back to one-card-at-a-time.
2. **Docs still say "trimester."** `README.md`, `01-trimester-plan.md`, and
   `sessions/trimester-*.md` still use the old 3-trimester framing. The **3-week cycle**
   is captured here in `metrics.json` and was reflected in the (now-dropped) UI, but the
   prose docs and file names were **not yet converted**. Convert them when ready
   (rename files, rewrite framing; D1–D15 metrics are unchanged).
3. **Not built yet:** live sync of the tracker ↔ Drive (Apps Script / Sheets API);
   ages 9–13; per-spoke sparklines / a parent one-pager.

## Provenance reminder
Follow `../../DOC_STANDARD.md`: label ✅ sourced / ✏️ coaching-judgment / ⚠️ unverified,
and invent nothing. Methods, standards, drill *forms*, and rubric frameworks are sourced;
the sequencing, minute splits, metric thresholds, and the day map are labelled coaching
judgment.
