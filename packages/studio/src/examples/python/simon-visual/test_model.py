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


SOUNDS = ["verde.wav", "vermelho.wav", "azul.wav", "amarelo.wav"]


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

    def run_for(self, milliseconds, step=50):
        for _ in range(milliseconds // step):
            self.game["atualizar"](step)

    def watch(self, sequence):
        """Troca a sequência e deixa a demonstração inteira passar."""
        self.state["sequencia"] = list(sequence)
        self.audio.plays.clear()
        self.run_for(900 + len(sequence) * 650 + 100)
        self.assertEqual(self.state["fase"], "repetindo")

    def color_sounds(self):
        return [path for path in self.audio.plays if path in SOUNDS]

    def finger_moves(self):
        moves = [args for name, args in self.game["dedo"].calls if name == "goto"]
        return [args[0] if len(args) == 1 else args for args in moves]

    def test_the_game_starts_with_one_step_waiting_to_be_shown(self):
        self.assertEqual(len(self.state["sequencia"]), 1)
        self.assertIn(self.state["sequencia"][0], [0, 1, 2, 3])
        self.assertEqual(self.state["fase"], "mostrando")
        self.assertIsNone(self.state["aceso"])
        self.assertEqual(self.finger_moves()[-1], (0, -10))

    def test_the_sequence_is_shown_in_order_lighting_each_colour_with_its_sound(self):
        self.watch([0, 2, 1, 1])
        self.assertEqual(self.color_sounds(), ["verde.wav", "azul.wav", "vermelho.wav", "vermelho.wav"])
        self.assertIsNone(self.state["aceso"])

    def test_input_is_ignored_while_the_sequence_is_shown(self):
        self.state["sequencia"] = [2]
        self.run_for(1000)
        self.assertEqual(self.state["aceso"], 2)
        self.game["tocar"](2)
        self.assertEqual(self.state["passo"], 0)
        self.assertEqual(self.state["fase"], "mostrando")
        self.assertEqual(len(self.finger_moves()), 1)

    def test_repeating_correctly_grows_the_sequence_by_one_step(self):
        self.watch([3, 0])
        self.game["tocar"](3)
        self.assertEqual(self.state["passo"], 1)
        self.assertEqual(self.finger_moves()[-1], (-145, -10))
        self.game["tocar"](0)
        self.assertEqual(self.finger_moves()[-1], (0, 135))
        self.assertEqual(self.state["pontos"], 2)
        self.assertEqual(self.state["fase"], "intervalo")
        self.run_for(700)
        self.assertEqual(len(self.state["sequencia"]), 2)
        self.run_for(200)
        self.assertEqual(len(self.state["sequencia"]), 3)
        self.assertEqual(self.state["sequencia"][:2], [3, 0])
        self.assertEqual(self.state["fase"], "mostrando")

    def test_a_mistake_ends_the_game_shows_the_longest_sequence_and_keeps_the_record(self):
        self.watch([1, 2, 0])
        self.state["pontos"] = 2
        self.game["tocar"](1)
        self.game["tocar"](3)
        self.assertEqual(self.state["fase"], "fim")
        self.assertIn("AZUL", self.state["resultado"])
        self.assertIn("Maior sequência: 2", self.state["resultado"])
        self.assertEqual(self.state["recorde"], 2)
        self.assertIn("erro.wav", self.audio.plays)
        self.game["tocar"](2)
        self.assertEqual(self.state["fase"], "fim")
        self.game["novo_jogo"]()
        self.assertEqual(self.state["fase"], "mostrando")
        self.assertEqual(len(self.state["sequencia"]), 1)
        self.assertEqual(self.state["recorde"], 2)

    def test_a_touch_lights_its_colour_only_for_a_moment(self):
        self.watch([1, 1])
        self.game["tocar"](1)
        self.assertEqual(self.state["aceso"], 1)
        self.run_for(250)
        self.assertEqual(self.state["aceso"], 1)
        self.run_for(100)
        self.assertIsNone(self.state["aceso"])

    def test_clicks_pick_the_colour_by_position_and_ignore_the_centre(self):
        self.watch([0, 1, 2, 3])
        self.game["clicar"](0, 20)
        self.assertEqual(self.state["passo"], 0)
        self.game["clicar"](10, 150)
        self.game["clicar"](160, -30)
        self.game["clicar"](-20, -170)
        self.game["clicar"](-150, 0)
        self.assertEqual(self.state["fase"], "intervalo")
        self.assertEqual(self.state["pontos"], 4)
        self.game["clicar"](300, 0)
        self.assertEqual(self.state["fase"], "intervalo")

    def test_pause_freezes_the_demonstration_and_the_input(self):
        screen = self.game["tela"]
        self.game["pausar"]()
        self.game["agendar"]()
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.state["espera"], 900)
        self.game["pausar"]()
        self.watch([0])
        self.game["pausar"]()
        self.game["tocar"](0)
        self.assertEqual(self.state["passo"], 0)

    def test_a_late_frame_advances_the_show_by_at_most_one_limited_step(self):
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["espera"], 800)
        self.assertIsNone(self.state["aceso"])

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
