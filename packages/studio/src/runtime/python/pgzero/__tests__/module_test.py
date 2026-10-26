"""The Studio's Pygame Zero module in plain CPython, with a scripted browser.

Run by module.test.ts (``python -I -B module_test.py <path to pgzero/py>``). Each test imports a
fresh copy of the package, so registries and module state never leak between tests.
"""
import json
import os
import struct
import sys
import tempfile
import types
import unittest
import zlib

PACKAGE = os.path.abspath(sys.argv.pop(1) if len(sys.argv) > 1 else '../py')


def png(width, height, padding=0):
    """A real PNG header (the module reads only the size), padded to a given file size."""
    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body))
    head = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    return head + chunk(b'IEND', b'') + b'\0' * padding


class Browser:
    """Answers each exchange like the renderer: events, timestamp, ended voices or an error."""

    def __init__(self):
        self.headers = []
        self.payloads = []
        self.replies = []
        self.pixels = None
        self.now = 0.0

    def __call__(self, header, payload):
        header = json.loads(header)
        self.headers.append(header)
        self.payloads.append(bytes(payload))
        if 'decode' in header:
            return '{}', self.pixels
        self.now += 1000 / 60
        reply = self.replies.pop(0) if self.replies else {}
        reply.setdefault('events', [])
        reply.setdefault('now', self.now)
        return json.dumps(reply), None


class Case(unittest.TestCase):
    def setUp(self):
        for name in list(sys.modules):
            if name == 'pgzero' or name.startswith('pgzero.') or name == 'pgzrun':
                del sys.modules[name]
        if PACKAGE not in sys.path:
            sys.path.insert(0, PACKAGE)
        self.folder = tempfile.TemporaryDirectory()
        self.root = os.path.realpath(self.folder.name)
        for sub in ('images', 'sounds', 'music', 'fonts'):
            os.makedirs(os.path.join(self.root, sub))
        import pgzero.loaders
        from pgzero import _sz
        self.sz = _sz
        self.loaders = pgzero.loaders
        self.browser = Browser()
        _sz.configure(self.browser, None, self.root)
        pgzero.loaders.set_root(os.path.join(self.root, 'main.py'))

    def tearDown(self):
        self.folder.cleanup()

    def write(self, relative, data):
        path = os.path.join(self.root, relative)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as stream:
            stream.write(data)
        return path

    def present(self, title='Jogo'):
        return self.sz.present(320, 240, title)


class Messages(Case):
    def test_a_misspelled_key_is_still_a_key_error_with_a_readable_message(self):
        from pgzero.keyboard import keyboard
        with self.assertRaises(KeyError) as caught:
            keyboard.spcae
        self.assertEqual(str(caught.exception), 'A tecla keyboard.spcae não existe. Confira o nome: '
                         'por exemplo keyboard.space, keyboard.left ou keyboard.a.')

    def test_a_misspelled_hook_parameter_is_explained_in_portuguese(self):
        from pgzero.spellcheck import InvalidParameter, spellcheck
        def on_key_down(keey):
            pass
        with self.assertRaises(InvalidParameter) as caught:
            spellcheck({'on_key_down': on_key_down})
        self.assertIn('não recebe o parâmetro keey', str(caught.exception))


class TextRules(Case):
    def test_a_number_is_refused_like_on_the_desktop(self):
        from pgzero.screen import Screen
        with self.assertRaises(TypeError) as caught:
            Screen(320, 240).draw.text(10, (0, 0))
        self.assertIn('str(numero)', str(caught.exception))

    def test_limits_count_like_the_browser_so_emoji_never_break_a_frame(self):
        from pgzero.screen import Screen
        with self.assertRaises(self.sz.PgzeroLimitError):
            Screen(320, 240).draw.text('😀' * 2001, (0, 0))
        self.present(title='😀' * 150)
        title = self.browser.headers[-1]['title']
        self.assertEqual(self.sz.utf16_length(title), self.sz.MAX_TITLE_CHARS)


class RectLikePygameCe(Case):
    """Values measured on pygame-ce 2.5.8 (the reference of the desktop export)."""

    def test_rects_order_like_tuples_and_move_to_places_a_copy(self):
        from pgzero import _pgrect
        a, b = _pgrect.Rect(1, 2, 3, 4), _pgrect.Rect(1, 2, 3, 5)
        self.assertEqual((a < b, a <= b, a > b, a >= (1, 2, 3, 4), a < (0, 0, 0, 0)),
                         (True, True, False, True, False))
        self.assertEqual(repr(a.move_to(center=(10, 10))), 'Rect(9, 8, 3, 4)')
        self.assertEqual(repr(a.move_to(x=5, bottom=50)), 'Rect(5, 46, 3, 4)')
        self.assertEqual(a.relcenter, (1, 2))
        a.relcenter = (5, 5)
        self.assertEqual(repr(a), 'Rect(1, 2, 10, 10)')
        with self.assertRaises(AttributeError):
            a.move_to(nope=1)
        with self.assertRaises(TypeError):
            a < 'x'

    def test_colliderect_fast_path_agrees_with_the_general_one(self):
        from pgzero import _pgrect
        cases = [((0, 0, 10, 10), (5, 5, 10, 10)), ((0, 0, 10, 10), (10, 0, 5, 5)),
                 ((0, 0, -10, 10), (-5, 0, 2, 2)), ((0, 0, 0, 10), (0, 0, 5, 5))]
        for first, second in cases:
            rect = _pgrect.Rect(*first)
            self.assertEqual(rect.colliderect(_pgrect.Rect(*second)), rect.colliderect(second))


class SoundLength(Case):
    def test_an_ogg_vorbis_sound_knows_its_length(self):
        # Identification header (rate 22050) on the first page; last page at sample 44100.
        ident = b'\x01vorbis' + struct.pack('<IBI', 0, 1, 22050) + b'\0' * 16
        first = b'OggS\0\x02' + struct.pack('<q', 0) + b'\0' * 13 + ident
        last = b'OggS\0\x04' + struct.pack('<q', 44100) + b'\0' * 13
        self.write('sounds/a.ogg', first + last)
        self.assertAlmostEqual(self.loaders.sounds.a.get_length(), 2.0)


class Tone(Case):
    def test_play_sends_the_note_the_browser_builds(self):
        from pgzero import tone
        tone.play('A4', 0.5)
        self.assertEqual(self.sz.frame.audio[-1], ['tone', self.sz.frame.audio[-1][1], 440.0, 11025, 1.0])
        tone.play(220, 0.25)
        self.assertEqual(self.sz.frame.audio[-1][2:4], [220.0, 5512])

    def test_create_makes_a_sound_to_play_later_with_its_length(self):
        from pgzero import tone
        note = tone.create('C4', 0.02)
        self.assertAlmostEqual(note.get_length(), (441 + 2000) / 22050)
        self.assertEqual(self.sz.frame.audio, [])
        note.play()
        self.assertEqual(self.sz.frame.audio[-1][0], 'tone')

    def test_bad_notes_are_explained(self):
        from pgzero import tone
        with self.assertRaises(tone.InvalidNote) as caught:
            tone.play('H2', 1)
        self.assertIn('não é uma nota', str(caught.exception))
        with self.assertRaises(tone.InvalidNote):
            tone.play('C4', 5)


class PygamePart(Case):
    def setUp(self):
        super().setUp()
        for name in list(sys.modules):
            if name == 'pygame' or name.startswith('pygame.'):
                del sys.modules[name]

    def surface(self):
        from pgzero.screen import Screen
        self.present()  # the window size the screen reads use
        return Screen(320, 240).surface

    def test_draw_on_screen_surface_joins_the_drawing(self):
        import pygame
        surface = self.surface()
        box = pygame.draw.polygon(surface, (255, 0, 0), [(10, 10), (50, 10), (30, 40)])
        self.assertEqual(repr(box), 'Rect(10, 10, 41, 31)')  # pygame-ce 2.5.8
        self.assertEqual(repr(pygame.draw.ellipse(surface, 'blue', (10, 10, 20, 10))), 'Rect(10, 10, 20, 10)')
        self.assertEqual(repr(pygame.draw.circle(surface, (1, 1, 1), (50, 50), 10)), 'Rect(40, 40, 20, 20)')
        pygame.draw.rect(surface, (1, 1, 1), (5, 5, 10, 10), -1)
        ops = self.sz.frame.ops
        self.assertEqual(ops[0], self.sz.OP_POLY)
        self.assertEqual(list(ops[1:3]), [3.0, 0.0])
        self.assertIn(float(self.sz.OP_ELLIPSE), list(ops))
        self.assertNotIn(float(self.sz.OP_RECT), list(ops))  # a negative width draws nothing

    def test_draw_sends_what_pygame_ce_draws_pixel_by_pixel(self):
        import pygame
        surface = self.surface()
        frame = self.sz.frame
        # The coordinates go as written: the browser keeps their whole part, as pygame does.
        pygame.draw.line(surface, (1, 2, 3), (1.7, 2.6), (10.9, -0.5), 3)
        self.assertEqual(list(frame.ops[:10]), [self.sz.OP_LINE, 1.7, 2.6, 10.9, -0.5, 1, 2, 3, 255, 3])
        # Rounded corners and parts of a circle are drawn, no longer warned about.
        del frame.ops[:]
        pygame.draw.rect(surface, (1, 2, 3), (5, 6, 30, 20), 2, border_radius=4,
                         border_bottom_right_radius=9)
        self.assertEqual(list(frame.ops), [self.sz.OP_ROUND_RECT, 5, 6, 30, 20, 1, 2, 3, 255, 2, 4,
                                           -1, -1, -1, 9])
        del frame.ops[:]
        pygame.draw.circle(surface, (1, 2, 3), (40.5, 30), 12, 0, draw_top_left=True)
        self.assertEqual(list(frame.ops), [self.sz.OP_CIRCLE_PART, 40.5, 30, 12, 1, 2, 3, 255, 0,
                                           0, 1, 0, 0])
        # A square rectangle and a whole circle keep their usual instructions.
        del frame.ops[:]
        pygame.draw.rect(surface, (1, 2, 3), (5, 6, 30, 20), border_radius=0)
        pygame.draw.circle(surface, (1, 2, 3), (40, 30), 12)
        self.assertEqual([frame.ops[0], frame.ops[10]], [self.sz.OP_RECT, self.sz.OP_CIRCLE])
        # The border of a polygon is pygame.draw.lines, closed: one line per side.
        del frame.ops[:]
        pygame.draw.polygon(surface, (1, 2, 3), [(0, 0), (9, 0), (9, 9), (0, 9)], 2)
        self.assertEqual(list(frame.ops).count(self.sz.OP_LINE), 4)
        self.assertNotIn(float(self.sz.OP_POLY), list(frame.ops))
        # Two points do not close: pygame draws a single line.
        del frame.ops[:]
        pygame.draw.lines(surface, (1, 2, 3), True, [(0, 0), (9, 9)], 2)
        self.assertEqual(list(frame.ops).count(self.sz.OP_LINE), 1)

    def test_draw_only_on_the_screen(self):
        import pygame
        with self.assertRaises(TypeError) as caught:
            pygame.draw.line(object(), (0, 0, 0), (0, 0), (1, 1))
        self.assertIn('screen.surface', str(caught.exception))

    def test_get_at_sends_what_was_drawn_and_answers_the_colour(self):
        import pygame
        surface = self.surface()
        pygame.draw.rect(surface, (9, 8, 7), (0, 0, 10, 10))
        self.browser.replies = [{'pixel': [9, 8, 7, 255]}]
        color = surface.get_at((5, 5))
        self.assertEqual(tuple(color), (9, 8, 7, 255))
        header = self.browser.headers[-1]
        self.assertEqual(header['read'], [5, 5])
        self.assertTrue(len(self.browser.payloads[-1]) > 0)
        # The drawing went with the read: the next frame does not send it again.
        self.present()
        self.assertTrue(self.browser.headers[-1]['keep'])
        with self.assertRaises(IndexError):
            surface.get_at((320, 0))

    def test_vector2_behaves_like_pygame_ce(self):
        from pygame.math import Vector2
        a = Vector2(3, 4)
        self.assertEqual(repr(a), 'Vector2(3, 4)')
        self.assertEqual(repr(Vector2(1.5, 2)), 'Vector2(1.5, 2)')
        self.assertEqual(a.length(), 5.0)
        self.assertEqual(repr(a.normalize()), 'Vector2(0.6, 0.8)')
        self.assertEqual(repr(a * 2), 'Vector2(6, 8)')
        self.assertEqual(a * Vector2(1, 0), 3.0)
        self.assertEqual(repr(a.rotate(90)), 'Vector2(-4, 3)')
        self.assertEqual(a.distance_to((0, 0)), 5.0)
        self.assertAlmostEqual(a.angle_to((0, 1)), 36.86989764584402)
        self.assertEqual(repr(a + (1, 1)), 'Vector2(4, 5)')
        self.assertEqual(str(Vector2((1, 2))), '[1, 2]')

    def test_mixer_init_is_harmless_and_missing_parts_explain(self):
        import pygame
        pygame.mixer.quit()
        pygame.mixer.init(44100, -16, 2, 1024)
        self.assertIs(pygame.Rect, __import__('pgzero.rect').rect.Rect)
        with self.assertRaises(AttributeError) as caught:
            pygame.time
        self.assertIn('parte do pygame', str(caught.exception))


class PersistentScreen(Case):
    """The screen keeps what was drawn, like pygame's display surface."""

    def screen(self):
        from pgzero.screen import Screen
        return Screen(320, 240)

    def test_drawing_outside_draw_is_sent_and_an_empty_frame_keeps_the_screen(self):
        screen = self.screen()
        screen.draw.filled_rect(__import__('pgzero.rect').rect.Rect(1, 2, 3, 4), (255, 0, 0))
        self.present()
        self.assertFalse(self.browser.headers[-1]['keep'])
        self.assertTrue(len(self.browser.payloads[-1]) > 0)
        # Nothing drawn since: the browser is asked to keep the screen as it is.
        self.present()
        self.assertTrue(self.browser.headers[-1]['keep'])
        self.assertEqual(self.browser.payloads[-1], b'')

    def test_one_batch_carries_everything_drawn_since_the_last_frame_in_order(self):
        screen = self.screen()
        screen.fill((10, 20, 30))
        screen.draw.filled_circle((5, 5), 3, (1, 2, 3))
        screen.fill((40, 50, 60))
        self.present()
        values = struct.unpack(f'{len(self.browser.payloads[-1]) // 8}d', self.browser.payloads[-1])
        # The batch opens with the first fill and closes with the last (a fill is the op and RGBA).
        self.assertEqual(values[:4], (self.sz.OP_FILL, 10.0, 20.0, 30.0))
        self.assertEqual(values[-5:-1], (self.sz.OP_FILL, 40.0, 50.0, 60.0))
        self.assertIn(float(self.sz.OP_CIRCLE), values[5:-5])

    def test_text_tables_are_renewed_between_batches_never_inside_one(self):
        screen = self.screen()
        frame = self.sz.frame
        for number in range(self.sz.MAX_STRINGS // 2 + 1):
            frame.strings[f'velho {number}'] = number + 1
        screen.draw.text('no update', (0, 0))
        screen.draw.text('no draw', (0, 20))
        self.present()
        first = self.browser.headers[-1]['strings']
        self.assertNotIn([0, ''], first)
        self.assertEqual([value for _, value in first], ['no update', 'no draw'])
        screen.draw.text('depois', (0, 0))
        self.present()
        self.assertEqual(self.browser.headers[-1]['strings'][0], [0, ''])


class Limits(Case):
    def test_a_frame_sends_files_within_its_byte_budget_and_the_rest_follows(self):
        mb = 1024 * 1024
        for name in ('a', 'b', 'c'):
            self.write(f'images/{name}.png', png(8, 8, 10 * mb))
            getattr(self.loaders.images, name)
        self.present()
        self.present()
        sent = [[os.path.basename(entry[1]) for entry in h['images']] for h in self.browser.headers]
        # 24 MB per frame: two files of 10 MB, then the third.
        self.assertEqual(sent, [['a.png', 'b.png'], ['c.png']])

    def test_too_many_pixels_or_bytes_fail_at_the_line_that_loads_the_image(self):
        self.write('images/huge.png', png(8, 8, 17 * 1024 * 1024))
        with self.assertRaises(self.sz.PgzeroLimitError):
            self.loaders.images.load('huge')
        for index in range(2):
            self.write(f'images/p{index}.png', png(4096, 4096))
        self.loaders.images.load('p0')
        self.loaders.images.load('p1')
        self.write('images/one_more.png', png(8, 8))
        with self.assertRaises(self.sz.PgzeroLimitError) as raised:
            self.loaders.images.load('one_more')
        self.assertIn('32 milhões', str(raised.exception))

    def test_a_frame_never_plays_more_sounds_than_a_mixer_has_channels(self):
        self.write('sounds/tiro.wav', b'RIFF\0\0\0\0WAVE')
        tiro = self.loaders.sounds.tiro
        for _ in range(70):
            tiro.play()
        tiro.set_volume(0.5)
        self.present()
        audio = self.browser.headers[-1]['audio']
        plays = [command for command in audio if command[0] == 'play']
        self.assertEqual(len(plays), self.sz.MAX_PLAYS_PER_FRAME)
        # The volume changed the plays of this frame instead of adding commands.
        self.assertTrue(all(command[4] == 0.5 for command in plays))
        self.assertLessEqual(len(audio), self.sz.MAX_AUDIO_COMMANDS)

    def test_a_long_text_fails_where_it_is_drawn_and_a_long_title_is_cut(self):
        from pgzero.screen import Screen
        screen = Screen(320, 240)
        with self.assertRaises(self.sz.PgzeroLimitError):
            screen.draw.text('a' * 4001, (0, 0))
        self.present(title='T' * 500)
        self.assertEqual(len(self.browser.headers[-1]['title']), 200)

    def test_text_styles_that_would_block_the_page_fail_where_they_are_drawn(self):
        from pgzero.screen import Screen
        screen = Screen(320, 240)
        screen.draw.text('ok', (0, 0), fontsize=512, owidth=1.5)
        for style in ({'fontsize': 600}, {'fontsize': 100, 'owidth': 50},
                      {'fontsize': 200, 'shadow': (10, 0)}, {'lineheight': 40}):
            with self.assertRaises(self.sz.PgzeroLimitError):
                screen.draw.text('x', (0, 0), **style)


class Browser_errors(Case):
    def test_a_frame_the_browser_cannot_show_raises_in_python(self):
        self.browser.replies.append({'error': 'Não consegui abrir a imagem images/x.png.'})
        with self.assertRaises(self.sz.PgzeroRendererError) as raised:
            self.present()
        self.assertIn('images/x.png', str(raised.exception))


class Pixels(Case):
    def svg(self, name, width, height):
        self.write(f'images/{name}.svg', (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"></svg>'
        ).encode())
        return getattr(self.loaders.images, name)

    def test_vector_pixels_come_back_in_one_binary_reply_with_their_image(self):
        image = self.svg('nave', 3, 2)
        self.browser.pixels = bytes(range(24))
        self.assertEqual(tuple(image.get_at((1, 1))), (16, 17, 18, 19))
        [header] = self.browser.headers
        self.assertEqual(header['decode'], image._id)
        # Not sent yet: the request carries the image the browser has to draw.
        self.assertEqual([entry[0] for entry in header['images']], [image._id])
        self.assertEqual(self.sz._images.pending, [])

    def test_read_pixels_stay_in_memory_up_to_a_limit(self):
        self.sz._pixel_cache.limit = 100
        first, second = self.svg('a', 4, 4), self.svg('b', 4, 4)
        self.browser.pixels = bytes(64)
        first.get_at((0, 0))
        second.get_at((0, 0))
        # 128 bytes do not fit 100: the least recently read image lets go of its pixels.
        self.assertIsNone(first._pixels)
        self.assertIsNotNone(second._pixels)
        first.get_at((0, 0))
        self.assertIsNone(second._pixels)


class Paths(Case):
    def test_media_paths_are_relative_to_the_project_even_from_a_subfolder(self):
        self.loaders.set_root(os.path.join(self.root, 'jogo', 'main.py'))
        self.write('jogo/sounds/bip.wav', b'RIFF\0\0\0\0WAVE')
        self.write('jogo/music/tema.ogg', b'OggS')
        self.write('jogo/fonts/pixel.ttf', b'\0\1\0\0')
        self.loaders.sounds.bip.play()
        import pgzero.music
        pgzero.music.play('tema')
        from pgzero.screen import Screen
        Screen(320, 240).draw.text('oi', (0, 0), fontname='pixel')
        self.present()
        header = self.browser.headers[-1]
        self.assertEqual([command[2] for command in header['audio']],
                         ['jogo/sounds/bip.wav', 'jogo/music/tema.ogg'])
        # The browser reads the font file under the project root.
        self.assertEqual(header['fonts'], [[1, os.path.join(self.root, 'jogo/fonts/pixel.ttf')]])


class Audio(Case):
    def setUp(self):
        super().setUp()
        self.write('sounds/bip.wav', b'RIFF\0\0\0\0WAVE')
        self.write('music/a.ogg', b'OggS')
        self.write('music/b.ogg', b'OggS')
        import pgzero.music
        self.music = pgzero.music

    def plays(self):
        return [command for header in self.browser.headers for command in header['audio']
                if command[0] == 'play']

    def test_a_sound_with_loops_asks_the_browser_for_the_repeats_in_one_play(self):
        bip = self.loaders.sounds.bip
        bip.play(loops=2)
        self.present()
        # One play repeated by the browser: no gap waiting for a reply between the plays.
        self.assertEqual([command[3] for command in self.plays()], [2])
        self.assertTrue(self.browser.headers[-1]['watch'])
        self.assertEqual(bip.get_num_channels(), 1)
        self.browser.replies.append({'ended': [self.plays()[-1][1]]})
        self.present()
        self.present()
        self.assertEqual(len(self.plays()), 1)
        self.assertFalse(self.browser.headers[-1]['watch'])
        self.assertEqual(bip.get_num_channels(), 0)

    def test_get_num_channels_drops_a_sound_that_ended_by_itself(self):
        bip = self.loaders.sounds.bip
        bip.play()
        bip.play(loops=-1)
        self.present()
        self.assertEqual(bip.get_num_channels(), 2)
        once, forever = [command[1] for command in self.plays()]
        self.assertEqual([command[3] for command in self.plays()], [0, -1])
        self.assertTrue(self.browser.headers[-1]['watch'])
        self.browser.replies.append({'ended': [once]})
        self.present()
        self.present()
        self.assertEqual(bip.get_num_channels(), 1)
        # Only the looping one is left, and it never ends by itself.
        self.assertFalse(self.browser.headers[-1]['watch'])

    def test_looping_voices_are_kept_so_stop_always_reaches_them(self):
        bip = self.loaders.sounds.bip
        bip.play(loops=-1)
        self.present()
        looping = self.plays()[0][1]
        for _ in range(40):
            bip.play()
            self.present()
        bip.stop()
        self.present()
        stops = [command[1] for command in self.browser.headers[-1]['audio'] if command[0] == 'stop']
        self.assertTrue(any(looping == target or looping in target for target in stops))

    def test_stopping_and_turning_down_many_voices_sends_one_command_per_sound(self):
        sounds = []
        for name in ('a', 'b', 'c'):
            self.write(f'sounds/{name}.wav', b'RIFF\0\0\0\0WAVE')
            sound = getattr(self.loaders.sounds, name)
            for _ in range(32):
                sound.play(loops=-1)
                self.present()
            sounds.append(sound)
        for sound in sounds:
            sound.set_volume(0.5)
        self.present()
        audio = self.browser.headers[-1]['audio']
        self.assertEqual(len(audio), 3)
        self.assertEqual(sorted(len(command[1]) for command in audio), [32, 32, 32])
        for sound in sounds:
            sound.stop()
        self.present()
        audio = self.browser.headers[-1]['audio']
        self.assertEqual([command[0] for command in audio], ['stop'] * 3)
        named = sorted(voice for command in audio for voice in command[1])
        self.assertEqual(named, sorted(command[1] for command in self.plays()))

    def test_stopping_a_sound_whose_play_was_not_sent_sends_nothing(self):
        bip = self.loaders.sounds.bip
        bip.play()
        bip.set_volume(0.3)
        bip.stop()
        self.present()
        self.assertEqual(self.browser.headers[-1]['audio'], [])

    def test_music_end_runs_on_music_end_and_starts_the_queued_track(self):
        self.music.play_once('a')
        self.music.queue('b')
        self.present()
        self.assertTrue(self.browser.headers[-1]['watch'])
        self.assertTrue(self.music.is_playing('a'))
        first = self.plays()[-1][1]
        self.browser.replies.append({'ended': [first]})
        self.present()
        from pgzero import constants
        self.assertEqual(self.sz.posted, [constants.MUSIC_END])
        self.present()
        self.assertEqual(self.plays()[-1][2], 'music/b.ogg')
        self.assertTrue(self.music.is_playing(None))
        self.browser.replies.append({'ended': [self.plays()[-1][1]]})
        self.present()
        self.assertFalse(self.music.is_playing(None))

    def test_looping_music_is_not_watched(self):
        self.music.play('a')
        self.present()
        self.assertFalse(self.browser.headers[-1]['watch'])

    def test_the_music_has_its_own_channel(self):
        bip = self.loaders.sounds.bip
        for _ in range(self.sz.MAX_PLAYS_PER_FRAME):
            bip.play()
        self.music.play('a')
        self.present()
        music = [command for command in self.plays() if command[5]]
        self.assertEqual([command[2] for command in music], ['music/a.ogg'])
        self.assertEqual(music[0][3], -1)
        self.assertTrue(self.music.is_playing('a'))

    def test_stop_posts_music_end_like_pygame_ce_but_changing_tracks_does_not(self):
        from pgzero import constants
        self.music.stop()
        self.assertEqual(self.sz.posted, [])
        self.music.play('a')
        self.music.play('b')
        self.assertEqual(self.sz.posted, [])
        self.music.stop()
        self.assertEqual(self.sz.posted, [constants.MUSIC_END])
        self.music.play('a')
        self.music.pause()
        self.music.stop()
        self.assertEqual(self.sz.posted, [constants.MUSIC_END] * 2)
        self.music.play('a')
        self.music.fadeout(1)
        self.assertEqual(self.sz.posted, [constants.MUSIC_END] * 3)

    def test_queue_with_nothing_playing_does_not_play(self):
        self.music.queue('b')
        self.present()
        self.assertEqual(self.plays(), [])
        self.assertFalse(self.music.is_playing(None))
        # Nor does it wait: a later track plays alone.
        self.music.play_once('a')
        self.present()
        self.browser.replies.append({'ended': [self.plays()[-1][1]]})
        self.present()
        self.present()
        self.assertEqual([command[2] for command in self.plays()], ['music/a.ogg'])

    def test_pause_really_pauses_and_unpause_resumes(self):
        self.music.set_volume(0.7)
        self.music.play('a')
        self.present()
        voice = self.plays()[-1][1]
        self.music.pause()
        self.present()
        self.assertEqual(self.browser.headers[-1]['audio'], [['pause', voice]])
        self.assertFalse(self.music.is_playing('a'))
        self.music.unpause()
        self.present()
        self.assertEqual(self.browser.headers[-1]['audio'], [['resume', voice]])
        self.assertTrue(self.music.is_playing('a'))
        # Pausing and resuming in the same frame sends only the last of the two.
        self.music.pause()
        self.music.unpause()
        self.present()
        self.assertEqual(self.browser.headers[-1]['audio'], [['resume', voice]])


class Loop(Case):
    def run_game(self, source, frames):
        """Run a game module for a number of frames; returns the module."""
        from pgzero import runner
        module = types.ModuleType('__main__')
        module.__file__ = os.path.join(self.root, 'main.py')
        runner.prepare_mod(module)
        exec(source, module.__dict__)
        original = self.browser.__call__

        count = [0]

        def limited(header, payload):
            count[0] += 1
            if count[0] > frames:
                raise SystemExit
            return original(header, payload)

        self.sz.configure(limited, None, self.root)
        with self.assertRaises(SystemExit):
            runner.run_mod(module)
        return module

    def test_losing_focus_releases_held_keys_with_key_up_events(self):
        from pgzero.constants import keys
        self.browser.replies = [
            {'events': [['kd', int(keys.LEFT), 0, '']]},
            {'events': [['ku', int(keys.LEFT), 0]]},
        ]
        module = self.run_game('''
log = []
def update():
    log.append(keyboard.left)
def on_key_up(key):
    log.append(('up', key))
''', 3)
        self.assertEqual(module.log[:2], [True, ('up', keys.LEFT)])
        self.assertEqual(module.log[2], False)

    def test_on_music_end_is_called_by_the_game_loop(self):
        self.write('music/a.ogg', b'OggS')
        self.browser.replies = [{}, {'ended': [1]}]
        module = self.run_game('''
ended = []
music.play_once('a')
def on_music_end():
    ended.append(True)
''', 3)
        self.assertEqual(module.ended, [True])


    def test_a_variable_named_screen_fails_like_on_the_computer(self):
        with self.assertRaises(TypeError) as caught:
            self.run_game("screen = 'menu'", 1)
        self.assertIn('tela_atual', str(caught.exception))

    def test_width_must_be_a_number_like_set_mode(self):
        with self.assertRaises(TypeError):
            self.run_game("WIDTH = '800'", 1)

    def test_a_missing_icon_fails_like_on_the_computer(self):
        with self.assertRaises(KeyError):
            self.run_game("ICON = 'nao_existe'", 1)

    def test_drawing_in_update_reaches_the_browser(self):
        self.run_game('''
def update():
    screen.draw.filled_circle((10, 10), 3, 'red')
''', 2)
        self.assertTrue(any(len(payload) > 0 for payload in self.browser.payloads))


if __name__ == '__main__':
    unittest.main(verbosity=1)
