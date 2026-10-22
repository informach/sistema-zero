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
        # Nenhum alvo sorteado sozinho, a não ser que o teste peça.
        self.state["espera"] = 10 ** 9

    def frame(self, count=1):
        for _ in range(count):
            self.game["atualizar"](self.game["QUADRO"])

    def target(self, x, y):
        alvo = self.game["Alvo"](y)
        alvo.x = x
        self.state["alvos"].append(alvo)
        return alvo

    def test_start_aims_at_forty_five_with_no_ball_and_draws_the_sight(self):
        self.assertEqual((self.state["angulo"], self.state["forca"]), (45, 13))
        self.assertIsNone(self.state["bala"])
        self.assertEqual(self.state["alvos"], [])
        dots = [args for name, args in self.game["mira"].calls if name == "dot"]
        self.assertEqual(dots[-1], (16, self.game["COR_MIRA"]))

    def test_arrows_change_angle_and_force_within_limits(self):
        self.game["mirar"](3, 0)
        self.game["mirar"](0, -1)
        self.assertEqual((self.state["angulo"], self.state["forca"]), (48, 12))
        for vez in range(40):
            self.game["mirar"](3, 1)
        self.assertEqual((self.state["angulo"], self.state["forca"]), (85, 20))
        for vez in range(40):
            self.game["mirar"](-3, -1)
        self.assertEqual((self.state["angulo"], self.state["forca"]), (5, 6))

    def test_the_sight_tip_moves_with_angle_and_force(self):
        antes = self.game["ponta"](100)
        self.game["mirar"](3, 0)
        depois = self.game["ponta"](100)
        self.assertGreater(depois[1], antes[1])
        self.assertLess(depois[0], antes[0])

    def test_space_fires_one_ball_at_a_time_and_gravity_bends_it(self):
        self.game["atirar"]()
        bala = self.state["bala"]
        self.assertAlmostEqual(bala.vx, 13 * 2 ** 0.5 / 2)
        self.assertAlmostEqual(bala.vy, 13 * 2 ** 0.5 / 2)
        self.game["atirar"]()
        self.assertIs(self.state["bala"], bala)
        self.assertEqual(self.audio.plays, ["tiro.wav"])
        vx = bala.vx
        vy = bala.vy
        self.frame()
        self.assertEqual(bala.vx, vx)
        self.assertAlmostEqual(bala.vy, vy - self.game["GRAVIDADE"])
        self.frame(400)
        self.assertIsNone(self.state["bala"])
        self.game["atirar"]()
        self.assertIsNotNone(self.state["bala"])

    def test_a_click_aims_at_the_point_and_fires(self):
        x = self.game["CANHAO_X"] + 300
        y = self.game["CANHAO_Y"] + 300
        self.game["clicar"](x, y)
        self.assertEqual(self.state["angulo"], 45)
        self.assertEqual(self.state["forca"], 17)
        self.assertIsNotNone(self.state["bala"])
        self.game["clicar"](self.game["CANHAO_X"] + 400, self.game["CANHAO_Y"])
        self.assertEqual(self.state["angulo"], self.game["ANGULO_MIN"])
        self.assertEqual(self.state["forca"], 16)
        self.assertEqual(self.audio.plays.count("tiro.wav"), 1)

    def test_targets_arrive_on_the_right_and_walk_left(self):
        self.state["espera"] = 16
        self.frame()
        self.assertEqual(len(self.state["alvos"]), 1)
        alvo = self.state["alvos"][0]
        self.assertTrue(self.game["ALVO_Y_MIN"] <= alvo.y <= self.game["ALVO_Y_MAX"])
        self.assertEqual(alvo.x, self.game["LARGURA"] / 2 + 20 - self.game["VELOCIDADE_ALVO"])
        self.assertEqual(self.state["espera"], self.game["ESPERA_ALVOS"])

    def test_a_ball_near_a_target_destroys_it(self):
        self.game["atirar"]()
        bala = self.state["bala"]
        perto = self.target(bala.x + bala.vx + 1, bala.y + bala.vy + 21)
        longe = self.target(bala.x + bala.vx, bala.y + bala.vy + 30)
        self.frame()
        self.assertNotIn(perto, self.state["alvos"])
        self.assertIn(longe, self.state["alvos"])
        self.assertEqual(self.state["pontos"], 1)
        self.assertIn("acerto.wav", self.audio.plays)

    def test_a_target_reaching_the_left_ends_the_game(self):
        self.state["pontos"] = 4
        self.target(-self.game["LARGURA"] / 2 + 20.5, 0)
        self.frame()
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["recorde"], 4)
        self.assertEqual(self.audio.plays.count("fim.wav"), 1)
        self.game["atirar"]()
        self.game["mirar"](3, 0)
        self.assertIsNone(self.state["bala"])
        self.assertEqual(self.state["angulo"], 45)
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["alvos"], [])
        self.assertEqual(self.state["recorde"], 4)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        alvo = self.target(100, 0)
        self.game["pausar"]()
        self.game["atirar"]()
        self.game["clicar"](0, 0)
        self.assertIsNone(self.state["bala"])
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(alvo.x, 100)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_advances_at_most_three_frames(self):
        alvo = self.target(100, 0)
        self.game["atirar"]()
        bala = self.state["bala"]
        x = bala.x
        self.game["atualizar"](10_000)
        self.assertEqual(alvo.x, 100 - 3 * self.game["VELOCIDADE_ALVO"])
        self.assertAlmostEqual(bala.x, x + 3 * bala.vx)


if __name__ == "__main__":
    unittest.main()
