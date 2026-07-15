# Age 8 — Reports & Player Profile ("MY CARD")

How we **measure and celebrate** the [15 day-plans](sessions/) (D1–D15 of the
[repeating 3-week cycle](01-cycle-plan.md)): a self-referential, EA SPORTS FC /
Football-Manager-style **player card** whose spokes visibly *upgrade* off each
child's **own** past marks. This supersedes the V1 binary milestone system — a
checkbox says only "yet / not yet"; a **report** captures the child's own rising
curve, which is what a parent and an 8-year-old actually want to see.

Written to the [Documentation Standard](../DOC_STANDARD.md): every number is **✅ sourced**,
**✏️ coaching judgment**, or **⚠️ unverified** — nothing invented. Complements, never
replaces, the [Emerging/Developing/Secure assessment & IDP](03-assessment.md).
The interactive build of this model is specced in the
[tracker DESIGN-SPEC](interactive/DESIGN-SPEC.md).

> **The decisive constraint (why everything is self-referential).** No authoritative age-8
> numeric norm exists in any federation or peer-reviewed source (the negative finding from
> the milestone research holds). Per DOC_STANDARD Rule 1 we adopt **zero external "an
> 8-year-old should…" benchmarks**. Every metric compares a child **only to their own last
> mark** — which the KNVB no-standings ethos ✅ requires anyway.

---

## 1 · The profile framework — one card, justified

**Presentation & axes = the EA SPORTS FC card** — six spokes **`PAC · SHO · PAS · DRI ·
DEF · PHY`** around a central **LION** that replaces OVR. That is the *skin*.
**Underneath, every spoke is scored against the ✅ FA Four-Corner Model**
([index/04](../index/04-attributes-and-physical.md)), cross-walked to **✅ Ajax TIPS**. The
FC shape is recognisable joy; the sourced Four-Corner / TIPS model is the engine. Nothing
normative rides on a FIFA label.

**Three pieces of ethos surgery turn a ranking device into a mirror:**
1. **Delete OVR → replace with the LION.** Effort + bravery + character — the **HEART
   track** — collapse into one central, **growing lion** where OVR normally prints: the
   biggest, most focal thing on the card. The lion is **never a number and never
   ranked**; it **only ever grows** (§1.1). This is the age-8 headline ✅
   ([03-assessment.md](03-assessment.md): "effort, bravery, and joy are the
   headline metrics") and matches the ✅ guidance to *"not over-index on the physical
   because it's easiest to measure"* ([index/09](../index/09-metrics-and-statistics.md)).
2. **Delete chemistry / Team-of-the-Week / bands / leaderboards.**
3. **Delete card-vs-card comparison** — enforced in the *schema* (§5) and the *display
   rules* (§5.4), not merely by policy.

### 1.1 · The LION — cub → Great Armored Fire-Lion ✏️

The bravery meter is a **single-year growth story** the kids can watch happen
(next-year reset is explicitly out of scope). Mechanics (✏️ product design →
[DESIGN-SPEC §5–6](interactive/DESIGN-SPEC.md)):

- **Roars on every "session done"** — animation + audible roar on all three of a
  day's session ticks (the dopamine hit)…
- **…but grows only on the *completed day*** — the 3rd session tick — **plus
  brave-try bonuses** at any time. Gating growth on the complete day is what
  motivates *making up* a skipped session.
- **Continuous growth + tier unlocks:** body size, mane and muscle scale up
  *continuously* with roar-points (a visible micro-change every completed day),
  while **~24 accessory/power tiers** — boots → armor → crown → fire breath →
  flaming mane → the mature **Great Armored Fire-Lion** — unlock at thresholds
  (a transformation every ~1.5 weeks on a full-attendance pace).
- **Per-player randomized accessory order.** The middle tiers unlock in a
  **different, per-child randomized order**, with two fixed anchors: the **cub
  arc always comes first** and the **final Great Armored Fire-Lion always comes
  last**. Two lions are never on the same ladder, so "he got the helmet before
  me" is meaningless by construction — the same anti-comparison logic as the
  no-card-vs-card rule (§5.4).
- Calibrated so *strong-but-not-perfect* attendance plus normal bravery reaches
  the top near year-end (~13 cycle loops ≈ ~195 completed days ✏️).

### The card

| Spoke | Self-referential meaning | 4-Corner / TIPS home | Feeder metrics (§2) |
|---|---|---|---|
| **PAC** — Pace | own **playful speed** PB. **Maturation-guarded.** | `[P]` / Speed | Dash PB (20-yd flagship); Dribble-Dash 20yd |
| **SHO** — Shooting | own finishing **placement** (never power/goals) | `[T]` / Technique | Finish Ten /10 (+ weak-foot, first-time); Keeper's Ten |
| **PAS** — Passing **& Vision** | own passing accuracy + game-reading | `[T]` Technique + Insight | Pass/One-Two Count 60s, Scan /10, Rondo & Keep-ball Streaks |
| **DRI** — Dribbling *(biggest by design — FUNdamentals = touches)* | own ball-mastery progress | `[T]` / Technique | Touch Count 30s, Toe-Taps 30s, Gate Runs 60s, Cushion Count 60s, Trick Menu |
| **DEF** — Defending | own **patience** (longer jockey = better) | `[T]` tactical / Insight | Patient win-backs; Jockey Clock (own PB, capped); Poke-steal /10 |
| **PHY** — Physical | own **coordination / balance**. **Maturation-guarded, bodyweight-only.** | `[P]` / Speed-of-action | Single-leg Balance PB (L&R), SAQ-ladder clean reps |
| **🦁 LION** *(center — replaces OVR — HEADLINE — the HEART track)* | **effort + bravery + character**, drawn as a growing lion. Only grows; never a number; never ranked. | `[Ps]` Personality + `[S]` Social | +1 roar-point per **completed day**; bonuses for Brave Tries, take-ons, My-Move shows, brave saves, patient win-backs, next-play resets, encouragement / fair-play |

**Two context rails — never spokes, never scored, never a rating on the card:**
- **Bio-band chip — serial height-velocity.** Record standing height on a term cadence;
  track **height velocity (cm between terms)**. ✅ the *method* is real (PHV is the peak of
  the height-velocity curve); the interpretive bands are ✏️. **We do NOT compute the
  Mirwald maturity-offset equation** — it requires age + standing + sitting height + leg
  length + body mass, which we don't collect; attributing a height-only estimate to
  Mirwald would misuse the formula. Its only job: contextualise PAC & PHY so a late
  developer's slower dash reads as *biology's clock* ✅, never a weakness.
- **Load gauge — coach-side injury-risk guard.** Load = **child-reported** exertion on a
  pictorial RPE faces scale **× session-minutes = sRPE** (Foster's session-RPE uses the
  *athlete's* RPE), feeding **ACWR** ✅ (real formulas). **Coach-side only, never printed on
  the card.** The coach Effort /10 rubric is decoupled and never feeds sRPE.

**Structural rule:** PAC and PHY — the two most "FIFA-physical" spokes — are the
**least day-emphasised**, fed only from playful, low-volume, full-rest PBs on a **monthly
Fun-PB cadence** (D12 is their only home in the cycle), because LTAD FUNdamentals forbids
formal/maximal fitness testing at 8. The daily load lives on DRI/PAS/SHO/DEF/LION, where
the curriculum actually is.

---

## 2 · The report metrics — curated set

All metrics are self-referential, age-8 legal, one-coach with cones/balls/stopwatch.
Each day carries **three measures of that day's focus** (the full 15×3 battery:
[DESIGN-SPEC §3](interactive/DESIGN-SPEC.md) and the [week libraries](sessions/)),
recorded at the **day** level as a **single PR (personal record) per measure**: the
coach runs them **every session** and keeps the day's best — the stored number
**only ever climbs** (a weaker session never lowers it). Metric *forms* are ✅ sourced
([sources.md](../references/sources.md) §Drills); **every window length, set size, rep
target and cap is ✏️ coaching judgment.**

- **DRI:** Touch Count 30s (both feet); Toe-Taps 30s; Figure-8 weave /45s; Gate Run 60s
  (+ weak-foot round); Slalom time (fastest **clean** run — see the exclusions note);
  Cushion Count 60s; Wall-touch 60s; Trap-and-go time; Trick Menu /5 (variety);
  Juggling PB.
- **PAS:** Pass Count 60s *(pair — cooperative)*; Target Hits /10; weak-foot Pass Count
  60s; One-Two Count 60s *(pair)*; Wall-pass streak; Through-gate 1‑2 /10; Half-turn
  Count 60s; Receive-turn-pass time; **Scan Score /10** (Vision → Smarts); Rondo Streak ·
  Passes-before-loss · Split passes · Team Keep-ball Streak · Support-angle receives ·
  Switch-of-play count *(group vs its own record)*.
- **SHO:** Finish Ten /10 (**placement not power**); Weak-foot Finish /10; First-time
  Finish /10; Keeper's Ten /10 (everyone rotates through GK); Scoop-and-roll /10;
  Reaction saves.
- **DEF:** Patient win-backs *(primary — process)*; Jockey Clock *(seconds, best of 3,
  **cap 10s**, longer = better)*; Poke-steal /10 (no foul).
- **PAC / PHY (monthly Fun-PB, maturation-guarded, bodyweight, low-volume — D12 only):**
  Dash PB (20-yd flagship); Dribble-Dash 20yd (with ball); SAQ-ladder clean reps;
  Balance PB single-leg L & R.
- **🦁 LION (headline, rides every 1v1/SSG + huddle):** **Brave Tries** — 1v1 moves
  *attempted* (a failed move still counts; **never a success rate**); My-Move attempts &
  shows; brave saves; patient win-backs; next-play resets; plus Effort /10 rubric (coach
  steer/context only — **not** fed into sRPE, **never shrinks the lion**) and Fun /5
  smiley (**private wellbeing flag, never averaged into any displayed value**).

**Derived (computed, never separately captured):** Positions-played breadth (only grows,
cannot rank — anti-specialisation ✅); Both-feet balance index (weak ÷ strong from every
side-logging metric).

**Deliberately excluded from a scored spoke (LTAD / ethos):** 5-10-5 / pro-agility & any
change-of-direction shuttle; standing broad jump / vertical; plank / isometric holds;
xG / xT / PPDA / ACWR as card ratings; and any **elimination outcome** (King-of-the-Ring
survival, 1v1 win/loss) — never scored, because they rank kids. *(✏️ Note: the earlier
blanket exclusion of the **timed slalom** is superseded — it returns as D2's "fastest
**clean** run": only clean runs count, so the clock cannot pressure speed over touch.)*

**Coach-load truth:** the mandatory live write is **PR Time at the session's close — a
single PR per measure per day**, entered only when beaten (not once per session). Some
measures are legitimately 2 numbers (Gate Run free + weak-foot; Finish Ten L+R; Balance
L+R). All in-game decision tallies (win-backs, brave saves, lion micros) are **optional
end-of-huddle recalls**, never live per-child judgments made while refereeing.

**Customising a day (family-locked).** Coaches refine drills on the fly as they learn their
own best practice. The rule: **change the drill, keep the family.** Each day's metric is
locked to its **spoke family** (a Dribbling day measures dribbling), so any swap is fine as
long as it still trains that family — don't drop a passing drill onto a dribbling day. This
keeps every logged PR comparable over time without re-mapping the metric. The interactive
tracker enforces this with a per-day inline editor that names the day's family in the header.

---

## 3 · Infusion into the day-plans — the cycle's D1→D15

Each day's **primary card-metric + asides** ride drills **already in that day's plan**
(the day's full three-measure battery lives in the [week libraries](sessions/)). **The
1v1 PEAK days (D3, D13) deliberately carry a LION/process metric** — the hardest
days are judged on courage, not outcome — and the third peak (**D8, rondo**) is
**cooperative**, the group vs its own record. Day order per the ✏️ re-sequenced
[cycle plan](01-cycle-plan.md).

| Day (theme) | Drill it rides | Primary → spoke | Unit | Aside (optional recall) |
|---|---|---|---|---|
| **D1** Ball-mastery basics | Individual "count your touches" | **Touch Count 30s** (both feet) → DRI | count/30s | Toe-Taps 30s; Figure-8 /45s. *King-of-the-Ring is elimination → not scored.* |
| **D2** Dribbling & turns | "gates, most in 60s, weak-foot round" | **Gate Run 60s** (+ weak-foot) → DRI | gates/60s (2 nums) | Slalom fastest-clean; take-on attempts (🦁) |
| **D3** 1v1 & feint · **PEAK** | Group "1v1 — try a move (no penalty)" | **Brave Tries** → 🦁 **LION** | count (attempts) | Beat-the-defender /10; move-gauntlet time → DRI |
| **D4** First touch into dribble | "cushion, touch into space, go" | **Cushion Count 60s** → DRI | count/60s | Wall-touch 60s; trap-and-go time |
| **D5** Creativity & showcase · *checkpoint* | "invent-a-move"; showcase | **My-Move shows** → 🦁 LION | count | Trick Menu /5; Juggling PB → DRI |
| **D6** Inside-foot passing | "count completions" | **Pass Count 60s** (pair) → PAS | count/60s (pair) | Target Hits /10; weak-foot round |
| **D7** Give-and-go | "wall pass / give-and-go" | **One-Two Count 60s** (pair) → PAS | count/60s (pair) | Wall-pass streak; 1‑2s tried (🦁) |
| **D8** Rondo · **PEAK** | "3v1 rondo, rotate the middle" | **Rondo Streak** (group vs own record) → PAS | streak (group) | Passes-before-loss; split passes; one-touch tried (🦁) |
| **D9** Half-turn & scanning | "scan before receiving — flash a number" | **Scan Score /10** → PAS (Vision) | /10 | Half-turn Count 60s; receive-turn-pass time; scan → Smarts |
| **D10** Keep-ball / find space · *checkpoint* | "find the free player — 3v1/4v2" | **Team Keep-ball Streak** (cooperative) → PAS | streak (group) | Support-angle receives; switch-of-play count |
| **D11** Finishing | "side-foot → laces, both feet" | **Finish Ten /10** (placement, both feet) → SHO | /10 (L/R split) | Weak-foot Finish /10; First-time Finish /10; 1‑2-before-shot tries (🦁) |
| **D12** Speed & agility w/ ball · *monthly-guarded* | SAQ / relays, off the day-anchor | **Dribble-Dash 20yd · Dash PB · ladder clean reps** → PAC/PHY | sec; count | logged only as a **light monthly PB**, off the daily flow (LTAD ✅) |
| **D13** Defending · **PEAK** | "jockey — don't dive in → poke" | **Patient win-backs** → 🦁 **LION** | count | **Jockey Clock** (longer=better, cap 10s) → DEF; Poke-steal /10 |
| **D14** GK taster | "Circle-Catch — W-hands, scoop"; rotate GK | **Keeper's Ten /10** → SHO/GK | /10 | Scoop-and-roll /10; reaction saves; brave saves (🦁); +positions breadth |
| **D15** Festival, compete & rules · *checkpoint* | refereed festival "restarts" | **Rules Five /5** → "Game Ready" (not a spoke) | /5 | fair-play acts; festival involvement (uncounted vs opp.); +positions breadth; **year-end IDP on the final loop** |
| **Every day** | huddle & session close | **Brave Tries · Effort /10 · Fun /5** → 🦁 LION | count; /10; /5 | next-play resets · encouragement · fair-play |

Ethos guards baked in: elimination games never scored; peak days carry a *process* or
*cooperative* metric; all streak/point metrics are group-vs-own-record; PAC/PHY have an
explicit low-frequency cadence (D12, monthly) so a grey spoke is a normal "still
gathering," not a broken card.

---

## 4 · Strengths & weaknesses — the math (100% intra-player)

The card does two jobs FIFA blurs into one number: **(A) how "levelled-up" each spoke is**
(the visible spoke *length* that upgrades) and **(B) which spokes are this child's
strengths vs growth-edges** (the hexagon *shape*). Both are computed **only from the child's
own history**. **There is no population term anywhere in the math, and no cross-child field
in the schema (§5), so a leaderboard is structurally impossible.**

**Layer 0 — orient:** `v = d · x`, `d = −1` for time metrics (Dash) where lower is better,
`+1` for counts/streaks/scores (Jockey Clock is `+1` — longer is better). Bigger `v` is
always better.

**Layer 1 — Spoke LEVEL `L_s` (monotone-up; internal, never printed):**
1. Baseline `b` = child's first-week median.
2. Personal record `PR(t) = max(v)` over `t' ≤ t` — **monotone; never decreases.**
3. Own step-scale `scale = max(σ, ε·|b|, σ_min)`, `σ` = SD over last `W=6` marks, floored.
4. Metric mastery (saturating 0→100): `mastery = 100·(1 − exp(−g/G))`, `g = (PR − b)/scale`,
   `G = 4` ✏️.
5. `L_s = mean(mastery)` over that spoke's metrics with **≥ K=3 reports**; below `K` the
   spoke renders **grey / "not yet lit"** and is excluded from any weakness label.

> **`L_s` is a rendering input, never a printed score.** A printed "58" is indistinguishable
> from a FIFA rating and invites "my DRI vs your DRI," so it is never shown — only the
> self-referential spoke *length* + glow/▲ that "upgrades." A report beating own PR raises
> the level (🏅 PR, spoke glows and grows); a mark **below** own history does **not**
> shrink the level (monotone — the PR only climbs) — a dip is data, never a penalty.

**Layer 1b — Form flame / momentum / LION monotonicity:** form flame `F = mean(z)` over
last `W` (🔥 up / ❄️ resting); momentum ▲▬▼ from an OLS slope. **The visible LION is
driven only by monotone cumulative counts** (completed days + career Brave Tries,
take-ons, resets, fair-play) — **Effort /10 and Fun /5 never shrink it.** "The lion
only ever grows" is literally true.

**Layer 2 — reading the SHAPE (within-child):** among **lit** spokes, `Z_s = (L_s −
mean(L)) / SD(L)`.
- **Signature strength** = highest `Z_s` → IDP Strengths (2–3).
- **Growth edge / Next quest** = lowest `Z_s`, **drawn only from the technical spokes
  DRI/PAS/SHO/DEF** → IDP Next steps (1–2), phrased as the smallest useful target.

**Guardrails:** (1) **Maturation guard ✅** — if the lowest `Z_s` is PAC or PHY it is
**never** called a weakness (a slower dash at 8 is biology, not effort); the Next Quest is
drawn from the lowest *technical* spoke. (2) The LION is never in the ranking. (3)
Cooperative metrics contribute via the pair/group record only. (4) `< K` reports →
"collecting," no strength/weakness asserted; 🌱🌿🌳 only ratchet up, at the checkpoints.

**Layer 3 — both-feet symmetry:** `A = (Strong − Weak)/(Strong + Weak) ∈ [0,1]`. The
strength being built is a **shrinking A** (weak foot catching the strong foot). Rendered as
a small balance meter — *your weaker foot vs your stronger foot*, never vs another kid.

**Anti-double-count ✏️:** touch counts feed **only DRI**; PHY draws coordination solely
from SAQ-ladder/balance — one drill never inflates two spokes.

### The self-referential TIER (bronze → silver → gold) — a journey frame, never a rank

| Frame | Earned by (own progress only) | Rubric tie |
|---|---|---|
| **🥉 Bronze** | card created + any baseline recorded — everyone who shows up | 🌱 Emerging |
| **🥈 Silver** | PRs in ≥3 different weeks across ≥3 **technical/LION** tracks + the lion past its cub arc | 🌿 Developing |
| **🥇 Gold** | skills show up **in games** (game/attempt asides non-zero week over week) | 🌳 Secure |
| **🌈 Master flair** | all three academy weeks (A/B/C) at 🌳 Secure by year-end → age-9 handoff | year-end |

> **Tier display rule.** Bronze<Silver<Gold *is* an ordering, so the frame is a
> **self-referential milestone of the child's own journey**: it may render on the child's
> own (solo) card and the parent/coach one-pager, but it is **never co-displayed across
> children as a rank** — in any Compare view both cards get **one neutral frame and no
> tier word** ([DESIGN-SPEC §4](interactive/DESIGN-SPEC.md)), because a gold-beside-bronze
> reads as a standing even when the numbers are self-referential. FIFA "card rarity" is
> re-meant as *how far this child has travelled from their own start* — never a badge worn
> against others. Tiers are never revoked.

---

## 5 · Sync / data model

**Principle:** an **append-only Reports log is the immutable source of truth**; the
**Profile card is a derived rollup**, always regenerable. This makes "a dip is data"
structurally true (history is never overwritten) and makes **ranking unrepresentable** —
the ethos is enforced *in the schema*, not just by policy.

> **Where it runs today:** the [interactive tracker](interactive/DESIGN-SPEC.md)
> implements this shape **in-browser (localStorage)** — per-player card state (spokes,
> PRs, roar-points) + per-grid attendance (3 ticks/day), with the **Duplicate-grid**
> action as the cycle loop. The Google-Drive workbook below is the **deferred sync
> backend**; same append-only principle, nothing to migrate.

The backend is **one Google Sheet, one tab per data set** (`Soccer Academy — Age 8
Tracker`, in the `/Soccer Academy — Backend/` Drive folder) — more organised than
scattered files, and the tabs share a `player_id` join key:

```
Soccer Academy — Age 8 Tracker   (one Sheet, tabs below)
├── Start Here          ← how the workbook fits together (this section, in-sheet)
├── Roster              ← player_id ↔ name (join key)
├── Attendance Log      ← 1 row = 1 attended session = 1 hour (3/day; orthogonal)
├── Reports Log         ← APPEND-ONLY source of truth
├── Metrics Reference   ← metric_id → spoke · unit · direction · day
└── Height Log          ← serial standing height → height-velocity context
                          (per-child derived Profile card stays PRIVATE, off-workbook)
```

**`Reports Log` — one row per measurement:** `report_id · ts · day_date ·
day_type · session · player_id · metric_id · spoke · value · unit · direction · foot ·
is_attempt · cooperative · coach_id · notes`. **Append-only** (a correction is a new row;
the stored day-PR only climbs); idempotent on client `report_id`; **there is no `OVR`
field, no `rank`, no opponent column, no cross-child sheet** — a leaderboard cannot be
built from this schema.

**`Height Log`:** `player_id · term_date · standing_height_cm · coach_id` → rollup computes
**height velocity = Δheight/Δtime** as context only; **no Mirwald equation** (not enough
anthropometry collected).

**Rollup** (bound Apps Script on submit + nightly, or a Drive-MCP client) materialises per
day-type `PR · Prev PR · Gain · New PR?`, then per spoke `L_s
(internal), form, arrow, Z_s, lit?`, and the card object. `shape.signature` auto-drafts the
[IDP](03-assessment.md) Strengths; `shape.next_quest` + `foot_A` draft Next steps; the
Profile is derived, so changing the math re-runs over the same immutable log — nothing to
migrate.

**§5.4 Shared surfaces — never a leaderboard, never card-vs-card.** On any shared/co-visible
surface show **only**: (a) the cooperative Team-Streak panel (group vs its own record), and
(b) each child's **own-history rows** (Morning→Evening, loop over loop across the year's
cycles). **Full hexagon cards and lion size/tier are NEVER co-displayed across children**
as a standing (a big armored lion beside a small cub reads as a rank even when the growth
is self-referential) — Compare exists only as a deliberate, neutral-framed head-to-head
moment ([DESIGN-SPEC §4](interactive/DESIGN-SPEC.md)), and the **per-child randomized
accessory order (§1.1)** makes tier-vs-tier reading meaningless anyway. The Milestones
sheet is **superseded** (stop writing; keep historical data).

---

## 6 · Honest ledger — ✅ sourced · ✏️ judgment · ⚠️ unverified

| Element | Status | Basis |
|---|---|---|
| FC 6-hexagon aesthetic + bronze/silver/gold frames | ✅ real (EA FC / FM) · ✏️ adaptation | adopting them **self-referential, OVR-free, non-ranking, never co-displayed** is our design |
| FA Four-Corner scoring substrate · Ajax TIPS cross-walk | ✅ sourced | [index/04](../index/04-attributes-and-physical.md); [03-assessment.md](03-assessment.md). TIPS Insight = game-reading (Technical/Tactical); TIPS S = Speed |
| LION replaces OVR; effort/bravery headline; "don't over-index on the physical" | ✅ ethos-sourced · ✏️ the lion construct | [03-assessment.md](03-assessment.md); [index/09](../index/09-metrics-and-statistics.md) (verbatim); Visek FUN MAPS "Trying Hard" #1 |
| Lion cadence — roar per session-done; growth per completed day + brave bonuses; ~24 tiers; **per-child randomized accessory order (anchors fixed: cub first, final form last)** | ✏️ product design | [DESIGN-SPEC §5–6](interactive/DESIGN-SPEC.md); randomization exists to defeat cross-child tier comparison |
| The A/B/C academy weeks & D1–D15 day order (re-sequencing) | ✏️ coaching judgment | re-sequenced from the same ✅ Coerver/RFEF/KNVB material → [cycle plan](01-cycle-plan.md) |
| No card-vs-card display; neutralized Compare; delete OVR/chemistry/bands | ✅ ethos-sourced · ✏️ the deletions | KNVB no-standings ([sources.md](../references/sources.md)) |
| Position-rotation / anti-specialisation | ✅ sourced | [index/06](../index/06-positions-and-roles.md), [index/12](../index/12-laws-and-formats.md), [index/08](../index/08-strategy-and-game-management.md). US Soccer PDI **not** cited for philosophy (regulatory numbers only) |
| Metric **forms** (30s touch, 60s gate/pass, attempts, streaks, jockey time, W-catch, scan flash, IFAB rules) | ✅ sourced | [sources.md](../references/sources.md) §Drills |
| Every window / rep-target / /10 / /5 / streak / 10s cap / tier gate | ✏️ judgment | no age-8 norm exists — all self-referential |
| Timed slalom as D2's "fastest **clean**" measure | ✏️ re-admitted with a clean-run guard | supersedes the earlier blanket exclusion; touch quality gates the clock |
| Serial height-velocity as the bio-band rail | ✅ real method · ✏️ bands | PHV = peak of the velocity curve; **Mirwald label dropped** (needs sitting height + mass + age, not collected) |
| sRPE / ACWR load gauge from **child pictorial RPE × minutes** | ✅ real formulas, used correctly · ✏️ scale choice | Foster session-RPE uses the *athlete's* RPE; coach Effort /10 decoupled; coach-side only |
| S&W math — saturating mastery, self-z, OLS slope, within-child Z_s, both-feet A | ✅ atoms are standard statistics · ✏️ composite, weights, G/W/K/ε/caps | descriptive statistics applied self-referentially; **not** a validated instrument; `L_s` kept internal |
| Excluding 5-10-5, broad-jump, plank, xG/xT/PPDA/ACWR as spokes | ✅ LTAD-grounded | FUNdamentals forbids maximal fitness testing at 8 ([index/04](../index/04-attributes-and-physical.md), [index/09](../index/09-metrics-and-statistics.md)) |
| Coerver "5 S's" **as the card framework** | ✅ exists · ✏️ declined as axes | [sources.md](../references/sources.md); Strength/Speed axes push toward maximal testing |
| "60–75 touches/30s", U8 "4+ juggles" | ⚠️ **not adopted** | commercial/single-club; existence-proof only |
| 🌱🌿🌳 bands, IDP one-pager, DFB inclusive floor | ✅ frameworks · ✏️ labels/thresholds | [03-assessment.md](03-assessment.md); DFB Schnupperabzeichen |
| Egress limitation | disclosed | ✅ items surfaced/corroborated via search, primaries not opened (HTTP 403) |

**Bottom line.** The card keeps the *joy* of an FC hexagon that gets shinier and the
frame rarity of bronze→gold, and amputates its *comparison*: OVR becomes a **growing
lion** — cub to Great Armored Fire-Lion — that roars for every session and grows only
off the child's own completed days and brave tries; per-spoke levels are computed but
**never printed** — only the upgrading spoke *length* shows; strengths and weaknesses
are read off the child's **own** hexagon shape via real, self-referenced statistics; the
two growth-confounded spokes (PAC/PHY) are structurally barred from being called
weaknesses; each lion's accessory order is private-random so even the tiers can't be
raced; and the data schema has **no overall number and no cross-child field**, so
nothing — on the card or in the store — can rank one child against another.
