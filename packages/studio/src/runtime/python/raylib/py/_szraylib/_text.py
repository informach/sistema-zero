"""Fontes e texto do raylib (rtext.c).

* A fonte padrão é a do raylib (bitmap de 10 pixels, glifos 32..255): ``draw_text`` mede e
  desenha igual ao computador, inclusive acentos do Latin-1.
* Uma fonte TTF/OTF é medida aqui, lendo as tabelas do arquivo (cmap, hmtx, hhea), com a mesma
  escala do stb_truetype (altura em pixels / (ascent - descent)) e o avanço truncado para
  inteiro, como o LoadFontData. O navegador só desenha os glifos.
* Como no raylib, ``load_font_ex(arquivo, tamanho, None, 0)`` carrega só os 95 caracteres de 32 a
  126: um acento vira "?" (no computador também). Para acentos, passe a lista de codepoints.
"""
import struct as _bin

from . import _rt as rt
from . import _default_font as DF
from ._args import integer, number, text
from ._structs import Font, Rectangle, Texture, Vector2

_line_spacing = 2
_default = None
_fonts = {}   # id da textura da fonte -> _FontData


class _FontData:
    __slots__ = ('base', 'advances', 'widths', 'index', 'fallback')

    def __init__(self, base, advances, widths, index, fallback):
        self.base = base
        self.advances = advances   # codepoint -> avanço em pixels na altura base (int)
        self.widths = widths       # codepoint -> largura do glifo (para avanço zero)
        self.index = index         # codepoints que a fonte tem
        self.fallback = fallback   # '?' quando o glifo não existe


def _default_data():
    advances = {}
    widths = {}
    for i, width in enumerate(DF.WIDTHS):
        advances[32 + i] = 0
        widths[32 + i] = width
    return _FontData(DF.BASE_SIZE, advances, widths, set(advances), 63)


def default_font():
    global _default
    if _default is None:
        _fonts[rt.DEFAULT_FONT_TEXTURE_ID] = _default_data()
        _default = Font(DF.BASE_SIZE, 224, 0, Texture(rt.DEFAULT_FONT_TEXTURE_ID, 128, 128, 1, 2))
    return _default


def _data(font):
    data = _fonts.get(font.texture.id)
    if data is None:
        default_font()
        return _fonts[rt.DEFAULT_FONT_TEXTURE_ID]
    return data


def _glyph(data, codepoint):
    if codepoint in data.index:
        return codepoint
    return data.fallback if data.fallback in data.index else next(iter(data.index), 32)


def _advance(data, codepoint):
    advance = data.advances.get(codepoint, 0)
    return advance if advance else data.widths.get(codepoint, 0)


def draw(font, value, x, y, size, spacing, tint):
    """DrawTextEx: posição de cada glifo, calculada aqui, e o navegador só desenha."""
    data = _data(font)
    scale = size / data.base
    offset_x = 0.0
    offset_y = 0.0
    glyphs = []
    for char in value:
        codepoint = ord(char)
        if codepoint == 10:
            offset_y += size + _line_spacing
            offset_x = 0.0
            continue
        glyph = _glyph(data, codepoint)
        if codepoint != 32 and codepoint != 9:
            glyphs.append((glyph, x + offset_x, y + offset_y))
        offset_x += _advance(data, glyph) * scale + spacing
    if not glyphs:
        return
    record = [rt.OP_TEXT, font.texture.id, size, tint, len(glyphs)]
    for glyph, gx, gy in glyphs:
        record.append(glyph)
        record.append(gx)
        record.append(gy)
    rt.ops.extend(record)


def measure_ex(font, value, size, spacing):
    """MeasureTextEx, linha por linha, com a mesma conta do raylib."""
    if not value:
        return 0.0, 0.0
    data = _data(font)
    scale = size / data.base
    width = longest = 0.0
    count = longest_count = 0
    height = size
    for char in value:
        count += 1
        codepoint = ord(char)
        if codepoint != 10:
            glyph = _glyph(data, codepoint)
            width += _advance(data, glyph)
        else:
            if longest < width:
                longest = width
            count = 0
            width = 0.0
            height += size + _line_spacing
        if longest_count < count:
            longest_count = count
    if longest < width:
        longest = width
    return longest * scale + (longest_count - 1) * spacing, height


# Leitor de TTF/OTF (só as tabelas que a medida usa) ---------------------------------------

def _tables(data):
    if data[:4] == b'ttcf':
        (offset,) = _bin.unpack_from('>I', data, 12)
    else:
        offset = 0
    (count,) = _bin.unpack_from('>H', data, offset + 4)
    tables = {}
    for i in range(count):
        tag, _, start, length = _bin.unpack_from('>4sIII', data, offset + 12 + 16 * i)
        tables[tag.decode('latin-1')] = (start, length)
    return tables


def _cmap(data, start):
    (count,) = _bin.unpack_from('>H', data, start + 2)
    best = None
    for i in range(count):
        platform, encoding, offset = _bin.unpack_from('>HHI', data, start + 4 + 8 * i)
        fmt = _bin.unpack_from('>H', data, start + offset)[0]
        rank = {(3, 10): 0, (0, 4): 1, (3, 1): 2, (0, 3): 3}.get((platform, encoding), 9)
        if fmt in (4, 12) and (best is None or rank < best[0]):
            best = (rank, start + offset, fmt)
    mapping = {}
    if best is None:
        return mapping
    _, base, fmt = best
    if fmt == 4:
        (seg2,) = _bin.unpack_from('>H', data, base + 6)
        segs = seg2 // 2
        ends = base + 14
        starts = ends + seg2 + 2
        deltas = starts + seg2
        ranges = deltas + seg2
        for s in range(segs):
            (end,) = _bin.unpack_from('>H', data, ends + 2 * s)
            (first,) = _bin.unpack_from('>H', data, starts + 2 * s)
            (delta,) = _bin.unpack_from('>h', data, deltas + 2 * s)
            (range_offset,) = _bin.unpack_from('>H', data, ranges + 2 * s)
            if first == 0xFFFF:
                continue
            for code in range(first, min(end, 0xFFFE) + 1):
                if range_offset == 0:
                    glyph = (code + delta) & 0xFFFF
                else:
                    where = ranges + 2 * s + range_offset + 2 * (code - first)
                    (glyph,) = _bin.unpack_from('>H', data, where)
                    if glyph:
                        glyph = (glyph + delta) & 0xFFFF
                if glyph:
                    mapping[code] = glyph
    else:
        (groups,) = _bin.unpack_from('>I', data, base + 12)
        for g in range(groups):
            first, last, glyph = _bin.unpack_from('>III', data, base + 16 + 12 * g)
            for code in range(first, min(last, first + 0x10000) + 1):
                mapping[code] = glyph + code - first
    return mapping


def _metrics(raw):
    tables = _tables(raw)
    for needed in ('cmap', 'hhea', 'hmtx', 'head'):
        if needed not in tables:
            raise ValueError(f'a fonte não tem a tabela {needed}')
    head = tables['head'][0]
    (units,) = _bin.unpack_from('>H', raw, head + 18)
    hhea = tables['hhea'][0]
    ascent, descent = _bin.unpack_from('>hh', raw, hhea + 4)
    (metrics_count,) = _bin.unpack_from('>H', raw, hhea + 34)
    hmtx = tables['hmtx'][0]

    def advance(glyph):
        index = glyph if glyph < metrics_count else metrics_count - 1
        return _bin.unpack_from('>H', raw, hmtx + 4 * index)[0]

    return units, ascent, descent, _cmap(raw, tables['cmap'][0]), advance


def load_ttf(path, base_size, codepoints, function):
    relative, absolute = rt.project_path(path, function)
    with open(absolute, 'rb') as handle:
        raw = handle.read()
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError(f'{function}: a fonte {path!r} passa de 8 MB.')
    try:
        units, ascent, descent, cmap, advance = _metrics(raw)
    except (ValueError, _bin.error, IndexError) as error:
        raise ValueError(f'{function}: não consegui ler a fonte {path!r} ({error}). Use um '
                         'arquivo .ttf ou .otf.') from None
    scale = base_size / (ascent - descent) if ascent != descent else 0.0
    advances = {}
    for codepoint in codepoints:
        glyph = cmap.get(codepoint, 0)
        if glyph > 0:
            advances[codepoint] = int(advance(glyph) * scale)
    if not advances:
        print(f'Aviso: {function}: a fonte {path!r} não tem nenhum dos caracteres pedidos; '
              'usando a fonte padrão.')
        return default_font()
    texture_id = rt.new_id()
    _fonts[texture_id] = _FontData(base_size, advances, {}, set(advances), 63)
    em = base_size * units / (ascent - descent) if ascent != descent else base_size
    rt.pending_fonts.append([texture_id, relative, base_size, em, ascent * scale,
                             sorted(advances)])
    count = len(advances)
    side = 1
    while side * side < count * (base_size + 8) * (base_size + 8):
        side *= 2
    return Font(base_size, count, 4, Texture(texture_id, side, side, 1, 2))


# API ----------------------------------------------------------------------------------------

def get_font_default():
    return default_font()


def load_font(fileName, /):
    path = text(fileName, 'load_font', 'fileName')
    rt.require_window('load_font')
    return load_ttf(path, 32, range(32, 127), 'load_font')


def load_font_ex(fileName, fontSize, codepoints, codepointCount, /):
    f = 'load_font_ex'
    path = text(fileName, f, 'fileName')
    size = integer(fontSize, f, 'fontSize')
    count = integer(codepointCount, f, 'codepointCount')
    rt.require_window(f)
    if size <= 0:
        raise ValueError(f'{f}: fontSize precisa ser maior que zero.')
    if size > 512:
        raise ValueError(f'{f}: fontSize vai até 512.')
    from ._ffi import ffi
    if codepoints is None or codepoints is ffi.NULL:
        wanted = range(32, 32 + (count if count > 0 else 95))
    else:
        items = list(codepoints)
        wanted = [integer(item, f, 'codepoints') for item in (items[:count] if count > 0 else items)]
    return load_ttf(path, size, wanted, f)


def unload_font(font, /):
    if font.texture.id != rt.DEFAULT_FONT_TEXTURE_ID and font.texture.id in _fonts:
        del _fonts[font.texture.id]
        rt.pending_free.append(font.texture.id)


def is_font_valid(font, /):
    return font.texture.id in _fonts or font.texture.id == rt.DEFAULT_FONT_TEXTURE_ID


def is_font_ready(font, /):
    return is_font_valid(font)


def set_text_line_spacing(spacing, /):
    global _line_spacing
    _line_spacing = integer(spacing, 'set_text_line_spacing', 'spacing')


def measure_text(text_, fontSize, /):
    f = 'measure_text'
    value = text(text_, f, 'text')
    size = integer(fontSize, f, 'fontSize')
    if not rt.window.open:
        return 0
    if size < 10:
        size = 10
    width, _ = measure_ex(default_font(), value, float(size), float(size // 10))
    return int(width)


def measure_text_ex(font, text_, fontSize, spacing, /):
    from ._args import struct
    f = 'measure_text_ex'
    fnt = struct(font, Font, f, 'font')
    value = text(text_, f, 'text')
    width, height = measure_ex(fnt, value, number(fontSize, f, 'fontSize'), number(spacing, f, 'spacing'))
    return Vector2(width, height)


def get_glyph_index(font, codepoint, /):
    data = _data(font)
    glyph = _glyph(data, integer(codepoint, 'get_glyph_index', 'codepoint'))
    return sorted(data.index).index(glyph) if glyph in data.index else 0


def get_glyph_atlas_rec(font, codepoint, /):
    data = _data(font)
    glyph = _glyph(data, integer(codepoint, 'get_glyph_atlas_rec', 'codepoint'))
    if font.texture.id == rt.DEFAULT_FONT_TEXTURE_ID and 32 <= glyph < 256:
        return Rectangle(*DF.RECS[glyph - 32])
    return Rectangle(0, 0, _advance(data, glyph), data.base)
