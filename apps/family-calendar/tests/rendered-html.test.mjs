import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, />WALL BALL</);
  assert.doesNotMatch(html, />\s*Install\s*</i);
  assert.doesNotMatch(html, />\s*4 days\s*</i);
  assert.doesNotMatch(html, /data-add-event|day-nav/);
  assert.match(html, /install-app-button/);
  assert.match(html, />\s*App data\s*</i);
  assert.match(html, /<link(?=[^>]*\brel=["']manifest["'])(?=[^>]*\bhref=["']\/manifest\.webmanifest["'])[^>]*>/i);
  assert.match(html, /<link(?=[^>]*\brel=["']apple-touch-icon["'])(?=[^>]*\bhref=["']\/apple-touch-icon\.png["'])[^>]*>/i);
  assert.match(html, /<meta(?=[^>]*\bname=["']apple-mobile-web-app-capable["'])(?=[^>]*\bcontent=["']yes["'])[^>]*>/i);
  assert.match(html, /<meta(?=[^>]*\bname=["']apple-mobile-web-app-title["'])(?=[^>]*\bcontent=["']Our Week["'])[^>]*>/i);
  assert.match(html, /<meta(?=[^>]*\bname=["']theme-color["'])(?=[^>]*\bcontent=["']#080d10["'])[^>]*>/i);
  const viewportMetas = html.match(/<meta(?=[^>]*\bname=["']viewport["'])[^>]*>/gi) ?? [];
  assert.equal(viewportMetas.length, 1);
  assert.match(viewportMetas[0], /content=["'][^"']*viewport-fit=cover[^"']*["']/i);
});

test("packages an installable app manifest and correctly sized icons", async () => {
  const manifest = JSON.parse(await readFile(new URL("../dist/client/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#080d10");
  assert.equal(manifest.theme_color, "#080d10");
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, purpose }) => ({ src, sizes, purpose })),
    [
      { src: "/icon-192.png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" },
    ],
  );

  for (const [file, expected] of [
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
  ]) {
    const png = await readFile(new URL(`../dist/client/${file}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG");
    assert.equal(png.readUInt32BE(16), expected);
    assert.equal(png.readUInt32BE(20), expected);
  }
});

test("service worker uses bounded caches and leaves calendar storage untouched", async () => {
  const serviceWorker = await readFile(new URL("../dist/client/sw.js", import.meta.url), "utf8");
  assert.match(serviceWorker, /family-calendar-/);
  assert.match(serviceWorker, /shell-v2/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /cache\.keys\(\)/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/assets\/"\)/);
  assert.doesNotMatch(serviceWorker, /Promise\.allSettled/);
  assert.doesNotMatch(serviceWorker, /localStorage|indexedDB\.deleteDatabase/);
  const putAssets = serviceWorker.indexOf("assetResponses.map");
  const putRoot = serviceWorker.indexOf('cache.put("/", response.clone())');
  const pruneAssets = serviceWorker.search(/cachedRequests\r?\n\s*\.filter/);
  assert.ok(putAssets >= 0 && putAssets < putRoot && putRoot < pruneAssets, "cache updates current chunks, then root, before pruning stale chunks");

  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const installSource = await readFile(new URL("../app/pwa-backup.ts", import.meta.url), "utf8");
  assert.match(pageSource, /family-weekly-calendar:v1/);
  assert.match(pageSource, /family-weekly-calendar:settings:v1/);
  assert.match(pageSource, /JSON\.stringify\(\{ version: 1, events \}\)/);
  assert.match(installSource, /family-weekly-calendar:v1/);
  assert.match(installSource, /family-weekly-calendar:settings:v1/);
});

test("event artwork remains packaged while cards use bright WALL BALL surfaces and distinct travel bands", async () => {
  const artworkFiles = ["church", "dance", "house", "park", "school", "scouts", "soccer", "street-corner", "work"];
  const serviceWorker = await readFile(new URL("../dist/client/sw.js", import.meta.url), "utf8");
  for (const name of artworkFiles) {
    const png = await readFile(new URL(`../dist/client/event-art/${name}.png`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(png.readUInt32BE(16) > 0);
    assert.ok(png.readUInt32BE(20) > 0);
    assert.match(serviceWorker, new RegExp(`/event-art/${name.replace("-", "\\-")}\\.png`));
  }

  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(pageSource, /Pick<CalendarEvent, "title" \| "tag" \| "town">/);
  assert.match(pageSource, /event\.town \? TOWN_ARTWORK : HOUSE_ARTWORK/);
  assert.match(css, /\.event-main\.has-artwork::before,[\s\S]*?display:\s*none;[\s\S]*?background-image:\s*none;[\s\S]*?pointer-events:\s*none/);
  assert.match(pageSource, /"--event-surface-high": surfaceHigh/);
  assert.match(pageSource, /"--event-title-color": ink/);
  assert.match(css, /\.event-core \{[\s\S]*?linear-gradient\(145deg, var\(--event-surface-high\), var\(--event-surface\) 54%, var\(--event-surface-low\)\)/);
  assert.match(css, /\.calendar-event \{[\s\S]*?--event-stroke: 2px;/);
  assert.match(css, /\.event-core \{[\s\S]*?border: var\(--event-stroke\) solid var\(--event-outline\);/);
  assert.match(css, /\.drive-segment \{[\s\S]*?repeating-linear-gradient\(\s*135deg,[\s\S]*?var\(--fc-accent\)[\s\S]*?var\(--event-dark, var\(--fc-app-bg\)\)/);
  assert.doesNotMatch(css, /\.drive-segment \{[^}]*border-inline:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(css, /\.drive-before \{[^}]*border-top:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(css, /\.drive-after \{[^}]*border-bottom:\s*var\(--event-stroke\) dotted/);
  assert.match(css, /\.drive-before \{[\s\S]*?border-radius: 12px 12px 0 0;/);
  assert.match(css, /\.drive-after \{[\s\S]*?border-radius: 0 0 12px 12px;/);
  assert.match(css, /\.ghost-drive \{[\s\S]*?repeating-linear-gradient\(\s*135deg,[\s\S]*?var\(--fc-accent\)/);
  assert.doesNotMatch(css, /\.ghost-drive \{[^}]*border-inline:\s*var\(--event-stroke\) dotted/);
  assert.match(css, /\.ghost-before[\s\S]*?border-radius: 12px 12px 0 0;/);
  assert.match(css, /\.ghost-after[\s\S]*?border-radius: 0 0 12px 12px;/);
});

test("backup validation rejects malformed data before it can replace a calendar", async () => {
  const { makeCalendarBackup, validateCalendarBackup } = await import("../app/pwa-backup.ts");
  const validEvent = {
    id: "sentinel",
    title: "Sentinel event",
    day: 0,
    start: 540,
    end: 600,
    color: "#287a82",
    bullets: ["Keep me"],
    people: ["Sam"],
    town: false,
    kind: "fixed",
    tag: "#sentinel",
    syncNotes: true,
    driveBefore: 15,
    driveAfter: 0,
  };
  const validCalendar = JSON.stringify({ version: 1, events: [validEvent] });
  const validSettings = JSON.stringify({ dayCount: 4, viewMode: "week", activeDay: 0 });
  assert.deepEqual(validateCalendarBackup(makeCalendarBackup(validCalendar, validSettings)), {
    calendar: validCalendar,
    settings: validSettings,
  });

  for (const malformed of [
    makeCalendarBackup(JSON.stringify({ version: 1, events: [null] }), validSettings),
    makeCalendarBackup(JSON.stringify({ version: 1, events: [{ ...validEvent, end: 500 }] }), validSettings),
    makeCalendarBackup(validCalendar, JSON.stringify({})),
    makeCalendarBackup(validCalendar, JSON.stringify({ dayCount: 4, viewMode: "week", activeDay: 9 })),
  ]) {
    assert.throws(() => validateCalendarBackup(malformed));
  }
  assert.throws(
    () => validateCalendarBackup("{not-json"),
    /This is not an Our Week backup/,
  );
});

test("summary filters toggle cleanly and match the displayed keyword totals", async () => {
  const { firstSummaryFilterMatch, matchesSummaryFilter, toggleSummaryFilter } = await import("../app/calendar-filters.ts");
  assert.equal(matchesSummaryFilter({ title: "Class 1" }, "class"), true);
  assert.equal(matchesSummaryFilter({ title: "Music class" }, "class"), true);
  assert.equal(matchesSummaryFilter({ title: "Classical music" }, "class"), false);
  assert.equal(matchesSummaryFilter({ title: "Soccer academy" }, "soccer"), true);
  assert.equal(matchesSummaryFilter({ title: "Drive lesson" }, "drive"), false);
  assert.equal(matchesSummaryFilter({ title: "Class 1", driveBefore: 15 }, "drive"), true);
  assert.equal(toggleSummaryFilter(null, "class"), "class");
  assert.equal(toggleSummaryFilter("class", "class"), null);
  assert.equal(toggleSummaryFilter("class", "soccer"), "soccer");
  const events = [
    { title: "Class afternoon", day: 0, start: 780 },
    { title: "Class morning", day: 1, start: 570 },
    { title: "Soccer", day: 0, start: 540 },
  ];
  assert.equal(firstSummaryFilterMatch(events, "class", 4)?.title, "Class morning");
  assert.equal(firstSummaryFilterMatch(events, "class", 4, 0)?.title, "Class afternoon");
  assert.equal(firstSummaryFilterMatch(events, "soccer", 4, 1), null);
});

test("linked event changes remain relative, atomic, and respect note-sync scope", async () => {
  const {
    activityMinutes,
    applyTaggedChange,
    removeTaggedEvents,
    taggedChangeError,
  } = await import("../app/calendar-events.ts");
  const base = {
    title: "Class",
    start: 540,
    end: 600,
    color: "#287a82",
    bullets: ["Original"],
    people: ["Sam"],
    town: false,
    kind: "fixed",
    tag: "#class",
    syncNotes: false,
    driveBefore: 0,
    driveAfter: 0,
  };
  const monday = { ...base, id: "mon", day: 0 };
  const tuesday = { ...base, id: "tue", day: 1, start: 600, end: 660, bullets: ["Tuesday note"] };
  const events = [monday, tuesday];

  const moved = { ...monday, day: 1, start: 555, end: 615, title: "Class block", color: "#3c6fb0", people: ["Sam", "Alex"] };
  assert.equal(taggedChangeError(events, monday, moved), "");
  const movedGroup = applyTaggedChange(events, monday, moved);
  assert.deepEqual(movedGroup.map(({ day, start, end }) => ({ day, start, end })), [
    { day: 1, start: 555, end: 615 },
    { day: 2, start: 615, end: 675 },
  ]);
  assert.deepEqual(movedGroup[1].bullets, ["Tuesday note"]);
  assert.deepEqual(movedGroup[1].people, ["Sam", "Alex"]);

  const notesOn = { ...monday, syncNotes: true, bullets: ["Shared note"] };
  assert.deepEqual(applyTaggedChange(events, monday, notesOn)[1].bullets, ["Shared note"]);
  assert.match(taggedChangeError(events, monday, { ...monday, day: -1 }), /edge of the week/);
  assert.match(taggedChangeError(events, monday, { ...monday, start: 225, end: 285 }), /calendar boundary/);
  assert.equal(activityMinutes({ ...monday, start: 525, driveBefore: 15 }), 60);
  assert.equal(removeTaggedEvents(events, monday, false).length, 1);
  assert.equal(removeTaggedEvents(events, monday, true).length, 0);
});

test("event title validation is directly connected to the editor input", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /required\s+aria-invalid=\{titleInvalid \|\| undefined\}/);
  assert.match(pageSource, /aria-describedby=\{titleInvalid \? "event-title-error" : undefined\}/);
  assert.match(pageSource, /id=\{titleInvalid \? "event-title-error" : undefined\}/);
});

test("new events open in a compact name-first window and reveal details only on demand", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(pageSource, /const \[newEventDetailsOpen, setNewEventDetailsOpen\] = useState\(false\)/);
  assert.match(pageSource, /const quickAddOpen = Boolean\(draft && isNew && !newEventDetailsOpen\)/);
  assert.match(pageSource, /const editorOpen = Boolean\(\(draft && !quickAddOpen\) \|\| deleteChoice \|\| pendingDriveChoice\)/);
  assert.match(pageSource, /const usedColors = new Set\(events\.map\(\(event\) => event\.color\)\)/);
  assert.match(pageSource, /COLORS\.find\(\(color\) => !usedColors\.has\(color\.value\)\)/);
  assert.match(pageSource, /setNewEventDetailsOpen\(false\);[\s\S]*?setPersonEntry\(""\);/);
  assert.match(pageSource, /className="quick-add-more"[\s\S]*?>\s*<span>More<\/span>[\s\S]*?className="quick-add-more-chevron"/);
  assert.match(pageSource, /const notesInputRef = useRef<HTMLTextAreaElement>\(null\)/);
  assert.match(pageSource, /newEventDetailsOpen\) return;[\s\S]*?notesInputRef\.current\?\.focus\(\)/);
  assert.match(pageSource, /onClick=\{\(\) => setNewEventDetailsOpen\(true\)\}/);
  assert.match(pageSource, /quickAddOpen && event\.key === "Enter"/);
  assert.match(pageSource, /function openNew[\s\S]*?if \(draft\) return;/);
  assert.match(pageSource, /aria-modal=\{quickAddOpen \? undefined : true\}/);
  assert.doesNotMatch(pageSource, /className="drive-editor"/);
  assert.doesNotMatch(cssSource, /\.drive-editor/);

  const editorStart = pageSource.indexOf('className="editor-body"');
  const title = pageSource.indexOf("Event name", editorStart);
  const notes = pageSource.indexOf("Notes <small>", editorStart);
  const people = pageSource.indexOf('className="people-field"', editorStart);
  const schedule = pageSource.indexOf('className="field-row three"', editorStart);
  const color = pageSource.indexOf('className="color-field"', editorStart);
  assert.ok(editorStart >= 0 && title < notes && notes < people && people < schedule && schedule < color, "full editor orders name, notes, people, schedule, then color");
  assert.match(cssSource, /\.editor-overlay--quick-add[\s\S]*?background:\s*transparent/);
  assert.match(cssSource, /\.editor-overlay--quick-add[\s\S]*?pointer-events:\s*none/);
  assert.match(cssSource, /\.event-editor\.event-editor--quick-add[\s\S]*?pointer-events:\s*auto/);
  assert.match(cssSource, /\.event-editor\.event-editor--quick-add[\s\S]*?height:\s*auto/);
  assert.doesNotMatch(cssSource, /\.quick-add-more-chevron\s*\{[^}]*border:/);
});

test("quick add opens beside the selected calendar time without blocking the schedule", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(pageSource, /type QuickAddAnchor = \{[\s\S]*?clientX: number;[\s\S]*?clientY: number;/);
  assert.match(pageSource, /function positionQuickAdd\([\s\S]*?roomBelow[\s\S]*?roomAbove[\s\S]*?opensBelow/);
  assert.match(pageSource, /new ResizeObserver\(updatePosition\)/);
  assert.match(pageSource, /window\.visualViewport\?\.addEventListener\("resize", updatePosition\)/);
  assert.match(pageSource, /window\.visualViewport\?\.addEventListener\("scroll", updatePosition\)/);
  assert.match(pageSource, /openNew\(Number\.isInteger\(dayIndex\) \? dayIndex : activeDay, start, scrollRef\.current, \{ clientX: event\.clientX, clientY: event\.clientY \}\)/);
  assert.match(pageSource, /openNew\(dayIndex, start, scrollRef\.current, \{ clientX: pointerEvent\.clientX, clientY: pointerEvent\.clientY \}\)/);
  assert.match(pageSource, /if \(event\.key === "Escape" && quickAddOpen\)/);
  assert.match(pageSource, /document\.addEventListener\("pointerdown", closeQuickAddFromOutside, true\)/);
  assert.match(cssSource, /\.event-editor\.event-editor--quick-add\.event-editor--anchored\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?margin:\s*0;/);
});

test("the visible calendar reserves a full empty hour around the visible schedule without changing its data boundary", async () => {
  const { calendarDisplayRange } = await import("../app/calendar-display.ts");
  assert.deepEqual(calendarDisplayRange([{ day: 0, start: 570, end: 630 }], 4), { start: 480, end: 720 });
  assert.deepEqual(calendarDisplayRange([{ day: 0, start: 495, end: 555 }], 4), { start: 420, end: 660 });
  assert.deepEqual(calendarDisplayRange([{ day: 4, start: 420, end: 480 }, { day: 0, start: 570, end: 630 }], 4), { start: 480, end: 720 });
  assert.deepEqual(calendarDisplayRange([], 4), { start: 480, end: 600 });
  assert.deepEqual(calendarDisplayRange([{ day: 0, start: 240, end: 1320 }], 4), { start: 240, end: 1320 });

  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /const \[displayEndMinutes, setDisplayEndMinutes\] = useState\(INITIAL_DISPLAY_RANGE\.end\)/);
  assert.match(pageSource, /const visualEndMinutes = Math\.max\(displayEndMinutes, defaultDisplayRange\.end\)/);
  assert.match(pageSource, /length: \(visualEndMinutes - visualStartMinutes\) \/ 60 \+ 1/);
  assert.match(pageSource, /height: `\$\{\(\(visualEndMinutes - visualStartMinutes\) \/ 60\) \* hourHeight\}px`/);
});

test("clock labels always include minutes", async () => {
  const { formatClockTime, formatCompactClockTime } = await import("../app/calendar-time.ts");
  assert.equal(formatClockTime(240), "4:00 AM");
  assert.equal(formatClockTime(540), "9:00 AM");
  assert.equal(formatClockTime(720), "12:00 PM");
  assert.equal(formatClockTime(780), "1:00 PM");
  assert.equal(formatCompactClockTime(540), "9:00");
  assert.equal(formatCompactClockTime(570), "9:30");
  assert.equal(formatCompactClockTime(720), "12:00");
});

test("desktop cards combine the unboxed roster with WALL BALL surface and clock grammar", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(pageSource, /DESKTOP_HOUR_HEIGHT = 88/);
  assert.match(pageSource, /const peopleLimit = narrow \? 1 : event\.people\.length > 3 \? 2 : 3/);
  assert.match(cssSource, /\.event-roster \{[\s\S]*?top: 9px;[\s\S]*?width: 92px;[\s\S]*?grid-auto-rows: 18px/);
  assert.match(cssSource, /\.person-signature \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 3px[\s\S]*?background: transparent;/);
  assert.match(cssSource, /\.person-signature > span \{[\s\S]*?grid-column: 1;[\s\S]*?text-align: right/);
  assert.match(cssSource, /\.person-signature::before \{[\s\S]*?grid-column: 2;/);
  assert.doesNotMatch(cssSource, /\.person-signature::after/);
  assert.match(cssSource, /\.event--compact \.event-content strong \{ font-size: 19px; line-height: 1; \}/);
  assert.match(cssSource, /\.event-main,\r?\n\.ghost-main \{[\s\S]*?margin-left: 0/);
  assert.match(cssSource, /\.event-core \{[\s\S]*?radial-gradient\(circle at 94% -18%[\s\S]*?var\(--event-surface-high\)/);
  assert.match(cssSource, /\.event-rail-time \{[\s\S]*?border-radius: 10px;[\s\S]*?background: linear-gradient\(180deg, #0c2630, #07181f\)/);
  assert.match(cssSource, /\.event-content strong \{[\s\S]*?font-weight: 950/);
  assert.match(cssSource, /\.event-artwork-wash \{[\s\S]*?display: none;[\s\S]*?opacity: 0/);
  assert.match(cssSource, /\.event-main\.has-artwork::before,[\s\S]*?display: none;[\s\S]*?background-image: none;[\s\S]*?opacity: 0/);
});

test("every card shows its start clock; the end clock is pinned unless a neighbor immediately follows, then it waits for hover", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(pageSource, /function sharedTimeBoundaries\(dayEvents: LaidOutEvent\[\]\)/);
  assert.match(pageSource, /previous\.end === event\.start/);
  assert.match(pageSource, /activityEnd\(previous\) === activityStart\(event\)/);
  assert.match(pageSource, /activityMinutes\(previous\) >= 45/);
  assert.match(pageSource, /previous\.laneCount === 1/);
  assert.match(pageSource, /const sharedTimeBoundariesByDay = useMemo\(\(\) => layouts\.map\(sharedTimeBoundaries\), \[layouts\]\);/);
  assert.match(pageSource, /const hasNeighborBelow = sharedTimeBoundariesByDay\[dayIndex\]\?\.outgoing\.has\(event\.id\) \?\? false;/);
  // The old gradient-pill "shared boundary" design and its connector line are gone.
  assert.doesNotMatch(pageSource, /event--shared-start-time|event--shared-end-time/);
  assert.doesNotMatch(pageSource, /className="event-shared-time"/);
  assert.doesNotMatch(pageSource, /sharedTimeBoundaryTokens/);
  assert.doesNotMatch(cssSource, /\.event-shared-time\b/);
  assert.doesNotMatch(cssSource, /\.event-rail-connector\b/);
  // The start clock always renders; the end clock always renders too, but
  // picks up a peek modifier -- hidden at rest, revealed on hover/focus --
  // exactly when a neighbor immediately follows it.
  assert.match(pageSource, /!toolsVisible && <span className="event-rail-time event-rail-start">\{shortTime\(activityStart\(event\)\)\}<\/span>/);
  assert.match(pageSource, /className=\{`event-rail-time event-rail-end\$\{hasNeighborBelow \? " event-rail-end--peek" : ""\}`\}/);
  assert.match(pageSource, /toolsVisible && toolEdges\.map\(\(edge\) => \{/);
  assert.match(cssSource, /\.event-rail-end--peek \{[\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/);
  assert.match(cssSource, /\.calendar-event:hover \.event-rail-end--peek,\s*\.calendar-event:focus-within \.event-rail-end--peek \{[\s\S]*?opacity:\s*1;/);
  // No transition is declared for the peek reveal, so hover is instant.
  assert.doesNotMatch(cssSource, /\.event-rail-end--peek[\s\S]{0,200}transition/);
});

test("mobile Day is a compact, single-day state rather than a partial Week view", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  const touchHourHeight = pageSource.match(/const TOUCH_HOUR_HEIGHT = (\d+);/);
  assert.ok(touchHourHeight, "coarse-pointer hour height must stay explicit and reviewable");
  assert.ok(Number(touchHourHeight[1]) <= 88, "coarse-pointer events must not exceed the compact desktop hour scale");
  const phoneHourHeight = pageSource.match(/const PHONE_HOUR_HEIGHT = (\d+);/);
  assert.ok(phoneHourHeight, "phone day density must stay explicit and reviewable");
  assert.ok(Number(phoneHourHeight[1]) <= 80, "phone events must use a compact hourly scale");
  assert.doesNotMatch(pageSource, /TOUCH_HOUR_HEIGHT = 144/);

  // A horizontal gesture may move between days, but it may not settle midway
  // through two days. Implementations may use mandatory snap or explicitly
  // quantize the final scroll position.
  const mandatoryDaySnap = /\.calendar-scroll\.view-day[^\{]*\{[\s\S]*?scroll-snap-type:\s*x mandatory/.test(cssSource)
    && /\.view-day \.day-column[^\{]*\{[\s\S]*?scroll-snap-stop:\s*always/.test(cssSource);
  const quantizedDayLanding = /function handleCalendarScroll\(\)[\s\S]*?scrollToDay\(next(?:,\s*"auto")?\)/.test(pageSource);
  // Rendering only activeDay is an equally valid discrete Day implementation:
  // there is no second column for a drag to leave partially exposed.
  const discreteSingleColumnDay = /const renderedDayIndexes = viewMode === "day" \? \[activeDay\]/.test(pageSource)
    && /function handleCalendarScroll\(\)[\s\S]*?if \(scroller\.scrollLeft !== 0\) scroller\.scrollLeft = 0;/.test(pageSource);
  assert.ok(mandatoryDaySnap || quantizedDayLanding || discreteSingleColumnDay, "Day must always land on one complete day");
  assert.doesNotMatch(cssSource, /scroll-snap-type:\s*x proximity/);
  assert.doesNotMatch(cssSource, /scroll-snap-stop:\s*normal/);
  assert.match(cssSource, /\.view-day \.filter-empty-state \{[\s\S]*?position:\s*sticky/);

  assert.match(cssSource, /\.calendar-scroll\.view-day \{ touch-action:\s*auto; -webkit-overflow-scrolling:\s*touch;/);
  assert.doesNotMatch(cssSource, /touch-action:\s*pan-y/);
});

test("Compact is a persistent density mode, while the old visible shared-status chip is gone", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(pageSource, /const \[compactMode, setCompactMode\] = useState\(false\)/);
  assert.match(pageSource, /compact: parsed\.compact === true/);
  assert.match(pageSource, /setCompactMode\(settings\.compact\)/);
  assert.match(pageSource, /JSON\.stringify\(\{ dayCount, viewMode, activeDay, compact: compactMode \}\)/);
  // Compact must shrink the actual time scale, not merely the typography.
  assert.match(pageSource, /const hourHeight = compactMode\s*\? Math\.max\(36, Math\.round\(baseHourHeight \* 0\.48\)\)\s*:\s*baseHourHeight/);
  assert.doesNotMatch(pageSource, /Math\.max\(52, Math\.round\(baseHourHeight \* 0\.72\)\)/);
  assert.match(pageSource, /className=\{`planner-app\$\{compactMode \? " is-compact" : ""\}`\}/);
  assert.match(pageSource, /className=\{`compact-toggle\$\{compactMode \? " selected" : ""\}`\}/);
  assert.match(pageSource, /aria-pressed=\{compactMode\}/);
  assert.match(pageSource, /setAnnouncement\(next \? "Compact layout on" : "Compact layout off"\)/);
  assert.match(cssSource, /\.planner-app\.is-compact \.event-core \{/);
  assert.match(cssSource, /\.planner-app\.is-compact \.calendar-scroll\.view-day \.event-content \{/);
  assert.match(cssSource, /\.planner-app\.is-compact \.event-rail-end \{ display: none; \}/);
  assert.match(cssSource, /\.planner-app\.is-compact \.event-roster,[\s\S]*?\.planner-app\.is-compact \.event-note \{ display: none; \}/);
  assert.match(cssSource, /\.compact-toggle\.selected \{/);

  // This deliberately removes header clutter only. The shared-calendar
  // request path remains, so a family edit still syncs even without a chip.
  assert.doesNotMatch(pageSource, /className=\{`sync-indicator/);
  assert.doesNotMatch(cssSource, /\.sync-indicator\b/);
  assert.match(pageSource, /async function sharedCalendarRequest\(/);
});

test("Week fits every visible day at a normal desktop width without a navigation row", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // The previous contract required five 300px columns (1500px) while hiding
  // the horizontal scrollbar, so Friday was absent at the normal 1280px view.
  assert.doesNotMatch(pageSource, /viewMode === "day" \? dayColumnWidth \* dayCount : 300 \* dayCount/);
  assert.doesNotMatch(cssSource, /repeat\(var\(--day-count\), minmax\(300px, 1fr\)\)/);

  // Friday is included by default. Five compact 240px columns fit a normal
  // 1280px desktop calendar. The optional range controls belong in the final
  // (Friday) heading, not in a separate row that spends vertical space.
  assert.match(pageSource, /const DEFAULT_DAY_COUNT = 5;/);
  assert.match(pageSource, /const ROUTINE_DAY_COUNT = 4;/);
  assert.doesNotMatch(pageSource, /className=\{`week-navigation/);
  assert.doesNotMatch(pageSource, /Scroll across the week/);
  assert.match(pageSource, /className=\{`calendar-track view-\$\{viewMode\}`\}/);
  assert.match(cssSource, /\.calendar-track\.view-week \{ min-width:\s*calc\(var\(--day-count\) \* 240px\); \}/);
  assert.doesNotMatch(cssSource, /\.week-navigation\b/);
  assert.match(pageSource, /viewMode === "week" && dayIndex === dayCount - 1 && \([\s\S]*?className="week-range-controls"[\s\S]*?aria-label="Visible week range"/);
  assert.match(pageSource, /onClick=\{extendWeek\}/);
  assert.match(pageSource, /onClick=\{shortenWeek\}/);
  assert.match(cssSource, /\.week-range-controls \{[\s\S]*?grid-template-rows:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /\.view-week \.day-heading:last-of-type \{ padding-right: 48px; \}/);
});

test("touch long-hold arms a real event move instead of opening a Move popup control", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const longPressStart = pageSource.indexOf("function beginTouchPress(");
  const longPressEnd = pageSource.indexOf("function cancelTouchPress(", longPressStart);
  const longPress = pageSource.slice(longPressStart, longPressEnd);

  assert.ok(longPressStart >= 0 && longPressEnd > longPressStart, "the card long-press handler must be locatable");
  assert.match(longPress, /card\.setPointerCapture\(pointerEvent\.pointerId\)/);
  assert.match(longPress, /window\.setTimeout\(\(\) => \{[\s\S]*?beginInteraction\(pointerEvent, event, "move", "event", true, card\)/);
  assert.doesNotMatch(longPress, /openEditor\(/);
  assert.match(pageSource, /pointerEvent\.pointerType === "touch" \|\| pointerEvent\.pointerType === "pen"\) \{\s*beginTouchPress\(pointerEvent, event\);/);
  assert.match(pageSource, /Math\.hypot\(pointerEvent\.clientX - press\.startX, pointerEvent\.clientY - press\.startY\) > 10\) \{[\s\S]*?cancelTouchPress\(pointerEvent\);/);
  // Direct movement must not turn every ordinary vertical swipe that starts
  // on a card into a dead gesture. Coarse cards own the pointer for a hold,
  // then explicitly pass early vertical intent through to the calendar.
  assert.match(pageSource, /type TouchCardScroll = \{[\s\S]*?pointerId: number;[\s\S]*?lastY: number;/);
  assert.match(pageSource, /function scrollFromTouchedCard\([\s\S]*?scrollRef\.current\?\.scrollBy\(\{ top: offset, behavior: "auto" \}\)/);
  assert.match(pageSource, /if \(scrollFromTouchedCard\(pointerEvent\)\) return;/);
  assert.match(pageSource, /Math\.abs\(deltaY\) > Math\.abs\(deltaX\)/);
  assert.match(pageSource, /interactionRef\.current\?\.pointerId === pointerEvent\.pointerId\) moveInteraction\(pointerEvent\)/);
  assert.match(pageSource, /interactionRef\.current\?\.pointerId === pointerEvent\.pointerId\) \{\s*endInteraction\(pointerEvent\);/);
  assert.doesNotMatch(pageSource, /className="event-edge-move"/);
  assert.doesNotMatch(pageSource, /aria-label=\{`Move \$\{event\.title\}`\}/);
});

test("time clocks drag to resize, choose exact 15-minute times, and sit beside Departure", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(pageSource, /const \[eventToolsId, setEventToolsId\] = useState<string \| null>\(null\)/);
  assert.match(pageSource, /className="event-edge-tools-set"/);
  assert.match(pageSource, /function scheduleEventToolsOpen/);
  assert.match(pageSource, /function scheduleEventToolsOpen\(event: CalendarEvent, card: HTMLElement/);
  assert.match(pageSource, /const eventToolsHoverIdRef = useRef<string \| null>\(null\)/);
  // Hover opens tools instantly -- no wait before a hover promise is kept.
  assert.match(pageSource, /eventToolsOpenTimerRef\.current = window\.setTimeout\(\(\) => \{[\s\S]*?\}, 0\);/);
  assert.match(pageSource, /eventToolsHoverIdRef\.current === event\.id && !interactionRef\.current\) openEventTools\(event, card, false(?:, preferredEdge)?\)/);
  assert.match(pageSource, /function scheduleEventToolsClose\(eventId: string\)/);
  const closeToolsStart = pageSource.indexOf("function scheduleEventToolsClose(");
  const closeToolsEnd = pageSource.indexOf("function beginTouchPress(", closeToolsStart);
  const closeTools = pageSource.slice(closeToolsStart, closeToolsEnd);
  assert.ok(closeToolsStart >= 0 && closeToolsEnd > closeToolsStart, "tool-close safety must be locatable");
  assert.match(closeTools, /document\.activeElement\?\.closest<HTMLElement>\("\.calendar-event"\)/);
  assert.match(closeTools, /const isFocusedTool = focusedCard\?\.dataset\.eventId === eventId;/);
  assert.match(closeTools, /!interactionRef\.current && !isFocusedTool && eventToolsHoverIdRef\.current !== eventId/);
  assert.match(pageSource, /function handleEventToolClick\(/);
  assert.match(pageSource, /handleEventToolClick\(clickEvent, event, edge, "drive"\)/);
  assert.match(pageSource, /onMouseEnter=\{\(mouseEvent\) => \{[\s\S]*?scheduleEventToolsOpen\(event, mouseEvent\.currentTarget/);
  assert.match(pageSource, /if \(eventToolsId === event\.id\) \{[\s\S]*?clearTimeout\(eventToolsCloseTimerRef\.current\)/);
  assert.doesNotMatch(pageSource, /const edgeZone = Math\.min\(18, Math\.max\(10, rect\.height \/ 3\)\)/);
  assert.doesNotMatch(pageSource, /title="Click to edit/);
  assert.doesNotMatch(pageSource, /className="drag-readout"/);
  assert.doesNotMatch(pageSource, /neighborShift|event-tools-neighbor/);
  assert.match(pageSource, /const minimumForBothEdges = window\.matchMedia\("\(any-pointer: coarse\)"\)\.matches \? 52 : 44;/);
  assert.match(pageSource, /const coreHeight = card\.querySelector<HTMLElement>\("\.event-core"\)\?\.getBoundingClientRect\(\)\.height \?\? card\.getBoundingClientRect\(\)\.height;/);
  assert.match(pageSource, /const showBothEdges = coreHeight >= minimumForBothEdges;/);
  assert.match(pageSource, /const selectedEdges = showBothEdges\s*\? \{ start: true, end: true \}\s*:\s*\{ start: preferredEdge !== "end", end: preferredEdge === "end" \}/);
  // Short cards get just the closest edge rather than overlapping start and
  // end controls. Normal cards expose the same direct controls at both ends.
  assert.match(pageSource, /toolsVisible && toolEdges\.length === 1 \? "event-tools-single-edge"/);
  assert.match(pageSource, /toolsVisible && toolEdges\.map\(\(edge\) => \{/);
  assert.match(pageSource, /data-event-id=\{event\.id\}/);
  assert.doesNotMatch(pageSource, /className="event-edge-move"/);
  assert.doesNotMatch(pageSource, /aria-label=\{`Move \$\{event\.title\}`\}/);
  assert.match(pageSource, /className=\{`event-time-handle event-time-handle--\$\{edge\}\$\{hourPickerOpen \? " is-hour-picker-open" : ""\}`\}/);
  assert.match(pageSource, /aria-label=\{`Set or drag \$\{edge\} time of \$\{event\.title\}, \$\{formatTime\(time\)\}`\}/);
  assert.match(pageSource, /aria-haspopup="dialog"/);
  assert.match(pageSource, /aria-expanded=\{hourPickerOpen\}/);
  assert.match(pageSource, /aria-controls=\{hourPickerOpen \? "calendar-hour-picker" : undefined\}/);
  assert.match(pageSource, /title=\{`Click to choose a time, or drag to make \$\{event\.title\} \$\{direction\}`\}/);
  assert.match(pageSource, /className="event-time-clock-value"/);
  // The up/down grip arrow is gone -- the departure button never drags.
  assert.doesNotMatch(pageSource, /event-time-clock-grip/);
  assert.match(pageSource, /className=\{`event-departure-button event-departure-button--\$\{edge\}`\}/);
  assert.match(pageSource, /aria-label=\{`Add 15 minutes of travel time \$\{position\} \$\{event\.title\}`\}/);
  assert.match(pageSource, /title=\{`Add 15 minutes of travel time \$\{position\}`\}/);
  assert.doesNotMatch(pageSource, /Drag or click to add travel time/);
  assert.match(pageSource, /aria-label=\{`Add an event \$\{edge === "start" \? "before" : "after"\} \$\{event\.title\}`\}/);
  assert.match(pageSource, /className="event-edge-add"/);
  assert.match(pageSource, /className="event-departure-glyph" aria-hidden="true">/);
  assert.match(pageSource, /<i className="event-departure-car" \/>/);
  assert.match(pageSource, /<i className="event-departure-plus" \/>/);
  assert.doesNotMatch(pageSource, /className="event-edge-extend"/);
  assert.doesNotMatch(pageSource, /className="event-edge-drive"/);
  assert.doesNotMatch(pageSource, /↝/);
  assert.match(pageSource, /function handleAddAdjacentToolClick\([\s\S]*?const before = event\.start - SNAP_MINUTES;[\s\S]*?openNew\(event\.day, start, clickEvent\.currentTarget, \{[\s\S]*?\}, SNAP_MINUTES\)/);
  assert.match(pageSource, /tentativeEnd: end === interaction\.origin\.end \? interaction\.origin\.tentativeEnd : false/);
  assert.match(pageSource, /onPointerDown=\{\(pointerEvent\) => beginInteraction\(pointerEvent, event, mode, "event", true\)\}/);
  assert.match(pageSource, /onPointerMove=\{moveInteraction\}[\s\S]*?onPointerUp=\{endInteraction\}[\s\S]*?onPointerCancel=\{cancelInteraction\}/);
  // The departure button never drags -- click only, no pointer-capture wiring.
  assert.doesNotMatch(pageSource, /beginInteraction\(pointerEvent, event, mode, "drive"/);
  assert.match(pageSource, /onClick=\{\(clickEvent\) => openHourPicker\(clickEvent, event, edge\)\}/);
  assert.match(pageSource, /onClick=\{\(clickEvent\) => handleEventToolClick\(clickEvent, event, edge, "drive"\)\}/);
  assert.match(pageSource, /<div className="event-time-rail" aria-hidden=\{!toolsVisible\}>/);
  assert.match(pageSource, /interaction\.extensionType === "event" && expanded/);
  assert.match(pageSource, /const changed = finalEvent \? hasScheduleChange\(interaction\.origin, finalEvent\) : false/);
  assert.doesNotMatch(pageSource, /touchSurface|openTouchSurface|resizeSurface\.kind === "pointer"/);
  // Revealed controls must not solve their clearance problem by translating a
  // neighbouring event into a different time slot. That makes adjacent cards
  // overlap and changes the visual schedule while merely hovering/tapping.
  assert.doesNotMatch(cssSource, /\.calendar-event\.event-tools-neighbor\s*\{[^}]*transform:\s*translateY/);
  assert.match(cssSource, /\.event-edge-tools-set\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(cssSource, /\.event-edge-tools \{[\s\S]*?pointer-events:\s*none/);
  assert.match(cssSource, /\.event-edge-tools--start\s*\{ top: 0; \}/);
  assert.match(cssSource, /\.event-edge-tools--end\s*\{ bottom: 0; \}/);
  assert.match(cssSource, /\.event-edge-tools button \{[\s\S]*?pointer-events:\s*auto/);
  assert.match(cssSource, /\.event-tools-open \.event-time-rail \{[\s\S]*?pointer-events:\s*auto/);
  assert.match(cssSource, /\.event-time-handle,\s*\.event-departure-button \{[\s\S]*?touch-action:\s*none/);
  assert.match(cssSource, /\.event-time-handle \{[\s\S]*?cursor:\s*ns-resize/);
  assert.match(cssSource, /\.event-departure-button \{[\s\S]*?cursor:\s*pointer/);
  assert.doesNotMatch(cssSource, /\.event-departure-button \{[^}]*cursor:\s*ns-resize/);
  assert.match(cssSource, /\.event-time-handle\.is-hour-picker-open \{/);
  assert.match(cssSource, /\.event-tools-single-edge \.event-time-handle,\s*\.event-tools-single-edge \.event-departure-button \{[\s\S]*?top:\s*2px;[\s\S]*?bottom:\s*2px;[\s\S]*?height:\s*auto/);
  assert.doesNotMatch(cssSource, /\.event-edge-tools \.event-edge-extend\b/);
  assert.doesNotMatch(cssSource, /\.event-edge-tools \.event-edge-drive\b/);
  assert.match(pageSource, /\$\{driveBefore\(event\) > 0 \? "has-drive-before" : ""\}/);
  assert.match(pageSource, /\$\{driveAfter\(event\) > 0 \? "has-drive-after" : ""\}/);
  assert.match(cssSource, /\.calendar-event\.has-drive-before \.event-core \{[\s\S]*?border-top-width: 0;/);
  assert.match(cssSource, /\.calendar-event\.has-drive-before \.event-time-rail \{ box-shadow: none; \}/);
  assert.match(cssSource, /\.calendar-event\.has-drive-after \.event-core \{[\s\S]*?border-bottom-width: 0;/);
  assert.match(cssSource, /\.calendar-event:hover,[\s\S]*?--event-outline: color-mix\(in srgb, var\(--event-dark\) 72%, #1c3338\);/);
  assert.doesNotMatch(cssSource, /\.drive-before \{[^}]*border-top:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(cssSource, /\.drive-after \{[^}]*border-bottom:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(cssSource, /\.drive-segment \{[^}]*border-inline:/);
  assert.match(cssSource, /\.drag-ghost\.has-drive-before \.ghost-core \{[^}]*border-top-width: 0;/);
  assert.match(cssSource, /\.drag-ghost\.has-drive-after \.ghost-core \{[^}]*border-bottom-width: 0;/);
  assert.doesNotMatch(cssSource, /\.calendar-event\.event-tools-neighbor\s*\{[^}]*transform:\s*translateY/);
  assert.match(pageSource, /className="column-earlier-hour-control"/);
});

test("the clock picker offers only valid 15-minute choices and preserves travel bands", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(pageSource, /type HourPicker = \{[\s\S]*?eventId: string;[\s\S]*?edge: "start" \| "end";[\s\S]*?anchor: HourPickerAnchor;/);
  assert.match(pageSource, /const \[hourPicker, setHourPicker\] = useState<HourPicker \| null>\(null\)/);
  assert.match(pageSource, /const timeOptions = Array\.from\([\s\S]*?\(END_MINUTES - START_MINUTES\) \/ SNAP_MINUTES \+ 1[\s\S]*?START_MINUTES \+ index \* SNAP_MINUTES/);
  assert.match(pageSource, /const hourPickerTimeOptions = hourPicker && hourPickerEvent[\s\S]*?time >= START_MINUTES \+ driveBefore\(hourPickerEvent\) && time < activityEnd\(hourPickerEvent\)[\s\S]*?time > activityStart\(hourPickerEvent\) && time <= END_MINUTES - driveAfter\(hourPickerEvent\)/);

  const openPickerStart = pageSource.indexOf("function openHourPicker(");
  const openPickerEnd = pageSource.indexOf("function chooseHourPickerTime(", openPickerStart);
  const openPicker = pageSource.slice(openPickerStart, openPickerEnd);
  assert.ok(openPickerStart >= 0 && openPickerEnd > openPickerStart, "hour picker opener must be locatable");
  assert.match(openPicker, /clickEvent\.stopPropagation\(\)/);
  assert.match(openPicker, /if \(interactionRef\.current\?\.origin\.id === event\.id\) return;/);
  assert.match(openPicker, /const rect = clickEvent\.currentTarget\.getBoundingClientRect\(\)/);
  assert.match(openPicker, /keepEventToolsOpen\(event\.id\)/);
  assert.match(openPicker, /setHourPicker\(\{[\s\S]*?eventId: event\.id,[\s\S]*?edge,[\s\S]*?anchor:/);

  const choosePickerStart = pageSource.indexOf("function chooseHourPickerTime(");
  const choosePickerEnd = pageSource.indexOf("function handleEventToolClick(", choosePickerStart);
  const choosePicker = pageSource.slice(choosePickerStart, choosePickerEnd);
  assert.ok(choosePickerStart >= 0 && choosePickerEnd > choosePickerStart, "hour picker selection must be locatable");
  assert.match(choosePicker, /const currentTime = edge === "start" \? activityStart\(event\) : activityEnd\(event\)/);
  assert.match(choosePicker, /if \(time === currentTime\) \{[\s\S]*?closeHourPicker\(\);/);
  assert.match(choosePicker, /start: time - driveBefore\(event\)/);
  assert.match(choosePicker, /end: time \+ driveAfter\(event\), tentativeEnd: false/);
  assert.match(choosePicker, /commitTaggedUpdate\(event, updated, `set \$\{edge\} time to \$\{formatTime\(time\)\}`\)/);
  assert.match(choosePicker, /if \(changed\) closeHourPicker\(\);/);

  assert.match(pageSource, /id="calendar-hour-picker"[\s\S]*?role="dialog"[\s\S]*?aria-label=\{`Set \$\{hourPicker\.edge\} time for \$\{hourPickerEvent\.title\}`\}/);
  assert.match(pageSource, /className="calendar-hour-picker-options" role="listbox" aria-label=\{`Available \$\{hourPicker\.edge\} times`\}/);
  assert.match(pageSource, /role="option"[\s\S]*?aria-selected=\{selected\}[\s\S]*?data-hour-picker-current=\{selected \|\| undefined\}[\s\S]*?onClick=\{\(\) => chooseHourPickerTime\(hourPickerEvent, hourPicker\.edge, time\)\}/);
  assert.match(pageSource, /target\?\.closest\("\.calendar-hour-picker, \.event-time-handle"\)/);
  assert.match(cssSource, /\.calendar-hour-picker \{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*120/);
  assert.match(cssSource, /\.calendar-hour-picker-options \{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
});

test("travel bands name Leave and Arrive, Leave carries a clickable address, and neither has a dotted seam", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(pageSource, /driveBefore\(event\) > 0 && \([\s\S]*?className="drive-segment drive-before"[\s\S]*?className="drive-segment-label">Leave<\/span>[\s\S]*?<strong>\{shortTime\(event\.start\)\}<\/strong>/);
  assert.match(pageSource, /driveAfter\(event\) > 0 && \([\s\S]*?className="drive-segment drive-after"[\s\S]*?className="drive-segment-label">Arrive<\/span>[\s\S]*?<strong>\{shortTime\(event\.end\)\}<\/strong>/);
  // The old arrow glyph is gone from both bands.
  assert.doesNotMatch(pageSource, /drive-segment-route/);
  assert.doesNotMatch(pageSource, /className="drive-segment-route" aria-hidden="true">→<\/span>/);

  // Leave carries a clickable address: real value, or an "Add Address"
  // invite when unset -- Arrive gets neither, since arriving needs no map.
  const leaveStart = pageSource.indexOf('className="drive-segment drive-before"');
  const leaveEnd = pageSource.indexOf("driveAfter(event) > 0", leaveStart);
  const leaveBlock = pageSource.slice(leaveStart, leaveEnd);
  assert.match(leaveBlock, /className=\{`drive-segment-address\$\{\(event\.address \?\? ""\)\.trim\(\) \? "" : " drive-segment-address--empty"\}`\}/);
  assert.match(leaveBlock, /onClick=\{\(clickEvent\) => handleAddressClick\(clickEvent, event\)\}/);
  assert.match(leaveBlock, /\{\(event\.address \?\? ""\)\.trim\(\) \|\| "Add Address"\}/);
  const arriveStart = pageSource.indexOf('className="drive-segment drive-after"');
  const arriveBlock = pageSource.slice(arriveStart, arriveStart + 300);
  assert.doesNotMatch(arriveBlock, /drive-segment-address/);

  // Address preview: click opens a map popup; clicking again (the popup
  // already open for this event) hands off to the device's map app instead.
  assert.match(pageSource, /function handleAddressClick\(/);
  assert.match(pageSource, /if \(addressPreview\?\.eventId === event\.id\) \{[\s\S]*?window\.location\.href = mapsNavigationUrl\(address\);/);
  assert.match(pageSource, /function mapsEmbedUrl\(address: string\)/);
  assert.match(pageSource, /function mapsNavigationUrl\(address: string\)/);
  assert.match(pageSource, /className="calendar-address-preview"/);

  assert.match(cssSource, /\.drive-segment \{[\s\S]*?grid-template-columns:\s*auto auto minmax\(10px, 1fr\)/);
  assert.match(cssSource, /\.drive-segment \{[\s\S]*?repeating-linear-gradient\(/);
  assert.doesNotMatch(cssSource, /\.drive-segment \{[^}]*border-inline:/);
  assert.doesNotMatch(cssSource, /\.drive-before \{[^}]*border-top:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(cssSource, /\.drive-after \{[^}]*border-bottom:\s*var\(--event-stroke\) dotted/);
  assert.match(cssSource, /\.drive-segment-address \{/);
  assert.match(cssSource, /\.drive-segment-address--empty \{/);
});

test("overlap focus expands only events with directly intersecting time intervals", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(pageSource, /const \[overlapHoverId, setOverlapHoverId\] = useState<string \| null>\(null\)/);
  assert.match(pageSource, /const overlapFocusId = overlapHoverId \?\? eventToolsId;/);
  assert.match(pageSource, /const overlapFocusEvent = overlapFocusId[\s\S]*?dayLayout\.find\(\(event\) => event\.id === overlapFocusId\)/);
  assert.match(pageSource, /const overlapPeers = overlapFocusEvent[\s\S]*?event\.id !== overlapFocusEvent\.id[\s\S]*?event\.start < overlapFocusEvent\.end[\s\S]*?event\.end > overlapFocusEvent\.start/);
  assert.match(pageSource, /const hasOverlapFocus = Boolean\(overlapFocusEvent && overlapPeers\.length\)/);
  assert.match(pageSource, /const isOverlapFocus = hasOverlapFocus && overlapFocusEvent\?\.id === event\.id;/);
  assert.match(pageSource, /const isOverlapPeer = overlapPeerIndex !== undefined;/);
  assert.match(pageSource, /const narrow = event\.laneCount > 1 && !isOverlapFocus;/);
  assert.match(pageSource, /\$\{isOverlapFocus \? "is-overlap-focus" : ""\}[\s\S]*?\$\{isOverlapPeer \? "is-overlap-peer" : ""\}/);
  assert.match(pageSource, /onMouseEnter=\{\(mouseEvent\) => \{[\s\S]*?setOverlapHoverId\(event\.id\);/);
  assert.match(pageSource, /onMouseLeave=\{\(\) => \{[\s\S]*?setOverlapHoverId\(\(current\) => current === event\.id \? null : current\);/);
  assert.match(pageSource, /onFocus=\{\(\) => setOverlapHoverId\(event\.id\)\}/);
  assert.match(cssSource, /\.calendar-event\.is-overlap-focus \{[\s\S]*?z-index:\s*32/);
  assert.match(cssSource, /\.calendar-event\.is-overlap-peer \{[\s\S]*?opacity:\s*\.68/);
  assert.match(cssSource, /\.calendar-event\.is-overlap-peer \.event-content,[\s\S]*?\.calendar-event\.is-overlap-peer \.event-roster \{[\s\S]*?opacity:\s*0/);
});

test("drag previews use the post-drop lane and surface occupied-time conflicts", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(pageSource, /const previewLayouts = useMemo\(/);
  assert.match(pageSource, /Array\.from\(\{ length: dayCount \}/);
  assert.match(pageSource, /const previewLane = preview \? previewLayouts\?\.\[preview\.day\]/);
  assert.match(pageSource, /const previewConflictCount = preview/);
  assert.match(pageSource, /className=\{`drag-ghost \$\{previewConflictCount > 0 \? "drag-ghost--conflict"/);
  assert.match(pageSource, /\(viewMode === "day" \? 100 : 100 \/ dayCount\)/);
  assert.match(pageSource, /Overlaps \{previewConflictCount\}/);
  assert.match(pageSource, /const conflictNote = conflicts > 0/);
  assert.match(cssSource, /\.drag-ghost--conflict \.ghost-core/);
  assert.match(cssSource, /\.drag-ghost-conflict \{/);
});

test("drag auto-scroll exposes an upward target beneath the sticky header", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /const topEdgeZone = 48/);
  assert.match(pageSource, /const headerBottom = scroll\.querySelector<HTMLElement>\("\.calendar-head"\)\?\.getBoundingClientRect\(\)\.bottom/);
  assert.match(pageSource, /const visibleGridTop = clamp\(headerBottom, rect\.top, rect\.bottom\)/);
  assert.match(pageSource, /pointer\.clientY < visibleGridTop \+ topEdgeZone/);
});

test("hour labels live in empty day slots instead of a separate time gutter", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(pageSource, /className="time-gutter"|className="timezone-cell"/);
  assert.match(pageSource, /className="slot-hour-labels"/);
  assert.match(pageSource, /event\.start < hour \+ 60 && event\.end > hour/);
  assert.match(pageSource, /formatTime\(hour\)/);
  assert.doesNotMatch(cssSource, /73px/);
  assert.match(cssSource, /\.slot-hour-labels\s*\{/);
  assert.match(pageSource, /className="event-time-rail"/);
});

test("a deliberate blank-slot click opens a new event without turning a scroll into an add", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /type BlankSlotPress = \{/);
  assert.match(pageSource, /const blankSlotPressRef = useRef<BlankSlotPress \| null>\(null\)/);
  assert.match(pageSource, /Math\.hypot\(pointerEvent\.clientX - press\.startX, pointerEvent\.clientY - press\.startY\) > 8/);
  assert.match(pageSource, /const safeTap = press\?\.day === dayIndex && !press\.moved/);
  assert.match(pageSource, /if \(!safeTap\) return;[\s\S]*?openNew\(dayIndex, start, scrollRef\.current, \{ clientX: pointerEvent\.clientX, clientY: pointerEvent\.clientY \}\)/);
  assert.doesNotMatch(pageSource, /visualEndMinutes - 60/);
  assert.match(pageSource, /function handleCalendarScroll\(\) \{[\s\S]*?blankSlotPressRef\.current = null/);
});
