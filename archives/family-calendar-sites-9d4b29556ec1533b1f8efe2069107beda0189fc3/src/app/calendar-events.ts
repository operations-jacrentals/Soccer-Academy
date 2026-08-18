export type EventKind = "routine" | "fixed" | "flexible";

export type CalendarEvent = {
  id: string;
  title: string;
  day: number;
  start: number;
  end: number;
  color: string;
  bullets: string[];
  people: string[];
  town: boolean;
  kind: EventKind;
  tentativeEnd?: boolean;
  tag?: string;
  syncNotes?: boolean;
  driveBefore?: number;
  driveAfter?: number;
};

export const CALENDAR_START_MINUTES = 4 * 60;
export const CALENDAR_END_MINUTES = 22 * 60;
export const CALENDAR_SNAP_MINUTES = 15;
export const CALENDAR_DAY_COUNT = 6;

export function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<CalendarEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    Number.isInteger(event.day) &&
    (event.day as number) >= 0 &&
    (event.day as number) < CALENDAR_DAY_COUNT &&
    typeof event.start === "number" &&
    Number.isFinite(event.start) &&
    event.start >= CALENDAR_START_MINUTES &&
    typeof event.end === "number" &&
    Number.isFinite(event.end) &&
    event.end <= CALENDAR_END_MINUTES &&
    event.end > event.start &&
    typeof event.color === "string" &&
    Array.isArray(event.bullets) &&
    event.bullets.every((item) => typeof item === "string") &&
    Array.isArray(event.people) &&
    event.people.every((item) => typeof item === "string") &&
    typeof event.town === "boolean" &&
    (event.kind === "routine" || event.kind === "fixed" || event.kind === "flexible") &&
    (event.tentativeEnd === undefined || typeof event.tentativeEnd === "boolean") &&
    (event.tag === undefined || typeof event.tag === "string") &&
    (event.syncNotes === undefined || typeof event.syncNotes === "boolean") &&
    (event.driveBefore === undefined || (typeof event.driveBefore === "number" && Number.isFinite(event.driveBefore) && event.driveBefore >= 0)) &&
    (event.driveAfter === undefined || (typeof event.driveAfter === "number" && Number.isFinite(event.driveAfter) && event.driveAfter >= 0)) &&
    (event.end - event.start - (event.driveBefore ?? 0) - (event.driveAfter ?? 0) >= CALENDAR_SNAP_MINUTES)
  );
}

export function normalizeTag(value = "") {
  const body = value.trim().replace(/^#+/, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return body ? `#${body}` : "";
}

export function driveBefore(event: Pick<CalendarEvent, "driveBefore">) {
  return Math.max(0, event.driveBefore ?? 0);
}

export function driveAfter(event: Pick<CalendarEvent, "driveAfter">) {
  return Math.max(0, event.driveAfter ?? 0);
}

export function activityStart(event: Pick<CalendarEvent, "start" | "driveBefore">) {
  return event.start + driveBefore(event);
}

export function activityEnd(event: Pick<CalendarEvent, "end" | "driveAfter">) {
  return event.end - driveAfter(event);
}

export function activityMinutes(event: Pick<CalendarEvent, "start" | "end" | "driveBefore" | "driveAfter">) {
  return Math.max(0, activityEnd(event) - activityStart(event));
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function taggedItems(allEvents: CalendarEvent[], event: CalendarEvent) {
  const tag = normalizeTag(event.tag);
  return tag ? allEvents.filter((item) => normalizeTag(item.tag) === tag) : [event];
}

export function tagScope(allEvents: CalendarEvent[], event: CalendarEvent) {
  const tag = normalizeTag(event.tag);
  const count = taggedItems(allEvents, event).length;
  return { tag, count };
}

export function taggedChangeError(allEvents: CalendarEvent[], origin: CalendarEvent, updated: CalendarEvent) {
  const dayDelta = updated.day - origin.day;
  const startDelta = updated.start - origin.start;
  const endDelta = updated.end - origin.end;
  const beforeDelta = driveBefore(updated) - driveBefore(origin);
  const afterDelta = driveAfter(updated) - driveAfter(origin);
  const scope = tagScope(allEvents, origin);
  const prefix = scope.count > 1 ? `all ${scope.count} ${scope.tag} items` : origin.title;

  for (const item of taggedItems(allEvents, origin)) {
    const day = item.day + dayDelta;
    const start = item.start + startDelta;
    const end = item.end + endDelta;
    const before = driveBefore(item) + beforeDelta;
    const after = driveAfter(item) + afterDelta;
    if (day < 0 || day >= CALENDAR_DAY_COUNT) return `Could not update ${prefix}; one item is at the edge of the week.`;
    if (start < CALENDAR_START_MINUTES || end > CALENDAR_END_MINUTES) return `Could not update ${prefix}; one item is at the calendar boundary.`;
    if (before < 0 || after < 0 || end - start - before - after < CALENDAR_SNAP_MINUTES) {
      return `Could not update ${prefix}; every event needs at least 15 minutes of activity.`;
    }
  }
  return "";
}

export function applyTaggedChange(allEvents: CalendarEvent[], origin: CalendarEvent, updated: CalendarEvent) {
  const tag = normalizeTag(origin.tag);
  const startDelta = updated.start - origin.start;
  const endDelta = updated.end - origin.end;
  const dayDelta = updated.day - origin.day;
  const beforeDelta = driveBefore(updated) - driveBefore(origin);
  const afterDelta = driveAfter(updated) - driveAfter(origin);

  return allEvents.map((item) => {
    if (item.id === origin.id) return { ...updated, bullets: [...updated.bullets], people: [...updated.people] };
    if (!tag || normalizeTag(item.tag) !== tag) return item;

    const next = { ...item };
    if (updated.title !== origin.title) next.title = updated.title;
    if (updated.color !== origin.color) next.color = updated.color;
    if (!sameValue(updated.people, origin.people)) next.people = [...updated.people];
    if (updated.town !== origin.town) next.town = updated.town;
    if (updated.kind !== origin.kind) next.kind = updated.kind;
    if (updated.tentativeEnd !== origin.tentativeEnd) next.tentativeEnd = updated.tentativeEnd;
    if (updated.syncNotes !== origin.syncNotes) next.syncNotes = Boolean(updated.syncNotes);
    if (updated.syncNotes && (updated.syncNotes !== origin.syncNotes || !sameValue(updated.bullets, origin.bullets))) {
      next.bullets = [...updated.bullets];
    }
    next.day = item.day + dayDelta;
    next.start = item.start + startDelta;
    next.end = item.end + endDelta;
    next.driveBefore = driveBefore(item) + beforeDelta;
    next.driveAfter = driveAfter(item) + afterDelta;
    return next;
  });
}

export function removeTaggedEvents(allEvents: CalendarEvent[], origin: CalendarEvent, deleteAll: boolean) {
  const tag = normalizeTag(origin.tag);
  if (!deleteAll || !tag) return allEvents.filter((event) => event.id !== origin.id);
  return allEvents.filter((event) => normalizeTag(event.tag) !== tag);
}
