#!/usr/bin/env node
/**
 * Rendered-geometry check for the event card family.
 *
 * The rest of the suite reads source text, which cannot see layout — that is how
 * "overlapping events render no name" shipped green. This drives a real Chrome
 * over the DevTools Protocol and asserts against measured boxes instead.
 *
 * It is deliberately not part of `npm test`, because it needs a browser and a
 * running dev server. Run it before touching card CSS:
 *
 *   npm run dev                 # in one shell
 *   node scripts/verify-card-geometry.mjs   # in another
 *
 * Environment:
 *   APP_URL     default http://localhost:5173
 *   CHROME      path to chrome, if it is not in a standard location
 *   CDP_PORT    default 9222
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const CDP_PORT = Number(process.env.CDP_PORT || 9222);

const CHROME_CANDIDATES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

/** Events that create 2-, 3- and 4-way overlaps on the otherwise empty Friday. */
const OVERLAP_FIXTURE = (() => {
  const at = (id, title, start, end, color, people) => ({
    id, title, day: 4, start, end, color, bullets: [], people, town: false, kind: "fixed",
  });
  return [
    at("geo-2a", "Piano lesson", 540, 600, "#77558f", ["Lelemeca"]),
    at("geo-2b", "Dentist", 570, 630, "#b45d49", ["Jack"]),
    at("geo-3a", "Albion soccer", 660, 750, "#3c6fb0", ["Jack", "Blue"]),
    at("geo-3b", "Gulf Coast soccer", 675, 735, "#287a82", ["Blue"]),
    at("geo-3c", "Dance", 690, 720, "#ad5f78", ["Lelemeca"]),
    at("geo-4a", "Agility training", 840, 960, "#b45d49", ["Jack", "Blue"]),
    at("geo-4b", "Boy Scouts troop meeting", 855, 945, "#6e7745", ["Jack"]),
    at("geo-4c", "Music class", 870, 930, "#77558f", ["Lelemeca"]),
    at("geo-4d", "Church group", 885, 915, "#5f8462", ["Bob"]),
  ];
})();

/**
 * Every visible card must show its name: either the whole name, or a box with
 * room for a meaningful prefix. And no name may be cut off vertically.
 */
const MEASURE = `(() => {
  const rows = [];
  for (const card of document.querySelectorAll('.calendar-event')) {
    const box = card.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const name = card.querySelector('.event-content strong');
    const content = card.querySelector('.event-content');
    if (!name || !content) { rows.push({ event: 'unknown', missingName: true }); continue; }
    const contentWidth = content.getBoundingClientRect().width;
    const fontSize = parseFloat(getComputedStyle(name).fontSize);
    const lineHeight = parseFloat(getComputedStyle(name).lineHeight) || fontSize;
    const wholeNameShown =
      name.scrollWidth <= name.clientWidth + 1 &&
      Math.round(name.scrollHeight / lineHeight) <= Math.round(name.clientHeight / lineHeight);
    rows.push({
      event: (card.getAttribute('aria-label') || '').split(',')[0],
      cardWidth: Math.round(box.width),
      contentWidth: Math.round(contentWidth),
      ems: Math.round((10 * contentWidth) / fontSize) / 10,
      wholeNameShown,
      verticallyClipped:
        Math.round(name.scrollHeight / lineHeight) > Math.round(name.clientHeight / lineHeight),
      readable: wholeNameShown || contentWidth >= 5 * fontSize,
    });
  }
  return rows;
})()`;

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 0;
  const open = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = (message) => {
    const frame = JSON.parse(message.data);
    const waiter = pending.get(frame.id);
    if (!waiter) return;
    pending.delete(frame.id);
    if (frame.error) waiter.reject(new Error(frame.error.message));
    else waiter.resolve(frame.result);
  };
  const send = async (method, params = {}) => {
    await open;
    const id = (nextId += 1);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  };
  return {
    send,
    close: () => socket.close(),
    async evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    async goto(url) {
      await send("Page.enable");
      await send("Page.navigate", { url });
      await new Promise((r) => setTimeout(r, 2400));
    },
    viewport: (width, height, mobile) =>
      send("Emulation.setDeviceMetricsOverride", {
        width, height, mobile, deviceScaleFactor: 1, screenWidth: width, screenHeight: height,
      }),
  };
}

async function attach() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const tabs = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((r) => r.json());
      const page = tabs.find((tab) => tab.type === "page");
      if (page) return connect(page.webSocketDebuggerUrl);
    } catch {
      // Chrome is still starting.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no debuggable page on port ${CDP_PORT}`);
}

async function main() {
  const response = await fetch(APP_URL).catch(() => null);
  if (!response || !response.ok) {
    console.error(`No app at ${APP_URL}. Start it with \`npm run dev\`, or set APP_URL.`);
    process.exit(2);
  }

  const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!chrome) {
    console.error("Could not find Chrome. Set CHROME to its path.");
    process.exit(2);
  }

  const profile = mkdtempSync(join(tmpdir(), "card-geometry-"));
  const browser = spawn(chrome, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    APP_URL,
  ], { stdio: "ignore" });

  let failures = 0;
  try {
    const page = await attach();
    const cases = [
      { label: "390px day, default density", width: 390, height: 844, mobile: true, compact: false },
      { label: "390px day, Compact", width: 390, height: 844, mobile: true, compact: true },
      { label: "320px day, default density", width: 320, height: 700, mobile: true, compact: false },
      { label: "1280px day, default density", width: 1280, height: 900, mobile: false, compact: false },
    ];

    for (const testCase of cases) {
      await page.viewport(testCase.width, testCase.height, testCase.mobile);
      await page.goto(APP_URL);
      await page.evaluate(
        `localStorage.setItem('family-weekly-calendar:v1', JSON.stringify({ version: 1, events: ${JSON.stringify(OVERLAP_FIXTURE)} }));` +
        `localStorage.setItem('family-weekly-calendar:settings:v1', JSON.stringify({ dayCount: 5, viewMode: 'day', activeDay: 4, compact: ${testCase.compact} })); 'ok'`,
      );
      await page.goto(APP_URL);

      const rows = await page.evaluate(MEASURE);
      const bad = rows.filter((row) => row.missingName || !row.readable || row.verticallyClipped);
      failures += bad.length;

      console.log(`\n${testCase.label} — ${rows.length} cards, ${bad.length} failing`);
      for (const row of bad) {
        console.log(`  FAIL ${row.event}: box ${row.contentWidth}px (${row.ems}em)` +
          `${row.verticallyClipped ? ", name cut off vertically" : ""}`);
      }
    }
  } finally {
    browser.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
  }

  if (failures > 0) {
    console.error(`\n${failures} card(s) do not show their name. See the container queries at the end of app/globals.css.`);
    process.exit(1);
  }
  console.log("\nEvery visible card shows its name at every tested size.");
}

await main();
