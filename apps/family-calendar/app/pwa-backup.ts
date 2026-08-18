export const CALENDAR_STORAGE_KEY = "family-weekly-calendar:v1";
export const SETTINGS_STORAGE_KEY = "family-weekly-calendar:settings:v1";
export const RECOVERY_STORAGE_KEY = "family-weekly-calendar:recovery:v1";

const BACKUP_LIMIT = 2_000_000;
const ALL_DAY_COUNT = 6;
const START_MINUTES = 4 * 60;
const END_MINUTES = 22 * 60;
const SNAP_MINUTES = 15;

type BackupEvent = {
  id?: unknown;
  title?: unknown;
  day?: unknown;
  start?: unknown;
  end?: unknown;
  color?: unknown;
  bullets?: unknown;
  people?: unknown;
  town?: unknown;
  kind?: unknown;
  tentativeEnd?: unknown;
  tag?: unknown;
  syncNotes?: unknown;
  driveBefore?: unknown;
  driveAfter?: unknown;
};

function isFiniteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBackupEvent(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const event = value as BackupEvent;
  const before = event.driveBefore ?? 0;
  const after = event.driveAfter ?? 0;
  return typeof event.id === "string" &&
    typeof event.title === "string" &&
    Number.isInteger(event.day) && (event.day as number) >= 0 && (event.day as number) < ALL_DAY_COUNT &&
    typeof event.start === "number" && Number.isFinite(event.start) && event.start >= START_MINUTES &&
    typeof event.end === "number" && Number.isFinite(event.end) && event.end <= END_MINUTES && event.end > event.start &&
    typeof event.color === "string" &&
    Array.isArray(event.bullets) && event.bullets.every((item) => typeof item === "string") &&
    Array.isArray(event.people) && event.people.every((item) => typeof item === "string") &&
    typeof event.town === "boolean" &&
    (event.kind === "routine" || event.kind === "fixed" || event.kind === "flexible") &&
    (event.tentativeEnd === undefined || typeof event.tentativeEnd === "boolean") &&
    (event.tag === undefined || typeof event.tag === "string") &&
    (event.syncNotes === undefined || typeof event.syncNotes === "boolean") &&
    isFiniteNonNegative(before) && isFiniteNonNegative(after) &&
    (event.end as number) - (event.start as number) - (before as number) - (after as number) >= SNAP_MINUTES;
}

function isBackupSettings(value: string) {
  const settings = JSON.parse(value) as { dayCount?: unknown; viewMode?: unknown; activeDay?: unknown };
  return Number.isInteger(settings.dayCount) &&
    (settings.dayCount as number) >= 1 && (settings.dayCount as number) <= ALL_DAY_COUNT &&
    (settings.viewMode === "week" || settings.viewMode === "day") &&
    Number.isInteger(settings.activeDay) &&
    (settings.activeDay as number) >= 0 &&
    (settings.activeDay as number) < (settings.dayCount as number);
}

export function makeCalendarBackup(calendar: string | null, settings: string | null) {
  return JSON.stringify({
    format: "family-calendar-backup",
    version: 1,
    calendar,
    settings,
    exportedAt: new Date().toISOString(),
  });
}

export function validateCalendarBackup(value: string) {
  try {
    if (!value || value.length > BACKUP_LIMIT) throw new Error("This backup is empty or too large.");
    const backup = JSON.parse(value) as {
      format?: unknown;
      version?: unknown;
      calendar?: unknown;
      settings?: unknown;
    };
    if (backup.format !== "family-calendar-backup" || backup.version !== 1 || typeof backup.calendar !== "string") {
      throw new Error("This is not an Our Week backup.");
    }
    const calendar = JSON.parse(backup.calendar) as { version?: unknown; events?: unknown };
    if (calendar.version !== 1 || !Array.isArray(calendar.events) || !calendar.events.every(isBackupEvent)) {
      throw new Error("This backup contains invalid calendar events.");
    }
    if (backup.settings !== null && typeof backup.settings !== "string") throw new Error("This backup has invalid settings.");
    if (typeof backup.settings === "string" && !isBackupSettings(backup.settings)) throw new Error("This backup has invalid settings.");
    return { calendar: backup.calendar, settings: backup.settings as string | null };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("This is not an Our Week backup.");
    throw error;
  }
}
