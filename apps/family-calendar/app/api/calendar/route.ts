import { EVENT_FIELDS, isCalendarEvent, type CalendarEvent, type EventField } from "../../calendar-events";
import {
  CalendarAccessError,
  resolveCalendarAccess,
  type CalendarAccessEnv,
} from "../../calendar-access";
import { workerEnv } from "../../worker-env";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/** Fields a field-level update is allowed to change. `id` is the key, never a value. */
const UPDATABLE_FIELDS: readonly string[] = EVENT_FIELDS;

type UpdatableField = EventField;

/** The slice of the D1 API this route uses, so it needs no ambient worker types. */
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
};

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

/**
 * A change to one existing event, expressed as only the fields that changed.
 * Two people editing different fields of the same event therefore merge
 * instead of overwriting each other.
 */
type CalendarFieldUpdate = {
  id: string;
  fields: Partial<Record<UpdatableField, unknown>>;
};

type CalendarPatch = {
  upserts: CalendarEvent[];
  removeIds: string[];
  /** Optional so clients deployed before this shipped keep working. */
  updates?: CalendarFieldUpdate[];
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

function validUpdates(value: unknown): value is CalendarFieldUpdate[] {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const update = entry as Partial<CalendarFieldUpdate>;
    if (typeof update.id !== "string") return false;
    if (!update.fields || typeof update.fields !== "object" || Array.isArray(update.fields)) return false;
    const keys = Object.keys(update.fields);
    return keys.length > 0 && keys.every((key) => UPDATABLE_FIELDS.includes(key));
  });
}

function parseDocument(value: string): CalendarEvent[] {
  const events = JSON.parse(value) as unknown;
  if (!validEvents(events)) throw new Error("The shared calendar contains invalid event data.");
  return events.map(cloneEvent);
}

function blankCalendar(): SharedCalendar {
  return { events: [], revision: 0, initialized: false, updatedAt: null };
}

type CalendarEnv = CalendarAccessEnv & { DB?: { prepare(query: string): D1Statement } };

function database() {
  const { DB } = workerEnv<CalendarEnv>();
  if (!DB) throw new Error("Shared calendar storage is unavailable.");
  return DB;
}

async function readCalendar(calendarId: string): Promise<SharedCalendar> {
  const db = database();
  const row = await db.prepare(
    "SELECT document, revision, initialized, updated_at AS updatedAt FROM calendar_state WHERE id = ?",
  ).bind(calendarId).first<CalendarRow>();

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

/**
 * Merge one update's fields onto an existing event. The merged result must
 * still be a valid event; an update that would corrupt it is dropped rather
 * than written, so a stale or malformed client cannot poison the document.
 */
function mergeFields(event: CalendarEvent, fields: CalendarFieldUpdate["fields"]): CalendarEvent {
  const merged = { ...cloneEvent(event), ...fields } as CalendarEvent;
  return isCalendarEvent(merged) ? merged : event;
}

function applyPatch(current: CalendarEvent[], patch: CalendarPatch): CalendarEvent[] {
  const removals = new Set(patch.removeIds);
  const upserts = new Map(patch.upserts.map((event) => [event.id, cloneEvent(event)]));
  const updates = new Map((patch.updates ?? []).map((update) => [update.id, update.fields]));
  const existingIds = new Set(current.map((event) => event.id));

  const next = current
    .filter((event) => !removals.has(event.id))
    .map((event) => {
      const replacement = upserts.get(event.id) ?? event;
      const fields = updates.get(event.id);
      return fields ? mergeFields(replacement, fields) : replacement;
    });

  for (const event of patch.upserts) {
    if (!existingIds.has(event.id) && !removals.has(event.id)) next.push(cloneEvent(event));
  }

  // Updates naming an event that no longer exists are ignored on purpose:
  // the event was deleted by someone else, and reviving it would be worse
  // than losing the edit.
  return next;
}

function sameCalendar(left: CalendarEvent[], right: CalendarEvent[]) {
  return left.length === right.length && left.every((event, index) => sameEvent(event, right[index]));
}

function validPatch(value: unknown): value is CalendarPatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as Partial<CalendarPatch>;
  if (!validEvents(patch.upserts) || !Array.isArray(patch.removeIds) || !patch.removeIds.every((id) => typeof id === "string")) return false;
  if (!validUpdates(patch.updates)) return false;
  const removals = new Set(patch.removeIds);
  if (removals.size !== patch.removeIds.length) return false;
  if (patch.upserts.some((event) => removals.has(event.id))) return false;
  return !(patch.updates ?? []).some((update) => removals.has(update.id));
}

async function bootstrapCalendar(calendarId: string, events: CalendarEvent[]): Promise<SharedCalendar> {
  const existing = await readCalendar(calendarId);
  if (existing.initialized) return existing;

  const now = new Date().toISOString();
  const db = database();
  await db.prepare(
    "INSERT INTO calendar_state (id, document, revision, initialized, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
  ).bind(calendarId, JSON.stringify(events), 1, 1, now).run();
  return readCalendar(calendarId);
}

async function replaceCalendar(calendarId: string, events: CalendarEvent[]): Promise<SharedCalendar> {
  let current = await readCalendar(calendarId);
  if (!current.initialized) return bootstrapCalendar(calendarId, events);
  const db = database();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const now = new Date().toISOString();
    const result = await db.prepare(
      "UPDATE calendar_state SET document = ?, revision = ?, initialized = ?, updated_at = ? WHERE id = ? AND revision = ? AND initialized = 1",
    ).bind(JSON.stringify(events), current.revision + 1, 1, now, calendarId, current.revision).run();
    if (result.meta.changes === 1) {
      return { events: events.map(cloneEvent), revision: current.revision + 1, initialized: true, updatedAt: now };
    }

    current = await readCalendar(calendarId);
    if (!current.initialized) return bootstrapCalendar(calendarId, events);
  }

  throw new Error("The calendar changed while it was being restored. Please try again.");
}

async function savePatch(calendarId: string, patch: CalendarPatch): Promise<SharedCalendar> {
  let current = await readCalendar(calendarId);
  if (!current.initialized) throw new Error("The shared calendar has not been initialized yet.");
  const db = database();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = applyPatch(current.events, patch);
    if (sameCalendar(current.events, next)) return current;
    const now = new Date().toISOString();
    const result = await db.prepare(
      "UPDATE calendar_state SET document = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ? AND initialized = 1",
    ).bind(JSON.stringify(next), current.revision + 1, now, calendarId, current.revision).run();
    if (result.meta.changes === 1) {
      return { events: next, revision: current.revision + 1, initialized: true, updatedAt: now };
    }
    current = await readCalendar(calendarId);
    if (!current.initialized) throw new Error("The shared calendar has not been initialized yet.");
  }

  throw new Error("The calendar changed while it was being saved. Please try again.");
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "The shared calendar could not be reached.";
  if (message.includes("no such table")) {
    return "Shared calendar storage is still being set up. Run `npm run db:migrate` and try again.";
  }
  return message;
}

/** Identify the caller and pick their calendar row, or throw 401/403. */
function authorize(request: Request) {
  return resolveCalendarAccess(request.headers, workerEnv<CalendarEnv>());
}

export async function GET(request: Request) {
  try {
    const { calendarId } = authorize(request);
    return json(await readCalendar(calendarId));
  } catch (error) {
    if (error instanceof CalendarAccessError) return json({ error: error.message }, error.status);
    return json({ error: routeError(error) }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { calendarId } = authorize(request);
    const payload = await request.json() as { type?: unknown; events?: unknown; patch?: unknown };

    if (payload.type === "bootstrap") {
      if (!validEvents(payload.events)) return json({ error: "The calendar events are invalid." }, 400);
      const calendar = await bootstrapCalendar(calendarId, payload.events);
      return json(calendar, calendar.revision === 1 ? 201 : 200);
    }

    if (payload.type === "patch") {
      if (!validPatch(payload.patch)) return json({ error: "The calendar change is invalid." }, 400);
      return json(await savePatch(calendarId, payload.patch));
    }

    if (payload.type === "replace") {
      if (!validEvents(payload.events)) return json({ error: "The calendar events are invalid." }, 400);
      return json(await replaceCalendar(calendarId, payload.events));
    }

    return json({ error: "The calendar request is invalid." }, 400);
  } catch (error) {
    if (error instanceof CalendarAccessError) return json({ error: error.message }, error.status);
    return json({ error: routeError(error) }, 500);
  }
}
