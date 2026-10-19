"""Read-only course inventory; writes only beside this script.

No imports from production, no generator execution, no database/network access.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
COURSES = ROOT / "docs/aulas-interativas"


def classify(section, blocks):
    completion = section["completion"]
    if section.get("externalTool"):
        return "external-delivery" if section["intent"] == "delivery" else "external-practice"
    if completion.get("projectChecks"):
        return "embedded-objectives"
    if section.get("workspaceKey"):
        return "embedded-delivery" if section["intent"] == "delivery" else "embedded-optional"
    selected = [blocks[key] for key in section["blockKeys"]]
    if any(block.get("content", {}).get("kind") == "quiz" for block in selected):
        return "quiz"
    if any(block.get("content", {}).get("kind") == "certificate" for block in selected):
        return "certificate"
    if any(block.get("content", {}).get("kind") == "interactive" for block in selected):
        return "interactive"
    return "context-or-material"


def main():
    lessons = []
    for path in sorted(COURSES.glob("*/*.manifesto.json")):
        raw = path.read_bytes()
        manifest = json.loads(raw)
        blocks = {block["key"]: block for block in manifest["blocks"]}
        sections = [
            {
                "key": section["key"],
                "title": section["title"],
                "intent": section["intent"],
                "objective": section.get("objective"),
                "workspaceKey": section.get("workspaceKey"),
                "externalTool": section.get("externalTool"),
                "classification": classify(section, blocks),
                "completion": section["completion"],
            }
            for section in manifest["sections"]
        ]
        lessons.append({
            "course": manifest["courseSlug"],
            "lesson": manifest["lessonSlug"],
            "title": manifest["title"],
            "path": path.relative_to(ROOT).as_posix(),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "studioBlocks": [
                {
                    "key": key,
                    "gallery": block["content"].get("gallery"),
                    "hasInitialProject": "initialProject" in block["content"],
                    "hasSolutionProject": "solutionProject" in block["content"],
                    "allowedModes": block["content"].get("allowedModes"),
                }
                for key, block in blocks.items()
                if block.get("content", {}).get("kind") == "studio"
            ],
            "sections": sections,
        })
    sections = [section for lesson in lessons for section in lesson["sections"]]
    checks = [check for section in sections for check in section["completion"].get("projectChecks", [])]
    result = {
        "scope": "Local authored manifests only; no claim about imported or published Admin content.",
        "totals": {
            "lessons": len(lessons),
            "sections": len(sections),
            "embeddedParts": sum(bool(section["workspaceKey"]) for section in sections),
            "externalParts": sum(bool(section["externalTool"]) for section in sections),
            "projectChecks": len(checks),
            "ruleTypes": dict(Counter(check["rule"]["type"] for check in checks)),
            "solutionProjects": sum(block["hasSolutionProject"] for lesson in lessons for block in lesson["studioBlocks"]),
            "classifications": dict(Counter(section["classification"] for section in sections)),
        },
        "lessons": lessons,
    }
    target = HERE / "inventory.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["totals"], ensure_ascii=False))


if __name__ == "__main__":
    main()
