# Repository-local Claude skills

These skills travel with the repository so visual and interaction standards do
not depend on one person's local tool setup.

- `/vibe` — a lightweight, perception-first UX review. It requires live visual
  evidence and should be used for design quality, coherence, readability, and
  first-use ease.
- `/audit` — a system-level interaction and state audit. It uses page and
  element-family inventories, a risk-weighted coverage ledger, and real input
  evidence. Use it for QA, reliability, accessibility, gestures, or exhaustive
  state coverage.

Both skills are review-first. They only authorize implementation when the user
explicitly asks for fixes.
