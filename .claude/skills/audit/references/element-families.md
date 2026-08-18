# Element Families

Audit a family contract and then verify every instance. Similar-looking controls are not assumed equivalent until their implementation and behavior agree.

## Inventory Fields

| Field | Record |
|---|---|
| Name and instances | Family name, selectors, routes, modes, and counts |
| Purpose and objective | User intent and successful outcome |
| Impact | State, navigation, data, timing, or destructive effects |
| Owner | Component/builder, handler, contract, tokens, tests |
| Inputs | Hover, tap, second tap, hold, swipe, drag, keyboard |
| Appearance | Colors, typography, iconography, geometry, animation, and affordance promise |
| States | Availability, value, visual, overlay, pending, error |
| Dependencies | Data, permissions, sibling state, timers, network |
| Persistence | Reload, reopen, back/forward, local/remote storage |
| Aftermath | Focus, announcement, scroll, totals, related values |

## Universal States

Check absent, hidden, visually hidden, disabled, enabled, idle, hovered, focused, pressed, selected, expanded, busy, invalid, confirmed, completed, and stale states where applicable.

## Core Families

- Links and navigation triggers
- Primary, secondary, icon-only, and destructive buttons
- Cards, rows, list items, and selectable tiles
- Composite primary actions, value/clock affordances, card stacks, undercards, and swipe-revealed actions
- Disclosures, accordions, and collapsible regions
- Dropdowns, menus, popovers, tabs, and selectors
- Text, numeric, time, search, and choice inputs
- Sliders, meters, steppers, and direct-manipulation controls
- Swipe actions, long-press actions, and drag/reorder handles
- Dialogs, sheets, drawers, tooltips, and confirmations
- Media, tutorials, uploads, and playback controls
- Live timers, spoken updates, countdowns, and instruction/status surfaces
- Sticky/fixed headers, docks, floating actions, and safe-area surfaces
- Loading, error, empty, retry, and optimistic controls
- Inline editors and destructive removal flows

## Pointer Sequence

Verify hit target, pointer-down feedback, movement tolerance, cancellation, pointer-up activation, outside dismissal, overlapping layers, and repeated activation. Use real pointer or touch input when hit testing matters.

For a composite control, test every visually distinct subpart. Record whether it is independently interactive, deliberately inert, or delegates to the parent. Do not allow a clock, chevron, or badge to look like a familiar direct control while silently doing something unrelated.

## Tap and Long Press

- A tap performs only the documented primary action.
- A second tap follows an explicit contract; it never accidentally duplicates the first action.
- Long press has a defined threshold, movement tolerance, visible feedback, cancellation path, and no ghost tap afterward.
- The browser context menu or text selection does not compete unless intentionally supported.

## Swipe

- Vertical scrolling wins decisively over ambiguous horizontal movement.
- Horizontal intent uses forgiving distance and velocity thresholds without feeling jumpy.
- Movement tracks the pointer smoothly and releases with controlled animation.
- Partial, completed, reversed, and cancelled swipes settle predictably.
- Revealed actions remain operable and accessible without the gesture.
- Revealed undercards preserve intentional geometry: rounded exposure, correct fill, z-order, readable destructive copy, and a calm cancellation/reversal path.

## Drag and Reorder

- Initiation does not steal taps or scrolling.
- Lifted, moving, valid-target, invalid-target, and dropped states are visible.
- Edge auto-scroll is controlled; order and persistence are correct.
- Keyboard and non-drag alternatives exist when required.

## Keyboard

Verify Tab order, Shift+Tab, Enter, Space, Escape, arrow keys, Home/End, Delete/Backspace, focus trapping, focus restoration, and focus-visible styling. Do not let shortcuts fire while typing unless intentionally scoped.

## Dropdown, Menu, and Popover

Verify closed, opening, open, option hover/focus, selected option, disabled option, no results, custom entry, dismissal, and sibling handoff. The selected item must retain its selected styling until another choice commits. Test edge placement, clipping, scrolling, keyboard operation, real pointer clicks, and invisible dismiss layers.

With a material dropdown, search panel, popover, builder, or dialog open, deliberately scroll the page and its own scrollable content. Record the intended policy: background locked, overlay follows/re-anchors, overlay dismisses, or page remains safely scrollable. Confirm the panel does not detach from its trigger, drift under fixed chrome, lose its focused input, chain a scroll unexpectedly, or leave its selected option/action unreachable.

For mobile search, verify the actual native keyboard path: tap-to-focus, typing, filtering, selection, clear/close, pointer hits around the input, and results that remain usable while the visual viewport shrinks.

## Inputs

Verify empty, populated, selected, editing, invalid, corrected, submitting, saved, and failed. Test native keyboard type, selection, formatting, min/max, paste, undo, blur, Enter, Escape, and overlay coexistence.

## Geometry and Aftermath

For each family, verify target size, alignment, wrapping, clipping, z-index, safe-area clearance, motion, and reduced motion. Test immediate and settled layouts after a change; a card must not look balanced only in the first frame or only after a delayed shift. After interaction, confirm focus, scroll, announcement, persisted value, dependent totals, and unrelated state.

## Card, Meter, and Supporting-Text Grammar

- Define the semantic slot for each card role: title, primary value, navigation, meter/progress, supporting instruction, and destructive/recovery surface.
- Test every card variant, including utility variants, for the same slot logic or an explicit documented exception. A missing meter must not cause related supporting text to float arbitrarily.
- Test title expansion, long words, localization, and small widths. Primary controls must retain a predictable home rather than being pushed into a visually or physically ambiguous location.
- Verify undercard edges, fills, and radii at rest, overlap, reveal, and close. A missing rounded lower edge or wrong exposed fill is a functional family failure when the geometry communicates hierarchy.
- Treat visual symmetry as evidence: check equal action/control spacing, clock alignment, support-line alignment, and balanced unused space across sibling cards.

## Live Guidance and Terminology

- Verify that the active item name, current instruction/constraint context, cue, and time remaining are visible together at a useful glance.
- Verify that the product uses one chosen term consistently for a shared concept across card, builder, live mode, audio, accessibility label, and help text. If terms such as `Layer` and `Rule` have distinct meanings, test the distinction rather than treating them as synonyms.
- Verify narration against a written content contract, including warning thresholds and countdowns. Hearing a sound is not proof that the right guidance was delivered.

## Family Failure Rule

If one instance fails, reopen all instances across routes, modes, top/bottom scroll positions, input methods, and representative viewports. Locate the shared owner, distinguish contract defects from instance defects, and rerun the family after any authorized fix.
