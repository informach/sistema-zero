"""Scripted play of a gallery game on the desktop raylib 6.0.1.0 (raylib-python-cffi), frame by frame.

usage: <python with raylib==6.0.1.0> -I harness.py <game folder> <script.py> <shots dir>

A Raylib game owns its loop (`while not window_should_close():`), so the harness drives it from
inside: before main.py runs, the input and time functions of the real `pyray` (and their C
names in `raylib`) are swapped for scripted ones. Every call to `window_should_close()` is one
frame: it advances the script, a generator `play(t)` where each `yield` lets the game run one
frame. Time is exactly 1/60 s per frame, the window is hidden and nothing waits for the clock.

The script reads the game's own variables through `t.game` and calls `t.check(...)`; the run
fails (exit 1) when a check fails or the game ends before the script.
"""
import os
import random
import runpy
import sys

import pyray
import raylib

folder, script, shots = (os.path.abspath(path) for path in sys.argv[1:4])
os.makedirs(shots, exist_ok=True)
os.chdir(folder)

real = {name: getattr(pyray, name) for name in dir(pyray) if not name.startswith('_')}
DT = 1 / 60


class Tester:
    def __init__(self):
        self.frame = 0
        self.failures = []
        self.down_keys = set()
        self.pressed = set()
        self.released = set()
        self.mouse = pyray.Vector2(0, 0)
        self.buttons_down = set()
        self.buttons_pressed = set()
        self.buttons_released = set()
        self.game = None
        self.closing = False

    # -- script helpers ------------------------------------------------------------------
    def key(self, name):
        return getattr(pyray, name if name.startswith('KEY_') else 'KEY_' + name)

    def hold(self, *names):
        for name in names:
            code = self.key(name)
            if code not in self.down_keys:
                self.pressed.add(code)
            self.down_keys.add(code)

    def release(self, *names):
        for name in names:
            code = self.key(name)
            if code in self.down_keys:
                self.released.add(code)
            self.down_keys.discard(code)

    def tap(self, name, frames=2):
        """Holds a key for a few frames and lets it go (a quick press)."""
        self.hold(name)
        for _ in range(frames):
            yield
        self.release(name)
        yield

    def wait(self, frames):
        for _ in range(frames):
            yield

    def click(self, x, y, button=0):
        self.mouse = pyray.Vector2(x, y)
        self.buttons_down.add(button)
        self.buttons_pressed.add(button)
        yield
        self.buttons_down.discard(button)
        self.buttons_released.add(button)
        yield

    def move_mouse(self, x, y):
        self.mouse = pyray.Vector2(x, y)

    def check(self, condition, message):
        if not condition:
            self.failures.append(f'quadro {self.frame}: {message}')
            print('FALHOU:', self.failures[-1], flush=True)

    def shot(self, name):
        image = real['load_image_from_screen']()
        real['export_image'](image, os.path.join(shots, f'{name}.png'))
        real['unload_image'](image)

    def end(self):
        self.closing = True


t = Tester()
namespace = {}
runpy_script = runpy.run_path(script)
play = runpy_script['play']
generator = None


def window_should_close():
    global generator
    if t.closing:
        return True
    if generator is None:
        generator = play(t)
    else:
        t.frame += 1
        # Edges last one frame, as in raylib's PollInputEvents.
        t.pressed.clear()
        t.released.clear()
        t.buttons_pressed.clear()
        t.buttons_released.clear()
    try:
        next(generator)
    except StopIteration:
        t.closing = True
        return True
    return False


def set_target_fps(fps, /):
    real['set_target_fps'](0)


def init_window(width, height, title, /):
    real['set_config_flags'](pyray.FLAG_WINDOW_HIDDEN)
    real['init_window'](width, height, title)
    real['set_target_fps'](0)


SCRIPTED = {
    'window_should_close': window_should_close,
    'set_target_fps': set_target_fps,
    'init_window': init_window,
    'get_frame_time': lambda: DT,
    'get_time': lambda: t.frame * DT,
    'get_fps': lambda: 60,
    'is_key_down': lambda key, /: key in t.down_keys,
    'is_key_up': lambda key, /: key not in t.down_keys,
    'is_key_pressed': lambda key, /: key in t.pressed,
    'is_key_released': lambda key, /: key in t.released,
    'is_key_pressed_repeat': lambda key, /: False,
    'get_key_pressed': lambda: min(t.pressed) if t.pressed else 0,
    'get_char_pressed': lambda: 0,
    'get_mouse_position': lambda: pyray.Vector2(t.mouse.x, t.mouse.y),
    'get_mouse_x': lambda: int(t.mouse.x),
    'get_mouse_y': lambda: int(t.mouse.y),
    'get_mouse_delta': lambda: pyray.Vector2(0, 0),
    'get_mouse_wheel_move': lambda: 0.0,
    'is_mouse_button_down': lambda button, /: button in t.buttons_down,
    'is_mouse_button_up': lambda button, /: button not in t.buttons_down,
    'is_mouse_button_pressed': lambda button, /: button in t.buttons_pressed,
    'is_mouse_button_released': lambda button, /: button in t.buttons_released,
}
C_NAMES = {
    'window_should_close': 'WindowShouldClose',
    'get_frame_time': 'GetFrameTime',
    'get_time': 'GetTime',
    'is_key_down': 'IsKeyDown',
    'is_key_pressed': 'IsKeyPressed',
    'is_key_released': 'IsKeyReleased',
    'is_mouse_button_down': 'IsMouseButtonDown',
    'is_mouse_button_pressed': 'IsMouseButtonPressed',
    'get_mouse_position': 'GetMousePosition',
}
for name, function in SCRIPTED.items():
    setattr(pyray, name, function)
    if name in C_NAMES and hasattr(raylib, C_NAMES[name]):
        setattr(raylib, C_NAMES[name], function)

# The game's random draws are the same on every run.
random.seed(2026)
real['set_random_seed'](2026)

path = os.path.join(folder, 'main.py')
module = {'__name__': '__main__', '__file__': path}
t.game = module
code = compile(open(path, encoding='utf-8').read(), path, 'exec')
try:
    exec(code, module)
finally:
    if real['is_window_ready']():
        real['close_window']()

if not t.closing:
    t.failures.append('o jogo terminou antes do roteiro')
if t.failures:
    print('\n'.join(t.failures))
    sys.exit(1)
print(f'ok: {t.frame} quadros')
