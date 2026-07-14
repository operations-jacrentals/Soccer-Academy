# Documentation Standard

The integrity rules for **every** document in the curriculum. If a claim can't
meet these, it doesn't go in as fact.

---

## Rule 1 — Zero invention

- **Every number, benchmark, standard, threshold, dimension, age, count, or
  ratio must come from a real, verifiable source**, cited at the point of use.
- **Every formula must be a real, published formula** — cited by name/origin.
  Never invent a formula, a metric definition, or a "study."
  - Real examples we may use (and must cite when we do): IFAB Laws of the Game;
    the **ACWR** (acute:chronic workload ratio); **xG** (expected goals) models;
    **PHV / maturity offset** (Mirwald equation); the **FIFA 11+** program;
    **LTAD** (Long-Term Athlete Development); federation small-sided-game standards.
- **No fabricated citations, quotes, statistics, or results.** A link must
  actually support the claim attached to it.
- If there is **no source**, do not state it as established fact. Either find a
  source, or label it (below) as a non-fact — a coaching judgment, a placeholder,
  or a question. Never dress an opinion up as a standard.

## Rule 2 — Pick the higher standard

- When credible sources **disagree** on a benchmark or standard, adopt the
  **higher** one:
  - for **development/performance** targets → the *more demanding* figure;
  - for **safety/health** limits → the *more protective* figure.
- Always **name the source** the adopted figure came from, and **note the range**
  when sources differ (e.g., "8–12 depending on source; we adopt 12 (Source X)").
- Rationale: aim the program at the top of the credible range.

---

## Confidence & provenance labels

Every factual claim carries its status inline:

| Label | Meaning | Requirement |
|---|---|---|
| ✅ **Sourced** | cited to a real primary/reputable source | include the citation |
| ⚠️ **Unverified** | from a secondary source or not yet confirmed against primary | keep the label until verified |
| ✏️ **Coaching judgment** | a reasoned default with no single authoritative source | label it; never present as a standard; flag for grounding |
| ❓ **Needs source** | placeholder to be filled | resolve before it's treated as fact |

## Citation rules

- **Prefer primary sources** — governing bodies (IFAB, US Soccer, UEFA, national
  FAs), official club/federation curricula, peer-reviewed research, the data
  publisher itself (e.g., CIES for player counts) — over blogs/aggregators.
- If only a **secondary** source is available, mark the claim **⚠️ Unverified**
  and cite the secondary source honestly (don't imply it's primary).
- Cite with a real link (or book + page). The reader must be able to check it.

## What this means in practice

- **Benchmarks** ("an 8-year-old should…") must be grounded in a **published,
  age-appropriate curriculum** (e.g., US Soccer, FA), cited — not synthesized.
- **Field / ball / format numbers** must cite the governing standard (IFAB Laws;
  the federation's small-sided-game rules).
- **Statistics** (e.g., academy player counts) must cite the **data publisher**;
  if the primary source can't be accessed, mark **⚠️ Unverified (secondary)**.
- **Applied frameworks** (difficulty tiers, LTAD stage tags) must either cite the
  framework or be labeled **✏️ coaching judgment**.

---

## Compliance backlog

Status of docs written **before** this standard (tracked so nothing slips
through). Citations live in [`references/sources.md`](references/sources.md).

| Doc | Issue | Status |
|---|---|---|
| `research/` academy counts (CIES) | secondary summaries; primary CIES blocked | **labeled ⚠️** in sources + research docs; primary verification pending |
| `research/` facility stats (campus, staff, "60+ rondos", Ajax stage ages) | secondary | **labeled ⚠️** (verify if a primary opens) |
| `index/` difficulty tiers `F/I/A/E` | our convention | **labeled ✏️** coaching judgment |
| `index/` LTAD stage tags | needed citation | **cited ✅** (Ford et al. 2011) |
| `index/` format / ball / wall numbers | needed citation | **cited ✅** (US Soccer PDI 2017, IFAB) |
| `age-08/` entry→exit benchmarks | synthesis, uncited | **regrounded ✅** (US Soccer/FA/LTAD/IFAB); progressions **labeled ✏️** |

**Environment limitation (disclosed per Rule 1):** this session's network egress
policy **blocks direct fetching of primary-source pages** (HTTP 403 for
`theifab.com`, `usyouthsoccer.org`, `football-observatory.com`, …). So ✅ items are
cited to authoritative sources as **surfaced and corroborated via search**, not
opened directly; ⚠️ items await a primary that can be reached.

**Rule going forward:** new docs meet this standard *at write time* — sourced or
clearly labeled, never invented.
