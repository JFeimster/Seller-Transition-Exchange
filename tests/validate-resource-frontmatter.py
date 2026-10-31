from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "resources"
EXPECTED = [
    "preparing-to-sell-your-business",
    "understanding-business-valuation",
    "improving-business-value-before-a-sale",
    "organizing-financial-records",
    "reducing-owner-dependence",
    "seller-financing",
    "sba-acquisition-financing",
    "management-buyouts",
    "family-succession",
    "partner-buyouts",
    "confidential-business-sales",
    "choosing-transaction-advisors",
    "preparing-employees-and-customers",
    "what-happens-after-closing",
]
REQUIRED = {
    "title", "slug", "description", "category", "seller_stage", "audience",
    "transition_paths", "estimated_read_time", "display_order", "featured",
    "evidence_status", "last_reviewed", "related_modules", "related_guides",
    "primary_cta", "primary_cta_href", "secondary_cta", "secondary_cta_href",
}
CATEGORIES = {
    "Sale Preparation", "Valuation and Value Building", "Financial Readiness",
    "Financing", "Ownership Transition", "Confidentiality", "Advisors",
    "Transition Execution",
}
STAGES = {"Explore", "Prepare", "Package", "Match", "Transition", "Post-Close"}

def parse_value(value):
    value = value.strip()
    if value in {"true", "false"}:
        return value == "true"
    if value.isdigit():
        return int(value)
    if value.startswith("["):
        return json.loads(value)
    return value.strip("\"'")

def parse(path):
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    assert match, f"{path.name}: missing frontmatter"
    result = {}
    for line in match.group(1).splitlines():
        key, value = line.split(":", 1)
        result[key.strip()] = parse_value(value)
    return result, text[match.end():]

files = sorted(CONTENT.glob("*.mdx"))
assert len(files) == 14, f"Expected 14 guide files, found {len(files)}"
guides = [parse(path) for path in files]
metadata = [item[0] for item in guides]

for meta, body in guides:
    missing = REQUIRED - set(meta)
    assert not missing, f"{meta.get('slug', 'unknown')}: missing {sorted(missing)}"
    assert meta["category"] in CATEGORIES, f"{meta['slug']}: invalid category"
    assert meta["seller_stage"] in STAGES, f"{meta['slug']}: invalid seller stage"
    assert meta["evidence_status"] == "editorial-review-required"
    assert re.fullmatch(r"/[a-z0-9/-]+", meta["primary_cta_href"])
    assert re.fullmatch(r"/[a-z0-9/-]+", meta["secondary_cta_href"])
    assert len(meta["related_guides"]) >= 2
    assert "lorem ipsum" not in body.lower()
    assert not re.search(r"^#{2,3}\s*$", body, re.M)
    assert body.rstrip().endswith(
        body.rstrip().split("## Your next action", 1)[-1].strip()
    )

by_order = sorted(metadata, key=lambda item: item["display_order"])
assert [item["slug"] for item in by_order] == EXPECTED, "Guide order or slug differs from brief"
assert len({item["slug"] for item in metadata}) == 14, "Duplicate slug"
assert len({item["display_order"] for item in metadata}) == 14, "Duplicate display order"
assert [item["display_order"] for item in by_order] == list(range(1, 15))
print("Frontmatter validation passed: 14 ordered guides.")
