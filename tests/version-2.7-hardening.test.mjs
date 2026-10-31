import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Version 2.7 inventory and corrective migration are present", async () => {
  const [inventory, migration, journal] = await Promise.all([
    read("docs/version-2-operational-inventory.md"),
    read("drizzle/0009_strong_madame_web.sql"),
    read("drizzle/meta/_journal.json"),
  ]);
  assert.match(inventory, /Authorization matrix/);
  assert.match(inventory, /Public indexing allowlist/);
  assert.match(inventory, /Version 2 freeze/);
  assert.match(migration, /network_audit_events_entity_idx/);
  assert.match(migration, /introduction_requests_status_idx/);
  assert.match(journal, /0009_strong_madame_web/);
});

test("D1 migration sequence is contiguous through the Version 2 freeze", async () => {
  const journal = await read("drizzle/meta/_journal.json");
  for (let sequence = 0; sequence <= 9; sequence += 1) {
    assert.match(journal, new RegExp(`000${sequence}_`), `migration 000${sequence}`);
  }
});

test("public network API applies safe regional and event projections", async () => {
  const [source, schema] = await Promise.all([read("app/api/network/route.ts"), read("db/schema.ts")]);
  assert.match(source, /publicVisibility/);
  assert.match(schema, /privateAccessDetails/); // present in schema, intentionally absent from public projection
  assert.match(source, /regions: regionRows\.map/);
  assert.match(source, /external delivery pending/);
  assert.match(source, /verified public buyer/);
});

test("network actions preserve approval and access boundaries", async () => {
  const source = await read("app/api/network/route.ts");
  assert.match(source, /Deal Room grant remains separate/);
  assert.match(source, /Advisor introduction requires an approved public profile/);
  assert.match(source, /Unsupported introduction decision/);
  assert.match(source, /already on the private shortlist/);
});

test("public metadata and robots deny dynamic private participant profiles", async () => {
  const metadata = await read("app/[...path]/page.tsx");
  const robots = await read("app/robots.ts");
  assert.match(metadata, /resolved\.path\[0\] === "advisors"/);
  assert.match(metadata, /resolved\.path\[0\] === "buyers"/);
  assert.match(metadata, /index: false/);
  assert.match(robots, /\/buyers\//);
  assert.match(robots, /\/advisors\//);
});

test("accessible skip navigation and reduced motion remain present", async () => {
  const [app, css] = await Promise.all([read("app/components/ExchangeApp.tsx"), read("app/globals.css")]);
  assert.match(app, /Skip to main content/);
  assert.match(app, /id="main-content"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /skip-link/);
});
