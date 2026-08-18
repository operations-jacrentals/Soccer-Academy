type TimedCalendarItem = {
  day: number;
  start: number;
  end?: number;
};

export type CalendarDisplayRange = {
  start: number;
  end: number;
};

/**
 * The visible canvas is deliberately a little larger than the schedule itself.
 * It always keeps a complete empty hour before the first event's hour and after
 * the last event's hour, while the underlying calendar boundaries stay intact.
 */
export function calendarDisplayRange(
  events: TimedCalendarItem[],
  dayCount: number,
  minimum = 4 * 60,
  maximum = 22 * 60,
  fallback = 9 * 60,
): CalendarDisplayRange {
  const visibleEvents = events.filter((event) => event.day >= 0 && event.day < dayCount);
  const earliest = visibleEvents.length ? Math.min(...visibleEvents.map((event) => event.start)) : fallback;
  const latest = visibleEvents.length
    ? Math.max(...visibleEvents.map((event) => event.end ?? event.start))
    : fallback;

  return {
    start: Math.max(minimum, Math.floor(earliest / 60) * 60 - 60),
    end: Math.min(maximum, Math.ceil(latest / 60) * 60 + 60),
  };
}
