import { readChatGPTUserFromHeaders, type ChatGPTUser } from "./chatgpt-identity";

/**
 * Who may read and write a calendar, and which calendar row they get.
 *
 * The hosting platform authenticates the request and forwards the signed-in
 * identity as headers; this module turns that identity into an authorization
 * decision and a storage key. Nothing here trusts the client: the calendar id
 * is derived from the verified email, never read from the request body.
 */

/** The row the original single-household deployment has always written to. */
export const LEGACY_CALENDAR_ID = "family";

const HOUSEHOLD_PATTERN = /^[a-z0-9_-]{1,64}$/;

export type CalendarAccess = {
  user: ChatGPTUser;
  calendarId: string;
};

export class CalendarAccessError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CalendarAccessError";
    this.status = status;
  }
}

/** The environment values this module reads. All are optional. */
export type CalendarAccessEnv = {
  CALENDAR_ALLOWED_EMAILS?: string;
  CALENDAR_HOUSEHOLDS?: string;
  CALENDAR_DEFAULT_HOUSEHOLD?: string;
  CALENDAR_DEV_EMAIL?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseEmailList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map(normalizeEmail).filter(Boolean);
}

function parseHouseholds(value: string | undefined): Map<string, string> {
  const households = new Map<string, string>();
  if (!value) return households;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new CalendarAccessError("CALENDAR_HOUSEHOLDS is not valid JSON.", 500);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CalendarAccessError("CALENDAR_HOUSEHOLDS must be a JSON object of email to household.", 500);
  }

  for (const [email, household] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof household !== "string" || !HOUSEHOLD_PATTERN.test(household)) {
      throw new CalendarAccessError(
        `CALENDAR_HOUSEHOLDS has an invalid household for ${email}. Use 1-64 characters of a-z, 0-9, hyphen, or underscore.`,
        500,
      );
    }
    households.set(normalizeEmail(email), household);
  }
  return households;
}

function resolveDefaultHousehold(env: CalendarAccessEnv): string {
  const configured = env.CALENDAR_DEFAULT_HOUSEHOLD?.trim();
  if (!configured) return LEGACY_CALENDAR_ID;
  if (!HOUSEHOLD_PATTERN.test(configured)) {
    throw new CalendarAccessError(
      "CALENDAR_DEFAULT_HOUSEHOLD must be 1-64 characters of a-z, 0-9, hyphen, or underscore.",
      500,
    );
  }
  return configured;
}

/**
 * Development only. Vite replaces `import.meta.env.DEV` at build time, so this
 * branch is removed from the production bundle and cannot be switched on by a
 * misconfigured environment variable.
 */
function developmentUser(env: CalendarAccessEnv): ChatGPTUser | null {
  if (!import.meta.env.DEV) return null;
  const email = normalizeEmail(env.CALENDAR_DEV_EMAIL ?? "dev@localhost");
  return { displayName: email, email, fullName: null };
}

/**
 * Identify the caller, confirm they are allowed in, and return the calendar
 * row that belongs to them. Throws `CalendarAccessError` when the request has
 * no identity or the identity is not permitted.
 */
export function resolveCalendarAccess(
  requestHeaders: { get(name: string): string | null },
  env: CalendarAccessEnv,
): CalendarAccess {
  const user = readChatGPTUserFromHeaders(requestHeaders) ?? developmentUser(env);
  if (!user) {
    throw new CalendarAccessError("Sign in to open the family calendar.", 401);
  }

  const email = normalizeEmail(user.email);
  const allowed = parseEmailList(env.CALENDAR_ALLOWED_EMAILS);
  if (allowed.length > 0 && !allowed.includes(email)) {
    throw new CalendarAccessError("This account does not have access to the family calendar.", 403);
  }

  const households = parseHouseholds(env.CALENDAR_HOUSEHOLDS);
  const calendarId = households.get(email) ?? resolveDefaultHousehold(env);

  return { user: { ...user, email }, calendarId };
}
