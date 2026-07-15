# 09 · Metrics & Statistics

How performance is measured — from the box score to modern analytics, plus the
physical, testing, and development metrics an academy uses to track growth. Choose
measures that fit the age: for young players, prioritize development markers over
outcomes.

---

## Traditional team stats

Goals for/against · goal difference · points · **possession %** · shots · shots on
target · shot accuracy · corners · fouls · offsides · cards · **clean sheets** ·
conversion rate · win/draw/loss record.

## Traditional player stats

Goals · assists · appearances · minutes · **pass completion %** · key passes ·
crosses · **tackles** · interceptions · clearances · blocks · **dribbles
completed** · aerial duels won · fouls won/committed · **saves / save %** (GK) ·
shots · shot conversion.

*Caveat:* raw totals mislead without context (minutes, role, team style). Prefer
**per-90** and percentile comparisons.

---

## Advanced / analytics metrics

Attacking value
- **xG (Expected Goals)** — chance quality: probability a shot scores, given its characteristics. The backbone of modern analysis.
- **npxG** — non-penalty xG (strips out penalties for fairer comparison).
- **xA (Expected Assists)** — likelihood a pass becomes an assist.
- **xGChain / xGBuildup** — credit for involvement in a scoring move (buildup excludes the shot/assist).
- **xT (Expected Threat) / EPV / possession value** — how much an action increases scoring probability by moving the ball to a more dangerous place.
- **VAEP / OBV / goals added (g+)** — valuing *every* action (pass, carry, tackle) by its effect on scoring/conceding probability.
- **xGOT (Expected Goals on Target)** — a *post-shot* model: for on-target shots, scoring probability given *where* the ball crossed the line (rewards placement — corners > down the middle). **xGOT − xG = shooting goals added (SGA)** grades a striker's finishing/execution; for a keeper, **xGOT − goals conceded** grades shot-stopping. (Opta / Stats Perform.)
- **SCA / GCA (Shot- / Goal-Creating Actions)** — the **two** offensive actions (pass, take-on, shot rebound, foul drawn, defensive recovery) directly before a shot / a goal; credits the build-up, not just the final ball. (FBref, using StatsBomb data.)
- **Big chances (created / scored)** — a clear opportunity a player is expected to score from; an Opta event tracked as created and converted.
- **Finishing vs. expectation (G − xG)** — actual goals minus expected; over/under-performance of finishing (noisy in small samples — read over a season, not a game).

Progression & territory
- **Progressive passes / carries** — actions that move the ball meaningfully toward goal.
- **Progressive distance** · **deep completions** (passes into the final zone) · **passes into the penalty area** · **touches in the box**.
- **Packing** — number of opponents taken out of the game by a pass or carry.
- **Field tilt** — share of final-third possession (territorial dominance).

Playing style & sequences (Opta sequences framework)
- **Possession / sequence** — a *possession* is one team's uninterrupted control; a *sequence* is a passage of one-or-more on-ball actions by one team, ended by a defensive action, stoppage, or shot. The unit the next metrics build on.
- **Build-up attacks** — open-play sequences of **10+ passes** ending in a shot or a box touch (patient, possession-based play).
- **Direct attacks** — open-play sequences that start in a team's own half, move **≥50%** of their length toward goal, and end in a shot or box touch (fast, vertical play).
- **Direct speed** — upfield progress per second of the sequence: how quickly a team moves the ball toward goal.
- **10+ pass sequences · passes per sequence · sequence time** — tempo/patience markers; with **PPDA** and **field tilt** they profile a team's *style*, not just its output.

Pressing & defending
- **PPDA (Passes Per Defensive Action)** — pressing intensity (lower = more aggressive press).
- **Pressures / pressure regains** · **ball recoveries** · **defensive actions** · **high turnovers** (winning it high up).
- **Possession-adjusted** tackles/interceptions (adjust for how much a team defends).
- **Duel success %** — share of **aerial** duels (both contest a loose ball) and **ground** duels (one has possession, one challenges) won; a core physical-battle marker. (Opta.)
- **Take-on / tackle success %** — dribbles that beat a man and keep possession ÷ attempts; the defensive mirror is tackle success % and challenges won. (Opta.)

Goalkeeping
- **PSxG (Post-Shot xG)** — chance quality *after* the shot is struck (keeper-facing).
- **PSxG − GA (goals prevented)** — shot-stopping over/under expectation.
- Sweeper actions, cross-claim %, launch %.

Rating & ranking systems
- **World Football Elo** — Elo adapted for football (match importance, goal margin, home advantage); strong match-prediction record. One moving number for team strength.
- **SPI (Soccer Power Index, ESPN)** — forward-looking, *predictive* team rating with separate **offensive & defensive** components, weighting how seriously each side takes a match. (Contrast the backward-looking **FIFA / UEFA coefficients**.)
- **Composite player match ratings** — a single 0–10 (WhoScored, FotMob) or ~3–10 (SofaScore) score aggregating hundreds of weighted actions; offensive actions carry the most weight. Useful shorthand but **⚠️ proprietary / black-box** — a starting point, not a verdict.

*Note:* analytics are decision *aids*, not verdicts — always paired with the eye test and context.

---

## Physical & load metrics (GPS / wearables)

**Total distance** · **high-speed running (HSR)** · **sprint distance / # of sprints** ·
**max velocity** · **accelerations & decelerations** · metabolic power ·
**PlayerLoad** (accelerometer load) · heart-rate zones / HRmax.

Load & readiness
- **RPE / session-RPE (sRPE)** — perceived effort × session duration = simple *internal* load (Foster). No kit required — practical for youth.
- **TRIMP (Training Impulse, Banister)** — heart-rate-based internal load: HR-reserve × duration × an intensity weighting.
- **Training monotony & strain (Foster)** — *monotony* = weekly mean load ÷ its SD (day-to-day sameness); *strain* = weekly load × monotony. High load + high monotony flags overtraining/illness risk.
- **Acute:Chronic Workload Ratio (ACWR)** — recent vs. rolling load; a sharp spike flags injury risk.
- **Wellness / readiness surveys** — sleep, soreness, mood, fatigue (e.g., the **Hooper index**).

---

## Availability & injury surveillance

"Availability is the best ability" — you can only develop a player who's on the
pitch. Track it with the standardized epidemiology framework (2006 football
consensus statement; 2020 IOC methodology update):

- **Injury incidence** — injuries per **1000 player-hours**, reported **training vs. match separately** (match rates run far higher). Normalizes for exposure so squads and seasons compare.
- **Injury burden** — **days lost per 1000 hours = incidence × mean severity**; the best single "what is this costing us" number (separates frequent-but-minor from rare-but-severe).
- **Severity grades** (days lost) — slight (0) · minimal (1–3) · mild (4–7) · moderate (8–28) · severe (>28) · career-ending.
- **Availability %** — share of sessions/matches the squad is available for (uninjured, unsuspended); a headline squad-health KPI.
- **Recurrence rate** — share of injuries that are re-injuries — a rehab / return-to-play quality check.

> **Youth note:** report by **maturity / PHV status** — peri-PHV players carry
> elevated risk (growth plates, shifting coordination; see [04](04-attributes-and-physical.md), [11](11-player-development-and-pathways.md)).
> Prevention programs (**FIFA 11+**) target the biggest injury buckets (hamstring, knee, ankle).

---

## Testing & assessment (academy toolkit)

Physical tests
- Sprint: **5 / 10 / 20 m** times (acceleration & speed).
- Endurance: **Yo-Yo Intermittent Recovery**, beep/bleep test, **30-15 IFT** — whose final speed (VIFT) estimates **MAS (Maximal Aerobic Speed)**, used to *individualize* interval-training prescription (Buchheit).
- Power: **Countermovement Jump (CMJ)**, standing broad jump.
- Agility: **T-test**, Illinois agility, 505 change-of-direction.

Movement quality & injury screen
- **Nordic hamstring** (eccentric-strength test) — hamstring strains are football's most common injury; eccentric work is the front-line prevention.
- **Functional Movement Screen (FMS)** — a 7-task movement-quality screen; widely used as a *monitor*, not a precise injury predictor.
- **Single-leg hop / Y-Balance** — limb symmetry and dynamic balance, chiefly for return-to-play clearance.

Technical tests
- Juggling counts · passing-accuracy tests · dribbling/slalom timed runs · shooting-accuracy targets · wall-volley tests. (Useful *benchmarks*, but game performance is the real measure.)

Growth & maturation
- **Peak Height Velocity (PHV)** estimate · predicted adult height · **maturity offset** → drives **bio-banding** and load decisions.

Psychological / character
- Age-appropriate questionnaires and, more practically, coach observation of effort, coachability, resilience, and teamwork against a rubric.

---

## Performance analysis (the discipline)

The people, tools, and workflow that turn the metrics above into coaching:

- **Video / match analysis** — filming sessions and games, clipping key moments, reviewing with players (self *and* opposition analysis).
- **Performance-analysis department** — a dedicated analytics/sports-science unit (e.g., **Benfica LAB**) that monitors players individually and feeds training.
- **Individual monitoring** — tracking each player's data and clips over time to guide their development plan.
- **Where the numbers come from** — **event data** (on-ball actions: Opta / Stats Perform, StatsBomb / Hudl, Wyscout) vs. **tracking data** (every player's x/y position: SkillCorner, Second Spectrum, Hawk-Eye). Aggregators like **FBref** surface much of it free. Event data underlies most stats above; tracking data powers off-ball, pitch-control and physical-output metrics.
- At youth level, a phone camera + a shared folder + a good question ("what did you see here?") delivers most of the value.

## Using metrics well in a youth academy

- **Development > outcomes.** Track *process* markers (skill benchmarks, decision quality, effort, minutes across positions) more than goals/wins.
- **Longitudinal, not one-off.** Re-test on a schedule; watch each child's *own* trajectory.
- **Adjust for maturation.** A late developer's "worse" sprint may just be biology — bio-band before you judge.
- **Whole child.** Balance the four corners (see [04](04-attributes-and-physical.md)); don't over-index on the physical because it's easiest to measure.
- **Keep it motivating.** Use data to encourage progress and set process goals, not to rank or pressure young players.

> **Curriculum note:** Define a small, consistent **assessment battery** per
> LTAD stage (a few physical, technical, and character measures) and re-run it
> each term to chart growth and inform (not dictate) the next block.

---

## Sources & provenance

These are **named, published metrics and frameworks** — cited by origin per the
[Documentation Standard](../DOC_STANDARD.md) (Rule 1: never invent a metric or
formula). Definitions and citations for the analytics, load, injury-surveillance,
and testing metrics above are collected in
[`references/sources.md` → Metrics & analytics](../references/sources.md#metrics--analytics-index09).
Per this environment's egress policy, primary pages are cited as **surfaced and
corroborated via search**, not opened directly (see the sources file's methodology note).
