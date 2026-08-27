from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / "content/cases/case-001"

errors: list[str] = []

# JSON syntax
for path in CASE.glob("*.json"):
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"Invalid JSON: {path}: {exc}")

# Unique IDs across typed content files where IDs are expected.
seen: dict[str, Path] = {}
for name in ["characters.json", "evidence.json", "deductions.json", "objectives.json", "facts.json", "locks.json", "triggers.json", "endings.json", "graph.json", "timeline.json"]:
    path = CASE / name
    data = json.loads(path.read_text(encoding="utf-8"))
    for item in data:
        item_id = item.get("id")
        if not item_id:
            errors.append(f"Missing id in {path}")
            continue
        if item_id in seen:
            errors.append(f"Duplicate id {item_id}: {seen[item_id]} and {path}")
        seen[item_id] = path

# Canon safety assertions.
chars = json.loads((CASE / "characters.json").read_text(encoding="utf-8"))
f17 = next((c for c in chars if c.get("id") == "char_f17"), None)
if not f17 or f17.get("hiddenUntilFact") != "fact_f17_is_maral":
    errors.append("F17 spoiler projection is not gated by fact_f17_is_maral")

endings = json.loads((CASE / "endings.json").read_text(encoding="utf-8"))
canon = [e for e in endings if e.get("canon")]
if len(canon) != 1 or canon[0].get("id") != "ending_sever":
    errors.append("SEVER must be the sole canon ending in Case #001")

sever = next((e for e in endings if e.get("id") == "ending_sever"), None)
if sever is not None and sever.get("revealsExactLocation") is True:
    errors.append("SEVER must never reveal the exact location in Case #001")

if errors:
    print("PACK VALIDATION FAILED")
    for error in errors:
        print("-", error)
    raise SystemExit(1)

print(f"PACK VALIDATION OK — {len(seen)} unique authored IDs checked")
