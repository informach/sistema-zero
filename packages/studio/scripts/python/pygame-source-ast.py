"""Parse gallery sources with the same Python language service used by the Studio.

    python pygame-source-ast.py <game> <file.py>
"""
import importlib.util
import json
import sys
from pathlib import Path

studio = Path(__file__).resolve().parents[2]
path = studio / "src/python/language/analyzer.py"
spec = importlib.util.spec_from_file_location("studio_analyzer", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
service = module.PythonLanguageService(
    (studio / "src/python/language/limits.json").read_text(encoding="utf8")
)
game, relative = sys.argv[1], sys.argv[2]
source = (studio / "src/examples/python/pygame" / game / relative).read_text(encoding="utf8")
result = json.loads(service.request(json.dumps(
    {"operation": "parse", "source": source, "path": relative, "compilable": True}
)))
if not result.get("tree"):
    raise SystemExit(result.get("diagnostics"))
print(json.dumps(result["tree"], ensure_ascii=False))
