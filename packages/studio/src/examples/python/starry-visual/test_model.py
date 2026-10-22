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




def trace(calls):
    """Refaz o caminho da caneta a partir das chamadas gravadas (goto, setheading, forward, right)."""
    x = y = heading = 0.0
    points = []
    for name, args in calls:
        if name == "goto":
            x, y = args
            points = [(x, y)]
        elif name == "setheading":
            heading = args[0]
        elif name == "right":
            heading -= args[0]
        elif name == "forward":
            x += args[0] * math.cos(math.radians(heading))
            y += args[0] * math.sin(math.radians(heading))
            points.append((x, y))
    return points


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

    def fill(self, count):
        for _ in range(count):
            self.game["atualizar"](self.game["RITMO_ESTRELA"])

    def test_start_is_an_empty_sky_with_the_scope_in_the_middle(self):
        self.assertEqual(self.state["estrelas"], [])
        self.assertEqual(self.state["luneta"], (0, 0))
        self.assertFalse(self.state["pausado"])
        self.assertEqual(self.audio.plays, ["abertura.wav"])

    def test_every_star_closes_around_its_center_with_odd_points(self):
        Estrela = self.game["Estrela"]
        for pontas in [5, 7, 9, 11]:
            star = Estrela(40, -20, pontas, 30, "#ffffff")
            self.assertAlmostEqual(star.angulo(), 180 - 180 / pontas)
            pen = self.game["pincel"]
            pen.calls.clear()
            self.game["desenhar_estrela"](star)
            points = trace(pen.calls)
            self.assertEqual(len(points), pontas + 1)
            # Fecha no ponto de partida, e toda ponta fica à mesma distância do centro.
            self.assertAlmostEqual(points[-1][0], points[0][0], places=6)
            self.assertAlmostEqual(points[-1][1], points[0][1], places=6)
            for px, py in points:
                self.assertAlmostEqual(math.hypot(px - 40, py + 20), star.raio(), places=6)
            self.assertIn(("begin_fill", ()), pen.calls)
            self.assertIn(("end_fill", ()), pen.calls)

    def test_the_sky_fills_by_itself_at_a_steady_rhythm(self):
        self.fill(5)
        self.assertEqual(len(self.state["estrelas"]), 5)
        self.assertEqual(self.state["mao"], [])
        for star in self.state["estrelas"]:
            self.assertIn(star.pontas, [5, 7, 9, 11])
            self.assertTrue(12 <= star.tamanho <= 42)
            self.assertTrue(self.game["dentro_do_ceu"](star.x, star.y))
            self.assertNotEqual(star.cor, self.game["COR_LUNETA"])
        self.game["atualizar"](self.game["RITMO_ESTRELA"] - 1)
        self.assertEqual(len(self.state["estrelas"]), 5)

    def test_the_scope_moves_clamps_and_enter_or_click_place_hand_stars(self):
        self.game["mover_luneta"](1, 0)
        self.assertEqual(self.state["luneta"], (24, 0))
        for _ in range(40):
            self.game["mover_luneta"](1, 1)
        self.assertEqual(self.state["luneta"], (370, 250))
        self.game["estrela_na_luneta"]()
        self.game["por_estrela"](-100, 50)
        self.game["por_estrela"](0, 400)
        self.assertEqual([(s.x, s.y) for s in self.state["mao"]], [(370, 250), (-100, 50)])
        self.assertTrue(self.state["mao"][0].feita_a_mao)
        self.assertEqual(self.audio.plays.count("brilho.wav"), 2)

    def test_constellation_links_only_hand_stars_in_order(self):
        lines = self.game["linhas"]
        self.fill(3)
        self.game["por_estrela"](0, 0)
        self.game["por_estrela"](100, 100)
        lines.calls.clear()
        self.game["alternar_constelacao"]()
        self.assertTrue(self.state["constelacao"])
        self.assertEqual([args for name, args in lines.calls if name == "goto"],
                         [(0, 0), (0, 0), (100, 100)])
        # Uma estrela nova à mão entra na constelação na hora.
        lines.calls.clear()
        self.game["por_estrela"](-50, 20)
        self.assertEqual([args for name, args in lines.calls if name == "goto"][-1], (-50, 20))
        self.game["alternar_constelacao"]()
        self.assertFalse(self.state["constelacao"])
        self.assertEqual(lines.calls[-1], ("clear", ()))

    def test_a_full_sky_stops_and_l_clears_it(self):
        self.game["MAX_ESTRELAS"] = 6
        self.fill(10)
        self.assertEqual(len(self.state["estrelas"]), 6)
        self.game["estrela_na_luneta"]()
        self.assertEqual(len(self.state["estrelas"]), 6)
        self.assertNotIn("brilho.wav", self.audio.plays)
        self.game["limpar"]()
        self.assertEqual(self.state["estrelas"], [])
        self.assertEqual(self.state["mao"], [])
        self.fill(1)
        self.assertEqual(len(self.state["estrelas"]), 1)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.state["estrelas"], [])
        self.game["reiniciar"]()
        self.assertFalse(self.state["pausado"])
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_adds_at_most_two_stars(self):
        self.game["atualizar"](10_000)
        self.assertEqual(len(self.state["estrelas"]), 2)


if __name__ == "__main__":
    unittest.main()
