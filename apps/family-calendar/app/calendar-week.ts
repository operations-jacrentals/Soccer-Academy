/**
 * Dates for the week on display.
 *
 * The plan itself repeats every week and events are keyed by weekday index, so
 * the dates are derived from the viewer's clock rather than stored. That keeps
 * the header and the Today marker correct without a stored week, and without a
 * date that can quietly go stale.
 */

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type WeekDate = {
  short: string;
  value: string;
  day: number;
  month: number;
  year: number;
};

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** The local calendar date of `reference`, as `YYYY-MM-DD`. */
export function localDateValue(reference: Date) {
  return `${reference.getFullYear()}-${pad2(reference.getMonth() + 1)}-${pad2(reference.getDate())}`;
}

/** Midnight on the Monday of the week containing `reference`, in local time. */
export function startOfWeek(reference: Date) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** Monday through Saturday of the week containing `reference`. */
export function weekDates(reference: Date): WeekDate[] {
  const monday = startOfWeek(reference);
  return WEEK_DAYS.map((_, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    return {
      short: `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`,
      value: localDateValue(date),
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });
}

/** Which visible column is today, or -1 when today is outside the shown days. */
export function todayColumn(dates: WeekDate[], reference: Date) {
  return dates.findIndex((date) => date.value === localDateValue(reference));
}

function edges(dates: WeekDate[], dayCount: number) {
  const first = dates[0];
  const last = dates[Math.max(0, Math.min(dayCount, dates.length) - 1)];
  return first && last ? { first, last } : null;
}

/** "August 10–14, 2026", or "August 31 – September 4, 2026" across a month edge. */
export function weekRangeLabel(dates: WeekDate[], dayCount: number) {
  const range = edges(dates, dayCount);
  if (!range) return "";
  const { first, last } = range;
  if (first.month === last.month && first.year === last.year) {
    return `${MONTH_LONG[first.month]} ${first.day}–${last.day}, ${last.year}`;
  }
  if (first.year !== last.year) {
    return `${MONTH_LONG[first.month]} ${first.day}, ${first.year} – ${MONTH_LONG[last.month]} ${last.day}, ${last.year}`;
  }
  return `${MONTH_LONG[first.month]} ${first.day} – ${MONTH_LONG[last.month]} ${last.day}, ${last.year}`;
}

export function weekRangeLabelCompact(dates: WeekDate[], dayCount: number) {
  const range = edges(dates, dayCount);
  if (!range) return "";
  const { first, last } = range;
  if (first.month === last.month) return `${MONTH_SHORT[first.month]} ${first.day}–${last.day}`;
  return `${MONTH_SHORT[first.month]} ${first.day} – ${MONTH_SHORT[last.month]} ${last.day}`;
}
