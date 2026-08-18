#!/usr/bin/env node
/**
 * Is the live calendar serving the commit that is built in dist/?
 *
 * A publish can report success while the old build is still served — that has
 * happened here. This compares the content-hashed asset names the live site
 * loads against the ones this build emits, so the answer does not depend on
 * remembering which marker string belongs to which release.
 *
 *   npm run build && node scripts/check-live-build.mjs
 *
 * Exit codes: 0 already live · 1 stale, promote needed · 2 could not tell.
 */
import { pathToFileURL } from "node:url";

const SITE = process.env.SITE || "https://family-weekly-calendar.operations644647.chatgpt.site";

const assetsOf = (html) =>
  [...new Set([...html.matchAll(/\/assets\/[^"']+/g)].map((m) => m[0]))].sort();

async function liveAssets() {
  const response = await fetch(SITE);
  if (!response.ok) throw new Error(`${SITE} returned ${response.status}`);
  return assetsOf(await response.text());
}

async function localAssets() {
  const url = pathToFileURL(`${process.cwd()}/dist/server/index.js`);
  url.searchParams.set("t", String(Date.now()));
  const { default: worker } = await import(url.href);
  const response = await worker.fetch(
    new Request("http://local/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  return assetsOf(await response.text());
}

try {
  const [live, local] = await Promise.all([liveAssets(), localAssets()]);
  const onlyLocal = local.filter((a) => !live.includes(a));
  const onlyLive = live.filter((a) => !local.includes(a));
  const same = onlyLocal.length === 0 && onlyLive.length === 0;

  console.log(`local build: ${local.length} assets   live: ${live.length} assets`);
  if (!same) {
    console.log(`only in this build: ${onlyLocal.length}`);
    console.log(`only on the live site: ${onlyLive.length}`);
  }
  console.log(
    same
      ? "\nALREADY LIVE — the site is serving this build."
      : "\nSTALE — the live site is running a different build. Promote needed.",
  );
  process.exit(same ? 0 : 1);
} catch (error) {
  console.error(`Could not compare builds: ${error.message}`);
  console.error("Build first with `npm run build`, and check the site is reachable.");
  process.exit(2);
}
