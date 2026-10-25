"""Sistema Zero host bridge for the real pygame-ce (configured by the runtime, never by learners).

pygame-ce itself draws: surfaces, blits, transforms, masks, fonts, sprites, rects and vectors
run exactly as in the desktop library. Only the edges that touch the browser are replaced:

* ``display.flip``/``update`` send the screen (SDL copies it into the worker's canvas) and wait
  for the next paint, which is the game's frame clock;
* keyboard and mouse state, and their events, arrive from the browser with each frame;
* ``time.Clock``, ``set_timer``, ``delay`` and ``event.wait`` follow that frame clock (there are
  no threads, and waiting in a loop would freeze the page);
* ``pygame.mixer`` plays through the Studio's media service (see ``mixer.py``).

A project with its own ``pygame.py`` (or ``pygame/``) keeps it: nothing here is installed then.
"""
from collections import deque

from pgzero import _sz

pygame = None
_original = {}
_title = 'pygame window'
# Window size the browser can show (kept in sync with the renderer).
MAX_WIDTH = 1920
MAX_HEIGHT = 1080
# More than this without a frame and an event loop is waiting: let the browser deliver input.
_IDLE_EXCHANGE_MS = 50

_pressed = set()
# Keys and buttons pressed or released since the last pump (they arrived with the frames).
_arrived_pressed = set()
_arrived_released = set()
_arrived_mouse_pressed = set()
_arrived_mouse_released = set()
# What the last pump brought, as SDL keeps it: get_just_pressed() reads these.
_just_pressed = set()
_just_released = set()
_mods = 0
_mouse_pos = (0, 0)
_mouse_rel = [0, 0]
_mouse_buttons = set()
_mouse_just_pressed = set()
_mouse_just_released = set()
_mouse_visible = True
_cursor = None
_text_input = True
_repeat = (0, 0)
_repeating = {}
_timers = {}
_last_exchange = 0
_scancodes = {}
# Objectives that watch a sprite move: the live pygame sprites, sent with each frame.
_tracked = None
# Sprites that have been in a group: once in none (kill, remove), they left the game.
_grouped = None
MAX_TRACKED_SPRITES = 2048


def install(mission=False):
    """Patch the imported pygame-ce package; called once, before the learner program runs."""
    global pygame, _tracked, _grouped
    import pygame as module
    pygame = module
    if mission:
        import weakref
        _tracked = weakref.WeakSet()
        _grouped = weakref.WeakSet()
        sprite_class = pygame.sprite.Sprite
        original_init = sprite_class.__init__
        original_add_internal = sprite_class.add_internal

        def tracked_init(self, *groups):
            original_init(self, *groups)
            if len(_tracked) < MAX_TRACKED_SPRITES:
                _remember(_tracked, self)

        def tracked_add_internal(self, group):
            original_add_internal(self, group)
            _remember(_grouped, self)

        sprite_class.__init__ = tracked_init
        sprite_class.add_internal = tracked_add_internal
    display, event, key, mouse, time = (pygame.display, pygame.event, pygame.key, pygame.mouse,
                                        pygame.time)
    for owner, names in ((pygame, ('init', 'quit')),
                         (display, ('set_mode', 'flip', 'update', 'set_caption', 'toggle_fullscreen')),
                         (event, ('get', 'poll', 'wait', 'peek', 'pump', 'clear')),
                         (mouse, ('set_cursor', 'get_cursor', 'set_visible', 'get_visible', 'set_pos')),
                         (time, ('set_timer', 'delay', 'wait'))):
        for name in names:
            _original[owner.__name__ + '.' + name] = getattr(owner, name)
    pygame.init = init
    pygame.quit = quit
    display.set_mode = set_mode
    display.flip = flip
    display.update = update
    display.set_caption = set_caption
    display.toggle_fullscreen = lambda: 0
    display.is_fullscreen = lambda: False
    display.message_box = message_box
    event.get = event_get
    event.poll = event_poll
    event.wait = event_wait
    event.peek = event_peek
    event.pump = event_pump
    event.clear = event_clear
    key.get_pressed = get_pressed
    key.get_just_pressed = get_just_pressed
    key.get_just_released = get_just_released
    key.get_mods = lambda: _mods
    key.set_mods = _set_mods
    key.get_focused = lambda: True
    key.set_repeat = set_repeat
    key.get_repeat = lambda: _repeat
    key.start_text_input = _start_text_input
    key.stop_text_input = _stop_text_input
    mouse.get_pos = lambda: _mouse_pos
    mouse.get_rel = get_rel
    mouse.get_pressed = mouse_get_pressed
    mouse.get_just_pressed = mouse_get_just_pressed
    mouse.get_just_released = mouse_get_just_released
    mouse.get_focused = lambda: True
    mouse.set_pos = set_pos
    mouse.set_visible = set_visible
    mouse.get_visible = lambda: _mouse_visible
    mouse.set_cursor = set_cursor
    mouse.get_cursor = get_cursor
    time.Clock = Clock
    time.set_timer = set_timer
    time.delay = delay
    time.wait = wait
    pygame.Clock = Clock
    from . import mixer
    mixer.install(pygame)


def _remember(sprites, sprite):
    try:
        sprites.add(sprite)
    except TypeError:
        pass  # a class that defines __eq__ without __hash__: it cannot be observed


def _scancode_table():
    """keycode → scancode, read from pygame itself once SDL has started (before, it maps nothing).

    ScancodeWrapper turns a keycode into its scancode to index the tuple: a tuple holding each
    scancode at its own index answers with the scancode.
    """
    if not _scancodes and pygame.get_init():
        probe = pygame.key.ScancodeWrapper(range(512))
        for name, value in vars(pygame.constants).items():
            if name.startswith('K_') and isinstance(value, int) and probe[value]:
                _scancodes[value] = probe[value]
    return _scancodes


# Initialization ------------------------------------------------------------------------------

def init():
    passed, failed = _original['pygame.init']()
    # The desktop mixer opens a sound card; here sound goes to the Studio (mixer.py).
    from . import mixer
    mixer.init()
    return passed + failed, 0


def quit():
    from . import mixer
    _timers.clear()
    _pressed.clear()
    _mouse_buttons.clear()
    _repeating.clear()
    for codes in (_arrived_pressed, _arrived_released, _arrived_mouse_pressed,
                  _arrived_mouse_released, _just_pressed, _just_released, _mouse_just_pressed,
                  _mouse_just_released):
        codes.clear()
    mixer.quit()
    _original['pygame.quit']()


def set_mode(size=(0, 0), flags=0, depth=0, display=0, vsync=0):
    width, height = (int(size[0]), int(size[1])) if size else (0, 0)
    if flags & getattr(pygame, 'OPENGL', 0):
        raise pygame.error('No Estúdio, a janela do Pygame-ce não usa OpenGL. Tire OPENGL de set_mode.')
    if width <= 0 or height <= 0:
        width, height = width if width > 0 else 1280, height if height > 0 else 720
    if width > MAX_WIDTH or height > MAX_HEIGHT:
        raise pygame.error(f'A janela pode ter até {MAX_WIDTH} × {MAX_HEIGHT} pixels '
                           f'(pedido: {width} × {height}).')
    # The page already fits the window to the frame (keeping the pixels sharp). SCALED would make
    # SDL draw a bigger window than the game's surface; FULLSCREEN and RESIZABLE do not exist here.
    flags &= ~(getattr(pygame, 'FULLSCREEN', 0) | getattr(pygame, 'RESIZABLE', 0)
               | getattr(pygame, 'SCALED', 0))
    return _original['pygame.display.set_mode']((width, height), flags, depth, display, vsync)


def set_caption(title, icontitle=None):
    global _title
    _title = str(title)
    if icontitle is None:
        return _original['pygame.display.set_caption'](title)
    return _original['pygame.display.set_caption'](title, icontitle)


# Frames --------------------------------------------------------------------------------------

def flip():
    _present(_original['pygame.display.flip'])


def update(rectangle=None, *rectangles):
    # The browser always receives the whole screen: updating part of it shows the same pixels.
    _present(_original['pygame.display.flip'])


def _present(sdl_flip):
    screen = pygame.display.get_surface()
    if screen is None:
        sdl_flip()  # raises pygame's own error (no video mode)
        return
    width, height = screen.get_size()
    saved = _draw_cursor(screen)
    try:
        sdl_flip()  # SDL copies the screen into the worker's canvas (RGBA)
    finally:
        if saved is not None:
            screen.blit(*saved)
    _sz.frame.begin()
    _sz.frame.record(_sz.OP_PIXELS, width, height)
    hide = not _mouse_visible or _cursor is not None and _cursor.type == 'color'
    # A batch with a record is a new frame (keep=False): the PIXELS record covers the whole screen.
    reply = _sz.present(width, height, _title, cursor=not hide, actors=_sprite_poses())
    _receive(reply)


def _sprite_poses():
    """(id, x, y) of the centre of every sprite in play, for objectives (None without them).

    In play: in a group, or never in one (a player drawn with blit, without a Group). A sprite
    that left every group it was in (kill, remove) is out.
    """
    if _tracked is None:
        return None
    poses = []
    for sprite in list(_tracked):
        rect = getattr(sprite, 'rect', None)
        if rect is None or sprite in _grouped and not sprite.alive():
            continue
        try:
            x, y = rect.center
        except (TypeError, ValueError, AttributeError):
            continue
        poses.append((id(sprite), float(x), float(y)))
    return poses


def _wait_frame():
    """Wait for the next paint without showing a new screen; input and sound reports arrive."""
    surface = pygame.display.get_surface() if pygame.display.get_init() else None
    if surface is None:
        return  # no window yet: nothing to wait for
    width, height = surface.get_size()
    _sz.frame.begin()
    # No record: the browser keeps the screen it shows (keep=True).
    reply = _sz.present(width, height, _title)
    _receive(reply)


def _draw_cursor(screen):
    """An image cursor is part of the screen, as SDL draws it; the game's pixels come back."""
    if _cursor is None or _cursor.type != 'color' or not _mouse_visible:
        return None
    image = _cursor.data[1]
    hotspot = _cursor.data[0]
    place = image.get_rect(topleft=(_mouse_pos[0] - hotspot[0], _mouse_pos[1] - hotspot[1]))
    area = place.clip(screen.get_rect())
    if not area.width or not area.height:
        return None
    saved = screen.subsurface(area).copy()
    screen.blit(image, place)
    return saved, area


def _ticks():
    return pygame.time.get_ticks()


def _receive(reply):
    global _last_exchange, _mouse_pos, _mods
    _last_exchange = _ticks()
    post = _post
    Event = pygame.event.Event
    for item in reply.get('events', ()):
        kind = item[0]
        if kind == 'kd':
            code, _mods = int(item[1]), int(item[2])
            text = str(item[3])
            scancode = _scancode_table().get(code, 0)
            if code not in _pressed:
                _arrived_pressed.add(code)
            _pressed.add(code)
            post(Event(pygame.KEYDOWN, key=code, mod=_mods, unicode=text, scancode=scancode,
                       window=None))
            if _text_input and text and text.isprintable() and not _mods & (pygame.KMOD_CTRL | pygame.KMOD_ALT | pygame.KMOD_META):
                post(Event(pygame.TEXTINPUT, text=text, window=None))
            if _repeat[0] > 0:
                _repeating[code] = (_last_exchange + _repeat[0], text)
        elif kind == 'ku':
            code, _mods = int(item[1]), int(item[2])
            _pressed.discard(code)
            _arrived_released.add(code)
            _repeating.pop(code, None)
            post(Event(pygame.KEYUP, key=code, mod=_mods, unicode='',
                       scancode=_scancode_table().get(code, 0), window=None))
        elif kind in ('md', 'mu'):
            _mouse_pos = (int(item[1]), int(item[2]))
            button = int(item[3])
            down = kind == 'md'
            if down:
                _mouse_buttons.add(button)
                _arrived_mouse_pressed.add(button)
            else:
                _mouse_buttons.discard(button)
                _arrived_mouse_released.add(button)
            if down and button in (4, 5):
                step = 1 if button == 4 else -1
                post(Event(pygame.MOUSEWHEEL, x=0, y=step, flipped=False, precise_x=0.0,
                           precise_y=float(step), touch=False, window=None))
            post(Event(pygame.MOUSEBUTTONDOWN if down else pygame.MOUSEBUTTONUP,
                       pos=_mouse_pos, button=button, touch=False, window=None))
        elif kind == 'mm':
            _mouse_pos = (int(item[1]), int(item[2]))
            rel = (int(item[3]), int(item[4]))
            _mouse_rel[0] += rel[0]
            _mouse_rel[1] += rel[1]
            mask = int(item[5])
            post(Event(pygame.MOUSEMOTION, pos=_mouse_pos, rel=rel,
                       buttons=tuple(int(bool(mask & (1 << n))) for n in range(3)),
                       touch=False, window=None))
    _fire_repeats()
    _fire_timers()


def _post(item):
    try:
        pygame.event.post(item)
    except pygame.error:
        pass  # the queue is full, as in SDL: the event is lost


def _idle():
    """An event loop without frames still receives input (one paint at most every 50 ms)."""
    if pygame.display.get_init() and _ticks() - _last_exchange > _IDLE_EXCHANGE_MS:
        _wait_frame()


def _pump():
    """What SDL does when the game pumps events (event.get, poll, wait, peek, clear, pump).

    Like pygame-ce, key.get_just_pressed()/get_just_released() and their mouse twins tell what
    arrived since the previous pump: frames that only wait (Clock.tick, delay) keep the presses
    for the next pump instead of losing them.
    """
    _idle()
    for just, arrived in ((_just_pressed, _arrived_pressed), (_just_released, _arrived_released),
                          (_mouse_just_pressed, _arrived_mouse_pressed),
                          (_mouse_just_released, _arrived_mouse_released)):
        just.clear()
        just.update(arrived)
        arrived.clear()


# Events --------------------------------------------------------------------------------------

def event_get(eventtype=None, pump=True, exclude=None):
    if pump:
        _pump()
    if exclude is not None:
        return _original['pygame.event.get'](eventtype, pump, exclude)
    return _original['pygame.event.get'](eventtype, pump)


def event_poll():
    _pump()
    return _original['pygame.event.poll']()


def event_peek(eventtype=None, pump=True):
    if pump:
        _pump()
    return _original['pygame.event.peek'](eventtype, pump)


def event_pump():
    _pump()
    return _original['pygame.event.pump']()


def event_clear(eventtype=None, pump=True):
    if pump:
        _pump()
    return _original['pygame.event.clear'](eventtype, pump)


def event_wait(timeout=0):
    """Wait for an event frame by frame (SDL would wait in a loop and freeze the page)."""
    start = _ticks()
    while True:
        _pump()
        item = _original['pygame.event.poll']()
        if item.type != pygame.NOEVENT:
            return item
        if timeout and _ticks() - start >= timeout:
            return item
        if pygame.display.get_surface() is None:
            # Input and timers arrive with the frames of a window: without one, nothing would
            # ever come, and waiting would freeze the page.
            if timeout:
                return item
            raise pygame.error('pygame.event.wait() espera um evento da janela do jogo: chame '
                               'pygame.display.set_mode antes de esperar.')
        _wait_frame()


def message_box(title, message=None, message_type='info', parent_window=None, buttons=('OK',),
                return_button=0, escape_button=None):
    """SDL would open a browser dialog, which the game's worker does not have."""
    raise pygame.error('No Estúdio, pygame.display.message_box não abre janelas: mostre a mensagem '
                       'na tela do jogo (por exemplo, com pygame.font).')


# Keyboard and mouse ---------------------------------------------------------------------------

def _state(codes):
    state = [False] * 512
    table = _scancode_table()
    for code in codes:
        scancode = table.get(code)
        if scancode is not None:
            state[scancode] = True
    return pygame.key.ScancodeWrapper(state)


def get_pressed():
    _idle()
    return _state(_pressed)


def get_just_pressed():
    return _state(_just_pressed)


def get_just_released():
    return _state(_just_released)


def _set_mods(mods):
    global _mods
    _mods = int(mods)


def set_repeat(delay=0, interval=0):
    global _repeat
    if delay < 0 or interval < 0:
        raise pygame.error('O atraso e o intervalo da repetição de teclas não podem ser negativos.')
    if delay and not interval:
        interval = delay
    _repeat = (int(delay), int(interval))
    if not delay:
        _repeating.clear()


def _fire_repeats():
    if not _repeating:
        return
    now = _last_exchange
    for code, (due, text) in tuple(_repeating.items()):
        if code not in _pressed:
            del _repeating[code]
            continue
        if now >= due:
            _post(pygame.event.Event(pygame.KEYDOWN, key=code, mod=_mods, unicode=text,
                                     scancode=_scancode_table().get(code, 0), window=None))
            # Like set_timer: a late frame sends one repeat, not a burst of them.
            _repeating[code] = (max(due + max(1, _repeat[1]), now + 1), text)


def _start_text_input():
    global _text_input
    _text_input = True


def _stop_text_input():
    global _text_input
    _text_input = False


def get_rel():
    rel = tuple(_mouse_rel)
    _mouse_rel[0] = _mouse_rel[1] = 0
    return rel


def mouse_get_pressed(num_buttons=3):
    if num_buttons not in (3, 5):
        raise ValueError('Number of buttons needs to be 3 or 5.')
    _idle()
    return tuple(button in _mouse_buttons for button in range(1, num_buttons + 1))


def mouse_get_just_pressed():
    return tuple(button in _mouse_just_pressed for button in range(1, 6))


def mouse_get_just_released():
    return tuple(button in _mouse_just_released for button in range(1, 6))


def set_pos(*position):
    global _mouse_pos
    if len(position) == 1:
        position = position[0]
    _mouse_pos = (int(position[0]), int(position[1]))


def set_visible(value):
    global _mouse_visible
    previous = _mouse_visible
    _mouse_visible = bool(value)
    return int(previous)


def set_cursor(*args):
    """Keep the cursor as pygame describes it; an image cursor is drawn on the screen."""
    global _cursor
    _cursor = pygame.cursors.Cursor(*args) if args else pygame.cursors.Cursor()


def get_cursor():
    return _cursor if _cursor is not None else pygame.cursors.Cursor(pygame.SYSTEM_CURSOR_ARROW)


# Time ----------------------------------------------------------------------------------------

class Clock:
    """pygame.time.Clock on the browser's frame clock (it never waits in a loop)."""

    def __init__(self):
        self._last = None
        self._time = 0
        self._raw = 0
        self._samples = deque(maxlen=10)

    def tick(self, framerate=0):
        now = _ticks()
        if self._last is not None and framerate and framerate > 0:
            # Fewer frames per second than the display: let paints pass (half a frame early
            # counts, as SDL_Delay wakes on the millisecond, not on the paint).
            target = 1000.0 / framerate
            raw = now - self._last
            while _ticks() - self._last + 8 < target:
                _wait_frame()
            self._raw = raw
            now = _ticks()
        elif self._last is not None:
            self._raw = now - self._last
        self._time = 0 if self._last is None else now - self._last
        self._last = now
        if self._time:
            self._samples.append(self._time)
        return self._time

    tick_busy_loop = tick

    def get_time(self):
        return self._time

    def get_rawtime(self):
        return self._raw

    def get_fps(self):
        if not self._samples:
            return 0.0
        return 1000.0 / (sum(self._samples) / len(self._samples))

    def __repr__(self):
        return f'<Clock(fps={self.get_fps():.2f})>'


def set_timer(event, millis, loops=0):
    if isinstance(event, pygame.event.EventType):
        kind, item = event.type, event
    else:
        kind = int(event)
        if not pygame.NOEVENT < kind < pygame.NUMEVENTS:
            raise ValueError('Invalid event type')
        item = None
    millis = int(millis)
    if millis <= 0:
        _timers.pop(kind, None)
        return
    if len(_timers) >= 32 and kind not in _timers:
        raise pygame.error('O jogo já tem 32 temporizadores ligados (set_timer).')
    _timers[kind] = [millis, _ticks() + millis, int(loops), item]


def _fire_timers():
    now = _last_exchange
    for kind, timer in tuple(_timers.items()):
        millis, due, loops, item = timer
        if now < due:
            continue
        _post(item if item is not None else pygame.event.Event(kind))
        if loops == 1:
            del _timers[kind]
        else:
            # Like SDL: a late frame does not fire the same timer several times at once.
            timer[1] = max(due + millis, now + 1)
            if loops > 1:
                timer[2] = loops - 1


def delay(milliseconds):
    return _sleep(milliseconds)


def wait(milliseconds):
    return _sleep(milliseconds)


def _sleep(milliseconds):
    start = _ticks()
    milliseconds = int(milliseconds)
    if milliseconds <= 0:
        return 0
    if pygame.display.get_init() and pygame.display.get_surface() is not None:
        while _ticks() - start + 8 < milliseconds:
            _wait_frame()
    return _ticks() - start
