# Effortless User Rubric

Use this as a perception-first scorecard. It is not a full QA matrix. Assess representative states at the default supported viewport, then inspect the smallest mobile view or other viewport when the request makes it relevant.

## The Core Question

Would an impatient person with high design standards feel capable immediately, know what to do next, and trust the app enough to keep using it?

## Visual Evidence Standard

Base this review on the rendered UI, not source code. Inspect and retain a visual capture or direct live observation of:

- the default arrival state at the primary viewport;
- the smallest relevant responsive viewport;
- each state used to support a material finding; and
- before, immediate, and settled states whenever a finding concerns motion or a transition.

Record the viewport and state for every material finding. Source, DOM, logs, and accessibility output may verify the cause of a visible issue, but cannot independently establish a vibe finding. When no visual evidence is available, report that limitation and do not assign a verdict.

## Fast Passes

### Five-Second Scan

Before interaction, ask:

- Where am I?
- What is the screen for?
- What is the most important thing?
- What can I do next?
- What is secondary and safely ignorable?

Fail the moment if the answer depends on reading instructions, guessing a symbol, or studying competing visual emphasis.

### First-Action Test

Attempt the primary task with no tutorial. Check that the action is visible, named clearly, large enough, and consistent with its role elsewhere.

If the primary action contains a clock, count, meter, or other visually separated value, ask whether it looks independently interactive. A user should never learn by failure that a clock-like object is only decorative or only delegates to a larger action.

### Common-Change Test

Change a value, selection, or setting the user is likely to revisit. Check that the user understands what changed, where it changed, and how to change it again.

When the change creates a new back/reverse control, observe its first appearance and its settled layout. The card should not keep a visually anxious or lopsided temporary composition after the user has acted.

### Reveal Test

Open a secondary area, contextual tool, or expert feature. Check that it is discoverable in context, does not overload the default view, and has a calm exit.

For a swipe-revealed destructive surface or undercard, inspect the revealed fill, corner exposure, alignment, copy, and cancellation. It should feel intentionally layered, not like a broken card edge.

### Recovery Test

Cancel, back out, or make a safe mistake. Check that the user knows their current state, has not lost work unexpectedly, and can recover without anxiety.

### Return Test

Return to the primary screen after a change. Check that the hierarchy, visual grammar, and location of important actions remain stable enough for muscle memory.

When the product uses a first-arrival hero, verify both states: it should orient the first visit and then yield cleanly when the user opens the core content. Returning, reloading, or collapsing must not make the hero feel randomly lost or duplicated.

## Dimensions

### 1. Orientation

Judge whether the screen communicates purpose, current state, and next action before the user investigates.

- Good: one obvious focal point, clear state, meaningful context.
- Friction: “What am I looking at?” or “What am I meant to do now?”

### 2. Hierarchy and Attention

Judge whether visual weight is honest.

- Good: the primary action or information wins the scan naturally.
- Friction: several elements compete, decoration dominates, or an important control is visually timid.

### 3. Legibility and Contrast

Judge real-world readability, not only theoretical compliance.

- Good: text is readable without squinting, color is not the only signal, and hierarchy survives glance speed.
- Friction: faint labels, low-contrast color pairings, tiny utility text, noisy backgrounds, or color clashes.

### 4. Visual Grammar and Consistency

Judge whether equal roles are recognizable as a family.

- Good: same purpose means same shape, visual weight, placement logic, language, and behavior.
- Friction: two controls perform the same job but look unrelated, or familiar symbols change meaning.

### 5. Affordance and Expectation

Judge whether controls look like what they do.

- Good: the user can predict a result from form, label, placement, and motion.
- Friction: decorative-looking controls are interactive, important controls are hidden, a clock/value looks editable but is not, or the response violates expectation.

### 6. Effort and Cognitive Load

Judge how much the user must read, remember, decide, type, or tap for a common task.

- Good: common work has a short, direct path and sensible defaults.
- Friction: unnecessary choices, duplicate mechanisms, unexplained terms, modal interruption, or a feature that needs a lesson to begin.

### 7. Progressive Mastery

Judge whether the app teaches in the right order.

- Good: essential actions are obvious on day one; expert options appear as useful context develops.
- Friction: a core task is hidden like an easter egg, or the initial screen exposes every possibility at once.

### 8. Spatial Composition

Judge balance, grouping, rhythm, touchability, and visual calm.

- Good: edges align, related controls group, spacing has a rhythm, and the screen feels intentionally composed.
- Friction: lopsided clusters, lonely controls, inconsistent padding, accidental overlap, awkward empty space, hard-to-reach actions, or a card title that pushes essential controls into an unstable position.

For card systems, inspect the whole stack—not only the colorful face. Main-card/undercard radii, exposed backgrounds, overlap depth, meter/support-line slots, destructive reveal surfaces, and left/right action spacing must feel like one composed object. A missing rounded lower edge or mismatched undercard fill can make a polished card feel unfinished.

### 9. Motion and Tempo

Judge whether movement preserves orientation and confidence.

- Good: motion explains cause and effect, feels stable, and ends decisively.
- Friction: jumpy transitions, sudden shifts, animations that delay work, movement that causes the user to lose their place, or a reciprocal control that appears without a calm settling composition.

Prefer motion with a readable sequence: action, response, brief orientation, settled state. Do not reward novelty if it makes a player tense or wait.

### 10. Forgiveness and Trust

Judge whether the user can explore safely.

- Good: consequence is legible, state changes are clear, cancellation is calm, and recovery is near.
- Friction: fear of tapping, unclear commitment, destructive-looking ambiguity, or a state that disappears without explanation.

### 11. Brand Harmony and Emotional Residue

Judge whether color, type, iconography, voice, and surfaces feel like one product.

- Good: complementary colors, consistent tone, purposeful variation, and a distinctive but coherent personality.
- Friction: competing themes, arbitrary color use, mismatched icon styles, or a screen that feels assembled rather than designed.

### 12. Platform Fluency and Physical Comfort

Judge whether the interface honors familiar device behavior and the body using it.

- Good: reachable targets, expected gestures, usable target sizes, predictable back/close behavior, and no fight with scroll.
- Friction: platform conventions are ignored without a clear benefit, gestures compete with scroll, search cannot reliably accept typed input on a phone, a fixed control covers a popover/keyboard/final action, or the thumb must work too hard.

When a search or editable input is part of the visible path, visually sample it at phone width with the keyboard open. If the issue is behavioral rather than visible, hand it to `/audit` instead of guessing.

## High-Signal Context Checks

Use these as compact prompts, not as a state matrix.

### Card and Undercard Integrity

- Does each variant preserve a clear home for title, value/clock, meter/progress, supporting text, navigation, and recovery/removal?
- If a utility card has no meter, does its supporting text occupy the corresponding slot instead of becoming a random extra line?
- Do exposed corners, fills, widths, and shadows clearly communicate the front card versus the undercard?
- When a title is long, does the visual system stay symmetrical and calm rather than simply squeezing controls?

### Timed and Live Guidance

- At a glance, can the player identify the active Set/item, time remaining, current instruction context (for example, layers or rules), and verbal cue?
- Does the screen make the next audio update plausible: time left, item name, instruction context, cue, then a clear warning/countdown when needed?
- Do screen and narration use the same words for the same concept? A product may choose `Layers` or `Rules`, but switching labels by surface makes the player feel lost.

### Hero and Fixed-Surface Discipline

- Is the hero useful on first arrival and quiet after the core session content opens?
- Do fixed launchers, docks, or buttons feel intentionally anchored without covering the last relevant card, a keyboard, a popover, or a destructive confirmation?
- Does a small viewport preserve the product’s breathing room instead of turning visual priorities into a stack of collisions?

## Anti-Patterns to Name Clearly

- Visual emphasis that does not match importance
- Duplicate interaction methods with no benefit
- Novelty hiding ordinary tasks
- Instructions compensating for unclear design
- Low contrast presented as subtlety
- Decorative clutter mistaken for personality
- Inconsistent patterns that prevent muscle memory
- Motion that feels urgent, jumpy, or unearned
- Dense screens that force decision fatigue
- Clever labels that obscure plain meaning
- Asymmetry without visual purpose
- Feature discovery that arrives after the user already needed the feature
- A noninteractive value styled as a direct control
- An undercard whose clipped corners or mismatched fill erase the intended stack hierarchy
- A card variant that abandons the family’s information slots without a clear reason
- A transition that looks balanced only before or only after it settles
- Live guidance that hides the current constraint/context while expecting a player to follow it

## Verdicts

- `Effortless`: priorities, patterns, and motion are clear enough that the interface recedes behind the task.
- `Needs tightening`: the product works and has a coherent direction, but specific friction weakens confidence or ease.
- `Breaks confidence`: visual or behavioral inconsistency makes the user hesitate, mistrust the interface, or struggle with a core task.

## Finding Format

Use a concise structure:

`[Moment] — [Expectation] → [Observed friction] → [Why it matters] → [Direction]`

Example:

`First arrival — the user expects one obvious next move → three equal-bright controls compete → the screen creates a decision before the task begins → give the primary action a single, repeatable visual grammar and reduce the others to supporting weight.`
