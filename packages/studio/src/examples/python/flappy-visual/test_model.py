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
        self.game = load({"random": random.Random(2026),
                          "time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["reiniciar"]()
        self.bird = self.state["passaro"]

    def run_ms(self, total, step=16):
        while total > 0 and self.state["fase"] == "jogando":
            self.game["atualizar"](min(step, total))
            total -= step

    def park_pipes_far(self):
        for cano in self.state["canos"]:
            cano.x = 10_000

    def test_the_bird_waits_still_until_the_first_flap(self):
        self.assertEqual(self.state["fase"], "esperando")
        pipes = [cano.x for cano in self.state["canos"]]
        for _ in range(60):
            self.game["atualizar"](16)
        self.assertEqual((self.bird.y, self.bird.vy), (0, 0))
        self.assertEqual([cano.x for cano in self.state["canos"]], pipes)
        self.game["voar"]()
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.bird.vy, self.game["IMPULSO"])
        self.assertEqual(self.audio.plays, ["asa.wav"])

    def test_gravity_pulls_down_and_the_fall_has_a_speed_limit(self):
        self.game["voar"]()
        self.park_pipes_far()
        self.run_ms(160)
        self.assertGreater(self.bird.y, 30)
        self.assertLess(self.bird.vy, self.game["IMPULSO"])
        self.run_ms(500)
        self.assertLess(self.bird.vy, 0)
        self.assertGreaterEqual(self.bird.vy, -self.game["QUEDA_MAXIMA"])
        self.bird.y = 200
        self.bird.vy = -600
        self.run_ms(64)
        self.assertEqual(self.bird.vy, -self.game["QUEDA_MAXIMA"])

    def test_the_pipe_pool_is_fixed_and_recycled_with_a_new_gap(self):
        pipes = list(self.state["canos"])
        self.assertEqual(len(pipes), self.game["QUANTIDADE_CANOS"])
        first = pipes[0]
        first.x = -276
        first.passou = True
        old_gap = first.centro
        self.state["fase"] = "jogando"
        self.bird.vy = 0
        self.game["atualizar"](16)
        self.assertGreater(first.x, 300)
        self.assertFalse(first.passou)
        self.assertEqual(self.state["canos"], pipes)
        margin = self.game["VAO"] // 2 + 40
        self.assertTrue(self.game["CHAO"] + margin <= first.centro <= self.game["TETO"] - margin)
        self.assertIsInstance(old_gap, int)

    def test_passing_a_pipe_scores_once(self):
        self.game["voar"]()
        pipe = self.state["canos"][0]
        pipe.x = self.bird.x + 2
        pipe.centro = self.bird.y
        for other in self.state["canos"][1:]:
            other.x = 10_000
        self.game["atualizar"](16)
        self.assertEqual(self.state["pontos"], 1)
        self.game["atualizar"](16)
        self.assertEqual(self.state["pontos"], 1)
        self.assertEqual(self.audio.plays.count("ponto.wav"), 1)
        self.assertEqual(self.state["fase"], "jogando")

    def test_touching_a_pipe_ends_and_keeps_the_record(self):
        self.game["voar"]()
        self.state["pontos"] = 4
        pipe = self.state["canos"][0]
        pipe.x = self.bird.x + 50
        pipe.centro = self.bird.y + self.game["VAO"] / 2 + 5
        self.run_ms(400)
        self.assertEqual(self.state["fase"], "fim")
        self.assertIn("batida.wav", self.audio.plays)
        self.assertEqual(self.state["recorde"], 4)
        self.game["voar"]()
        self.assertEqual(self.state["fase"], "esperando")
        self.assertEqual((self.state["pontos"], self.state["recorde"]), (0, 4))

    def test_the_gap_is_safe_but_its_edge_is_not(self):
        Cano = self.game["Cano"]
        pipe = Cano(self.bird.x)
        pipe.centro = 0
        self.assertFalse(pipe.acerta(self.bird))
        self.bird.y = self.game["VAO"] / 2 - 10
        self.assertTrue(pipe.acerta(self.bird))
        self.bird.y = 0
        pipe.x = self.bird.x + self.game["LARGURA_CANO"] / 2 + 13
        pipe.centro = 300
        self.assertTrue(pipe.acerta(self.bird))
        pipe.x = self.bird.x + self.game["LARGURA_CANO"] / 2 + 15
        self.assertFalse(pipe.acerta(self.bird))

    def test_the_floor_and_the_ceiling_end_the_game(self):
        self.game["voar"]()
        self.park_pipes_far()
        self.bird.vy = 0
        self.run_ms(5000)
        self.assertEqual(self.state["fase"], "fim")
        self.assertLessEqual(self.bird.y - self.game["RAIO_PASSARO"], self.game["CHAO"])
        self.game["reiniciar"]()
        self.game["voar"]()
        self.park_pipes_far()
        self.state["passaro"].y = self.game["TETO"] - 20
        self.run_ms(100)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.audio.plays.count("batida.wav"), 2)

    def test_a_click_flaps_like_space(self):
        self.game["iniciar"]()
        clicks = [args[0] for call, args in self.game["tela"].calls if call == "onscreenclick"]
        self.assertEqual(len(clicks), 1)
        clicks[0](10, 20)
        bird = self.state["passaro"]
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(bird.vy, self.game["IMPULSO"])
        keys = [args[1] for call, args in self.game["tela"].calls if call == "onkey" and args[0] is self.game["voar"]]
        self.assertIn("space", keys)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["voar"]()
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        height = self.bird.y
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.bird.y, height)
        self.game["voar"]()
        self.assertEqual(self.audio.plays.count("asa.wav"), 1)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_moves_at_most_two_frames(self):
        self.game["voar"]()
        self.park_pipes_far()
        self.game["atualizar"](10_000)
        seconds = 2 * self.game["INTERVALO"] / 1000
        expected_vy = self.game["IMPULSO"] - self.game["GRAVIDADE"] * seconds
        self.assertAlmostEqual(self.bird.y, expected_vy * seconds)


if __name__ == "__main__":
    unittest.main()
