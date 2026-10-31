from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "resources"
APP_ROUTES = {
    "/", "/exit-readiness", "/value-builder", "/seller-launch-studio",
    "/confidential-opportunities", "/financing", "/buyer-matching",
    "/legacy-matching", "/change-of-ownership", "/advisors", "/deal-room",
    "/transition", "/quiet-exit", "/financing-readiness",
    "/acquisition-financing", "/digital-businesses/marketplace",
}

def parse(path):
    text = path.read_text(encoding="utf-8")
    front, body = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n([\s\S]*)$", text, re.S).groups()
    meta = {}
    for line in front.splitlines():
        key, value = line.split(":", 1)
        value = value.strip()
        if value.startswith("["):
            meta[key] = json.loads(value)
        else:
            meta[key] = value.strip("\"'")
    return meta, body

guides = [parse(path) for path in CONTENT.glob("*.mdx")]
slugs = {meta["slug"] for meta, _ in guides}
assert len(slugs) == 14

for meta, body in guides:
    related = meta["related_guides"]
    assert len(set(related)) >= 2, f"{meta['slug']}: fewer than two related guides"
    assert meta["slug"] not in related, f"{meta['slug']}: self-link"
    assert set(related) <= slugs, f"{meta['slug']}: unknown related guide"
    assert meta["primary_cta_href"] in body, f"{meta['slug']}: primary CTA is not linked in body"
    links = re.findall(r"\[[^\]]+\]\(([^)]+)\)", body)
    for href in links:
        if href.startswith("/resources/"):
            assert href.removeprefix("/resources/") in slugs, f"{meta['slug']}: broken guide link {href}"
        elif href.startswith("/"):
            assert href in APP_ROUTES, f"{meta['slug']}: broken platform route {href}"

link_map = json.loads((ROOT / "data" / "resource-link-map.json").read_text(encoding="utf-8"))
assert len(link_map) == 14
for record in link_map:
    assert len(record["outbound_internal_links"]) >= 2
    assert record["platform_route_links"]
    assert record["cta_links"]
print("Link validation passed: internal guide and platform routes resolve.")
