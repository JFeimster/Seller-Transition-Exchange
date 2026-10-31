import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSourcesUses,
  calculateEquityAnalysis,
  calculateSellerNoteIllustration,
  classifyReadiness,
  evaluatePartnerRouting,
  quietExitFinancingScope,
} from "../app/lib/financing.ts";

test("financing readiness exposes missing evidence instead of scoring it as zero", () => {
  const result = classifyReadiness({ purchasePrice: "1000000", buyerEquity: "200000" });
  assert.equal(result.classification, "Needs More Information");
  assert.ok(result.missingComponents.includes("annualCashFlow"));
  assert.equal(result.methodology.approved_for, "educational-financing-readiness");
  assert.equal(result.decision, "No lender decision is produced.");
});

test("sources and uses keep buyer equity distinct from seller note", () => {
  const sources = calculateSourcesUses({ purchasePrice: 1000000, buyerEquity: 200000, acquisitionDebt: 500000, sellerNote: 100000, workingCapital: 100000, equipment: 0 });
  assert.equal(sources.balanced, false);
  const equity = calculateEquityAnalysis({ purchasePrice: 1000000, buyerEquity: 200000, acquisitionDebt: 500000, sellerNote: 100000, workingCapital: 100000, equipment: 0 });
  assert.equal(equity.sellerNoteDistinct, 100000);
  assert.equal(equity.buyerEquityGap, true);
});

test("seller note illustration never invents missing terms", () => {
  assert.equal(calculateSellerNoteIllustration({ sellerNote: 100000 }).modeled, false);
  assert.equal(calculateSellerNoteIllustration({ sellerNote: 100000, sellerNoteRate: 8, sellerNoteAmortization: 60 }).modeled, true);
});

test("partner routing returns the exact honest empty state", () => {
  const result = evaluatePartnerRouting({ partners: [], request: {}, consent: true });
  assert.equal(result.message, "No supported route identified from currently verified partner criteria.");
  assert.equal(result.partners.length, 0);
});

test("Quiet Exit financing scope cannot expand disclosure", () => {
  const result = quietExitFinancingScope({ isNative: true, sellerAuthorized: true, approvedDisclosure: true, buyerQualified: true, fields: { purchasePrice: 1, sellerNote: 2, sellerExclusions: "private", adminNotes: "private" } });
  assert.deepEqual(result.fields, { purchasePrice: 1, sellerNote: 2 });
  const blocked = quietExitFinancingScope({ isNative: false, sellerAuthorized: true, approvedDisclosure: true, buyerQualified: true, fields: { purchasePrice: 1 } });
  assert.equal(blocked.allowed, false);
});
