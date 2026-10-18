"""Native CPython/Turtle callback regression. Browser execution is qualified separately."""
import json
from pathlib import Path
import runpy
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

GRADER = runpy.run_path(str(ROOT / 'src/runtime/python/activity-grader.py'))['_StudioActivity']
incoming = []
holder = {}
namespace = {'score': 0}
outputs = []
trace = []


def transport(raw):
    request = json.loads(raw)
    events = list(incoming)
    incoming.clear()
    query = request.get('query') or {}
    return json.dumps({'events': events, 'value': [640, 480] if query.get('type') == 'viewport' else None})


def checkpoint():
    if 'grader' in holder:
        trace.append(namespace['score'])
        holder['grader'].checkpoint()


backend.configure(transport, str(ROOT), checkpoint)


class ActivityCheckpointTests(unittest.TestCase):
    def test_nested_drawing_does_not_observe_a_partially_completed_callback(self):
        screen = turtle.Screen()
        actor = turtle.Turtle()
        actor.speed(0)
        actor.penup()

        def key():
            actor.setx(40)  # Official Turtle calls update inside this callback.
            namespace['score'] = 1

        screen.onkey(key, 'space')
        screen.listen()
        holder['grader'] = GRADER(
            json.dumps({'checks': [{'id': 'score', 'kind': 'behavior',
                                   'rule': {'type': 'globalEquals', 'name': 'score', 'value': 1}}]}),
            namespace, lambda: True, lambda raw: outputs.append(json.loads(raw)), lambda _: False)
        incoming.extend([{'type': 'keypress', 'key': 'space'}, {'type': 'keyrelease', 'key': 'space'}])
        screen.update()
        self.assertEqual(trace, [1])
        self.assertEqual(len(outputs), 1)
        self.assertTrue(outputs[0]['results'][0]['passed'])


if __name__ == '__main__':
    unittest.main()
