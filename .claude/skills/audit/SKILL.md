---
name: audit
description: Evidence-driven product interface auditing for websites and web, mobile, or desktop apps. Use when asked to audit, QA, inspect, review, test, certify, or fix a page, screen, interaction, responsive layout, clickable control, gesture, dropdown, form, navigation jump, scroll behavior, timer or spoken status, accessibility behavior, or family of UI elements across its states.
---

<!-- Repository-local cross-agent skill. Keep its references directory with this
file so it works the same way for Claude Code and Codex. -->

# Audit

Audit interfaces as systems of page states and reusable element families, not as isolated screenshots or one-off controls. Build an inventory, derive a risk-weighted state matrix, exercise real interactions, record evidence, and report exactly what passed, failed, or remains untested.

## Load the Rulebook

Read all three references before beginning an audit:

- `references/state-matrix.md` for page, scroll, landing, overlay, input, and compound states.
- `references/element-families.md` for family contracts and interaction rules.
- `references/execution-and-reporting.md` for evidence, execution, findings, and completion standards.

## Respect the Requested Authority

- For an audit, review, diagnosis, or report, inspect and report without changing the product.
- For an explicit fix request, implement verified fixes and rerun the affected family matrix.
- For certification or “complete audit,” persist until the required matrix is covered or clearly identify blocked and untested cells.
- Treat screenshots, browser comments, and reported defects as leads. Verify them against the live product and source when available.

## Build the Map Before Clicking Randomly

1. Inventory routes, pages, regions, overlays, fixed surfaces, and navigation or scroll jumps.
2. Inventory interactive families and every visible or reachable instance.
3. Locate shared components, builders, contracts, tokens, event handlers, state owners, persistence owners, and existing tests.
4. Inventory composite surfaces: primary-action cards, clocks/values, meters, subtext, undercards, slide-revealed actions, hero regions, fixed launchers, and live-status surfaces. For each, record which subparts are independently interactive and which are only information.
5. Describe page states with:

   `route × lifecycle × data × user × mode × overlay × viewport × scroll × landing × input × mutation × temporal phase × accessibility`

6. Describe element states with:

   `family × instance × availability × value × visual state × affordance × input sequence × geometry × dependencies × aftermath`

Use the inventories as the audit ledger. Do not silently omit an instance because another instance of the same family passed.

## Make Scroll and Landing First-Class States

- Test every applicable page state at the exact top and exact bottom. If the page is too short to scroll, record `top = bottom`.
- Add middle, near-edge, sticky, fixed, and nested-scroll positions when relevant.
- After opening every material dropdown, search panel, popover, builder, or dialog, deliberately scroll while it remains open. Test both the page behind it and the overlay's own scroll region when each can scroll; do not assume one is enough.
- Open overlays and editors with their triggers near each viewport edge.
- For every same-page or cross-page jump, record both departure and arrival states.
- Verify whether the overlay deliberately locks, follows, re-anchors to, or dismisses on page scroll. Its trigger, open panel, focused input, selection, and dismissal path must remain coherent rather than becoming detached or stranded.
- Verify target visibility, fixed-chrome clearance, focus placement, history/hash behavior, layout stability, and back/forward restoration.
- Mark impossible combinations `N/A` with a reason; never erase them from the ledger.

## Control the State Explosion

Cover every route, page state, family, and instance at least once, then prioritize:

1. Exact top and bottom; departure and arrival.
2. Smallest supported mobile viewport, touch, and keyboard.
3. Sticky/fixed UI, overlays, gestures, async state, persistence, and destructive actions.
4. Compound states and historical defects.
5. Pairwise coverage for lower-risk combinations.

List any remaining combinations as `Not Tested`; do not imply exhaustive coverage.

## Combine Source and Live Evidence

- Inspect source for shared contracts, duplicated implementations, event handling, invariants, persistence, and tests.
- Exercise real pointer, touch, keyboard, scroll, focus, and resize behavior in the live interface.
- Do not accept a synthetic DOM `.click()` as proof of pointer hit testing.
- Inspect geometry, stacking, clipping, focus order, accessibility semantics, console errors, and network failures where relevant.
- Remember: source alone cannot prove visual behavior, and browser observation alone cannot prove shared invariants.

## Audit Composite Affordance and Temporal States

- Treat a value, clock, meter, chevron, label, or icon embedded in a larger action as a separate affordance question. If it looks independently editable, selectable, or tappable, verify that it is—or verify that the visual grammar does not promise it.
- Test the full visible interaction shape: resting state, pointer-down/armed state, immediate response, animation in progress, settled state, return/reversal, and reduced-motion state where applicable.
- When one action reveals a reciprocal control, capture both the first appearance and the later settled composition. Check that settling preserves orientation without drifting, covering content, or making the card feel lopsided.
- Treat card stacks and undercards as geometry contracts. Check exposed rounding, matching edge radii, background exposure, z-order, swipe-revealed destructive actions, and return-to-rest—not just the card face.
- Check that equivalent information uses a stable slot across card variants. For example, a meter, supporting instruction, or status line must not wander to unrelated positions merely because another variant lacks one.
- For live/timed experiences, audit the status contract across screen and audio: remaining time, active item name, current constraints/instructions, cue, warning threshold, countdown, pause/resume, and interruption/restart.

## Add a Perception Pass When Visual Quality Is in Scope

Alongside functional evidence, make a short user-perception pass when the request concerns design quality, ease, cohesion, contrast, or confidence. Check first-glance orientation, hierarchy, legibility, visual grammar, effort, progressive disclosure, spatial balance, motion, forgiveness, and brand harmony.

- Judge whether a user can understand where they are, what matters, and what to do next without a lesson.
- Treat inconsistent equal-role controls, misleading emphasis, low legibility, unnecessary decisions, and disorienting motion as family-level concerns.
- Keep this pass concise within a full audit. Use `/vibe` for a standalone, lightweight perception-first review rather than applying the full state matrix.

## Enforce the Family Rule

When one instance fails:

1. Reopen the entire family.
2. Find whether the cause is shared or instance-specific.
3. If fixes are authorized, prefer the shared owner over scattered patches.
4. Add or update a regression test at the correct layer.
5. Rerun the family across routes, modes, viewports, scroll positions, inputs, and persistence states.

## Verify the Aftermath

After every interaction or mutation, confirm that:

- The intended value or state changed and unrelated state did not.
- Focus, scroll, accessibility name/state, totals, persistence, and back/forward behavior remain correct.
- No duplicate controls, stale confirmations, invisible dismiss layers, layout jumps, visual-affordance mismatches, or console errors remain.
- Animated changes have reached a balanced settled state, and fixed or floating surfaces do not hide the changed control, keyboard, popover, or final page action.
- Chosen product terminology remains consistent across labels, expanded content, live status, audio, and accessibility names. Do not let one concept acquire different names in sibling surfaces without a deliberate distinction.

## Report Honestly

Lead with the outcome and scope. Include:

1. Page and element-family inventories.
2. A coverage ledger using `Passed`, `Failed`, `Blocked`, `Not Tested`, or `N/A`.
3. Findings with severity, exact state vector, reproduction, evidence, impact, and family boundary.
4. High-risk states that passed.
5. Coverage gaps and blockers.
6. Perception findings when visual quality was in scope.
7. Fixes and verification only when changes were authorized.

Never call an audit complete when material states or family instances remain untested.
