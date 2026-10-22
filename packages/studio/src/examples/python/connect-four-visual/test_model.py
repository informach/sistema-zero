"""Testes inertes de regras; gravadores de efeitos não simulam Turtle/Tk."""

import ast
import math
from pathlib import Path
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
        self.game = load({"math": math,
                          "time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.state["placar"] = {"vermelho": 0, "amarelo": 0, "empates": 0}
        self.game["reiniciar"]()

    def land(self):
        for _ in range(200):
            if self.state["fase"] != "caindo":
                return
            self.game["atualizar"](16)
        self.fail("a peça nunca pousou")

    def drop(self, *numbers):
        for number in numbers:
            self.game["tecla_coluna"](number - 1)()
            self.land()

    def grid(self):
        return self.state["grade"]

    def test_start_has_seven_empty_columns_red_to_play_and_the_arrow_in_the_middle(self):
        self.assertEqual(self.grid(), [[], [], [], [], [], [], []])
        self.assertEqual(self.state["vez"], "vermelho")
        self.assertEqual(self.state["cursor"], 3)
        self.assertIn(("goto", (0.0, 250)), self.game["cursor"].calls)

    def test_a_piece_falls_over_time_lands_in_the_lowest_cell_and_passes_the_turn(self):
        self.game["soltar"](3)
        self.assertEqual(self.state["fase"], "caindo")
        start = self.state["queda"]["y"]
        self.game["atualizar"](100)
        self.assertAlmostEqual(self.state["queda"]["y"], start - 90)
        self.assertEqual(self.grid()[3], [])
        # Enquanto cai, outra jogada é ignorada.
        self.game["soltar"](4)
        self.assertEqual(self.state["queda"]["coluna"], 3)
        self.land()
        self.assertEqual(self.grid()[3], ["vermelho"])
        self.assertEqual(self.grid()[4], [])
        self.assertEqual(self.state["vez"], "amarelo")
        self.assertIn("encaixe.wav", self.audio.plays)
        self.assertIn(("dot", (64.0, "#ef4444")), self.game["pincel"].calls)

    def test_pieces_stack_and_a_full_column_is_refused(self):
        self.drop(1, 1, 1, 1, 1, 1)
        self.assertEqual(len(self.grid()[0]), 6)
        self.assertEqual(self.grid()[0][1], "amarelo")
        self.game["soltar"](0)
        self.assertEqual(self.state["fase"], "jogando")
        self.assertIn("cheia", self.state["aviso"])
        self.assertEqual(self.audio.plays.count("recusa.wav"), 1)
        self.assertEqual(self.state["vez"], "vermelho")

    def test_four_in_a_row_wins_highlights_the_line_and_scores(self):
        self.drop(1, 1, 2, 2, 3, 3, 4)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["placar"]["vermelho"], 1)
        self.assertEqual(sorted(self.state["vencedoras"]), [(0, 0), (1, 0), (2, 0), (3, 0)])
        dots = [args for name, args in self.game["destaque"].calls if name == "dot"]
        self.assertEqual(len(dots), 4)
        self.assertIn("vitoria.wav", self.audio.plays)
        # Depois do fim, a próxima jogada começa outra rodada e mantém o placar.
        self.drop(5)
        self.assertEqual(self.grid(), [[], [], [], [], [], [], []])
        self.assertEqual(self.state["placar"]["vermelho"], 1)

    def test_vertical_and_both_diagonals_are_detected(self):
        vencedora = self.game["linha_vencedora"]
        r, y = "vermelho", "amarelo"
        vertical = [[y, r, r, r, r], [], [], [], [], [], []]
        self.assertEqual(len(vencedora(vertical, 0, 4)), 4)
        rising = [[r], [y, r], [y, y, r], [y, y, y, r], [], [], []]
        self.assertEqual(sorted(vencedora(rising, 2, 2)), [(0, 0), (1, 1), (2, 2), (3, 3)])
        falling = [[], [], [], [y, y, y, r], [y, y, r], [y, r], [r]]
        self.assertEqual(sorted(vencedora(falling, 6, 0)), [(3, 3), (4, 2), (5, 1), (6, 0)])
        three = [[r], [r], [r], [], [], [], []]
        self.assertIsNone(vencedora(three, 1, 0))

    def test_a_full_board_without_four_is_a_draw(self):
        pattern = ["vavava", "vavava", "avavav", "avavav", "vavava", "vavava", "avavav"]
        names = {"v": "vermelho", "a": "amarelo"}
        grid = self.grid()
        for column in range(7):
            for letter in pattern[column]:
                grid[column].append(names[letter])
        grid[6].pop()
        self.game["soltar"](6)
        self.land()
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["placar"]["empates"], 1)
        self.assertIsNone(self.state["vencedoras"])
        self.assertIn("empate.wav", self.audio.plays)

    def test_arrows_clamp_at_the_edges_and_down_drops_under_the_arrow(self):
        for _ in range(5):
            self.game["mover"](1)
        self.assertEqual(self.state["cursor"], 6)
        for _ in range(9):
            self.game["mover"](-1)
        self.assertEqual(self.state["cursor"], 0)
        self.game["soltar"](self.state["cursor"])
        self.land()
        self.assertEqual(self.grid()[0], ["vermelho"])

    def test_a_click_picks_the_column_under_it(self):
        self.game["clicar"](95, -200)
        self.land()
        self.assertEqual(self.grid()[4], ["vermelho"])
        self.assertEqual(self.state["cursor"], 4)
        self.game["clicar"](-300, 0)
        self.assertEqual(self.state["fase"], "jogando")

    def test_a_late_frame_moves_the_piece_at_most_one_limited_step(self):
        self.game["soltar"](2)
        start = self.state["queda"]["y"]
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["fase"], "caindo")
        self.assertAlmostEqual(start - self.state["queda"]["y"], 90)

    def test_the_arrow_pulses_without_ever_hiding(self):
        cursor = self.game["cursor"]
        cursor.calls.clear()
        for _ in range(10):
            self.game["atualizar"](100)
        sizes = [args for name, args in cursor.calls if name == "shapesize"]
        self.assertEqual(sizes, [(0.85, 0.85), (1, 1)])
        self.assertNotIn("hideturtle", [name for name, args in cursor.calls])

    def test_restart_and_close_never_add_timers_and_stop_the_audio(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["soltar"](3)
        self.game["reiniciar"]()
        self.assertEqual(self.state["fase"], "jogando")
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
