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


class FullReview(unittest.TestCase):
    """O que o full review de 25/10 achou funcionando aqui e quebrando no computador (ou o contrário)."""

    def setUp(self):
        FRAMES.clear()
        EVENTS.clear()
        _rt.window.open = False
        P.init_window(320, 240, 'revisão')

    def test_a_pointer_has_no_len_nor_for_but_an_array_does(self):
        count = P.ffi.new('int *', 0)
        with self.assertRaises(TypeError):
            len(count)
        with self.assertRaises(TypeError):
            list(count)
        self.assertEqual(len(P.ffi.new('int[]', [1, 2, 3])), 3)
        sequence = P.load_random_sequence(3, 1, 9)
        self.assertEqual(sorted(sequence[i] for i in range(3)) == sorted(set(sequence[i] for i in range(3))), True)
        with self.assertRaises(TypeError):
            len(sequence)
        # Mais números distintos do que o intervalo tem: NULL, como no C.
        self.assertIs(P.load_random_sequence(20, 1, 10), P.ffi.NULL)

    def test_sound_loaded_before_the_device_never_plays(self):
        P.close_audio_device()
        path = os.path.join(ROOT, 'cedo.wav')
        with open(path, 'wb') as handle:
            handle.write(b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00'
                         b'\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x04\x00\x00\x00'
                         b'\x00\x00\x00\x00')
        sound = P.load_sound('cedo.wav')
        self.assertFalse(P.is_sound_valid(sound))
        self.assertEqual(sound.frameCount, 0)
        P.init_audio_device()
        P.play_sound(sound)
        frame()
        self.assertFalse(any(command[0] == 'play' for command in FRAMES[-1][0]['audio']))
        self.assertTrue(P.is_sound_valid(P.load_sound('cedo.wav')))

    def test_ogg_length_comes_from_the_file(self):
        P.init_audio_device()
        rate = (44100).to_bytes(4, 'little')
        head = b'OggS' + bytes(24) + b'\x01vorbis' + bytes(4) + b'\x02' + rate + bytes(16)
        tail = b'OggS\x00\x04' + (88200).to_bytes(8, 'little') + bytes(16)
        with open(os.path.join(ROOT, 'tema.ogg'), 'wb') as handle:
            handle.write(head + bytes(100) + tail)
        music = P.load_music_stream('tema.ogg')
        self.assertEqual(music.frameCount, 88200)
        self.assertAlmostEqual(P.get_music_time_length(music), 2.0)

    def test_get_time_moves_inside_a_frame(self):
        frame()
        start = P.get_time()
        for _ in range(10_000_000):
            if P.get_time() - start > 0.005:
                break
        self.assertGreater(P.get_time() - start, 0.005)

    def test_pressing_again_in_the_same_frame_keeps_the_key_down(self):
        EVENTS.extend([[['kd', 32], ['ku', 32], ['kd', 32]], []])
        frame()
        frame()
        self.assertTrue(P.is_key_down(P.KEY_SPACE))
        self.assertFalse(P.is_key_released(P.KEY_SPACE))
        EVENTS.append([['ku', 32]])
        frame()
        frame()

    def test_division_by_zero_is_nan_or_inf_like_c(self):
        # Como no C: 1/0 é infinito e 0/0 é nan, sem ZeroDivisionError.
        self.assertEqual(P.normalize(1, 0, 0), float('inf'))
        self.assertTrue(P.normalize(0, 0, 0) != P.normalize(0, 0, 0))
        self.assertTrue(P.remap(0, 0, 0, 0, 10) != P.remap(0, 0, 0, 0, 10))
        self.assertTrue(P.wrap(1, 0, 0) != P.wrap(1, 0, 0))
        P.matrix_ortho(0, 0, 0, 0, 0, 0)

    def test_collision_lines_fills_the_ffi_pointer(self):
        point = P.ffi.new('Vector2 *')
        self.assertTrue(P.check_collision_lines((0, 0), (2, 2), (0, 2), (2, 0), point))
        self.assertEqual((point.x, point.y), (1.0, 1.0))

    def test_mouse_offset_and_scale(self):
        P.set_mouse_position(10, 20)
        P.set_mouse_offset(5, 0)
        P.set_mouse_scale(2, 1)
        self.assertEqual((P.get_mouse_x(), P.get_mouse_y()), (30, 20))
        P.set_mouse_offset(0, 0)
        P.set_mouse_scale(1, 1)

    def test_out_of_range_key_is_not_up(self):
        self.assertFalse(P.is_key_up(0))
        self.assertFalse(P.is_key_up(600))
        self.assertFalse(P.is_mouse_button_up(9))

    def test_c_names_take_bytes_and_pointers(self):
        with self.assertRaises(TypeError):
            R.MeasureText('abc', 10)
        self.assertEqual(R.MeasureText(b'abc', 10), P.measure_text('abc', 10))
        image = P.gen_image_color(2, 2, P.RED)
        with self.assertRaises(TypeError):
            R.ImageFlipVertical(image)
        R.ImageFlipVertical(P.ffi.addressof(image))

    def test_colors_refuse_what_c_refuses(self):
        with self.assertRaises(OverflowError):
            P.get_color(-1)
        P.color_to_int((230, 41, 55, 255))
        with self.assertRaises(TypeError):
            P.color_to_int((230.0, 41, 55, 255))

    def test_messages_for_what_the_studio_does_not_have(self):
        with self.assertRaises(NotImplementedError) as gui:
            P.gui_button((0, 0, 10, 10), 'ok')
        self.assertIn('raygui', str(gui.exception))
        with self.assertRaises(NotImplementedError) as rlgl:
            P.rl_set_line_width(2)
        self.assertNotIn('Raylib 3D', str(rlgl.exception))


if __name__ == '__main__':
    unittest.main()
