"""One variable: long-line position mapping. Native baseline/optimized diagnostic."""
import cProfile
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import pstats
import sys
import time

assert sys.version_info[:3] == (3, 14, 2)
root = Path(__file__).resolve().parents[2]
directory = root / 'packages/studio/src/python/language'
spec = importlib.util.spec_from_file_location('studio_language', directory / 'analyzer.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
service = module.PythonLanguageService((directory / 'limits.json').read_text())
source = 'x = ["' + 'a' * 220_000 + '",' + ','.join(['1'] * 9000) + ']\n'
request = json.dumps({'operation': 'parse', 'source': source, 'path': 'main.py'})
samples = []
for index in range(13):
    start = time.perf_counter()
    result = service.request(request)
    elapsed = (time.perf_counter() - start) * 1000
    assert json.loads(result)['ok']
    if index >= 3:
        samples.append(elapsed)
profiler = cProfile.Profile()
profiler.enable()
service.request(request)
profiler.disable()
report = io.StringIO()
pstats.Stats(profiler, stream=report).sort_stats('cumulative').print_stats(12)
print(json.dumps({'scope': 'native parser only, no editor or browser', 'sourceBytes': len(source.encode()), 'samples': samples, 'p50Ms': sorted(samples)[4], 'p95Ms': max(samples), 'goldenSha256': hashlib.sha256(result.encode()).hexdigest(), 'profile': report.getvalue()}))
