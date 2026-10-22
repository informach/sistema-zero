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
        self.state["placar"] = {"X": 0, "O": 0, "empates": 0}
        self.game["reiniciar"]()

    def press(self, *numbers):
        for number in numbers:
            self.game["tecla_casa"](number - 1)()

    def board(self):
        return self.state["tabuleiro"]

    def test_start_is_an_empty_board_with_x_to_play_and_cursor_in_the_center(self):
        self.assertEqual(self.board(), [""] * 9)
        self.assertEqual(self.state["vez"], "X")
        self.assertEqual(self.state["cursor"], 4)
        self.assertEqual(self.state["fase"], "jogando")

    def test_number_keys_follow_the_numeric_keypad_and_turns_alternate(self):
        self.press(7, 3)
        # 7 é o canto de cima à esquerda (casa 6); 3 é o canto de baixo à direita (casa 2).
        self.assertEqual(self.board()[6], "X")
        self.assertEqual(self.board()[2], "O")
        self.assertEqual(self.state["vez"], "X")
        self.assertEqual(self.game["posicao"](6), (-150, 130))
        self.assertEqual(self.game["posicao"](2), (150, -170))
        self.assertEqual(self.audio.plays.count("jogada.wav"), 2)

    def test_an_occupied_cell_is_refused_and_the_turn_stays(self):
        self.press(5, 5)
        self.assertEqual(self.board()[4], "X")
        self.assertEqual(self.board().count(""), 8)
        self.assertEqual(self.state["vez"], "O")
        self.assertIn("ocupada", self.state["aviso"])
        self.assertEqual(self.audio.plays.count("recusa.wav"), 1)
        self.press(1)
        self.assertEqual(self.state["aviso"], "")

    def test_a_row_wins_highlights_scores_and_the_next_input_starts_a_new_round(self):
        self.press(1, 4, 2, 5, 3)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["linha"], (0, 1, 2))
        self.assertEqual(self.state["placar"]["X"], 1)
        self.assertIn("vitoria.wav", self.audio.plays)
        self.assertTrue(any(name == "pendown" for name, args in self.game["destaque"].calls))
        self.press(9)
        self.assertEqual(self.board(), [""] * 9)
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["placar"]["X"], 1)

    def test_columns_and_both_diagonals_are_detected(self):
        vencedora = self.game["linha_vencedora"]
        self.assertEqual(vencedora(["O", "", "", "O", "", "", "O", "", ""]), (0, 3, 6))
        self.assertEqual(vencedora(["X", "", "", "", "X", "", "", "", "X"]), (0, 4, 8))
        self.assertEqual(vencedora(["", "", "O", "", "O", "", "O", "", ""]), (2, 4, 6))
        self.assertIsNone(vencedora(["X", "O", "X", "", "", "", "", "", ""]))

    def test_a_full_board_without_a_line_is_a_draw(self):
        self.press(5, 1, 9, 3, 2, 8, 4, 6, 7)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["resultado"], "EMPATE!")
        self.assertEqual(self.state["placar"]["empates"], 1)
        self.assertIsNone(self.state["linha"])

    def test_the_computer_wins_blocks_takes_the_center_then_a_corner(self):
        escolher = self.game["escolher_casa"]
        self.assertEqual(escolher(["O", "O", "", "X", "X", "", "", "", ""]), 2)
        # O bloqueio cai numa borda, que nunca seria a escolha de canto.
        self.assertEqual(escolher(["X", "", "", "", "O", "", "X", "", ""]), 3)
        self.assertEqual(escolher(["X", "", "", "", "", "", "", "", ""]), 4)
        self.assertIn(escolher(["", "", "", "", "X", "", "", "", ""]), [0, 2, 6, 8])
        self.assertEqual(escolher(["X", "O", "X", "X", "O", "O", "O", "X", ""]), 8)

    def test_the_computer_waits_ignores_clicks_on_its_turn_and_plays_once(self):
        self.game["alternar_computador"]()
        self.assertTrue(self.state["computador"])
        self.press(1)
        self.assertEqual(self.state["vez"], "O")
        self.press(9)
        self.assertEqual(self.board()[8], "")
        # Um quadro muito atrasado conta só LIMITE_QUADRO: o computador ainda pensa.
        self.game["atualizar"](10_000)
        self.assertEqual(self.board().count("O"), 0)
        for _ in range(6):
            self.game["atualizar"](100)
        self.assertEqual(self.board().count("O"), 1)
        self.assertEqual(self.board()[4], "O")
        self.assertEqual(self.state["vez"], "X")
        self.game["atualizar"](5000)
        self.assertEqual(self.board().count("O"), 1)

    def test_toggling_the_computer_zeroes_the_score(self):
        self.press(1, 4, 2, 5, 3)
        self.assertEqual(self.state["placar"]["X"], 1)
        self.game["alternar_computador"]()
        self.assertEqual(self.state["placar"], {"X": 0, "O": 0, "empates": 0})
        self.game["alternar_computador"]()
        self.assertFalse(self.state["computador"])

    def test_arrows_move_the_cursor_inside_the_board_and_enter_plays_there(self):
        mover = self.game["mover"]
        mover(1, 0)
        mover(1, 0)
        self.assertEqual(self.state["cursor"], 5)
        mover(0, 1)
        mover(0, 1)
        self.assertEqual(self.state["cursor"], 8)
        self.game["tocar"](self.state["cursor"])
        self.assertEqual(self.board()[8], "X")
        self.assertIn(("goto", ((150, 130),)), self.game["cursor"].calls)

    def test_a_click_maps_to_its_cell_and_outside_clicks_do_nothing(self):
        self.game["clicar"](-140, -150)
        self.assertEqual(self.board()[0], "X")
        self.game["clicar"](20, 120)
        self.assertEqual(self.board()[7], "O")
        self.game["clicar"](260, 0)
        self.assertEqual(self.board().count(""), 7)

    def test_the_cursor_pulses_without_ever_hiding(self):
        cursor = self.game["cursor"]
        cursor.calls.clear()
        for _ in range(10):
            self.game["atualizar"](100)
        sizes = [args for name, args in cursor.calls if name == "shapesize"]
        self.assertEqual(sizes, [(0.94, 0.94), (1, 1)])
        self.assertNotIn("hideturtle", [name for name, args in cursor.calls])

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
