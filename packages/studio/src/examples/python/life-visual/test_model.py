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

    def place(self, cells):
        self.game["esvaziar"]()
        self.game["aplicar"](set(cells))

    def stamps(self):
        return self.game["pincel"].stamps

    def generation(self):
        return set(self.state["vivas"])

    def test_start_sorts_a_soup_with_one_stamp_per_live_cell(self):
        self.assertTrue(self.state["rodando"])
        self.assertEqual(self.state["geracao"], 0)
        self.assertGreater(len(self.state["vivas"]), 200)
        self.assertEqual(len(self.stamps()), len(self.state["vivas"]))
        self.assertEqual(set(self.state["carimbos"]), self.state["vivas"])
        self.assertEqual(self.audio.plays, ["sortear.wav"])

    def test_blinker_oscillates_birth_with_three_survival_with_two_or_three(self):
        self.place([(10, 10), (11, 10), (12, 10)])
        self.game["dar_passo"]()
        self.assertEqual(self.generation(), {(11, 9), (11, 10), (11, 11)})
        self.game["dar_passo"]()
        self.assertEqual(self.generation(), {(10, 10), (11, 10), (12, 10)})
        self.assertEqual(self.state["geracao"], 2)
        # Uma célula sozinha morre; um bloco 2x2 fica parado para sempre.
        self.place([(5, 5), (20, 20), (21, 20), (20, 21), (21, 21)])
        self.game["dar_passo"]()
        self.assertEqual(self.generation(), {(20, 20), (21, 20), (20, 21), (21, 21)})

    def test_only_changed_cells_are_restamped(self):
        self.place([(10, 10), (11, 10), (12, 10)])
        center = self.state["carimbos"][(11, 10)]
        self.game["dar_passo"]()
        # O centro sobrevive com o MESMO carimbo; as pontas trocam.
        self.assertEqual(self.state["carimbos"][(11, 10)], center)
        self.assertEqual(len(self.stamps()), 3)
        self.assertEqual(set(self.state["carimbos"].values()), self.stamps())

    def test_edges_wrap_around_like_a_tyre(self):
        # Pisca-pisca deitado no canto: as vizinhas do outro lado contam.
        self.place([(39, 0), (0, 0), (1, 0)])
        self.game["dar_passo"]()
        self.assertEqual(self.generation(), {(0, 29), (0, 0), (0, 1)})
        self.game["BORDAS_DAO_VOLTA"] = False
        self.place([(39, 0), (0, 0), (1, 0)])
        self.game["dar_passo"]()
        self.assertEqual(self.generation(), set())

    def test_cursor_moves_clamps_and_enter_or_click_toggles(self):
        self.game["esvaziar"]()
        self.game["mover_cursor"](1, 0)
        self.assertEqual(self.state["cursor"], (21, 15))
        for _ in range(60):
            self.game["mover_cursor"](1, 1)
        self.assertEqual(self.state["cursor"], (39, 29))
        self.game["marcar"]()
        self.assertIn((39, 29), self.state["vivas"])
        self.game["marcar"]()
        self.assertNotIn((39, 29), self.state["vivas"])
        x, y = self.game["posicao"]((3, 4))
        self.game["clicar"](x + 4, y - 4)
        self.assertEqual(self.state["cursor"], (3, 4))
        self.assertIn((3, 4), self.state["vivas"])
        self.game["clicar"](1000, 0)
        self.assertEqual(self.state["cursor"], (3, 4))
        self.assertEqual(self.audio.plays.count("marcar.wav"), 3)

    def test_space_pauses_and_n_steps_only_while_paused(self):
        self.place([(10, 10), (11, 10), (12, 10)])
        self.game["rodar_ou_pausar"]()
        self.assertFalse(self.state["rodando"])
        self.game["atualizar"](1000)
        self.assertEqual(self.state["geracao"], 0)
        self.game["um_passo"]()
        self.assertEqual(self.state["geracao"], 1)
        self.game["rodar_ou_pausar"]()
        self.game["um_passo"]()
        self.assertEqual(self.state["geracao"], 1)
        self.game["atualizar"](self.game["INTERVALO_GERACAO"])
        self.assertEqual(self.state["geracao"], 2)

    def test_clear_empties_everything_and_pauses(self):
        self.game["limpar"]()
        self.assertEqual(self.state["vivas"], set())
        self.assertEqual(self.stamps(), set())
        self.assertEqual(self.state["geracao"], 0)
        self.assertFalse(self.state["rodando"])
        self.game["dar_passo"]()
        self.assertEqual(self.state["vivas"], set())

    def test_restart_and_close_never_add_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.clock[0] = 1
        screen.timers.pop()()
        self.assertEqual(len(screen.timers), 1)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.assertEqual(self.state["geracao"], 0)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_advances_at_most_two_generations(self):
        self.place([(10, 10), (11, 10), (12, 10)])
        self.game["atualizar"](10_000)
        self.assertEqual(self.state["geracao"], 2)

    def test_panel_only_rewrites_when_the_text_changes(self):
        panel = self.game["painel"]
        panel.calls.clear()
        self.game["desenhar_painel"]()
        self.assertEqual(panel.calls, [])
        self.game["dar_passo"]()
        self.game["desenhar_painel"]()
        self.assertEqual(panel.calls.count(("clear", ())), 1)


if __name__ == "__main__":
    unittest.main()
