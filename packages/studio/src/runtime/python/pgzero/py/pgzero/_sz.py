"""Sistema Zero browser backend for Pygame Zero (configured by the runtime, never by learners).

Replaces the parts of Pygame Zero that need pygame/SDL:

* images are lightweight surfaces whose size comes from the file header; pixels are decoded
  only when a program reads them (``images.mapa.get_at``);
* drawing builds a compact display list (an ``array('d')``) that the browser paints once per
  frame on a canvas;
* sound and music commands travel with the frame to the Studio's media service;
* input arrives as events in the reply to each frame.

Behaviour follows pygame-ce (rotated image sizes, integer blit positions, colour names).
"""
import base64
import json
import math
import re
import struct
from array import array

from ._colors import COLORS

_transport = None
_decoder = None
_root = '.'

# Display list opcodes (kept in sync with protocol.ts).
OP_FILL = 1
OP_BLIT = 2
OP_BLIT_ROT = 3
OP_LINE = 4
OP_RECT = 5
OP_CIRCLE = 6
OP_TEXT = 7

MAX_RECORDS = 50_000
MAX_STRINGS = 4096
MAX_IMAGES = 1024
MAX_IMAGE_SIDE = 4096


class PgzeroLimitError(RuntimeError):
    pass


def configure(transport, decoder, root):
    """Called once by the runtime before the learner program runs."""
    global _transport, _decoder, _root
    _transport = transport
    _decoder = decoder
    _root = root


# Colours -------------------------------------------------------------------------------------

class Color:
    """pygame-ce style colour with r, g, b and a (0-255)."""
    __slots__ = ('r', 'g', 'b', 'a')

    def __init__(self, *args):
        if len(args) == 1:
            value = args[0]
            if isinstance(value, Color):
                args = (value.r, value.g, value.b, value.a)
            elif isinstance(value, str):
                args = _parse_color_name(value)
            elif isinstance(value, int):
                args = ((value >> 24) & 255, (value >> 16) & 255, (value >> 8) & 255, value & 255)
            else:
                args = tuple(value)
        if len(args) == 3:
            args = (*args, 255)
        if len(args) != 4:
            raise ValueError('invalid color argument')
        self.r, self.g, self.b, self.a = (_channel(item) for item in args)

    def __iter__(self):
        return iter((self.r, self.g, self.b, self.a))

    def __len__(self):
        return 4

    def __getitem__(self, index):
        return (self.r, self.g, self.b, self.a)[index]

    def __eq__(self, other):
        try:
            values = tuple(other)
        except TypeError:
            return NotImplemented
        if len(values) == 3:
            return (self.r, self.g, self.b) == values and self.a == 255
        return (self.r, self.g, self.b, self.a) == values

    def __hash__(self):
        return hash((self.r, self.g, self.b, self.a))

    def __repr__(self):
        return f'Color({self.r}, {self.g}, {self.b}, {self.a})'


def _channel(value):
    value = int(value)
    if not 0 <= value <= 255:
        raise ValueError('invalid color argument')
    return value


def _parse_color_name(text):
    key = text.lower()
    if key in COLORS:
        return COLORS[key]
    compact = key.replace(' ', '')
    if compact in COLORS:
        return COLORS[compact]
    hexa = None
    if key.startswith('#'):
        hexa = key[1:]
    elif key.startswith('0x'):
        hexa = key[2:]
    if hexa is not None and len(hexa) in (6, 8):
        try:
            values = [int(hexa[i:i + 2], 16) for i in range(0, len(hexa), 2)]
        except ValueError:
            values = None
        if values:
            return tuple(values)
    raise ValueError(f'Não conheço a cor {text!r}. Use um nome em inglês ("red", "sky blue") ou "#rrggbb".')


def rgba(value):
    """Any colour Pygame Zero accepts, as an (r, g, b, a) tuple."""
    if isinstance(value, Color):
        return value.r, value.g, value.b, value.a
    if isinstance(value, str):
        return tuple(Color(value))
    try:
        items = tuple(value)
    except TypeError:
        raise TypeError('A cor precisa ser um nome, como "red", ou (r, g, b).') from None
    if len(items) == 3:
        items = (*items, 255)
    if len(items) != 4:
        raise TypeError('A cor precisa ter 3 ou 4 números: (r, g, b) ou (r, g, b, a).')
    return tuple(_channel(item) for item in items)


# Images --------------------------------------------------------------------------------------

def _png_size(head):
    if head[:8] == b'\x89PNG\r\n\x1a\n' and head[12:16] == b'IHDR':
        return struct.unpack('>II', head[16:24])


def _gif_size(head):
    if head[:6] in (b'GIF87a', b'GIF89a'):
        return struct.unpack('<HH', head[6:10])


def _jpeg_size(path):
    with open(path, 'rb') as stream:
        if stream.read(2) != b'\xff\xd8':
            return None
        while True:
            marker = stream.read(2)
            if len(marker) < 2 or marker[0] != 0xFF:
                return None
            kind = marker[1]
            length = struct.unpack('>H', stream.read(2))[0]
            if kind in (0xC0, 0xC1, 0xC2):
                stream.read(1)
                height, width = struct.unpack('>HH', stream.read(4))
                return width, height
            stream.seek(length - 2, 1)


def _bmp_size(head):
    if head[:2] == b'BM':
        width, height = struct.unpack('<ii', head[18:26])
        return width, abs(height)


# SVG lengths in CSS pixels (96 per inch), as pygame-ce's SVG loader (nanosvg) reads them.
_SVG_UNITS = {'': 1.0, 'px': 1.0, 'pt': 96 / 72, 'pc': 16.0, 'in': 96.0, 'cm': 96 / 2.54,
              'mm': 96 / 25.4}
_SVG_TAG = re.compile(rb'<svg\b[^>]*>', re.IGNORECASE | re.DOTALL)


def _svg_attribute(tag, name):
    match = re.search(rb'\s' + name + rb'\s*=\s*(["\'])(.*?)\1', tag, re.DOTALL)
    return match.group(2).decode('utf-8', 'replace').strip() if match else None


def _svg_length(value):
    match = re.fullmatch(r'([0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*([a-z]*)', value or '')
    if not match or match.group(2) not in _SVG_UNITS:
        return None
    return float(match.group(1)) * _SVG_UNITS[match.group(2)]


def _svg_size(path):
    """Vector images are drawn at the size their root element declares."""
    with open(path, 'rb') as stream:
        head = stream.read(65536)
    tag = _SVG_TAG.search(head)
    if not tag:
        return None
    tag = tag.group(0)
    width = _svg_length(_svg_attribute(tag, b'width'))
    height = _svg_length(_svg_attribute(tag, b'height'))
    box = _svg_attribute(tag, b'viewBox')
    if box and (width is None or height is None):
        parts = [part for part in re.split(r'[\s,]+', box) if part]
        if len(parts) == 4:
            try:
                box_w, box_h = float(parts[2]), float(parts[3])
            except ValueError:
                box_w = box_h = 0.0
            # As pygame-ce (nanosvg): a missing side takes the viewBox side, not its ratio.
            if box_w > 0 and box_h > 0:
                width = box_w if width is None else width
                height = box_h if height is None else height
    if not width or not height:
        raise ValueError(
            f'O desenho {path!r} precisa dizer o próprio tamanho (width e height, ou viewBox).'
        )
    return math.ceil(width), math.ceil(height)


def is_vector(path):
    return str(path).lower().endswith('.svg')


def image_size(path):
    if is_vector(path):
        size = _svg_size(path)
        if not size:
            raise ValueError(f'O arquivo {path!r} não é um desenho SVG válido.')
        return size
    with open(path, 'rb') as stream:
        head = stream.read(32)
    size = _png_size(head) or _gif_size(head) or _bmp_size(head) or _jpeg_size(path)
    if not size:
        raise ValueError(f'O arquivo {path!r} não é uma imagem PNG, GIF, JPG ou BMP válida.')
    return size


class Surface:
    """An image file loaded from images/ (pygame Surface subset)."""
    __slots__ = ('_id', '_path', '_w', '_h', '_pixels', '__weakref__')

    def __init__(self, path):
        self._path = path
        self._w, self._h = image_size(path)
        if self._w > MAX_IMAGE_SIDE or self._h > MAX_IMAGE_SIDE:
            raise PgzeroLimitError(
                f'A imagem {path!r} é grande demais ({self._w}x{self._h}); o limite é 4096.'
            )
        self._id = _images.register(path, self._w, self._h)
        self._pixels = None

    def get_size(self):
        return self._w, self._h

    def get_width(self):
        return self._w

    def get_height(self):
        return self._h

    def get_rect(self, **kwargs):
        from .rect import Rect
        rect = Rect(0, 0, self._w, self._h)
        for key, value in kwargs.items():
            setattr(rect, key, value)
        return rect

    def get_at(self, pos):
        x, y = (int(value) for value in pos)
        if not (0 <= x < self._w and 0 <= y < self._h):
            raise IndexError('pixel index out of range')
        if self._pixels is None:
            if is_vector(self._path):
                self._pixels = _vector_pixels(self._id, self._w, self._h)
            elif _decoder is None:
                raise RuntimeError('A leitura de pixels não está disponível aqui.')
            else:
                self._pixels = _decoder(self._path)
            if len(self._pixels) != self._w * self._h * 4:
                raise RuntimeError('A imagem mudou de tamanho ao ser lida.')
        offset = (y * self._w + x) * 4
        p = self._pixels
        return Color(p[offset], p[offset + 1], p[offset + 2], p[offset + 3])

    def convert_alpha(self, *args):
        return self

    def convert(self, *args):
        return self

    def __repr__(self):
        return f'<Surface({self._w}x{self._h})>'

    def __getattr__(self, name):
        if name in ('blit', 'fill', 'set_at', 'subsurface', 'copy', 'scroll'):
            raise NotImplementedError(
                f'No Estúdio, as imagens não podem ser alteradas (Surface.{name}). '
                'Desenhe na tela com screen.blit e screen.draw.'
            )
        raise AttributeError(name)


class _Rotated:
    """A rotated image: pygame.transform.rotate's size, painted by the browser."""
    __slots__ = ('_base', '_angle', '_w', '_h')

    def __init__(self, base, angle, size):
        self._base = base
        self._angle = angle
        self._w, self._h = size

    def get_size(self):
        return self._w, self._h

    def get_width(self):
        return self._w

    def get_height(self):
        return self._h

    def get_rect(self, **kwargs):
        from .rect import Rect
        rect = Rect(0, 0, self._w, self._h)
        for key, value in kwargs.items():
            setattr(rect, key, value)
        return rect


def rotate(surface, angle):
    """Size and orientation of pygame-ce's transform.rotate (counter-clockwise degrees)."""
    base = surface._base if isinstance(surface, _Rotated) else surface
    total = (surface._angle if isinstance(surface, _Rotated) else 0.0) + float(angle)
    w, h = surface.get_size()
    angle = math.fmod(float(angle), 360.0)
    if angle == 0:
        size = (w, h)
    elif math.fmod(angle, 90.0) == 0:
        size = (w, h) if abs(angle) == 180 else (h, w)
    else:
        radians = angle * 0.01745329251994329
        s, c = math.sin(radians), math.cos(radians)
        cx, cy, sx, sy = c * w, c * h, s * w, s * h
        size = (
            int(max(abs(cx + sy), abs(cx - sy), abs(-cx + sy), abs(-cx - sy))),
            int(max(abs(sx + cy), abs(sx - cy), abs(-sx + cy), abs(-sx - cy))),
        )
    if total == 0 and size == base.get_size():
        return base
    return _Rotated(base, total, size)


class _ImageRegistry:
    def __init__(self):
        self.ids = {}
        self.pending = []

    def register(self, path, width, height):
        found = self.ids.get(path)
        if found is not None:
            return found
        if len(self.ids) >= MAX_IMAGES:
            raise PgzeroLimitError('O jogo usa imagens demais (o limite é 1024).')
        identifier = len(self.ids) + 1
        self.ids[path] = identifier
        self.pending.append([identifier, path, width, height])
        return identifier


_images = _ImageRegistry()


class _FontRegistry:
    """fonts/*.ttf used by screen.draw.text(fontname=...); bytes go with the next frame."""

    def __init__(self):
        self.ids = {}
        self.pending = []

    def register(self, path):
        found = self.ids.get(path)
        if found is not None:
            return found
        if len(self.ids) >= 32:
            raise PgzeroLimitError('O jogo usa fontes demais (o limite é 32).')
        identifier = len(self.ids) + 1
        self.ids[path] = identifier
        self.pending.append([identifier, path])
        return identifier


_fonts = _FontRegistry()


# Frame building ------------------------------------------------------------------------------

class _Frame:
    def __init__(self):
        self.ops = array('d')
        self.records = 0
        self.strings = {}
        self.new_strings = []
        self.styles = {}
        self.new_styles = []
        self.audio = []
        self.drawn = False

    def reset(self):
        del self.ops[:]
        self.records = 0
        self.drawn = True
        # Long-running games keep inventing texts (scores, timers): renew the tables at the
        # start of a frame, never in the middle of one.
        if len(self.strings) > MAX_STRINGS // 2:
            self.strings.clear()
            self.new_strings.append([0, ''])
        if len(self.styles) > 512:
            self.styles.clear()
            self.new_styles.append([0, None])

    def record(self, *values):
        self.records += 1
        if self.records > MAX_RECORDS:
            raise PgzeroLimitError('O desenho deste quadro passou de 50 mil comandos.')
        self.ops.extend(values)

    def string(self, text):
        found = self.strings.get(text)
        if found is not None:
            return found
        if len(self.strings) >= MAX_STRINGS:
            raise PgzeroLimitError('Este quadro escreveu textos diferentes demais.')
        identifier = len(self.strings) + 1
        self.strings[text] = identifier
        self.new_strings.append([identifier, text])
        return identifier

    def style(self, values):
        key = json.dumps(values, sort_keys=True, separators=(',', ':'))
        found = self.styles.get(key)
        if found is not None:
            return found
        if len(self.styles) >= 1024:
            raise PgzeroLimitError('Este quadro usou estilos de texto diferentes demais.')
        identifier = len(self.styles) + 1
        self.styles[key] = identifier
        self.new_styles.append([identifier, values])
        return identifier


frame = _Frame()


def fill(color):
    frame.record(OP_FILL, *rgba(color))


def blit(surface, pos):
    x, y = _position(pos)
    if isinstance(surface, _Rotated):
        base = surface._base
        if surface._angle % 360 == 0:
            frame.record(OP_BLIT, base._id, x, y)
        else:
            frame.record(OP_BLIT_ROT, base._id, x, y, surface._w, surface._h, surface._angle)
    elif isinstance(surface, Surface):
        frame.record(OP_BLIT, surface._id, x, y)
    else:
        raise TypeError('screen.blit precisa do nome de uma imagem ou de images.nome.')


def _position(pos):
    try:
        if hasattr(pos, 'topleft') and not isinstance(pos, tuple):
            pos = pos.topleft
        x, y = pos[0], pos[1]
        return int(x), int(y)
    except (TypeError, ValueError, IndexError):
        raise TypeError('A posição precisa ser um par (x, y).') from None


def line(start, end, color, width=1):
    (x1, y1), (x2, y2) = start, end
    frame.record(OP_LINE, round(x1), round(y1), round(x2), round(y2), *rgba(color), width)


def rect(x, y, w, h, color, width):
    frame.record(OP_RECT, x, y, w, h, *rgba(color), width)


def circle(pos, radius, color, width):
    x, y = pos
    frame.record(OP_CIRCLE, round(x), round(y), radius, *rgba(color), width)


TEXT_STYLE_KEYS = (
    'fontname', 'fontsize', 'bold', 'italic', 'underline', 'color', 'background', 'width',
    'widthem', 'lineheight', 'strip', 'align', 'owidth', 'ocolor', 'shadow', 'scolor', 'gcolor',
    'alpha', 'angle', 'fit',
)


def text(value, x, y, hanchor, vanchor, style):
    values = {}
    for key, item in style.items():
        if item is None:
            continue
        if key in ('color', 'background', 'ocolor', 'scolor', 'gcolor'):
            item = list(rgba(item))
        elif key == 'shadow':
            item = [float(part) for part in item]
        elif key in ('bold', 'italic', 'underline', 'strip'):
            item = bool(item)
        elif key == 'fontname':
            key, item = 'font', _fonts.register(_root + '/' + str(item))
        else:
            item = float(item)
        values[key] = item
    frame.record(OP_TEXT, frame.string(str(value)), frame.style(values), x, y, hanchor, vanchor)


# Audio ---------------------------------------------------------------------------------------

_voice = 0


def audio_play(path, loop, volume):
    global _voice
    _voice += 1
    frame.audio.append(['play', _voice, path, bool(loop), float(volume)])
    return _voice


def audio_stop(voice=None):
    frame.audio.append(['stop', voice])


def audio_volume(voice, volume):
    frame.audio.append(['volume', voice, float(volume)])


# Exchange ------------------------------------------------------------------------------------

_ATTACHMENTS_PER_FRAME = 120


# A reply carries at most this many pixel bytes (the channel answers in text, base64).
_DECODE_CHUNK_BYTES = 90_000
_last_window = [1, 1, '']


def attachments_pending():
    return bool(_images.pending or _fonts.pending)


def _vector_pixels(identifier, width, height):
    """RGBA of a vector image at its own size, rasterized by the browser that draws it."""
    if _transport is None:
        raise RuntimeError('A leitura de pixels não está disponível aqui.')
    own = [entry for entry in _images.pending if entry[0] == identifier]
    rest = [entry for entry in _images.pending if entry[0] != identifier]
    images = own + rest[: _ATTACHMENTS_PER_FRAME - len(own)]
    _images.pending = rest[len(images) - len(own):]
    rows = max(1, _DECODE_CHUNK_BYTES // (width * 4))
    pixels = bytearray()
    for row in range(0, height, rows):
        header = {
            'w': _last_window[0],
            'h': _last_window[1],
            'title': _last_window[2],
            'keep': True,
            'images': images,
            'fonts': [],
            'strings': [],
            'styles': [],
            'audio': [],
            'decode': [identifier, row, min(rows, height - row)],
        }
        images = []
        reply = json.loads(_transport(json.dumps(header, separators=(',', ':')), b''))
        pixels += base64.b64decode(reply['pixels'])
    return bytes(pixels)


def present(width, height, title, keep):
    """Send this frame (or ask the browser to keep the previous one) and return the reply."""
    # The worker channel carries at most 128 attachments per message (list and default font
    # included). A game that loads more files at once receives them over the next frames;
    # until then those images simply are not drawn.
    _last_window[:] = [width, height, title]
    images = _images.pending[:_ATTACHMENTS_PER_FRAME]
    fonts = _fonts.pending[:_ATTACHMENTS_PER_FRAME - len(images)]
    header = {
        'w': width,
        'h': height,
        'title': title,
        'keep': bool(keep),
        'images': images,
        'fonts': fonts,
        'strings': frame.new_strings,
        'styles': frame.new_styles,
        'audio': frame.audio,
    }
    payload = b'' if keep else frame.ops.tobytes()
    reply = _transport(json.dumps(header, separators=(',', ':')), payload)
    _images.pending = _images.pending[len(images):]
    _fonts.pending = _fonts.pending[len(fonts):]
    frame.new_strings = []
    frame.new_styles = []
    frame.audio = []
    frame.drawn = False
    return json.loads(reply)
