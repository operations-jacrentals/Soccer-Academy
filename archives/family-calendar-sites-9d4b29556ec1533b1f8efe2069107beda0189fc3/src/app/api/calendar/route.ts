import { isCalendarEvent, type CalendarEvent } from "../../calendar-events";

export const dynamic = "force-dynamic";

const CALENDAR_ID = "family";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type CalendarRow = {
  document: string;
  revision: number;
  initialized: number;
  updatedAt: string;
};

type SharedCalendar = {
  events: CalendarEvent[];
  revision: number;
  initialized: boolean;
  updatedAt: string | null;
};

type CalendarPatch = {
  upserts: CalendarEvent[];
  removeIds: string[];
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function cloneEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    bullets: [...event.bullets],
    people: [...event.people],
  };
}

function validEvents(value: unknown): value is CalendarEvent[] {
  return Array.isArray(value) &&
    value.every(isCalendarEvent) &&
    new Set(value.map((event) => event.id)).size === value.length;
}

function parseDocument(value: string): CalendarEvent[] {
  const events = JSON.parse(value) as unknown;
  if (!validEvents(events)) throw new Error("The shared calendar contains invalid event data.");
  return events.map(cloneEvent);
}

function blankCalendar(): SharedCalendar {
  return { events: [], revision: 0, initialized: false, updatedAt: null };
}

async function database() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Shared calendar storage is unavailable.");
  return env.DB;
}

async function readCalendar(): Promise<SharedCalendar> {
  const db = await database();
  const row = await db.prepare(
    "SELECT document, revision, initialized, updated_at AS updatedAt FROM calendar_state WHERE id = ?",
  ).bind(CALENDAR_ID).first<CalendarRow>();

  if (!row) return blankCalendar();
  if (!row.initialized) {
    return { events: [], revision: row.revision, initialized: false, updatedAt: row.updatedAt };
  }

  return {
    events: parseDocument(row.document),
    revision: row.revision,
    initialized: true,
    updatedAt: row.updatedAt,
  };
}

function sameEvent(left: CalendarEvent, right: CalendarEvent) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyPatch(current: CalendarEvent[], patch: CalendarPatch): CalendarEvent[] {
  const removals = new Set(patch.removeIds);
  const upserts = new Map(patch.upserts.map((event) => [event.id, cloneEvent(event)]));
  const existingIds = new Set(current.map((event) => event.id));
  const next = current
    .filter((event) => !removals.has(event.id))
    .map((event) => upserts.get(event.id) ?? event);

  for (const event of patch.upserts) {
    if (!existingIds.has(event.id) && !removals.has(event.id)) next.push(cloneEvent(event));
  }

  return next;
}

function sameCalendar(left: CalendarEvent[], right: CalendarEvent[]) {
  return left.length === right.length && left.every((event, index) => sameEvent(event, right[index]));
}

function validPatch(value: unknown): value is CalendarPatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as Partial<CalendarPatch>;
  if (!validEvents(patch.upserts) || !Array.isArray(patch.removeIds) || !patch.removeIds.every((id) => typeof id === "string")) return false;
  const removals = new Set(patch.removeIds);
  return removals.size === patch.removeIds.length && !patch.upserts.some((event) => removals.has(event.id));
}

async function bootstrapCalendar(events: CalendarEvent[]): Promise<SharedCalendar> {
  const existing = await readCalendar();
  if (existing.initialized) return existing;

  const now = new Date().toISOString();
  const db = await database();
  await db.prepare(
    "INSERT INTO calendar_state (id, document, revision, initialized, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
  ).bind(CALENDAR_ID, JSON.stringify(events), 1, 1, now).run();
  return readCalendar();
}

async function replaceCalendar(events: CalendarEvent[]): Promise<SharedCalendar> {
  let current = await readCalendar();
  if (!current.initialized) return bootstrapCalendar(events);
  const db = await database();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const now = new Date().toISOString();
    const result = await db.prepare(
      "UPDATE calendar_state SET document = ?, revision = ?, initialized = ?, updated_at = ? WHERE id = ? AND revision = ? AND initialized = 1",
    ).bind(JSON.stringify(events), current.revision + 1, 1, now, CALENDAR_ID, current.revision).run();
    if (result.meta.changes === 1) {
      return { events: events.map(cloneEvent), revision: current.revision + 1, initialized: true, updatedAt: now };
    }

    current = await readCalendar();
    if (!current.initialized) return bootstrapCalendar(events);
  }

  throw new Error("The calendar changed while it was being restored. Please try again.");
}

async function savePatch(patch: CalendarPatch): Promise<SharedCalendar> {
  let current = await readCalendar();
  if (!current.initialized) throw new Error("The shared calendar has not been initialized yet.");
  const db = await database();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = applyPatch(current.events, patch);
    if (sameCalendar(current.events, next)) return current;
    const now = new Date().toISOString();
    const result = await db.prepare(
      "UPDATE calendar_state SET document = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ? AND initialized = 1",
    ).bind(JSON.stringify(next), current.revision + 1, now, CALENDAR_ID, current.revision).run();
    if (result.meta.changes === 1) {
      return { events: next, revision: current.revision + 1, initialized: true, updatedAt: now };
    }
    current = await readCalendar();
    if (!current.initialized) throw new Error("The shared calendar has not been initialized yet.");
  }

  throw new Error("The calendar changed while it was being saved. Please try again.");
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "The shared calendar could not be reached.";
  if (message.includes("no such table")) {
    return "Shared calendar storage is still being set up. Refresh in a moment and try again.";
  }
  return message;
}

export async function GET() {
  try {
    return json(await readCalendar());
  } catch (error) {
    return json({ error: routeError(error) }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { type?: unknown; events?: unknown; patch?: unknown };

    if (payload.type === "bootstrap") {
      if (!validEvents(payload.events)) return json({ error: "The calendar events are invalid." }, 400);
      const calendar = await bootstrapCalendar(payload.events);
      return json(calendar, calendar.revision === 1 ? 201 : 200);
    }

    if (payload.type === "patch") {
      if (!validPatch(payload.patch)) return json({ error: "The calendar change is invalid." }, 400);
      return json(await savePatch(payload.patch));
    }

    if (payload.type === "replace") {
      if (!validEvents(payload.events)) return json({ error: "The calendar events are invalid." }, 400);
      return json(await replaceCalendar(payload.events));
    }

    return json({ error: "The calendar request is invalid." }, 400);
  } catch (error) {
    return json({ error: routeError(error) }, 500);
  }
}
