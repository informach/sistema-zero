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
        self.bat = self.state["alvos"][0]

    def frame(self, count=1):
        for _ in range(count):
            self.game["atualizar"](self.game["QUADRO"])

    def park(self, alvo, x=300, y=150):
        # Põe o alvo longe da coluna do macaco e parado, para o teste decidir quem é acertado.
        alvo.x = x
        alvo.y = y
        alvo.velocidade = 0

    def test_start_has_banana_in_hand_one_bat_and_thirty_seconds(self):
        self.assertEqual(self.state["banana"], "mao")
        self.assertEqual(len(self.state["alvos"]), 1)
        self.assertIsInstance(self.bat, self.game["Morcego"])
        self.assertEqual(self.state["tempo"], self.game["DURACAO"] * 1000)
        self.assertTrue(abs(self.bat.x) == self.game["LIMITE_X"])
        self.assertTrue(self.game["ALTURA_MIN"] <= self.bat.y <= self.game["ALTURA_MAX"])

    def test_held_arrows_walk_and_the_screen_holds_the_monkey(self):
        self.park(self.bat)
        self.game["segurar"]("esquerda", True)
        self.frame(2)
        self.assertEqual(self.state["macaco_x"], -2 * self.game["VELOCIDADE_MACACO"])
        self.frame(300)
        self.assertEqual(self.state["macaco_x"], -self.game["LIMITE_X"])

    def test_space_throws_only_from_the_hand_and_the_top_drops_it_on_a_side(self):
        self.park(self.bat)
        self.state["macaco_x"] = 40
        self.game["lancar"]()
        self.assertEqual(self.state["banana"], "voando")
        self.assertEqual(self.state["banana_x"], 40)
        self.assertEqual(self.audio.plays, ["lancar.wav"])
        y = self.state["banana_y"]
        self.game["lancar"]()
        self.assertEqual(self.audio.plays, ["lancar.wav"])
        self.frame()
        self.assertEqual(self.state["banana_y"], y + self.game["VELOCIDADE_BANANA"])
        self.frame(100)
        self.assertEqual(self.state["banana"], "chao")
        self.assertIn(self.state["banana_x"], [-self.game["LIMITE_X"], self.game["LIMITE_X"]])
        self.game["lancar"]()
        self.assertEqual(self.state["banana"], "chao")

    def test_the_monkey_must_walk_to_the_banana_to_throw_again(self):
        self.park(self.bat)
        self.state["banana"] = "chao"
        self.state["banana_x"] = self.game["LIMITE_X"]
        self.frame(5)
        self.assertEqual(self.state["banana"], "chao")
        self.game["segurar"]("direita", True)
        self.frame(200)
        self.assertEqual(self.state["banana"], "mao")
        self.assertEqual(self.audio.plays.count("pegar.wav"), 1)
        self.game["lancar"]()
        self.assertEqual(self.state["banana"], "voando")

    def test_hitting_the_bat_scores_ten_it_falls_and_is_reborn_on_a_side(self):
        self.park(self.bat, x=0, y=-100)
        self.game["lancar"]()
        self.frame(10)
        self.assertEqual(self.state["pontos"], 10)
        self.assertTrue(self.bat.caindo)
        self.assertEqual(self.state["banana"], "chao")
        self.assertIn("acertar.wav", self.audio.plays)
        self.assertFalse(self.bat.acertado(self.bat.x, self.bat.y))
        self.frame(200)
        self.assertFalse(self.bat.caindo)
        self.assertEqual(abs(self.bat.x), self.game["LIMITE_X"])
        self.assertEqual(self.state["pontos"], 10)

    def test_targets_go_back_and_forth_at_their_height(self):
        self.bat.x = self.game["LIMITE_X"] - 2
        self.bat.direcao = 1
        y = self.bat.y
        self.frame()
        self.assertEqual(self.bat.x, self.game["LIMITE_X"])
        self.assertEqual(self.bat.direcao, -1)
        self.frame()
        self.assertEqual(self.bat.x, self.game["LIMITE_X"] - self.game["VELOCIDADE_MORCEGO"])
        self.assertEqual(self.bat.y, y)

    def test_the_flying_hippo_inherits_from_target_and_arrives_after_some_points(self):
        Alvo = self.game["Alvo"]
        hipo = self.game["Hipopotamo"]()
        self.assertIsInstance(hipo, Alvo)
        self.assertIsInstance(self.bat, Alvo)
        self.assertGreater(hipo.raio, self.bat.raio)
        self.assertLess(hipo.velocidade, self.bat.velocidade)
        self.assertEqual((self.bat.pontos, hipo.pontos), (10, 5))
        self.park(self.bat)
        self.state["pontos"] = self.game["ENTRADA_HIPOPOTAMO"] - 1
        self.frame()
        self.assertEqual(len(self.state["alvos"]), 1)
        self.state["pontos"] += 1
        self.frame(3)
        self.assertEqual(len(self.state["alvos"]), 2)
        novo = self.state["alvos"][1]
        self.assertIs(type(novo), self.game["Hipopotamo"])
        self.park(novo, x=0, y=-120)
        self.game["lancar"]()
        self.frame(10)
        self.assertEqual(self.state["pontos"], self.game["ENTRADA_HIPOPOTAMO"] + 5)

    def test_time_out_ends_the_game_and_throwing_stops(self):
        self.state["pontos"] = 40
        self.state["tempo"] = 20
        self.frame(2)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["recorde"], 40)
        self.assertEqual(self.audio.plays.count("fim.wav"), 1)
        self.game["lancar"]()
        self.assertEqual(self.state["banana"], "mao")
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["pontos"], 0)
        self.assertEqual(len(self.state["alvos"]), 1)
        self.assertEqual(self.state["recorde"], 40)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        self.game["lancar"]()
        self.assertEqual(self.state["banana"], "mao")
        x = self.bat.x
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.bat.x, x)
        self.assertEqual(self.state["tempo"], self.game["DURACAO"] * 1000)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_advances_at_most_three_frames(self):
        self.park(self.bat)
        self.game["lancar"]()
        y = self.state["banana_y"]
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["banana_y"], y + 3 * self.game["VELOCIDADE_BANANA"])
        self.assertEqual(self.state["tempo"], self.game["DURACAO"] * 1000 - 3 * self.game["QUADRO"])


if __name__ == "__main__":
    unittest.main()
