import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Version 2.5 keeps generated materials separate from canonical source records", async () => {
  const schema = await read("db/schema.ts");
  for (const entity of ["generatedMaterials", "generatedMaterialAuditEvents", "dealRooms", "dealRoomItems", "dealRoomAccessGrants", "dealRoomAuditEvents"]) assert.match(schema, new RegExp(`export const ${entity}`));
  assert.match(schema, /sourceVersions/);
  assert.match(schema, /claimManifest/);
  assert.match(schema, /sellerApproval/);
  assert.match(schema, /adminApproval/);
});

test("material approval keeps seller, admin, claims, and confidentiality as independent gates", async () => {
  const logic = await read("app/lib/seller-launch-studio.ts");
  assert.match(logic, /Unsupported claims require revision/);
  assert.match(logic, /exceeds its confidentiality scope/);
  assert.match(logic, /Seller approval is required/);
  assert.match(logic, /Admin approval is required/);
  assert.match(logic, /sourceVersionsChanged/);
});

test("deal-room buyer access is disclosure-bound, item-scoped, expiring, and revocable", async () => {
  const route = await read("app/api/deal-room/route.ts");
  assert.match(route, /Approved for Disclosure/);
  assert.match(route, /itemScope/);
  assert.match(route, /expiresAt/);
  assert.match(route, /revokedAt/);
  assert.match(route, /\["Securely Stored", "Generated Material Stored"\]\.includes/);
  assert.match(route, /disclosure\.mandateId === room\.mandateId/);
});

test("secure binary upload state is represented honestly", async () => {
  const [schema, ui] = await Promise.all([read("db/schema.ts"), read("app/components/LaunchStudioDealRoomModule.tsx")]);
  assert.match(schema, /Secure Storage Pending Integration/);
  assert.match(schema, /Awaiting Secure Upload/);
  assert.match(ui, /does not represent a file as uploaded, scanned, verified, or disclosed/);
});

test("protected workspace routes remain discoverable only inside authenticated application flow", async () => {
  const [page, app, sitemap] = await Promise.all([read("app/[...path]/page.tsx"), read("app/components/ExchangeApp.tsx"), read("app/sitemap.ts")]);
  assert.match(page, /pathname\.startsWith\("\/seller\/"\)/);
  assert.match(page, /pathname\.startsWith\("\/buyer\/"\)/);
  assert.match(page, /pathname\.startsWith\("\/admin\/"\)/);
  assert.match(app, /\/seller\/launch-studio/);
  assert.match(app, /\/seller\/deal-room/);
  assert.doesNotMatch(sitemap, /seller\/launch-studio|seller\/deal-room|buyer\/deal-room|admin\/deal-room/);
});
