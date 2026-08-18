/**
 * Reading the hosting platform's identity headers.
 *
 * Deliberately free of framework imports so the API route, the server
 * components in `chatgpt-auth.ts`, and the tests can all share it.
 */

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export const USER_EMAIL_HEADER = "oai-authenticated-user-email";
export const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
export const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

/** The subset of Headers this module needs, so route handlers and `next/headers` both fit. */
export type ReadableHeaders = { get(name: string): string | null };

export function readChatGPTUserFromHeaders(requestHeaders: ReadableHeaders): ChatGPTUser | null {
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return { displayName: fullName ?? email, email, fullName };
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
