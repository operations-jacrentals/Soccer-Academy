import assert from "node:assert/strict";
import test from "node:test";

import {
  localDateValue,
  startOfWeek,
  todayColumn,
  weekDates,
  weekRangeLabel,
  weekRangeLabelCompact,
} from "../app/calendar-week.ts";

test("the week always starts on Monday, whichever day you open it", () => {
  // Mon 17 Aug 2026 through Sun 23 Aug 2026 all belong to the same week.
  for (const day of [17, 18, 19, 20, 21, 22, 23]) {
    assert.equal(localDateValue(startOfWeek(new Date(2026, 7, day, 13, 30))), "2026-08-17");
  }
  // The Sunday before belongs to the previous week, not the next one.
  assert.equal(localDateValue(startOfWeek(new Date(2026, 7, 16))), "2026-08-10");
});

test("today is found in the current week and never in a stale one", () => {
  const now = new Date(2026, 7, 19, 9, 0); // Wednesday
  const dates = weekDates(now);
  assert.equal(todayColumn(dates, now), 2);
  assert.deepEqual(dates.map((d) => d.value), [
    "2026-08-17", "2026-08-18", "2026-08-19",
    "2026-08-20", "2026-08-21", "2026-08-22",
  ]);
  // A date from a different week must not claim a column.
  assert.equal(todayColumn(weekDates(new Date(2026, 7, 10)), now), -1);
});

test("the range label follows the visible day count", () => {
  const dates = weekDates(new Date(2026, 7, 19));
  assert.equal(weekRangeLabel(dates, 5), "August 17–21, 2026");
  assert.equal(weekRangeLabel(dates, 6), "August 17–22, 2026");
  assert.equal(weekRangeLabelCompact(dates, 5), "AUG 17–21");
});

test("a week that crosses a month or a year names both", () => {
  const acrossMonths = weekDates(new Date(2026, 7, 31)); // Mon 31 Aug 2026
  assert.equal(weekRangeLabel(acrossMonths, 5), "August 31 – September 4, 2026");
  assert.equal(weekRangeLabelCompact(acrossMonths, 5), "AUG 31 – SEP 4");

  const acrossYears = weekDates(new Date(2026, 11, 30)); // Mon 28 Dec 2026
  assert.equal(weekRangeLabel(acrossYears, 5), "December 28, 2026 – January 1, 2027");
});

test("dates survive a daylight-saving boundary without slipping a day", () => {
  // US DST ends Sun 1 Nov 2026; the following week must still read Mon-Sat.
  const dates = weekDates(new Date(2026, 10, 4, 12, 0));
  assert.deepEqual(dates.map((d) => d.value), [
    "2026-11-02", "2026-11-03", "2026-11-04",
    "2026-11-05", "2026-11-06", "2026-11-07",
  ]);
});
