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
import json
import math
import os
import re
import struct
from array import array
from collections import OrderedDict

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
MAX_STRING_CHARS = 4000
MAX_IMAGES = 1024
MAX_IMAGE_SIDE = 4096
MAX_IMAGE_BYTES = 16 * 1024 * 1024
# Pixels of every image the game loaded (the browser keeps all of them ready to draw).
MAX_TOTAL_PIXELS = 32 * 1024 * 1024
MAX_FONT_BYTES = 4 * 1024 * 1024
MAX_PATH_CHARS = 512
MAX_TITLE_CHARS = 200
MAX_AUDIO_COMMANDS = 64
# Like pygame's mixer channels: more sounds in one frame are not played.
MAX_PLAYS_PER_FRAME = 16
# Draw list, images and fonts sent with one frame; the rest follows in the next frames.
FRAME_ATTACHMENT_BYTES = 24 * 1024 * 1024
# Pixels read by get_at that stay in memory (the least recently read are read again later).
PIXEL_CACHE_BYTES = 64 * 1024 * 1024
# Text styles (kept in sync with protocol.ts).
MAX_FONT_SIZE = 512
MAX_OUTLINE_PIXELS = 32
MAX_SHADOW_PIXELS = 64
MAX_LINE_HEIGHT = 16
MAX_TEXT_WIDTH = 8192


class PgzeroLimitError(RuntimeError):
    pass


class PgzeroRendererError(RuntimeError):
    """The browser could not show a frame (an image it cannot open, for example)."""


def configure(transport, decoder, root):
    """Called once by the runtime before the learner program runs.

    ``transport(header, payload)`` returns ``(text, pixels)``: the browser's reply and, for a
    pixel request, the RGBA bytes (otherwise None).
    """
    global _transport, _decoder, _root
    _transport = transport
    _decoder = decoder
    _root = root


def project_path(path):
    """A file path relative to the project root, as the Studio's media service names files."""
    relative = os.path.relpath(os.path.abspath(path), os.path.abspath(_root)).replace(os.sep, '/')
    if len(relative) > MAX_PATH_CHARS:
        raise PgzeroLimitError(f'O caminho {relative[:60]!r}… é longo demais (o limite é 512).')
    return relative


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


# Games draw with the same few colours every frame: a name or a tuple is read once.
_rgba_cache = {}


def rgba(value):
    """Any colour Pygame Zero accepts, as an (r, g, b, a) tuple."""
    if isinstance(value, Color):
        return value.r, value.g, value.b, value.a
    if type(value) is str or type(value) is tuple:
        try:
            found = _rgba_cache.get(value)
        except TypeError:  # a tuple holding something unhashable: read it the long way
            return _read_rgba(value)
        if found is None:
            found = _read_rgba(value)
            if len(_rgba_cache) >= 512:
                _rgba_cache.clear()
            _rgba_cache[value] = found
        return found
    return _read_rgba(value)


def _read_rgba(value):
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
        size = os.path.getsize(path)
        if size > MAX_IMAGE_BYTES:
            raise PgzeroLimitError(
                f'O arquivo da imagem {path!r} tem {size // (1024 * 1024)} MB; o limite é 16 MB.'
            )
        self._id = _images.register(path, self._w, self._h, size)
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
                pixels = _vector_pixels(self._id, self._w, self._h)
            elif _decoder is None:
                raise RuntimeError('A leitura de pixels não está disponível aqui.')
            else:
                pixels = _decoder(self._path)
            if len(pixels) != self._w * self._h * 4:
                raise RuntimeError('A imagem mudou de tamanho ao ser lida.')
            self._pixels = pixels
        _pixel_cache.remember(self)
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
        self.sizes = {}
        self.pixels = 0

    def register(self, path, width, height, size=0):
        found = self.ids.get(path)
        if found is not None:
            return found
        if len(self.ids) >= MAX_IMAGES:
            raise PgzeroLimitError('O jogo usa imagens demais (o limite é 1024).')
        if len(path) > MAX_PATH_CHARS:
            raise PgzeroLimitError(f'O caminho da imagem {path[:60]!r}… é longo demais.')
        if self.pixels + width * height > MAX_TOTAL_PIXELS:
            raise PgzeroLimitError(
                f'Não cabe mais a imagem {path!r}: as imagens do jogo somam mais de 32 milhões '
                'de pixels. Use imagens menores.'
            )
        identifier = len(self.ids) + 1
        self.ids[path] = identifier
        self.sizes[identifier] = size
        self.pixels += width * height
        self.pending.append([identifier, path, width, height])
        return identifier


class _PixelCache:
    """Images whose pixels were read, least recently read first; bounded in bytes."""

    def __init__(self, limit):
        self.limit = limit
        self.order = OrderedDict()
        self.bytes = 0

    def remember(self, surface):
        key = id(surface)
        if key in self.order:
            self.order.move_to_end(key)
            return
        self.order[key] = surface
        self.bytes += len(surface._pixels)
        while self.bytes > self.limit and len(self.order) > 1:
            _, oldest = self.order.popitem(last=False)
            self.bytes -= len(oldest._pixels)
            oldest._pixels = None


_pixel_cache = _PixelCache(PIXEL_CACHE_BYTES)


_images = _ImageRegistry()


class _FontRegistry:
    """fonts/*.ttf used by screen.draw.text(fontname=...); bytes go with the next frame."""

    def __init__(self):
        self.ids = {}
        self.pending = []
        self.sizes = {}

    def register(self, path):
        found = self.ids.get(path)
        if found is not None:
            return found
        if len(self.ids) >= 32:
            raise PgzeroLimitError('O jogo usa fontes demais (o limite é 32).')
        if len(path) > MAX_PATH_CHARS:
            raise PgzeroLimitError(f'O caminho da fonte {path[:60]!r}… é longo demais.')
        size = os.path.getsize(path)
        if size > MAX_FONT_BYTES:
            raise PgzeroLimitError(f'A fonte {path!r} é grande demais (o limite é 4 MB).')
        identifier = len(self.ids) + 1
        self.ids[path] = identifier
        self.sizes[identifier] = size
        self.pending.append([identifier, path])
        return identifier


_fonts = _FontRegistry()


def utf16_length(text):
    """Length as the browser counts it (an emoji is two units), so both sides agree on limits."""
    return len(text.encode('utf-16-le', 'surrogatepass')) // 2


def cut_utf16(text, units):
    """The text cut to a number of UTF-16 units, never in the middle of a character."""
    if utf16_length(text) <= units:
        return text
    return text.encode('utf-16-le', 'surrogatepass')[:units * 2].decode('utf-16-le', 'ignore')


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

    def begin(self):
        """Start the next batch, right after one was sent.

        The screen keeps what was drawn, like pygame's display surface: a batch is everything
        drawn since the last frame went out (in update, in event handlers, in draw), painted on
        top of what is already there.
        """
        del self.ops[:]
        self.records = 0
        # Long-running games keep inventing texts (scores, timers): renew the tables between
        # batches, never in the middle of one (a text drawn in update and another in draw would
        # point at different tables).
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
        if utf16_length(text) > MAX_STRING_CHARS:
            raise PgzeroLimitError(
                f'O texto tem {len(text)} letras; screen.draw.text escreve até 4000 de uma vez.'
            )
        if len(self.strings) >= MAX_STRINGS:
            raise PgzeroLimitError('Este quadro escreveu textos diferentes demais.')
        identifier = len(self.strings) + 1
        self.strings[text] = identifier
        self.new_strings.append([identifier, text])
        return identifier

    def style(self, values):
        # A cheap, hashable key (this runs for every text drawn in every frame).
        key = tuple(sorted(
            (name, tuple(item) if isinstance(item, list) else item)
            for name, item in values.items()
        ))
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
    if not isinstance(value, str):
        # Pygame Zero on the desktop also refuses a number here (ptext needs a str): the game
        # would work in the Studio and break on the computer.
        raise TypeError(
            f'screen.draw.text escreve texto, e recebeu {type(value).__name__}. '
            'Para escrever um número, use str(numero).'
        )
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
            key, item = 'font', _fonts.register(os.path.join(_root, str(item)))
        else:
            item = float(item)
        values[key] = item
    _check_style(values)
    frame.record(OP_TEXT, frame.string(value), frame.style(values), x, y, hanchor, vanchor)


def _check_style(values):
    """Styles that would block the browser while it draws the text (kept with protocol.ts)."""
    size = values.get('fontsize', 24.0)
    if not 0 <= size <= MAX_FONT_SIZE:
        raise PgzeroLimitError(f'O tamanho da letra (fontsize={size:g}) vai de 0 a 512.')
    # ptext: the outline is owidth/24 of the letter size, the shadow shadow/18 of it.
    if values.get('owidth', 0) * size / 24 > MAX_OUTLINE_PIXELS:
        raise PgzeroLimitError('O contorno do texto (owidth) ficou grosso demais. Use um número menor.')
    if any(abs(part) * size / 18 > MAX_SHADOW_PIXELS for part in values.get('shadow', ())):
        raise PgzeroLimitError('A sombra do texto (shadow) ficou longe demais. Use números menores.')
    if not 0 <= values.get('lineheight', 1.0) <= MAX_LINE_HEIGHT:
        raise PgzeroLimitError('O espaço entre as linhas (lineheight) vai de 0 a 16.')
    for name in ('width', 'widthem', 'fit'):
        if not 0 <= values.get(name, 0) <= MAX_TEXT_WIDTH:
            raise PgzeroLimitError(f'A largura do texto ({name}) vai de 0 a 8192.')


# Audio ---------------------------------------------------------------------------------------

_voice = 0
# voice → called once when the sound ends by itself (or could not be played).
_on_end = {}
# Voices whose end changes the game (music.play_once, Sound.play(loops=N)): while there are any,
# the browser is asked to report sounds that end.
_waiting = set()
# Events for the game loop (on_music_end), as pygame's event queue.
posted = []


# Voices one stop or volume command may name (the browser refuses longer lists).
MAX_AUDIO_BATCH = 64
# Sound.play(loops=N): the extra plays one command may ask for.
MAX_AUDIO_REPEATS = 1000


def _names(command, voice):
    """Whether a command of this frame is about the voice (one id or a list of them)."""
    target = command[1]
    return target == voice or (isinstance(target, list) and voice in target)


def _commands(kind, voice):
    return [index for index, command in enumerate(frame.audio)
            if command[0] == kind and (voice is None or _names(command, voice))]


def _check_audio():
    if len(frame.audio) >= MAX_AUDIO_COMMANDS:
        raise PgzeroLimitError(
            'O jogo mandou comandos de som demais num quadro só (o limite é 64).'
        )


def audio_play(path, repeat, volume, music=False):
    """Start a sound; returns its voice, or None when this frame already plays too many.

    ``repeat`` is how many more times it plays at once after the first (-1: until stopped).
    The music has its own channel, as in pygame: a crowd of sound effects never refuses it.
    """
    global _voice
    if not music and len(_commands('play', None)) >= MAX_PLAYS_PER_FRAME:
        return None
    _check_audio()
    _voice += 1
    repeat = -1 if repeat < 0 else min(int(repeat), MAX_AUDIO_REPEATS)
    frame.audio.append(['play', _voice, path, repeat, float(volume), bool(music)])
    return _voice


def on_audio_end(voice, callback, wait=False):
    """Call ``callback()`` once when the voice ends by itself."""
    _on_end[voice] = callback
    if wait:
        _waiting.add(voice)


def _forget(voices, kinds=('volume', 'pause', 'resume')):
    """Drop this frame's commands of these kinds about the voices (lists lose those ids)."""
    kept = []
    for command in frame.audio:
        if command[0] in kinds:
            target = command[1]
            if isinstance(target, list):
                target = [voice for voice in target if voice not in voices]
                if not target:
                    continue
                command[1] = target[0] if len(target) == 1 else target
            elif target in voices:
                continue
        kept.append(command)
    frame.audio[:] = kept


def _append_batch(kind, voices, *rest):
    """One command per MAX_AUDIO_BATCH voices: stopping many sounds never floods the frame."""
    for start in range(0, len(voices), MAX_AUDIO_BATCH):
        chunk = voices[start:start + MAX_AUDIO_BATCH]
        _check_audio()
        frame.audio.append([kind, chunk[0] if len(chunk) == 1 else chunk, *rest])


def audio_stop(voice=None):
    if voice is None:
        frame.audio[:] = [command for command in frame.audio if command[0] == 'play']
        _on_end.clear()
        _waiting.clear()
        frame.audio.append(['stop', None])
        return
    audio_stop_many([voice])


def audio_stop_many(voices):
    """Stop several voices with as few commands as possible."""
    remaining = []
    for voice in voices:
        _on_end.pop(voice, None)
        _waiting.discard(voice)
        plays = _commands('play', voice)
        if plays:
            # It never reached the browser: nothing to stop.
            del frame.audio[plays[0]]
            _forget({voice})
            continue
        if not _commands('stop', voice) and voice not in remaining:
            remaining.append(voice)
    if not remaining or any(command[0] == 'stop' and command[1] is None
                            for command in frame.audio):
        return
    _forget(set(remaining))
    _append_batch('stop', remaining)


def audio_volume(voice, volume):
    audio_volume_many([voice], volume)


def audio_volume_many(voices, volume):
    """Set the volume of several voices with as few commands as possible."""
    volume = float(volume)
    remaining = []
    for voice in voices:
        plays = _commands('play', voice)
        if plays:
            # Not sent yet: it starts at the new volume.
            frame.audio[plays[0]][4] = volume
        elif voice not in remaining:
            remaining.append(voice)
    if not remaining:
        return
    _forget(set(remaining), ('volume',))
    _append_batch('volume', remaining, volume)


def audio_pause(voice):
    """Pause a voice where it is (music.pause): it keeps its place and does not end."""
    _toggle('pause', voice)


def audio_resume(voice):
    _toggle('resume', voice)


def _toggle(kind, voice):
    # Only the last pause or resume of this frame matters.
    frame.audio[:] = [command for command in frame.audio
                      if not (command[0] in ('pause', 'resume') and command[1] == voice)]
    _check_audio()
    frame.audio.append([kind, voice])


def audio_ended(voices):
    """Sounds the browser reports as ended: run their callbacks (which may play more)."""
    for voice in voices:
        _waiting.discard(voice)
        callback = _on_end.pop(voice, None)
        if callback is not None:
            callback()


# Exchange ------------------------------------------------------------------------------------

_ATTACHMENTS_PER_FRAME = 120
_last_window = [1, 1, '']


def attachments_pending():
    return bool(_images.pending or _fonts.pending)


def _exchange(header, payload):
    text, pixels = _transport(json.dumps(header, separators=(',', ':')), payload)
    reply = json.loads(text)
    if 'error' in reply:
        raise PgzeroRendererError(str(reply['error']))
    return reply, pixels


def _vector_pixels(identifier, width, height):
    """RGBA of a vector image at its own size, rasterized by the browser that draws it."""
    if _transport is None:
        raise RuntimeError('A leitura de pixels não está disponível aqui.')
    # The browser draws the image from its file: send it first if it has not gone yet.
    own = [entry for entry in _images.pending if entry[0] == identifier]
    header = {
        'w': _last_window[0],
        'h': _last_window[1],
        'title': _last_window[2],
        'keep': True,
        'images': own,
        'fonts': [],
        'strings': [],
        'styles': [],
        'audio': [],
        'decode': identifier,
    }
    _, pixels = _exchange(header, b'')
    _images.pending = [entry for entry in _images.pending if entry[0] != identifier]
    if pixels is None or len(pixels) != width * height * 4:
        raise RuntimeError('O navegador não devolveu os pixels do desenho.')
    return pixels


def _within_budget(pending, sizes, budget, count):
    """The first pending files that fit this frame's bytes and attachment count."""
    taken = []
    for entry in pending:
        size = sizes.get(entry[0], 0)
        if len(taken) >= count or size > budget:
            break
        taken.append(entry)
        budget -= size
    return taken, budget


def present(width, height, title):
    """Send what was drawn since the last frame (nothing: the screen stays) and return the reply."""
    # One message carries at most 128 attachments and a bounded number of bytes (list and
    # default font included). A game that loads more files at once receives them over the next
    # frames; until then those images simply are not drawn.
    title = cut_utf16(str(title), MAX_TITLE_CHARS)
    _last_window[:] = [width, height, title]
    keep = not frame.ops
    payload = b'' if keep else frame.ops.tobytes()
    images, budget = _within_budget(
        _images.pending, _images.sizes, FRAME_ATTACHMENT_BYTES - len(payload),
        _ATTACHMENTS_PER_FRAME)
    fonts, _ = _within_budget(
        _fonts.pending, _fonts.sizes, budget, _ATTACHMENTS_PER_FRAME - len(images))
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
        'watch': bool(_waiting),
    }
    reply, _ = _exchange(header, payload)
    _images.pending = _images.pending[len(images):]
    _fonts.pending = _fonts.pending[len(fonts):]
    frame.new_strings = []
    frame.new_styles = []
    frame.audio = []
    frame.begin()
    audio_ended(reply.get('ended', ()))
    return reply
