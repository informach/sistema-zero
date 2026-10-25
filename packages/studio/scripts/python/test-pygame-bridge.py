"""The Studio host bridge (_szpygame) on desktop pygame-ce 2.5.7, with a scripted transport.

Checks what the bridge replaces — input state and events, clocks, timers, waiting, the mixer
and image cursors — keeping pygame-ce's own behaviour everywhere else.

    python -I packages/studio/scripts/python/test-pygame-bridge.py
"""
import json
import os
import sys
from pathlib import Path

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
RUNTIME = Path(__file__).resolve().parents[2] / 'src/runtime/python'
sys.path[:0] = [str(RUNTIME / 'pygame/py')]
# At the end: pgzero/py has _sz, and also Pygame Zero's own partial pygame package, which must
# not shadow the real pygame-ce installed in site-packages.
sys.path.append(str(RUNTIME / 'pgzero/py'))

import pygame  # noqa: E402
from pgzero import _sz  # noqa: E402
import _szpygame  # noqa: E402

clock = {'now': 0.0}
pygame.time.get_ticks = lambda: int(clock['now'])
queue = []
sent = []


def transport(header, payload):
    data = json.loads(header)
    sent.append(data)
    clock['now'] += 1000 / 60
    events = queue.pop(0) if queue else []
    ended = [command[1] for command in data['audio'] if command[0] == 'play' and command[3] == 0]
    reply = {'events': events, 'now': clock['now'], **({'ended': ended} if data.get('watch') else {})}
    return json.dumps(reply), None


root = Path(__file__).resolve().parent
_sz.configure(transport, None, str(root))
_szpygame.install(mission=True)

# Initialization and the window --------------------------------------------------------------
assert pygame.init() == (pygame.init()[0], 0)
screen = pygame.display.set_mode((320, 200))
pygame.display.set_caption('Ponte')
try:
    pygame.display.set_mode((4000, 100))
except pygame.error as error:
    assert '1920' in str(error)
else:
    raise AssertionError('a window too big must be refused')
screen = pygame.display.set_mode((320, 200))

# A frame sends the screen as pixels, the title and the cursor -------------------------------
pygame.display.flip()
frame = sent[-1]
assert frame['title'] == 'Ponte' and frame['w'] == 320 and frame['keep'] is False
assert frame['cursor'] is True

# update() refreshes the screen; update(None) deliberately refreshes nothing (pygame-ce API).
before = len(sent)
pygame.display.update(None)
assert len(sent) == before, 'display.update(None) must not present a new frame'
pygame.display.update()
assert len(sent) == before + 1 and sent[-1]['keep'] is False

# Keyboard: state, just pressed/released, events with scancodes, text input -----------------
queue.append([['kd', pygame.K_RIGHT, 0, ''], ['kd', pygame.K_a, 0, 'a']])
pygame.display.flip()
keys = pygame.key.get_pressed()
assert keys[pygame.K_RIGHT] and keys[pygame.K_a] and not keys[pygame.K_LEFT]
# As in pygame-ce, "just pressed" is what the last pump of events brought.
assert not pygame.key.get_just_pressed()[pygame.K_a]
events = pygame.event.get()
assert pygame.key.get_just_pressed()[pygame.K_a]
kinds = [event.type for event in events]
assert pygame.KEYDOWN in kinds and pygame.TEXTINPUT in kinds
down = [event for event in events if event.type == pygame.KEYDOWN and event.key == pygame.K_a][0]
assert down.unicode == 'a' and down.scancode == pygame.KSCAN_A
queue.append([['ku', pygame.K_a, 0]])
pygame.display.flip()
assert not pygame.key.get_pressed()[pygame.K_a]
pygame.event.pump()
assert pygame.key.get_just_released()[pygame.K_a]
assert not pygame.key.get_just_pressed()[pygame.K_a]
pygame.event.clear()

# Mouse: position, buttons, wheel, motion ------------------------------------------------------
queue.append([['mm', 40, 50, 4, 5, 0], ['md', 40, 50, 1], ['md', 40, 50, 4], ['mu', 40, 50, 4]])
pygame.display.flip()
assert pygame.mouse.get_pos() == (40, 50)
assert pygame.mouse.get_pressed() == (True, False, False)
assert pygame.mouse.get_rel() == (4, 5) and pygame.mouse.get_rel() == (0, 0)
events = pygame.event.get()
assert [event for event in events if event.type == pygame.MOUSEWHEEL][0].y == 1
assert [event for event in events if event.type == pygame.MOUSEBUTTONDOWN][0].pos == (40, 50)

# Clock: tick(fps) waits frames (keep exchanges), get_fps averages ----------------------------
game_clock = pygame.time.Clock()
game_clock.tick()
before = len(sent)
game_clock.tick(30)
assert any(item['keep'] for item in sent[before:]), 'tick(30) waits for the next paint'
assert 25 <= game_clock.get_time() <= 40
# Like pygame, the average covers the last ten ticks.
for _ in range(12):
    pygame.display.flip()
    game_clock.tick()
assert 55 <= game_clock.get_fps() <= 65

# Timers: set_timer fires on frames, loops, custom events --------------------------------------
custom = pygame.event.custom_type()
assert custom == pygame.USEREVENT + 1
pygame.time.set_timer(custom, 50, loops=2)
pygame.event.clear()
fired = 0
for _ in range(12):
    pygame.display.flip()
    fired += sum(1 for event in pygame.event.get() if event.type == custom)
assert fired == 2, fired

# Waiting never spins: delay and event.wait wait for frames ------------------------------------
start = pygame.time.get_ticks()
pygame.time.delay(100)
assert pygame.time.get_ticks() - start >= 90
queue.extend([[], [], [['kd', pygame.K_SPACE, 0, ' ']]])
event = pygame.event.wait()
assert event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE

# Mixer: sounds go through the frame, channels track what plays ------------------------------
wav = root / 'test-pygame-bridge.wav'
import wave  # noqa: E402
with wave.open(str(wav), 'wb') as file:
    file.setnchannels(1)
    file.setsampwidth(2)
    file.setframerate(22050)
    file.writeframes(b'\0\0' * 11025)
try:
    sound = pygame.mixer.Sound(str(wav))
    assert abs(sound.get_length() - 0.5) < 0.01
    channel = sound.play()
    assert channel is not None and channel.get_busy() and sound.get_num_channels() == 1
    pygame.display.flip()
    assert any(command[0] == 'play' for command in sent[-1]['audio'])
    pygame.display.flip()  # the scripted host reports the end
    assert not channel.get_busy()
    pygame.mixer.music.load(str(wav))
    pygame.mixer.music.play(-1)
    assert pygame.mixer.music.get_busy()
    pygame.mixer.music.pause()
    assert not pygame.mixer.music.get_busy()
    pygame.mixer.music.stop()
    assert pygame.mixer.get_init() == (44100, -16, 2)
finally:
    wav.unlink()

# An image cursor is drawn on the screen and the system cursor hidden; pixels come back -------
cursor = pygame.Surface((4, 4))
cursor.fill('red')
screen.fill('black')
pygame.mouse.set_cursor((0, 0), cursor)
pygame.display.flip()
assert sent[-1]['cursor'] is False
assert screen.get_at((40, 50))[:3] == (0, 0, 0), 'the game keeps its own pixels'
pygame.mouse.set_visible(True)

# Objectives see live sprites --------------------------------------------------------------------
hero = pygame.sprite.Sprite(pygame.sprite.Group())
hero.rect = pygame.Rect(10, 10, 20, 20)
pygame.display.flip()
assert sent[-1]['actors'] == [] or [id(hero), 20.0, 20.0] in sent[-1]['actors']


def pose_ids():
    return {pose[0] for pose in _szpygame._sprite_poses()}


class Jogador(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((8, 8))
        self.rect = self.image.get_rect(center=(50, 60))


# A player drawn with blit and no Group is in play; a killed or removed sprite is not.
player = Jogador()
assert (id(player), 50.0, 60.0) in _szpygame._sprite_poses()
group = pygame.sprite.Group()
enemy = Jogador()
group.add(enemy)
fallen = Jogador()
group.add(fallen)
assert {id(player), id(enemy), id(fallen), id(hero)} <= pose_ids()
fallen.kill()
group.remove(enemy)
assert id(player) in pose_ids() and id(fallen) not in pose_ids() and id(enemy) not in pose_ids()

# "Just pressed" survives frames that only wait (Clock.tick): read after event.get, a key that
# arrived with flip and one that arrived while tick(30) waited at 60 Hz are both there -------
pygame.event.clear()
game_clock = pygame.time.Clock()
game_clock.tick()
for _ in range(3):
    queue.append([['kd', pygame.K_1, 0, '1'], ['ku', pygame.K_1, 0]])  # with flip
    pygame.display.flip()
    queue.append([['kd', pygame.K_2, 0, '2'], ['ku', pygame.K_2, 0]])  # while tick waits
    game_clock.tick(30)
    pygame.event.get()
    just, released = pygame.key.get_just_pressed(), pygame.key.get_just_released()
    assert just[pygame.K_1] and just[pygame.K_2], 'no press may be lost'
    assert released[pygame.K_1] and released[pygame.K_2]
pygame.event.get()
assert not pygame.key.get_just_pressed()[pygame.K_1], 'a pump with nothing new clears'
queue.append([['md', 5, 5, 1], ['mu', 5, 5, 1]])
pygame.display.flip()
assert not pygame.mouse.get_just_pressed()[0]
pygame.event.get(pump=False)
assert not pygame.mouse.get_just_pressed()[0], 'get(pump=False) does not pump'
pygame.event.poll()
assert pygame.mouse.get_just_pressed()[0] and pygame.mouse.get_just_released()[0]
pygame.event.clear()

# Key repeat follows the clock: a late frame sends one repeat, not a burst -------------------
pygame.key.set_repeat(100, 100)
queue.append([['kd', pygame.K_LEFT, 0, '']])
pygame.display.flip()
pygame.event.clear()
clock['now'] += 1000  # the tab was busy for a second
pygame.display.flip()
repeats = [event for event in pygame.event.get() if event.type == pygame.KEYDOWN]
assert len(repeats) == 1, len(repeats)
later = 0
for _ in range(5):  # 83 ms: before, every one of these frames sent a repeat to catch up
    pygame.display.flip()
    later += sum(1 for event in pygame.event.get() if event.type == pygame.KEYDOWN)
assert later <= 1, later
queue.append([['ku', pygame.K_LEFT, 0]])
pygame.display.flip()
pygame.key.set_repeat()
pygame.event.clear()

# SCALED: the window is the game's surface (the page fits it); the frame says its size -------
scaled = pygame.display.set_mode((160, 120), pygame.SCALED)
assert scaled.get_size() == (160, 120) and pygame.display.get_window_size() == (160, 120)
pygame.display.flip()
assert (sent[-1]['w'], sent[-1]['h']) == (160, 120)

# message_box would need a browser dialog the worker does not have: a clear error -----------
try:
    pygame.display.message_box('Fim', 'Você venceu!')
except pygame.error as error:
    assert 'message_box' in str(error)
else:
    raise AssertionError('message_box must explain itself')

# The mixer: a paused channel is busy (SDL_mixer), so a new sound never takes it -------------
wav = root / 'test-pygame-bridge-2.wav'
with wave.open(str(wav), 'wb') as file:
    file.setnchannels(1)
    file.setsampwidth(2)
    file.setframerate(22050)
    file.writeframes(b'\0\0' * 22050)
try:
    sent.clear()
    sound = pygame.mixer.Sound(str(wav))
    pygame.mixer.set_num_channels(2)
    first = sound.play(loops=-1)
    pygame.mixer.pause()
    assert first.get_busy() and pygame.mixer.get_busy() and sound.get_num_channels() == 1
    second = sound.play(loops=-1)
    assert second is not None and second is not first and first.get_busy()
    assert sound.play() is None, 'both channels are busy: one paused, one playing'
    pygame.mixer.unpause()
    pygame.mixer.stop()
    assert not pygame.mixer.get_busy()
    pygame.display.flip()
    # 64 channels playing: stop, pause and unpause are one command each, within the frame limit.
    pygame.mixer.set_num_channels(64)
    for index in range(64):
        pygame.mixer.Channel(index).play(sound, loops=-1)
        if index % 16 == 15:
            pygame.display.flip()
    for action, kind in ((pygame.mixer.pause, 'pause'), (pygame.mixer.unpause, 'resume'),
                         (pygame.mixer.stop, 'stop')):
        action()
        pygame.display.flip()
        audio = sent[-1]['audio']
        assert len(audio) == 1 and audio[0][0] == kind and len(audio[0][1]) == 64, audio
    pygame.mixer.set_num_channels(8)
    # music.rewind keeps the loops; music.queue keeps the queued track's loops.
    pygame.mixer.music.load(str(wav))
    pygame.mixer.music.play(loops=3)
    pygame.display.flip()
    pygame.mixer.music.rewind()
    pygame.display.flip()
    plays = [command for command in sent[-1]['audio'] if command[0] == 'play']
    assert plays and plays[-1][3] == 3 and plays[-1][5] is True, sent[-1]['audio']
    pygame.mixer.music.queue(str(wav), loops=2)
    music = _szpygame.mixer._music
    music_voice = music._voice
    _sz.audio_ended([music_voice])
    assert pygame.mixer.music.get_busy() and music._loops == 2 and music._voice != music_voice
    pygame.mixer.music.stop()
    pygame.display.flip()
finally:
    wav.unlink()

# MP3 length: MPEG-2 layer III and an MPEG-1 VBR file (Xing frame count) ----------------------
mp3_length = _szpygame.mixer._mp3_length
mpeg2 = b'\xff\xf3\x80\x00' + bytes(7996)  # MPEG-2 layer III, 64 kbit/s, 22 050 Hz
assert abs(mp3_length(mpeg2) - 1.0) < 1e-9, mp3_length(mpeg2)
xing = b'\xff\xfb\x90\x00' + bytes(32) + b'Xing' + (1).to_bytes(4, 'big') + (100).to_bytes(4, 'big')
assert abs(mp3_length(xing + bytes(4000)) - 100 * 1152 / 44100) < 1e-9

# event.wait without a window would wait forever: it explains instead ------------------------
pygame.display.quit()
pygame.display.init()
try:
    pygame.event.wait()
except pygame.error as error:
    assert 'set_mode' in str(error)
else:
    raise AssertionError('event.wait without a window must explain itself')
assert pygame.event.wait(100).type == pygame.NOEVENT
print('ponte pygame ok')
