"""Actual generated Turtle/backend under native CPython; controlled graphics port."""
import json
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / 'src/runtime/python/turtle'
package = types.ModuleType('_sz_turtle_runtime')
package.__path__ = [str(DIRECTORY)]
sys.modules[package.__name__] = package
from _sz_turtle_runtime import _sz_turtle_backend as backend
sys.path.insert(0, str(DIRECTORY))
import turtle

queries = []
trace = []
incoming = []
def transport(raw):
    value = json.loads(raw)
    query = value.get('query') or {}
    queries.append(query.get('type'))
    if query.get('type') == 'activity-turn':
        trace.append('public-turn')
    events = incoming[:]
    incoming.clear()
    return json.dumps({'events': events, 'value': [640, 480] if query.get('type') == 'viewport' else None})

ordinary = '--ordinary' in sys.argv
sys.argv = [sys.argv[0]]
backend.configure(transport, str(ROOT), None if ordinary else lambda: None)

class PublicTurn(unittest.TestCase):
    def test_internal_setup_and_drawing_are_not_public_turns(self):
        screen = turtle.Screen()
        screen.setup(320, 240)
        actor = turtle.Turtle()
        actor.speed(0)
        screen.tracer(1)
        actor.setx(12)
        screen.bgcolor('white')
        self.assertNotIn('activity-turn', queries)
        screen.update()
        if ordinary:
            self.assertNotIn('activity-turn', queries)
            print(json.dumps({'python': sys.version.split()[0], 'ordinaryNoActivityTurn': True}))
            return
        self.assertEqual(queries.count('activity-turn'), 1)
        trace.clear()
        def key():
            trace.append('key-start')
            screen.update()  # Explicit nested public call still cannot publish partial state.
            actor.setx(40)
            trace.append('key-finished')
        screen.onkey(key, 'space')
        incoming.extend([{'type': 'keypress', 'key': 'space'}, {'type': 'keyrelease', 'key': 'space'}])
        screen.update()
        self.assertEqual(trace, ['key-start', 'key-finished', 'public-turn'])
        self.assertEqual(queries.count('activity-turn'), 2)
        print(json.dumps({'python': sys.version.split()[0], 'trace': trace, 'publicTurns': 2}))

unittest.main()
