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


SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]


def inversions(tiles):
    numbers = [tile for tile in tiles if tile != 0]
    return sum(1 for i in range(len(numbers)) for j in range(i + 1, len(numbers))
               if numbers[i] > numbers[j])


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

    def tiles(self):
        return self.state["pecas"]

    def near_solved(self):
        # Resolvido com o 15 trocado pelo vazio: falta um movimento.
        self.state["pecas"] = list(SOLVED)
        self.game["trocar"](self.state["pecas"], 14, 15)

    def test_the_start_is_shuffled_solvable_and_the_gap_waits_in_the_corner(self):
        self.assertNotEqual(self.tiles(), SOLVED)
        self.assertEqual(sorted(self.tiles()), list(range(16)))
        self.assertEqual(self.tiles()[15], 0)
        # Com o vazio na última linha, só um número par de inversões tem solução.
        self.assertEqual(inversions(self.tiles()) % 2, 0)
        self.assertEqual(self.state["movimentos"], 0)
        self.assertIn("embaralhar.wav", self.audio.plays)
        self.assertEqual(len(self.game["pincel"].stamps), 15)

    def test_the_shuffle_only_makes_legal_moves_and_never_undoes_the_last_one(self):
        tiles = list(SOLVED)
        path = self.game["embaralhar"](tiles, 300)
        for index in range(1, len(path)):
            self.assertIn(path[index], self.game["vizinhos"](path[index - 1]))
        for index in range(2, 301):
            self.assertNotEqual(path[index], path[index - 2])
        self.assertEqual(path[-1], 15)
        self.assertEqual(inversions(tiles) % 2, 0)

    def test_arrows_push_the_neighbour_in_the_arrow_direction(self):
        self.state["pecas"] = list(SOLVED)
        # Seta para baixo: a peça de cima (12) desce para o vazio.
        self.game["empurrar"](0, 1)
        self.assertEqual(self.tiles()[15], 12)
        self.assertEqual(self.tiles()[11], 0)
        # Seta para a direita: a peça da esquerda (11) vai para a direita.
        self.game["empurrar"](1, 0)
        self.assertEqual(self.tiles()[11], 11)
        self.assertEqual(self.tiles()[10], 0)
        self.assertEqual(self.state["movimentos"], 2)
        self.assertEqual(self.audio.plays.count("deslizar.wav"), 2)
        self.assertIn(("goto", ((50.0, -70.0),)), self.game["vazio"].calls)

    def test_an_arrow_with_nothing_to_push_is_refused(self):
        self.state["pecas"] = list(SOLVED)
        self.game["empurrar"](-1, 0)
        self.game["empurrar"](0, -1)
        self.assertEqual(self.tiles(), SOLVED)
        self.assertEqual(self.state["movimentos"], 0)
        self.assertEqual(self.audio.plays.count("bloqueio.wav"), 2)

    def test_a_click_moves_only_a_tile_touching_the_gap(self):
        self.state["pecas"] = list(SOLVED)
        self.game["clicar"](-150, -170)
        self.assertEqual(self.tiles(), SOLVED)
        self.game["clicar"](60, -150)
        self.assertEqual(self.tiles()[15], 15)
        self.assertEqual(self.tiles()[14], 0)
        self.assertEqual(self.state["movimentos"], 1)

    def test_solving_wins_keeps_the_best_and_freezes_the_board(self):
        self.near_solved()
        self.state["movimentos"] = 41
        self.game["empurrar"](-1, 0)
        self.assertEqual(self.tiles(), SOLVED)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["melhor"], 42)
        self.assertIn("vitoria.wav", self.audio.plays)
        self.game["empurrar"](1, 0)
        self.assertEqual(self.tiles(), SOLVED)
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["melhor"], 42)
        self.near_solved()
        self.state["movimentos"] = 99
        self.game["empurrar"](-1, 0)
        self.assertEqual(self.state["melhor"], 42)

    def test_tiles_in_their_place_are_green(self):
        self.near_solved()
        self.game["desenhar_pecas"]()
        colors = [args[0] for name, args in self.game["pincel"].calls if name == "color"]
        self.assertEqual(colors[-28:].count("#22c55e"), 14)

    def test_the_clock_starts_on_the_first_move_and_pause_freezes_it_and_the_board(self):
        screen = self.game["tela"]
        self.game["atualizar"](100)
        self.assertEqual(self.state["tempo"], 0)
        self.state["pecas"] = list(SOLVED)
        self.game["empurrar"](0, 1)
        self.game["atualizar"](100)
        self.assertEqual(self.state["tempo"], 100)
        self.game["pausar"]()
        self.game["empurrar"](0, 1)
        self.assertEqual(self.state["movimentos"], 1)
        self.clock[0] = 5
        self.game["agendar"]()
        screen.timers.pop()()
        self.assertEqual(self.state["tempo"], 100)
        self.game["pausar"]()
        self.clock[0] = 5.05
        screen.timers.pop()()
        self.assertAlmostEqual(self.state["tempo"], 150)

    def test_a_late_frame_adds_at_most_one_limited_step_to_the_clock(self):
        self.state["pecas"] = list(SOLVED)
        self.game["empurrar"](0, 1)
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["tempo"], 100)

    def test_the_gap_marker_pulses_without_ever_hiding(self):
        marker = self.game["vazio"]
        marker.calls.clear()
        for _ in range(10):
            self.game["atualizar"](100)
        sizes = [args for name, args in marker.calls if name == "shapesize"]
        self.assertEqual(sizes, [(0.9, 0.9), (1, 1)])
        self.assertNotIn("hideturtle", [name for name, args in marker.calls])

    def test_restart_and_close_never_add_timers_and_stop_the_audio(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        screen.timers.pop()()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 3)


if __name__ == "__main__":
    unittest.main()
