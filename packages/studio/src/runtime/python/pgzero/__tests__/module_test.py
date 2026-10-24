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

    def present(self, keep=False, title='Jogo'):
        return self.sz.present(320, 240, title, keep)


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


if __name__ == '__main__':
    unittest.main(verbosity=1)
