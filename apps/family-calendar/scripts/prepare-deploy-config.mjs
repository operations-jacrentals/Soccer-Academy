#!/usr/bin/env node
/**
 * Rewrite the generated Worker config for a real deploy.
 *
 * `npm run build` emits `dist/server/wrangler.json` with the local placeholder
 * D1 id and the app's local name. This fills in the environment's real worker
 * name, the resolved database id, the migrations directory, and the access
 * settings the calendar API reads at runtime.
 *
 * It lives here rather than as an inline jq expression in the workflow so it can
 * be run and verified locally with the same code CI uses:
 *
 *   npm run build
 *   CALENDAR_WORKER=family-calendar-staging \
 *   CALENDAR_D1_NAME=wall-ball-calendar-staging \
 *   CALENDAR_D1_ID=00000000-0000-4000-8000-000000000000 \
 *     node scripts/prepare-deploy-config.mjs
 *   npx wrangler deploy -c dist/server/wrangler.json --dry-run
 *
 * Environment:
 *   CALENDAR_WORKER              required, the deployed Worker name
 *   CALENDAR_D1_NAME             required, the D1 database name
 *   CALENDAR_D1_ID               required, the resolved D1 database id
 *   CALENDAR_ALLOWED_EMAILS      optional, comma-separated allowlist
 *   CALENDAR_HOUSEHOLDS          optional, JSON map of email to household
 *   CALENDAR_DEFAULT_HOUSEHOLD   optional, household for everyone else
 */
import { readFile, writeFile } from "node:fs/promises";

const CONFIG = new URL("../dist/server/wrangler.json", import.meta.url);
const PLACEHOLDER_D1_ID = "00000000-0000-4000-8000-000000000000";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. See docs/calendar-deploy.md.`);
    process.exit(1);
  }
  return value;
}

const worker = required("CALENDAR_WORKER");
const databaseName = required("CALENDAR_D1_NAME");
const databaseId = required("CALENDAR_D1_ID");

if (databaseId === PLACEHOLDER_D1_ID && process.env.ALLOW_PLACEHOLDER_D1 !== "1") {
  console.error(
    "CALENDAR_D1_ID is still the local placeholder. Resolve the real id with " +
    "`wrangler d1 list`, or set ALLOW_PLACEHOLDER_D1=1 for a dry run.",
  );
  process.exit(1);
}

const config = JSON.parse(await readFile(CONFIG, "utf8"));

config.name = worker;
config.topLevelName = worker;
config.d1_databases = [{
  binding: "DB",
  database_name: databaseName,
  database_id: databaseId,
  // Relative to this config file, which sits in dist/server.
  migrations_dir: "../../drizzle",
}];

/** Only set what was actually provided: an empty var would read as configured. */
const vars = {};
for (const [key, value] of [
  ["CALENDAR_ALLOWED_EMAILS", process.env.CALENDAR_ALLOWED_EMAILS],
  ["CALENDAR_HOUSEHOLDS", process.env.CALENDAR_HOUSEHOLDS],
  ["CALENDAR_DEFAULT_HOUSEHOLD", process.env.CALENDAR_DEFAULT_HOUSEHOLD],
]) {
  const trimmed = value?.trim();
  if (trimmed) vars[key] = trimmed;
}
config.vars = vars;

if (vars.CALENDAR_HOUSEHOLDS) {
  try {
    JSON.parse(vars.CALENDAR_HOUSEHOLDS);
  } catch {
    console.error("CALENDAR_HOUSEHOLDS is not valid JSON; the API would reject every request.");
    process.exit(1);
  }
}

await writeFile(CONFIG, `${JSON.stringify(config, null, 2)}\n`);

console.log(`Worker           ${config.name}`);
console.log(`D1               ${databaseName} (${databaseId.slice(0, 8)}…)`);
console.log(`Runtime settings ${Object.keys(vars).length ? Object.keys(vars).join(", ") : "none (any signed-in visitor, household \"family\")"}`);
