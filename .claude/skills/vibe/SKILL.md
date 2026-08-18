---
name: vibe
description: Lightweight perception-first UX and visual-coherence review for websites and apps. Use when asked for a vibe audit, design gut check, usability impression, visual critique, ease-of-use review, consistency review, contrast or legibility review, or an impatient user perspective without a full interaction and state QA audit.
---

<!-- Repository-local cross-agent skill. Keep its references directory with this
file so it works the same way for Claude Code and Codex. -->

# Vibe

Review whether an interface feels immediately clear, calm, familiar, deliberate, and easy. Judge the experience through an impatient, design-sensitive user who wants to act with little thought and build reliable muscle memory.

Read `references/vibe-rubric.md` before reviewing.

## Require Visual Evidence

- Open the rendered interface and assess it visually before reading source code, DOM output, or implementation notes.
- Use a live browser view, screenshot, screen recording, or provided visual capture for every state used to make a finding. Capture screenshots when the environment supports them; otherwise record the exact state and viewport directly observed.
- Inspect at least the default arrival state and the smallest relevant responsive viewport. Also visually inspect every expanded, changed, or motion state that supports a material finding. For motion findings, inspect the before, immediate, and settled frames rather than judging a transition from one screenshot.
- Use code, DOM inspection, logs, and accessibility trees only to explain, locate, or reproduce a visually observed issue. They never create a vibe finding on their own.
- If visual access is unavailable, say `Visual evidence unavailable`. Offer a constrained design critique only; do not issue an `Effortless`, `Needs tightening`, or `Breaks confidence` verdict.

## Keep the Scope Lightweight

- Sample representative moments rather than testing every button or state: arrival, core task, common change, revealed detail, recovery, and return.
- Start with a five-second silent scan before interacting. Record what a user can understand without being taught.
- Use live interaction only to answer a perception question, such as whether a control behaves as it looks or whether motion preserves orientation.
- Escalate to `/audit` when the request requires exhaustive family coverage, gestures, accessibility verification, reliability testing, or a full state matrix.

## Adopt the User Lens

Assume the user:

- Is impatient and will not read a manual for a basic task.
- Notices weak contrast, illegible text, awkward density, clutter, and visual imbalance.
- Expects equal actions to have equal visual grammar, placement, and behavior.
- Wants familiar patterns and stable muscle memory.
- Accepts hidden expert techniques only when essential actions remain obvious on day one.
- Wants the interface to feel calm, controllable, forgiving, and intentionally made.

## Review the Experience

1. Capture the first-glance impression before tapping. Ask: “Where am I, what matters, and what should I do?”
2. Follow one primary path and one common adjustment as a user would.
3. Reveal one optional or advanced area. Check whether it feels progressive rather than concealed.
4. Make one low-risk mistake or abandon one action. Check whether the user remains oriented and unafraid.
5. Revisit the screen after the change. Check whether the interface still feels coherent and familiar.
6. When a mobile text input or search is central to the experience, make one real phone-width input attempt. Escalate to `/audit` if keyboard, hit testing, filtering, or overlay reliability needs proof.
7. Evaluate the dimensions in the rubric, favoring clear issues over a long list of tiny opinions.

## Apply the Non-Negotiables

- Make importance visually honest: prominence, color, size, and motion must match consequence.
- Make equivalent roles look and behave equivalent across the product.
- Make text readable at a glance; never use a color or font treatment that forces effort.
- Make common actions visible and predictable before a user needs them.
- Make advanced capability discoverable in context without cluttering the default path.
- Make layout feel balanced, grouped, and intentional; remove accidental asymmetry and visual noise.
- Make motion explain change instead of startling, obscuring, or disorienting the user.
- Make destructive or consequential moments feel safe, clear, and reversible where possible.
- Make composite controls honest: a visually distinct value, clock, badge, arrow, or meter must either do what it visibly promises or read clearly as part of its parent action.
- Make card and undercard geometry carry hierarchy cleanly: exposed fill, corners, overlap, and reveal state should feel designed rather than accidentally clipped.
- Make progressive entry and exit deliberate: a hero may orient first arrival, then recede when detail is opened; it must not compete with the task after that transition.
- Make live guidance glanceable: the active item, its current instruction/constraint context, cue, and time should feel like one coherent moment.

## Check High-Signal Friction Patterns

Sample these only when the pattern exists; this is still a lightweight review, not a full QA matrix.

- **Affordance honesty:** Does a clock or value inside a large action look independently editable even when it is not? Does an arrow look like navigation rather than a timer control? Do equal actions share a recognizable builder?
- **Card-family composition:** Do title, primary value, meter/progress, supporting text, navigation, and destructive recovery surfaces occupy stable, balanced slots across variants? Are rounded undercards fully exposed at rest and during a swipe reveal?
- **Settling motion:** After a swap reveals a reciprocal/back control, does the layout gently resolve into a balanced composition instead of snapping, drifting, or leaving a new control stranded?
- **Small-screen comfort:** At the smallest relevant width, can long titles, utility labels, meters, arrows, fixed launchers, popovers, and the software keyboard coexist without crowding or visual panic?
- **Lifecycle clarity:** Does arrival give enough orientation, and does opening deeper session content remove or quiet the hero without making the user wonder where they are?
- **Guidance clarity:** In a live/timed view, can a player immediately see the active Set/item, current restrictions or layers, time, and verbal cue? Does the visual vocabulary align with what the audio says?
- **Language integrity:** Does one concept retain one plain label throughout the journey? If product words such as `Layer`, `Rule`, `Set`, or `Skill` are intentionally distinct, can a user feel the distinction rather than memorize it?

## Report Like a Design-Sensitive User

Lead with a short verdict: `Effortless`, `Needs tightening`, or `Breaks confidence`.

For each material finding, state:

- The observed visual state and viewport
- The moment and user expectation
- What the user sees or feels
- Why it creates friction, distrust, or cognitive load
- The affected visual or interaction pattern
- A directional remedy, not premature pixel-level instructions

Also name what already works. End with the three changes most likely to improve the experience. Do not present subjective preference as a verified functional defect.
