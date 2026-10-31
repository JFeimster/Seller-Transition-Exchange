from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
guides = json.loads((ROOT / "data" / "resource-guides.json").read_text(encoding="utf-8"))
manifest = json.loads((ROOT / "data" / "resource-source-manifest.json").read_text(encoding="utf-8"))
categories = json.loads((ROOT / "data" / "resource-categories.json").read_text(encoding="utf-8"))

assert len(guides) == 14, "Registry must contain 14 guides"
assert len(manifest) == 14, "Source manifest must contain 14 records"
assert len({guide["slug"] for guide in guides}) == 14
assert len({guide["display_order"] for guide in guides}) == 14
assert len({guide["title"] for guide in guides}) == 14
assert len({guide["description"] for guide in guides}) == 14
assert {record["guide_slug"] for record in manifest} == {guide["slug"] for guide in guides}
assert sum(len(category["guide_slugs"]) for category in categories) == 14

for guide in guides:
    path = ROOT / guide["file_path"]
    assert path.is_file(), f"Missing registry path: {guide['file_path']}"
    text = path.read_text(encoding="utf-8").lower()
    assert "lorem ipsum" not in text
    assert "## educational boundary" in text
    assert "## your next action" in text

for record in manifest:
    assert record["source_status"] == "editorial-review-required"
    assert record["local_references_used"]
    assert record["claims_requiring_professional_review"]
    assert record["publication_approval"] is False
    assert record["reviewer"] is None
    if record["guide_slug"] == "sba-acquisition-financing":
        assert len(record["external_authoritative_sources_used"]) >= 2
        assert record["current_law_or_program_claims"]

print("Manifest validation passed: registry, files, sources, and review gates align.")
