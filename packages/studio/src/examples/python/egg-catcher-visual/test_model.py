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
        # Nenhum ovo sorteado sozinho, a não ser que o teste peça.
        self.state["espera"] = 10 ** 9

    def frame(self, count=1):
        for _ in range(count):
            self.game["atualizar"](self.game["QUADRO"])

    def egg(self, x, y, golden=False, velocidade=2):
        classe = self.game["Ovo"]
        if golden:
            classe = self.game["OvoDourado"]
        ovo = classe(x, velocidade)
        ovo.y = y
        self.state["ovos"].append(ovo)
        return ovo

    def test_start_has_three_lives_and_a_centred_basket(self):
        self.assertEqual(self.state["vidas"], 3)
        self.assertEqual(self.state["cesta_x"], 0)
        self.assertEqual(self.state["ovos"], [])
        self.assertEqual(len(self.game["pincel"].stamps), 2)

    def test_held_arrows_move_the_basket_and_the_screen_holds_it(self):
        self.game["segurar"]("direita", True)
        self.frame(3)
        self.assertEqual(self.state["cesta_x"], 3 * self.game["VELOCIDADE_CESTA"])
        self.game["segurar"]("direita", False)
        self.frame()
        self.assertEqual(self.state["cesta_x"], 3 * self.game["VELOCIDADE_CESTA"])
        self.game["segurar"]("esquerda", True)
        self.frame(300)
        self.assertEqual(self.state["cesta_x"], -self.game["LIMITE_X"])

    def test_eggs_drop_at_intervals_and_fall_straight(self):
        self.game["CHANCE_DOURADO"] = 10 ** 9
        self.state["espera"] = 32
        self.frame()
        self.assertEqual(self.state["ovos"], [])
        self.frame()
        self.assertEqual(len(self.state["ovos"]), 1)
        self.assertEqual(self.state["espera"], self.state["intervalo"])
        ovo = self.state["ovos"][0]
        travessia = self.game["Y_TOPO"] - self.game["Y_CHAO"]
        self.assertAlmostEqual(ovo.velocidade * self.game["QUEDA_INICIAL"] / self.game["QUADRO"], travessia)
        x = ovo.x
        self.frame(10)
        self.assertEqual(ovo.x, x)
        # O ovo já cai no quadro em que nasce.
        self.assertAlmostEqual(ovo.y, self.game["Y_TOPO"] - 11 * ovo.velocidade)

    def test_golden_egg_inherits_from_egg_and_is_worth_more_and_faster(self):
        Ovo = self.game["Ovo"]
        dourado = self.game["OvoDourado"](0, 2)
        comum = Ovo(0, 2)
        self.assertIsInstance(dourado, Ovo)
        self.assertGreater(dourado.velocidade, comum.velocidade)
        self.assertGreater(dourado.pontos, comum.pontos)
        self.assertNotEqual(dourado.cor, comum.cor)
        self.assertEqual((comum.som(), dourado.som()), ("pegar.wav", "dourado.wav"))
        self.game["CHANCE_DOURADO"] = 1
        self.game["soltar_ovo"]()
        self.assertIs(type(self.state["ovos"][-1]), self.game["OvoDourado"])

    def test_golden_eggs_are_rare(self):
        douradas = 0
        for vez in range(600):
            self.game["soltar_ovo"]()
        for ovo in self.state["ovos"]:
            if type(ovo) is self.game["OvoDourado"]:
                douradas += 1
        self.assertTrue(40 < douradas < 170)

    def test_catching_scores_and_speeds_everything_up_by_the_factor(self):
        y = self.game["Y_CESTA"] + 10
        self.egg(20, y)
        self.frame()
        self.assertEqual(self.state["pontos"], 10)
        self.assertEqual(self.state["ovos"], [])
        self.assertEqual(self.audio.plays, ["pegar.wav"])
        self.assertAlmostEqual(self.state["queda"], self.game["QUEDA_INICIAL"] * 0.95)
        self.assertAlmostEqual(self.state["intervalo"], self.game["ESPERA_INICIAL"] * 0.95)
        self.egg(-30, y, golden=True)
        self.frame()
        self.assertEqual(self.state["pontos"], 60)
        self.assertEqual(self.audio.plays[-1], "dourado.wav")
        self.assertEqual(self.state["pegos"], 2)

    def test_an_egg_beside_the_basket_or_still_high_is_not_caught(self):
        meia = self.game["LARGURA_CESTA"] / 2
        self.egg(meia + 1, self.game["Y_CESTA"] + 2, velocidade=0)
        self.egg(0, self.game["Y_CESTA"] + 40, velocidade=0)
        self.frame()
        self.assertEqual(len(self.state["ovos"]), 2)
        self.assertEqual(self.state["pontos"], 0)

    def test_speed_up_stops_at_the_floors(self):
        for vez in range(200):
            self.game["pegar"](self.egg(0, 0))
        self.assertEqual(self.state["queda"], self.game["QUEDA_MINIMA"])
        self.assertEqual(self.state["intervalo"], self.game["ESPERA_MINIMA"])

    def test_an_egg_on_the_ground_breaks_and_three_end_the_game(self):
        chao = self.game["Y_CHAO"] + 13
        self.egg(300, chao)
        self.frame()
        self.assertEqual(self.state["vidas"], 2)
        self.assertEqual(self.audio.plays, ["quebrar.wav"])
        self.assertEqual(len(self.game["manchas"].stamps), 1)
        self.state["pontos"] = 70
        self.egg(300, chao)
        self.egg(-300, chao)
        self.egg(200, 100)
        self.frame()
        self.assertEqual(self.state["vidas"], 0)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["ovos"], [])
        self.assertEqual(self.state["recorde"], 70)
        self.assertEqual(self.audio.plays.count("fim.wav"), 1)
        self.game["reiniciar"]()
        self.assertEqual(self.state["vidas"], 3)
        self.assertEqual(self.state["queda"], self.game["QUEDA_INICIAL"])
        self.assertEqual(self.state["recorde"], 70)
        self.assertEqual(len(self.game["manchas"].stamps), 0)

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        ovo = self.egg(0, 100)
        self.game["pausar"]()
        self.game["segurar"]("direita", True)
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(ovo.y, 100)
        self.assertEqual(self.state["cesta_x"], 0)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_advances_at_most_three_frames(self):
        ovo = self.egg(0, 100, velocidade=2)
        self.game["atualizar"](10_000)
        self.assertEqual(ovo.y, 100 - 3 * 2)
        self.assertEqual(self.state["espera"], 10 ** 9 - 3 * self.game["QUADRO"])


if __name__ == "__main__":
    unittest.main()
