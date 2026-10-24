"""Canvas backend for the licensed CPython Turtle engine, not a Tkinter emulator.

Geometry remains in Python. The transport exchanges bounded JSON data with the
trusted frame. It is configured by the runtime, never imported by learner code.
"""
import heapq
from collections import deque
import json
import math
import re
import time
import traceback
from pathlib import Path
from ._sz_turtle_colors import COLORS
from ._sz_turtle_limits import LIMITS

_transport = None
_project_root = None
_activity_checkpoint = None
_mission_enabled = False
MAX_ITEMS = LIMITS['items']
MAX_POINTS = LIMITS['points']
MAX_IMAGE_BYTES = LIMITS['imageBytes']
MAX_OPERATIONS = LIMITS['operations']
# Fixed envelope and the largest bounded query fit in this reserved space.
MAX_QUEUE_BYTES = LIMITS['requestBytes'] - 256

# One encoder for every operation: json.dumps with non-default options builds a new
# JSONEncoder per call, and games queue hundreds of operations per frame. Same bytes.
_ENCODER = json.JSONEncoder(ensure_ascii=True, allow_nan=False, separators=(',', ':'))

def _encode(value):
    return _ENCODER.encode(value)

def configure(transport, project_root, activity_checkpoint=None, *, mission=False):
    global _transport, _project_root, _activity_checkpoint, _mission_enabled
    if _transport is not None:
        raise RuntimeError('Turtle backend already configured')
    _transport = transport
    _project_root = Path(project_root).resolve()
    _activity_checkpoint = activity_checkpoint
    _mission_enabled = mission

def _exchange(operations, query=None):
    if _transport is None:
        raise RuntimeError('A extensão Turtle não foi preparada pelo ambiente')
    raw = '{"version":1,"operations":[' + ','.join(operations) + '],"query":' + _encode(query) + '}'
    if len(raw) > LIMITS['requestBytes']:
        raise RuntimeError('A atualização Turtle excedeu o limite de bytes')
    result = _transport(raw)
    if not isinstance(result, str):
        from pyodide.ffi import run_sync
        result = run_sync(result)
    if len(result) > 128_000:
        raise RuntimeError('Turtle response exceeds the limit')
    response = json.loads(result)
    if response.get('error'):
        if isinstance(response['error'], dict) and response['error'].get('kind') == 'image':
            raise TclError(response['error']['message'])
        raise RuntimeError(response['error'])
    return response

def color(value):
    if value == '':
        return ''
    if not isinstance(value, str):
        raise ValueError('Color must be text')
    if value.startswith('#') and len(value) in (4, 7, 10, 13) and re.fullmatch(r'#[a-fA-F0-9]+', value):
        digits = (len(value) - 1) // 3
        channels = [int(value[1+i*digits:1+(i+1)*digits], 16) for i in range(3)]
        if digits == 1:
            channels = [channel * 17 for channel in channels]
        elif digits > 2:
            channels = [channel >> ((digits - 2) * 4) for channel in channels]
        return '#' + ''.join(f'{channel:02x}' for channel in channels)
    return COLORS[value.lower()]

class BrowserImage:
    def __init__(self, identifier):
        self.identifier = identifier

class TclError(Exception):
    """Compatibility error for invalid canvas operations; does not expose Tk."""

class TurtleScreenBase:
    _graphics_error = ValueError
    _terminator = RuntimeError

    def _observe_turtle(self, object_id, position, items, visible):
        if _mission_enabled:
            self._queue({'op': 'actor', 'id': object_id, 'x': position[0], 'y': position[1],
                         'items': list(items), 'visible': bool(visible)})

    def __init__(self, cv):
        self._mission_observation = _mission_enabled
        self.cv = None  # No DOM or native window is exposed to the engine.
        self.canvwidth, self.canvheight = 400, 300
        self.xscale = self.yscale = 1.0
        self._width, self._height = 640, 480
        self._background = 'white'
        self._operations = []
        self._queued_bytes = self._queued_points = self._queued_text = 0
        self._items = {}
        self._point_count = 0
        self._next_item = 0
        self._next_image = 0
        self._bindings = {}
        self._timers = []
        self._idle_timers = deque()
        self._timer_sequence = 0
        self._incoming = deque()
        self._activity_update_depth = 0
        self._just_waited = False
        self._closed = False
        self._queue({'op': 'open'})
        self._viewport = self._flush({'type': 'viewport'})['value']

    def _queue(self, operation):
        if self._closed:
            raise self._terminator()
        encoded = _encode(operation)
        size = len(encoded) + 1
        points = len(operation.get('points', ()))
        # JS counts UTF-16 units; JSON is ASCII so its byte budget is exact.
        text = len(operation.get('text', '').encode('utf-16-le', errors='surrogatepass')) // 2
        if size > MAX_QUEUE_BYTES or points > MAX_POINTS or text > LIMITS['textChars']:
            raise RuntimeError('Uma operação Turtle excedeu o limite do perfil')
        if (self._queued_bytes + size > MAX_QUEUE_BYTES or
                self._queued_points + points > MAX_POINTS or
                self._queued_text + text > LIMITS['textChars']):
            self._flush()
        self._operations.append(encoded)
        self._queued_bytes += size
        self._queued_points += points
        self._queued_text += text
        if len(self._operations) >= MAX_OPERATIONS:
            self._flush()

    def _flush(self, query=None):
        self._just_waited = False
        operations, self._operations = self._operations, []
        self._queued_bytes = self._queued_points = self._queued_text = 0
        response = _exchange(operations, query)
        incoming = response.get('events', [])
        if len(self._incoming) + len(incoming) > 256:
            raise RuntimeError('Muitos eventos Turtle aguardando processamento')
        self._incoming.extend(incoming)
        return response

    def _create(self, kind, **data):
        if len(self._items) >= MAX_ITEMS:
            raise RuntimeError('Limite de objetos Turtle atingido; apague desenhos antigos')
        self._next_item += 1
        identifier = self._next_item
        self._items[identifier] = {'kind': kind, 'points': []}
        self._queue({'op': 'create', 'id': identifier, 'kind': kind, **data})
        return identifier

    def _check_turtle_capacity(self, items=3):
        if len(self._turtles) >= LIMITS['turtles']:
            raise RuntimeError('Limite de 128 tartarugas atingido neste perfil')
        # Reserve the whole construction before upstream publishes its instance
        # into screen._turtles. Otherwise a caught quota error leaves a partial turtle.
        self._check_item_capacity(items)

    def _check_item_capacity(self, items):
        if len(self._items) + items > MAX_ITEMS:
            raise RuntimeError('Limite de objetos Turtle atingido; apague desenhos antigos')

    def _shape_item_count(self, name):
        shape = self._shapes[name]
        return len(shape._data) if shape._type == 'compound' else 1

    def _check_point_capacity(self, points, previous=()):
        released = sum(len(self._items.get(identifier, {}).get('points', ())) for identifier in previous)
        if self._point_count + points - released > MAX_POINTS:
            raise RuntimeError('Limite de pontos Turtle atingido')

    def _validated_points(self, coordinates):
        points = [(float(x) * self.xscale, -float(y) * self.yscale) for x, y in coordinates]
        if len(points) > MAX_POINTS or not all(math.isfinite(n) and abs(n) <= 10_000_000 for point in points for n in point):
            raise ValueError('Coordenadas Turtle inválidas ou numerosas demais')
        return points

    def _validate_polygon(self, coordinates, fill, outline, width=1):
        points = self._validated_points(coordinates)
        # Reserve the largest legal identifier before any component is allocated.
        patch = {'op': 'patch', 'id': 9007199254740991, 'points': points}
        for key, value in [('fill', fill), ('outline', outline)]:
            if value is not None:
                patch[key] = color(value)
        if width is not None:
            width = float(width)
            if not math.isfinite(width) or not 0 <= width <= 4096:
                raise ValueError('Contorno Turtle inválido ou acima do limite')
            patch['width'] = width
        if len(_encode(patch)) + 1 > MAX_QUEUE_BYTES:
            raise RuntimeError('Uma operação Turtle excedeu o limite do perfil')
        return len(points)

    def _check_draw_plan(self, draws, removed=()):
        # Simulate known polygon/line patches in their real order, without
        # allocating IDs, consuming the update counter or sending operations.
        # Future items use unique object() tokens; deleted canvas IDs stay no-ops.
        counts = {identifier: 0 for identifier in removed}
        total = self._point_count - sum(
            len(self._items.get(identifier, {}).get('points', ())) for identifier in removed)
        for identifier, geometry in draws:
            if isinstance(identifier, int) and (identifier in removed or identifier not in self._items):
                continue
            count = self._validate_polygon(*geometry)
            previous = counts.get(identifier)
            if previous is None:
                previous = len(self._items.get(identifier, {}).get('points', ()))
            total += count - previous
            if total > MAX_POINTS:
                raise RuntimeError('Limite de pontos Turtle atingido')
            counts[identifier] = count

    def _check_shape_capacity(self, name, previous):
        # Check before replacing the visible shape or allocating any component.
        # IDs already deleted by clearscreen do not provide spare capacity.
        released = sum(identifier in self._items for identifier in previous)
        self._check_item_capacity(self._shape_item_count(name) - released)

    def _createpoly(self):
        return self._create('polygon')

    def _createline(self):
        return self._create('line')

    def _patch(self, identifier, coordinates=None, fill=None, outline=None, width=None, top=False):
        # Tk canvas item operations on an ID deleted by clearscreen are no-ops.
        # Existing Python Turtle references still update their geometry normally.
        item = self._items.get(identifier)
        if item is None:
            return
        patch = {'op': 'patch', 'id': identifier}
        if coordinates is not None:
            points = self._validated_points(coordinates)
            self._check_point_capacity(len(points), (identifier,))
            patch['points'] = points
        for key, value in [('fill', fill), ('outline', outline)]:
            if value is not None:
                patch[key] = color(value)
        if width is not None:
            patch['width'] = float(width)
            if not math.isfinite(patch['width']) or not 0 <= patch['width'] <= 4096:
                raise ValueError('Contorno Turtle inválido ou acima do limite')
        self._queue(patch)
        if coordinates is not None:
            self._point_count += len(points) - len(item['points'])
            item['points'] = points
        if top:
            self._queue({'op': 'raise', 'id': identifier})

    def _drawpoly(self, polyitem, coordlist, fill=None, outline=None, width=None, top=False):
        self._patch(polyitem, coordlist, fill, outline, width, top)

    def _drawline(self, lineitem, coordlist=None, fill=None, width=None, top=False):
        self._patch(lineitem, coordlist, fill, None, width, top)

    def _delete(self, item):
        if item == 'all':
            self._items.clear()
            self._point_count = 0
            self._bindings = {key: value for key, value in self._bindings.items() if key[0] == 'screen'}
        else:
            self._point_count -= len(self._items.get(item, {}).get('points', ()))
            self._items.pop(item, None)
            self._bindings = {key: value for key, value in self._bindings.items() if key[0] != item}
        self._queue({'op': 'delete', 'id': item})

    def _dispatch(self, callback, *arguments):
        try:
            callback(*arguments)
        except SystemExit:
            raise
        except BaseException:
            traceback.print_exc()

    def _update(self):
        if _activity_checkpoint is None:
            return self._update_events()
        self._activity_update_depth += 1
        try:
            self._update_events()
        finally:
            self._activity_update_depth -= 1
        # Nested update calls may happen in a key, click or timer callback.
        # Observe only after the entire outer dispatch has finished.
        if not self._closed and self._activity_update_depth == 0:
            _activity_checkpoint()

    def _update_events(self):
        if self._closed:
            return
        # Right after mainloop's wait the frame has just presented and returned the pending
        # input; with nothing queued, another present would only repeat that round trip.
        if self._just_waited and not self._operations:
            self._just_waited = False
        else:
            self._flush({'type': 'present'})
        while self._incoming and not self._closed:
            event = self._incoming.popleft()
            if event['type'] in ('keypress', 'keyrelease'):
                keys = [('screen', event['type'], event['key'])]
                # Tk chooses the most specific binding; generic is a fallback.
                if not self._bindings.get(keys[0]) and event['type'] == 'keypress':
                    keys = [('screen', 'keypress', None)]
                arguments = ()
            else:
                keys = [(event.get('item'), event['type'], event['button'])]
                if event['type'] == 'click':
                    keys.append(('screen', 'click', event['button']))
                arguments = (event['x'] / self.xscale, -event['y'] / self.yscale)
            for key in keys:
                for callback in tuple(self._bindings.get(key, ())):
                    if self._closed:
                        break
                    self._dispatch(callback, *arguments)
        # Remove before invoking: callbacks can schedule timers or call update again.
        while not self._closed:
            if self._timers and self._timers[0][0] <= time.monotonic():
                _, _, callback = heapq.heappop(self._timers)
            elif self._idle_timers:
                generation = self._timer_sequence
                while self._idle_timers and self._idle_timers[0][0] <= generation and not self._closed:
                    _, callback = self._idle_timers.popleft()
                    self._dispatch(callback)
                continue
            else:
                break
            self._dispatch(callback)

    def _activity_turn(self):
        if (_activity_checkpoint is not None and not self._closed
                and self._activity_update_depth == 0):
            self._flush({'type': 'activity-turn'})

    def _delay(self, delay):
        # Tk's after(ms) without a callback blocks dispatch, unlike update().
        if delay > 0 and not self._closed:
            time.sleep(delay / 1000)

    def _iscolorstring(self, value):
        try:
            color(value)
            return True
        except (ValueError, KeyError, TypeError):
            return False

    def _bgcolor(self, value=None):
        if value is None:
            return self._background
        self._queue({'op': 'background', 'color': color(value)})
        self._background = value
        self._update()

    def _write(self, pos, txt, align, font, pencolor):
        if align not in ('left', 'center', 'right'):
            raise KeyError(align)
        x, y = pos
        item = self._create('text', x=x*self.xscale-1, y=-y*self.yscale,
                            text=str(txt), align=align, font=list(font), fill=color(pencolor))
        response = self._flush({'type': 'text-bounds', 'id': item})
        return item, response['value']['right'] - 1

    def _bind(self, target, event, discriminator, fun, add=None):
        # Tk interprets a compound item's list as one Tcl tag, not a fan-out.
        # A single ID addresses its polygon; empty/multiple IDs match no item.
        if isinstance(target, (list, tuple)):
            if len(target) != 1:
                return
            target = target[0]
        if target != 'screen' and target not in self._items:
            raise TclError(f'item "{target}" doesn\'t exist')
        key = (target, event, discriminator)
        if fun is None:
            self._bindings.pop(key, None)
        else:
            if not callable(fun):
                raise TypeError('callback must be callable')
            callbacks = list(self._bindings.get(key, ())) if add else []
            if len(callbacks) >= 128:
                raise RuntimeError('Limite de callbacks Turtle atingido')
            self._bindings[key] = callbacks + [fun]
        if event in ('click', 'release', 'drag') and target != 'screen':
            self._queue({'op': 'bind', 'id': target, 'event': event,
                         'button': discriminator, 'enabled': fun is not None})

    def _onclick(self, item, fun, num=1, add=None):
        self._bind(item, 'click', num, fun, add)

    def _onrelease(self, item, fun, num=1, add=None):
        self._bind(item, 'release', num, fun, add)

    def _ondrag(self, item, fun, num=1, add=None):
        self._bind(item, 'drag', num, fun, add)

    def _onscreenclick(self, fun, num=1, add=None):
        self._bind('screen', 'click', num, fun, add)

    def _onkeyrelease(self, fun, key):
        self._bind('screen', 'keyrelease', key, fun)

    def _onkeypress(self, fun, key=None):
        self._bind('screen', 'keypress', key, fun)

    def _listen(self):
        self._queue({'op': 'focus'})

    def _ontimer(self, fun, t):
        if not isinstance(t, int):
            raise TypeError('Timer delay must be an integer')
        if len(self._timers) + len(self._idle_timers) >= 4096:
            raise RuntimeError('Limite de temporizadores Turtle atingido')
        self._timer_sequence += 1
        if t == 0:
            self._idle_timers.append((self._timer_sequence, fun))
            return
        heapq.heappush(self._timers, (time.monotonic() + max(0, t) / 1000,
                                    self._timer_sequence, fun))

    def mainloop(self):
        while not self._closed:
            self._update()
            if self._closed:
                break
            # Commit callback drawing, then suspend until input or the next timer.
            # update() itself remains synchronous and never waits for future input.
            if self._operations:
                self._flush({'type': 'present'})
            if not self._incoming:
                timeout = (min(2_147_483_647, max(0, math.ceil(
                    (self._timers[0][0] - time.monotonic()) * 1000)))
                    if self._timers else None)
                self._flush({'type': 'wait', 'timeoutMs': timeout})
                self._just_waited = True

    def _blankimage(self):
        return BrowserImage(0)

    def _image(self, filename):
        path = Path(filename)
        if path.is_absolute() or not path.resolve().is_relative_to(_project_root):
            raise self._graphics_error('A imagem precisa estar dentro do projeto')
        with path.open('rb') as file:
            header = file.read(8)
            file.seek(0, 2)
            length = file.tell()
        if length > MAX_IMAGE_BYTES:
            raise self._graphics_error('Imagem Turtle excede o limite de bytes')
        if not (header.startswith(b'\x89PNG\r\n\x1a\n') or header.startswith((b'GIF87a', b'GIF89a'))):
            raise self._graphics_error('Turtle aceita imagens PNG ou GIF')
        self._next_image += 1
        # The worker reads this virtual file once and transfers bytes separately,
        # avoiding base64 and a large JSON parse on the rendering thread.
        self._queue({'op': 'image', 'id': self._next_image, 'path': str(path.resolve())})
        self._flush()
        return BrowserImage(self._next_image)

    def _createimage(self, image):
        return self._create('image', image=image.identifier if image else 0, x=0, y=0)

    def _drawimage(self, item, pos, image):
        if item not in self._items:
            return
        x, y = pos
        self._queue({'op': 'patch', 'id': item, 'image': image.identifier if image else 0,
                     'x': x*self.xscale, 'y': -y*self.yscale})

    def _setbgpic(self, item, image):
        self._drawimage(item, (0, 0), image)
        self._queue({'op': 'lower', 'id': item})

    def _type(self, item):
        return self._items.get(item, {}).get('kind')

    def _pointlist(self, item):
        return [(x, -y) for x, y in self._items.get(item, {}).get('points', [])]

    def _resize(self, canvwidth=None, canvheight=None, bg=None):
        if canvwidth is canvheight is bg is None:
            return self.canvwidth, self.canvheight
        if canvwidth is not None:
            self.canvwidth = canvwidth
        if canvheight is not None:
            self.canvheight = canvheight
        if bg is not None:
            self._bgcolor(bg)

    def _window_size(self):
        return self._width, self._height

    def _setup(self, width, height, startx, starty):
        values = []
        for value, maximum, limit in zip((width, height), self._viewport,
                                         (LIMITS['canvasWidth'], LIMITS['canvasHeight'])):
            if isinstance(value, float) and 0 <= value <= 1:
                value *= min(maximum, limit)
            if not isinstance(value, (int, float)) or not math.isfinite(value) or not 1 <= value <= limit:
                raise self._graphics_error('Tamanho de tela Turtle fora do limite de 1920 × 1080')
            values.append(round(value))
        self._width, self._height = values
        self._queue({'op': 'size', 'width': self._width, 'height': self._height})

    def _settitle(self, title):
        self._queue({'op': 'title', 'text': title})

    def _close(self):
        if self._closed:
            return
        self._queue({'op': 'close'})
        self._flush()
        self._closed = True
        self._timers.clear()
        self._idle_timers.clear()
        self._bindings.clear()
        self._incoming.clear()

    def textinput(self, title, prompt):
        raise NotImplementedError('Use input() no console; diálogos Tk não estão disponíveis')

    def numinput(self, title, prompt, default=None, minval=None, maxval=None):
        raise NotImplementedError('Use input() no console; diálogos Tk não estão disponíveis')
