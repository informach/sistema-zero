"""Bounded transport and producer backpressure; not a browser performance proof."""
import importlib
import json
from pathlib import Path
import sys
import types

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / 'packages/studio/src/runtime/python/turtle'
package = types.ModuleType('_sz_turtle_runtime')
package.__path__ = [str(ENGINE)]
sys.modules[package.__name__] = package
backend = importlib.import_module('_sz_turtle_runtime._sz_turtle_backend')
requests = []
received = []
viewport = [640, 480]
def exchange(raw):
    request = json.loads(raw)
    assert len(raw.encode()) <= backend.LIMITS['requestBytes']
    assert len(request['operations']) <= backend.LIMITS['operations']
    assert sum(len(op.get('points', ())) for op in request['operations']) <= backend.LIMITS['points']
    assert sum(len(op.get('text', '').encode('utf-16-le')) // 2 for op in request['operations']) <= backend.LIMITS['textChars']
    requests.append(len(raw))
    received.extend(request['operations'])
    return json.dumps({'events': [], 'value': viewport})
backend.configure(exchange, ROOT)
screen = backend.TurtleScreenBase(None)
expected = [{'op': 'open'}]
for index in range(12000):
    # Both byte and text budgets trigger independently of the command count.
    op = ({'op': 'create', 'id': index + 1, 'kind': 'text', 'text': '🐢' * 2000}
          if index % 9 == 0 else
          {'op': 'patch', 'id': index + 1, 'points': [[i + .123456789, i] for i in range(100)]})
    expected.append(op)
    screen._queue(op)
for index in range(500):
    op = {'op': 'patch', 'id': index + 1,
          'points': [[i + .123456789123, i + .987654321987] for i in range(1000)]}
    expected.append(op)
    screen._queue(op)
for _ in range(5000):
    op = {'op': 'focus'}
    expected.append(op)
    screen._queue(op)
screen._flush({'type': 'wait', 'timeoutMs': 2_147_483_647})
assert received == expected
assert max(requests) > backend.LIMITS['requestBytes'] * .9
before = len(received)
try:
    screen._queue({'op': 'title', 'text': '🐢' * backend.LIMITS['requestBytes']})
except RuntimeError:
    pass
else:
    raise AssertionError('Unbounded operation accepted')
assert len(received) == before
screen._turtles = [None] * backend.LIMITS['turtles']
try:
    screen._check_turtle_capacity()
except RuntimeError:
    pass
else:
    raise AssertionError('Turtle quota ignored')
sys.path.insert(0, str(ENGINE))
import turtle
real_screen = turtle.Screen()
real_screen.tracer(0)
turtles = [turtle.Turtle() for _ in range(backend.LIMITS['turtles'])]
item_count = len(real_screen._items)
for make_turtle in [turtle.Turtle, turtles[0].clone]:
    try:
        make_turtle()
    except RuntimeError:
        pass
    else:
        raise AssertionError('Public Turtle constructor/clone ignored quota')
assert len(real_screen.turtles()) == backend.LIMITS['turtles']
assert len(real_screen._items) == item_count
turtle.bye()
viewport = [3840, 2160]
real_screen = turtle.Screen()
assert (real_screen.window_width(), real_screen.window_height()) == (960,810)
real_screen.tracer(0)
turtle_one = turtle.Turtle()
item_count = len(real_screen._items)
old_limit = backend.MAX_ITEMS
backend.MAX_ITEMS = item_count + 2
for make_turtle in [turtle.Turtle, turtle_one.clone]:
    try:
        make_turtle()
    except RuntimeError:
        pass
    else:
        raise AssertionError('Insufficient scene capacity accepted')
    assert len(real_screen.turtles()) == 1
    assert len(real_screen._items) == item_count
try:
    real_screen.update()  # No partially constructed turtle may poison future updates.
except turtle.Terminator:
    # Upstream's process-wide RUNNING latch raises once after bye.
    real_screen.update()
backend.MAX_ITEMS = old_limit
turtle.bye()
print(json.dumps({'requests': len(requests), 'operationsPreserved': len(received),
                  'largestRequestBytes': max(requests), 'profile': backend.LIMITS['profile']}))
