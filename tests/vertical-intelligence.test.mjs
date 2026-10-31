import assert from "node:assert/strict";
import test from "node:test";
import { demoListingFacets, skillForIndustry, verticalIndustryNames, verticalSkills } from "../app/lib/vertical-intelligence.ts";

test("contains one reusable Skill overlay for each initial industry", () => {
  assert.equal(verticalIndustryNames.length, 12);
  for (const industry of verticalIndustryNames) {
    const skill = verticalSkills[industry];
    assert.ok(skill.skillName);
    assert.equal(skill.industry, industry);
    assert.ok(skill.assessmentQuestions.length >= 3);
    assert.ok(skill.valueDrivers.length >= 3);
    assert.ok(skill.riskFactors.length >= 3);
    assert.ok(skill.diligencePrompts.length >= 3);
    assert.ok(skill.financingConsiderations.length >= 2);
    assert.ok(skill.sellerRecommendations.length >= 2);
    assert.ok(skill.requiredEvidence.length >= 3);
    assert.equal(skill.sourceClassification, "Inferred");
    assert.equal(skill.lastReviewed, null);
  }
});

test("resolves industry slugs without creating duplicate records", () => {
  assert.equal(skillForIndustry("HVAC")?.industry, "HVAC");
  assert.equal(skillForIndustry("digital-assets")?.industry, "Digital Assets");
  assert.equal(skillForIndustry("unknown-industry"), null);
});

test("demo marketplace facets remain explicitly classified", () => {
  assert.deepEqual(Object.values(demoListingFacets).map((item) => item.sourceClassification), ["Demo", "Demo", "Demo"]);
});
