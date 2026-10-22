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
        self.game["reiniciar"]()
        self.cards = self.state["cartas"]

    def pair(self, skip=()):
        """Duas casas com cartas iguais (e uma diferente da primeira)."""
        first = 0
        while first in skip or self.cards[first].achada:
            first += 1
        same = [i for i in range(16) if i != first and self.cards[i].combina(self.cards[first])][0]
        other = [i for i in range(16) if not self.cards[i].combina(self.cards[first])][0]
        return first, same, other

    def flip(self, *houses):
        for house in houses:
            self.game["virar"](house)

    def test_the_deal_has_eight_pairs_face_down_and_the_cursor_on_the_first_card(self):
        names = sorted((card.figura, card.cor) for card in self.cards)
        self.assertEqual(len(self.cards), 16)
        self.assertEqual(len(set(names)), 8)
        for name in set(names):
            self.assertEqual(names.count(name), 2)
        self.assertFalse(any(card.virada or card.achada for card in self.cards))
        self.assertEqual(self.state["cursor"], 0)
        self.assertEqual(len(self.game["pincel"].stamps), 16)
        self.assertEqual(len(self.game["simbolo"].stamps), 0)

    def test_two_equal_cards_stay_open_and_count_a_pair(self):
        first, same, other = self.pair()
        self.flip(first, same)
        self.assertTrue(self.cards[first].achada and self.cards[same].achada)
        self.assertEqual(self.state["pares"], 1)
        self.assertEqual(self.state["tentativas"], 1)
        self.assertIn("acerto.wav", self.audio.plays)
        self.assertEqual(len(self.game["simbolo"].stamps), 2)
        self.game["atualizar"](100)
        self.flip(other)
        self.assertTrue(self.cards[other].virada)

    def test_two_different_cards_close_only_after_the_waiting_time(self):
        first, same, other = self.pair()
        self.flip(first, other)
        self.assertTrue(self.cards[first].virada and self.cards[other].virada)
        self.assertEqual(self.state["tentativas"], 1)
        self.assertIn("erro.wav", self.audio.plays)
        for _ in range(8):
            self.game["atualizar"](100)
        self.assertTrue(self.cards[first].virada)
        self.game["atualizar"](100)
        self.assertFalse(self.cards[first].virada or self.cards[other].virada)
        self.assertIsNone(self.state["primeira"])
        self.assertEqual(len(self.game["simbolo"].stamps), 0)

    def test_nothing_flips_while_two_cards_wait_and_a_card_cannot_flip_twice(self):
        first, same, other = self.pair()
        self.flip(first, first)
        self.assertEqual(self.state["primeira"], first)
        self.assertEqual(self.state["tentativas"], 0)
        self.flip(other, same)
        self.assertFalse(self.cards[same].virada)
        self.assertEqual(self.state["tentativas"], 1)

    def test_finding_every_pair_wins_and_keeps_the_best(self):
        found = []
        while self.state["fase"] == "jogando":
            first, same, other = self.pair(found)
            self.flip(first, same)
            found += [first, same]
        self.assertEqual(self.state["pares"], 8)
        self.assertEqual(self.state["melhor"], 8)
        self.assertIn("vitoria.wav", self.audio.plays)
        before = self.state["tempo"]
        self.game["atualizar"](100)
        self.assertEqual(self.state["tempo"], before)
        self.game["reiniciar"]()
        self.assertEqual(self.state["pares"], 0)
        self.assertEqual(self.state["melhor"], 8)

    def test_arrows_move_the_cursor_inside_the_grid(self):
        mover = self.game["mover"]
        mover(-1, 0)
        mover(0, -1)
        self.assertEqual(self.state["cursor"], 0)
        mover(1, 0)
        mover(0, 1)
        self.assertEqual(self.state["cursor"], 5)
        for _ in range(5):
            mover(1, 0)
            mover(0, 1)
        self.assertEqual(self.state["cursor"], 15)
        self.assertIn(("goto", ((165.0, -175.0),)), self.game["cursor"].calls)

    def test_a_click_moves_the_cursor_and_flips_that_card(self):
        self.game["clicar"](0, 0)
        self.assertEqual(self.state["cursor"], 6)
        self.assertTrue(self.cards[6].virada)
        self.game["clicar"](400, 0)
        self.assertEqual(self.state["cursor"], 6)

    def test_pause_freezes_the_clock_the_wait_and_the_cards(self):
        screen = self.game["tela"]
        first, same, other = self.pair()
        self.flip(first, other)
        self.game["pausar"]()
        self.game["agendar"]()
        self.clock[0] = 10
        screen.timers.pop()()
        self.assertEqual(self.state["tempo"], 0)
        self.assertTrue(self.cards[first].virada)
        self.game["pausar"]()
        self.game["virar"](same)
        self.assertFalse(self.cards[same].virada)

    def test_a_late_frame_counts_at_most_one_limited_step(self):
        first, same, other = self.pair()
        self.flip(first, other)
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["tempo"], 100)
        self.assertTrue(self.cards[first].virada)

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
