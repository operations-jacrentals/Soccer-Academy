#!/usr/bin/env node
/**
 * Move the calendar onto your own Cloudflare account, in one run.
 *
 * This exists so the calendar does not depend on a hosting control plane that
 * only a third party can operate. Everything here uses your own `wrangler login`
 * session — no API tokens, no repository secrets, no GitHub environments.
 *
 *   npx wrangler login                        # once, in a browser
 *   node scripts/deploy-to-cloudflare.mjs     # everything else
 *
 * It is safe to re-run: the database is only created if missing, migrations are
 * tracked by wrangler, and existing events are never overwritten unless you pass
 * --import.
 *
 * Options
 *   --name <worker>      Worker name. Default: family-calendar
 *   --database <name>    D1 database name. Default: wall-ball-calendar
 *   --import <file.json> Seed the new database from a saved calendar export.
 *                        Refuses if the target already has events, unless
 *                        --force is also given.
 *   --force              Allow --import to replace existing events.
 *   --dry-run            Show what would happen without deploying.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : args[at + 1];
};
const has = (name) => args.includes(`--${name}`);

const WORKER = flag("name", "family-calendar");
const DATABASE = flag("database", "wall-ball-calendar");
const IMPORT_FILE = flag("import");
const DRY_RUN = has("dry-run");
const FORCE = has("force");

/** Fields that belong on a stored event. Anything else is layout the app recomputes. */
const EVENT_FIELDS = [
  "id", "title", "day", "start", "end", "color", "bullets", "people",
  "town", "kind", "tentativeEnd", "tag", "syncNotes", "driveBefore", "driveAfter",
];

function wrangler(argv, { capture = true, allowFailure = false } = {}) {
  try {
    const out = execFileSync("npx", ["wrangler", ...argv], {
      encoding: "utf8",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: process.platform === "win32",
    });
    return out ?? "";
  } catch (error) {
    if (allowFailure) return "";
    const detail = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`wrangler ${argv.join(" ")} failed:\n${detail || error.message}`);
  }
}

function step(message) {
  console.log(`\n== ${message}`);
}

function requireLogin() {
  step("Checking your Cloudflare login");
  const who = wrangler(["whoami"], { allowFailure: true });
  if (!who || /not authenticated/i.test(who)) {
    console.error(
      "\nYou are not logged in to Cloudflare.\n" +
      "Run this once, approve it in the browser, then run this script again:\n\n" +
      "  npx wrangler login\n",
    );
    process.exit(2);
  }
  const account = who.split("\n").find((line) => /account/i.test(line));
  console.log(account ? account.trim() : "Logged in.");
}

function ensureDatabase() {
  step(`Making sure the D1 database "${DATABASE}" exists`);
  const listed = wrangler(["d1", "list", "--json"], { allowFailure: true });
  let existing = null;
  try {
    existing = JSON.parse(listed || "[]").find((db) => db.name === DATABASE) ?? null;
  } catch {
    existing = null;
  }
  if (existing) {
    console.log(`Already there (${(existing.uuid || existing.id || "").slice(0, 8)}…).`);
    return existing.uuid || existing.id;
  }
  if (DRY_RUN) {
    console.log("Would create it.");
    return "00000000-0000-4000-8000-000000000000";
  }
  wrangler(["d1", "create", DATABASE], { capture: false });
  const after = JSON.parse(wrangler(["d1", "list", "--json"]));
  const created = after.find((db) => db.name === DATABASE);
  if (!created) throw new Error(`Created "${DATABASE}" but could not find it afterwards.`);
  console.log("Created.");
  return created.uuid || created.id;
}

function build(databaseId) {
  step("Building");
  execFileSync("npm", ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });

  step("Preparing the Worker configuration");
  execFileSync("node", ["scripts/prepare-deploy-config.mjs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      CALENDAR_WORKER: WORKER,
      CALENDAR_D1_NAME: DATABASE,
      CALENDAR_D1_ID: databaseId,
      ALLOW_PLACEHOLDER_D1: DRY_RUN ? "1" : "",
    },
  });
}

function migrateAndDeploy() {
  const config = ["-c", "dist/server/wrangler.json"];
  if (DRY_RUN) {
    step("Dry run — checking the deploy plan only");
    wrangler(["deploy", ...config, "--dry-run", "--outdir", "dist/.dry"], { capture: false });
    return null;
  }
  step("Applying database migrations");
  wrangler(["d1", "migrations", "apply", "DB", "--remote", ...config], { capture: false });

  step("Deploying");
  const out = wrangler(["deploy", ...config]);
  console.log(out.trim());
  const url = (out.match(/https:\/\/[^\s]+\.workers\.dev/) || [])[0];
  return url ?? null;
}

/** Reduce a stored event to the fields the app actually persists. */
function canonical(event) {
  const clean = {};
  for (const field of EVENT_FIELDS) {
    if (event[field] !== undefined) clean[field] = event[field];
  }
  return clean;
}

async function importEvents(url) {
  step(`Importing events from ${IMPORT_FILE}`);
  const parsed = JSON.parse(readFileSync(IMPORT_FILE, "utf8"));
  const events = (parsed.events ?? parsed).map(canonical);
  if (!events.length) throw new Error("That export contains no events.");

  const current = await fetch(`${url}/api/calendar`).then((r) => r.json());
  if (current.events?.length && !FORCE) {
    console.error(
      `\nRefusing to import: ${url} already holds ${current.events.length} event(s).\n` +
      "Re-run with --force if you really mean to replace them.\n",
    );
    process.exit(3);
  }

  const response = await fetch(`${url}/api/calendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "replace", events }),
  });
  if (!response.ok) {
    throw new Error(`Import failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  const saved = await response.json();
  console.log(`Imported ${saved.events.length} events (revision ${saved.revision}).`);
}

async function verify(url) {
  step(`Checking ${url}`);
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const page = await fetch(url);
      const html = await page.text();
      const api = await fetch(`${url}/api/calendar`);
      const data = await api.json();
      if (page.ok && html.includes("planner-app") && api.ok) {
        console.log(`Page ${page.status}, calendar rendered, ${data.events.length} events stored.`);
        return true;
      }
      console.log(`Attempt ${attempt}: page ${page.status}, api ${api.status}. Retrying.`);
    } catch (error) {
      console.log(`Attempt ${attempt}: ${error.message}. Retrying.`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

async function main() {
  requireLogin();
  const databaseId = ensureDatabase();
  build(databaseId);
  const url = migrateAndDeploy();

  if (DRY_RUN) {
    console.log("\nDry run complete. Nothing was deployed.");
    return;
  }
  if (!url) {
    console.error("\nDeployed, but the Worker URL could not be read from the output.");
    process.exit(1);
  }
  if (IMPORT_FILE) await importEvents(url);

  const ok = await verify(url);
  console.log(
    ok
      ? `\nLive at ${url}\nOpen it on both phones — edits sync through the shared database.`
      : `\nDeployed to ${url}, but it did not answer as expected. Check the Cloudflare dashboard.`,
  );
  process.exit(ok ? 0 : 1);
}

await main();
