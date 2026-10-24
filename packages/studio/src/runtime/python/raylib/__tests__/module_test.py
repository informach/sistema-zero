"""Raylib do Estúdio em CPython puro: semântica do pyray (cffi), laço, entrada e desenho.

    python -I -B module_test.py <pasta py do módulo>

Os valores de referência foram medidos no raylib 6.0.1.0 do computador (pip install raylib).
"""
import json
import os
import sys
import tempfile
import unittest
from array import array

sys.path.insert(0, sys.argv.pop(1))

import _szraylib  # noqa: E402
from _szraylib import _rt  # noqa: E402

FRAMES = []
CLOCK = [0.0]
EVENTS = []


def transport(header, payload):
    FRAMES.append((json.loads(header), bytes(payload)))
    CLOCK[0] += 1000 / 60
    events = EVENTS.pop(0) if EVENTS else []
    return json.dumps({'now': CLOCK[0], 'events': events}), None


ROOT = tempfile.mkdtemp()
os.chdir(ROOT)
_szraylib.configure(transport, None, ROOT, '2d')

import pyray as P  # noqa: E402
import raylib as R  # noqa: E402


def frame():
    P.begin_drawing()
    P.end_drawing()


class Structs(unittest.TestCase):
    def test_float32_and_zero_fill(self):
        self.assertEqual(P.Vector2(0.1, 0).x, 0.10000000149011612)
        self.assertEqual(P.Vector2(3).y, 0.0)
        self.assertEqual(P.Color(255, 0, 0).a, 0)

    def test_copy_on_assign_and_live_view(self):
        camera = P.Camera2D()
        pos = P.Vector2(1, 2)
        camera.target = pos
        pos.x = 99
        self.assertEqual(camera.target.x, 1.0)
        view = camera.target
        view.x = 5
        self.assertEqual(camera.target.x, 5.0)

    def test_cffi_errors(self):
        with self.assertRaises(TypeError):
            P.Vector2('a', 1)
        with self.assertRaises(ValueError):
            P.Vector2(1, 2, 3)
        with self.assertRaises(OverflowError):
            P.Color(300, 0, 0, 0)
        with self.assertRaises(TypeError):
            P.Texture().width = 2.5
        with self.assertRaises(AttributeError):
            P.Vector2().z = 1
        with self.assertRaises(TypeError):
            x, y = P.Vector2(1, 2)
        with self.assertRaises(TypeError):
            P.Vector2(x=1, y=2)

    def test_no_value_equality(self):
        self.assertNotEqual(P.Vector2(1, 2), P.Vector2(1, 2))
        self.assertTrue(bool(P.Rectangle()))


class Api(unittest.TestCase):
    def test_positional_only_and_int_params(self):
        with self.assertRaises(TypeError):
            P.check_collision_recs(rec1=(0, 0, 1, 1), rec2=(0, 0, 1, 1))
        P.init_window(320, 240, 'teste')
        with self.assertRaises(TypeError):
            P.draw_circle(1.5, 2, 3, P.RED)

    def test_names_of_both_modules(self):
        self.assertIs(R.Vector2Normalize, P.vector2_normalize)
        self.assertEqual(R.KEY_SPACE, 32)
        self.assertEqual(P.WHITE, (255, 255, 255, 255))
        self.assertIsInstance(P.KeyboardKey.KEY_A, int)
        self.assertEqual(R.rl.KEY_ESCAPE, 256)

    def test_3d_names_explain_the_extension(self):
        with self.assertRaises(NotImplementedError) as caught:
            P.draw_cube(P.Vector3(), 1, 1, 1, P.RED)
        self.assertIn('Raylib 3D', str(caught.exception))

    def test_collisions_borders(self):
        self.assertFalse(P.check_collision_recs((0, 0, 10, 10), (10, 0, 10, 10)))
        self.assertTrue(P.check_collision_recs((0, 0, 10, 10), (9, 0, 10, 10)))
        self.assertTrue(P.check_collision_point_rec((0, 0), (0, 0, 10, 10)))
        self.assertFalse(P.check_collision_point_rec((10, 0), (0, 0, 10, 10)))
        overlap = P.get_collision_rec((0, 0, 10, 10), (5, 5, 10, 10))
        self.assertEqual((overlap.x, overlap.y, overlap.width, overlap.height), (5, 5, 5, 5))

    def test_random_matches_the_desktop(self):
        P.set_random_seed(42)
        self.assertEqual([P.get_random_value(1, 6) for _ in range(10)], [1, 1, 3, 5, 1, 3, 1, 6, 4, 6])

    def test_text_measure_matches_the_desktop(self):
        P.init_window(320, 240, 'teste')
        self.assertEqual(P.measure_text('Olá, Raylib!', 20), 108)
        self.assertEqual(P.measure_text('Hello\nWorld!!', 7), 32)
        size = P.measure_text_ex(P.get_font_default(), 'Score: 123', 33, 3)
        self.assertEqual((round(size.x, 3), size.y), (165.6, 33.0))

    def test_ffi_shim(self):
        count = P.ffi.new('int *', 0)
        self.assertEqual(count[0], 0)
        flash = P.ffi.new('struct Vector2 *', [1, 0])
        self.assertEqual((flash.x, flash[0].y), (1.0, 0.0))
        self.assertFalse(P.ffi.NULL)


class Loop(unittest.TestCase):
    def setUp(self):
        FRAMES.clear()
        EVENTS.clear()
        _rt.window.open = False
        P.init_window(320, 240, 'laço')

    def test_one_exchange_per_end_drawing_and_keep(self):
        for _ in range(3):
            P.begin_drawing()
            P.clear_background(P.RAYWHITE)
            P.draw_rectangle(10, 10, 20, 20, P.RED)
            P.end_drawing()
        self.assertEqual(len(FRAMES), 3)
        self.assertFalse(FRAMES[0][0]['keep'])
        self.assertTrue(FRAMES[2][0]['keep'])
        records = array('d', FRAMES[0][1][:FRAMES[0][0]['list']])
        self.assertEqual(list(records[:2]), [_rt.OP_CLEAR, 0xF5F5F5FF])
        self.assertEqual(records[2], _rt.OP_RECT_PRO)

    def test_key_pressed_is_an_edge(self):
        EVENTS.extend([[['kd', 32]], [], [['ku', 32]], []])
        seen = []
        for _ in range(4):
            frame()
            seen.append((P.is_key_pressed(P.KEY_SPACE), P.is_key_down(P.KEY_SPACE),
                         P.is_key_released(P.KEY_SPACE)))
        self.assertEqual(seen, [(True, True, False), (False, True, False), (False, False, True),
                                (False, False, False)])

    def test_tap_inside_one_frame_still_counts(self):
        EVENTS.extend([[['kd', 32], ['ku', 32]], []])
        frame()
        self.assertTrue(P.is_key_pressed(P.KEY_SPACE))
        frame()
        self.assertTrue(P.is_key_released(P.KEY_SPACE))

    def test_exit_key_closes_unless_disabled(self):
        EVENTS.append([['kd', 256]])
        frame()
        self.assertTrue(P.window_should_close())
        _rt.window.should_close = False
        P.set_exit_key(P.KEY_NULL)
        EVENTS.append([['kd', 256]])
        frame()
        self.assertFalse(P.window_should_close())

    def test_frame_time_follows_the_browser_clock(self):
        frame()
        frame()
        self.assertAlmostEqual(P.get_frame_time(), 1 / 60, places=4)
        self.assertGreater(P.get_time(), 0)

    def test_music_stalls_without_update(self):
        P.init_audio_device()
        path = os.path.join(ROOT, 'tema.wav')
        with open(path, 'wb') as handle:
            handle.write(b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00'
                         b'\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00')
        music = P.load_music_stream('tema.wav')
        P.play_music_stream(music)
        frame()
        self.assertEqual(FRAMES[-1][0]['audio'][0][0], 'play')
        for _ in range(40):
            frame()
        self.assertTrue(any(command[0] == 'pause' for _, (header, _) in enumerate(FRAMES)
                            for command in header['audio']))


if __name__ == '__main__':
    unittest.main()
