"""Protocol/allocation checks with the real generated engine; no Tk or browser.

Transport replies only supply viewport/text bounds. Counts are not FPS, latency,
memory benchmarks or evidence of pixels/audio rendered on a device.
"""

import ast
import importlib.util
import json
import math
from pathlib import Path
import random
import sys
import time
import types
import unittest


SOURCE = Path(__file__).with_name("main.py")
ENGINE = Path(__file__).resolve().parents[3] / "runtime/python/turtle"
package = types.ModuleType("_sz_turtle_runtime")
package.__path__ = [str(ENGINE)]
sys.modules[package.__name__] = package
from _sz_turtle_runtime import _sz_turtle_backend as backend

requests = []
holder = {}


def transport(raw):
    request = json.loads(raw)
    requests.append(request)
    query = request.get("query") or {}
    value = None
    events = []
    if query.get("type") == "viewport":
        value = [1010, 860]
    if query.get("type") == "text-bounds":
        value = {"right": 300}
    if query.get("type") == "present" and holder.get("escape"):
        holder["escape"] = False
        events = [{"type": "keypress", "key": "Escape"}, {"type": "keyrelease", "key": "Escape"}]
    return json.dumps({"events": events, "value": value})


backend.configure(transport, SOURCE.parent)


class Renderer(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location("_pacman_protocol_turtle", ENGINE / "turtle.py")
        self.turtle = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.turtle)
        self.audio_events = []
        audio = types.SimpleNamespace(
            play=lambda path, **options: self.audio_events.append(("play", path)),
            stop=lambda: self.audio_events.append(("stop",)))
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        tree.body = [node for node in tree.body if not isinstance(node, (ast.Import, ast.If))]
        self.game = {"turtle": self.turtle, "math": math, "random": random.Random(2026),
                     "time": time, "sz_audio": audio}
        exec(compile(tree, str(SOURCE), "exec"), self.game)
        self.screen = self.turtle.Screen()
        self.screen.tracer(0)
        self.game["objetos"]["tela"] = self.screen
        self.game["registrar_formas"]()
        if "criar_desenhistas" in self.game:
            self.game["criar_desenhistas"]()
        else:
            for name in ["lapis", "painel"]:
                pen = self.turtle.Turtle(visible=False)
                pen.penup()
                pen.speed(0)
                self.game["objetos"][name] = pen
        self.game["estado"]["aberto"] = True
        self.game["reiniciar"]()
        self.screen.onkey(self.game["fechar"], "Escape")
        self.screen.listen()
        self.screen.update()
        requests.clear()
        holder.clear()

    def tearDown(self):
        if not self.screen._closed:
            self.game["fechar"]()

    def test_steady_actor_motion_reuses_items_and_reports_protocol_counts(self):
        before = len(self.screen._items)
        for _ in range(10):
            for enemy in self.game["estado"]["inimigos"]:
                enemy["x"] += 1
            self.game["desenhar_atores"]()
            self.screen.update()
        operations = [operation for request in requests for operation in request["operations"]]
        counts = {name: sum(operation["op"] == name for operation in operations)
                  for name in ["create", "delete", "patch", "raise"]}
        print(json.dumps({"frames": 10, "operations": len(operations), "counts": counts,
                          "turtles": len(self.screen.turtles()), "itemsBefore": before,
                          "itemsAfter": len(self.screen._items)}))
        self.assertEqual(counts["create"], 0)
        self.assertEqual(counts["delete"], 0)
        self.assertEqual(len(self.screen._items), before)
        self.assertEqual(len(self.screen.turtles()), 10)

    def test_escape_delivered_by_real_engine_update_cannot_restart_audio(self):
        holder["escape"] = True
        self.game["reiniciar"]()
        self.assertTrue(self.screen._closed)
        self.assertFalse(self.game["estado"]["aberto"])
        self.assertEqual(self.audio_events[-1], ("stop",))
        before = list(self.audio_events)
        self.game["fechar"]()
        self.assertEqual(self.audio_events, before)
        self.game["quadro"]()
        self.assertFalse(self.game["estado"]["timer_pendente"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
