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

    def runners(self):
        return self.state["corredoras"]

    def race_to_the_end(self):
        steps = 0
        while self.state["fase"] == "correndo":
            self.game["atualizar"](self.game["PASSO_CORRIDA"])
            steps += 1
            self.assertLess(steps, 1000)
        return steps

    def test_start_lines_up_four_runners_and_bets_on_lane_one(self):
        self.assertEqual([r.raia for r in self.runners()], [1, 2, 3, 4])
        self.assertEqual([r.cor for r in self.runners()], self.game["CORES"])
        self.assertTrue(all(r.x == self.game["LARGADA"] for r in self.runners()))
        self.assertEqual([r.y() for r in self.runners()], [105, 35, -35, -105])
        self.assertEqual(self.state["fase"], "apostando")
        self.assertEqual(self.state["aposta"], 1)
        self.assertEqual(len(self.game["pincel"].stamps), 4)

    def test_keys_and_clicks_choose_the_bet_but_not_during_a_race(self):
        self.game["apostar"](3)
        self.assertEqual(self.state["aposta"], 3)
        self.game["clicar"](0, 40)
        self.assertEqual(self.state["aposta"], 2)
        self.game["clicar"](0, 0)
        self.assertEqual(self.state["aposta"], 2)
        self.game["clicar"](100, -110)
        self.assertEqual(self.state["aposta"], 4)
        self.game["largar"]()
        self.game["apostar"](1)
        self.assertEqual(self.state["aposta"], 4)

    def test_each_step_moves_every_runner_a_random_amount_forward(self):
        self.game["largar"]()
        self.assertIn("largada.wav", self.audio.plays)
        self.game["atualizar"](self.game["PASSO_CORRIDA"])
        for runner in self.runners():
            self.assertTrue(2 <= runner.x - self.game["LARGADA"] <= 12)
        self.assertEqual(len(self.game["pincel"].stamps), 4)
        self.game["atualizar"](self.game["PASSO_CORRIDA"] - 1)
        self.assertEqual(self.state["acumulado"], self.game["PASSO_CORRIDA"] - 1)

    def test_the_first_across_the_line_wins_and_the_score_counts(self):
        self.game["largar"]()
        self.race_to_the_end()
        winner = self.game["vencedora_da_chegada"]()
        self.assertTrue(winner.cruzou())
        for runner in self.runners():
            self.assertLessEqual(runner.x, winner.x)
        self.assertEqual(self.audio.plays.count("chegada.wav"), 1)
        self.assertEqual(self.state["certas"] + self.state["erradas"], 1)
        hit = winner.raia == self.state["aposta"]
        self.assertEqual(self.state["certas"], int(hit))
        self.assertEqual("acerto.wav" in self.audio.plays, hit)
        # Espaço de novo realinha e começa outra corrida, mantendo o placar.
        self.game["largar"]()
        self.assertTrue(all(r.x == self.game["LARGADA"] for r in self.runners()))
        self.race_to_the_end()
        self.assertEqual(self.state["certas"] + self.state["erradas"], 2)

    def test_a_tie_goes_to_the_farthest_then_to_the_upper_lane(self):
        self.game["largar"]()
        first, second, third, fourth = self.runners()
        first.x, second.x, third.x, fourth.x = 300, 345, 349, 349
        self.assertIs(self.game["vencedora_da_chegada"](), third)
        fourth.x = 351
        self.assertIs(self.game["vencedora_da_chegada"](), fourth)
        first.x, second.x, third.x, fourth.x = 0, 0, 0, 0
        self.assertIsNone(self.game["vencedora_da_chegada"]())

    def test_right_and_wrong_bets_are_scored(self):
        self.game["largar"]()
        self.runners()[1].x = 339
        self.game["random"] = types.SimpleNamespace(randint=lambda low, high: low)
        self.game["dar_passo"]()
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["erradas"], 1)
        self.assertIn("azul", self.state["resultado"])
        self.game["apostar"](2)
        self.game["largar"]()
        self.runners()[1].x = 339
        self.game["dar_passo"]()
        self.assertEqual(self.state["certas"], 1)
        self.assertIn("acerto.wav", self.audio.plays)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["largar"]()
        self.game["pausar"]()
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertTrue(all(r.x == self.game["LARGADA"] for r in self.runners()))
        self.game["largar"]()
        self.assertEqual(self.state["acumulado"], 0)
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "apostando")
        self.assertEqual(self.state["certas"] + self.state["erradas"], 0)
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_gives_at_most_two_steps(self):
        self.game["largar"]()
        self.game["atualizar"](10_000)
        for runner in self.runners():
            self.assertTrue(4 <= runner.x - self.game["LARGADA"] <= 24)


if __name__ == "__main__":
    unittest.main()
