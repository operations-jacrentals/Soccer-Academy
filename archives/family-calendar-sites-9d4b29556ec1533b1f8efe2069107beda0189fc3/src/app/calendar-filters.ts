export type SummaryFilter = "class" | "soccer" | "drive";

type FilterableCalendarEvent = {
  title: string;
  day?: number;
  start?: number;
  driveBefore?: number;
  driveAfter?: number;
};

export function matchesSummaryFilter(event: FilterableCalendarEvent, filter: SummaryFilter) {
  if (filter === "class") return /\bclass\b/i.test(event.title);
  if (filter === "soccer") return /\bsoccer\b/i.test(event.title);
  return Math.max(0, event.driveBefore ?? 0) + Math.max(0, event.driveAfter ?? 0) > 0;
}

export function toggleSummaryFilter(current: SummaryFilter | null, requested: SummaryFilter) {
  return current === requested ? null : requested;
}

export function firstSummaryFilterMatch<T extends FilterableCalendarEvent>(
  events: T[],
  filter: SummaryFilter,
  dayCount: number,
  preferredDay?: number,
) {
  const matches = events.filter((event) =>
    typeof event.day === "number" &&
    event.day >= 0 &&
    event.day < dayCount &&
    typeof event.start === "number" &&
    matchesSummaryFilter(event, filter),
  );
  const candidates = typeof preferredDay === "number" ? matches.filter((event) => event.day === preferredDay) : matches;
  return [...candidates].sort((left, right) => (left.start ?? 0) - (right.start ?? 0) || (left.day ?? 0) - (right.day ?? 0))[0] ?? null;
}
