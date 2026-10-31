import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  TRANSITION_PATHS,
  compareTransitionPaths,
  evaluateLegacyMatch,
} from "../app/lib/change-of-ownership.ts";

test("supports the complete Version 2.4 transition-path set", () => {
  assert.equal(TRANSITION_PATHS.length, 14);
  for (const path of ["External Third-Party Sale", "Management Buyout", "Partner Buyout", "Family Succession", "Employee Ownership", "Partial Sale", "Seller-Financed Gradual Transition", "Rollover Equity"]) {
    assert.ok(TRANSITION_PATHS.includes(path), path);
  }
});

test("a strong legacy fit remains blocked when financing is incomplete", () => {
  const result = evaluateLegacyMatch({
    legacy: { employeeRetentionPriority: true, brandContinuityPriority: true },
    successor: { operatingExperience: "Strong", industryExperience: "Strong", confidentialityAcknowledged: true },
    plan: { selectedPath: "External Third-Party Sale" },
    financing: { equityGap: true },
    vertical: {},
  });
  assert.equal(result.classification, "Blocked by Hard Conflict");
  assert.ok(result.financingBlockers.length > 0);
  assert.match(result.disclosureRecommendation, /Do not advance/i);
});

test("family succession surfaces governance gaps without making tax conclusions", () => {
  const result = compareTransitionPaths({ successorInterest: "Interested", governancePreference: "", desiredTimeline: "" }, "Family Succession", []);
  const family = result.results[0];
  assert.match(family.classification, /Needs More Information|Material Tradeoffs/);
  assert.ok(family.missingInformation.some((item) => /governance/i.test(item)));
  assert.doesNotMatch(JSON.stringify(family), /tax conclusion|tax outcome|tax savings/i);
});

test("management capability cannot overcome a management-buyout equity gap", () => {
  const result = evaluateLegacyMatch({
    legacy: { managementContinuityPriority: true },
    successor: { operatingExperience: "Strong operator", industryExperience: "Strong", managementExperience: "Strong", confidentialityAcknowledged: true },
    plan: { selectedPath: "Management Buyout" },
    financing: { equityGap: true },
    vertical: {},
  });
  assert.equal(result.classification, "Blocked by Hard Conflict");
  assert.ok(result.financingBlockers.length > 0);
});

test("a seller exclusion is a hard blocker even where capability is strong", () => {
  const result = evaluateLegacyMatch({
    legacy: { excludedOrganizations: "Excluded Consolidator" },
    successor: { organization: "Excluded Consolidator", operatingExperience: "Strong", industryExperience: "Strong", confidentialityAcknowledged: true },
    plan: { selectedPath: "External Third-Party Sale" },
    financing: { equityGap: false },
    vertical: {},
  });
  assert.equal(result.classification, "Blocked by Hard Conflict");
  assert.ok(result.hardBlockers.some((item) => /seller exclusion/i.test(item)));
});

test("a licensing-dependent vertical requires successor capability review", () => {
  const result = evaluateLegacyMatch({
    legacy: {},
    successor: { operatingExperience: "Strong", industryExperience: "Strong", confidentialityAcknowledged: true, licenseCapability: false },
    plan: { selectedPath: "External Third-Party Sale" },
    financing: { equityGap: false },
    vertical: { licensingDependency: true },
  });
  assert.equal(result.classification, "Blocked by Hard Conflict");
  assert.ok(result.hardBlockers.some((item) => /license|licensing|credential/i.test(item)));
});

test("a missing confidentiality acknowledgment blocks disclosure advancement", () => {
  const result = evaluateLegacyMatch({
    legacy: {},
    successor: { operatingExperience: "Strong", industryExperience: "Strong", confidentialityAcknowledged: false },
    plan: { selectedPath: "External Third-Party Sale" },
    financing: { equityGap: false },
    vertical: {},
  });
  assert.equal(result.classification, "Blocked by Hard Conflict");
  assert.ok(result.confidentialityBlockers.length > 0);
  assert.match(result.disclosureRecommendation, /Do not advance/i);
});

test("D1 migration carries the canonical transition-plan record spine", () => {
  const migration = new URL("../drizzle/0006_complex_grandmaster.sql", import.meta.url);
  assert.ok(existsSync(migration));
  const sql = readFileSync(migration, "utf8");
  for (const table of ["transition_plans", "legacy_profiles", "successor_transition_profiles", "legacy_matches", "transition_path_comparisons", "transition_audit_events"]) assert.match(sql, new RegExp("CREATE TABLE `" + table + "`"));
});
