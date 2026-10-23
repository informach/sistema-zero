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
        self.state["modo"] = 1
        self.game["reiniciar"]()
        self.snake = self.state["cobra"]

    def step(self, count=1):
        for _ in range(count):
            self.game["atualizar"](self.state["passo"])

    def stamps(self):
        return self.game["pincel"].stamps

    def test_start_has_three_segments_and_food_outside_the_body(self):
        self.assertEqual(self.snake.corpo, [(3, 10), (4, 10), (5, 10)])
        self.assertNotIn(self.state["fruta"], self.snake.corpo)
        self.assertEqual(len(self.stamps()), 3)
        self.assertEqual(self.state["passo"], self.game["PASSO_COBRINHA"])
        self.assertEqual(self.audio.plays, ["abertura.wav"])

    def test_each_step_moves_one_cell_and_keeps_one_stamp_per_segment(self):
        self.state["fruta"] = (0, 0)
        self.step(3)
        self.assertEqual(self.snake.corpo, [(6, 10), (7, 10), (8, 10)])
        self.assertEqual(len(self.stamps()), 3)
        self.assertEqual(self.state["carimbos"], sorted(self.stamps()))

    def test_reverse_is_ignored_and_a_turn_waits_for_the_next_step(self):
        self.state["fruta"] = (0, 0)
        self.game["virar"](-1, 0)
        self.step()
        self.assertEqual(self.snake.cabeca(), (6, 10))
        self.game["virar"](0, 1)
        self.assertEqual(self.snake.cabeca(), (6, 10))
        self.step()
        self.assertEqual(self.snake.cabeca(), (6, 11))
        # Depois de subir, "para baixo" é voltar e continua recusado.
        self.game["virar"](0, -1)
        self.step()
        self.assertEqual(self.snake.cabeca(), (6, 12))

    def test_eating_grows_scores_and_lagarta_speeds_up(self):
        self.state["fruta"] = (6, 10)
        self.step()
        self.assertEqual(self.state["pontos"], 1)
        self.assertIn("comer.wav", self.audio.plays)
        self.assertNotIn(self.state["fruta"], self.snake.corpo)
        self.step(2)
        self.assertEqual(len(self.snake.corpo), 5)
        self.assertEqual(len(self.stamps()), 5)
        self.assertEqual(self.state["passo"], self.game["PASSO_COBRINHA"])
        self.game["reiniciar"](2)
        self.state["fruta"] = (6, 10)
        before = self.state["passo"]
        self.step()
        self.assertLess(self.state["passo"], before)
        self.assertEqual(self.state["modo"], 2)

    def test_wall_ends_the_game_and_keeps_the_record(self):
        self.state["fruta"] = (6, 10)
        self.step()
        self.state["fruta"] = (0, 0)
        self.step(30)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["recorde"], 1)
        self.assertEqual(self.audio.plays.count("bater.wav"), 1)
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["recorde"], 1)
        self.assertEqual(self.state["pontos"], 0)

    def test_body_blocks_but_the_moving_tail_cell_is_free(self):
        Cobra = self.game["Cobra"]
        loop = Cobra(1, 1)
        loop.corpo = [(1, 1), (2, 1), (2, 2), (1, 2)]
        loop.direcao = (-1, 0)
        loop.virar(0, -1)
        self.assertFalse(loop.ocupa(loop.proxima()))
        loop.crescer = 1
        self.assertTrue(loop.ocupa((1, 1)))
        self.state["cobra"] = loop
        self.game["desenhar_cobra"]()
        self.state["fruta"] = (9, 9)
        self.assertEqual(self.state["fase"], "jogando")

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        head = self.snake.cabeca()
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.snake.cabeca(), head)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_moves_at_most_two_cells(self):
        self.state["fruta"] = (0, 0)
        self.game["atualizar"](10_000)
        self.assertEqual(self.snake.cabeca(), (7, 10))

    def test_filling_the_garden_is_a_victory(self):
        Cobra = self.game["Cobra"]
        full = Cobra(1, 0)
        full.corpo = [(column, row) for row in range(20) for column in range(20)
                      if (column, row) != (19, 19)]
        self.state["cobra"] = full
        self.assertEqual(self.game["sortear_fruta"](), (19, 19))
        full.corpo.append((19, 19))
        self.assertIsNone(self.game["sortear_fruta"]())


if __name__ == "__main__":
    unittest.main()
