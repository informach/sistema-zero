"""Testes inertes de regras; gravadores de efeitos não simulam Turtle/Tk."""

import ast
import math
from pathlib import Path
import random
import types
import unittest


SOURCE = Path(__file__).with_name("main.py")


class Recorder:
    """Turtle/Screen falso: guarda carimbos, timers e chamadas; o resto é inerte."""

    def __init__(self):
        self.stamps = set()
        self.next_stamp = 0
        self.timers = []
        self.calls = []
        self.closed = False

    def stamp(self):
        self.next_stamp += 1
        self.stamps.add(self.next_stamp)
        return self.next_stamp

    def clearstamp(self, identifier):
        self.stamps.remove(identifier)

    def clearstamps(self):
        self.stamps.clear()

    def ontimer(self, callback, delay):
        self.timers.append(callback)

    def bye(self):
        self.closed = True

    def __getattr__(self, name):
        def record(*args, **options):
            self.calls.append((name, args))
        return record


class AudioRecorder:
    def __init__(self):
        self.plays = []
        self.stops = 0

    def play(self, path, **options):
        self.plays.append(path)

    def stop(self):
        self.stops += 1


def load(game):
    """Executa main.py sem imports, sem o entrypoint e sem criar tartarugas reais."""
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    kept = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.If)):
            continue
        if (isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)
                and isinstance(node.value.func, ast.Attribute)
                and isinstance(node.value.func.value, ast.Name)
                and node.value.func.value.id == "turtle"):
            game[node.targets[0].id] = Recorder()
            continue
        kept.append(node)
    tree.body = kept
    exec(compile(tree, str(SOURCE), "exec"), game)
    return game


class Rules(unittest.TestCase):
    def setUp(self):
        self.clock = [0.0]
        self.audio = AudioRecorder()
        self.game = load({"random": random.Random(2026), "math": math,
                          "time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["reiniciar"]()

    def spin_until_it_stops(self):
        steps = 0
        while self.state["girando"]:
            self.game["atualizar"](self.game["PASSO_FISICA"])
            steps += 1
            self.assertLess(steps, 5000)
        return steps

    def test_start_points_up_at_the_first_answer(self):
        self.assertEqual(self.state["angulo"], 90)
        self.assertEqual(self.game["fatia_apontada"](90), 0)
        self.assertFalse(self.state["girando"])
        self.assertEqual(self.state["historico"], [])
        self.assertEqual(self.audio.plays, ["abertura.wav"])

    def test_each_angle_falls_in_exactly_one_slice_going_counterclockwise(self):
        slice_of = self.game["fatia_apontada"]
        for index in range(8):
            middle = 67.5 + (index + 0.5) * 45
            self.assertEqual(slice_of(middle), index)
            self.assertEqual(slice_of(middle + 360), index)
            self.assertEqual(slice_of(middle - 720), index)
        self.assertEqual(slice_of(67.5), 0)
        self.assertEqual(slice_of(67.4), 7)

    def test_space_spins_with_random_speed_slows_down_and_stops_on_an_answer(self):
        self.game["girar"]()
        self.assertTrue(self.state["girando"])
        first = self.state["velocidade"]
        self.assertTrue(600 <= first <= 1080)
        self.game["atualizar"](16)
        self.assertLess(self.state["velocidade"], first)
        self.spin_until_it_stops()
        self.assertEqual(self.state["velocidade"], 0)
        answer = self.game["RESPOSTAS"][self.game["fatia_apontada"](self.state["angulo"])]
        self.assertEqual(self.state["resultado"], answer)
        self.assertEqual(self.state["historico"], [answer])
        self.assertEqual(self.audio.plays.count("parar.wav"), 1)

    def test_a_tick_sounds_once_per_slice_crossed(self):
        self.game["girar"]()
        crossings = 0
        current = self.game["fatia_apontada"](self.state["angulo"])
        while self.state["girando"]:
            self.game["passo_do_giro"]()
            now = self.game["fatia_apontada"](self.state["angulo"])
            if now != current:
                crossings += 1
            current = now
        self.assertGreater(crossings, 8)
        # O primeiro tique é o da largada.
        self.assertEqual(self.audio.plays.count("tique.wav"), crossings + 1)

    def test_space_while_spinning_does_not_add_speed(self):
        self.game["girar"]()
        self.game["atualizar"](16)
        speed = self.state["velocidade"]
        self.game["girar"]()
        self.assertEqual(self.state["velocidade"], speed)

    def test_arrows_nudge_slowly_only_when_still(self):
        self.game["empurrar"](1)
        self.assertEqual(self.state["angulo"], 75)
        self.game["empurrar"](-1)
        self.game["empurrar"](-1)
        self.assertEqual(self.state["angulo"], 105)
        self.assertIn(("setheading", (105,)), self.game["ponteiro"].calls)
        self.game["girar"]()
        before = self.state["angulo"]
        self.game["empurrar"](1)
        self.assertEqual(self.state["angulo"], before)

    def test_history_keeps_only_the_last_three_answers(self):
        for _ in range(5):
            self.game["girar"]()
            self.spin_until_it_stops()
        self.assertEqual(len(self.state["historico"]), 3)
        self.assertEqual(self.state["historico"][-1], self.state["resultado"])
        self.assertEqual(self.audio.plays.count("parar.wav"), 5)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["girar"]()
        self.game["pausar"]()
        angle = self.state["angulo"]
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.state["angulo"], angle)
        self.game["reiniciar"]()
        self.assertFalse(self.state["girando"])
        self.assertEqual(self.state["angulo"], 90)
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_moves_at_most_two_physics_steps(self):
        self.game["girar"]()
        speed = self.state["velocidade"]
        self.game["atualizar"](10_000)
        expected = (90 - speed * 0.016 - speed * 0.985 * 0.016) % 360
        self.assertAlmostEqual(self.state["angulo"], expected)


if __name__ == "__main__":
    unittest.main()
