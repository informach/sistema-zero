"""Regras reais do exemplo, sem abrir Tk, navegador ou dispositivo de áudio."""

import ast
import math
from pathlib import Path
import random
import runpy
import sys
import types
import unittest
from unittest.mock import patch


SOURCE = Path(__file__).with_name("main.py")


class Audio:
    def __init__(self):
        self.calls = []
        self.voices = {}
        self.sequence = 0

    def play(self, path, *, loop=False, volume=1.0):
        self.sequence += 1
        self.calls.append((path, loop, volume))
        self.voices[self.sequence] = path
        return self.sequence

    def stop(self, handle=None):
        if handle is None:
            self.voices.clear()
        else:
            self.voices.pop(handle, None)


class Screen:
    def __init__(self):
        self.queue = []
        self.closed = False
        self.bindings = {}
        self.updates = 0
        self.shapes = {}
        self.on_loop = None

    def setup(self, width, height):
        self.size = (width, height)

    def title(self, title):
        self.caption = title

    def bgcolor(self, color):
        self.background = color

    def tracer(self, count):
        self.tracing = count

    def register_shape(self, name, polygon):
        self.shapes[name] = polygon

    def onkeypress(self, callback, key):
        self.bindings["press", key] = callback

    def onkeyrelease(self, callback, key):
        self.bindings["release", key] = callback

    def onkey(self, callback, key):
        self.onkeyrelease(callback, key)

    def listen(self):
        self.listening = True

    def mainloop(self):
        self.on_loop()

    def ontimer(self, callback, delay):
        self.queue.append((callback, delay))

    def deliver(self):
        callback, _ = self.queue.pop(0)
        callback()

    def update(self):
        self.updates += 1

    def bye(self):
        self.closed = True


class Pen:
    def __init__(self):
        self.stamps = []
        self.writes = []
        self.position = (0, 0)
        self.form = "classic"
        self.ink = "black"
        self.size = 1
        self.angle = 0
        self.clears = 0

    def hideturtle(self):
        self.hidden = True

    def penup(self):
        self.down = False

    def pendown(self):
        self.down = True

    def speed(self, speed):
        self.speed_value = speed

    def goto(self, x, y):
        self.position = (x, y)

    def color(self, color):
        self.ink = color

    def shape(self, shape):
        self.form = shape

    def shapesize(self, size):
        self.size = size

    def setheading(self, angle):
        self.angle = angle

    def stamp(self):
        self.stamps.append((self.position, self.form, self.ink, self.size, self.angle))

    def clear(self):
        self.clears += 1
        self.stamps.clear()
        self.writes.clear()

    def write(self, text, *, align, font):
        self.writes.append((self.position, text, align, font))


class Rules(unittest.TestCase):
    def setUp(self):
        self.audio = Audio()
        with patch.dict(sys.modules, {"turtle": types.ModuleType("turtle"), "sz_audio": self.audio}):
            self.game = runpy.run_path(str(SOURCE), run_name="space_arena_model_test")
        # run_path devolve uma cópia: os callbacks usam o dicionário das funções.
        self.game = self.game["reiniciar_modelo"].__globals__
        random.seed(2026)
        self.call("reiniciar_modelo")
        self.state = self.game["jogo"]
        self.ship = self.game["nave"]

    def call(self, name, *args):
        return self.game[name](*args)

    def isolate(self):
        for enemy in self.game["inimigos"]:
            enemy["x"] = 650
            enemy["y"] = 450
        for pickup in self.game["bonus"]:
            pickup["x"] = -650
            pickup["y"] = -450

    def test_pools_are_complete_and_reset_without_accumulation(self):
        for _ in range(3):
            self.call("reiniciar_modelo")
            self.assertEqual([len(self.game[name]) for name in
                              ("inimigos", "tiros", "estrelas", "bonus", "explosao", "rastro")],
                             [25, 30, 20, 5, 30, 20])
            self.assertEqual(self.state["restantes"], 25)
            self.assertEqual(self.state["vidas"], 3)
            self.assertTrue(all(math.hypot(e["x"], e["y"]) >= 240 for e in self.game["inimigos"]))

    def test_thrust_turning_release_and_braking_have_real_effects(self):
        self.call("iniciar")
        self.isolate()
        self.call("pressionar_esquerda")
        self.call("pressionar_cima")
        self.call("pressionar_cima")
        self.call("mover_nave")
        self.assertGreater(self.ship["angulo"], 90)
        self.assertGreater(math.hypot(self.ship["dx"], self.ship["dy"]), 0)
        self.assertEqual(sum(path == "thruster.wav" for path, _, _ in self.audio.calls), 1)
        self.call("soltar_esquerda")
        self.call("soltar_cima")
        before = self.ship.copy()
        self.call("mover_nave")
        self.assertEqual(self.ship["angulo"], before["angulo"])
        self.assertNotEqual((self.ship["x"], self.ship["y"]), (before["x"], before["y"]))
        speed = math.hypot(self.ship["dx"], self.ship["dy"])
        self.call("pressionar_baixo")
        self.call("mover_nave")
        self.assertLess(math.hypot(self.ship["dx"], self.ship["dy"]), speed)
        self.assertNotIn("thruster.wav", self.audio.voices.values())

    def test_shooting_reuses_pool_cooldown_and_awards_each_enemy_once(self):
        self.call("iniciar")
        self.isolate()
        self.call("atirar")
        self.assertEqual(sum(t["ativo"] for t in self.game["tiros"]), 3)
        self.call("atirar")
        self.assertEqual(sum(t["ativo"] for t in self.game["tiros"]), 3)
        target = self.game["inimigos"][0]
        target.update(x=100, y=100, energia=1)
        shot = self.game["tiros"][0]
        shot.update(x=100, y=100, dx=0, dy=0, dano=1)
        self.call("mover_tiros")
        self.assertFalse(target["ativo"])
        self.assertFalse(shot["ativo"])
        self.assertEqual(self.state["pontos"], 100)
        self.assertEqual(self.state["restantes"], 24)
        self.call("mover_tiros")
        self.assertEqual(self.state["pontos"], 100)
        self.assertEqual(sum(p["tempo"] > 0 for p in self.game["explosao"]), 30)

    def test_boundaries_damage_lives_and_defeat(self):
        self.call("iniciar")
        self.ship.update(x=759, y=519, dx=8, dy=8)
        self.call("mover_nave")
        self.assertLessEqual(self.ship["x"], self.game["LIMITE_X"])
        self.assertLessEqual(self.ship["y"], self.game["LIMITE_Y"])
        self.assertLess(self.ship["dx"], 0)
        self.assertLess(self.ship["dy"], 0)
        self.state["imunidade"] = 0
        self.call("receber_dano", 25)
        self.call("receber_dano", 25)
        self.assertEqual(self.state["energia"], 75)
        for life in (2, 1, 0):
            self.state["imunidade"] = 0
            self.call("receber_dano", 100)
            self.assertEqual(self.state["vidas"], life)
        self.assertEqual(self.state["fase"], "derrota")
        self.assertEqual(self.audio.voices, {})

    def test_pickups_are_one_shot_and_upgrade_weapon_and_health(self):
        self.call("iniciar")
        self.isolate()
        item = self.game["bonus"][0]
        item.update(x=0, y=0)
        self.state["energia"] = 50
        self.call("recolher_bonus")
        self.assertFalse(item["ativo"])
        self.assertEqual(self.state["energia"], 75)
        self.assertEqual(self.state["melhoria"], 1)
        self.assertEqual(self.state["pontos"], 50)
        self.call("recolher_bonus")
        self.assertEqual(self.state["pontos"], 50)

    def test_three_enemy_behaviors_and_particles_are_not_removed_for_performance(self):
        self.call("iniciar")
        self.isolate()
        hunter, sentinel, mine = self.game["inimigos"][:3]
        hunter.update(x=100, y=100)
        sentinel.update(x=-200, y=-100)
        mine.update(x=100, y=-100)
        self.call("mover_inimigos")
        self.assertLess(hunter["dx"], 0)
        self.assertLess(hunter["dy"], 0)
        self.assertGreater(math.hypot(sentinel["dx"], sentinel["dy"]), 0)
        self.assertLess(mine["dx"], 0)
        self.assertGreater(mine["dy"], 0)
        self.call("emitir_explosao", 20, 30)
        self.assertEqual(sum(p["tempo"] > 0 for p in self.game["explosao"]), 30)
        self.call("pressionar_cima")
        for _ in range(10):
            self.call("mover_nave")
        self.assertEqual(sum(p["tempo"] > 0 for p in self.game["rastro"]), 20)
        self.call("soltar_cima")
        for _ in range(40):
            self.call("mover_particulas")
        self.assertTrue(all(p["tempo"] == 0 for p in self.game["explosao"] + self.game["rastro"]))
        self.assertEqual(len(self.game["explosao"]), 30)
        self.assertEqual(len(self.game["rastro"]), 20)

    def test_simultaneous_explosions_share_audio_and_effect_voices_are_reused(self):
        self.call("iniciar")
        for index in range(25):
            self.call("emitir_explosao", index, 0)
        self.assertEqual(sum(path == "explosion.wav" for path, _, _ in self.audio.calls), 1)
        for _ in range(30):
            self.state["quadro"] += 6
            self.call("emitir_explosao", 0, 0)
        self.assertEqual(len(self.audio.voices), 2)  # Uma música e uma voz de explosão.
        self.call("reiniciar")
        self.assertEqual(list(self.audio.voices.values()), ["bgm.wav"])

    def test_pause_freezes_simulation_releases_keys_and_resumes_one_music_voice(self):
        self.call("iniciar")
        self.call("pressionar_cima")
        self.call("pausar")
        before = self.ship.copy()
        self.call("avancar")
        self.assertEqual(self.ship, before)
        self.assertFalse(any(self.game["teclas"].values()))
        self.assertEqual(self.audio.voices, {})
        self.call("pausar")
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(list(self.audio.voices.values()), ["bgm.wav"])

    def test_victory_restart_and_camera(self):
        self.call("iniciar")
        self.isolate()
        for enemy in self.game["inimigos"]:
            enemy["ativo"] = False
        self.state["restantes"] = 0
        self.call("avancar")
        self.assertEqual(self.state["fase"], "vitoria")
        self.call("iniciar")
        self.assertEqual(self.state["fase"], "jogando")
        self.assertEqual(self.state["restantes"], 25)
        self.ship.update(x=320, y=160)
        self.call("mover_camera")
        self.assertGreater(self.state["camera_x"], 0)
        self.call("alternar_camera")
        self.call("mover_camera")
        self.assertEqual(self.call("projetar", 0, 0), (-110, 0))
        self.assertEqual(self.state["escala"], 0.5)

    def test_timer_stays_single_across_pause_restart_and_stop(self):
        screen = Screen()
        self.game["interface"]["tela"] = screen
        self.game["desenhar"] = lambda: None
        self.call("agendar", 17)
        self.call("agendar", 17)
        self.assertEqual(len(screen.queue), 1)
        for _ in range(20):
            self.call("reiniciar")
            self.call("pausar")
            screen.deliver()
            self.assertEqual(len(screen.queue), 1)
        self.call("fechar")
        screen.deliver()
        self.assertEqual(screen.queue, [])
        self.assertTrue(screen.closed)
        self.assertEqual(self.audio.voices, {})

    def test_actual_entrypoint_binds_named_controls_draws_pools_and_closes(self):
        screen = Screen()
        pens = []

        def make_pen():
            pen = Pen()
            pens.append(pen)
            return pen

        def inspect_loop():
            self.assertEqual(screen.size, (1020, 620))
            self.assertEqual(len(pens), 3)
            self.assertEqual(len(screen.queue), 1)
            self.assertIn("PATRULHA DAS ESTRELAS", pens[2].writes[0][1])
            screen.bindings["release", "s"]()
            screen.bindings["press", "Up"]()
            screen.bindings["press", "space"]()
            screen.deliver()
            self.assertTrue(any(stamp[1] == "nave" for stamp in pens[0].stamps))
            self.assertEqual(len(self.game["inimigos"]), 25)
            self.assertEqual(len(self.game["tiros"]), 30)
            self.assertEqual(len(screen.queue), 1)
            hud_clears = pens[1].clears
            self.call("desenhar")
            self.assertEqual(pens[1].clears, hud_clears)
            screen.bindings["release", "Up"]()
            screen.bindings["release", "space"]()
            screen.bindings["release", "p"]()
            frame = self.state["quadro"]
            screen.deliver()
            self.assertEqual(self.state["quadro"], frame)
            screen.bindings["release", "Escape"]()

        screen.on_loop = inspect_loop
        self.game["turtle"] = types.SimpleNamespace(Screen=lambda: screen, Turtle=make_pen)
        self.call("executar")
        self.assertTrue(screen.closed)
        self.assertFalse(self.state["aberto"])
        self.assertEqual(self.audio.voices, {})
        screen.deliver()
        self.assertEqual(screen.queue, [])

    def test_pause_delivered_during_screen_update_keeps_the_redraw_request(self):
        screen = Screen()
        self.game["interface"]["tela"] = screen
        self.game["desenhar"] = self.game["pausar"]
        self.call("iniciar")
        self.call("quadro")
        self.assertEqual(self.state["fase"], "pausa")
        self.assertTrue(self.state["sujo"])
        self.assertEqual(len(screen.queue), 1)

    def test_source_uses_visual_subset_and_stays_within_parser_budget(self):
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        forbidden = (ast.ClassDef, ast.Lambda, ast.ListComp, ast.SetComp, ast.DictComp,
                     ast.GeneratorExp, ast.Global, ast.Nonlocal, ast.AsyncFunctionDef)
        self.assertFalse(any(isinstance(node, forbidden) for node in ast.walk(tree)))
        self.assertLess(len(list(ast.walk(tree))), 20000)
        self.assertTrue(all(len(node.keys) <= 32 for node in ast.walk(tree) if isinstance(node, ast.Dict)))
        work = [(tree, 0)]
        while work:
            node, depth = work.pop()
            self.assertLess(depth, 80)
            work.extend((child, depth + 1) for child in ast.iter_child_nodes(node))
        self.assertFalse(any(isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                             and node.func.id in ("exec", "eval", "compile") for node in ast.walk(tree)))


if __name__ == "__main__":
    unittest.main()
