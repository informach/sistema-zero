/** Admit legacy PNG maps into the same compositor as PNG5, using bounded dense access only for legacy. */
import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { PINTA_SCENE_LIMITS } from '@sistemazero/core/studio/pinta-scene'
import { CELL_MAX_TILES } from '../tiles/cell'
import { pythonLegacySceneSchemaJSON } from './pythonLegacySceneSchemas.generated'

export const pythonLegacySceneWorld = `_PINTA_LEGACY_SCHEMAS = json.loads(${JSON.stringify(pythonLegacySceneSchemaJSON)})
_PINTA_LEGACY_MAX_CELLS = ${PINTA_IMAGE_WORLD_LIMITS.cells}
_PINTA_LEGACY_MAX_OBJECTS = ${PINTA_SCENE_LIMITS.objects}


class _CelulasDensas:
    """Private i16 storage of admitted legacy layers; coordinates start at zero."""

    __slots__ = ('_cols', '_rows', '_cells', 'chunk_bounds')

    def __init__(self, cols, rows, cells):
        self._cols, self._rows = cols, rows
        self._cells = array.array('h', cells)
        self.chunk_bounds = (0, 0, cols, rows)

    def occupied(self, rect, row_major=False):
        # Dense visitation is already in row order.
        left, top = rect['col'], rect['row']
        for row in range(max(0, top), min(self._rows, top + rect['rows'])):
            for col in range(max(0, left), min(self._cols, left + rect['cols'])):
                cell = self._cells[row * self._cols + col]
                if cell != -1:
                    yield (cell, col, row)


class _PlanoCenaLegada:
    def __init__(self, scene, index_bytes):
        self._scene = scene
        self.id, self.index_bytes = scene['id'], index_bytes

    def decode(self):
        scene, self._scene = self._scene, None
        if scene is None:
            return None
        for current in [scene] + scene.get('sets', []):
            current['origin'] = dict(col=0, row=0)
            for layer in current['layers']:
                if layer['kind'] == 'tiles':
                    layer['cells'] = _CelulasDensas(current['cols'], current['rows'], layer['cells'])
        return scene


def _pinta_atlas_faixas(data, image):
    """Validate source atlas rectangles before any slot is used."""
    size, sheets = data.get('tileSize'), data.get('tilesets')
    if (not _region_integer(size) or not 1 <= size <= _PINTA_PNG_MAX_SIDE
            or type(sheets) is not list or not 1 <= len(sheets) <= 32
            or type(data.get('layers')) is not list or len(data['layers']) > 32):
        _png_invalid()
    spans = []
    for sheet in sheets:
        if type(sheet) is not dict:
            _png_invalid()
        count, cols, y = sheet.get('count'), sheet.get('columns'), sheet.get('y', 0)
        if (not all(_region_integer(n) for n in (count, cols, y))
                or not 1 <= count <= 256 or not 1 <= cols <= 256 or y < 0):
            _png_invalid()
        end = y + math.ceil(count / cols) * size
        if (end > image['height'] or min(cols, count) * size > image['width']
                or any(y < finish and end > start for start, finish in spans)):
            _png_invalid()
        spans.append((int(y), end))
    return [start for start, _ in spans]


def _pinta_atlas_cena(data, offsets):
    """An old flat map already stores positions and its sheet at game-pixel scale."""
    size = data['tileSize']
    sheets, layers = [], []
    for index, raw in enumerate(data['tilesets']):
        sheet = {name: value for name, value in raw.items() if name != 'y'}
        sheets.append(dict(sheet, id=f'folha-{index}', image='atlas'))
    for index, raw in enumerate(data['layers']):
        if type(raw) is not dict:
            _png_invalid()
        layer = {name: value for name, value in raw.items() if name not in ('type', 'tileset')}
        layer['kind'] = raw['type']
        if 'id' not in layer:
            layer['id'] = f'camada-{index}'
        if layer['kind'] == 'tiles':
            sheet = raw['tileset']
            if not _region_integer(sheet) or not 0 <= sheet < len(sheets):
                _png_invalid()
            layer['tilesetId'] = sheets[int(sheet)]['id']
            if layer.get('front') is False:
                del layer['front']
        layers.append(layer)
    scene = dict(version=data['version'], id=data['name'], name=data['name'], tileSize=size,
                 cols=data['cols'], rows=data['rows'], tilesets=sheets, layers=layers)
    legacy = _PINTA_LEGACY_SCHEMAS['scene']
    # Atlas cells are already scaled. The PNG side, rather than the original tile limit, bounds them.
    properties = legacy['properties']
    schema = dict(legacy, properties=dict(properties, tileSize=dict(
        properties['tileSize'], maximum=_PINTA_PNG_MAX_SIDE)))
    if not _scene_schema(scene, schema, schema):
        _png_invalid()
    for sheet, y in zip(sheets, offsets):
        sheet['atlasY'] = y
    return _scene_native(scene, schema, schema)


def _pinta_legacy_plan(info, data, remaining_cells):
    if (type(data) is not dict or data.get('format') != 'pinta' or data.get('kind') != 'map'
            or not _region_integer(data.get('version')) or data['version'] not in (1, 2, 3, 4)
            or type(data.get('name')) is not str or not data['name']
            or not _scene_number(data.get('scale', 1))
            or not 0 < data.get('scale', 1) <= _PINTA_PNG_MAX_SIDE):
        _png_invalid()
    scale = data.get('scale', 1)
    offsets = _pinta_atlas_faixas(data, info)
    scene = data.get('scene')
    atlas = scene is None
    if atlas:
        if data['version'] > 2 or 'scene' in data or 'world' in data:
            _png_invalid()
        scene = _pinta_atlas_cena(data, offsets)
        scale = 1
    else:
        schema = _PINTA_LEGACY_SCHEMAS['scene']
        if (not _scene_schema(scene, schema, schema) or scene['name'] != data['name']
                or scene['cols'] != data.get('cols') or scene['rows'] != data.get('rows')
                or scene['version'] == 3 and data['version'] != 4
                or 'world' in data and data['version'] < 3):
            _png_invalid()
        scene = _scene_native(scene, schema, schema)
    if data['version'] == 3 and 'world' not in data:
        _png_invalid()
    if scene['version'] == 1 and (scene.get('resources') or any(a.get('sprite') for a in scene.get('art', []))):
        _png_invalid()
    size = scene['tileSize'] * scale
    if (size < 1 or size > _PINTA_PNG_MAX_SIDE or abs(size - data['tileSize']) > 1e-9):
        _png_invalid()
    scene['physics'] = 'precise' if scene['version'] == 3 else 'legacy'
    counts = {sheet['id']: sheet['count'] for sheet in scene['tilesets']}
    index_counts, object_count = [], 0
    for current in [scene] + scene.get('sets', []):
        cells = 0
        for layer in current['layers']:
            if layer['kind'] == 'objects':
                object_count += len(layer['objects'])
                if scene['version'] == 1 and any(o.get('art', {}).get('animationId') for o in layer['objects']):
                    _png_invalid()
            if layer['kind'] != 'tiles':
                continue
            values = layer['cells']
            count = counts.get(layer['tilesetId'], 0)
            if (len(values) != current['cols'] * current['rows']
                    or any(cell >= 0 and cell & ${CELL_MAX_TILES - 1} >= count for cell in values)):
                _png_invalid()
            cells += len(values)
        index_counts.append(cells * 2)
        remaining_cells -= cells
    if remaining_cells < 0 or object_count > _PINTA_LEGACY_MAX_OBJECTS:
        _png_limit()
    if not _scene_metadata(scene, index_counts):
        _png_invalid()
    world = data.get('world')
    if 'world' in data:
        schema = _PINTA_LEGACY_SCHEMAS['world']
        if not _scene_schema(world, schema, schema) or world['rootId'] != scene['id']:
            _png_invalid()
    view = dict(name=scene['name'], scale=scale, scene=scene)
    if world is not None:
        view['world'] = world
    result = _PlanoImagem(view, _PlanoCenaLegada(scene, sum(index_counts)))
    return result, atlas, remaining_cells


def _ler_mundo_legado(root, data):
    metadata = len(root['text'].encode('utf-8'))
    plan, atlas, remaining = _pinta_legacy_plan(root, data, _PINTA_LEGACY_MAX_CELLS)
    pixels = root['width'] * root['height']
    cover = {key: root[key] for key in ('png', 'width', 'height')}
    images = {}
    if atlas:
        # No child world uses this synthetic texture key. The bytes are the original file.
        images['atlas'] = dict(cover, scaledWidth=cover['width'], scaledHeight=cover['height'])
    plans, covers = [plan], {plan.id: cover}
    for descriptor in (() if plan.world is None else plan.world['maps']):
        source = png_da_url(descriptor['png'])
        child = ler_texto_png(source['png'], _PINTA_WORLD_MAX_TEXT - metadata)
        metadata += len(child['text'].encode('utf-8'))
        pixels += child['width'] * child['height']
        if metadata > _PINTA_WORLD_MAX_TEXT or pixels > _PINTA_WORLD_MAX_PIXELS:
            _png_limit()
        child_data = _pinta_parse_json(child['text'])
        if (type(child_data) is not dict or 'world' in child_data or child_data.get('version') not in (2, 4)
                or child_data['version'] == 4 and data['version'] != 4):
            _png_invalid()
        place, child_atlas, remaining = _pinta_legacy_plan(child, child_data, remaining)
        if child_atlas or place.id != descriptor['id'] or place.name != descriptor['name'] or place.scale != plan.scale:
            _png_invalid()
        plans.append(place)
        covers[place.id] = {key: child[key] for key in ('png', 'width', 'height')}
    return _admitir_mundo_imagens(plans, covers, pixels, images)


def ler_mundo_cenario(source):
    """Dispatch from the original captured PNG header. Neither branch performs graphics work."""
    root = ler_texto_png(source)
    try:
        data = _pinta_parse_json(root['text'])
        if type(data) is dict and data.get('version') == 5:
            plan = _preparar_imagem_valor(data, _PINTA_WORLD_MAX_INDICES)
            if plan is None:
                _png_invalid()
            return _ler_mundo_regional(root, plan)
        return _ler_mundo_legado(root, data)
    except (KeyError, IndexError, OverflowError, RecursionError, TypeError) as error:
        _png_invalid(error)
`
