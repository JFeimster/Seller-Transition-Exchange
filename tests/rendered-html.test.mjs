import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

let worker;

async function getWorker() {
  if (worker) return worker;
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  ({ default: worker } = await import(workerUrl.href));
  return worker;
}

async function render(pathname) {
  const activeWorker = await getWorker();
  return activeWorker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders development preview metadata", async () => {
  const response = await render("/");

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

const guides = [
  "preparing-to-sell-your-business", "understanding-business-valuation",
  "improving-business-value-before-a-sale", "organizing-financial-records",
  "reducing-owner-dependence", "seller-financing", "sba-acquisition-financing",
  "management-buyouts", "family-succession", "partner-buyouts",
  "confidential-business-sales", "choosing-transaction-advisors",
  "preparing-employees-and-customers", "what-happens-after-closing",
];

test("renders all fourteen resource guide routes", async () => {
  for (const slug of guides) {
    const response = await render(`/resources/${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /EDITORIAL REVIEW REQUIRED/i, slug);
    assert.match(html, /Practical checklist/i, slug);
    assert.match(html, /Educational boundary/i, slug);
  }
});

test("renders the searchable resource directory", async () => {
  const response = await render("/resources");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Search decisions, risks, or paths/i);
  assert.match(html, /Preparing to Sell Your Business/i);
  assert.match(html, /What Happens After Closing/i);
});

const quietExitPublicRoutes = [
  ["/quiet-exit", /SELL QUIETLY/i],
  ["/quiet-exit/how-it-works", /Confidentiality is a workflow/i],
  ["/quiet-exit/confidentiality", /Choose who sees what/i],
  ["/quiet-exit/buyer-qualification", /Qualified buyer interest is better/i],
  ["/quiet-exit/resources", /Prepare the process before the market sees/i],
];

test("renders all public Quiet Exit routes without exposing protected records", async () => {
  for (const [pathname, marker] of quietExitPublicRoutes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, marker, pathname);
    assert.doesNotMatch(html, /knownIdentifiersPrivate|ownerUserId|privateContent/i, pathname);
  }
});

test("protects seller, buyer, and admin Quiet Exit routes", async () => {
  for (const pathname of ["/seller/quiet-exit", "/buyer/profile", "/admin/quiet-exit"]) {
    const response = await render(pathname);
    assert.ok([302, 303, 307, 308].includes(response.status), `${pathname}: ${response.status}`);
    assert.match(response.headers.get("location") ?? "", /signin-with-chatgpt/i, pathname);
  }
});

test("public sitemap includes Quiet Exit education and excludes protected workspaces", async () => {
  const response = await render("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /\/quiet-exit\/confidentiality/);
  assert.match(xml, /\/quiet-exit\/buyer-qualification/);
  assert.doesNotMatch(xml, /\/seller\/quiet-exit|\/buyer\/profile|\/admin\/quiet-exit/);
  assert.match(xml, /\/financing-readiness/);
  assert.match(xml, /\/capital-desk/);
  assert.doesNotMatch(xml, /\/seller\/financing|\/admin\/capital-desk/);
});

test("Quiet Exit API refuses unauthenticated durable actions", async () => {
  const activeWorker = await getWorker();
  const response = await activeWorker.fetch(
    new Request("http://localhost/api/quiet-exit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create_mandate", payload: {} }),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.error, "Sign in is required.");
});

test("financing routes expose public education and protect workspaces", async () => {
  for (const pathname of ["/financing-readiness", "/financing-readiness/how-it-works", "/financing-readiness/requirements", "/capital-desk", "/capital-desk/resources"]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), /financing|capital desk/i, pathname);
  }
  for (const pathname of ["/seller/financing", "/seller/financing/1/readiness", "/buyer/financing", "/admin/capital-desk"]) {
    const response = await render(pathname);
    assert.ok([302, 303, 307, 308].includes(response.status), `${pathname}: ${response.status}`);
  }
});

test("Financing API refuses unauthenticated durable actions", async () => {
  const activeWorker = await getWorker();
  const response = await activeWorker.fetch(new Request("http://localhost/api/financing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_request", payload: {} }) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 401);
});

test("preserves Version 2.0.2 public route coverage", async () => {
  const routes = [
    "/", "/businesses-for-sale", "/confidential-opportunities", "/businesses-for-sale/demo-mid-atlantic-field-services",
    "/industries", "/industries/hvac", "/markets", "/markets/washington-dc", "/exit-readiness", "/value-builder",
    "/resources", "/advisors", "/digital-businesses", "/digital-businesses/marketplace", "/digital-businesses/valuation",
    "/digital-businesses/sell", "/digital-businesses/buy", "/digital-businesses/resources",
  ];
  for (const pathname of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html/i, pathname);
  }
});

test("Version 2.6 exposes public network routes and protects workspaces", async () => {
  for (const pathname of ["/buyers", "/buyers/how-it-works", "/buyers/types", "/buyers/resources", "/advisors", "/advisors/categories", "/advisors/how-it-works", "/advisors/resources", "/markets", "/markets/washington-dc", "/community", "/community/events", "/community/roundtables", "/community/workshops", "/community/newsletter"]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, /network|transition|market/i, pathname);
    assert.doesNotMatch(html, /privateAdminNotes|rawPayload|availableEquityRange|liquidity/i, pathname);
  }
  for (const pathname of ["/buyer/dashboard", "/buyer/verification", "/advisor/profile", "/seller/buyer-network", "/admin/network", "/admin/advisor-verification"]) {
    const response = await render(pathname);
    assert.ok([302, 303, 307, 308].includes(response.status), `${pathname}: ${response.status}`);
  }
});

test("Version 2.6 network API refuses unauthenticated durable actions", async () => {
  const activeWorker = await getWorker();
  const response = await activeWorker.fetch(new Request("http://localhost/api/network", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_introduction", payload: {} }) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.error, "Sign in is required.");
});

test("Version 2.6 sitemap includes public network education only", async () => {
  const response = await render("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  for (const route of ["/buyers", "/advisors", "/markets/washington-dc", "/community/events"]) assert.match(xml, new RegExp(route.replaceAll("/", "\\/")));
  for (const route of ["/buyer/profile", "/advisor/profile", "/seller/buyer-network", "/admin/network"]) assert.doesNotMatch(xml, new RegExp(route.replaceAll("/", "\\/")));
});

test("Version 2.7 public indexing policy is explicit", async () => {
  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /\/seller\//);
  assert.match(robotsText, /\/sell/);
  assert.match(robotsText, /\/buyer\//);
  assert.match(robotsText, /sitemap\.xml/);
  for (const pathname of ["/sell", "/buyers/123", "/advisors/123"]) {
    const response = await render(pathname);
    assert.ok([200, 302, 303, 307, 308].includes(response.status), pathname);
    if (response.status !== 200) continue;
    const html = await response.text();
    assert.match(html, /noindex/i, pathname);
  }
});

test("Version 2.7 network protected reads require authentication", async () => {
  const activeWorker = await getWorker();
  for (const view of ["seller", "buyer", "advisor", "admin"]) {
    const response = await activeWorker.fetch(new Request(`http://localhost/api/network?view=${view}`), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 401, view);
  }
});

test("renders reusable vertical intelligence hubs and representative overlays", async () => {
  const directory = await render("/industries");
  assert.equal(directory.status, 200);
  assert.match(await directory.text(), /VERTICAL SELLER INTELLIGENCE/i);
  for (const [pathname, marker] of [["/industries/hvac", /HVAC Seller Transition Skill/i], ["/industries/pest-control", /Pest Control Seller Transition Skill/i], ["/industries/laundromats", /Laundromats Seller Transition Skill/i], ["/industries/digital-assets", /Digital Assets Seller Transition Skill/i]]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, marker, pathname);
    assert.match(html, /Start my/i, pathname);
    assert.match(html, new RegExp(marker.source.split(" Seller")[0], "i"), pathname);
    assert.match(html, /Inferred/i, pathname);
  }
});

test("industry hub routes are discoverable in the public sitemap", async () => {
  const response = await render("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /\/industries\/hvac/);
  assert.match(xml, /\/industries\/digital-assets/);
  assert.doesNotMatch(xml, /\/seller\/quiet-exit|\/admin\/quiet-exit/);
});

test("preserves existing authenticated route gates", async () => {
  const routes = [
    "/sell", "/seller/dashboard", "/admin/review", "/transition", "/seller-launch-studio", "/buyer-matching",
    "/acquisition-financing", "/legacy-matching", "/transition-planning", "/deal-room",
  ];
  for (const pathname of routes) {
    const response = await render(pathname);
    assert.ok([302, 303, 307, 308].includes(response.status), `${pathname}: ${response.status}`);
    assert.match(response.headers.get("location") ?? "", /signin-with-chatgpt/i, pathname);
  }
});

const ownershipPublicRoutes = [
  ["/change-of-ownership", /There is more than one way to leave a business/i],
  ["/change-of-ownership/pathways", /Same business\. Very different handoffs/i],
  ["/change-of-ownership/how-it-works", /Six steps\. One canonical plan/i],
  ["/change-of-ownership/legacy", /Legacy is a decision input/i],
  ["/change-of-ownership/resources", /Field guides for the transition table/i],
  ["/change-of-ownership/external-sale", /EXTERNAL SALE/i],
  ["/change-of-ownership/management-buyout", /MANAGEMENT BUYOUT/i],
  ["/change-of-ownership/partner-buyout", /PARTNER BUYOUT/i],
  ["/change-of-ownership/family-succession", /FAMILY SUCCESSION/i],
  ["/change-of-ownership/employee-ownership", /EMPLOYEE OWNERSHIP/i],
  ["/change-of-ownership/partial-sale", /PARTIAL SALE/i],
  ["/change-of-ownership/seller-financed-transition", /SELLER-FINANCED TRANSITION/i],
  ["/change-of-ownership/rollover-equity", /ROLLOVER EQUITY/i],
];

test("renders public Change-of-Ownership education without private Legacy Profile data", async () => {
  for (const [pathname, marker] of ownershipPublicRoutes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, marker, pathname);
    assert.doesNotMatch(html, /excludedBuyerCharacteristics|excludedOrganizations|ownerUserId|privateLegacy/i, pathname);
  }
});

test("protects seller, buyer, and admin transition workspaces", async () => {
  for (const pathname of ["/seller/transition-plans", "/seller/transition-plans/123/legacy", "/buyer/transition-profile", "/buyer/legacy-profile", "/buyer/transition-opportunities", "/admin/transition-plans", "/admin/legacy-matches", "/admin/successor-review"]) {
    const response = await render(pathname);
    assert.ok([302, 303, 307, 308].includes(response.status), `${pathname}: ${response.status}`);
    assert.match(response.headers.get("location") ?? "", /signin-with-chatgpt/i, pathname);
  }
});

test("public sitemap discovers change-of-ownership education only", async () => {
  const response = await render("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /\/change-of-ownership\/management-buyout/);
  assert.match(xml, /\/change-of-ownership\/rollover-equity/);
  assert.doesNotMatch(xml, /\/seller\/transition-plans|\/buyer\/transition-profile|\/admin\/transition-plans/);
});

test("Transition Planning API refuses unauthenticated durable actions", async () => {
  const activeWorker = await getWorker();
  const response = await activeWorker.fetch(new Request("http://localhost/api/change-of-ownership", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_plan", payload: {} }) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.error, "Sign in is required.");
});

test("Version 2.5 protects seller, buyer, and admin package workspaces", async () => {
  for (const pathname of ["/seller/launch-studio", "/seller/launch-studio/1/claims", "/seller/deal-room", "/buyer/deal-room", "/admin/launch-studio", "/admin/deal-rooms"]) {
    const response = await render(pathname);
    assert.ok([302, 303, 307, 308].includes(response.status), `${pathname}: ${response.status}`);
    assert.match(response.headers.get("location") ?? "", /signin-with-chatgpt/i, pathname);
  }
});

test("Version 2.5 APIs refuse unauthenticated durable actions", async () => {
  const activeWorker = await getWorker();
  for (const [pathname, body] of [["/api/seller-launch-studio", { action: "generate", payload: {} }], ["/api/deal-room", { action: "create_room", payload: {} }]]) {
    const response = await activeWorker.fetch(new Request(`http://localhost${pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 401, pathname);
    assert.equal((await response.json()).error, "Sign in is required.", pathname);
  }
});
