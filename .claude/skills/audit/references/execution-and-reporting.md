# Execution and Reporting

## Evidence Hierarchy

Prefer evidence in this order while combining complementary forms:

1. Real pointer, touch, keyboard, scroll, resize, and focus behavior
2. Geometry, computed styles, accessibility state, console, and network evidence
3. Focused automated or pure-function tests
4. Source inspection of shared contracts and state transitions
5. Screenshots and recordings
6. User reports as high-value leads requiring verification

## Execution Sequence

1. Restate scope and whether fixes are authorized.
2. Discover routes, page regions, overlays, fixed surfaces, and jumps.
3. Build page-state and element-family inventories.
4. Inspect shared implementation owners and existing tests.
5. Build the risk-weighted coverage ledger.
6. Establish a clean baseline and capture environment details.
7. Exercise high-risk page states at exact top and bottom, including hero-present/hero-dismissed lifecycle states and fixed-control clearance where relevant.
8. Exercise every navigation departure and arrival.
9. Test every family with real applicable inputs and edge geometry. For composite cards, test all visually distinct subparts; for animated changes, capture immediate and settled states. For every material overlay, scroll the page and the overlay while open, then verify anchoring, scroll policy, focused input, and reachable actions.
10. Test persistence, aftermath, errors, spoken/media status, and compound states.
11. When a defect appears, expand from the instance to its family boundary.
12. If authorized, fix at the correct owner, add regression coverage, and rerun.
13. Report findings, passes, gaps, blockers, and residual risk.

## Coverage Ledger

Use this minimum schema:

| Route | Page state | Element family | Instance | Viewport | Scroll | Landing | Input | Overlay | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|

Allowed results:

- `Passed`: expected behavior directly verified.
- `Failed`: reproducible mismatch found.
- `Blocked`: external condition prevents verification.
- `Not Tested`: valid cell remains uncovered.
- `N/A`: impossible or irrelevant, with a recorded reason.

Add `Temporal phase` and `Affordance boundary` columns whenever a card, timer, meter, swipe surface, animation, or nested control is in scope. Examples: `rest`, `armed`, `immediate`, `settling`, `settled`, `reversed`; and `parent`, `clock`, `meter`, `arrow`, `undercard`, `search input`.

## Finding Schema

For every defect record:

- ID and concise title
- Severity
- Family and affected instances
- Route and full state vector
- Viewport and scroll position
- Departure and arrival when navigation is involved
- Input method and exact sequence
- Temporal phase and affordance boundary when relevant
- Expected and actual results
- Minimal reproduction
- Evidence
- Suspected or verified cause
- User/system impact
- Regression boundary
- Fix status and post-fix verification

## Severity

- `P0`: catastrophic loss, security/privacy breach, or product unusable broadly.
- `P1`: critical task blocked, destructive corruption, or no reasonable workaround.
- `P2`: important behavior incorrect, confusing, inaccessible, or unreliable with a workaround.
- `P3`: minor visual, copy, consistency, or low-impact polish defect.

## Reporting Order

1. Outcome and scope
2. Findings ordered by severity
3. Family and page inventories
4. Coverage ledger or concise matrix summary
5. High-risk states that passed
6. Blocked and untested states
7. Fixes and verification, if authorized
8. Residual risk and next action

## Authorized Fix Loop

When fixes are requested:

1. Reproduce before editing.
2. Locate the family owner and invariant.
3. Make the smallest shared correction that satisfies the contract.
4. Add regression coverage proportional to risk.
5. Run focused checks, then required project-wide checks.
6. Rerun the failed cell, sibling instances, top/bottom, input alternatives, and persistence.
7. Rerun immediate and settled motion, reduced-motion behavior, and audio/status wording when the family includes them.
8. Record any intentionally unchanged behavior.

## Completion Standard

Call the audit complete only when the agreed inventory is covered, every material failure is reported, and every remaining cell is explicitly `Blocked`, `Not Tested`, or `N/A`. Never equate “no defect observed” with “all states passed.”
