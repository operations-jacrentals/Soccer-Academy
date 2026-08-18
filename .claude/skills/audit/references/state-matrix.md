# State Matrix

Use this catalog to derive the smallest defensible audit matrix. Record excluded cells as `N/A` or `Not Tested` with a reason.

## Contents

1. Lifecycle and loading
2. Data and network
3. User, permissions, and persistence
4. Product modes
5. Overlays
6. Navigation and history
7. Scroll positions
8. Landing and arrival
9. Viewports and environment
10. Content shapes
11. Input and accessibility
12. Mutation, concurrency, and time
13. Composite visual anatomy and temporal motion
14. Live status, narration, and media cues
15. Compound states

## 1. Lifecycle and Loading

- Blank document and first painted frame
- Booting, hydrating, and blocking load
- Loaded and interactive
- Route transition and in-place refresh
- Hard reload and restored reload
- Reopen after termination
- Background, resume, and stale resume

## 2. Data and Network

- No data, loading, normal, empty, one item, typical, maximum, and extreme volume
- Partial, stale, and refreshing data
- Offline, reconnecting, and recovered
- Missing, malformed, or legacy records
- Permission, validation, server, and unknown errors
- Retry, slow response, timeout, duplicate response, and response arriving out of order

## 3. User, Permissions, and Persistence

- New, onboarding, returning, customized, and unfinished users
- Signed out, signed in, expired session, and reauthenticated
- Each supported role and permission boundary
- Clean, dirty, saving, saved, failed, optimistic, rejected, and conflicted state
- Migrated, corrupt, and recovery state

## 4. Product Modes

- Read-only, ready, edit, create, select, reorder, and remove-revealed
- Confirmation, processing, success, warning, error, and locked
- Started, live, paused, resumed, completed, and archived when applicable
- Every product-specific mode that changes structure or interaction
- First-arrival, hero-present, hero-dismissed, and returned-to-home states when the product progressively reveals content

## 5. Overlays

- None, tooltip, dropdown, menu, popover, inline editor, dialog, modal, drawer, sheet, toast, confirmation, keyboard, and native validation UI
- Opening, open, closing, and sibling-overlay handoff
- Trigger covered, background interactive, background inert, outside click/tap, Escape, page scroll, overlay-internal scroll, scroll chaining, resize, and orientation change
- Near top, bottom, left, and right viewport edges
- Nested overlay and visual-viewport reduction by the keyboard
- Verify real pointer hit testing through scrims and dismiss layers
- Test search and other text inputs while the software keyboard is open: focus acquisition, typed query, results refresh, keyboard avoidance, clear/cancel, and dismissal

## 6. Navigation and History

- Initial route, deep link, valid and invalid parameters
- Internal link, external link, redirect, missing route, and access-denied route
- Back, forward, reload, and restored scroll/focus
- Navigation with unsaved changes or pending work

## 7. Scroll Positions

For every applicable page state, test:

- Exact top
- Near top while sticky behavior changes
- Middle
- Near bottom
- Exact bottom
- After expand, collapse, add, remove, retime, reorder, or async insertion
- With overlay open: scroll the page behind it, scroll the overlay itself when it has overflow, and test the trigger at top/middle/bottom of the page
- After viewport resize, orientation change, or keyboard appearance
- After reload or route restoration

Place relevant elements at:

- Top edge, under sticky chrome, middle, bottom edge, above footer, partially visible, offscreen, and inside nested scrolling

Verify:

- No accidental jump or scroll theft
- The initiating control remains understandable and visible when appropriate
- Overlay placement adapts without clipping
- An open overlay remains anchored, intentionally dismisses, or deliberately locks background scrolling; it never drifts away from its trigger, traps an unreachable focused input, chains a scroll unexpectedly, or leaves its selected option/action unreachable
- Fixed header/footer clearance is preserved
- Close behavior and restored focus are sensible
- Opening one region does not move unrelated content unexpectedly
- A vertical scroll is not mistaken for a horizontal gesture
- Bottom actions remain reachable above browser chrome and safe areas

## 8. Landing and Arrival

Test arrival from:

- Normal load and deep link
- Same-page anchor and cross-page link
- Programmatic `scrollIntoView`
- Return-to-active-item, table of contents, search result, and validation error
- Back, forward, and reload at an anchor

Test targets that are:

- Already present, inserted asynchronously, newly created, collapsed, nested, or initially offscreen

For every jump, record departure and arrival. Verify:

- The intended target is visible and identifiable
- Fixed headers and footers do not cover it
- It has useful breathing room rather than touching an edge
- Keyboard focus and accessibility announcement match the visual arrival
- Hash, history, and Back behavior are correct
- Async layout shift does not move the target afterward
- Motion does not overshoot and respects reduced-motion preferences
- Rotation, resize, and opening content do not destroy the landing position

## 9. Viewports and Environment

- 320, 360, 390, and 430 CSS-pixel mobile widths
- Tablet portrait and landscape
- Desktop and wide desktop
- Short and tall viewports
- Orientation change, safe areas, browser chrome, software keyboard, and split view
- Browser zoom, text scaling, reduced motion, high contrast, and supported color modes
- Fixed/floating controls with a short viewport, software keyboard, popover, sheet, and exact page bottom

## 10. Content Shapes

- Empty, short, typical, long, multiline, localized, numeric extremes, and special characters
- Duplicate labels, similar labels, and truncation collisions
- Missing, broken, portrait, landscape, and slow media
- Minimum, maximum, negative, decimal, and invalid numeric values where applicable

## 11. Input and Accessibility

- Mouse, trackpad, touch, stylus where supported, keyboard, and assistive technology semantics
- Hover, focus, focus-visible, pressed, selected, disabled, invalid, busy, and drag states
- Tap, second tap, long press, swipe, drag, scroll, Enter, Space, Escape, arrows, Tab, Shift+Tab, Delete, and Backspace as applicable
- Accessible name, role, value, state, description, reading order, target size, contrast, and focus visibility

## 12. Mutation, Concurrency, and Time

- Single, repeated, rapid, and interrupted action
- Double activation and action during animation
- Local edit while remote or async data changes
- Save during navigation and remove during refresh
- Timer at zero, boundary, rollover, pause/resume, background/resume, and device-time change
- Reload after each persisted mutation

## 13. Composite Visual Anatomy and Temporal Motion

For material cards, stacked surfaces, and composite actions, inspect:

- Resting, pressed, expanded, swapped, removal-revealed, and restored states
- Individual affordance boundaries: title, value/clock, meter, arrow, supporting text, swipe area, and destructive action
- Immediate response, in-motion frame, short settled interval, repeated action, reversal, and reduced-motion behavior
- Main-card and undercard corner radii, exposed fill, overlap depth, z-order, clipping, and safe return after a cancelled swipe
- Stable semantic slots across variants: where title, value, meter, helper/subtext, navigation, and live status belong
- Long labels, long values, and small widths without title/control collision or unexplained truncation

When a visually distinct value is inside a larger primary action, explicitly test whether users can tap it. A noninteractive value must not borrow the visual grammar of a direct editor or timer control.

## 14. Live Status, Narration, and Media Cues

For a timer, guided session, or media-assisted task, test:

- Current screen tells the user the active item and its active instruction context (for example, constraints, layers, or rules chosen by the product vocabulary)
- Spoken update contains the intended sequence: remaining time, active item name, active instruction context, then cue; verify the actual wording, not only that audio played
- Warning/countdown threshold, including a 15-second countdown when specified, and behavior at zero
- Audio enabled/disabled, missing cue, interrupted playback, background/resume, rapid state change, and duplicate-announcement protection
- Screen/audio terminology matches exactly enough that a player can follow one without decoding another

## 15. Compound States

Always consider these high-risk combinations:

- Mobile + keyboard + dropdown
- Vertical scroll beginning on a swipe-enabled row
- Fixed header + fixed bottom dock + short viewport
- Open builder/editor + duplicate or nested controls
- Async mutation + repeated activation
- Error state + software keyboard
- Migrated or legacy record + new component contract
- Reload on the active/live item
- Removal armed + underlying data changes
- Drag/reorder + edge auto-scroll
- Sibling overlay trigger while another overlay is open
- Reduced motion + animated navigation
- 320px viewport + longest content
- Maximum content + exact page bottom
- Mobile search + software keyboard + results changing beneath a fixed launcher
- Composite Start/primary card + decorative-looking clock/value + real tap
- Swipe-revealed undercard + rounded corners + cancellation/reversal + fixed bottom control
- Skill/card swap + reciprocal arrow appears + settled layout after a short delay
- Live timer + long active item name + constraints/layers + spoken warning/countdown
- Hero on first arrival + content expansion + hero dismissal + Back/reload restoration
