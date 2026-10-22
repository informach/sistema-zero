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
        import math
        self.clock = [0.0]
        self.audio = AudioRecorder()
        self.game = load({"random": random.Random(2026), "math": math,
                          "time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["reiniciar"]()
        # Sem bolhas sorteadas, a não ser que o teste peça.
        self.game["CHANCE_BOLHA"] = 10 ** 9

    def frame(self, count=1):
        for _ in range(count):
            self.game["atualizar"](self.game["QUADRO"])

    def bubble(self, x, y, raio=20, velocidade=3):
        bolha = self.game["Bolha"](y)
        bolha.x = x
        bolha.raio = raio
        bolha.velocidade = velocidade
        self.state["bolhas"].append(bolha)
        return bolha

    def test_start_has_thirty_seconds_and_a_lone_submarine(self):
        self.assertEqual(self.state["tempo"], 30_000)
        self.assertEqual(self.state["pontos"], 0)
        self.assertEqual(self.state["bolhas"], [])
        self.assertEqual((self.state["sub_x"], self.state["sub_y"]), (-250, 0))
        self.assertEqual(len(self.game["pincel"].stamps), 4)

    def test_held_arrows_move_and_the_screen_holds_the_submarine(self):
        teclas = self.game["teclas"]
        self.game["segurar"]("cima", True)
        self.frame(2)
        self.assertEqual(self.state["sub_y"], 2 * self.game["VELOCIDADE_SUB"])
        self.game["segurar"]("cima", False)
        self.frame()
        self.assertEqual(self.state["sub_y"], 2 * self.game["VELOCIDADE_SUB"])
        teclas["esquerda"] = True
        self.frame(500)
        self.assertEqual(self.state["sub_x"], -self.game["LIMITE_X"])
        teclas["esquerda"] = False
        teclas["baixo"] = True
        self.frame(500)
        self.assertEqual(self.state["sub_y"], self.game["LIMITE_BAIXO"])

    def test_bubbles_are_born_on_the_right_drift_left_and_vanish(self):
        self.game["CHANCE_BOLHA"] = 1
        self.frame()
        self.assertEqual(len(self.state["bolhas"]), 1)
        bolha = self.state["bolhas"][0]
        self.assertTrue(self.game["RAIO_MIN"] <= bolha.raio <= self.game["RAIO_MAX"])
        self.assertTrue(1 <= bolha.velocidade <= self.game["VELOCIDADE_MAX"])
        self.assertGreater(bolha.x, self.game["LARGURA"] / 2 - bolha.velocidade)
        self.game["CHANCE_BOLHA"] = 10 ** 9
        bolha.y = 150
        self.state["sub_y"] = -150
        antes = bolha.x
        self.frame()
        self.assertEqual(bolha.x, antes - bolha.velocidade)
        bolha.x = -self.game["LARGURA"] / 2 - bolha.raio + 0.5
        self.frame()
        self.assertEqual(self.state["bolhas"], [])
        self.assertEqual(self.state["pontos"], 0)

    def test_the_pool_is_capped_and_draws_two_stamps_per_bubble(self):
        self.game["CHANCE_BOLHA"] = 1
        self.state["sub_x"] = -360
        self.state["sub_y"] = 180
        self.frame(200)
        self.assertLessEqual(len(self.state["bolhas"]), self.game["MAX_BOLHAS"])
        self.assertEqual(len(self.game["pincel"].stamps), 2 * len(self.state["bolhas"]) + 4)

    def test_touching_pops_for_radius_plus_speed(self):
        self.bubble(-250 + 45, 0, raio=26, velocidade=5)
        self.frame()
        self.assertEqual(self.state["pontos"], 31)
        self.assertEqual(self.state["bolhas"], [])
        self.assertEqual(self.audio.plays, ["estourar.wav"])

    def test_centres_exactly_one_sum_of_radii_apart_do_not_touch(self):
        bolha = self.bubble(0, 0, raio=10, velocidade=1)
        self.assertFalse(bolha.encosta(-30, 0, 20))
        self.assertTrue(bolha.encosta(-29.9, 0, 20))
        self.state["sub_y"] = 100
        self.bubble(-250, 100 + 31 + 2, raio=10, velocidade=2)
        self.frame()
        self.assertEqual(self.state["pontos"], 0)

    def test_every_thousand_points_adds_thirty_seconds(self):
        self.state["pontos"] = 990
        self.state["tempo"] = 5_000
        self.bubble(-250, 0, raio=15, velocidade=4)
        self.frame()
        self.assertEqual(self.state["pontos"], 1009)
        self.assertEqual(self.state["bonus"], 1)
        self.assertEqual(self.state["proximo_bonus"], 2000)
        self.assertEqual(self.state["tempo"], 5_000 - 16 + 30_000)
        self.assertIn("bonus.wav", self.audio.plays)
        self.bubble(-250, 0, raio=15, velocidade=4)
        self.frame()
        self.assertEqual(self.state["bonus"], 1)

    def test_time_running_out_ends_the_game_and_keeps_the_record(self):
        self.state["pontos"] = 420
        self.state["tempo"] = 20
        self.frame(2)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["tempo"], 0)
        self.assertEqual(self.state["recorde"], 420)
        self.assertEqual(self.audio.plays.count("fim.wav"), 1)
        self.game["segurar"]("direita", True)
        self.frame(5)
        self.assertEqual(self.state["sub_x"], -250)
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["pontos"], 0)
        self.assertEqual(self.state["recorde"], 420)
        self.assertFalse(self.game["teclas"]["direita"])

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        self.game["segurar"]("cima", True)
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.state["sub_y"], 0)
        self.assertEqual(self.state["tempo"], 30_000)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_advances_at_most_three_frames(self):
        self.game["segurar"]("cima", True)
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["sub_y"], 3 * self.game["VELOCIDADE_SUB"])
        self.assertEqual(self.state["tempo"], 30_000 - 3 * self.game["QUADRO"])


if __name__ == "__main__":
    unittest.main()
