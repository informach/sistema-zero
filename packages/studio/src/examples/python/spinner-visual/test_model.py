"""Testes inertes de regras; gravadores de efeitos não simulam Turtle/Tk."""

import ast
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
        self.game = load({"time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                          "math": __import__("math"),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["reiniciar"]()

    def run_ms(self, total, step=16):
        while total > 0:
            self.game["atualizar"](min(step, total))
            total -= step

    def ball(self, index=0):
        return self.game["posicao_bola"](index)

    def test_it_starts_still_with_the_highlighted_arm_on_top(self):
        x, y = self.ball()
        self.assertAlmostEqual(x, 0)
        self.assertAlmostEqual(y, self.game["CENTRO_Y"] + self.game["COMPRIMENTO_BRACO"])
        self.run_ms(2000)
        self.assertEqual((self.state["angulo"], self.state["velocidade"]), (90, 0))
        others = [self.ball(1), self.ball(2)]
        self.assertAlmostEqual(others[0][0], -others[1][0])
        self.assertEqual(self.audio.plays, [])

    def test_space_pushes_clockwise_from_rest_and_the_arm_moves_right(self):
        self.game["impulsionar"]()
        self.assertEqual(self.state["velocidade"], -self.game["IMPULSO"])
        self.assertEqual(self.audio.plays, ["impulso.wav"])
        self.run_ms(160)
        x, y = self.ball()
        self.assertGreater(x, 50)
        self.assertLess(y, self.game["CENTRO_Y"] + self.game["COMPRIMENTO_BRACO"])

    def test_arrows_push_each_way_and_space_follows_the_current_spin(self):
        self.game["impulsionar"](1)
        self.assertEqual(self.state["velocidade"], self.game["IMPULSO"])
        self.game["impulsionar"]()
        self.assertEqual(self.state["velocidade"], 2 * self.game["IMPULSO"])
        self.game["impulsionar"](-1)
        self.game["impulsionar"](-1)
        self.game["impulsionar"](-1)
        self.assertEqual(self.state["velocidade"], -self.game["IMPULSO"])
        self.game["impulsionar"]()
        self.assertEqual(self.state["velocidade"], -2 * self.game["IMPULSO"])

    def test_friction_slows_down_to_zero_and_never_reverses(self):
        self.game["impulsionar"]()
        self.run_ms(1000)
        self.assertAlmostEqual(self.state["velocidade"], -self.game["IMPULSO"] + self.game["ATRITO"], places=6)
        self.run_ms(5000)
        self.assertEqual(self.state["velocidade"], 0)
        angle = self.state["angulo"]
        self.run_ms(1000)
        self.assertEqual(self.state["angulo"], angle)

    def test_speed_has_a_limit_in_both_directions(self):
        for _ in range(20):
            self.game["impulsionar"](-1)
        self.assertEqual(self.state["velocidade"], -self.game["VELOCIDADE_MAXIMA"])
        for _ in range(40):
            self.game["impulsionar"](1)
        self.assertEqual(self.state["velocidade"], self.game["VELOCIDADE_MAXIMA"])

    def test_each_full_turn_clicks_and_the_record_survives_new_pushes(self):
        self.state["velocidade"] = 720
        self.run_ms(480)
        self.assertEqual(self.state["voltas"], 0)
        self.run_ms(64)
        self.assertEqual(self.state["voltas"], 1)
        self.assertEqual(self.audio.plays.count("clique.wav"), 1)
        self.run_ms(1200)
        turns = self.state["voltas"]
        self.assertGreaterEqual(turns, 3)
        self.assertEqual(self.state["recorde"], turns)
        self.assertEqual(self.audio.plays.count("clique.wav"), turns)
        self.game["impulsionar"]()
        self.assertEqual(self.state["voltas"], 0)
        self.assertEqual(self.state["recorde"], turns)
        self.game["reiniciar"]()
        self.assertEqual((self.state["voltas"], self.state["velocidade"]), (0, 0))
        self.assertEqual(self.state["recorde"], turns)

    def test_the_angle_wraps_around(self):
        self.state["velocidade"] = -1000
        self.run_ms(800)
        self.assertTrue(0 <= self.state["angulo"] < 360)

    def test_space_arrows_and_click_are_wired(self):
        self.game["iniciar"]()
        calls = self.game["tela"].calls
        clicks = [args[0] for call, args in calls if call == "onscreenclick"]
        keys = {args[1]: args[0] for call, args in calls if call == "onkey"}
        keys["Left"]()
        self.assertEqual(self.state["velocidade"], self.game["IMPULSO"])
        keys["Right"]()
        keys["Right"]()
        self.assertEqual(self.state["velocidade"], -self.game["IMPULSO"])
        clicks[0](5, 5)
        keys["space"]()
        self.assertEqual(self.state["velocidade"], -3 * self.game["IMPULSO"])

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["impulsionar"]()
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        angle = self.state["angulo"]
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.state["angulo"], angle)
        self.game["impulsionar"]()
        self.assertEqual(self.state["velocidade"], -self.game["IMPULSO"])
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_turns_at_most_two_frames(self):
        self.state["velocidade"] = -720
        self.game["atualizar"](10_000)
        seconds = 2 * self.game["INTERVALO"] / 1000
        speed = 720 - self.game["ATRITO"] * seconds
        self.assertAlmostEqual(self.state["angulo"], 90 - speed * seconds)


if __name__ == "__main__":
    unittest.main()
