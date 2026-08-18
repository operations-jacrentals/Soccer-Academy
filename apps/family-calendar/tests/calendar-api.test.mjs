import assert from "node:assert/strict";
import test from "node:test";

/**
 * Access-control and merge contracts for the shared calendar API, driven
 * through the built Worker with an in-memory stand-in for D1.
 */

const OWNER = "owner@example.com";

async function loadWorker() {
  const url = new URL("../dist/server/index.js", import.meta.url);
  url.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(url.href);
  return worker;
}

/** Enough of the D1 prepared-statement API for this route, backed by a Map. */
function fakeD1(rows = new Map()) {
  return {
    rows,
    prepare(query) {
      const statement = {
        values: [],
        bind(...values) {
          statement.values = values;
          return statement;
        },
        async first() {
          const row = rows.get(statement.values[0]);
          if (!row) return null;
          return {
            document: row.document,
            revision: row.revision,
            initialized: row.initialized,
            updatedAt: row.updatedAt,
          };
        },
        async run() {
          if (/^INSERT/i.test(query)) {
            const [id, document, revision, initialized, updatedAt] = statement.values;
            if (rows.has(id)) return { meta: { changes: 0 } };
            rows.set(id, { document, revision, initialized, updatedAt });
            return { meta: { changes: 1 } };
          }
          // `replace` also sets initialized, so it binds one extra value.
          const withInitialized = statement.values.length === 6;
          const [document, revision] = statement.values;
          const updatedAt = withInitialized ? statement.values[3] : statement.values[2];
          const id = withInitialized ? statement.values[4] : statement.values[3];
          const expectedRevision = withInitialized ? statement.values[5] : statement.values[4];

          const row = rows.get(id);
          if (!row || row.initialized !== 1 || row.revision !== expectedRevision) {
            return { meta: { changes: 0 } };
          }
          rows.set(id, { document, revision, initialized: 1, updatedAt });
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
}

const ctx = { waitUntil() {}, passThroughOnException() {} };

function call(worker, { headers = {}, env = {}, body } = {}) {
  const request = body
    ? new Request("http://localhost/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      })
    : new Request("http://localhost/api/calendar", { headers });
  return worker.fetch(request, {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    ...env,
  }, ctx);
}

function event(overrides = {}) {
  return {
    id: "soccer-1",
    title: "Soccer club",
    day: 0,
    start: 18 * 60,
    end: 19 * 60 + 30,
    color: "#3c6fb0",
    bullets: ["Sam + Alex"],
    people: ["Sam", "Alex"],
    town: true,
    kind: "fixed",
    ...overrides,
  };
}

test("a host without sign-in serves the calendar rather than locking everyone out", async () => {
  // The deployed calendar has always been open to anyone with the link, and its
  // host injects no identity headers. Defaulting to "identified" there would 401
  // every visitor — including the people the calendar is for.
  const worker = await loadWorker();
  const env = { DB: fakeD1() };

  const bootstrap = await call(worker, { env, body: { type: "bootstrap", events: [event()] } });
  assert.equal(bootstrap.status, 201);

  const read = await call(worker, { env });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).events[0].title, "Soccer club");
});

test("two devices with no sign-in share one calendar", async () => {
  // The whole point: a change made on one device is visible on the other.
  const worker = await loadWorker();
  const env = { DB: fakeD1() };

  await call(worker, { env, body: { type: "bootstrap", events: [event()] } });
  const edit = await call(worker, {
    env,
    body: { type: "patch", patch: { upserts: [], removeIds: [], updates: [{ id: "soccer-1", fields: { title: "Soccer club — moved indoors" } }] } },
  });
  assert.equal(edit.status, 200);

  const otherDevice = await call(worker, { env });
  assert.equal((await otherDevice.json()).events[0].title, "Soccer club — moved indoors");
});

test("an unidentified request is refused once sign-in is required", async () => {
  const worker = await loadWorker();
  const env = { DB: fakeD1(), CALENDAR_ACCESS_MODE: "identified" };

  const read = await call(worker, { env });
  assert.equal(read.status, 401);

  const write = await call(worker, { env, body: { type: "replace", events: [event()] } });
  assert.equal(write.status, 401);
});

test("setting an allowlist requires sign-in on its own", async () => {
  // An allowlist with nobody to check it against would be silently ignored.
  const worker = await loadWorker();
  const env = { DB: fakeD1(), CALENDAR_ALLOWED_EMAILS: OWNER };

  const anonymous = await call(worker, { env });
  assert.equal(anonymous.status, 401);

  const owner = await call(worker, {
    headers: { "oai-authenticated-user-email": OWNER },
    env,
    body: { type: "bootstrap", events: [event()] },
  });
  assert.equal(owner.status, 201);
});

test("an unusable access mode fails loudly instead of guessing", async () => {
  const worker = await loadWorker();
  const response = await call(worker, { env: { DB: fakeD1(), CALENDAR_ACCESS_MODE: "sometimes" } });
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /CALENDAR_ACCESS_MODE/);
});

test("the allowlist decides who reaches the calendar, ignoring address case", async () => {
  const worker = await loadWorker();
  const env = { CALENDAR_ALLOWED_EMAILS: OWNER, DB: fakeD1(), CALENDAR_ACCESS_MODE: "identified" };

  const stranger = await call(worker, {
    headers: { "oai-authenticated-user-email": "stranger@example.com" },
    env,
  });
  assert.equal(stranger.status, 403);

  const owner = await call(worker, {
    headers: { "oai-authenticated-user-email": OWNER.toUpperCase() },
    env,
    body: { type: "bootstrap", events: [event()] },
  });
  assert.equal(owner.status, 201);
});

test("each household gets its own calendar document", async () => {
  const worker = await loadWorker();
  const db = fakeD1();
  const env = {
    DB: db,
    CALENDAR_HOUSEHOLDS: JSON.stringify({ "coach@example.com": "rivera" }),
  };

  await call(worker, {
    headers: { "oai-authenticated-user-email": OWNER },
    env,
    body: { type: "bootstrap", events: [event({ title: "Soccer club" })] },
  });
  await call(worker, {
    headers: { "oai-authenticated-user-email": "coach@example.com" },
    env,
    body: { type: "bootstrap", events: [event({ title: "Rivera practice" })] },
  });

  assert.deepEqual([...db.rows.keys()].sort(), ["family", "rivera"]);

  const rivera = await call(worker, {
    headers: { "oai-authenticated-user-email": "coach@example.com" },
    env,
  });
  const riveraBody = await rivera.json();
  assert.equal(riveraBody.events.length, 1);
  assert.equal(riveraBody.events[0].title, "Rivera practice");
});

test("two people editing different fields of one event both keep their change", async () => {
  const worker = await loadWorker();
  const env = { DB: fakeD1() };
  const headers = { "oai-authenticated-user-email": OWNER };

  await call(worker, { headers, env, body: { type: "bootstrap", events: [event()] } });

  // Both patches are built from the same base event, as two devices would.
  const renamed = await call(worker, {
    headers,
    env,
    body: { type: "patch", patch: { upserts: [], removeIds: [], updates: [{ id: "soccer-1", fields: { title: "Soccer club — moved indoors" } }] } },
  });
  assert.equal(renamed.status, 200);

  const rescheduled = await call(worker, {
    headers,
    env,
    body: { type: "patch", patch: { upserts: [], removeIds: [], updates: [{ id: "soccer-1", fields: { start: 17 * 60 } }] } },
  });
  assert.equal(rescheduled.status, 200);

  const [saved] = (await rescheduled.json()).events;
  assert.equal(saved.title, "Soccer club — moved indoors", "the rename must survive the reschedule");
  assert.equal(saved.start, 17 * 60);
});

test("an update that would corrupt an event is dropped, not written", async () => {
  const worker = await loadWorker();
  const env = { DB: fakeD1() };
  const headers = { "oai-authenticated-user-email": OWNER };

  await call(worker, { headers, env, body: { type: "bootstrap", events: [event()] } });

  // end before start would leave the document holding an invalid event
  const response = await call(worker, {
    headers,
    env,
    body: { type: "patch", patch: { upserts: [], removeIds: [], updates: [{ id: "soccer-1", fields: { end: 9 * 60 } }] } },
  });
  const [saved] = (await response.json()).events;
  assert.equal(saved.end, 19 * 60 + 30, "the original end time must be preserved");
});

test("a patch from a client that predates field updates is still accepted", async () => {
  const worker = await loadWorker();
  const env = { DB: fakeD1() };
  const headers = { "oai-authenticated-user-email": OWNER };

  await call(worker, { headers, env, body: { type: "bootstrap", events: [event()] } });

  const response = await call(worker, {
    headers,
    env,
    body: { type: "patch", patch: { upserts: [event({ title: "Renamed by an old client" })], removeIds: [] } },
  });
  assert.equal(response.status, 200);
  const [saved] = (await response.json()).events;
  assert.equal(saved.title, "Renamed by an old client");
});
