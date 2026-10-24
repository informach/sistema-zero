"""The Pygame Zero game loop for the Studio's browser runtime.

Same order as Pygame Zero 1.2.1: events, clock.tick(dt), update(dt), draw() when something may
have changed. Each frame is sent to the browser in one exchange that also brings back the
input that happened meanwhile.
"""
import operator
import sys

import pgzero.clock
import pgzero.keyboard
import pgzero.screen

from . import _sz, constants

screen = None
DISPLAY_FLAGS = 0
MAX_DT = 0.1
MAX_SIZE = (1920, 1080)


def exit():
    """Stop the game."""
    sys.exit()


def positional_parameters(handler):
    """Get the positional parameters of the given function."""
    code = handler.__code__
    return code.co_varnames[:code.co_argcount]


class _Event:
    __slots__ = ('type', 'pos', 'button', 'buttons', 'rel', 'key', 'mod', 'unicode')

    def __init__(self, kind, **values):
        self.type = kind
        for name in self.__slots__[1:]:
            setattr(self, name, values.get(name))


KEYDOWN, KEYUP, MOUSEBUTTONDOWN, MOUSEBUTTONUP, MOUSEMOTION = 'kd', 'ku', 'md', 'mu', 'mm'


def _events(raw):
    """Browser events → pygame-like events."""
    for item in raw:
        kind = item[0]
        if kind == KEYDOWN:
            yield _Event(KEYDOWN, key=int(item[1]), mod=int(item[2]), unicode=str(item[3]))
        elif kind == KEYUP:
            yield _Event(KEYUP, key=int(item[1]), mod=int(item[2]))
        elif kind in (MOUSEBUTTONDOWN, MOUSEBUTTONUP):
            yield _Event(kind, pos=(int(item[1]), int(item[2])), button=int(item[3]))
        elif kind == MOUSEMOTION:
            mask = int(item[5])
            yield _Event(
                kind,
                pos=(int(item[1]), int(item[2])),
                rel=(int(item[3]), int(item[4])),
                buttons=tuple(bool(mask & (1 << index)) for index in range(3)),
            )


class PGZeroGame:
    def __init__(self, mod):
        self.mod = mod
        self.screen = None
        self.width = None
        self.height = None
        self.title = None
        self.keyboard = pgzero.keyboard.keyboard
        self.handlers = {}

    def reinit_screen(self):
        """Read WIDTH, HEIGHT and TITLE (they may change while the game runs)."""
        global screen
        mod = self.mod
        w = getattr(mod, 'WIDTH', 800)
        h = getattr(mod, 'HEIGHT', 600)
        try:
            w, h = int(w), int(h)
        except (TypeError, ValueError):
            raise TypeError('WIDTH e HEIGHT precisam ser números inteiros.') from None
        if not (1 <= w <= MAX_SIZE[0] and 1 <= h <= MAX_SIZE[1]):
            raise ValueError('A janela do jogo pode ter no máximo 1920 × 1080 pixels.')
        changed = False
        if w != self.width or h != self.height:
            changed = self.width is not None
            if hasattr(mod, 'screen') and isinstance(mod.screen, pgzero.screen.Screen):
                mod.screen._resize(w, h)
            else:
                mod.screen = pgzero.screen.Screen(w, h)
            self.screen = screen = mod.screen
            self.width, self.height = w, h
        self.title = str(getattr(mod, 'TITLE', 'Pygame Zero Game'))
        return changed

    EVENT_HANDLERS = {
        MOUSEBUTTONDOWN: 'on_mouse_down',
        MOUSEBUTTONUP: 'on_mouse_up',
        MOUSEMOTION: 'on_mouse_move',
        KEYDOWN: 'on_key_down',
        KEYUP: 'on_key_up',
        constants.MUSIC_END: 'on_music_end',
    }

    def map_buttons(val):
        return {c for c, pressed in zip(constants.mouse, val) if pressed}

    EVENT_PARAM_MAPPERS = {
        'buttons': map_buttons,
        'button': constants.mouse,
        'key': constants.keys,
    }

    def load_handlers(self):
        from .spellcheck import spellcheck
        spellcheck(vars(self.mod))
        self.handlers = {}
        for type, name in self.EVENT_HANDLERS.items():
            handler = getattr(self.mod, name, None)
            if callable(handler):
                self.handlers[type] = self.prepare_handler(handler)

    def prepare_handler(self, handler):
        """Call the handler with only the parameters it names (pos, button, key…)."""
        code = handler.__code__
        param_names = code.co_varnames[:code.co_argcount]

        def make_getter(mapper, getter):
            if mapper:
                return lambda event: mapper(getter(event))
            return getter

        param_handlers = []
        for name in param_names:
            getter = operator.attrgetter(name)
            mapper = self.EVENT_PARAM_MAPPERS.get(name)
            param_handlers.append((name, make_getter(mapper, getter)))

        def prep_args(event):
            return {name: get(event) for name, get in param_handlers}

        def new_handler(event):
            try:
                prepped = prep_args(event)
            except ValueError:
                # Keys Pygame Zero has no constant for are skipped, like on the desktop.
                return
            else:
                return handler(**prepped)

        return new_handler

    def dispatch_event(self, event):
        handler = self.handlers.get(event.type)
        if handler:
            self.need_redraw = True
            handler(event)

    def get_update_func(self):
        try:
            update = self.mod.update
        except AttributeError:
            return None
        else:
            if update.__code__.co_argcount == 0:
                return lambda dt: update()
            return update

    def get_draw_func(self):
        try:
            draw = self.mod.draw
        except AttributeError:
            return lambda: None
        else:
            if draw.__code__.co_argcount != 0:
                raise TypeError("draw() não pode receber parâmetros.")
            return draw

    def run(self):
        self.mainloop()

    def mainloop(self):
        """Run the main loop: one browser frame per iteration."""
        self.reinit_screen()
        update = self.get_update_func()
        draw = self.get_draw_func()
        self.load_handlers()
        pgzclock = pgzero.clock.clock
        frame = _sz.frame
        self.need_redraw = True
        keep = True
        last = None
        while True:
            reply = _sz.present(self.width, self.height, self.title, keep)
            now = float(reply.get('now', 0.0))
            dt = 0.0 if last is None else min(MAX_DT, max(0.0, (now - last) / 1000.0))
            last = now
            # A page that loses focus releases its keys with key-up events (as SDL does).
            for event in _events(reply.get('events', ())):
                if event.type == KEYDOWN:
                    self.keyboard._press(event.key)
                elif event.type == KEYUP:
                    self.keyboard._release(event.key)
                self.dispatch_event(event)
            while _sz.posted:
                self.dispatch_event(_Event(_sz.posted.pop(0)))

            pgzclock.tick(dt)

            if update:
                update(dt)

            screen_change = self.reinit_screen()
            keep = True
            # Files still waiting to be sent arrive with the next frame: redraw so they appear.
            backlog = _sz.attachments_pending()
            if screen_change or update or pgzclock.fired or self.need_redraw or backlog:
                frame.reset()
                draw()
                keep = False
                self.need_redraw = False
