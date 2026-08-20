"use client";

import {
  Fragment,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { calendarDisplayRange } from "./calendar-display";
import { firstSummaryFilterMatch, matchesSummaryFilter, toggleSummaryFilter, type SummaryFilter } from "./calendar-filters";
import { formatClockTime, formatCompactClockTime } from "./calendar-time";
import {
  activityEnd,
  activityMinutes,
  activityStart,
  applyTaggedChange,
  CALENDAR_END_MINUTES,
  CALENDAR_SNAP_MINUTES,
  CALENDAR_START_MINUTES,
  driveAfter,
  driveBefore,
  EVENT_FIELDS,
  isCalendarEvent,
  normalizeTag,
  removeTaggedEvents,
  taggedChangeError,
  tagScope,
  type CalendarEvent,
  type EventField,
} from "./calendar-events";
import {
  todayColumn,
  weekDates,
  weekRangeLabel,
  weekRangeLabelCompact,
  WEEK_DAYS,
  type WeekDate,
} from "./calendar-week";

type LaidOutEvent = CalendarEvent & { lane: number; laneCount: number };

type Interaction = {
  pointerId: number;
  captureTarget: HTMLElement;
  mode: "move" | "resize-start" | "resize-end";
  origin: CalendarEvent;
  pointerX: number;
  pointerY: number;
  offsetMinutes: number;
  moved: boolean;
  extensionType: "event" | "drive";
  pointerType: string;
  // A desktop card press can still open the editor. A sustained touch hold
  // starts a move instead, so lifting a held card never turns into an edit.
  editorOnRelease: boolean;
};

type PendingDriveChoice = {
  origin: CalendarEvent;
  finalEvent: CalendarEvent;
  mode: "resize-start" | "resize-end";
};

type DeleteChoice = {
  event: CalendarEvent;
  matchingIds: string[];
};

type ViewMode = "week" | "day";

/**
 * Whether this device is reaching the shared calendar. "offline" and
 * "signed-out" both mean edits are only on this device, and both are shown.
 */
type SyncState = "connecting" | "synced" | "offline" | "signed-out";

type ResizeSurface = {
  kind: "keyboard";
  eventId: string;
  left: number;
  top: number;
};

type TouchPress = {
  eventId: string;
  pointerId: number;
  startX: number;
  startY: number;
  timer: number;
};

type TouchCardScroll = {
  pointerId: number;
  lastY: number;
};

type BlankSlotPress = {
  pointerId: number;
  day: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type QuickAddAnchor = {
  clientX: number;
  clientY: number;
};

type QuickAddPosition = {
  left: number;
  top: number;
};

type EventToolEdges = {
  start: boolean;
  end: boolean;
};

type HourPickerAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type HourPicker = {
  eventId: string;
  edge: "start" | "end";
  anchor: HourPickerAnchor;
};

type HourPickerPosition = {
  left: number;
  top: number;
};

type AddressPreview = {
  eventId: string;
  address: string;
  anchor: HourPickerAnchor;
};

type AddressPreviewPosition = {
  left: number;
  top: number;
};

type AutoScrollPointer = {
  clientX: number;
  clientY: number;
};

const ALL_DAYS = WEEK_DAYS;

// Friday is deliberately kept in the calendar even though it is a weekend-style
// family day. The homeschool routine itself only belongs on Monday–Thursday.
const DEFAULT_DAY_COUNT = 5;
const ROUTINE_DAY_COUNT = 4;
const WEEK_DAY_MIN_WIDTH = 240;
const START_MINUTES = CALENDAR_START_MINUTES;
const END_MINUTES = CALENDAR_END_MINUTES;
const DESKTOP_HOUR_HEIGHT = 88;
const TOUCH_HOUR_HEIGHT = 88;
const PHONE_HOUR_HEIGHT = 72;
const SNAP_MINUTES = CALENDAR_SNAP_MINUTES;
/** Must match `.calendar-event { min-height }` in globals.css. */
const EVENT_MIN_HEIGHT = 18;
const STORAGE_KEY = "family-weekly-calendar:v1";
const SETTINGS_KEY = "family-weekly-calendar:settings:v1";

type SharedCalendar = {
  events: CalendarEvent[];
  revision: number;
  initialized: boolean;
  updatedAt: string | null;
};

type CalendarFieldUpdate = {
  id: string;
  fields: Partial<Record<EventField, CalendarEvent[EventField]>>;
};

type CalendarPatch = {
  upserts: CalendarEvent[];
  removeIds: string[];
  updates: CalendarFieldUpdate[];
};

function cloneCalendarEvent(event: CalendarEvent): CalendarEvent {
  return { ...event, bullets: [...event.bullets], people: [...event.people] };
}

function sameCalendarEvent(left: CalendarEvent, right: CalendarEvent) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedFields(prior: CalendarEvent, next: CalendarEvent) {
  const fields: CalendarFieldUpdate["fields"] = {};
  for (const field of EVENT_FIELDS) {
    if (JSON.stringify(prior[field]) === JSON.stringify(next[field])) continue;
    const value = next[field];
    fields[field] = Array.isArray(value) ? ([...value] as CalendarEvent[EventField]) : value;
  }
  return fields;
}

/**
 * Describe a change as narrowly as it can be described: brand new events are
 * sent whole, existing events are sent as only the fields that moved. Two
 * people editing different fields of the same event then merge on the server
 * instead of overwriting each other.
 */
function calendarPatch(previous: CalendarEvent[], next: CalendarEvent[]): CalendarPatch {
  const previousById = new Map(previous.map((event) => [event.id, event]));
  const nextById = new Map(next.map((event) => [event.id, event]));
  const upserts: CalendarEvent[] = [];
  const updates: CalendarFieldUpdate[] = [];

  for (const event of next) {
    const prior = previousById.get(event.id);
    if (!prior) {
      upserts.push(cloneCalendarEvent(event));
      continue;
    }
    if (sameCalendarEvent(prior, event)) continue;
    const fields = changedFields(prior, event);
    if (Object.keys(fields).length > 0) updates.push({ id: event.id, fields });
  }

  const removeIds = previous.filter((event) => !nextById.has(event.id)).map((event) => event.id);
  return { upserts, removeIds, updates };
}

function isEmptyPatch(patch: CalendarPatch) {
  return patch.upserts.length === 0 && patch.removeIds.length === 0 && patch.updates.length === 0;
}

function isSharedCalendar(value: unknown): value is SharedCalendar {
  if (!value || typeof value !== "object") return false;
  const calendar = value as Partial<SharedCalendar>;
  return Array.isArray(calendar.events) &&
    calendar.events.every(isCalendarEvent) &&
    Number.isInteger(calendar.revision) &&
    (calendar.revision as number) >= 0 &&
    typeof calendar.initialized === "boolean" &&
    (calendar.updatedAt === null || typeof calendar.updatedAt === "string");
}

class SharedCalendarError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SharedCalendarError";
    this.status = status;
  }

  /** 401 and 403 will not resolve by retrying; every other failure might. */
  get needsSignIn() {
    return this.status === 401 || this.status === 403;
  }
}

async function sharedCalendarRequest(body?: { type: "bootstrap" | "replace"; events: CalendarEvent[] } | { type: "patch"; patch: CalendarPatch }) {
  const response = await fetch("/api/calendar", body
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        credentials: "same-origin",
      }
    : { cache: "no-store", credentials: "same-origin" });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? (payload as { error?: unknown }).error : null;
    throw new SharedCalendarError(
      typeof error === "string" ? error : "The shared calendar could not be reached.",
      response.status,
    );
  }
  if (!isSharedCalendar(payload)) throw new SharedCalendarError("The shared calendar sent an invalid response.", 502);
  return payload;
}

const COLORS = [
  { name: "Ocean", value: "#287a82" },
  { name: "Cobalt", value: "#3c6fb0" },
  { name: "Leaf", value: "#5f8462" },
  { name: "Gold", value: "#b77a2c" },
  { name: "Clay", value: "#b45d49" },
  { name: "Rose", value: "#ad5f78" },
  { name: "Plum", value: "#77558f" },
  { name: "Slate", value: "#566674" },
  { name: "Coral", value: "#d96c54" },
  { name: "Lime", value: "#83a943" },
  { name: "Sky", value: "#4495a8" },
  { name: "Indigo", value: "#4f5fa8" },
  { name: "Violet", value: "#8d63b6" },
  { name: "Berry", value: "#a74668" },
  { name: "Sand", value: "#a98b55" },
  { name: "Graphite", value: "#45535a" },
];

type EventArtwork = {
  src: string;
  position: string;
};

const EVENT_ARTWORK_RULES: ReadonlyArray<{ match: RegExp; artwork: EventArtwork }> = [
  { match: /\b(soccer|football|albion|gulf coast|wall ball)\b/i, artwork: { src: "/event-art/soccer.png", position: "center 56%" } },
  { match: /\b(scout|scouts|scouting)\b/i, artwork: { src: "/event-art/scouts.png", position: "center 54%" } },
  { match: /\b(dance|ballet|studio)\b/i, artwork: { src: "/event-art/dance.png", position: "center 52%" } },
  { match: /\b(church|chapel|mass|worship)\b/i, artwork: { src: "/event-art/church.png", position: "center 48%" } },
  { match: /\b(post[ -]office|(?:grocery|groceries|errand|town|library)[ -]run)\b/i, artwork: { src: "/event-art/street-corner.png", position: "center 56%" } },
  { match: /\b(work|office|job|shift|business)\b/i, artwork: { src: "/event-art/work.png", position: "center 50%" } },
  { match: /\b(park|playground|walk|hike|run|exercise|workout|training)\b/i, artwork: { src: "/event-art/park.png", position: "center 54%" } },
  { match: /\b(class|school|homeschool|lesson|study|tutor|tutoring|homework)\b/i, artwork: { src: "/event-art/school.png", position: "center 52%" } },
  { match: /\b(town|errands?|shopping|grocer(?:y|ies)|mall|pharmacy|library|doctors?|dentists?|appointments?|pick(?:up|[ -]up)|drop(?:off|[ -]off))\b/i, artwork: { src: "/event-art/street-corner.png", position: "center 56%" } },
  { match: /\b(home|house|chores?|cleaning|laundry|cooking|meal[ -]prep|breakfast|brunch|lunch|dinner|supper|snack|bedtime)\b/i, artwork: { src: "/event-art/house.png", position: "center 54%" } },
];

const HOUSE_ARTWORK: EventArtwork = { src: "/event-art/house.png", position: "center 54%" };
const TOWN_ARTWORK: EventArtwork = { src: "/event-art/street-corner.png", position: "center 56%" };

function eventArtwork(event: Pick<CalendarEvent, "title" | "tag" | "town">): EventArtwork {
  const searchableText = `${event.title} ${event.tag ?? ""}`;
  return EVENT_ARTWORK_RULES.find((rule) => rule.match.test(searchableText))?.artwork
    ?? (event.town ? TOWN_ARTWORK : HOUSE_ARTWORK);
}

function eventArtworkTokens(artwork: EventArtwork | null): CSSProperties {
  if (!artwork) return {};
  return {
    "--event-artwork": `url("${artwork.src}")`,
    "--event-art-position": artwork.position,
  } as CSSProperties;
}

const ROUTINE = {
  exercise: { title: "Morning exercise", start: 9 * 60, end: 9 * 60 + 30, color: "#5f8462", bullets: ["All three children"] },
  class1: { title: "Class 1", start: 9 * 60 + 30, end: 10 * 60 + 30, color: "#287a82", bullets: ["Taught by a parent"] },
  brunch: { title: "Brunch + break", start: 10 * 60 + 30, end: 11 * 60, color: "#b77a2c", bullets: ["Eat, reset, and breathe"] },
  class2: { title: "Class 2", start: 11 * 60, end: 12 * 60, color: "#287a82", bullets: ["Taught by a parent"] },
  soccer1: { title: "Soccer session 1", start: 12 * 60, end: 13 * 60, color: "#3c6fb0", bullets: ["Led by a parent"] },
  class3: { title: "Class 3", start: 13 * 60, end: 14 * 60, color: "#287a82", bullets: ["Taught by a parent"] },
  snack: { title: "Snack + reset", start: 14 * 60, end: 14 * 60 + 15, color: "#b77a2c", bullets: ["15-minute reset"] },
  soccer2: { title: "Soccer session 2", start: 14 * 60 + 15, end: 15 * 60 + 15, color: "#3c6fb0", bullets: ["Second daily session"] },
};

function createInitialEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  Object.entries(ROUTINE).forEach(([key, item]) => {
    for (let day = 0; day < ROUTINE_DAY_COUNT; day += 1) {
      events.push({
        id: `${key}-${day}`,
        title: item.title,
        day,
        start: item.start,
        end: item.end,
        color: item.color,
        bullets: item.bullets,
        people: ["Sam", "Alex", "Robin"],
        town: false,
        kind: "routine",
      });
    }
  });

  events.push(
    {
      id: "music-mon",
      title: "Music class",
      day: 0,
      start: 16 * 60 + 30,
      end: 17 * 60 + 30,
      color: "#77558f",
      bullets: ["All three children", "Placed with Monday's town run"],
      people: ["Sam", "Alex", "Robin"],
      town: true,
      kind: "flexible",
    },
    {
      id: "albion-mon",
      title: "Soccer club",
      day: 0,
      start: 18 * 60,
      end: 19 * 60 + 30,
      color: "#3c6fb0",
      bullets: ["Sam + Alex", "Soccer club"],
      people: ["Sam", "Alex"],
      town: true,
      kind: "fixed",
    },
    {
      id: "scouts-mon",
      title: "Scouts",
      day: 0,
      start: 18 * 60 + 30,
      end: 19 * 60 + 30,
      color: "#6e7745",
      bullets: ["Sam", "End time needs confirmation"],
      people: ["Sam"],
      town: true,
      kind: "fixed",
      tentativeEnd: true,
    },
    {
      id: "agility-tue",
      title: "Agility training",
      day: 1,
      start: 16 * 60 + 15,
      end: 17 * 60 + 15,
      color: "#b45d49",
      bullets: ["Sam + Alex", "Before the academy — same town trip"],
      people: ["Sam", "Alex"],
      town: true,
      kind: "flexible",
    },
    {
      id: "gulf-tue",
      title: "Soccer academy",
      day: 1,
      start: 17 * 60 + 30,
      end: 19 * 60,
      color: "#287a82",
      bullets: ["Sam + Alex", "Soccer academy"],
      people: ["Sam", "Alex"],
      town: true,
      kind: "fixed",
    },
    {
      id: "dance-wed",
      title: "Dance",
      day: 2,
      start: 16 * 60,
      end: 17 * 60 + 15,
      color: "#ad5f78",
      bullets: ["Robin"],
      people: ["Robin"],
      town: true,
      kind: "fixed",
    },
    {
      id: "albion-wed",
      title: "Soccer club",
      day: 2,
      start: 18 * 60,
      end: 19 * 60 + 30,
      color: "#3c6fb0",
      bullets: ["Sam + Alex", "Soccer club"],
      people: ["Sam", "Alex"],
      town: true,
      kind: "fixed",
    },
    {
      id: "agility-thu",
      title: "Agility training",
      day: 3,
      start: 16 * 60 + 15,
      end: 17 * 60 + 15,
      color: "#b45d49",
      bullets: ["Sam + Alex", "Before the academy — same town trip"],
      people: ["Sam", "Alex"],
      town: true,
      kind: "flexible",
    },
    {
      id: "gulf-thu",
      title: "Soccer academy",
      day: 3,
      start: 17 * 60 + 30,
      end: 19 * 60,
      color: "#287a82",
      bullets: ["Sam + Alex", "Soccer academy"],
      people: ["Sam", "Alex"],
      town: true,
      kind: "fixed",
    },
  );
  return events;
}

const INITIAL_EVENTS = createInitialEvents();
const INITIAL_DISPLAY_RANGE = calendarDisplayRange(INITIAL_EVENTS, DEFAULT_DAY_COUNT, START_MINUTES, END_MINUTES);

function EditorDisclosure({ label, summary, initialOpen, children }: { label: string; summary: string; initialOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details className="editor-disclosure" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><span>{label}</span><strong>{summary}</strong></summary>
      {children}
    </details>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function positionQuickAdd(anchor: QuickAddAnchor, width: number, height: number): QuickAddPosition {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
  const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
  const edge = 16;
  const gap = 12;
  const minLeft = viewportLeft + edge;
  const minTop = viewportTop + edge;
  const maxLeft = Math.max(minLeft, viewportRight - width - edge);
  const maxTop = Math.max(minTop, viewportBottom - height - edge);
  const roomBelow = viewportBottom - anchor.clientY - edge;
  const roomAbove = anchor.clientY - viewportTop - edge;
  const opensBelow = roomBelow >= height + gap || roomBelow >= roomAbove;
  const top = opensBelow ? anchor.clientY + gap : anchor.clientY - height - gap;

  return {
    left: clamp(anchor.clientX - width / 2, minLeft, maxLeft),
    top: clamp(top, minTop, maxTop),
  };
}

function snap(value: number) {
  return Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;
}

function formatTime(minutes: number) {
  return formatClockTime(minutes);
}

function shortTime(minutes: number) {
  return formatCompactClockTime(minutes);
}

function formatDuration(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/0$/, "")}h`;
}

function formatMinuteDuration(minutes: number) {
  if (!minutes) return "None";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} hr${hours === 1 ? "" : "s"}${remainder ? ` ${remainder} min` : ""}`;
}

function detectMapsPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function mapsEmbedUrl(address: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

// Each platform hands the address to whichever map app the family already
// uses there, rather than forcing everyone through one web page.
function mapsNavigationUrl(address: string) {
  const encoded = encodeURIComponent(address);
  const platform = detectMapsPlatform();
  if (platform === "ios") return `https://maps.apple.com/?address=${encoded}`;
  if (platform === "android") return `geo:0,0?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

function hasScheduleChange(origin: CalendarEvent, next: CalendarEvent) {
  return origin.day !== next.day
    || origin.start !== next.start
    || origin.end !== next.end
    || driveBefore(origin) !== driveBefore(next)
    || driveAfter(origin) !== driveAfter(next)
    || Boolean(origin.tentativeEnd) !== Boolean(next.tentativeEnd);
}

function eventColorTokens(color: string, before = 0, after = 0): CSSProperties {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) {
    return {
      "--event-color": color,
      "--event-dark": "#10181c",
      "--event-surface-high": "#c8d8d5",
      "--event-surface": "#9fb6b4",
      "--event-surface-low": "#829b9a",
      "--event-ink": "#071216",
      "--event-accent": "#f4f8f7",
      "--event-bright": "#f4f8f7",
      "--event-title-color": "#071216",
      "--event-time-color": "#f4f8f7",
      "--drive-before": `calc(var(--fc-hour-height) * ${before / 60})`,
      "--drive-after": `calc(var(--fc-hour-height) * ${after / 60})`,
    } as CSSProperties;
  }
  const red = Number.parseInt(match[1].slice(0, 2), 16);
  const green = Number.parseInt(match[1].slice(2, 4), 16);
  const blue = Number.parseInt(match[1].slice(4, 6), 16);
  const channels = [red, green, blue];
  const deepChannels = channels.map((channel) => Math.round(channel * 0.38));
  const dark = `rgb(${deepChannels.join(" ")})`;
  // WALL BALL's cards read as solid objects, not dark panels with a colored
  // wash. Lift every user-picked hue into a dependable bright surface, then
  // keep the clock hardware dark and the card copy near-black.
  const normalized = channels.map((channel) => channel / 255);
  const channelMax = Math.max(...normalized);
  const channelMin = Math.min(...normalized);
  const delta = channelMax - channelMin;
  const sourceLightness = (channelMax + channelMin) / 2;
  let hue = 0;
  if (delta > 0) {
    if (channelMax === normalized[0]) hue = ((normalized[1] - normalized[2]) / delta) % 6;
    else if (channelMax === normalized[1]) hue = (normalized[2] - normalized[0]) / delta + 2;
    else hue = (normalized[0] - normalized[1]) / delta + 4;
    hue = ((hue * 60) + 360) % 360;
  }
  const sourceSaturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * sourceLightness - 1));
  const surfaceSaturation = sourceSaturation < 0.08 ? sourceSaturation : Math.min(0.78, Math.max(0.48, sourceSaturation * 1.08));
  const surfaceLightness = Math.min(0.72, Math.max(0.58, sourceLightness + 0.08));
  const hslToRgb = (lightness: number) => {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * surfaceSaturation;
    const hueSection = hue / 60;
    const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
    const [primeRed, primeGreen, primeBlue] = hueSection < 1 ? [chroma, secondary, 0]
      : hueSection < 2 ? [secondary, chroma, 0]
        : hueSection < 3 ? [0, chroma, secondary]
          : hueSection < 4 ? [0, secondary, chroma]
            : hueSection < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
    const matchLightness = lightness - chroma / 2;
    return [primeRed, primeGreen, primeBlue].map((channel) => Math.round((channel + matchLightness) * 255));
  };
  const surfaceChannels = hslToRgb(surfaceLightness);
  const surfaceHighChannels = hslToRgb(Math.min(0.78, surfaceLightness + 0.08));
  const surfaceLowChannels = hslToRgb(Math.max(0.48, surfaceLightness - 0.07));
  const surface = `rgb(${surfaceChannels.join(" ")})`;
  const surfaceHigh = `rgb(${surfaceHighChannels.join(" ")})`;
  const surfaceLow = `rgb(${surfaceLowChannels.join(" ")})`;
  const ink = "#071216";
  return {
    "--event-color": color,
    "--event-dark": dark,
    "--event-surface-high": surfaceHigh,
    "--event-surface": surface,
    "--event-surface-low": surfaceLow,
    "--event-ink": ink,
    "--event-accent": surfaceHigh,
    "--event-bright": surfaceHigh,
    "--event-title-color": ink,
    "--event-time-color": surfaceHigh,
    "--drive-before": `calc(var(--fc-hour-height) * ${before / 60})`,
    "--drive-after": `calc(var(--fc-hour-height) * ${after / 60})`,
  } as CSSProperties;
}

// Named people keep a stable colour; anyone else is hashed into the pool below,
// so adding a family member needs no code change.
const PERSON_COLORS: Record<string, string> = {
  alex: "#4c9cff",
  sam: "#e7a33b",
  robin: "#a978d0",
};

const PERSON_COLOR_POOL = ["#4c9cff", "#e7a33b", "#a978d0", "#69a976", "#e66f88", "#42b9b1", "#d8834e", "#8f9f4c"];

function personColorTokens(name: string): CSSProperties {
  const normalized = name.trim().toLowerCase();
  let color = PERSON_COLORS[normalized];
  if (!color) {
    const hash = Array.from(normalized).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
    color = PERSON_COLOR_POOL[hash % PERSON_COLOR_POOL.length];
  }
  return { "--person-color": color } as CSSProperties;
}

function layoutEvents(dayEvents: CalendarEvent[]): LaidOutEvent[] {
  const sorted = [...dayEvents].sort((a, b) => a.start - b.start || a.end - b.end);
  const result: LaidOutEvent[] = [];
  let group: CalendarEvent[] = [];
  let groupEnd = -1;

  const finishGroup = () => {
    if (!group.length) return;
    const laneEnds: number[] = [];
    const assigned = group.map((event) => {
      let lane = laneEnds.findIndex((end) => end <= event.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = event.end;
      return { event, lane };
    });
    assigned.forEach(({ event, lane }) => result.push({ ...event, lane, laneCount: laneEnds.length }));
    group = [];
    groupEnd = -1;
  };

  sorted.forEach((event) => {
    if (group.length && event.start >= groupEnd) finishGroup();
    group.push(event);
    groupEnd = Math.max(groupEnd, event.end);
  });
  finishGroup();
  return result;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSavedEvents(raw: string): CalendarEvent[] | null {
  try {
    const parsed = JSON.parse(raw) as { version?: number; events?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) return null;
    const sanitized = parsed.events.map((value) => {
      if (!value || typeof value !== "object") return value;
      const event = value as CalendarEvent;
      const duration = typeof event.end === "number" && typeof event.start === "number" ? event.end - event.start : 0;
      const before = typeof event.driveBefore === "number" && Number.isFinite(event.driveBefore) ? Math.max(0, event.driveBefore) : 0;
      const after = typeof event.driveAfter === "number" && Number.isFinite(event.driveAfter) ? Math.max(0, event.driveAfter) : 0;
      const availableDrive = Math.max(0, duration - SNAP_MINUTES);
      const safeBefore = Math.min(before, availableDrive);
      const safeAfter = Math.min(after, Math.max(0, availableDrive - safeBefore));
      return {
        ...event,
        tag: normalizeTag(event.tag),
        syncNotes: Boolean(event.syncNotes),
        driveBefore: safeBefore,
        driveAfter: safeAfter,
      };
    });
    if (!sanitized.every(isCalendarEvent)) return null;
    return sanitized;
  } catch {
    return null;
  }
}

function parseSettings(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { dayCount?: unknown; viewMode?: unknown; activeDay?: unknown; compact?: unknown };
    if (!Number.isInteger(parsed.dayCount) || (parsed.dayCount as number) < 1 || (parsed.dayCount as number) > ALL_DAYS.length) return null;
    if (parsed.viewMode !== "week" && parsed.viewMode !== "day") return null;
    // Migrate the older four-column default without making an existing
    // browser setting lose its chosen view or selected day.
    const dayCount = Math.max(DEFAULT_DAY_COUNT, parsed.dayCount as number);
    return {
      dayCount,
      viewMode: parsed.viewMode as ViewMode,
      activeDay: Number.isInteger(parsed.activeDay) ? clamp(parsed.activeDay as number, 0, dayCount - 1) : 0,
      // Older device-local settings did not have this preference. Treat an
      // absent or malformed value as the roomy, default layout.
      compact: parsed.compact === true,
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [history, setHistory] = useState<CalendarEvent[][]>([]);
  const [preview, setPreview] = useState<CalendarEvent | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CalendarEvent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newEventDetailsOpen, setNewEventDetailsOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [announcement, setAnnouncement] = useState("Calendar ready");
  const [actionNotice, setActionNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [dayCount, setDayCount] = useState(DEFAULT_DAY_COUNT);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [activeDay, setActiveDay] = useState(0);
  const [compactMode, setCompactMode] = useState(false);
  // Filters live inline in the header on desktop; on a phone width they collapse
  // behind this toggle so the header stays one row.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SummaryFilter | null>(null);
  const [todayIndex, setTodayIndex] = useState(-1);
  // Dates depend on the viewer's clock and time zone, so they stay empty until
  // after hydration. Server and first client render therefore agree exactly.
  const [week, setWeek] = useState<WeekDate[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [personEntry, setPersonEntry] = useState("");
  const [deleteChoice, setDeleteChoice] = useState<DeleteChoice | null>(null);
  const [pendingDriveChoice, setPendingDriveChoice] = useState<PendingDriveChoice | null>(null);
  const [resizeSurface, setResizeSurface] = useState<ResizeSurface | null>(null);
  const [eventToolsId, setEventToolsId] = useState<string | null>(null);
  // The selected card stays prominent while its direct time collision peers
  // compress into the remaining lane space. Hover wins on a mouse so someone
  // can move between visible peer strips; a tapped card falls back to the
  // open tool state below.
  const [overlapHoverId, setOverlapHoverId] = useState<string | null>(null);
  const [eventToolEdges, setEventToolEdges] = useState<EventToolEdges>({ start: true, end: true });
  const [hourPicker, setHourPicker] = useState<HourPicker | null>(null);
  const [hourPickerPosition, setHourPickerPosition] = useState<HourPickerPosition | null>(null);
  const [addressPreview, setAddressPreview] = useState<AddressPreview | null>(null);
  const [addressPreviewPosition, setAddressPreviewPosition] = useState<AddressPreviewPosition | null>(null);
  const [baseHourHeight, setBaseHourHeight] = useState(DESKTOP_HOUR_HEIGHT);
  const [displayStartMinutes, setDisplayStartMinutes] = useState(INITIAL_DISPLAY_RANGE.start);
  const [displayEndMinutes, setDisplayEndMinutes] = useState(INITIAL_DISPLAY_RANGE.end);
  const [quickAddAnchor, setQuickAddAnchor] = useState<QuickAddAnchor | null>(null);
  const [quickAddPosition, setQuickAddPosition] = useState<QuickAddPosition | null>(null);
  const eventsRef = useRef(events);
  const sharedRevisionRef = useRef(0);
  const sharedReadyRef = useRef(false);
  const connectingRef = useRef(false);
  const syncingRef = useRef(false);
  const syncIdleRef = useRef<Promise<void>>(Promise.resolve());
  const pendingPatchesRef = useRef<CalendarPatch[]>([]);
  const interactionActiveRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const previewRef = useRef<CalendarEvent | null>(null);
  const ignoreClickRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const choiceRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pendingEditorReturnFocusRef = useRef(false);
  const resizeReturnFocusRef = useRef<HTMLElement | null>(null);
  const restoredDayRef = useRef<number | null>(null);
  const lastPointerTypeRef = useRef("");
  const resizeSurfaceRef = useRef<ResizeSurface | null>(null);
  const eventToolsCloseTimerRef = useRef<number | null>(null);
  const eventToolsOpenTimerRef = useRef<number | null>(null);
  const eventToolsHoverIdRef = useRef<string | null>(null);
  const hourPickerRef = useRef<HTMLDivElement>(null);
  const addressPreviewRef = useRef<HTMLDivElement>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollPointerRef = useRef<AutoScrollPointer | null>(null);
  const touchPressRef = useRef<TouchPress | null>(null);
  const touchCardScrollRef = useRef<TouchCardScroll | null>(null);
  const blankSlotPressRef = useRef<BlankSlotPress | null>(null);
  const longPressEventRef = useRef<string | null>(null);
  eventsRef.current = events;
  resizeSurfaceRef.current = resizeSurface;
  const activeDayRef = useRef(activeDay);
  activeDayRef.current = activeDay;
  const quickAddOpen = Boolean(draft && isNew && !newEventDetailsOpen);
  const editorOpen = Boolean((draft && !quickAddOpen) || deleteChoice || pendingDriveChoice);
  interactionActiveRef.current = Boolean(activeId || preview || editorOpen || resizeSurface);
  const draftId = draft?.id;
  // Compact deliberately changes the time scale as well as card density, so
  // it removes empty vertical runway instead of merely shrinking the text.
  const hourHeight = compactMode
    ? Math.max(36, Math.round(baseHourHeight * 0.48))
    : baseHourHeight;
  const visibleDays = useMemo(() => ALL_DAYS.slice(0, dayCount), [dayCount]);
  const visibleDates = useMemo(() => week.slice(0, dayCount).map((date) => date.short), [dayCount, week]);
  const rangeLabel = useMemo(() => weekRangeLabel(week, dayCount), [dayCount, week]);
  const rangeLabelCompact = useMemo(() => weekRangeLabelCompact(week, dayCount), [dayCount, week]);

  /**
   * `resetHistory` is only true when the shared calendar first loads. A later
   * update from someone else must not throw away the undo steps this device
   * has built up.
   */
  const applySharedEvents = useCallback((next: CalendarEvent[], displayDayCount: number, announce = "", resetHistory = true) => {
    const calendar = next.map(cloneCalendarEvent);
    eventsRef.current = calendar;
    setEvents(calendar);
    const displayRange = calendarDisplayRange(calendar, displayDayCount, START_MINUTES, END_MINUTES);
    setDisplayStartMinutes((current) => Math.min(current, displayRange.start));
    setDisplayEndMinutes((current) => Math.max(current, displayRange.end));
    if (resetHistory) setHistory([]);
    if (announce) setAnnouncement(announce);
  }, []);

  const noteSyncFailure = useCallback((error: unknown) => {
    setSyncState(error instanceof SharedCalendarError && error.needsSignIn ? "signed-out" : "offline");
  }, []);

  const flushPendingChanges = useCallback(() => {
    if (!sharedReadyRef.current || syncingRef.current || pendingPatchesRef.current.length === 0) return syncIdleRef.current;
    syncingRef.current = true;
    const task = (async () => {
      try {
        while (pendingPatchesRef.current.length > 0) {
          const patch = pendingPatchesRef.current[0];
          const shared = await sharedCalendarRequest({ type: "patch", patch });
          sharedRevisionRef.current = shared.revision;
          pendingPatchesRef.current.shift();
        }
        setSyncState("synced");
      } catch (error) {
        // The pending patch is deliberately retained for the next refresh.
        noteSyncFailure(error);
      } finally {
        syncingRef.current = false;
      }
    })();
    syncIdleRef.current = task;
    return task;
  }, [noteSyncFailure]);

  const queueSharedPatch = useCallback((previous: CalendarEvent[], next: CalendarEvent[]) => {
    const patch = calendarPatch(previous, next);
    if (isEmptyPatch(patch)) return;
    pendingPatchesRef.current.push(patch);
    if (sharedReadyRef.current) void flushPendingChanges();
  }, [flushPendingChanges]);

  const connectSharedCalendar = useCallback(async (displayDayCount: number) => {
    if (connectingRef.current || sharedReadyRef.current) return;
    connectingRef.current = true;
    try {
      const shared = await sharedCalendarRequest();
      if (!shared.initialized) {
        const bootstrapped = await sharedCalendarRequest({ type: "bootstrap", events: eventsRef.current });
        sharedRevisionRef.current = bootstrapped.revision;
        sharedReadyRef.current = true;
        pendingPatchesRef.current = [];
        applySharedEvents(bootstrapped.events, displayDayCount);
      } else {
        sharedRevisionRef.current = shared.revision;
        sharedReadyRef.current = true;
        if (pendingPatchesRef.current.length === 0) applySharedEvents(shared.events, displayDayCount);
        if (pendingPatchesRef.current.length > 0) void flushPendingChanges();
      }
      setSyncState("synced");
    } catch (error) {
      // Events remain available from the device-local copy until a later
      // refresh can reconnect.
      noteSyncFailure(error);
    } finally {
      connectingRef.current = false;
    }
  }, [applySharedEvents, flushPendingChanges, noteSyncFailure]);


  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let loadedDayCount = DEFAULT_DAY_COUNT;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        let loadedEvents = INITIAL_EVENTS;
        if (saved) {
          const parsed = parseSavedEvents(saved);
          if (parsed) {
            loadedEvents = parsed;
            setEvents(parsed);
          }
          else setAnnouncement("The saved copy could not be read, so the starting plan was restored");
        }
        const settings = parseSettings(localStorage.getItem(SETTINGS_KEY));
        loadedDayCount = settings?.dayCount ?? DEFAULT_DAY_COUNT;
        const now = new Date();
        const currentWeek = weekDates(now);
        const nextTodayIndex = todayColumn(currentWeek, now);
        setWeek(currentWeek);
        setTodayIndex(nextTodayIndex);
        if (settings) {
          restoredDayRef.current = settings.activeDay;
          setDayCount(settings.dayCount);
          setViewMode(settings.viewMode);
          setActiveDay(settings.activeDay);
          setCompactMode(settings.compact);
        } else if (window.matchMedia("(max-width: 620px)").matches) {
          const initialDay = nextTodayIndex >= 0 && nextTodayIndex < loadedDayCount ? nextTodayIndex : 0;
          restoredDayRef.current = initialDay;
          setViewMode("day");
          setActiveDay(initialDay);
        }
        const displayRange = calendarDisplayRange(loadedEvents, loadedDayCount, START_MINUTES, END_MINUTES);
        eventsRef.current = loadedEvents;
        setDisplayStartMinutes(displayRange.start);
        setDisplayEndMinutes(displayRange.end);
      } catch {
        setAnnouncement("The saved copy could not be read, so the starting plan was restored");
      }
      setHydrated(true);
      void connectSharedCalendar(loadedDayCount);
    });
    return () => cancelAnimationFrame(frame);
  }, [connectSharedCalendar]);

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia("(any-pointer: coarse)");
    const phoneQuery = window.matchMedia("(max-width: 620px)");
    const updateHourHeight = () => {
      setBaseHourHeight(phoneQuery.matches
        ? PHONE_HOUR_HEIGHT
        : coarsePointerQuery.matches
          ? TOUCH_HOUR_HEIGHT
          : DESKTOP_HOUR_HEIGHT);
    };
    updateHourHeight();
    window.addEventListener("resize", updateHourHeight);
    coarsePointerQuery.addEventListener("change", updateHourHeight);
    phoneQuery.addEventListener("change", updateHourHeight);
    return () => {
      window.removeEventListener("resize", updateHourHeight);
      coarsePointerQuery.removeEventListener("change", updateHourHeight);
      phoneQuery.removeEventListener("change", updateHourHeight);
    };
  }, []);

  useEffect(() => {
    if (!editorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen]);

  useEffect(() => {
    if (!draftId) return;
    titleInputRef.current?.focus();
  }, [draftId]);

  useEffect(() => {
    if (!draftId || !isNew || !newEventDetailsOpen) return;
    const frame = requestAnimationFrame(() => notesInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [draftId, isNew, newEventDetailsOpen]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!quickAddOpen || !quickAddAnchor || !dialog) return;
    const updatePosition = () => {
      const currentDialog = dialogRef.current;
      if (!currentDialog) return;
      const { width, height } = currentDialog.getBoundingClientRect();
      const next = positionQuickAdd(quickAddAnchor, width, height);
      setQuickAddPosition((current) => current?.left === next.left && current?.top === next.top ? current : next);
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(dialog);
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [quickAddAnchor, quickAddOpen]);

  useLayoutEffect(() => {
    const picker = hourPickerRef.current;
    if (!hourPicker || !picker) return;
    let selectedScrollFrame = 0;
    const updatePosition = () => {
      const currentPicker = hourPickerRef.current;
      if (!currentPicker) return;
      const rect = currentPicker.getBoundingClientRect();
      const gap = 8;
      const left = clamp(
        hourPicker.anchor.left + hourPicker.anchor.width / 2 - rect.width / 2,
        8,
        Math.max(8, window.innerWidth - rect.width - 8),
      );
      let top = hourPicker.anchor.bottom + gap;
      if (top + rect.height > window.innerHeight - 8) top = hourPicker.anchor.top - rect.height - gap;
      top = clamp(top, 8, Math.max(8, window.innerHeight - rect.height - 8));
      setHourPickerPosition((current) => current?.left === left && current.top === top ? current : { left, top });
    };
    updatePosition();
    selectedScrollFrame = requestAnimationFrame(() => {
      picker.querySelector<HTMLElement>("[data-hour-picker-current='true']")?.scrollIntoView({ block: "center" });
    });
    const observer = new ResizeObserver(updatePosition);
    observer.observe(picker);
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      cancelAnimationFrame(selectedScrollFrame);
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [hourPicker]);

  useLayoutEffect(() => {
    const preview = addressPreviewRef.current;
    if (!addressPreview || !preview) return;
    let frame = 0;
    const updatePosition = () => {
      const currentPreview = addressPreviewRef.current;
      if (!currentPreview) return;
      const rect = currentPreview.getBoundingClientRect();
      const gap = 8;
      const left = clamp(
        addressPreview.anchor.left + addressPreview.anchor.width / 2 - rect.width / 2,
        8,
        Math.max(8, window.innerWidth - rect.width - 8),
      );
      let top = addressPreview.anchor.bottom + gap;
      if (top + rect.height > window.innerHeight - 8) top = addressPreview.anchor.top - rect.height - gap;
      top = clamp(top, 8, Math.max(8, window.innerHeight - rect.height - 8));
      setAddressPreviewPosition((current) => current?.left === left && current.top === top ? current : { left, top });
    };
    updatePosition();
    frame = requestAnimationFrame(updatePosition);
    const observer = new ResizeObserver(updatePosition);
    observer.observe(preview);
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [addressPreview]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const closeQuickAddFromOutside = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest(".event-editor--quick-add")) return;
      closeEditor();
    };
    document.addEventListener("pointerdown", closeQuickAddFromOutside, true);
    return () => document.removeEventListener("pointerdown", closeQuickAddFromOutside, true);
  }, [quickAddOpen]);

  useEffect(() => {
    if (draft || editorOpen || !pendingEditorReturnFocusRef.current) return;
    pendingEditorReturnFocusRef.current = false;
    const returnTarget = returnFocusRef.current;
    if (returnTarget?.isConnected) returnTarget.focus();
    else if (activeFilter) document.querySelector<HTMLElement>(`[data-summary-filter="${activeFilter}"]`)?.focus();
    else scrollRef.current?.focus();
  }, [activeFilter, draft, editorOpen]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (resizeSurface?.kind !== "keyboard") return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>(".resize-surface--keyboard button")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [resizeSurface]);

  useEffect(() => {
    if (!eventToolsId) return;
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".calendar-event, .event-edge-tools-set, .calendar-hour-picker")) return;
      closeEventTools();
    };
    document.addEventListener("pointerdown", closeFromOutside, true);
    return () => document.removeEventListener("pointerdown", closeFromOutside, true);
  }, [eventToolsId]);

  useEffect(() => {
    if (!hourPicker) return;
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      // A second clock takes over in one tap. Its click replaces the active
      // picker instead of forcing a close-then-reopen sequence.
      if (target?.closest(".calendar-hour-picker, .event-time-handle")) return;
      closeHourPicker();
    };
    document.addEventListener("pointerdown", closeFromOutside, true);
    return () => document.removeEventListener("pointerdown", closeFromOutside, true);
  }, [hourPicker]);

  useEffect(() => {
    if (!addressPreview) return;
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".calendar-address-preview, .drive-segment-address")) return;
      closeAddressPreview();
    };
    document.addEventListener("pointerdown", closeFromOutside, true);
    return () => document.removeEventListener("pointerdown", closeFromOutside, true);
  }, [addressPreview]);

  useEffect(() => () => {
    if (eventToolsCloseTimerRef.current !== null) window.clearTimeout(eventToolsCloseTimerRef.current);
    if (eventToolsOpenTimerRef.current !== null) window.clearTimeout(eventToolsOpenTimerRef.current);
    if (autoScrollFrameRef.current !== null) window.cancelAnimationFrame(autoScrollFrameRef.current);
    if (touchPressRef.current) window.clearTimeout(touchPressRef.current.timer);
    touchCardScrollRef.current = null;
  }, []);

  useEffect(() => {
    const closeForResize = () => {
      if (interactionRef.current) return;
      setResizeSurface(null);
      closeEventTools();
      closeHourPicker();
    };
    const closeForScroll = () => {
      if (interactionRef.current) return;
      if (resizeSurfaceRef.current?.kind !== "keyboard") setResizeSurface(null);
      closeEventTools();
      closeHourPicker();
    };
    window.addEventListener("resize", closeForResize);
    window.addEventListener("scroll", closeForScroll);
    return () => {
      window.removeEventListener("resize", closeForResize);
      window.removeEventListener("scroll", closeForScroll);
    };
  }, []);

  useEffect(() => {
    if (!deleteChoice && !pendingDriveChoice) return;
    const frame = requestAnimationFrame(() => choiceRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [deleteChoice, pendingDriveChoice]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, events }));
    } catch {
      queueMicrotask(() => setAnnouncement("Changes work here, but this browser could not save them"));
    }
  }, [events, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ dayCount, viewMode, activeDay, compact: compactMode }));
    } catch {
      queueMicrotask(() => setAnnouncement("Calendar settings could not be saved in this browser"));
    }
  }, [activeDay, compactMode, dayCount, hydrated, viewMode]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    const refreshSharedCalendar = async () => {
      if (cancelled || document.visibilityState === "hidden" || interactionActiveRef.current) return;
      // The plan repeats weekly, so the dates behind it have to roll over on
      // their own rather than waiting for a reload.
      const now = new Date();
      const currentWeek = weekDates(now);
      setWeek((current) => (current[0]?.value === currentWeek[0].value ? current : currentWeek));
      setTodayIndex(todayColumn(currentWeek, now));

      if (!sharedReadyRef.current) {
        await connectSharedCalendar(dayCount);
        return;
      }
      if (syncingRef.current || pendingPatchesRef.current.length > 0) {
        void flushPendingChanges();
        return;
      }
      try {
        const shared = await sharedCalendarRequest();
        if (!shared.initialized) {
          sharedReadyRef.current = false;
          await connectSharedCalendar(dayCount);
          return;
        }
        if (shared.revision !== sharedRevisionRef.current) {
          sharedRevisionRef.current = shared.revision;
          applySharedEvents(shared.events, dayCount, "Calendar updated from the shared schedule", false);
        }
        setSyncState("synced");
      } catch (error) {
        // A later visibility or polling refresh will retry the shared copy.
        noteSyncFailure(error);
      }
    };

    const onFocus = () => { void refreshSharedCalendar(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshSharedCalendar();
    };
    const interval = window.setInterval(() => { void refreshSharedCalendar(); }, 10_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void refreshSharedCalendar();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [applySharedEvents, connectSharedCalendar, dayCount, flushPendingChanges, hydrated, noteSyncFailure]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && hourPicker) {
        event.preventDefault();
        closeHourPicker();
        return;
      }
      if (event.key === "Escape" && addressPreview) {
        event.preventDefault();
        closeAddressPreview();
        return;
      }
      if (event.key === "Escape" && quickAddOpen) {
        event.preventDefault();
        closeEditor();
        return;
      }
      if (event.key === "Escape" && interactionRef.current) {
        const interaction = interactionRef.current;
        if (interaction.captureTarget.hasPointerCapture(interaction.pointerId)) {
          interaction.captureTarget.releasePointerCapture(interaction.pointerId);
        }
        ignoreClickRef.current = interaction.origin.id;
        interactionRef.current = null;
        previewRef.current = null;
        stopAutoScroll();
        setPreview(null);
        setActiveId(null);
        setAnnouncement("Move cancelled");
      }
      if (event.key === "Escape" && (resizeSurface || eventToolsId)) {
        closeResizeSurface(Boolean(resizeSurface));
        closeEventTools(Boolean(eventToolsId));
      }
      if (event.key === "Escape" && pendingDriveChoice) {
        setPendingDriveChoice(null);
        setAnnouncement("Resize cancelled");
      } else if (event.key === "Escape" && deleteChoice) {
        setDeleteChoice(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !draft) {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const visibleEvents = useMemo(() => events.filter((event) => event.day < dayCount), [dayCount, events]);
  const defaultDisplayRange = useMemo(
    () => calendarDisplayRange(events, dayCount, START_MINUTES, END_MINUTES),
    [dayCount, events],
  );
  const visualStartMinutes = Math.min(displayStartMinutes, defaultDisplayRange.start);
  const visualEndMinutes = Math.max(displayEndMinutes, defaultDisplayRange.end);
  const layouts = useMemo(
    () => visibleDays.map((_, day) => layoutEvents(events.filter((event) => event.day === day && (!activeFilter || matchesSummaryFilter(event, activeFilter))))),
    [activeFilter, events, visibleDays],
  );
  // The ghost has to use the same lane layout that the schedule will use after
  // release. Otherwise a full-width preview can turn into a narrow collision
  // with no warning at drop time.
  const previewEvents = useMemo(() => {
    if (!preview) return events;
    const origin = events.find((event) => event.id === preview.id);
    return origin ? applyTaggedChange(events, origin, preview) : events;
  }, [events, preview]);
  const previewLayouts = useMemo(() => {
    if (!preview) return null;
    // Keep this indexed by the actual day index. Day renders one column, so
    // using the rendered-column ordinal here would otherwise look up the wrong
    // lane as soon as Tuesday (or later) is selected.
    return Array.from({ length: dayCount }, (_, day) => layoutEvents(
      previewEvents.filter((event) => event.day === day && (!activeFilter || matchesSummaryFilter(event, activeFilter))),
    ));
  }, [activeFilter, dayCount, preview, previewEvents]);
  const previewLane = preview ? previewLayouts?.[preview.day]?.find((event) => event.id === preview.id) : null;
  const previewConflictCount = preview
    ? previewEvents.filter((event) => event.id !== preview.id && event.day === preview.day && event.start < preview.end && event.end > preview.start).length
    : 0;
  // A mouse hover should immediately own the overlap treatment, even during
  // the brief delay before its time tools mount. On touch there is no hover,
  // so the intentionally opened tool card provides the same focus signal.
  const overlapFocusId = overlapHoverId ?? eventToolsId;
  const classMinutes = useMemo(
    () => visibleEvents.filter((event) => matchesSummaryFilter(event, "class")).reduce((total, event) => total + activityMinutes(event), 0),
    [visibleEvents],
  );
  const soccerMinutes = useMemo(
    () => visibleEvents.filter((event) => matchesSummaryFilter(event, "soccer")).reduce((total, event) => total + activityMinutes(event), 0),
    [visibleEvents],
  );
  const driveMinutes = useMemo(
    () => visibleEvents.reduce((total, event) => total + driveBefore(event) + driveAfter(event), 0),
    [visibleEvents],
  );
  const renderedDayIndexes = viewMode === "day" ? [activeDay] : visibleDays.map((_, index) => index);
  useLayoutEffect(() => {
    if (!hydrated || !scrollRef.current) return;
    // Day is intentionally one physical column. Keep its scroll position
    // vertical-only so it can never settle midway between adjacent days.
    scrollRef.current.scrollLeft = 0;
    if (viewMode === "week") return;
    const restoredDay = restoredDayRef.current;
    const targetDay = clamp(restoredDay ?? activeDayRef.current, 0, dayCount - 1);
    if (restoredDay !== null) {
      restoredDayRef.current = null;
      setActiveDay(targetDay);
    }
  }, [dayCount, hydrated, viewMode]);

  function commit(next: CalendarEvent[], message: string) {
    const previous = eventsRef.current;
    setHistory((items) => [...items.slice(-19), previous]);
    eventsRef.current = next;
    setEvents(next);
    const displayRange = calendarDisplayRange(next, dayCount, START_MINUTES, END_MINUTES);
    setDisplayStartMinutes((current) => Math.min(current, displayRange.start));
    setDisplayEndMinutes((current) => Math.max(current, displayRange.end));
    setAnnouncement(message);
    setActionNotice(message);
    queueSharedPatch(previous, next);
  }

  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    const current = eventsRef.current;
    setHistory((items) => items.slice(0, -1));
    eventsRef.current = previous;
    setEvents(previous);
    const displayRange = calendarDisplayRange(previous, dayCount, START_MINUTES, END_MINUTES);
    setDisplayStartMinutes((current) => Math.min(current, displayRange.start));
    setDisplayEndMinutes((current) => Math.max(current, displayRange.end));
    setAnnouncement("Last change undone");
    setActionNotice("Last change undone");
    queueSharedPatch(current, previous);
  }

  function openEditor(event: CalendarEvent, trigger?: HTMLElement) {
    if (draft) return;
    returnFocusRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    pendingEditorReturnFocusRef.current = false;
    setActiveDay(event.day);
    setResizeSurface(null);
    setEventToolsId(null);
    setDraft({ ...event, bullets: [...event.bullets], people: [...event.people] });
    setIsNew(false);
    setNewEventDetailsOpen(true);
    setQuickAddAnchor(null);
    setQuickAddPosition(null);
    setPersonEntry("");
    setFormError("");
  }

  function openNew(day = 0, start = 9 * 60, trigger?: HTMLElement | null, anchor?: QuickAddAnchor, duration = 60) {
    if (draft) return;
    returnFocusRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    pendingEditorReturnFocusRef.current = false;
    const safeStart = clamp(snap(start), START_MINUTES, END_MINUTES - SNAP_MINUTES);
    const safeDuration = clamp(snap(duration), SNAP_MINUTES, END_MINUTES - safeStart);
    const usedColors = new Set(events.map((event) => event.color));
    const nextColor = COLORS.find((color) => !usedColors.has(color.value))?.value
      ?? COLORS[events.length % COLORS.length]?.value
      ?? COLORS[0].value;
    setDraft({
      id: makeId(),
      title: "",
      day,
      start: safeStart,
      end: safeStart + safeDuration,
      color: nextColor,
      bullets: [],
      people: [],
      town: false,
      kind: "fixed",
      tag: "",
      syncNotes: false,
      driveBefore: 0,
      driveAfter: 0,
      address: "",
    });
    setActiveDay(day);
    setResizeSurface(null);
    setEventToolsId(null);
    setIsNew(true);
    setNewEventDetailsOpen(false);
    setQuickAddAnchor(anchor ?? null);
    setQuickAddPosition(null);
    setPersonEntry("");
    setFormError("");
  }

  function closeEditor() {
    pendingEditorReturnFocusRef.current = true;
    setDraft(null);
    setDeleteChoice(null);
    setIsNew(false);
    setNewEventDetailsOpen(false);
    setQuickAddAnchor(null);
    setQuickAddPosition(null);
    setPersonEntry("");
    setFormError("");
  }

  function saveDraft() {
    if (!draft) return;
    const cleanTitle = draft.title.trim();
    if (!cleanTitle) {
      setFormError("Give this event a name.");
      titleInputRef.current?.focus();
      return;
    }
    if (draft.end <= draft.start) {
      setFormError("End time must be after start time.");
      return;
    }
    const extraPerson = personEntry.trim().replace(/,$/, "").trim();
    const clean = {
      ...draft,
      title: cleanTitle,
      bullets: draft.bullets.map((item) => item.trim()).filter(Boolean),
      people: Array.from(new Set([...draft.people, ...(extraPerson ? [extraPerson] : [])].map((item) => item.trim()).filter(Boolean))),
      tag: normalizeTag(draft.tag),
      syncNotes: Boolean(normalizeTag(draft.tag) && draft.syncNotes),
      driveBefore: driveBefore(draft),
      driveAfter: driveAfter(draft),
    };
    if (activityMinutes(clean) < SNAP_MINUTES) {
      setFormError("Keep at least 15 minutes for the event itself.");
      return;
    }
    const origin = events.find((event) => event.id === clean.id);
    const tagChanged = Boolean(origin && normalizeTag(origin.tag) !== normalizeTag(clean.tag));
    if (origin && !tagChanged) {
      const changeError = taggedChangeError(events, origin, clean);
      if (changeError) {
        setFormError(changeError);
        return;
      }
    }
    let next = isNew
      ? [...events, clean]
      : origin && !tagChanged
        ? applyTaggedChange(events, origin, clean)
        : events.map((event) => (event.id === clean.id ? clean : event));
    if (((!isNew && origin && tagChanged) || isNew) && clean.syncNotes && normalizeTag(clean.tag)) {
      const joinedTag = normalizeTag(clean.tag);
      next = next.map((event) => normalizeTag(event.tag) === joinedTag
        ? { ...event, syncNotes: true, bullets: [...clean.bullets] }
        : event);
    }
    const scope = origin && !tagChanged ? tagScope(events, origin) : { tag: normalizeTag(clean.tag), count: 1 };
    const scopeMessage = scope.count > 1 ? `${scope.count} ${scope.tag} items updated` : `${clean.title} ${isNew ? "added" : "updated"}`;
    commit(next, scopeMessage);
    closeEditor();
  }

  function deleteDraft() {
    if (!draft || isNew) return;
    const persisted = events.find((event) => event.id === draft.id);
    if (!persisted) return;
    const tag = normalizeTag(persisted.tag);
    const matches = tag ? events.filter((event) => normalizeTag(event.tag) === tag) : [];
    if (matches.length > 1) {
      setDeleteChoice({ event: persisted, matchingIds: matches.map((event) => event.id) });
      return;
    }
    commit(events.filter((event) => event.id !== persisted.id), `${persisted.title} removed — use Undo to restore it`);
    closeEditor();
  }

  function confirmDelete(deleteAll: boolean) {
    if (!deleteChoice) return;
    const next = removeTaggedEvents(events, deleteChoice.event, deleteAll);
    const count = events.length - next.length;
    commit(next, `${count} ${count === 1 ? "item" : "items"} removed — use Undo to restore`);
    closeEditor();
  }

  function duplicateDraft() {
    if (!draft) return;
    const copy = {
      ...draft,
      id: makeId(),
      title: `${draft.title} copy`,
      day: Math.min(draft.day + 1, dayCount - 1),
      bullets: [...draft.bullets],
      people: [...draft.people],
      tag: "",
      syncNotes: false,
    };
    commit([...events, copy], `${draft.title} duplicated`);
    closeEditor();
  }

  function addPerson() {
    if (!draft) return;
    const name = personEntry.trim().replace(/,$/, "").trim();
    if (!name) return;
    if (!draft.people.some((person) => person.toLowerCase() === name.toLowerCase())) {
      setDraft({ ...draft, people: [...draft.people, name] });
    }
    setPersonEntry("");
  }

  function scrollToDay(day: number, behavior: ScrollBehavior = "smooth") {
    const next = clamp(day, 0, dayCount - 1);
    setActiveDay(next);
    setAnnouncement(`${ALL_DAYS[next]} selected`);
    // A Day change swaps the one rendered column instead of sliding a wider
    // week track underneath the viewport. It also keeps the vertical time
    // position stable, which makes day-to-day comparisons less disorienting.
    if (viewMode === "day") {
      const scroller = scrollRef.current;
      if (scroller) {
        scroller.scrollLeft = 0;
        // A filtered empty day has an explanatory state at the top of the
        // grid. Put it in view instead of retaining a deep scroll position
        // from the previously selected day.
        if (activeFilter && layouts[next]?.length === 0) scroller.scrollTop = 0;
      }
      return;
    }
    const scroller = scrollRef.current;
    if (!scroller) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const columnWidth = Math.max(WEEK_DAY_MIN_WIDTH, scroller.scrollWidth / dayCount);
    scroller.scrollTo({ left: next * columnWidth, behavior: reduceMotion ? "auto" : behavior });
  }

  function closeResizeSurface(restoreFocus = false) {
    const target = resizeReturnFocusRef.current;
    setResizeSurface(null);
    if (restoreFocus) window.setTimeout(() => target?.focus({ preventScroll: true }), 0);
  }

  function closeEventTools(restoreFocus = false) {
    if (eventToolsOpenTimerRef.current !== null) {
      window.clearTimeout(eventToolsOpenTimerRef.current);
      eventToolsOpenTimerRef.current = null;
    }
    if (eventToolsCloseTimerRef.current !== null) {
      window.clearTimeout(eventToolsCloseTimerRef.current);
      eventToolsCloseTimerRef.current = null;
    }
    eventToolsHoverIdRef.current = null;
    const target = resizeReturnFocusRef.current;
    setEventToolsId(null);
    if (restoreFocus) window.setTimeout(() => target?.focus({ preventScroll: true }), 0);
  }

  function closeHourPicker() {
    setHourPicker(null);
    setHourPickerPosition(null);
  }

  function closeAddressPreview() {
    setAddressPreview(null);
    setAddressPreviewPosition(null);
  }

  function openAddressPreview(target: HTMLElement, event: CalendarEvent) {
    const address = (event.address ?? "").trim();
    if (!address) return;
    const rect = target.getBoundingClientRect();
    setAddressPreviewPosition(null);
    setAddressPreview({
      eventId: event.id,
      address,
      anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
    });
  }

  // First interaction previews the address on the map; if it is already
  // open, the family clearly wants to go there, so this one hands off to
  // whichever map app the device prefers.
  function handleAddressClick(clickEvent: ReactMouseEvent<HTMLElement>, event: CalendarEvent) {
    clickEvent.stopPropagation();
    clickEvent.preventDefault();
    const address = (event.address ?? "").trim();
    if (!address) {
      openEditor(event, clickEvent.currentTarget);
      return;
    }
    if (addressPreview?.eventId === event.id) {
      window.location.href = mapsNavigationUrl(address);
      return;
    }
    openAddressPreview(clickEvent.currentTarget, event);
  }

  function openEventTools(event: CalendarEvent, card: HTMLElement, announce = true, preferredEdge?: keyof EventToolEdges) {
    if (eventToolsOpenTimerRef.current !== null) {
      window.clearTimeout(eventToolsOpenTimerRef.current);
      eventToolsOpenTimerRef.current = null;
    }
    if (eventToolsCloseTimerRef.current !== null) {
      window.clearTimeout(eventToolsCloseTimerRef.current);
      eventToolsCloseTimerRef.current = null;
    }
    resizeReturnFocusRef.current = card;
    setResizeSurface(null);
    // Controls remain inside the selected card. They never need to reserve a
    // strip of a neighboring event, so a compact or edge-adjacent card stays
    // adjustable rather than becoming inert.
    // A normal card can expose both time handles. For a very short card,
    // deliberately retain the edge nearest the pointer rather than stacking
    // two labeled handles over each other or clipping one out of reach.
    const minimumForBothEdges = window.matchMedia("(any-pointer: coarse)").matches ? 52 : 44;
    // Drive bands make an event's outer box taller without giving its actual
    // time rail any more room. Choose one safe edge from the core height so
    // start/end handles never pile on top of a short activity.
    const coreHeight = card.querySelector<HTMLElement>(".event-core")?.getBoundingClientRect().height ?? card.getBoundingClientRect().height;
    const showBothEdges = coreHeight >= minimumForBothEdges;
    const selectedEdges = showBothEdges
      ? { start: true, end: true }
      : { start: preferredEdge !== "end", end: preferredEdge === "end" };
    setEventToolEdges(selectedEdges);
    setEventToolsId(event.id);
    if (announce) setAnnouncement(`${event.title} ${showBothEdges ? "start and end time" : "time"} controls shown.`);
  }

  function scheduleEventToolsOpen(event: CalendarEvent, card: HTMLElement, preferredEdge: keyof EventToolEdges) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    eventToolsHoverIdRef.current = event.id;
    if (eventToolsCloseTimerRef.current !== null) {
      window.clearTimeout(eventToolsCloseTimerRef.current);
      eventToolsCloseTimerRef.current = null;
    }
    if (eventToolsId === event.id) {
      return;
    }
    if (eventToolsOpenTimerRef.current !== null) {
      window.clearTimeout(eventToolsOpenTimerRef.current);
      eventToolsOpenTimerRef.current = null;
    }
    // Instant: the ref-based scheduling still exists so a pointer that leaves
    // before this fires can cancel it, but nothing should make a family
    // member wait to see what a hover already promised.
    eventToolsOpenTimerRef.current = window.setTimeout(() => {
      eventToolsOpenTimerRef.current = null;
      if (eventToolsHoverIdRef.current === event.id && !interactionRef.current) openEventTools(event, card, false, preferredEdge);
    }, 0);
  }

  function cancelEventToolsOpen() {
    if (eventToolsOpenTimerRef.current !== null) {
      window.clearTimeout(eventToolsOpenTimerRef.current);
      eventToolsOpenTimerRef.current = null;
    }
  }

  function keepEventToolsOpen(eventId: string) {
    eventToolsHoverIdRef.current = eventId;
    if (eventToolsOpenTimerRef.current !== null) {
      window.clearTimeout(eventToolsOpenTimerRef.current);
      eventToolsOpenTimerRef.current = null;
    }
    if (eventToolsCloseTimerRef.current !== null) {
      window.clearTimeout(eventToolsCloseTimerRef.current);
      eventToolsCloseTimerRef.current = null;
    }
  }

  function scheduleEventToolsClose(eventId: string) {
    if (eventToolsHoverIdRef.current === eventId) eventToolsHoverIdRef.current = null;
    cancelEventToolsOpen();
    if (eventToolsCloseTimerRef.current !== null) window.clearTimeout(eventToolsCloseTimerRef.current);
    eventToolsCloseTimerRef.current = window.setTimeout(() => {
      eventToolsCloseTimerRef.current = null;
      const focusedCard = document.activeElement?.closest<HTMLElement>(".calendar-event");
      // A direct time/departure button can own keyboard focus after the
      // pointer leaves the card. Keep that active control mounted until focus
      // genuinely leaves rather than removing it from under the user.
      const isFocusedTool = focusedCard?.dataset.eventId === eventId;
      if (!interactionRef.current && !isFocusedTool && eventToolsHoverIdRef.current !== eventId) {
        setEventToolsId((current) => current === eventId ? null : current);
      }
    }, 180);
  }

  function beginTouchPress(pointerEvent: ReactPointerEvent<HTMLElement>, event: CalendarEvent) {
    if (pointerEvent.pointerType !== "touch" && pointerEvent.pointerType !== "pen") return;
    if (touchPressRef.current) window.clearTimeout(touchPressRef.current.timer);
    touchCardScrollRef.current = null;
    const card = pointerEvent.currentTarget;
    // Capture the initial press. This keeps a held card receiving the pointer
    // even when the finger leaves its original bounds before the drag begins.
    card.setPointerCapture(pointerEvent.pointerId);
    const timer = window.setTimeout(() => {
      const press = touchPressRef.current;
      if (!press || press.pointerId !== pointerEvent.pointerId || press.eventId !== event.id) return;
      touchPressRef.current = null;
      longPressEventRef.current = event.id;
      setEventToolsId(null);
      beginInteraction(pointerEvent, event, "move", "event", true, card);
      setAnnouncement(`Hold and drag to move ${event.title}`);
    }, 440);
    touchPressRef.current = {
      eventId: event.id,
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      timer,
    };
  }

  function cancelTouchPress(pointerEvent?: ReactPointerEvent<HTMLElement>) {
    const press = touchPressRef.current;
    if (!press) return;
    if (pointerEvent && press.pointerId !== pointerEvent.pointerId) return;
    window.clearTimeout(press.timer);
    touchPressRef.current = null;
  }

  function scrollFromTouchedCard(pointerEvent: ReactPointerEvent<HTMLElement>) {
    const gesture = touchCardScrollRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return false;
    const offset = gesture.lastY - pointerEvent.clientY;
    if (offset) scrollRef.current?.scrollBy({ top: offset, behavior: "auto" });
    gesture.lastY = pointerEvent.clientY;
    return true;
  }

  function endTouchedCardScroll(pointerEvent?: ReactPointerEvent<HTMLElement>) {
    const gesture = touchCardScrollRef.current;
    if (!gesture || (pointerEvent && gesture.pointerId !== pointerEvent.pointerId)) return false;
    touchCardScrollRef.current = null;
    return true;
  }

  function openKeyboardResizeSurface(event: CalendarEvent, card: HTMLElement) {
    const rect = card.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 16);
    const height = 342;
    const left = clamp(rect.left + rect.width / 2 - width / 2, 8, Math.max(8, window.innerWidth - width - 8));
    const top = rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 8 : clamp(rect.top - height - 8, 8, window.innerHeight - height - 8);
    resizeReturnFocusRef.current = card;
    setEventToolsId(null);
    setResizeSurface({ kind: "keyboard", eventId: event.id, left, top });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".resize-surface button")?.focus());
  }

  function actionMessage(event: CalendarEvent, action: string) {
    const scope = tagScope(events, event);
    return scope.count > 1 ? `${scope.count} ${scope.tag} items ${action}` : `${event.title} ${action}`;
  }

  function conflictCountForCandidate(origin: CalendarEvent, candidate: CalendarEvent) {
    const next = applyTaggedChange(events, origin, candidate);
    const moved = next.find((event) => event.id === origin.id);
    if (!moved) return 0;
    return next.filter((event) => event.id !== moved.id && event.day === moved.day && event.start < moved.end && event.end > moved.start).length;
  }

  function commitTaggedUpdate(origin: CalendarEvent, updated: CalendarEvent, action: string) {
    const changeError = taggedChangeError(events, origin, updated);
    if (changeError) {
      setAnnouncement(changeError);
      setActionNotice(changeError);
      return false;
    }
    commit(applyTaggedChange(events, origin, updated), actionMessage(origin, action));
    return true;
  }

  function nudgeResize(event: CalendarEvent, edge: "start" | "end", extensionType: "event" | "drive") {
    let updated = { ...event };
    if (edge === "start") {
      updated = {
        ...updated,
        start: updated.start - SNAP_MINUTES,
        driveBefore: extensionType === "drive" ? driveBefore(updated) + SNAP_MINUTES : driveBefore(updated),
      };
    } else {
      updated = {
        ...updated,
        end: updated.end + SNAP_MINUTES,
        driveAfter: extensionType === "drive" ? driveAfter(updated) + SNAP_MINUTES : driveAfter(updated),
        tentativeEnd: false,
      };
    }
    const committed = commitTaggedUpdate(event, updated, `extended${extensionType === "drive" ? " with Drive Time" : ""}`);
    if (committed) {
      closeResizeSurface(true);
    }
  }

  function openHourPicker(
    clickEvent: ReactMouseEvent<HTMLButtonElement>,
    event: CalendarEvent,
    edge: "start" | "end",
  ) {
    clickEvent.stopPropagation();
    if (ignoreClickRef.current === event.id) {
      ignoreClickRef.current = null;
      return;
    }
    if (interactionRef.current?.origin.id === event.id) return;
    const rect = clickEvent.currentTarget.getBoundingClientRect();
    keepEventToolsOpen(event.id);
    setHourPickerPosition(null);
    setHourPicker({
      eventId: event.id,
      edge,
      anchor: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    });
  }

  function chooseHourPickerTime(event: CalendarEvent, edge: "start" | "end", time: number) {
    const currentTime = edge === "start" ? activityStart(event) : activityEnd(event);
    if (time === currentTime) {
      closeHourPicker();
      return;
    }
    const updated = edge === "start"
      ? { ...event, start: time - driveBefore(event) }
      : { ...event, end: time + driveAfter(event), tentativeEnd: false };
    const changed = commitTaggedUpdate(event, updated, `set ${edge} time to ${formatTime(time)}`);
    if (changed) closeHourPicker();
  }

  function handleEventToolClick(
    clickEvent: ReactMouseEvent<HTMLButtonElement>,
    event: CalendarEvent,
    edge: "start" | "end",
    extensionType: "event" | "drive",
  ) {
    clickEvent.stopPropagation();
    if (ignoreClickRef.current === event.id) {
      ignoreClickRef.current = null;
      return;
    }
    if (interactionRef.current?.origin.id === event.id) return;
    nudgeResize(event, edge, extensionType);
  }

  function handleAddAdjacentToolClick(
    clickEvent: ReactMouseEvent<HTMLButtonElement>,
    event: CalendarEvent,
    edge: "start" | "end",
  ) {
    clickEvent.stopPropagation();
    if (ignoreClickRef.current === event.id) {
      ignoreClickRef.current = null;
      return;
    }
    if (interactionRef.current?.origin.id === event.id) return;
    const before = event.start - SNAP_MINUTES;
    const after = event.end;
    const canAddBefore = before >= START_MINUTES;
    const canAddAfter = after <= END_MINUTES - SNAP_MINUTES;
    if (!canAddBefore && !canAddAfter) {
      const message = `No 15-minute space is available next to ${event.title}`;
      setAnnouncement(message);
      setActionNotice(message);
      return;
    }
    const addBefore = edge === "start" ? canAddBefore || !canAddAfter : !canAddAfter && canAddBefore;
    const start = addBefore ? before : after;
    openNew(event.day, start, clickEvent.currentTarget, {
      clientX: clickEvent.clientX,
      clientY: clickEvent.clientY,
    }, SNAP_MINUTES);
    setAnnouncement(`New 15-minute event ${addBefore ? "before" : "after"} ${event.title}`);
  }

  function extensionDetails(event: CalendarEvent, edge: "start" | "end") {
    const nextOuter = edge === "start" ? event.start - SNAP_MINUTES : event.end + SNAP_MINUTES;
    const nextActivity = edge === "start" ? activityStart(event) - SNAP_MINUTES : activityEnd(event) + SNAP_MINUTES;
    return {
      edgeLabel: edge === "start" ? "Start" : "End",
      currentOuter: edge === "start" ? event.start : event.end,
      nextOuter,
      extendLabel: edge === "start" ? `Event starts ${shortTime(nextActivity)}` : `Event ends ${shortTime(nextActivity)}`,
      driveLabel: edge === "start"
        ? `Leave ${shortTime(nextOuter)} · event stays ${shortTime(activityStart(event))}`
        : `Drive until ${shortTime(nextOuter)} · event stays ${shortTime(activityEnd(event))}`,
    };
  }

  function selectView(mode: ViewMode) {
    if (mode === "week") {
      scrollRef.current?.scrollTo({ left: 0, behavior: "auto" });
    }
    setViewMode(mode);
    setAnnouncement(`${mode === "day" ? "Day" : "Week"} View selected`);
  }

  function handleSummaryFilter(filter: SummaryFilter) {
    const next = toggleSummaryFilter(activeFilter, filter);
    const matchingCount = next ? visibleEvents.filter((event) => matchesSummaryFilter(event, next)).length : visibleEvents.length;
    const label = next === "drive" ? "Drive Time" : next ? next[0].toUpperCase() + next.slice(1) : "";
    setActiveFilter(next);
    setResizeSurface(null);
    setEventToolsId(null);
    setAnnouncement(next
      ? `${label} filter on — ${matchingCount} ${matchingCount === 1 ? "event" : "events"} shown`
      : `Filter cleared — all ${matchingCount} events shown`);
    if (next) {
      const firstMatch = firstSummaryFilterMatch(visibleEvents, next, dayCount, viewMode === "day" ? activeDay : undefined);
      requestAnimationFrame(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        // If the selected Day has no match, return to the top so the empty
        // state is never stranded above the current scroll position.
        const top = firstMatch
          ? Math.max(0, ((firstMatch.start - visualStartMinutes) / 60) * hourHeight - 12)
          : 0;
        scroller.scrollTo({ left: viewMode === "day" ? 0 : scroller.scrollLeft, top, behavior: "auto" });
      });
    }
  }

  function extendWeek() {
    if (dayCount >= ALL_DAYS.length) return;
    const newDay = dayCount;
    setDayCount(dayCount + 1);
    const displayRange = calendarDisplayRange(events, dayCount + 1, START_MINUTES, END_MINUTES);
    setDisplayStartMinutes((current) => Math.min(current, displayRange.start));
    setDisplayEndMinutes((current) => Math.max(current, displayRange.end));
    setAnnouncement(`${ALL_DAYS[newDay]} added to the visible week`);
    setActiveDay(newDay);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (viewMode === "week" && scroller) {
        scroller.scrollTo({ left: scroller.scrollWidth, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  }

  function shortenWeek() {
    if (dayCount <= DEFAULT_DAY_COUNT) return;
    const hidden = dayCount - 1;
    const nextCount = dayCount - 1;
    setDayCount(nextCount);
    if (activeDay >= nextCount) setActiveDay(nextCount - 1);
    setAnnouncement(`${ALL_DAYS[hidden]} hidden; its events are preserved`);
  }

  function revealEarlierHour() {
    if (visualStartMinutes <= START_MINUTES) return;
    const next = Math.max(START_MINUTES, visualStartMinutes - 60);
    setDisplayStartMinutes(next);
    setAnnouncement(`${formatTime(next)} hour added to the calendar`);
  }

  function handleCalendarScroll() {
    lastPointerTypeRef.current = "";
    blankSlotPressRef.current = null;
    if (!interactionRef.current) {
      if (resizeSurface?.kind !== "keyboard") setResizeSurface(null);
      closeEventTools();
    }
    const scroller = scrollRef.current;
    if (!scroller || viewMode === "week") return;
    // Day owns one rendered column, so horizontal scroll is never a way to
    // change the selected day. Navigation is explicit in the day header.
    if (scroller.scrollLeft !== 0) scroller.scrollLeft = 0;
  }

  function handleCalendarKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (viewMode === "day" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      scrollToDay(activeDay + (event.key === "ArrowRight" ? 1 : -1));
      return;
    }
    if (event.key.toLowerCase() === "a" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      openNew(viewMode === "day" ? activeDay : 0);
    }
  }

  function eventFromPointer(clientX: number, clientY: number, interaction: Interaction) {
    const grid = gridRef.current;
    if (!grid) return interaction.origin;
    const rect = grid.getBoundingClientRect();
    const duration = interaction.origin.end - interaction.origin.start;
    if (interaction.mode === "move") {
      const dayWidth = rect.width / dayCount;
      // Day view deliberately renders one physical column. A move there keeps
      // the visible day; cross-day moves remain a Week-view operation.
      const day = viewMode === "day"
        ? interaction.origin.day
        : clamp(Math.floor((clientX - rect.left) / dayWidth), 0, dayCount - 1);
      const rawStart = visualStartMinutes + ((clientY - rect.top) / hourHeight) * 60 - interaction.offsetMinutes;
      const start = clamp(snap(rawStart), visualStartMinutes, END_MINUTES - duration);
      return { ...interaction.origin, day, start, end: start + duration };
    }
    const raw = snap(visualStartMinutes + ((clientY - rect.top) / hourHeight) * 60 - interaction.offsetMinutes);
    if (interaction.mode === "resize-start") {
      if (interaction.extensionType === "drive") {
        const start = clamp(raw, visualStartMinutes, interaction.origin.start + driveBefore(interaction.origin));
        return {
          ...interaction.origin,
          start,
          driveBefore: driveBefore(interaction.origin) + interaction.origin.start - start,
        };
      }
      return {
        ...interaction.origin,
        start: clamp(raw, visualStartMinutes, interaction.origin.end - driveBefore(interaction.origin) - driveAfter(interaction.origin) - SNAP_MINUTES),
      };
    }
    if (interaction.extensionType === "drive") {
      const end = clamp(raw, interaction.origin.end - driveAfter(interaction.origin), END_MINUTES);
      return {
        ...interaction.origin,
        end,
        driveAfter: driveAfter(interaction.origin) + end - interaction.origin.end,
        tentativeEnd: end === interaction.origin.end ? interaction.origin.tentativeEnd : false,
      };
    }
    const end = clamp(raw, interaction.origin.start + driveBefore(interaction.origin) + driveAfter(interaction.origin) + SNAP_MINUTES, END_MINUTES);
    return {
      ...interaction.origin,
      end,
      tentativeEnd: end === interaction.origin.end ? interaction.origin.tentativeEnd : false,
    };
  }

  function beginInteraction(
    pointerEvent: ReactPointerEvent<HTMLElement>,
    event: CalendarEvent,
    mode: Interaction["mode"],
    extensionType: Interaction["extensionType"] = "event",
    keepTools = false,
    captureTarget?: HTMLElement,
  ) {
    if (pointerEvent.button !== 0) return;
    pointerEvent.stopPropagation();
    if (!keepTools) setEventToolsId(null);
    const target = captureTarget ?? pointerEvent.currentTarget;
    target.setPointerCapture(pointerEvent.pointerId);
    const grid = gridRef.current?.getBoundingClientRect();
    const pointerMinutes = grid
      ? visualStartMinutes + ((pointerEvent.clientY - grid.top) / hourHeight) * 60
      : event.start;
    const anchorMinutes = mode === "resize-end" ? event.end : event.start;
    interactionRef.current = {
      pointerId: pointerEvent.pointerId,
      captureTarget: target,
      mode,
      origin: event,
      pointerX: pointerEvent.clientX,
      pointerY: pointerEvent.clientY,
      offsetMinutes: pointerMinutes - anchorMinutes,
      moved: false,
      extensionType,
      pointerType: pointerEvent.pointerType,
      editorOnRelease: mode === "move" && !keepTools,
    };
  }

  function stopAutoScroll() {
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    autoScrollPointerRef.current = null;
  }

  function scheduleAutoScroll(clientX: number, clientY: number) {
    autoScrollPointerRef.current = { clientX, clientY };
    if (autoScrollFrameRef.current !== null) return;
    const step = () => {
      autoScrollFrameRef.current = null;
      const interaction = interactionRef.current;
      const pointer = autoScrollPointerRef.current;
      const scroll = scrollRef.current;
      if (!interaction?.moved || !pointer || !scroll) return;
      const rect = scroll.getBoundingClientRect();
      const edgeZone = 32;
      const topEdgeZone = 48;
      const headerBottom = scroll.querySelector<HTMLElement>(".calendar-head")?.getBoundingClientRect().bottom ?? rect.top;
      // The sticky header covers the scroll container's first pixels. Start
      // upward auto-scroll below that header, where a dragged event is visible.
      const visibleGridTop = clamp(headerBottom, rect.top, rect.bottom);
      const velocity = (distance: number, size: number, direction: number) => direction * Math.max(1, Math.round((1 - distance / size) * 7));
      let top = 0;
      let left = 0;
      if (pointer.clientY < visibleGridTop + topEdgeZone) top = velocity(Math.max(0, pointer.clientY - visibleGridTop), topEdgeZone, -1);
      else if (pointer.clientY > rect.bottom - edgeZone) top = velocity(Math.max(0, rect.bottom - pointer.clientY), edgeZone, 1);
      if (interaction.mode === "move") {
        if (pointer.clientX < rect.left + edgeZone) left = velocity(Math.max(0, pointer.clientX - rect.left), edgeZone, -1);
        else if (pointer.clientX > rect.right - edgeZone) left = velocity(Math.max(0, rect.right - pointer.clientX), edgeZone, 1);
      }
      if (top || left) {
        scroll.scrollBy({ top, left, behavior: "auto" });
        const nextPreview = eventFromPointer(pointer.clientX, pointer.clientY, interaction);
        previewRef.current = nextPreview;
        setPreview(nextPreview);
        autoScrollFrameRef.current = window.requestAnimationFrame(step);
      }
    };
    autoScrollFrameRef.current = window.requestAnimationFrame(step);
  }

  function moveInteraction(pointerEvent: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== pointerEvent.pointerId) return;
    const nextPreview = eventFromPointer(pointerEvent.clientX, pointerEvent.clientY, interaction);
    const changed = hasScheduleChange(interaction.origin, nextPreview);
    if (!interaction.moved && !changed) return;
    if (!interaction.moved) {
      interaction.moved = true;
      setActiveId(interaction.origin.id);
    }
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    scheduleAutoScroll(pointerEvent.clientX, pointerEvent.clientY);
  }

  function endInteraction(pointerEvent: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== pointerEvent.pointerId) return;
    const moved = interaction.moved;
    const finalEvent = previewRef.current;
    interactionRef.current = null;
    previewRef.current = null;
    stopAutoScroll();
    const changed = finalEvent ? hasScheduleChange(interaction.origin, finalEvent) : false;
    if (moved) ignoreClickRef.current = interaction.origin.id;
    setActiveId(null);
    setPreview(null);
    if (moved && finalEvent && changed) {
      setResizeSurface(null);
      const action = interaction.mode === "move" ? "moved" : "resized";
      const conflicts = conflictCountForCandidate(interaction.origin, finalEvent);
      const conflictNote = conflicts > 0 ? ` — overlaps ${conflicts} ${conflicts === 1 ? "event" : "events"}` : "";
      const expanded = interaction.mode === "resize-start"
        ? finalEvent.start < interaction.origin.start
        : interaction.mode === "resize-end" && finalEvent.end > interaction.origin.end;
      if ((interaction.pointerType === "touch" || interaction.pointerType === "pen") && interaction.mode !== "move" && interaction.extensionType === "event" && expanded) {
        setEventToolsId(null);
        setPendingDriveChoice({ origin: interaction.origin, finalEvent, mode: interaction.mode });
        setAnnouncement("Choose whether the added time is Drive Time");
      } else {
        closeEventTools(interaction.pointerType === "touch");
        commitTaggedUpdate(interaction.origin, finalEvent, `${action} to ${ALL_DAYS[finalEvent.day]}, ${formatTime(finalEvent.start)}–${formatTime(finalEvent.end)}${conflictNote}`);
      }
    } else if (!moved && interaction.mode === "move" && interaction.editorOnRelease) {
      openEditor(interaction.origin, pointerEvent.currentTarget);
    }
  }

  function resolveDriveChoice(asDriveTime: boolean) {
    if (!pendingDriveChoice) return;
    const { origin, finalEvent, mode } = pendingDriveChoice;
    let resolved = finalEvent;
    if (asDriveTime && mode === "resize-start") {
      resolved = { ...finalEvent, driveBefore: driveBefore(origin) + origin.start - finalEvent.start };
    }
    if (asDriveTime && mode === "resize-end") {
      resolved = { ...finalEvent, driveAfter: driveAfter(origin) + finalEvent.end - origin.end };
    }
    const conflicts = conflictCountForCandidate(origin, resolved);
    const conflictNote = conflicts > 0 ? ` — overlaps ${conflicts} ${conflicts === 1 ? "event" : "events"}` : "";
    const committed = commitTaggedUpdate(origin, resolved, `extended${asDriveTime ? " with Drive Time" : ""}${conflictNote}`);
    setPendingDriveChoice(null);
    requestAnimationFrame(() => resizeReturnFocusRef.current?.focus({ preventScroll: true }));
    if (!committed) return;
  }

  function cancelInteraction(pointerEvent: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== pointerEvent.pointerId) return;
    ignoreClickRef.current = interaction.origin.id;
    interactionRef.current = null;
    previewRef.current = null;
    stopAutoScroll();
    setActiveId(null);
    setPreview(null);
    setResizeSurface(null);
    closeEventTools(true);
    setAnnouncement("Move cancelled");
  }

  function keyboardMove(event: ReactKeyboardEvent<HTMLElement>, calendarEvent: CalendarEvent) {
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault();
      openKeyboardResizeSurface(calendarEvent, event.currentTarget);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditor(calendarEvent, event.currentTarget);
      return;
    }
    if (!event.altKey) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    const next = { ...calendarEvent };
    if (event.key === "ArrowLeft") next.day = Math.max(0, next.day - 1);
    if (event.key === "ArrowRight") next.day = Math.min(dayCount - 1, next.day + 1);
    if (event.key === "ArrowUp" && event.shiftKey) next.end = Math.max(next.start + driveBefore(next) + driveAfter(next) + SNAP_MINUTES, next.end - SNAP_MINUTES);
    if (event.key === "ArrowDown" && event.shiftKey) next.end = Math.min(END_MINUTES, next.end + SNAP_MINUTES);
    if (event.key === "ArrowUp" && !event.shiftKey && next.start > START_MINUTES) {
      next.start -= SNAP_MINUTES;
      next.end -= SNAP_MINUTES;
    }
    if (event.key === "ArrowDown" && !event.shiftKey && next.end < END_MINUTES) {
      next.start += SNAP_MINUTES;
      next.end += SNAP_MINUTES;
    }
    if (JSON.stringify(next) !== JSON.stringify(calendarEvent)) {
      commitTaggedUpdate(calendarEvent, next, "adjusted");
    }
  }

  function handleDialogKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      return;
    }
    if (quickAddOpen) return;
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleChoiceKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (pendingDriveChoice) {
        setPendingDriveChoice(null);
        setAnnouncement("Resize cancelled");
        requestAnimationFrame(() => resizeReturnFocusRef.current?.focus({ preventScroll: true }));
      } else if (deleteChoice) {
        setDeleteChoice(null);
        requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>(".button-danger")?.focus());
      }
      return;
    }
    if (event.key !== "Tab" || !choiceRef.current) return;
    const focusable = Array.from(choiceRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const hours = Array.from({ length: (visualEndMinutes - visualStartMinutes) / 60 + 1 }, (_, index) => visualStartMinutes + index * 60);
  const timeOptions = Array.from(
    { length: (END_MINUTES - START_MINUTES) / SNAP_MINUTES + 1 },
    (_, index) => START_MINUTES + index * SNAP_MINUTES,
  );
  const resizeEvent = resizeSurface ? events.find((event) => event.id === resizeSurface.eventId) ?? null : null;
  const eventToolsEvent = eventToolsId ? events.find((event) => event.id === eventToolsId) ?? null : null;
  const hourPickerEvent = hourPicker ? events.find((event) => event.id === hourPicker.eventId) ?? null : null;
  const addressPreviewEvent = addressPreview ? events.find((event) => event.id === addressPreview.eventId) ?? null : null;
  const hourPickerTimeOptions = hourPicker && hourPickerEvent
    ? timeOptions.filter((time) => hourPicker.edge === "start"
      ? time >= START_MINUTES + driveBefore(hourPickerEvent) && time < activityEnd(hourPickerEvent)
      : time > activityStart(hourPickerEvent) && time <= END_MINUTES - driveAfter(hourPickerEvent))
    : [];
  const previewArtwork = preview ? eventArtwork(preview) : null;
  const draftTag = normalizeTag(draft?.tag);
  const draftOrigin = draft ? events.find((event) => event.id === draft.id) : null;
  const draftScopeCount = draftTag && draftOrigin && normalizeTag(draftOrigin.tag) === draftTag
    ? events.filter((event) => normalizeTag(event.tag) === draftTag).length
    : 1;
  const titleInvalid = formError === "Give this event a name.";
  const filteredEventCount = activeFilter
    ? visibleEvents.filter((event) => matchesSummaryFilter(event, activeFilter)).length
    : visibleEvents.length;

  return (
    <>
    <main
      className={`planner-app${compactMode ? " is-compact" : ""}`}
      style={{ "--fc-hour-height": `${hourHeight}px` } as CSSProperties}
      aria-hidden={editorOpen || undefined}
      inert={editorOpen || undefined}
      onPointerDownCapture={(event) => {
        if (!(event.target as HTMLElement).closest(".event-edge-tools-set")) setResizeSurface(null);
      }}
      onContextMenu={(event) => {
        const target = event.target as HTMLElement;
        const dayColumn = target.closest<HTMLElement>(".day-column");
        if (!dayColumn || target.closest(".calendar-event") || activeFilter) return;
        event.preventDefault();
        const dayIndex = Number(dayColumn.dataset.dayIndex);
        const rect = dayColumn.getBoundingClientRect();
        const start = clamp(snap(visualStartMinutes + ((event.clientY - rect.top) / hourHeight) * 60), visualStartMinutes, END_MINUTES - 60);
        openNew(Number.isInteger(dayIndex) ? dayIndex : activeDay, start, scrollRef.current, { clientX: event.clientX, clientY: event.clientY });
      }}
    >
      <header className="planner-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <p className="eyebrow">FAMILY CALENDAR</p>
            <h1>WALL BALL</h1>
          </div>
        </div>

        <button
          type="button"
          className="filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="header-filters-row"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <span aria-hidden="true">▾</span><span>Filters</span>
        </button>

        <div id="header-filters-row" className={`header-filters-row${filtersOpen ? " is-open" : ""}`}>
          <div className="summary-strip" role="group" aria-label="Filter calendar by keyword. Totals include all visible days.">
            <button type="button" className="summary-filter" data-summary-filter="class" aria-pressed={activeFilter === "class"} aria-label={`Class, ${formatDuration(classMinutes)}. ${activeFilter === "class" ? "Filter active; activate to show all events." : "Activate to show only Class events."}`} onClick={() => handleSummaryFilter("class")}>
              <span>Class</span><strong>{formatDuration(classMinutes)}</strong>
            </button>
            <button type="button" className="summary-filter" data-summary-filter="soccer" aria-pressed={activeFilter === "soccer"} aria-label={`Soccer, ${formatDuration(soccerMinutes)}. ${activeFilter === "soccer" ? "Filter active; activate to show all events." : "Activate to show only Soccer events."}`} onClick={() => handleSummaryFilter("soccer")}>
              <span>Soccer</span><strong>{formatDuration(soccerMinutes)}</strong>
            </button>
            <button type="button" className="summary-filter drive-total" data-summary-filter="drive" aria-pressed={activeFilter === "drive"} aria-label={`Drive Time, ${formatDuration(driveMinutes)}. ${activeFilter === "drive" ? "Filter active; activate to show all events." : "Activate to show only events with Drive Time."}`} onClick={() => handleSummaryFilter("drive")}>
              <span>Drive Time</span><strong>{formatDuration(driveMinutes)}</strong>
            </button>
          </div>
        </div>

        <div className="header-view-controls">
          <p className="header-date-range">
            <span className="range-full">Monday–{visibleDays[visibleDays.length - 1]}{rangeLabel ? ` · ${rangeLabel}` : ""}</span>
            <span className="range-compact">{rangeLabelCompact}</span>
          </p>
          <button
            className="header-add-button"
            type="button"
            onClick={() => openNew(viewMode === "day" ? activeDay : 0)}
            aria-label={`Add an event${viewMode === "day" ? ` on ${ALL_DAYS[activeDay]}` : ""}`}
          >
            <span aria-hidden="true">+</span><span>Add</span>
          </button>
          <button
            className={`compact-toggle${compactMode ? " selected" : ""}`}
            type="button"
            aria-pressed={compactMode}
            aria-label={compactMode ? "Turn off Compact calendar layout" : "Turn on Compact calendar layout"}
            title={compactMode ? "Turn off Compact layout" : "Turn on Compact layout"}
            onClick={() => {
              const next = !compactMode;
              setCompactMode(next);
              setAnnouncement(next ? "Compact layout on" : "Compact layout off");
            }}
          >
            <span aria-hidden="true">⇕</span><span className="compact-toggle-label">Compact</span>
          </button>
          <div className="view-toggle" role="group" aria-label="Calendar view">
            <button type="button" className={viewMode === "day" ? "selected" : ""} aria-pressed={viewMode === "day"} onClick={() => selectView("day")}>Day</button>
            <button type="button" className={viewMode === "week" ? "selected" : ""} aria-pressed={viewMode === "week"} onClick={() => selectView("week")}>Week</button>
          </div>
        </div>
      </header>

      {(syncState === "offline" || syncState === "signed-out") && (
        <p className="sync-warning" role="status">
          <span className="sync-warning-dot" aria-hidden="true">●</span>
          <span>
            {syncState === "signed-out"
              ? "Not signed in — changes are saved on this device only"
              : "Not syncing — changes are saved on this device only"}
          </span>
        </p>
      )}

      <section className="calendar-section" aria-label="Weekly calendar">
        <div className="calendar-shell">
          <div
            className={`calendar-scroll view-${viewMode} ${viewMode === "day" && activeDay === dayCount - 1 ? "is-last-day" : ""} ${activeId ? "is-interacting" : ""}`}
            ref={scrollRef}
            role="region"
            aria-label={`Scrollable ${viewMode} schedule, Central Time`}
            aria-describedby="calendar-scroll-help"
            aria-keyshortcuts={viewMode === "day" ? "ArrowLeft ArrowRight A" : "A"}
            tabIndex={0}
            onScroll={handleCalendarScroll}
            onKeyDown={handleCalendarKeyDown}
          >
            <div
              className={`calendar-track view-${viewMode}`}
              style={{
                "--day-count": renderedDayIndexes.length,
                minWidth: viewMode === "week" ? `${WEEK_DAY_MIN_WIDTH * dayCount}px` : "100%",
                width: viewMode === "day" ? "100%" : undefined,
              } as CSSProperties}
            >
              <div className="calendar-head">
                {renderedDayIndexes.map((dayIndex) => {
                  const day = visibleDays[dayIndex];
                  return (
                  <div className={`day-heading ${dayIndex === todayIndex ? "today" : ""} ${visualStartMinutes > START_MINUTES ? "has-earlier-control" : ""}`} key={day} aria-current={dayIndex === todayIndex ? "date" : undefined}>
                    <span className="day-title-line"><strong>{day.slice(0, 3)}</strong><span className="day-date">{visibleDates[dayIndex]}</span></span>
                    {dayIndex === todayIndex && <em>Today</em>}
                    {viewMode === "day" && (
                      <nav className="day-navigation" aria-label="Choose a day">
                        <button type="button" onClick={() => scrollToDay(activeDay - 1)} disabled={activeDay === 0} aria-label={`Show ${ALL_DAYS[Math.max(0, activeDay - 1)]}`}>‹</button>
                        <span aria-live="polite">{activeDay + 1} / {dayCount}</span>
                        <button type="button" onClick={() => scrollToDay(activeDay + 1)} disabled={activeDay === dayCount - 1} aria-label={`Show ${ALL_DAYS[Math.min(dayCount - 1, activeDay + 1)]}`}>›</button>
                      </nav>
                    )}
                    {viewMode === "week" && dayIndex === dayCount - 1 && (
                      <div className="week-range-controls" role="group" aria-label="Visible week range">
                        <button
                          type="button"
                          onClick={extendWeek}
                          disabled={dayCount >= ALL_DAYS.length}
                          aria-label={dayCount < ALL_DAYS.length ? `Show ${ALL_DAYS[dayCount]}` : "All available days are visible"}
                          title={dayCount < ALL_DAYS.length ? `Show ${ALL_DAYS[dayCount]}` : "All available days are visible"}
                        >+</button>
                        <button
                          type="button"
                          onClick={shortenWeek}
                          disabled={dayCount <= DEFAULT_DAY_COUNT}
                          aria-label={dayCount > DEFAULT_DAY_COUNT ? `Hide ${visibleDays[visibleDays.length - 1]}` : "Monday through Friday are required"}
                          title={dayCount > DEFAULT_DAY_COUNT ? `Hide ${visibleDays[visibleDays.length - 1]}` : "Monday through Friday are required"}
                        >−</button>
                      </div>
                    )}
                    {visualStartMinutes > START_MINUTES && (
                      <button
                        className="column-earlier-hour-control"
                        type="button"
                        onClick={revealEarlierHour}
                        aria-label={`Show ${formatTime(visualStartMinutes - 60)} in ${day}`}
                      ><span aria-hidden="true">↑</span><span>Show {formatTime(visualStartMinutes - 60)}</span></button>
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="calendar-body">
                <div className="days-canvas" ref={gridRef} style={{ height: `${((visualEndMinutes - visualStartMinutes) / 60) * hourHeight}px` }}>
                  {renderedDayIndexes.map((dayIndex) => {
                    const day = visibleDays[dayIndex];
                    const dayLayout = layouts[dayIndex];
                    const overlapFocusEvent = overlapFocusId
                      ? dayLayout.find((event) => event.id === overlapFocusId) ?? null
                      : null;
                    // Deliberately test direct interval intersection instead
                    // of reusing layout lanes. A chained lane group can contain
                    // cards that never share a visible time slot.
                    const overlapPeers = overlapFocusEvent
                      ? dayLayout.filter((event) => (
                        event.id !== overlapFocusEvent.id
                        && event.start < overlapFocusEvent.end
                        && event.end > overlapFocusEvent.start
                      ))
                      : [];
                    const hasOverlapFocus = Boolean(overlapFocusEvent && overlapPeers.length);
                    const overlapPeerIndexes = new Map(overlapPeers.map((event, index) => [event.id, index]));
                    const overlapFocusShare = 70;
                    // Expand toward the lane the card already occupies. That
                    // keeps the pointer inside the card it activated instead
                    // of swapping focus back and forth between two lanes.
                    const overlapFocusStartsRight = Boolean(
                      overlapFocusEvent
                      && overlapFocusEvent.laneCount > 1
                      && overlapFocusEvent.lane / (overlapFocusEvent.laneCount - 1) >= .5,
                    );
                    const overlapFocusStart = overlapFocusStartsRight ? 100 - overlapFocusShare : 0;
                    return (
                    <div
                      className={`day-column ${dayIndex === todayIndex ? "today" : ""} ${preview?.day === dayIndex ? "drop-target" : ""}`}
                      key={day}
                      data-day-index={dayIndex}
                      aria-label={day}
                      onPointerDown={(pointerEvent) => {
                        if (pointerEvent.target !== pointerEvent.currentTarget) return;
                        lastPointerTypeRef.current = pointerEvent.pointerType;
                        blankSlotPressRef.current = {
                          pointerId: pointerEvent.pointerId,
                          day: dayIndex,
                          startX: pointerEvent.clientX,
                          startY: pointerEvent.clientY,
                          moved: false,
                        };
                      }}
                      onPointerMove={(pointerEvent) => {
                        const press = blankSlotPressRef.current;
                        if (!press || press.pointerId !== pointerEvent.pointerId) return;
                        if (Math.hypot(pointerEvent.clientX - press.startX, pointerEvent.clientY - press.startY) > 8) press.moved = true;
                      }}
                      onPointerCancel={(pointerEvent) => {
                        const press = blankSlotPressRef.current;
                        if (press?.pointerId === pointerEvent.pointerId) blankSlotPressRef.current = null;
                      }}
                      onClick={(pointerEvent) => {
                        if (pointerEvent.target !== pointerEvent.currentTarget || activeFilter) return;
                        const press = blankSlotPressRef.current;
                        const safeTap = press?.day === dayIndex && !press.moved;
                        blankSlotPressRef.current = null;
                        lastPointerTypeRef.current = "";
                        if (!safeTap) return;
                        const rect = pointerEvent.currentTarget.getBoundingClientRect();
                        const start = clamp(snap(visualStartMinutes + ((pointerEvent.clientY - rect.top) / hourHeight) * 60), visualStartMinutes, END_MINUTES - 60);
                        openNew(dayIndex, start, scrollRef.current, { clientX: pointerEvent.clientX, clientY: pointerEvent.clientY });
                      }}
                    >
                      <div className="slot-hour-labels" aria-hidden="true">
                        {hours.filter((hour) => hour < visualEndMinutes && !layouts[dayIndex].some((event) => event.start < hour + 60 && event.end > hour)).map((hour) => (
                          <span key={hour} style={{ top: `${((hour - visualStartMinutes) / 60) * hourHeight + 8}px` }}>{formatTime(hour)}</span>
                        ))}
                      </div>
                      {viewMode === "day" && dayIndex === activeDay && activeFilter && layouts[dayIndex].length === 0 && (
                        <p className="filter-empty-state">
                          No {activeFilter === "drive" ? "Drive Time" : activeFilter === "class" ? "Class" : "Soccer"} here — tap the filter again to show all.
                        </p>
                      )}
                      {dayLayout.map((event) => {
                        const top = ((event.start - visualStartMinutes) / 60) * hourHeight;
                        const height = ((event.end - event.start) / 60) * hourHeight;
                        const duration = activityMinutes(event);
                        // A card always shows its own start clock. End time is supporting
                        // detail, so it stays out of the resting card and appears only on
                        // hover or keyboard focus, regardless of its neighbours.
                        const isOverlapFocus = hasOverlapFocus && overlapFocusEvent?.id === event.id;
                        const overlapPeerIndex = overlapPeerIndexes.get(event.id);
                        const isOverlapPeer = overlapPeerIndex !== undefined;
                        // Let the expanded card regain normal content density;
                        // its concurrent neighbors keep the compact lane view.
                        const narrow = event.laneCount > 1 && !isOverlapFocus;
                        const density = duration <= 15 ? "micro" : duration <= 30 ? "compact" : duration <= 90 ? "standard" : "detailed";
                        const artwork = eventArtwork(event);
                        const toolsOpen = eventToolsEvent?.id === event.id;
                        const toolEdges = (["start", "end"] as const).filter((edge) => edge === "start" ? eventToolEdges.start : eventToolEdges.end);
                        const toolsVisible = toolsOpen && toolEdges.length > 0;
                        // Keep the roster to the Figma master’s three vertical rows.
                        // Extra people are summarized rather than creating a second column.
                        // Chips wrap under the name rather than filling a fixed column,
                        // so a narrow card no longer has to drop people to fit.
                        const peopleLimit = event.people.length > 3 ? 2 : 3;
                        const visiblePeople = event.people.slice(0, peopleLimit);
                        const hiddenPeople = Math.max(0, event.people.length - peopleLimit);
                        const showRoster = visiblePeople.length > 0;
                        const longTitle = event.title.length >= 16;
                        const normalLeft = `calc(${(event.lane / event.laneCount) * 100}% + 3px)`;
                        const normalWidth = `calc(${100 / event.laneCount}% - 6px)`;
                        const peerShare = overlapPeers.length ? (100 - overlapFocusShare) / overlapPeers.length : 0;
                        const overlapLeft = isOverlapFocus
                          ? `calc(${overlapFocusStart}% + 3px)`
                          : isOverlapPeer
                            ? `calc(${(overlapFocusStartsRight ? 0 : overlapFocusShare) + (overlapPeerIndex * peerShare)}% + 3px)`
                            : normalLeft;
                        const overlapWidth = isOverlapFocus
                          ? `calc(${overlapFocusShare}% - 6px)`
                          : isOverlapPeer
                            ? `calc(${peerShare}% - 6px)`
                            : normalWidth;
                        // Below EVENT_MIN_HEIGHT a card is held open taller than its own
                        // slot, so in Compact it reaches into the event below it. The
                        // card painted last wins the tap, which would hand a short
                        // event's taps to its neighbour. Lifting only the cards that
                        // actually overflow — most in Compact, none at full size —
                        // keeps every card clickable inside its own bounds. States with
                        // their own stacking keep the z-index the stylesheet gives them.
                        const overflowsSlot = height < EVENT_MIN_HEIGHT;
                        const managedStacking = overflowsSlot && !toolsVisible && !isOverlapFocus && !isOverlapPeer && activeId !== event.id;
                        const style = {
                          top: `${top}px`,
                          height: `${height}px`,
                          left: overlapLeft,
                          width: overlapWidth,
                          ...(managedStacking ? { zIndex: 4 + clamp(Math.ceil(EVENT_MIN_HEIGHT - height), 1, 8) } : {}),
                          ...eventColorTokens(event.color, driveBefore(event), driveAfter(event)),
                          ...eventArtworkTokens(artwork),
                        } as CSSProperties;
                        const ariaLabel = `${event.title}, ${day}, ${formatTime(activityStart(event))} to ${formatTime(activityEnd(event))}${event.people.length ? `, with ${event.people.join(", ")}` : ""}${driveBefore(event) || driveAfter(event) ? `, ${formatDuration(driveBefore(event) + driveAfter(event))} Drive Time` : ""}, ${event.bullets.length} notes`;
                        return (
                          <div
                            className={`calendar-event event--${density} ${narrow ? "event--narrow" : ""} ${longTitle ? "event--long-title" : ""} ${duration < 60 ? "event--short-roster" : ""} ${showRoster ? "event--has-roster" : "event--no-roster"} ${driveBefore(event) > 0 ? "has-drive-before" : ""} ${driveAfter(event) > 0 ? "has-drive-after" : ""} ${toolsVisible ? "event-tools-open" : ""} ${toolsVisible && toolEdges.length === 1 ? "event-tools-single-edge" : ""} ${isOverlapFocus ? "is-overlap-focus" : ""} ${isOverlapPeer ? "is-overlap-peer" : ""} ${activeId === event.id ? "is-dragging" : ""} ${event.tentativeEnd ? "tentative-end" : ""}`}
                            key={event.id}
                            style={style}
                            data-event-id={event.id}
                            role={toolsVisible ? "group" : "button"}
                            tabIndex={toolsVisible ? -1 : 0}
                            aria-label={toolsVisible ? `${ariaLabel}. Time handles, Departure, and add controls shown.` : ariaLabel}
                            aria-describedby="calendar-instructions"
                            aria-keyshortcuts={toolsVisible ? undefined : "Enter Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Shift+F10"}
                            onKeyDown={toolsVisible ? undefined : (keyboardEvent) => keyboardMove(keyboardEvent, event)}
                            onMouseEnter={(mouseEvent) => {
                              setOverlapHoverId(event.id);
                              const rect = mouseEvent.currentTarget.getBoundingClientRect();
                              const edge = mouseEvent.clientY - rect.top < rect.height / 2 ? "start" : "end";
                              scheduleEventToolsOpen(event, mouseEvent.currentTarget, edge);
                            }}
                            onMouseLeave={() => {
                              setOverlapHoverId((current) => current === event.id ? null : current);
                              scheduleEventToolsClose(event.id);
                            }}
                            onFocus={() => setOverlapHoverId(event.id)}
                            onBlur={(blurEvent) => {
                              const nextFocus = blurEvent.relatedTarget as HTMLElement | null;
                              if (!nextFocus || !blurEvent.currentTarget.contains(nextFocus)) {
                                setOverlapHoverId((current) => current === event.id ? null : current);
                                if (toolsVisible) scheduleEventToolsClose(event.id);
                              }
                            }}
                            onPointerDown={(pointerEvent) => {
                              lastPointerTypeRef.current = pointerEvent.pointerType;
                              if (pointerEvent.pointerType === "touch" || pointerEvent.pointerType === "pen") {
                                beginTouchPress(pointerEvent, event);
                                return;
                              }
                              beginInteraction(pointerEvent, event, "move");
                            }}
                            onPointerMove={(pointerEvent) => {
                              if (pointerEvent.pointerType === "touch" || pointerEvent.pointerType === "pen") {
                                if (scrollFromTouchedCard(pointerEvent)) return;
                                const press = touchPressRef.current;
                                if (press && press.pointerId === pointerEvent.pointerId && Math.hypot(pointerEvent.clientX - press.startX, pointerEvent.clientY - press.startY) > 10) {
                                  const deltaX = pointerEvent.clientX - press.startX;
                                  const deltaY = pointerEvent.clientY - press.startY;
                                  cancelTouchPress(pointerEvent);
                                  // The held-card move owns the pointer after its threshold,
                                  // but a quick vertical swipe still needs to behave like an
                                  // ordinary calendar scroll even when it started on an event.
                                  // Manual scrolling keeps that escape hatch available without
                                  // sacrificing reliable long-press dragging.
                                  if (Math.abs(deltaY) > Math.abs(deltaX)) {
                                    touchCardScrollRef.current = { pointerId: pointerEvent.pointerId, lastY: press.startY };
                                    ignoreClickRef.current = event.id;
                                    scrollFromTouchedCard(pointerEvent);
                                  } else {
                                    ignoreClickRef.current = event.id;
                                  }
                                  return;
                                }
                                if (interactionRef.current?.pointerId === pointerEvent.pointerId) moveInteraction(pointerEvent);
                                return;
                              }
                              moveInteraction(pointerEvent);
                            }}
                            onPointerUp={(pointerEvent) => {
                              if (pointerEvent.pointerType === "touch" || pointerEvent.pointerType === "pen") {
                                if (endTouchedCardScroll(pointerEvent)) {
                                  window.setTimeout(() => {
                                    if (ignoreClickRef.current === event.id) ignoreClickRef.current = null;
                                  }, 0);
                                  return;
                                } else if (interactionRef.current?.pointerId === pointerEvent.pointerId) {
                                  endInteraction(pointerEvent);
                                  // Pointer clicks are dispatched after pointerup. Clear the
                                  // held-card guard just after that click has had a chance to
                                  // consume it so it cannot suppress a later, real tap.
                                  window.setTimeout(() => {
                                    if (longPressEventRef.current === event.id) longPressEventRef.current = null;
                                  }, 0);
                                } else {
                                  cancelTouchPress(pointerEvent);
                                }
                                return;
                              }
                              endInteraction(pointerEvent);
                            }}
                            onPointerCancel={(pointerEvent) => {
                              if (pointerEvent.pointerType === "touch" || pointerEvent.pointerType === "pen") {
                                if (endTouchedCardScroll(pointerEvent)) {
                                  // A scroll gesture that the OS cancels must not later be
                                  // mistaken for an event tap.
                                  ignoreClickRef.current = event.id;
                                  window.setTimeout(() => {
                                    if (ignoreClickRef.current === event.id) ignoreClickRef.current = null;
                                  }, 0);
                                } else if (interactionRef.current?.pointerId === pointerEvent.pointerId) cancelInteraction(pointerEvent);
                                else cancelTouchPress(pointerEvent);
                                if (longPressEventRef.current === event.id) longPressEventRef.current = null;
                                return;
                              }
                              cancelInteraction(pointerEvent);
                            }}
                            onClick={(clickEvent) => {
                              if (ignoreClickRef.current === event.id) {
                                ignoreClickRef.current = null;
                                if (longPressEventRef.current === event.id) longPressEventRef.current = null;
                                return;
                              }
                              if (longPressEventRef.current === event.id) {
                                longPressEventRef.current = null;
                                return;
                              }
                              if (lastPointerTypeRef.current === "touch" || lastPointerTypeRef.current === "pen") {
                                lastPointerTypeRef.current = "";
                                if (eventToolsId !== event.id) {
                                  const rect = clickEvent.currentTarget.getBoundingClientRect();
                                  const edge = clickEvent.clientY - rect.top < rect.height / 2 ? "start" : "end";
                                  openEventTools(event, clickEvent.currentTarget, true, edge);
                                  return;
                                }
                              }
                              openEditor(event, clickEvent.currentTarget);
                            }}
                          >
                            {driveBefore(event) > 0 && (
                              <span className="drive-segment drive-before">
                                <span className="drive-segment-label">Leave</span>
                                <strong>{shortTime(event.start)}</strong>
                                <button
                                  type="button"
                                  className={`drive-segment-address${(event.address ?? "").trim() ? "" : " drive-segment-address--empty"}`}
                                  aria-label={(event.address ?? "").trim() ? `Address for ${event.title}: ${event.address}. Shows a map, tap again to start navigation.` : `Add an address for ${event.title}`}
                                  onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                                  onMouseEnter={(mouseEvent) => {
                                    if ((event.address ?? "").trim()) openAddressPreview(mouseEvent.currentTarget, event);
                                  }}
                                  onClick={(clickEvent) => handleAddressClick(clickEvent, event)}
                                >
                                  {(event.address ?? "").trim() || "Add Address"}
                                </button>
                              </span>
                            )}
                            {toolsVisible && (
                              <div
                                id={`event-tools-${event.id}`}
                                className="event-edge-tools-set"
                                role="group"
                                aria-label={`Add an event around ${event.title}`}
                                onMouseEnter={() => keepEventToolsOpen(event.id)}
                                onMouseLeave={() => scheduleEventToolsClose(event.id)}
                              >
                                {toolEdges.map((edge) => {
                                  return (
                                    <div className={`event-edge-tools event-edge-tools--${edge}`} key={edge}>
                                      <button
                                        type="button"
                                        className="event-edge-add"
                                        aria-label={`Add an event ${edge === "start" ? "before" : "after"} ${event.title}`}
                                        title={`Add an event ${edge === "start" ? "before" : "after"}`}
                                        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                                        onClick={(clickEvent) => handleAddAdjacentToolClick(clickEvent, event, edge)}
                                      ><span aria-hidden="true">+</span></button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="event-core">
                              <div className="event-time-rail" aria-hidden={!toolsVisible}>
                                {toolsVisible && toolEdges.map((edge) => {
                                  const mode = edge === "start" ? "resize-start" : "resize-end";
                                  const time = edge === "start" ? activityStart(event) : activityEnd(event);
                                  const direction = edge === "start" ? "earlier" : "later";
                                  const position = edge === "start" ? "before" : "after";
                                  const hourPickerOpen = hourPicker?.eventId === event.id && hourPicker.edge === edge;
                                  return (
                                    <Fragment key={edge}>
                                      <button
                                        type="button"
                                        className={`event-time-handle event-time-handle--${edge}${hourPickerOpen ? " is-hour-picker-open" : ""}`}
                                        aria-label={`Set or drag ${edge} time of ${event.title}, ${formatTime(time)}`}
                                        aria-haspopup="dialog"
                                        aria-expanded={hourPickerOpen}
                                        aria-controls={hourPickerOpen ? "calendar-hour-picker" : undefined}
                                        title={`Click to choose a time, or drag to make ${event.title} ${direction}`}
                                        onPointerDown={(pointerEvent) => beginInteraction(pointerEvent, event, mode, "event", true)}
                                        onPointerMove={moveInteraction}
                                        onPointerUp={endInteraction}
                                        onPointerCancel={cancelInteraction}
                                        onClick={(clickEvent) => openHourPicker(clickEvent, event, edge)}
                                      >
                                        <span className="event-time-clock-value">{shortTime(time)}</span>
                                      </button>
                                      <button
                                        type="button"
                                        className={`event-departure-button event-departure-button--${edge}`}
                                        aria-label={`Add 15 minutes of travel time ${position} ${event.title}`}
                                        title={`Add 15 minutes of travel time ${position}`}
                                        onClick={(clickEvent) => handleEventToolClick(clickEvent, event, edge, "drive")}
                                      >
                                        <span className="event-departure-glyph" aria-hidden="true">
                                          <i className="event-departure-car" />
                                          <i className="event-departure-plus" />
                                        </span>
                                      </button>
                                    </Fragment>
                                  );
                                })}
                                {!toolsVisible && <span className="event-rail-time event-rail-start">{shortTime(activityStart(event))}</span>}
                                {!toolsVisible && (
                                  <span className="event-rail-time event-rail-end event-rail-end--peek">
                                    {shortTime(activityEnd(event))}
                                  </span>
                                )}
                              </div>
                              <div className={`event-main ${artwork ? "has-artwork" : ""}`}>
                                {artwork && <span className="event-artwork-wash" aria-hidden="true" />}
                                {/* One centred stack. The roster used to sit in its own
                                    reserved right-hand column, which pushed the name off
                                    centre and shrank to unreadable colour bars on a narrow
                                    card; as chips under the name it stays legible and the
                                    name gets the full width. */}
                                <div className="event-content">
                                  <strong>{event.title}</strong>
                                  {event.bullets.length > 0 && <span className="event-note">• {event.bullets[0]}</span>}
                                  {showRoster && (
                                    <span className="event-roster" aria-hidden="true">
                                      {visiblePeople.map((person) => (
                                        <span className="person-signature" key={person} style={personColorTokens(person)}><span>{person}</span></span>
                                      ))}
                                      {hiddenPeople > 0 && <span className="person-signature person-signature-overflow"><span>+{hiddenPeople}</span></span>}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {driveAfter(event) > 0 && (
                              <span className="drive-segment drive-after">
                                <span className="drive-segment-label">Arrive</span>
                                <strong>{shortTime(event.end)}</strong>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  })}
                  {viewMode === "week" && activeFilter && filteredEventCount === 0 && (
                    <p className="filter-empty-state filter-empty-state--week">
                      No {activeFilter === "drive" ? "Drive Time" : activeFilter === "class" ? "Class" : "Soccer"} yet — tap the filter again to show all.
                    </p>
                  )}
                  {preview && (
                    <div
                      className={`drag-ghost ${previewConflictCount > 0 ? "drag-ghost--conflict" : ""} ${driveBefore(preview) > 0 ? "has-drive-before" : ""} ${driveAfter(preview) > 0 ? "has-drive-after" : ""}`}
                      style={{
                        top: `${((preview.start - visualStartMinutes) / 60) * hourHeight}px`,
                        height: `${((preview.end - preview.start) / 60) * hourHeight}px`,
                        left: `calc(${(viewMode === "day" ? 0 : (preview.day / dayCount) * 100) + ((previewLane?.lane ?? 0) / (previewLane?.laneCount ?? 1)) * (viewMode === "day" ? 100 : 100 / dayCount)}% + 3px)`,
                        width: `calc(${(viewMode === "day" ? 100 : 100 / dayCount) / (previewLane?.laneCount ?? 1)}% - 6px)`,
                        ...eventColorTokens(preview.color, driveBefore(preview), driveAfter(preview)),
                        ...eventArtworkTokens(previewArtwork),
                      } as CSSProperties}
                      aria-hidden="true"
                    >
                      {driveBefore(preview) > 0 && <i className="ghost-drive ghost-before" />}
                      <div className="ghost-core">
                        <span className="ghost-time-rail"><b>{shortTime(activityStart(preview))}</b><b>{shortTime(activityEnd(preview))}</b></span>
                        <span className={`ghost-main ${previewArtwork ? "has-artwork" : ""}`}><strong>{preview.title}</strong></span>
                      </div>
                      {previewConflictCount > 0 && <span className="drag-ghost-conflict">Overlaps {previewConflictCount} {previewConflictCount === 1 ? "event" : "events"}</span>}
                      {driveAfter(preview) > 0 && <i className="ghost-drive ghost-after" />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="sr-only" id="calendar-scroll-help">{viewMode === "day" ? `Day shows ${visibleDays[activeDay]} only. Use the Day controls or left and right arrow keys to choose another day. Vertical swipes scroll the schedule. ` : `Week shows Monday through ${visibleDays[visibleDays.length - 1]}. On a narrow screen, scroll horizontally to see the remaining days. `}Times appear in empty hour slots, and each event announces its exact start and end. Tap an empty time to add there, or press A to add at 9:00 AM and choose another time in the editor. Select an event to edit. Use the up-arrow in the day header to reveal one earlier hour.</p>
      <p className="sr-only" id="calendar-instructions">Press Enter to edit. On touch, hold a card then drag to move it. Select a card to reveal its start and end time clocks: click a clock to choose a time, drag it to resize, or use the Departure button beside it to add travel time. Hold Alt and use arrow keys to move by day or 15 minutes. Hold Alt and Shift with up or down to resize. Press Shift and F10 for keyboard adjustment actions.</p>
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </main>

      {hourPicker && hourPickerEvent && (
        <div
          id="calendar-hour-picker"
          ref={hourPickerRef}
          className="calendar-hour-picker"
          role="dialog"
          aria-label={`Set ${hourPicker.edge} time for ${hourPickerEvent.title}`}
          style={{
            left: `${hourPickerPosition?.left ?? hourPicker.anchor.left}px`,
            top: `${hourPickerPosition?.top ?? hourPicker.anchor.bottom + 8}px`,
            visibility: hourPickerPosition ? "visible" : "hidden",
            ...eventColorTokens(hourPickerEvent.color),
          } as CSSProperties}
          onPointerDown={(event) => {
            event.stopPropagation();
            keepEventToolsOpen(hourPickerEvent.id);
          }}
          onMouseEnter={() => keepEventToolsOpen(hourPickerEvent.id)}
          onMouseLeave={() => scheduleEventToolsClose(hourPickerEvent.id)}
        >
          <div className="calendar-hour-picker-head">
            <span className="calendar-hour-picker-kicker">{hourPicker.edge === "start" ? "Start time" : "End time"}</span>
            <button type="button" onClick={closeHourPicker} aria-label="Close time picker">×</button>
          </div>
          <div className="calendar-hour-picker-current">
            <span>{hourPickerEvent.title}</span>
            <strong>{formatTime(hourPicker.edge === "start" ? activityStart(hourPickerEvent) : activityEnd(hourPickerEvent))}</strong>
          </div>
          <div className="calendar-hour-picker-options" role="listbox" aria-label={`Available ${hourPicker.edge} times`}>
            {hourPickerTimeOptions.map((time) => {
              const selected = time === (hourPicker.edge === "start" ? activityStart(hourPickerEvent) : activityEnd(hourPickerEvent));
              return (
                <button
                  type="button"
                  key={time}
                  className={selected ? "is-current" : ""}
                  role="option"
                  aria-selected={selected}
                  data-hour-picker-current={selected || undefined}
                  onClick={() => chooseHourPickerTime(hourPickerEvent, hourPicker.edge, time)}
                >{shortTime(time)}</button>
              );
            })}
          </div>
        </div>
      )}

      {addressPreview && addressPreviewEvent && (
        <div
          id="calendar-address-preview"
          ref={addressPreviewRef}
          className="calendar-address-preview"
          role="dialog"
          aria-label={`Map for ${addressPreviewEvent.title}`}
          style={{
            left: `${addressPreviewPosition?.left ?? addressPreview.anchor.left}px`,
            top: `${addressPreviewPosition?.top ?? addressPreview.anchor.bottom + 8}px`,
            visibility: addressPreviewPosition ? "visible" : "hidden",
            ...eventColorTokens(addressPreviewEvent.color),
          } as CSSProperties}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="calendar-address-preview-head">
            <span className="calendar-address-preview-kicker">Address</span>
            <button type="button" onClick={closeAddressPreview} aria-label="Close map preview">×</button>
          </div>
          <div className="calendar-address-preview-map">
            <iframe
              title={`Map for ${addressPreview.address}`}
              src={mapsEmbedUrl(addressPreview.address)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            className="calendar-address-preview-open"
            href={mapsNavigationUrl(addressPreview.address)}
            onClick={(event) => event.stopPropagation()}
          >
            <span>{addressPreview.address}</span>
            <span className="calendar-address-preview-hint">Open in Maps</span>
          </a>
        </div>
      )}

      {actionNotice && !editorOpen && (
        <div className="action-toast">
          <span>{actionNotice}</span>
          {history.length > 0 && !actionNotice.startsWith("Could not") && <button type="button" onClick={undo}>Undo</button>}
          <button type="button" className="toast-close" onClick={() => setActionNotice("")} aria-label="Dismiss message">×</button>
        </div>
      )}

      {resizeSurface && resizeEvent && (
        <div
          className={`resize-surface resize-surface--${resizeSurface.kind}`}
          role="dialog"
          aria-label={`Adjust ${resizeEvent.title}`}
          style={{ left: resizeSurface.left, top: resizeSurface.top, ...eventColorTokens(resizeEvent.color) } as CSSProperties}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeResizeSurface(true);
            }
          }}
        >
          <div className="resize-surface-meta">
            <span className="resize-event-summary">
              <strong>{resizeEvent.title}</strong>
              <span>{shortTime(activityStart(resizeEvent))}–{shortTime(activityEnd(resizeEvent))}</span>
            </span>
            {tagScope(events, resizeEvent).count > 1 && <span>Affects all {tagScope(events, resizeEvent).count} {tagScope(events, resizeEvent).tag} items</span>}
          </div>
          <div className="keyboard-resize-actions">
              {(["start", "end"] as const).map((edge) => {
                const details = extensionDetails(resizeEvent, edge);
                return (
                  <section className="keyboard-edge-group" key={edge} aria-label={`${details.edgeLabel} edge`}>
                    <div className="resize-edge-preview">
                      <span>{details.edgeLabel} edge</span>
                      <strong>{shortTime(details.currentOuter)} <span aria-hidden="true">→</span> {shortTime(details.nextOuter)}</strong>
                    </div>
                    <div className="resize-surface-actions">
                      <button type="button" autoFocus={edge === "start"} className="event-action" onClick={() => nudgeResize(resizeEvent, edge, "event")}><strong>Extend event</strong><span>{details.extendLabel}</span></button>
                      <button type="button" className="drive-action" onClick={() => nudgeResize(resizeEvent, edge, "drive")}><strong>Add Drive Time</strong><span>{details.driveLabel}</span></button>
                    </div>
                  </section>
                );
              })}
          </div>
        </div>
      )}

      {draft && !deleteChoice && (
        <div
          className={`editor-overlay ${quickAddOpen ? "editor-overlay--quick-add" : ""}`}
          role="presentation"
          onPointerDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}
        >
          <div
            className={`event-editor ${quickAddOpen ? "event-editor--quick-add" : ""} ${quickAddPosition ? "event-editor--anchored" : ""}`}
            role="dialog"
            aria-modal={quickAddOpen ? undefined : true}
            aria-labelledby="editor-title"
            ref={dialogRef}
            onKeyDown={handleDialogKeys}
            style={quickAddPosition ? { left: `${quickAddPosition.left}px`, top: `${quickAddPosition.top}px` } : undefined}
          >
            <div className="editor-header">
              <div>
                <p className="eyebrow">FAMILY CALENDAR</p>
                <h2 id="editor-title">{isNew ? "Add event" : "Edit event"}</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeEditor} aria-label="Close editor">×</button>
            </div>

            <div className="editor-body">
              <label className="field field-title">
                <span>Event name</span>
                <input
                  ref={titleInputRef}
                  value={draft.title}
                  onChange={(event) => {
                    setDraft({ ...draft, title: event.target.value });
                    if (titleInvalid && event.target.value.trim()) setFormError("");
                  }}
                  placeholder="What is happening?"
                  required
                  aria-invalid={titleInvalid || undefined}
                  aria-describedby={titleInvalid ? "event-title-error" : undefined}
                  onKeyDown={(event) => {
                    if (quickAddOpen && event.key === "Enter") {
                      event.preventDefault();
                      saveDraft();
                    }
                  }}
                />
              </label>

              {quickAddOpen ? (
                <div className="quick-add-more-row">
                  <label className="field field-address quick-add-address">
                    <span className="sr-only">Address</span>
                    <input
                      value={draft.address ?? ""}
                      onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                      placeholder="Add address"
                    />
                  </label>
                  <button
                    className="quick-add-more"
                    type="button"
                    aria-label="Show more event details"
                    onClick={() => setNewEventDetailsOpen(true)}
                  >
                    <span>More</span>
                    <span className="quick-add-more-chevron" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="editor-details">
                  <label className="field field-address">
                    <span>Address</span>
                    <input
                      value={draft.address ?? ""}
                      onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                      placeholder="Add address"
                    />
                  </label>

                  <label className="field bullet-field">
                    <span>Notes <small>one bullet per line</small></span>
                    <textarea
                      ref={notesInputRef}
                      rows={5}
                      value={draft.bullets.join("\n")}
                      onChange={(event) => setDraft({ ...draft, bullets: event.target.value.split("\n") })}
                      placeholder={"Bring cleats\nPack water\nLeave by 4:00"}
                    />
                  </label>

              <section className="people-field">
                <div className="field-label">People</div>
                <div className="people-editor">
                  {draft.people.map((person, index) => (
                    <span className="person-roster-row" key={`${person}-${index}`} style={personColorTokens(person)}>
                      <span>{person}</span>
                      <button type="button" aria-label={`Remove ${person}`} onClick={() => setDraft({ ...draft, people: draft.people.filter((_, itemIndex) => itemIndex !== index) })}>×</button>
                    </span>
                  ))}
                  <input
                    value={personEntry}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value.endsWith(",")) {
                        const name = value.slice(0, -1).trim();
                        if (name && !draft.people.some((person) => person.toLowerCase() === name.toLowerCase())) setDraft({ ...draft, people: [...draft.people, name] });
                        setPersonEntry("");
                      } else setPersonEntry(value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); addPerson(); }
                      if (event.key === "Backspace" && !personEntry && draft.people.length) setDraft({ ...draft, people: draft.people.slice(0, -1) });
                    }}
                    onBlur={addPerson}
                    placeholder={draft.people.length ? "Add another" : "Add a person"}
                    aria-label="Add a person"
                  />
                </div>
              </section>

              <EditorDisclosure key={`link-${draft.id}`} label="Linked copies" summary={normalizeTag(draft.tag) || "Not linked"} initialOpen={Boolean(normalizeTag(draft.tag))}>
                <div className="disclosure-body">
                  <label className="field tag-field">
                    <span>Tag <small>one hidden sync tag</small></span>
                    <div className="tag-input-wrap">
                      <span aria-hidden="true">#</span>
                      <input
                        value={(draft.tag ?? "").replace(/^#/, "")}
                        onChange={(event) => setDraft({ ...draft, tag: event.target.value, syncNotes: event.target.value.trim() ? draft.syncNotes : false })}
                        onBlur={() => setDraft({ ...draft, tag: normalizeTag(draft.tag), syncNotes: Boolean(normalizeTag(draft.tag) && draft.syncNotes) })}
                        placeholder="type a tag"
                        aria-describedby="tag-help"
                      />
                    </div>
                    <small id="tag-help">
                      Future changes sync across matching tags
                      {normalizeTag(draft.tag) ? ` · ${events.filter((event) => event.id !== draft.id && normalizeTag(event.tag) === normalizeTag(draft.tag)).length} other matched` : ""}.
                    </small>
                  </label>

                  <label className={`sync-notes ${normalizeTag(draft.tag) ? "" : "disabled"}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.syncNotes)}
                      disabled={!normalizeTag(draft.tag)}
                      onChange={(event) => setDraft({ ...draft, syncNotes: event.target.checked })}
                    />
                    <span><strong>Sync notes</strong><small>{normalizeTag(draft.tag) ? `Copy these notes across every ${normalizeTag(draft.tag)} item.` : "Add a tag to enable note syncing."}</small></span>
                  </label>
                </div>
              </EditorDisclosure>

              <div className="field-row three">
                <label className="field">
                  <span>Day</span>
                  <select value={draft.day} onChange={(event) => setDraft({ ...draft, day: Number(event.target.value) })}>
                    {visibleDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Starts</span>
                  <select
                    value={activityStart(draft)}
                    onChange={(event) => {
                      const coreStart = Number(event.target.value);
                      const start = coreStart - driveBefore(draft);
                      const coreEnd = activityEnd(draft);
                      setDraft({ ...draft, start, end: coreEnd <= coreStart ? Math.min(start + 60 + driveBefore(draft) + driveAfter(draft), END_MINUTES) : draft.end });
                    }}
                  >
                    {timeOptions.filter((time) => time >= START_MINUTES + driveBefore(draft) && time < activityEnd(draft)).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Ends</span>
                  <select value={activityEnd(draft)} onChange={(event) => setDraft({ ...draft, end: Number(event.target.value) + driveAfter(draft), tentativeEnd: false })}>
                    {timeOptions.filter((time) => time > activityStart(draft) && time <= END_MINUTES - driveAfter(draft)).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                  </select>
                </label>
              </div>

              <fieldset className="color-field">
                <legend>Color</legend>
                <div className="color-row">
                  {COLORS.map((color) => (
                    <button
                      className={draft.color === color.value ? "selected" : ""}
                      key={color.value}
                      type="button"
                      style={{ "--swatch": color.value } as CSSProperties}
                      aria-label={`${color.name}${draft.color === color.value ? ", selected" : ""}`}
                      aria-pressed={draft.color === color.value}
                      onClick={() => setDraft({ ...draft, color: color.value })}
                    ><span /></button>
                  ))}
                  <label className="custom-color" title="Choose a custom color">
                    <span>＋</span>
                    <input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} aria-label="Custom event color" />
                  </label>
                </div>
              </fieldset>

                </div>
              )}

              {formError && <p className="form-error" id={titleInvalid ? "event-title-error" : undefined} role="alert">{formError}</p>}
            </div>

            <div className={`editor-footer ${quickAddOpen ? "editor-footer--quick-add" : ""}`}>
              {!isNew && <button className="button button-danger" type="button" onClick={deleteDraft}>Delete</button>}
              {!isNew && <button className="button button-quiet duplicate" type="button" onClick={duplicateDraft}>Duplicate</button>}
              <div className="footer-spacer" />
              <button className="button button-quiet" type="button" onClick={closeEditor}>Cancel</button>
              <button className="button button-primary" type="button" onClick={saveDraft}>{isNew ? "Add event" : draftScopeCount > 1 ? `Save to ${draftScopeCount} linked` : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteChoice && (() => {
        const tag = normalizeTag(deleteChoice.event.tag);
        const count = deleteChoice.matchingIds.length;
        return (
          <div className="choice-overlay" role="presentation">
            <div className="choice-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-choice-title" ref={choiceRef} onKeyDown={handleChoiceKeys}>
              <p className="eyebrow">LINKED COPIES</p>
              <h2 id="delete-choice-title">Delete linked event</h2>
              <p><strong>{deleteChoice.event.title}</strong> is linked to {count - 1} other {tag} {count === 2 ? "item" : "items"}.</p>
              <div className="choice-actions three">
                <button className="button button-quiet" type="button" data-autofocus onClick={() => { setDeleteChoice(null); requestAnimationFrame(() => titleInputRef.current?.focus()); }}>Cancel</button>
                <button className="button button-danger" type="button" onClick={() => confirmDelete(false)}>Delete this</button>
                <button className="button button-danger solid" type="button" onClick={() => confirmDelete(true)}>Delete all {tag}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {pendingDriveChoice && (
        <div className="choice-overlay mobile-choice" role="presentation">
          <div className="choice-dialog" role="dialog" aria-modal="true" aria-labelledby="drive-choice-title" ref={choiceRef} onKeyDown={handleChoiceKeys}>
            <p className="eyebrow">ADDED TIME</p>
            <h2 id="drive-choice-title">What should this time be?</h2>
            <p>You added <strong>{formatMinuteDuration(pendingDriveChoice.mode === "resize-start" ? pendingDriveChoice.origin.start - pendingDriveChoice.finalEvent.start : pendingDriveChoice.finalEvent.end - pendingDriveChoice.origin.end)}</strong> at the {pendingDriveChoice.mode === "resize-start" ? "start" : "end"} of <strong>{pendingDriveChoice.finalEvent.title}</strong>.{tagScope(events, pendingDriveChoice.origin).count > 1 ? ` This updates all ${tagScope(events, pendingDriveChoice.origin).count} ${tagScope(events, pendingDriveChoice.origin).tag} items.` : ""}</p>
            <div className="drive-choice-preview" aria-hidden="true">
              <span>{pendingDriveChoice.mode === "resize-start" ? shortTime(pendingDriveChoice.finalEvent.start) : shortTime(activityEnd(pendingDriveChoice.origin))}</span>
              <i />
              <strong>{pendingDriveChoice.mode === "resize-start" ? shortTime(activityStart(pendingDriveChoice.origin)) : shortTime(pendingDriveChoice.finalEvent.end)}</strong>
            </div>
            <div className="choice-actions drive-choice-actions">
              <button className="button button-quiet drive-choice-option" type="button" onClick={() => resolveDriveChoice(false)}><strong>Event time</strong><span>Count it as part of the event</span></button>
              <button className="button button-primary drive-choice-option" type="button" data-autofocus onClick={() => resolveDriveChoice(true)}><strong>Drive Time</strong><span>Transparent travel time, excluded from event hours</span></button>
              <button className="button button-quiet drive-choice-cancel" type="button" onClick={() => { setPendingDriveChoice(null); setAnnouncement("Resize cancelled"); requestAnimationFrame(() => resizeReturnFocusRef.current?.focus({ preventScroll: true })); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
