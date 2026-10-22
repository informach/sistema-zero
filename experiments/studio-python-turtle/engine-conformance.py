"""Compare derived Python semantics with real CPython/Tk, before Canvas integration.

The browser-side transport here is an in-memory test double. This qualifies
engine geometry/state/signatures, NEVER visual rendering or browser performance.
"""
import hashlib
import importlib
import inspect
import json
import os
from pathlib import Path
import platform
import runpy
import subprocess
import sys
import time
import types

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / 'packages/studio/src/runtime/python/turtle'
REFERENCE = ROOT / 'packages/studio/scripts/turtle/vendor/turtle.py'

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def child(mode, fixture):
    if mode == 'browser-engine':
        sys.path.insert(0, str(ENGINE))
        package = types.ModuleType('_sz_turtle_runtime')
        package.__path__ = [str(ENGINE)]
        sys.modules[package.__name__] = package
        _sz_turtle_backend = importlib.import_module('_sz_turtle_runtime._sz_turtle_backend')
        def exchange(raw):
            request = json.loads(raw)
            query = request.get('query')
            value = None
            if query and query['type'] == 'viewport':
                value = [1280, 640]
            if query and query['type'] == 'present':
                time.sleep(0.001)
            return json.dumps({'events': [], 'value': value})
        _sz_turtle_backend.configure(exchange, str(ROOT))
    import turtle
    if mode == 'desktop':
        turtle.Screen().getcanvas().winfo_toplevel().withdraw()
    if fixture == 'signatures':
        api = json.loads((ENGINE / 'api-reference.json').read_text(encoding='utf-8'))
        owners = {'turtle': turtle, 'Turtle': turtle.Turtle, 'Screen': turtle._Screen, 'Shape': turtle.Shape}
        result = []
        for entry in api['entries']:
            signature = inspect.signature(getattr(owners[entry['owner']], entry['name']))
            if entry['owner'] != 'turtle':
                signature = signature.replace(parameters=list(signature.parameters.values())[1:])
            result.append([entry['owner'], entry['name'], str(signature)])
        print(json.dumps(result))
    elif fixture == 'colors':
        # Actual Tk lookup, including invalid spellings, against the derived table.
        names = runpy.run_path(str(ENGINE / '_sz_turtle_colors.py'))['COLORS']
        inputs = list(names) + ['dodger blue', 'DodgerBlue', 'burly wood', 'gray50',
                               '#abc', '#123456', '#123456789', '#123456789abc',
                               'not-a-color', ' lightblue', 'dodger  blue', 'rgb(1,2,3)', '# 1 2 3']
        result = {}
        for name in inputs:
            try:
                if mode == 'desktop':
                    channels = turtle.Screen().cv.winfo_rgb(name)
                    result[name] = '#' + ''.join(f'{channel >> 8:02x}' for channel in channels)
                else:
                    result[name] = _sz_turtle_backend.color(name)
            except Exception:
                result[name] = None
        print(json.dumps(result, sort_keys=True))
    else:
        path = (ROOT / 'experiments/studio-python-l0/fixtures' / (fixture[3:] + '.py')
                if fixture.startswith('l0:') else Path(__file__).parent / 'fixtures' / (fixture + '.py'))
        runpy.run_path(str(path), run_name='__main__')
    try:
        turtle.bye()
    except turtle.Terminator:
        pass

if len(sys.argv) == 4 and sys.argv[1] == '--child':
    child(sys.argv[2], sys.argv[3])
else:
    require(platform.python_version() == '3.14.2', 'CPython 3.14.2 required')
    # The locally installed upstream differs only in platform line endings.
    installed = Path(sys.base_prefix) / 'Lib/turtle.py'
    require(installed.read_text(encoding='utf-8') == REFERENCE.read_text(encoding='utf-8'),
            'Installed desktop reference differs from pinned source')
    records = []
    for fixture in ['signatures', 'colors', 'geometry', 'timer-priority', 'l0:events', 'l0:timers', 'l0:sleep',
                    'l0:timer-motion', 'l0:callback-reentrant', 'l0:callback-error']:
        modes = {}
        for mode in ['desktop', 'browser-engine']:
            result = subprocess.run([sys.executable, '-I', '-X', 'utf8', __file__, '--child', mode, fixture],
                                    capture_output=True, text=True, timeout=15, cwd=ROOT)
            modes[mode] = {'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}
        record = {'fixture': fixture, 'modes': modes}
        record['passed'] = (all(result['exitCode'] == 0 for result in modes.values()) and
                            modes['desktop']['stdout'] == modes['browser-engine']['stdout'])
        records.append(record)
        print(json.dumps({'fixture': fixture, 'passed': record['passed']}), flush=True)
    directory = ROOT / '.cache/studio-python-turtle'
    directory.mkdir(exist_ok=True)
    output = directory / ('engine-' + str(time.time_ns()) + '.json')
    output.write_text(json.dumps({'scope': 'native engine conformance; no browser/visual qualification',
                                 'records': records}, indent=2), encoding='utf-8')
    print(str(output))
    require(all(record['passed'] for record in records), 'Engine conformance failed; see report')
