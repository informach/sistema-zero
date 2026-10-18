"""L0 feasibility slice only. This is not the contracted Turtle implementation.

Python owns geometry and callback scheduling; the host only draws batches and
returns input at explicit pump points. Unsupported APIs are deliberately absent.
"""
import heapq
import json
import math
import time
import traceback
from pyodide.ffi import run_sync
from js import l0Pump

_screen = None


def _dispatch(callback):
    # Tkinter reports callback errors and continues dispatching. Match that
    # control flow while reporting through the browser's normal stderr channel.
    try:
        callback()
    except SystemExit:
        raise
    except BaseException:
        traceback.print_exc()


class _Screen:
    def __init__(self):
        self._commands = []
        self._timers = []
        self._timer_sequence = 0
        self._keys = {}
        self._tracing = 1
        self._delay = 10
        self._closed = False
        self._listening = False

    def _pump(self, delay=0):
        commands, self._commands = self._commands, []
        incoming = json.loads(run_sync(l0Pump(json.dumps(commands), delay)))
        for event in incoming:
            if event.get('type') == 'key' and self._listening:
                callback = self._keys.get(event.get('key'))
                if callback is not None:
                    _dispatch(callback)
        now = time.monotonic()
        # Remove timers before calling them: callbacks may schedule or pump again.
        while self._timers and self._timers[0][0] <= now and not self._closed:
            _, _, callback = heapq.heappop(self._timers)
            _dispatch(callback)

    def tracer(self, n=None, delay=None):
        if n is None:
            return self._tracing
        if n not in (0, 1):
            raise NotImplementedError('L0 only measures tracer(0) and tracer(1)')
        self._tracing = n
        if delay is not None:
            self._delay = delay

    def update(self):
        self._pump()

    def ontimer(self, fun, t=0):
        self._timer_sequence += 1
        heapq.heappush(self._timers, (time.monotonic() + t / 1000, self._timer_sequence, fun))

    def listen(self):
        self._listening = True

    def onkeypress(self, fun, key=None):
        if key is None:
            raise NotImplementedError('L0 requires a named key')
        if fun is None:
            self._keys.pop(key, None)
        else:
            self._keys[key] = fun

    def mainloop(self):
        while not self._closed:
            self._pump(1)

    def bye(self):
        self._closed = True
        self._timers.clear()
        self._keys.clear()


def Screen():
    global _screen
    if _screen is None or _screen._closed:
        _screen = _Screen()
    return _screen


class Turtle:
    def __init__(self):
        self._screen = Screen()
        self._x = self._y = self._angle = 0.0
        self._down = True
        self._color = 'black'

    def forward(self, distance):
        radians = math.radians(self._angle)
        x = self._x + distance * math.cos(radians)
        y = self._y + distance * math.sin(radians)
        self.goto(x, y)

    def backward(self, distance):
        self.forward(-distance)

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        if self._down:
            self._screen._commands.append(['line', self._x, self._y, x, y, self._color])
        self._x, self._y = float(x), float(y)
        if self._screen._tracing:
            self._screen._pump(self._screen._delay)

    def left(self, angle):
        self._angle = (self._angle + angle) % 360

    def right(self, angle):
        self.left(-angle)

    def position(self):
        return self._x, self._y

    def heading(self):
        return self._angle

    def penup(self):
        self._down = False

    def pendown(self):
        self._down = True

    def pencolor(self, color=None):
        if color is None:
            return self._color
        self._color = color


def done():
    Screen().mainloop()


mainloop = done
