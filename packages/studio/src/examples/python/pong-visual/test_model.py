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
                          "math": __import__("math"),
                          "sz_audio": self.audio})
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["reiniciar"]()
        # Liga as teclas como iniciar() faz, sem abrir janela nem mainloop.
        for tecla, lado, sentido in [("w", "esquerda", 1), ("s", "esquerda", -1),
                                     ("Up", "direita", 1), ("Down", "direita", -1)]:
            self.game["ligar_tecla"](tecla, lado, sentido)

    def key(self, kind, name):
        for call, args in self.game["tela"].calls:
            if call == kind and args[1] == name:
                args[0]()
                return
        self.fail("tecla não ligada: " + name)

    def run_ms(self, total, step=16):
        while total > 0:
            self.game["atualizar"](min(step, total))
            total -= step

    def serve_now(self):
        self.run_ms(self.game["ESPERA_SAQUE"] + 16)

    def test_start_has_centered_paddles_and_a_waiting_ball(self):
        left, right, ball = self.state["esquerda"], self.state["direita"], self.state["bola"]
        self.assertEqual((left.x, right.x), (-400, 400))
        self.assertEqual(left.y, right.y)
        self.assertEqual((ball.x, ball.vx, ball.vy), (0, 0, 0))
        self.assertEqual(self.state["pontos"], {"esquerda": 0, "direita": 0})
        self.run_ms(400)
        self.assertEqual(ball.x, 0)
        self.serve_now()
        self.assertNotEqual(ball.vx, 0)
        self.assertAlmostEqual(ball.rapidez(), self.game["VELOCIDADE_INICIAL"], places=6)

    def test_w_and_s_move_only_while_held_and_stay_inside_the_field(self):
        left = self.state["esquerda"]
        start = left.y
        self.key("onkeypress", "w")
        self.run_ms(160)
        self.assertGreater(left.y, start + 50)
        self.key("onkeyrelease", "w")
        held = left.y
        self.run_ms(160)
        self.assertEqual(left.y, held)
        self.key("onkeypress", "w")
        self.run_ms(3000)
        top = self.game["CAMPO_TOPO"] - self.game["RAQUETE_ALTURA"] / 2
        self.assertEqual(left.y, top)
        self.key("onkeyrelease", "w")
        self.key("onkeypress", "s")
        self.run_ms(4000)
        self.assertEqual(left.y, self.game["CAMPO_BASE"] + self.game["RAQUETE_ALTURA"] / 2)
        self.assertEqual(self.state["direita"].y, start)

    def test_hitting_returns_the_ball_faster_and_the_angle_follows_the_impact(self):
        Bola = self.game["Bola"]
        left = self.state["esquerda"]
        center = Bola()
        center.x, center.y, center.vx, center.vy = -390, left.y, -400, 0
        self.state["bola"] = center
        self.assertTrue(self.game["rebater"](left, -1))
        self.assertGreater(center.vx, 0)
        self.assertAlmostEqual(center.vy, 0)
        self.assertAlmostEqual(center.rapidez(), 400 * self.game["ACELERACAO"])
        self.assertEqual(center.x, -400 + 7 + 8)
        edge = Bola()
        edge.x, edge.y, edge.vx, edge.vy = -390, left.y + 40, -400, 0
        self.state["bola"] = edge
        self.game["rebater"](left, -1)
        self.assertGreater(edge.vy, 150)
        self.assertIn("rebater.wav", self.audio.plays)

    def test_a_ball_leaving_the_paddle_is_not_hit_again_and_speed_has_a_cap(self):
        Bola = self.game["Bola"]
        left = self.state["esquerda"]
        leaving = Bola()
        leaving.x, leaving.y, leaving.vx, leaving.vy = -392, left.y, 500, 0
        self.state["bola"] = leaving
        self.assertFalse(self.game["rebater"](left, -1))
        self.assertEqual(leaving.vx, 500)
        fast = Bola()
        fast.x, fast.y, fast.vx, fast.vy = -390, left.y, -770, 0
        self.state["bola"] = fast
        self.game["rebater"](left, -1)
        self.assertAlmostEqual(fast.rapidez(), self.game["VELOCIDADE_MAXIMA"])

    def test_top_and_bottom_walls_bounce(self):
        ball = self.state["bola"]
        self.state["saque"] = 0
        ball.x, ball.y, ball.vx, ball.vy = 0, 228, 0, 300
        self.run_ms(32)
        self.assertLess(ball.vy, 0)
        self.assertLessEqual(ball.y, self.game["CAMPO_TOPO"] - self.game["RAIO_BOLA"])
        ball.y, ball.vy = -258, -300
        self.run_ms(32)
        self.assertGreater(ball.vy, 0)
        self.assertEqual(self.audio.plays.count("parede.wav"), 2)

    def test_a_missed_ball_scores_for_the_other_side_and_serves_to_the_loser(self):
        self.state["saque"] = 0
        ball = self.state["bola"]
        ball.x, ball.y, ball.vx, ball.vy = -440, 200, -600, 0
        self.state["esquerda"].y = -200
        self.run_ms(32)
        self.assertEqual(self.state["pontos"], {"esquerda": 0, "direita": 1})
        self.assertIn("ponto.wav", self.audio.plays)
        new_ball = self.state["bola"]
        self.assertEqual((new_ball.x, new_ball.vx), (0, 0))
        self.serve_now()
        self.assertLess(new_ball.vx, 0)

    def test_seven_points_win_and_the_game_stops(self):
        self.state["pontos"]["esquerda"] = 6
        self.state["saque"] = 0
        ball = self.state["bola"]
        ball.x, ball.y, ball.vx, ball.vy = 440, 200, 600, 0
        self.state["direita"].y = -200
        self.run_ms(32)
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["pontos"]["esquerda"], 7)
        self.assertIn("vitoria.wav", self.audio.plays)
        self.assertIn("ESQUERDA", self.state["resultado"])
        frozen = self.state["esquerda"].y
        self.key("onkeypress", "w")
        self.run_ms(300)
        self.assertEqual(self.state["esquerda"].y, frozen)
        self.game["reiniciar"]()
        self.assertEqual(self.state["pontos"], {"esquerda": 0, "direita": 0})
        self.assertEqual(self.state["fase"], "jogando")

    def test_the_computer_follows_the_ball_with_limited_speed(self):
        right = self.state["direita"]
        self.game["alternar_computador"]()
        self.assertTrue(self.state["computador"])
        self.key("onkeypress", "Up")
        self.state["saque"] = 0
        ball = self.state["bola"]
        ball.x, ball.y, ball.vx, ball.vy = 0, -200, 100, 0
        start = right.y
        self.run_ms(16)
        limit = self.game["VELOCIDADE_COMPUTADOR"] * 0.016
        self.assertAlmostEqual(start - right.y, limit)
        self.run_ms(1000)
        self.assertAlmostEqual(right.y, -200)
        # Indo para a esquerda, ele volta ao centro em vez de seguir a bola.
        ball.vx = -100
        self.run_ms(1000)
        self.assertAlmostEqual(right.y, (self.game["CAMPO_TOPO"] + self.game["CAMPO_BASE"]) / 2)
        self.game["alternar_computador"]()
        self.assertFalse(self.state["computador"])
        self.game["reiniciar"]()
        self.assertFalse(self.state["computador"])

    def test_pause_freezes_and_restart_or_close_never_adds_timers(self):
        screen = self.game["tela"]
        self.game["agendar"]()
        self.game["agendar"]()
        self.assertEqual(len(screen.timers), 1)
        self.state["saque"] = 0
        ball = self.state["bola"]
        ball.vx = 300
        self.game["pausar"]()
        self.clock[0] = 5
        screen.timers.pop()()
        self.assertEqual(ball.x, 0)
        self.game["reiniciar"]()
        self.assertEqual(len(screen.timers), 1)
        self.game["fechar"]()
        screen.timers.pop()()
        self.assertTrue(screen.closed)
        self.assertEqual(screen.timers, [])
        self.assertGreaterEqual(self.audio.stops, 2)

    def test_a_late_frame_moves_the_ball_at_most_two_frames(self):
        self.state["saque"] = 0
        ball = self.state["bola"]
        ball.vx = 500
        self.game["atualizar"](10_000)
        self.assertAlmostEqual(ball.x, 500 * 2 * self.game["INTERVALO"] / 1000)


if __name__ == "__main__":
    unittest.main()
