import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Version 3.0 keeps the operating workspace on the canonical seller and business spine", async () => {
  const [schema, route, ui] = await Promise.all([read("db/schema.ts"), read("app/api/transaction-os/route.ts"), read("app/components/TransactionOSModule.tsx")]);
  for (const entity of ["transitionWorkflowCheckpoints", "transitionActionItems", "transitionEvidenceReviews", "transitionActivity"]) assert.match(schema, new RegExp(`export const ${entity}`));
  assert.match(route, /canonical seller and business records/);
  assert.match(route, /ensure_workspace/);
  assert.match(ui, /One seller, one business, one operating sequence/);
});

test("Version 3.0 requires authenticated, role-aware transition operations", async () => {
  const [route, page] = await Promise.all([read("app/api/transaction-os/route.ts"), read("app/[...path]/page.tsx")]);
  assert.match(route, /Sign in is required/);
  assert.match(route, /Admin authorization required/);
  assert.match(route, /No permission, approval, or disclosure state changed/);
  assert.match(page, /"\/seller"/);
  assert.match(page, /"\/admin"/);
});

test("Version 3.0 exposes the new workspace routes without making them public sitemap content", async () => {
  const [app, sitemap] = await Promise.all([read("app/components/ExchangeApp.tsx"), read("app/sitemap.ts")]);
  for (const route of ["/seller/transition", "/seller/tasks", "/seller/activity", "/seller/evidence", "/admin/operations", "/admin/reviews", "/admin/evidence", "/admin/access"]) assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  assert.doesNotMatch(sitemap, /seller\/transition|seller\/tasks|seller\/activity|seller\/evidence|admin\/operations|admin\/reviews|admin\/evidence|admin\/access/);
});
