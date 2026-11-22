/** Private Python region codec/access, shared by the forthcoming 2D adapters.
 * This admits cell grids only. Scene references, images and world budgets still
 * require admission before calling decode; no public runtime is activated here.
 */
import {
  PINTA_REGION_CHUNK_BASE64_CHARS,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
} from '@sistemazero/core/creations'

export const pythonSceneRegions = `import array
import base64
import binascii
import math
import sys

_REGION_SIDE = ${PINTA_REGION_SIDE}
_REGION_BYTES = ${PINTA_REGION_CHUNK_BYTES}
_REGION_BASE64 = ${PINTA_REGION_CHUNK_BASE64_CHARS}
_REGION_MAX_CHUNKS = ${PINTA_REGION_LIMITS.maxChunks}
_REGION_MAX_LAYERS = ${PINTA_REGION_LIMITS.maxLayers}
_REGION_MAX_AXIS = ${PINTA_REGION_LIMITS.maxAxis}
_REGION_MIN = ${PINTA_REGION_LIMITS.minCoordinate}
_REGION_END = ${PINTA_REGION_LIMITS.maxCoordinateExclusive}

def _region_integer(value):
    return type(value) is int or (type(value) is float and math.isfinite(value) and value.is_integer())

def _region_fields(value, fields):
    return type(value) is dict and value.keys() == set(fields)

class CelulasRegionais:
    """Owns decoded i16 arrays; callers receive values, never mutable cell buffers."""
    __slots__ = ('_ordered', '_index')

    def __init__(self, chunks):
        self._ordered = tuple(sorted(chunks, key=lambda chunk: (chunk[1], chunk[0])))
        self._index = {(col, row): cells for col, row, cells in self._ordered}

    def at(self, col, row):
        if not _region_integer(col) or not _region_integer(row):
            return -1
        col, row = int(col), int(row)
        cx, cy = col // _REGION_SIDE, row // _REGION_SIDE
        cells = self._index.get((cx, cy))
        return -1 if cells is None else cells[(row - cy * _REGION_SIDE) * _REGION_SIDE + col - cx * _REGION_SIDE]

    def occupied(self, rect, row_major=False):
        """Yields (cell, col, row), visiting stored chunks, never empty world gaps."""
        fields = ('col', 'row', 'cols', 'rows')
        if type(rect) is not dict or any(k not in rect or not _region_integer(rect[k]) or abs(rect[k]) > 9007199254740991 for k in fields) or rect['cols'] < 1 or rect['rows'] < 1:
            return
        left, top, width, height = (int(rect[k]) for k in ('col', 'row', 'cols', 'rows'))
        right, bottom = left + width, top + height
        def visit(chunk, first_row, end_row):
            cx, cy, cells = chunk
            x, y = cx * _REGION_SIDE, cy * _REGION_SIDE
            for row in range(max(first_row, y), min(end_row, y + _REGION_SIDE)):
                for col in range(max(left, x), min(right, x + _REGION_SIDE)):
                    value = cells[(row - y) * _REGION_SIDE + col - x]
                    if value != -1:
                        yield (value, col, row)
        if not row_major:
            for chunk in self._ordered:
                yield from visit(chunk, top, bottom)
            return
        first = 0
        while first < len(self._ordered):
            cy = self._ordered[first][1]
            end = first + 1
            while end < len(self._ordered) and self._ordered[end][1] == cy:
                end += 1
            for row in range(max(top, cy * _REGION_SIDE), min(bottom, (cy + 1) * _REGION_SIDE)):
                for index in range(first, end):
                    yield from visit(self._ordered[index], row, row + 1)
            first = end

class _PlanoRegioes:
    __slots__ = ('_layers', '_bounds', '_consumed', '_index_bytes')

    def __init__(self, layers, bounds, count):
        self._layers, self._bounds = layers, bounds
        self._consumed, self._index_bytes = False, count * _REGION_BYTES

    @property
    def index_bytes(self):
        return self._index_bytes

    def decode(self):
        """One attempt. Decode only after every scene/world header has been admitted."""
        if self._consumed:
            return None
        self._consumed = True
        left, top, width, height = self._bounds
        result = []
        try:
            for layer in self._layers:
                decoded = []
                for col, row, data in layer:
                    if type(data) is not str or len(data) != _REGION_BASE64:
                        return None
                    raw = base64.b64decode(data, validate=True)
                    if len(raw) != _REGION_BYTES or base64.b64encode(raw).decode('ascii') != data:
                        return None
                    cells = array.array('h')
                    if cells.itemsize != 2:
                        return None
                    cells.frombytes(raw)
                    if sys.byteorder != 'little':
                        cells.byteswap()
                    occupied = False
                    for index, value in enumerate(cells):
                        if value < -1:
                            return None
                        if value == -1:
                            continue
                        x, y = col * _REGION_SIDE + index % _REGION_SIDE, row * _REGION_SIDE + index // _REGION_SIDE
                        if x < left or y < top or x >= left + width or y >= top + height:
                            return None
                        occupied = True
                    if not occupied:
                        return None
                    decoded.append((col, row, cells))
                result.append(CelulasRegionais(decoded))
            return tuple(result)
        except (ValueError, TypeError, binascii.Error, UnicodeError):
            return None
        finally:
            # The plan cannot retry and must not retain base64 alongside live arrays.
            self._layers = ()

def preparar_regioes(grids, bounds):
    """Strict wire headers/budget first; captures immutable payloads without decoding."""
    if not _region_fields(bounds, ('col', 'row', 'cols', 'rows')) or any(not _region_integer(v) for v in bounds.values()):
        return None
    left, top, width, height = (int(bounds[k]) for k in ('col', 'row', 'cols', 'rows'))
    if width < 1 or height < 1 or width > _REGION_MAX_AXIS or height > _REGION_MAX_AXIS or left < _REGION_MIN or top < _REGION_MIN or left + width > _REGION_END or top + height > _REGION_END:
        return None
    if type(grids) is not list or len(grids) > _REGION_MAX_LAYERS:
        return None
    count = 0
    for grid in grids:
        if not _region_fields(grid, ('kind', 'version', 'side', 'encoding', 'chunks')) or grid['kind'] != 'regions' or not _region_integer(grid['version']) or grid['version'] != 1 or not _region_integer(grid['side']) or grid['side'] != _REGION_SIDE or grid['encoding'] != 'i16le-base64-v1' or type(grid['chunks']) is not list:
            return None
        count += len(grid['chunks'])
        if count > _REGION_MAX_CHUNKS:
            return None
    layers = []
    for grid in grids:
        chunks, seen = [], set()
        for chunk in grid['chunks']:
            if not _region_fields(chunk, ('col', 'row', 'data')) or not _region_integer(chunk['col']) or not _region_integer(chunk['row']):
                return None
            col, row = int(chunk['col']), int(chunk['row'])
            x, y = col * _REGION_SIDE, row * _REGION_SIDE
            if x >= left + width or y >= top + height or x + _REGION_SIDE <= left or y + _REGION_SIDE <= top or (col, row) in seen:
                return None
            seen.add((col, row))
            # JSON strings are immutable; invalid types are captured as invalid, not retained.
            chunks.append((col, row, chunk['data'] if type(chunk['data']) is str else None))
        layers.append(tuple(chunks))
    return _PlanoRegioes(tuple(layers), (left, top, width, height), count)
`
