import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * Guards for the event card layout contract.
 *
 * These are source assertions and cannot prove rendered geometry — that is what
 * `scripts/verify-card-geometry.mjs` is for, and it needs a real browser. What
 * they do cover is the specific mistakes that produced, and then very nearly
 * re-produced, the "overlapping events render no name" defect:
 *
 *   1. two competing `container-type` declarations, so height queries silently
 *      never matched anything;
 *   2. hiding the clock rail without collapsing the grid, so the remaining child
 *      inherited the rail's narrow track and the wide track sat empty;
 *   3. width-driven rules written at a lower specificity than the mode rules
 *      they are meant to override.
 */

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

/** The full text of an at-rule block, located by matching its braces. */
function atRuleBlock(source, header) {
  const start = source.indexOf(header);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return "";
}

test("the event card declares exactly one container-type", () => {
  const declarations = css.match(/container-type\s*:/g) ?? [];
  assert.equal(declarations.length, 1, "a second container-type silently overrides the first");
  assert.match(css, /container-type:\s*size;/, "height queries need size, not inline-size");
  assert.match(css, /container-name:\s*eventcard;/);
});

test("removing the clock rail also collapses the card grid to one column", () => {
  const block = atRuleBlock(css, "@container eventcard (max-width: 170px)");
  assert.ok(block, "the narrow-card container block must exist");
  assert.match(block, /grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    "without this the remaining grid child takes over the rail's narrow track");
  assert.match(block, /\.event-time-rail\s*\{\s*display:\s*none;\s*\}/);
});

test("the clock rail can never occupy the whole card", () => {
  assert.match(css, /grid-template-columns:\s*min\(var\(--event-time-rail[^)]*\),\s*42%\)\s*minmax\(0,\s*1fr\)/,
    "the rail must be capped as a share of the card width");
});

test("width-driven rules outrank the mode rules they override", () => {
  // The mode rules reach (0,4,0), e.g.
  // .event--no-roster.event--standard:not(.event--narrow) .event-content
  // so the width-driven rules must match that and sit later in the file.
  const containerStart = css.indexOf("@container eventcard (max-width: 250px)");
  assert.ok(containerStart > 0, "the width-driven block must exist");
  assert.ok(containerStart > css.lastIndexOf(".event--no-roster.event--standard"),
    "the width-driven block must come after the mode rules it overrides");
  for (const selector of [
    ".calendar-event .event-core .event-roster",
    ".calendar-event .event-core .event-main .event-content",
    ".calendar-event .event-core .event-content strong",
  ]) {
    assert.ok(css.includes(selector), `expected ${selector} so the override is specific enough`);
  }
});

test("no !important was needed to win the cascade", () => {
  // Anchored to the width-tier block specifically (not a bare "@container
  // eventcard" match): other, unrelated container queries can legitimately
  // sit earlier in the file, and a bare match would sweep in CSS that has
  // nothing to do with this cascade -- e.g. the sitewide prefers-reduced-motion
  // override, which legitimately needs !important.
  const containerRules = css.slice(css.indexOf("@container eventcard (max-width: 250px)"));
  assert.doesNotMatch(containerRules, /!important/,
    "the override should win on specificity and order, not by force");
});

test("the name is never dropped in favour of the roster or the note", () => {
  const block = atRuleBlock(css, "@container eventcard (max-width: 250px)");
  assert.match(block, /\.event-roster\s*\{\s*display:\s*none;\s*\}/);
  assert.match(block, /\.event-note\s*\{\s*display:\s*none;\s*\}/);
  const containerRules = css.slice(css.indexOf("@container eventcard (max-width: 250px)"));
  assert.doesNotMatch(containerRules, /\.event-content strong\s*\{[^}]*display:\s*none/,
    "the name must survive every density step");
});

test("a card that is both short and narrow may wrap rather than truncate", () => {
  const block = atRuleBlock(css, "@container eventcard (max-width: 110px) and (max-height: 40px)");
  assert.ok(block, "four lanes on a 320px phone hit this case");
  assert.match(block, /white-space:\s*normal;/, "neither axis alone has room, so allow two small lines");
});

test("the week grid signals that it continues past the viewport", () => {
  assert.match(css, /\.calendar-scroll\.view-week\s*\{[\s\S]{0,240}mask-image:\s*linear-gradient\(90deg/,
    "a hard clip mid-title reads as breakage rather than as scrollable content");
});

test("the start clock keeps one home at every duration", () => {
  // It used to sit at top: 7px above 60 minutes but was centred below it, via
  // `position: static` inside a centring grid — the same field in three places.
  assert.doesNotMatch(css, /\.event--single-clock[^{]*\.event-rail-start\s*\{[^}]*position:\s*static/,
    "a short card must not relocate the start clock");
  assert.doesNotMatch(css, /\.event--micro \.event-rail-start\s*\{[^}]*position:\s*static/);
  assert.doesNotMatch(css, /\.event--compact \.event-rail-start\s*\{[^}]*position:\s*static/);
  assert.match(css, /\.event-rail-start\s*\{\s*top:\s*7px;\s*\}/,
    "one home, expressed as a single top offset");
  // Short cards may shift that home enough to fit, but not move it elsewhere.
  const shortCard = atRuleBlock(css, "@container eventcard (max-height: 46px)");
  assert.match(shortCard, /\.event-rail-start\s*\{\s*top:\s*3px;\s*\}/);
});
