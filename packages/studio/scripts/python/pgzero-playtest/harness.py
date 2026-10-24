"""Scripted play of a gallery game on the real pgzero 1.2.1 + pygame-ce, frame by frame.

usage: python harness.py <game folder (SVGs already converted to PNG)> <script.py> <shots dir>

The script defines play(t). t drives the real PGZeroGame: keys are pressed through
keyboard._press + dispatch_event (exactly what mainloop does), the pgzero clock ticks 1/60 s,
update(dt) and draw() run, and t.shot() saves the real display surface.
"""
import os
import runpy
import sys
import types

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'

import pygame  # noqa: E402
import pgzero.clock  # noqa: E402
from pgzero.game import PGZeroGame  # noqa: E402
from pgzero.runner import prepare_mod  # noqa: E402

folder, script, shots = (os.path.abspath(path) for path in sys.argv[1:4])
os.makedirs(shots, exist_ok=True)
os.chdir(folder)
sys._pgzrun = True  # pgzrun.go() returns at once; we run the loop ourselves
path = os.path.join(folder, 'main.py')
mod = types.ModuleType('__main__')
mod.__file__ = path
sys.modules['__main__'] = mod
prepare_mod(mod)
exec(compile(open(path, encoding='utf-8').read(), path, 'exec'), mod.__dict__)

game = PGZeroGame(mod)
game.reinit_screen()
update = game.get_update_func()
draw = game.get_draw_func()
game.load_handlers()
clock = pgzero.clock.clock
KEYS = {name: getattr(pygame, 'K_' + name) for name in
        ['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE', 'RETURN', 'BACKSPACE', 'a', 'd', 'w', 's',
         'i', 'j', 'k', 'l', 't', 'f', 'g', 'h', 'q', 'n', '1', '2', '3']}


class Tester:
    frame = 0
    failures = []

    def step(self, n=1):
        for _ in range(n):
            clock.tick(1 / 60)
            if update:
                update(1 / 60)
            game.reinit_screen()
            draw()
            self.frame += 1

    def down(self, key):
        code = KEYS[key]
        game.keyboard._press(code)
        game.dispatch_event(pygame.event.Event(pygame.KEYDOWN, key=code, mod=0, unicode=' ' if key == 'SPACE' else key if len(key) == 1 else ''))

    def type(self, text):
        """Types each character of text (letters and digits only) as a key press."""
        for letra in text:
            self.tap(letra)

    def up(self, key):
        code = KEYS[key]
        game.keyboard._release(code)
        game.dispatch_event(pygame.event.Event(pygame.KEYUP, key=code, mod=0))

    def hold(self, key, frames):
        self.down(key)
        self.step(frames)
        self.up(key)

    def tap(self, key):
        self.down(key)
        self.step(1)
        self.up(key)

    def move(self, pos):
        game.dispatch_event(pygame.event.Event(pygame.MOUSEMOTION, pos=pos, rel=(0, 0), buttons=(0, 0, 0)))

    def drag(self, pos):
        """Moves the mouse with the left button held."""
        game.dispatch_event(pygame.event.Event(pygame.MOUSEMOTION, pos=pos, rel=(0, 0), buttons=(1, 0, 0)))

    def click(self, pos):
        game.dispatch_event(pygame.event.Event(pygame.MOUSEBUTTONDOWN, pos=pos, button=1))
        self.step(1)
        game.dispatch_event(pygame.event.Event(pygame.MOUSEBUTTONUP, pos=pos, button=1))

    def get(self, name):
        return mod.__dict__[name]

    def set(self, name, value):
        mod.__dict__[name] = value

    def until(self, condition, limit, key=None):
        """Steps (holding a key, if given) until condition() is true; returns the frames used."""
        if key:
            self.down(key)
        for used in range(limit):
            if condition():
                break
            self.step(1)
        else:
            used = limit
        if key:
            self.up(key)
        return used

    def shot(self, name):
        pygame.image.save(pygame.display.get_surface(), os.path.join(shots, name + '.png'))

    def check(self, label, ok, detail=''):
        print(('  ok  ' if ok else '  FALHOU ') + label + (f' ({detail})' if detail else ''))
        if not ok:
            self.failures.append(label)


t = Tester()
t.step(2)
runpy.run_path(script)['play'](t)
print('RESULTADO:', 'ok' if not t.failures else 'falhas: ' + ', '.join(t.failures))
sys.exit(1 if t.failures else 0)
