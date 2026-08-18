# Claude Code guidance

## UI quality skills

Repository-local quality skills are available under `.claude/skills/`:

- Use `/vibe` for a visual, perception-first review of the calendar or WALL
  BALL experience. It requires rendered visual evidence before making findings.
- Use `/audit` for an evidence-led interface audit, interaction QA, responsive
  verification, gesture testing, accessibility checks, or a request to fix a
  verified UI defect. It requires a state/element-family matrix and reruns
  affected families after a fix.

Use `/vibe` before large visual-polish work. Escalate from `/vibe` to `/audit`
when a concern needs full state coverage or reliability proof.
