"""Testes inertes de regras; gravadores de efeitos não simulam Turtle/Tk."""

import ast
import math
from pathlib import Path
import random
import types
import unittest


SOURCE = Path(__file__).with_name("main.py")


class AudioRecorder:
    def __init__(self):
        self.plays = []
        self.stops = 0
        self.events = []

    def play(self, path, **options):
        self.plays.append((path, options))
        self.events.append(("play", path))
        return len(self.plays)

    def stop(self):
        self.stops += 1
        self.events.append(("stop",))


class StampRecorder:
    def __init__(self):
        self.next_id = 0
        self.active = set()
        self.removed = []
        self.current_shape = "classic"
        self.visible = False

    def clear(self):
        self.active.clear()

    def clearstamp(self, identifier):
        self.active.remove(identifier)
        self.removed.append(identifier)

    def stamp(self):
        self.next_id += 1
        self.active.add(self.next_id)
        return self.next_id

    def goto(self, *position):
        pass

    def shape(self, name=None):
        if name is not None:
            self.current_shape = name
        return self.current_shape

    def showturtle(self):
        self.visible = True

    def hideturtle(self):
        self.visible = False

    def shapesize(self, size):
        pass

    def color(self, *colors):
        pass

    def setheading(self, angle):
        pass

    def write(self, text, **options):
        pass


class SchedulerRecorder:
    def __init__(self):
        self.pending = []
        self.closed = False
        self.updates = 0
        self.on_update = None

    def ontimer(self, callback, delay):
        self.pending.append((callback, delay))

    def deliver(self):
        callback, delay = self.pending.pop(0)
        callback()
        return delay

    def update(self):
        self.updates += 1
        callback, self.on_update = self.on_update, None
        if callback is not None:
            callback()

    def bye(self):
        self.closed = True


class Rules(unittest.TestCase):
    def setUp(self):
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        # Nenhum import de Turtle/áudio nem entrypoint é executado.
        tree.body = [node for node in tree.body
                     if not isinstance(node, (ast.Import, ast.If))]
        self.clock = [0.0]
        self.audio = AudioRecorder()
        self.pen = StampRecorder()
        self.screen = SchedulerRecorder()
        self.game = {"math": math, "random": random.Random(2026),
                     "time": types.SimpleNamespace(monotonic=lambda: self.clock[0]),
                     "sz_audio": self.audio}
        exec(compile(tree, str(SOURCE), "exec"), self.game)
        self.state = self.game["estado"]
        self.state["aberto"] = True
        self.game["objetos"].update(lapis=self.pen, painel=StampRecorder(), tela=self.screen,
                                     heroi=StampRecorder(), atores=[StampRecorder() for _ in range(7)])
        self.call("reiniciar")

    def call(self, name, *args):
        return self.game[name](*args)

    def actor(self, column, row, number=-1):
        return self.call("criar_ator", column, row, number)

    def test_map_is_connected_and_spawns_are_safe(self):
        maze = self.game["MAPA"]
        self.assertEqual(len(maze), 25)
        self.assertTrue(all(len(row) == 31 for row in maze))
        passages = {(column, row) for row in range(25) for column in range(31)
                    if maze[row][column] != "#"}
        visited = {self.game["INICIO"]}
        queue = list(visited)
        for column, row in queue:
            for dx, dy in self.game["DIRECOES"]:
                target = self.call("destino", column, row, dx, dy)
                if target != (-1, -1) and target not in visited:
                    visited.add(target)
                    queue.append(target)
        self.assertEqual(visited, passages)
        self.assertEqual(sum(row.count("o") for row in maze), 4)
        self.assertEqual(len(self.state["inimigos"]), 7)
        for enemy in self.state["inimigos"]:
            self.assertIn((enemy["coluna"], enemy["linha"]), passages)
            self.assertGreaterEqual(abs(enemy["coluna"] - 15) + abs(enemy["linha"] - 23), 16)
        self.assertNotIn(self.game["INICIO"], self.state["pontos"])
        self.assertEqual(len(self.state["pontos"]), len(passages) - 1)
        self.assertEqual(self.state["placar"], 0)

    def test_walls_block_all_faces_and_turn_waits_for_a_center(self):
        cases = [(1, 2, 1, 0), (7, 2, -1, 0), (2, 1, 0, 1), (2, 4, 0, -1)]
        for column, row, dx, dy in cases:
            player = self.actor(column, row)
            self.state["direcao"] = (dx, dy)
            before = (player["x"], player["y"])
            self.assertEqual(self.call("mover", player, 200), [])
            self.assertEqual((player["x"], player["y"]), before)
        player = self.actor(1, 1)
        self.state["direcao"] = (1, 0)
        self.call("mover", player, 10)
        self.state["direcao"] = (0, 1)
        self.call("mover", player, 18)
        self.assertEqual((player["coluna"], player["linha"]), (2, 1))
        self.call("mover", player, 28 * 5)
        self.assertEqual((player["coluna"], player["linha"]), (7, 1))
        self.call("mover", player, 28)
        self.assertEqual((player["coluna"], player["linha"]), (7, 2))

    def test_tunnel_wraps_both_directions_without_sweeping_the_map(self):
        for column, dx, other in [(0, -1, 30), (30, 1, 0)]:
            player = self.actor(column, 12)
            self.state["direcao"] = (dx, 0)
            visits = self.call("mover", player, 4)
            self.assertEqual(visits, [(other, 12)])
            self.assertEqual(player["antes_x"], self.call("posicao", other, 12)[0])
            self.assertFalse(self.call("colidir", player, self.actor(15, 12)))

    def test_radar_chases_and_every_enemy_move_stays_in_passages(self):
        self.state["jogador"] = self.actor(7, 1)
        enemy = self.actor(4, 1, 0)
        self.call("escolher_direcao", enemy)
        self.assertEqual((enemy["dx"], enemy["dy"]), (1, 0))
        for _ in range(600):
            for enemy in self.state["inimigos"]:
                self.call("mover", enemy, 6)
                column, row = enemy["coluna"], enemy["linha"]
                self.assertNotEqual(self.game["MAPA"][row][column], "#")
                if enemy["restante"] > 0:
                    self.assertNotEqual(self.call("destino", column, row, enemy["dx"], enemy["dy"]), (-1, -1))
                self.assertGreaterEqual(enemy["restante"], 0)
                self.assertLessEqual(enemy["restante"], 28)

    def test_collects_each_stamp_once_and_bonus_expires_after_three_seconds(self):
        common = (14, 23)
        special = (1, 23)
        identifier = self.state["pontos"][common][0]
        self.call("coletar", common)
        self.call("coletar", common)
        self.assertEqual(self.pen.removed.count(identifier), 1)
        self.assertEqual(self.state["placar"], 2)
        self.call("coletar", special)
        self.assertEqual(self.state["placar"], 52)
        self.assertEqual(self.state["bonus"], 3000)
        self.assertEqual([path for path, _ in self.audio.plays],
                         ["opening.wav", "collect.wav", "power.wav"])
        self.state["fase"] = "jogando"
        self.state["direcao"] = (1, 0)
        before = self.state["jogador"]["x"]
        self.call("atualizar", 16)
        self.assertEqual(self.state["jogador"]["x"] - before, 7)
        self.call("atualizar", 2983)
        self.assertEqual(self.state["bonus"], 1)
        self.call("atualizar", 1)
        self.assertEqual(self.state["bonus"], 0)
        before = self.state["jogador"]["x"]
        self.call("atualizar", 16)
        self.assertEqual(self.state["jogador"]["x"] - before, 4)

    def test_crossing_paths_collide_and_damage_respawns_once(self):
        player = self.actor(1, 1)
        enemy = self.actor(2, 1, 0)
        player.update(antes_x=-20, x=20, antes_y=0, y=0)
        enemy.update(antes_x=20, x=-20, antes_y=0, y=0)
        self.assertTrue(self.call("colidir", player, enemy))
        self.state["fase"] = "jogando"
        for lives in [2, 1, 0]:
            self.state["protecao"] = 0
            self.state["inimigos"][0] = self.actor(15, 23, 0)
            self.call("atualizar", 0)
            self.assertEqual(self.state["vidas"], lives)
            if lives > 0:
                self.assertEqual(self.state["protecao"], 1500)
                self.assertEqual((self.state["jogador"]["coluna"], self.state["jogador"]["linha"]), (15, 23))
                self.assertNotEqual((self.state["inimigos"][0]["coluna"], self.state["inimigos"][0]["linha"]), (15, 23))
        self.assertEqual(self.state["fase"], "fim")
        self.assertEqual(self.state["espera"], 3000)
        self.assertEqual(sum(path == "collision.wav" for path, _ in self.audio.plays), 3)

    def test_last_pellet_wins_and_real_elapsed_countdown_requests_close(self):
        house = (14, 23)
        self.state["pontos"] = {house: self.state["pontos"][house]}
        self.call("coletar", house)
        self.assertEqual(self.state["resultado"], "VOCÊ VENCEU!")
        self.call("desenhar_atores")
        objects = self.game["objetos"]
        self.assertTrue(all(not pen.visible for pen in objects["atores"] + [objects["heroi"]]))
        self.call("atualizar", 2999)
        self.assertFalse(self.screen.closed)
        self.call("atualizar", 1)
        self.assertTrue(self.screen.closed)
        self.assertFalse(self.state["aberto"])
        self.assertEqual(self.audio.stops, 2)

    def test_pause_restart_and_pending_callback_keep_one_chain(self):
        self.call("agendar")
        self.call("agendar")
        self.assertEqual(len(self.screen.pending), 1)
        self.call("direita")
        self.assertEqual(self.state["direcao"], (0, 0))
        self.clock[0] = 2.499
        self.assertEqual(self.screen.deliver(), 16)
        self.assertEqual(self.state["fase"], "abertura")
        # O próximo callback vem 16 ms depois; não exigimos igualdade binária
        # entre subtrações de floats exatamente na fronteira de 2,5 segundos.
        self.clock[0] = 2.515
        self.screen.deliver()
        self.assertEqual(self.state["fase"], "jogando")
        self.call("pausar")
        self.state["bonus"] = 3000
        self.clock[0] = 8.5
        self.screen.deliver()
        self.assertEqual(self.state["bonus"], 3000)
        self.call("pausar")
        self.call("direita")
        self.assertEqual(self.state["direcao"], (1, 0))
        self.call("reiniciar")
        count = len(self.pen.active)
        for _ in range(30):
            self.call("reiniciar")
            self.assertEqual(len(self.screen.pending), 1)
            self.assertEqual(len(self.pen.active), count)
        self.call("fechar")
        updates = self.screen.updates
        self.screen.deliver()
        self.assertEqual(self.screen.pending, [])
        self.assertEqual(self.screen.updates, updates)

    def test_source_is_small_explicit_and_compiles(self):
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        compile(tree, str(SOURCE), "exec")
        forbidden = (ast.ClassDef, ast.Lambda, ast.ListComp, ast.SetComp,
                     ast.DictComp, ast.GeneratorExp, ast.Global, ast.Nonlocal)
        self.assertFalse(any(isinstance(node, forbidden) for node in ast.walk(tree)))
        self.assertLess(len(list(ast.walk(tree))), 20000)
        stack = [(tree, 0)]
        depth = 0
        while stack:
            node, level = stack.pop()
            depth = max(depth, level)
            stack.extend((child, level + 1) for child in ast.iter_child_nodes(node))
        self.assertLess(depth, 80)

    def test_close_dispatched_inside_restart_update_leaves_audio_stopped(self):
        self.screen.on_update = self.game["fechar"]
        self.call("reiniciar")
        self.assertFalse(self.state["aberto"])
        self.assertTrue(self.screen.closed)
        self.assertEqual(self.audio.events[-1], ("stop",))
        stops = self.audio.stops
        self.call("fechar")
        self.assertEqual(self.audio.stops, stops)


if __name__ == "__main__":
    unittest.main(verbosity=2)
