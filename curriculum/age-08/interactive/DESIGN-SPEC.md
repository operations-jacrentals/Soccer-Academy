# Age-8 "Soccer + Smarts" — Interactive Tracker · DESIGN SPEC

**Status:** draft for review · **Date:** 2026-07-15 · **Players:** Jack · Blue (private 1-on-1 homeschool training)
**Deliverable:** a self-contained, single-page interactive tracker, published as a Claude Artifact, that the coach can actually use session-to-session (localStorage) and that ships with seeded demo data.

> **📏 Provenance ([DOC_STANDARD](../../DOC_STANDARD.md)):** methods, drill *forms*, and the six-attribute / four-corner frameworks are ✅ **sourced**; the day sequencing, minute splits, the growth-engine math, the lion cadence, and every threshold are ✏️ **coaching-judgment / product design**. Because the tracker is **self-referential** (a child beats their *own* past mark — there is no federation "age-8 must hit X"), the design needs *protocols*, not numeric benchmarks. Nothing here invents a benchmark a child is measured against.

---

## 1 · Ethos (enforced in the data model, not just the styling)

- **Development over winning.** No standings, no overall rating, no cross-child comparison field — a leaderboard is *unrepresentable* from this data.
- **Effort & bravery are the headline.** The bravery meter is a growing **lion**, given equal billing to skill.
- **Self-referential only.** Every spoke and the lion grow **only from the child's own past marks**. *(✅ Butler 1988; Ames 1992 — normative/ranking evaluation depresses interest, mastery/self-referenced climates sustain it.)*
- **High contrast, kid-legible, joyful.** The kids love timing, counting, and beating PRs — we lean into that at PR Time, and keep the identity **card number-free** so the *numbers live where you chase them, not where you're judged*.

**Design rules the build must honor** *(✅ cited youth-motivation research):*
1. Score against the child's own last best, never against the other child. *(Ames; Butler)*
2. Log the controllable **process** (attempts, tries), not only outcomes. *(process/performance-goal research)*
3. Praise the specific strategy/effort; keep praise honest. *(Mueller & Dweck 1998; growth-mindset effects are real but small/contested — Sisk 2018, Yeager 2019.)*
4. Embed every test inside play; keep it fun (age-8 = LTAD FUNdamentals). *(US Soccer Play-Practice-Play; Sport for Life.)*
5. Celebrate bravery and mistakes explicitly (ELM: Effort, Learning, Mistakes). *(Positive Coaching Alliance; Smith & Smoll Mastery Approach lowers anxiety/dropout.)*

---

## 2 · The curriculum spine — a repeating 3-week cycle, re-sequenced by academy

Each **week = one academy family**; the **3-week cycle** (Weeks A/B/C = **D1–D15**) is the unit that repeats through the year. Mon–Fri. Every day is **one 60-min plan run in all 3 of that day's sessions** (so 3 attendance ticks/day, 1 tick = 1 hour). Intensity builds then recovers across the week (tactical periodization): **Mon ease-in · Tue build · Wed peak · Thu recover · Fri light.**

| Week | Academy identity | Focus | Primary spokes |
|---|---|---|---|
| **A** | **AJAX** — "Me & the Ball" | Technique & creativity (ball mastery, 1v1) | DRI (+PAC, +HEART) |
| **B** | **LA MASIA** — "Me, the Ball & a Friend" | Position & passing (rondo, receiving, scanning) | PAS (+Smarts) |
| **C** | **BENFICA** — "Playing the Game" | Athlete & finish / compete (finishing, athletic, defending, GK) | SHO · PAC · PHY · DEF |

*(✅ academy models sourced in [`research/`](../../research/): Ajax de Toekomst, Barcelona La Masia, Benfica. ✏️ the A→B→C assignment and day order is coaching judgment. Coerver-style ball mastery lives mainly in Week A, always "caged" — every day ends in an opposed/game rep, never on the cone.)*

### Day-by-day (D1–D15)

| Day | Int. | Focus | Spoke |
|---|---|---|---|
| **Week A — AJAX** | | | |
| D1 Mon | ease-in | Ball-mastery basics (both feet) | DRI |
| D2 Tue | build | Dribbling & change of direction | DRI |
| D3 Wed | **peak** | 1v1 & the body feint | DRI + HEART |
| D4 Thu | recover | First touch into dribble | DRI |
| D5 Fri | light | Creativity & skill-move showcase · *checkpoint* | DRI + HEART |
| **Week B — LA MASIA** | | | |
| D6 Mon | ease-in | Inside-foot passing (weight & accuracy) | PAS |
| D7 Tue | build | Give-and-go (1-2) | PAS |
| D8 Wed | **peak** | Rondo — keep the ball | PAS |
| D9 Thu | recover | Receive on the half-turn + scanning | PAS + Smarts |
| D10 Fri | light | Positional keep-ball / find space · *checkpoint* | PAS |
| **Week C — BENFICA** | | | |
| D11 Mon | ease-in | Finishing (placement, both feet) | SHO |
| D12 Tue | build | Speed & agility with the ball (maturation-guarded) | PAC + PHY |
| D13 Wed | **peak** | Defending 1v1 (jockey & win) | DEF + HEART |
| D14 Thu | recover | Goalkeeping taster ("Safe Hands") | SHO/GK |
| D15 Fri | light | Festival, compete & rules · *checkpoint* | Game Ready |

---

## 3 · The three measures per day (Skill battery)

Every day carries **three ways to measure that day's focus**, all self-referential (beat your own mark), all feeding the day's hexagon spoke. **Bravery** (attempts) and **Smarts** (the academic bridge) are logged alongside where noted — they feed the **lion** and the **Smarts** track, not the hexagon. Protocols draw on the existing `metrics.json` and the sourced drill catalog ([`index/03`](../../index/03-training-methodology-and-drills.md)); numbers shown are the child's own, never a target.

| Day | Measure 1 | Measure 2 | Measure 3 | Aside |
|---|---|---|---|---|
| **D1** Ball mastery | Touch Count 30s (both feet) | Toe-Taps 30s | Figure-8 weave /45s | — |
| **D2** Dribble/turns | Gate Run 60s | Weak-foot Gate Run 60s | Slalom time (fastest clean) | — |
| **D3** 1v1 feint | Beat-the-defender /10 | Move-gauntlet time | — | **Brave Tries → lion** |
| **D4** First touch | Cushion Count 60s | Wall-touch 60s | Trap-and-go time | — |
| **D5** Creativity | Trick Menu /5 (variety) | Juggling PB (total) | My-Move shows in game | **My-Move attempts → lion** |
| **D6** Passing | Pass Count 60s | Target Hits /10 | Weak-foot Pass Count 60s | — |
| **D7** Give-and-go | One-Two Count 60s | Wall-pass streak | Through-gate 1-2 /10 | — |
| **D8** Rondo | Rondo Streak | Passes-before-loss | Split passes (through middle) | — |
| **D9** Half-turn + scan | Half-turn Count 60s | Receive-turn-pass time | **Scan Score /10** | **Scan → Smarts** |
| **D10** Keep-ball | Team Keep-ball Streak | Support-angle receives | Switch-of-play count | — |
| **D11** Finishing | Finish Ten /10 | Weak-foot Finish /10 | First-time Finish /10 | — |
| **D12** Speed/agility | 20-yd Dash PB (lower=better) | Dribble-Dash 20yd (with ball) | SAQ-ladder clean reps | *monthly, maturation-guarded (LTAD)* |
| **D13** Defending | Jockey Clock (patience PB, cap 10s) | Poke-steal /10 (no foul) | — | **Patient win-backs → lion** |
| **D14** Goalkeeping | Keeper's Ten /10 (W-catch) | Scoop-and-roll /10 | Reaction saves | — |
| **D15** Festival | Rules Five /5 (unprompted) | Fair-play acts | Festival involvement (uncounted vs opp.) | *celebrated, never ranked* |

**Pace (PAC) & Physical (PHY) are guarded:** trained through games; D12 is logged only as a **light monthly personal best**, off the daily flow, because LTAD forbids formal fitness testing at 8. *(✅ LTAD/Sport for Life.)*

> **Pending enrichment:** two background researchers (soccer-technical test protocols; physical/motor age-8 norms) are finalizing citations and reference *ranges*. When they land, each measure gets a "typical age-8 range (context only, not a target)" footnote where a real published norm exists, and a ✅/✏️ label. The self-referential mechanic does not depend on them.

---

## 4 · MY CARD — self-referential, number-free

One card per child. **Solo by default** (the focused, one-at-a-time view); a **Compare toggle** lines both cards up for the head-to-head moments — with the ranking cue neutralized (one neutral frame for both, no tier word co-displayed), because a gold-beside-bronze reads as a standing.

**The card contains — and shows ZERO numbers:**
- The child's **real photo** (Jack / Blue), name, and the **live academy/week badge**.
- The **hexagon** — six spokes **PAC · SHO · PAS · DRI · DEF · PHY**, drawn as spoke *lengths/fill only*. No per-spoke numbers, no overall rating.
- The **LION** (§6) in the slot where an overall rating would be — bravery made visible.
- **Superpower** = the spoke with the highest *within-child* z-score (their relative strength). **Next Quest** = the lowest *technical* spoke (PAC/PHY guarded out — they grow on biology's clock). Both are labels, self-referential, encouraging.
- A **Bronze / Silver / Gold** *journey* frame — a self-referential milestone of the child's own progress, **never** co-displayed across children as a rank.

**The numbers the kids love live at PR Time and in the PR history — not on the card.** Clean split: chase numbers where you compete against your past self; wear a number-free identity where comparison would creep in.

---

## 5 · Growth engine (how marks become the card)

State is per **player** (the card, global & cumulative) and per **grid** (attendance, per 3-week sheet). All growth is **monotone — it only ever climbs.**

- **Attendance:** per grid · per player · per day = **3 session tick-boxes** (one per session), rendered in the week row.
- **Hexagon spoke growth:**
  - **Every attended session** that logs the day's measure gives the spoke a **small nudge**.
  - **Beating a personal best** on any of the day's three measures gives a **bigger jump** (the PR).
  - So the hexagon *moves every session* but a PR is still the event. Spokes never fall.
- **PR record:** the day's **best** mark across that day's 3 sessions is kept per measure; a correction is a new entry; the stored best only climbs.
- **Lion growth (§6):** advances **on the 3rd session of a day** (a *completed* day) — **not** per session — plus **brave-try bonuses** at any time. Gating growth on the complete day is what motivates *making up* a skipped session.
- **Roar feedback:** the lion **roars — animation + audible roar — on *every* "session done" click** (all three), for the dopamine hit; only the third click actually *grows* it.

*(✏️ All nudges/jumps/curves are product design, tuned at build so a full, brave year reaches a mature lion — see §6.)*

---

## 6 · The LION — cub → Great Armored Fire-Lion (the bravery engine)

Replaces the overall rating. A **single-year growth story** the kids can watch happen. *(Next-year reset is explicitly out of scope for now.)*

**Runway:** a year ≈ **~13 grid-duplications ≈ ~195 completed-days** (see §7). Roar-points: **+1 per completed day**, **+ bonus per brave try**. Calibrated so *strong-but-not-perfect* attendance plus normal bravery reaches the top near year-end.

**Production approach — one parametric SVG, not 195 drawings.** The lion is a layered SVG whose **body size, mane fullness, and muscle scale up *continuously*** with roar-points — so **every completed day is a visible micro-change** — while **~24 accessory/power tiers unlock at roar thresholds** for the big transformations (a nudge every day, a transformation every ~1.5 weeks).

**Tier ladder (✏️ creative — order/threshold tuned at build):**
1. Newborn cub (spots, wobbly) → 2. Curious cub → 3. Playful cub → 4. Juvenile (mane tuft) → 5. Half-mane → 6. Full-maned young adult → 7. Leather **boots** → 8. **Bracers/greaves** → 9. **Chain mail** → 10. **Chest plate** → 11. **Pauldrons** → 12. **War helmet** → 13. **Crown/circlet** → 14. **Spiked mace-tail** → 15. **Saber fangs** → 16. Battle-scarred / bigger muscle → 17. Glowing eyes → 18. Ember smoke → 19. **Fire breath** → 20. Roaring flame → 21. **Flaming mane** → 22. War-banner/cape → 23. Legendary aura → 24. **The mature Great Armored Fire-Lion.**

**Audio:** an embedded/synthesized roar (Web Audio, CSP-safe, works offline in the artifact — no external files). Muted-by-default toggle for classroom sanity, with a visible speaker control.

---

## 7 · Layout & interaction

**Vertical stack, mobile-first, high-contrast.**

1. **Cards zone (top).** Solo card by default; **Compare** toggle. Photo, name, academy badge, number-free hexagon, lion (+roar/speaker), Superpower / Next Quest.
2. **Active grid (middle).** Header: the **live academy week** (Ajax/La Masia/Benfica), an **A/B/C week switcher** (opens on "this week"), the cycle label, and the **Duplicate** button.
   - **Week row:** five **day-tiles** (Mon–Fri), collapsed. Each tile: day title, intensity dot, and **attendance = 3 session ticks per player** (Jack · Blue).
   - **Expand a day:** clicking a tile **expands it below into ONE session** (no triplicate). Shows that session's **blocks in order — Warm-up 15 → Individual 20 → Group 20 → Huddle 5** — with drill text + animation. The **final block is PR Time**: the day's **three measures** (each showing the current PR to beat), the **brave-try** counter, and any **smarts** measure. A **"session done"** control ticks attendance and fires the roar.
3. **History stack (below).** On **Duplicate**, the active grid **slides down** into a frozen, collapsed stack (its attendance preserved as the season scrapbook); a **fresh grid** appears on top — **same D1–D15, attendance wiped, card/PRs/lion carried over**.

**Drill animations:** reuse the skin-agnostic SVG/CSS drill animations from the prior work (`animations.html`, 47 sketches, `:root` CSS-var theming) — "animate the jargon, not the plain English."

---

## 8 · Data model (localStorage; engine rebuilt clean)

The prior `tracker-core.js` was a rough draft; we **rebuild the engine clean**, keeping only its sound ideas (monotone self-referential math, single-PR/day, the family-lock, the spoke model, roster re-keying). Shape:

```js
{
  players: [{ id, name, photoDataUri }],            // Jack, Blue
  card: {                                            // GLOBAL per player, cumulative, only climbs
    [playerId]: {
      spokes: { PAC, SHO, PAS, DRI, DEF, PHY },      // internal values; displayed as lengths only
      prs:    { [metricId]: bestValue },             // day's-best records, monotone
      lionRoars: int, braveTotal: int, smarts: {...} // lion + bravery + academic bridge
    }
  },
  grids: [                                           // stack; each = one 3-week sheet
    { id, label, createdAt, attendance: { [playerId]: { D1:[b,b,b], ... D15:[b,b,b] } } }
  ],
  activeGridId,
  settings: { soundOn }
}
```

**Family-lock:** a day's metric is locked to its spoke family; the coach may rewrite/replace the drill on the fly but must keep it in the same family (a Dribbling day stays Dribbling), so a swap never breaks tracking. **No ranking is representable:** there is no overall-number field and no cross-child field, by construction.

---

## 9 · Visual identity (deferred — pending photos)

Direction leaned **arcade-scoreboard energy + collectible trading-card**, high-contrast, kid-first — *not* the retired EA-FC dark/green skin. **Final skin is on hold** until Jack & Blue's photos arrive, so the card is designed around a real portrait. The lion is the hero of the palette.

---

## 10 · Scope & open items

**In scope now:** the single-page interactive (living tool + seeded demo), the rebuilt engine, the re-sequenced D1–D15 with 15×3 measures, the hex+lion growth engine, the lion art, the duplicate-grid year loop. **Also:** convert the prose docs off "trimester" to the 3-week cycle.

**Deferred / out of scope:** next-year reset; ages 9–13; live Google-Drive sync; committing the rebuilt engine files back to the repo (holding per coach).

**Open for review:** (a) final visual skin (awaiting photos); (b) technical/physical reference-range footnotes (awaiting research); (c) exact lion thresholds & nudge/jump magnitudes (tuned at build); (d) whether Compare should be gated behind a coach tap to keep it rare.
