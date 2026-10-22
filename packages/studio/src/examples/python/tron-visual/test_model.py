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
        self.game = load({"time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                          "math": __import__("math"),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["reiniciar"]()
        self.red = self.state["motos"]["vermelha"]
        self.blue = self.state["motos"]["azul"]

    def go(self):
        """Termina a contagem da largada."""
        self.game["atualizar"](self.game["CONTAGEM"])
        self.assertEqual(self.state["fase"], "jogando")

    def step(self, count=1):
        for _ in range(count):
            self.game["atualizar"](self.game["PASSO"])

    def stamps(self):
        return self.game["pincel"].stamps

    def test_start_has_two_heads_and_waits_for_the_countdown(self):
        self.assertEqual((self.red.casa(), self.red.direcao), ((5, 20), (1, 0)))
        self.assertEqual((self.blue.casa(), self.blue.direcao), ((38, 9), (-1, 0)))
        self.assertEqual(self.state["ocupadas"], {(5, 20), (38, 9)})
        self.assertEqual(len(self.stamps()), 2)
        self.assertEqual(self.audio.plays, ["largada.wav"])
        for _ in range(9):
            self.game["atualizar"](self.game["CONTAGEM"] / 10)
        self.assertEqual(self.state["fase"], "contagem")
        self.assertEqual(self.red.casa(), (5, 20))
        self.game["atualizar"](self.game["CONTAGEM"] / 10)
        self.step()
        self.assertEqual(self.red.casa(), (6, 20))

    def test_each_step_moves_one_cell_and_leaves_a_stamped_trail(self):
        self.go()
        self.step(4)
        self.assertEqual(self.red.casa(), (9, 20))
        self.assertEqual(self.blue.casa(), (34, 9))
        self.assertEqual(len(self.state["ocupadas"]), 10)
        self.assertEqual(len(self.stamps()), 10)
        self.assertIn((7, 20), self.state["ocupadas"])

    def test_turns_are_relative_to_the_bike_and_wait_for_the_next_step(self):
        # Na contagem a curva fica guardada e vale no primeiro passo.
        self.game["virar"]("vermelha", 1)
        self.assertIn("curva.wav", self.audio.plays)
        self.go()
        self.step()
        self.assertEqual(self.red.direcao, (0, 1))
        self.assertEqual(self.red.casa(), (5, 21))
        self.game["virar"]("vermelha", -1)
        self.assertEqual(self.red.casa(), (5, 21))
        self.step()
        self.assertEqual(self.red.casa(), (6, 21))
        # Para a azul, que vai para a esquerda, "virar à esquerda" é descer.
        self.game["virar"]("azul", 1)
        self.step()
        self.assertEqual(self.blue.direcao, (0, -1))
        self.game["virar"]("azul", -1)
        self.step()
        self.assertEqual(self.blue.direcao, (-1, 0))

    def test_holding_a_key_turns_once_and_a_new_press_turns_again(self):
        self.game["ligar_tecla"]("a", "vermelha", 1)
        calls = self.game["tela"].calls
        press = [args[0] for call, args in calls if call == "onkeypress" and args[1] == "a"][0]
        release = [args[0] for call, args in calls if call == "onkeyrelease" and args[1] == "a"][0]
        self.go()
        press()
        self.step()
        # O teclado repete o aperto enquanto a tecla está segurada; a moto não gira em círculos.
        press()
        press()
        self.step()
        self.assertEqual(self.red.direcao, (0, 1))
        self.assertEqual(self.red.casa(), (5, 22))
        release()
        press()
        self.step()
        self.assertEqual(self.red.direcao, (-1, 0))

    def test_the_border_loses_the_round_and_scores_for_the_other(self):
        self.go()
        self.game["virar"]("vermelha", 1)
        self.step(9)
        self.assertEqual(self.state["fase"], "jogando")
        self.step()
        self.assertEqual(self.state["fase"], "rodada")
        self.assertEqual(self.state["vitorias"], {"vermelha": 0, "azul": 1})
        self.assertIn("AZUL", self.state["resultado"])
        self.assertEqual(self.audio.plays.count("batida.wav"), 1)
        before = self.red.casa()
        self.step(3)
        self.assertEqual(self.red.casa(), before)

    def test_own_trail_and_rival_trail_both_crash(self):
        self.go()
        self.step(2)
        # Voltar para dentro do próprio rastro é batida.
        self.red.direcao = (-1, 0)
        self.step()
        self.assertEqual(self.state["vitorias"]["azul"], 1)
        self.game["preparar_rodada"]()
        self.go()
        blue = self.state["motos"]["azul"]
        blue.coluna, blue.linha, blue.direcao = 8, 22, (0, -1)
        self.state["ocupadas"].add(blue.casa())
        self.step(2)
        # A azul passou por (8, 20); a vermelha chega lá um passo depois e bate.
        self.step()
        self.assertIn((8, 20), self.state["ocupadas"])
        self.assertEqual(self.state["motos"]["vermelha"].casa(), (7, 20))
        self.assertEqual(self.state["fase"], "rodada")
        self.assertEqual(self.state["vitorias"], {"vermelha": 0, "azul": 2})

    def test_heads_in_the_same_cell_are_a_draw(self):
        self.go()
        self.red.coluna, self.red.linha = 10, 9
        self.blue.coluna, self.blue.linha = 12, 9
        self.step()
        self.assertEqual(self.state["fase"], "rodada")
        self.assertIn("EMPATE", self.state["resultado"])
        self.assertEqual(self.state["vitorias"], {"vermelha": 0, "azul": 0})

    def test_a_new_round_resets_the_trail_and_three_wins_end_the_match(self):
        self.go()
        self.game["virar"]("vermelha", 1)
        self.step(10)
        self.game["atualizar"](self.game["PAUSA_RODADA"])
        self.assertEqual(self.state["fase"], "contagem")
        self.assertEqual(self.state["rodada"], 2)
        self.assertEqual(len(self.stamps()), 2)
        self.state["vitorias"]["vermelha"] = 2
        self.go()
        self.game["virar"]("azul", -1)
        self.step(21)
        self.assertEqual(self.state["fase"], "fim")
        self.assertIn("VERMELHA VENCEU A PARTIDA", self.state["resultado"])
        self.assertIn("vitoria.wav", self.audio.plays)
        self.game["atualizar"](100_000)
        self.assertEqual(self.state["fase"], "fim")
        self.game["reiniciar"]()
        self.assertEqual(self.state["vitorias"], {"vermelha": 0, "azul": 0})

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.go()
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["pausar"]()
        head = self.red.casa()
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(self.red.casa(), head)
        self.game["virar"]("vermelha", 1)
        self.assertEqual(self.red.curva, 0)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_moves_at_most_two_cells(self):
        self.go()
        self.game["atualizar"](10_000)
        self.assertEqual(self.red.casa(), (7, 20))


if __name__ == "__main__":
    unittest.main()
