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
  assert.doesNotMatch(html, />\s*4 days\s*</i);
  assert.doesNotMatch(html, /data-add-event|day-nav/);
  // The App data panel (install prompt + backup/restore) was removed.
  assert.doesNotMatch(html, /install-app-button/);
  assert.doesNotMatch(html, />\s*App data\s*</i);
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
  assert.match(pageSource, /family-weekly-calendar:v1/);
  assert.match(pageSource, /family-weekly-calendar:settings:v1/);
  assert.match(pageSource, /JSON\.stringify\(\{ version: 1, events \}\)/);
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
  assert.match(css, /\.event-core \{[\s\S]*?background:\s*var\(--event-surface\)/);
  assert.match(css, /\.calendar-event \{[\s\S]*?--event-stroke: 2px;/);
  assert.match(css, /\.event-core \{[\s\S]*?border: var\(--event-stroke\) solid var\(--event-outline\);/);
  assert.match(css, /\.drive-segment \{[\s\S]*?repeating-linear-gradient\(\s*135deg,[\s\S]*?var\(--fc-accent\)[\s\S]*?var\(--event-dark, var\(--fc-app-bg\)\)/);
  assert.doesNotMatch(css, /\.drive-segment \{[^}]*border-inline:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(css, /\.drive-before \{[^}]*border-top:\s*var\(--event-stroke\) dotted/);
  assert.doesNotMatch(css, /\.drive-after \{[^}]*border-bottom:\s*var\(--event-stroke\) dotted/);
  assert.match(css, /\.drive-before \{[\s\S]*?border-radius: var\(--event-stack-radius\) var\(--event-stack-radius\) 0 0;/);
  assert.match(css, /\.drive-after \{[\s\S]*?border-radius: 0 0 var\(--event-stack-radius\) var\(--event-stack-radius\);/);
  assert.match(css, /\.ghost-drive \{[\s\S]*?repeating-linear-gradient\(\s*135deg,[\s\S]*?var\(--fc-accent\)/);
  assert.doesNotMatch(css, /\.ghost-drive \{[^}]*border-inline:\s*var\(--event-stroke\) dotted/);
  assert.match(css, /\.ghost-before[\s\S]*?border-radius: var\(--event-stack-radius\) var\(--event-stack-radius\) 0 0;/);
  assert.match(css, /\.ghost-after[\s\S]*?border-radius: 0 0 var\(--event-stack-radius\) var\(--event-stack-radius\);/);
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
  assert.match(pageSource, /const editorOpen = Boolean\(\(draft && !quickAddOpen\) \|\| deleteChoice\)/);
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
  assert.match(pageSource, /const peopleLimit = event\.people\.length > 3 \? 2 : 3/);
  // Chips wrap under the name, so a narrow card no longer drops people to fit.
  assert.doesNotMatch(pageSource, /const peopleLimit = narrow \?/);
  // People are chips under the name now, not a reserved right-hand column.
  assert.match(cssSource, /\.event-roster \{[\s\S]*?position: static;[\s\S]*?flex-wrap: wrap;[\s\S]*?justify-content: center;/);
  assert.doesNotMatch(cssSource, /\.event-roster \{[^}]*position: absolute/);
  assert.match(cssSource, /\.person-signature \{[\s\S]*?display: inline-flex;[\s\S]*?border-radius: 999px;/);
  assert.match(cssSource, /\.person-signature::before \{[\s\S]*?border-radius: 50%;[\s\S]*?background: var\(--person-color/);
  assert.doesNotMatch(cssSource, /\.person-signature::after/);
  // The content box centres its stack and reserves nothing on the right.
  assert.match(cssSource, /\.event-content \{[\s\S]*?flex-direction: column;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;[\s\S]*?text-align: center;/);
  assert.doesNotMatch(cssSource, /\.event-content \{[^}]*inset: 7px 104px/);
  assert.match(cssSource, /\.event--compact \.event-content strong \{ font-size: 19px; line-height: 1; \}/);
  assert.match(cssSource, /\.event-main,\r?\n\.ghost-main \{[\s\S]*?margin-left: 0/);
  assert.match(cssSource, /\.event-core \{[\s\S]*?radial-gradient\(circle at 94% -18%[\s\S]*?var\(--event-surface-high\)/);
  assert.match(cssSource, /\.event-rail-time \{[\s\S]*?border-radius: 10px;[\s\S]*?background: linear-gradient\(180deg, #0c2630, #07181f\)/);
  assert.match(cssSource, /\.event-content strong \{[\s\S]*?font-weight: 950/);
  assert.match(cssSource, /\.event-artwork-wash \{[\s\S]*?display: none;[\s\S]*?opacity: 0/);
  assert.match(cssSource, /\.event-main\.has-artwork::before,[\s\S]*?display: none;[\s\S]*?background-image: none;[\s\S]*?opacity: 0/);
  assert.match(cssSource, /\.event-main\.has-artwork::after,[\s\S]*?display: none;[\s\S]*?background: none;[\s\S]*?opacity: 0/);
});

test("phone header keeps full-size, labeled controls without hiding the filters", async () => {
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  const phoneHeaderStart = cssSource.indexOf("@media (max-width: 620px)");
  const phoneHeaderEnd = cssSource.indexOf("@media (max-width: 430px)", phoneHeaderStart);
  const phoneHeader = cssSource.slice(phoneHeaderStart, phoneHeaderEnd);
  assert.match(phoneHeader, /\.planner-header \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(phoneHeader, /\.header-view-controls \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 2;/);
  assert.match(phoneHeader, /\.filters-toggle > span:last-child \{ display: inline; \}/);
  assert.match(phoneHeader, /\.compact-toggle-label \{ display: inline; \}/);
  assert.match(phoneHeader, /\.view-toggle button \{ min-width: 44px; min-height: 44px; height: 44px;/);

  const narrowPhoneHeaderStart = cssSource.indexOf("@media (max-width: 350px)");
  const narrowPhoneHeaderEnd = cssSource.indexOf("@media (max-width: 860px) and (max-height: 520px)", narrowPhoneHeaderStart);
  const narrowPhoneHeader = cssSource.slice(narrowPhoneHeaderStart, narrowPhoneHeaderEnd);
  assert.match(narrowPhoneHeader, /\.filters-toggle \{ min-width: 44px;/);
  assert.match(narrowPhoneHeader, /\.header-add-button \{ min-width: 44px;/);
  assert.match(narrowPhoneHeader, /\.compact-toggle \{ min-width: 44px;/);
  assert.match(narrowPhoneHeader, /\.view-toggle button \{ min-width: 44px;/);
  assert.match(narrowPhoneHeader, /\.view-day \.day-date,\s*\.view-week \.day-heading:last-of-type \.day-date \{ display: none; \}/);
  assert.doesNotMatch(narrowPhoneHeader, /min-width: (?:40|42)px/);
});

test("every card shows its start clock while its end clock waits for hover or focus", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  // The old shared-boundary status design and its connector line are gone.
  assert.doesNotMatch(pageSource, /event--shared-start-time|event--shared-end-time/);
  assert.doesNotMatch(pageSource, /className="event-shared-time"/);
  assert.doesNotMatch(pageSource, /sharedTimeBoundaryTokens/);
  assert.doesNotMatch(cssSource, /\.event-shared-time\b/);
  assert.doesNotMatch(cssSource, /\.event-rail-connector\b/);
  // The start clock always renders. Every end clock uses the same hidden-at-rest
  // modifier, regardless of whether another event follows it.
  assert.match(pageSource, /<div className="event-time-rail" aria-hidden="true">[\s\S]*?<span className="event-rail-time event-rail-start">\{shortTime\(activityStart\(event\)\)\}<\/span>/);
  assert.match(pageSource, /className="event-rail-time event-rail-end event-rail-end--peek"/);
  assert.doesNotMatch(pageSource, /eventToolsId|event-time-handle|event-departure-button|calendar-hour-picker/);
  assert.match(cssSource, /\.event-rail-end--peek \{[\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/);
  assert.match(cssSource, /\.calendar-event:hover \.event-rail-end--peek,\s*\.calendar-event:focus-within \.event-rail-end--peek \{[\s\S]*?opacity:\s*1;/);
  // No transition is declared for the peek reveal, so hover is instant.
  assert.doesNotMatch(cssSource, /\.event-rail-end--peek[\s\S]{0,200}transition/);
});

test("overlapped cards keep the same single start-time rail as regular cards", async () => {
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(cssSource, /\.calendar-event\.event--micro,\s*\.calendar-event\.event--narrow \{ --event-stack-radius: 10px; \}/);
  assert.match(cssSource, /\.event--narrow \.event-core \{ --event-time-rail: 48px; \}/);
  assert.doesNotMatch(cssSource, /\.event--narrow \.event-core \{[\s\S]{0,180}grid-template-rows:/);
  assert.match(cssSource, /\.calendar-event:not\(\.event--narrow\) \.event-core \{ grid-template-rows:/);
  assert.match(cssSource, /\.calendar-event\.event--narrow \.event-time-rail \{ display: none; \}/);
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

  assert.match(cssSource, /\.calendar-scroll\.view-day \{ touch-action:\s*pan-y; -webkit-overflow-scrolling:\s*touch;/);
  assert.match(cssSource, /\.calendar-scroll\.view-day \.calendar-event \{ touch-action:\s*auto;/);
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
  // Compact retains the shared end-time hover/focus behavior while preserving
  // its denser clock placement.
  assert.match(cssSource, /\.planner-app\.is-compact \.event-rail-end \{ bottom: 3px; \}/);
  assert.doesNotMatch(cssSource, /\.planner-app\.is-compact \.event-rail-end \{ display: none; \}/);
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
  assert.match(cssSource, /\.view-week \.day-heading:last-of-type \{ padding-right: 58px; \}/);
});

test("touch cards preserve native scrolling and open the editor with one tap", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(pageSource, /beginTouchPress|TouchCardScroll|scrollFromTouchedCard|endTouchedCardScroll/);
  assert.match(pageSource, /if \(pointerEvent\.pointerType === "touch" \|\| pointerEvent\.pointerType === "pen"\) return;/);
  assert.match(pageSource, /onClick=\{\(clickEvent\) => \{[\s\S]*?openEditor\(event, clickEvent\.currentTarget\);/);
  assert.match(cssSource, /\.calendar-scroll\.view-day \{ touch-action:\s*pan-y;/);
  assert.match(cssSource, /\.calendar-scroll\.view-day \.calendar-event \{ touch-action:\s*auto;/);
  assert.doesNotMatch(cssSource, /\.calendar-event \{ touch-action:\s*none/);
});

test("cards stay visually stable while the editor owns time and Drive Time changes", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(pageSource, /eventToolsId|scheduleEventTools|event-time-handle|event-departure|calendar-hour-picker|event-edge-add/);
  assert.doesNotMatch(cssSource, /event-tools-open|event-time-handle|event-departure|event-edge-tools|calendar-hour-picker/);
  assert.match(pageSource, /className="drive-time-editor"/);
  assert.match(pageSource, /function addDraftDrive\(edge: "start" \| "end"\)/);
  assert.match(pageSource, /\+15 min before/);
  assert.match(pageSource, /\+15 min after/);
  assert.match(pageSource, /onClick=\{\(\) => addDraftDrive\("start"\)\}/);
  assert.match(pageSource, /onClick=\{\(\) => addDraftDrive\("end"\)\}/);
  assert.match(cssSource, /\.drive-time-controls \.button \{[\s\S]*?min-height:\s*54px/);
  assert.doesNotMatch(cssSource, /--event-time-rail:\s*(?:78|88)px/);
  assert.match(pageSource, /className="column-earlier-hour-control"/);
});

test("the editor offers valid 15-minute start and end choices with labelled Drive Time", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /const timeOptions = Array\.from\([\s\S]*?\(END_MINUTES - START_MINUTES\) \/ SNAP_MINUTES \+ 1[\s\S]*?START_MINUTES \+ index \* SNAP_MINUTES/);
  assert.match(pageSource, /value=\{activityStart\(draft\)\}[\s\S]*?time >= START_MINUTES \+ driveBefore\(draft\) && time < activityEnd\(draft\)/);
  assert.match(pageSource, /value=\{activityEnd\(draft\)\}[\s\S]*?time > activityStart\(draft\) && time <= END_MINUTES - driveAfter\(draft\)/);
  assert.match(pageSource, /<span>Drive Time<\/span>[\s\S]*?Travel sits outside the event and is excluded from its hours/);
  assert.match(pageSource, /start: draft\.start - SNAP_MINUTES, driveBefore: driveBefore\(draft\) \+ SNAP_MINUTES/);
  assert.match(pageSource, /end: draft\.end \+ SNAP_MINUTES, driveAfter: driveAfter\(draft\) \+ SNAP_MINUTES/);
  assert.doesNotMatch(pageSource, /HourPicker|hourPicker|calendar-hour-picker/);
});

test("delete always asks for confirmation and keyboard adjustments have a visible exit", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  const deleteStart = pageSource.indexOf("function deleteDraft()");
  const deleteEnd = pageSource.indexOf("function confirmDelete(", deleteStart);
  const deleteDraft = pageSource.slice(deleteStart, deleteEnd);
  assert.ok(deleteStart >= 0 && deleteEnd > deleteStart, "delete confirmation entry point must be locatable");
  assert.match(deleteDraft, /const matches = tag \? events\.filter\(\(event\) => normalizeTag\(event\.tag\) === tag\) : \[persisted\];/);
  assert.match(deleteDraft, /setDeleteChoice\(\{ event: persisted, matchingIds: matches\.map\(\(event\) => event\.id\) \}\);/);
  assert.doesNotMatch(deleteDraft, /commit\(/);
  assert.match(pageSource, /<h2 id="delete-choice-title">\{linked \? "Delete linked event" : "Delete event\?"\}<\/h2>/);
  assert.match(pageSource, /<button className="resize-surface-close"[\s\S]*?>Done<\/button>/);
  assert.match(cssSource, /\.resize-surface-close \{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px/);
});

test("phone chrome keeps calendar targets at 44px", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(cssSource, /\.day-navigation button \{ width: 44px; min-width: 44px; height: 44px; \}/);
  assert.match(cssSource, /\.column-earlier-hour-control \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  assert.match(cssSource, /\.week-range-controls button \{ min-width: 44px; min-height: 44px; \}/);
  assert.match(pageSource, /className="week-range-label" aria-hidden="true">Day<\/span>/);
  assert.doesNotMatch(pageSource, /title=\{dayCount < ALL_DAYS\.length/);
  assert.doesNotMatch(pageSource, /title=\{compactMode/);
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
  assert.match(cssSource, /\.drive-before \{[\s\S]*?border-radius: var\(--event-stack-radius\) var\(--event-stack-radius\) 0 0;/);
  assert.match(cssSource, /\.drive-after \{[\s\S]*?border-radius: 0 0 var\(--event-stack-radius\) var\(--event-stack-radius\);/);
  assert.match(cssSource, /\.event-core \{[\s\S]*?border-radius: var\(--event-stack-radius\);/);
  assert.match(cssSource, /\.drive-segment-address \{/);
  assert.match(cssSource, /\.drive-segment-address--empty \{/);
});

test("overlapped cards stay in their assigned lanes while hover only reveals the end clock", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(pageSource, /const normalLeft = `calc\(\$\{\(event\.lane \/ event\.laneCount\) \* 100\}% \+ 3px\)`;/);
  assert.match(pageSource, /const normalWidth = `calc\(\$\{100 \/ event\.laneCount\}% - 6px\)`;/);
  assert.match(pageSource, /left: normalLeft,[\s\S]*?width: normalWidth,/);
  assert.match(pageSource, /const narrow = event\.laneCount > 1;/);
  assert.doesNotMatch(pageSource, /overlapHoverId|isOverlapFocus|isOverlapPeer/);
  assert.doesNotMatch(cssSource, /\.calendar-event\.is-overlap-/);
  assert.match(cssSource, /\.calendar-event:hover \.event-rail-end--peek,[\s\S]*?opacity:\s*1;/);
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
