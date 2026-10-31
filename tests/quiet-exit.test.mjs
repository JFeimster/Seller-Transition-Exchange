import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionDisclosure,
  evaluateBuyerMatch,
  isPubliclyDiscoverable,
  reviewAnonymousTeaser,
} from "../app/lib/quiet-exit.ts";

test("anonymous teaser removes direct and known identifiers before public output", () => {
  const sensitive = {
    legalBusinessName: "Copper Ridge HVAC LLC",
    tradeName: "Copper Ridge Comfort",
    sellerName: "Jordan Example",
    exactAddress: "9124 Furnace Road",
    phone: "202-555-0187",
    email: "owner@copperridge.example",
    website: "https://copperridge.example",
    licenseNumbers: "HVAC-987654",
    namedCustomers: "Capitol Demo Hospital",
    namedEmployees: "Morgan Sample",
    searchableAwards: "2025 Metro Furnace Excellence Award",
    uniquePhrases: "Comfort Is Our Copper Promise",
    exactServiceTerritory: "Georgetown east of Sample Creek",
  };
  const prose = Object.values(sensitive).join(" · ");
  const review = reviewAnonymousTeaser({
    generalIndustry: "HVAC services",
    broadRegion: "Mid-Atlantic",
    narrative: `Established operator led by Jordan Example at Copper Ridge HVAC LLC. ${prose}`,
  }, sensitive);

  assert.equal(review.publicationBlocked, true);
  assert.match(review.publicDraft.narrative ?? "", /\[REDACTED\]/);
  const publicJson = JSON.stringify(review.publicDraft).toLowerCase();
  for (const value of Object.values(sensitive)) assert.equal(publicJson.includes(value.toLowerCase()), false, value);
  const logJson = JSON.stringify(review.redactionLog).toLowerCase();
  for (const value of Object.values(sensitive)) assert.equal(logJson.includes(value.toLowerCase()), false, `redaction log leaked ${value}`);
});

test("hard seller constraints override otherwise strong buyer alignment", () => {
  const review = evaluateBuyerMatch({
    buyerType: "Strategic buyer",
    organization: "Excluded Consolidator",
    industries: "HVAC services",
    geography: "Northern Virginia",
    operatingExperience: "Ten years operating HVAC businesses",
    availableEquity: 100000,
    financingStatus: "Exploring",
    confidentialityAcknowledged: true,
    transitionApproach: "Retain employees",
  }, {
    preferredIndustries: "HVAC",
    preferredGeography: "Northern Virginia",
    minimumEquity: 500000,
    financingRequired: true,
    requiredBuyerTypes: "Strategic buyer",
  }, { excludedOrganizations: "Excluded Consolidator" });

  assert.equal(review.classification, "Hard Conflict");
  assert.equal(review.score, null);
  assert.ok(review.alignment.length >= 3);
  assert.ok(review.hardConflicts.length >= 3);
});

test("private mandates cannot become publicly discoverable", () => {
  assert.equal(isPubliclyDiscoverable("Private Mandate", "Active"), false);
  assert.equal(isPubliclyDiscoverable("Invite-Only Opportunity", "Active"), false);
  assert.equal(isPubliclyDiscoverable("Anonymous Teaser", "Approved"), false);
  assert.equal(isPubliclyDiscoverable("Anonymous Teaser", "Active"), true);
});

test("disclosure transitions are explicit and revocation is one-way", () => {
  assert.equal(canTransitionDisclosure("Requested", "Needs Qualification"), true);
  assert.equal(canTransitionDisclosure("Seller Review", "Approved for Disclosure"), true);
  assert.equal(canTransitionDisclosure("Approved for Disclosure", "Revoked"), true);
  assert.equal(canTransitionDisclosure("Revoked", "Approved for Disclosure"), false);
  assert.equal(canTransitionDisclosure("Declined", "Approved for Disclosure"), false);
});

test("exact headcount and financial values are blocked from anonymous range fields", () => {
  const review = reviewAnonymousTeaser({ employeeRange: "17 employees", revenueRange: "$2,483,117", earningsRange: "$612,804" }, {});
  assert.equal(review.publicationBlocked, true);
  assert.ok(review.findings.some((finding) => finding.category === "exact employee count"));
  assert.ok(review.findings.filter((finding) => finding.category === "exact financial figure").length >= 2);
});
