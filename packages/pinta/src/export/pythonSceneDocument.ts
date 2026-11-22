/** Private scene-4 admission, independent of graphics engines. No recipe/runtime promotion. */
import {
  PINTA_REGION_SCENE_MAX_INDEX_BYTES,
  PINTA_REGION_SCENE_MAX_JSON_BYTES,
} from '@sistemazero/core/studio/pinta-region-scene'
import { PINTA_SCENE_LIMITS } from '@sistemazero/core/studio/pinta-scene'
import { CELL_MAX_TILES } from '../tiles/cell'
import { pythonSceneRegions } from './pythonSceneRegions'
import { pythonSceneSchemaJSON } from './pythonSceneSchemas.generated'

export const pythonSceneDocument = `${pythonSceneRegions}
import json
import re

_SCENE_TABLE = json.loads(${JSON.stringify(pythonSceneSchemaJSON)})
_SCENE_SCHEMA = _SCENE_TABLE['region']
_SCENE_MAX_JSON = ${PINTA_REGION_SCENE_MAX_JSON_BYTES}
_SCENE_MAX_INDICES = ${PINTA_REGION_SCENE_MAX_INDEX_BYTES}

def _scene_number(value):
    return type(value) in (int, float) and math.isfinite(value)

def _scene_pattern(pattern, flags, value):
    return re.fullmatch(pattern, value, re.ASCII | (re.IGNORECASE if flags == 'i' else 0)) is not None

def _scene_property(value):
    if type(value) is not dict:
        return True
    kind, item = value.get('type'), value.get('value')
    if kind == 'int':
        return _scene_number(item) and _region_integer(item)
    if kind == 'float':
        return _scene_number(item)
    if kind == 'color':
        color = _SCENE_TABLE['propertyColor']
        return type(item) is str and _scene_pattern(color['pattern'], color['flags'], item)
    return kind in ('object', 'asset') and type(item) is str

def _scene_schema(value, schema, root=None):
    """Only the generated, build-checked constraint vocabulary, not arbitrary JSON Schema."""
    if type(schema) is bool:
        return schema
    if root is None:
        root=_SCENE_SCHEMA
    if '$ref' in schema and not _scene_schema(value, root['$defs'][schema['$ref'].split('/')[-1]],root):
        return False
    if 'anyOf' in schema and not any(_scene_schema(value, child,root) for child in schema['anyOf']):
        return False
    if 'oneOf' in schema and sum(_scene_schema(value, child,root) for child in schema['oneOf']) != 1:
        return False
    kind = schema.get('type')
    if kind == 'object' and type(value) is not dict or kind == 'array' and type(value) is not list or kind == 'string' and type(value) is not str or kind == 'boolean' and type(value) is not bool:
        return False
    if kind in ('number', 'integer') and (not _scene_number(value) or kind == 'integer' and not _region_integer(value)):
        return False
    if 'const' in schema and value != schema['const'] or 'enum' in schema and value not in schema['enum']:
        return False
    if schema.get('x-pinta-property') and not _scene_property(value):
        return False
    if type(value) is str:
        # Zod measures JS UTF-16 code units, including escaped lone surrogates.
        length = len(value) if value.isascii() else len(value) + sum(ord(char) > 65535 for char in value)
        if length < schema.get('minLength', 0) or 'maxLength' in schema and length > schema['maxLength']:
            return False
        if 'pattern' in schema and not _scene_pattern(schema['pattern'], schema.get('x-pinta-pattern-flags', ''), value):
            return False
        if schema.get('x-pinta-no-controls') and any(ord(char)<32 or 127<=ord(char)<=159 for char in value):
            return False
    if _scene_number(value):
        if 'minimum' in schema and value < schema['minimum'] or 'maximum' in schema and value > schema['maximum'] or 'exclusiveMinimum' in schema and value <= schema['exclusiveMinimum']:
            return False
    if type(value) is list:
        if len(value) < schema.get('minItems', 0) or 'maxItems' in schema and len(value) > schema['maxItems']:
            return False
        if 'items' in schema and not all(_scene_schema(item, schema['items'],root) for item in value):
            return False
    if type(value) is dict:
        if any(key not in value for key in schema.get('required', [])) or 'maxProperties' in schema and len(value) > schema['maxProperties']:
            return False
        if 'propertyNames' in schema and not all(_scene_schema(key, schema['propertyNames'],root) for key in value):
            return False
        properties = schema.get('properties', {})
        if 'properties' in schema or 'additionalProperties' in schema:
            for key, item in value.items():
                if not _scene_schema(item, properties.get(key, schema.get('additionalProperties', True)),root):
                    return False
        if schema.get('x-pinta-world'):
            ids=[value['rootId']]+[item['id'] for item in value['maps']]
            if len(ids)!=len(set(ids)) or sum(len(item['png']) for item in value['maps'])>_SCENE_TABLE['worldEncodedChars']:
                return False
    return True

def _scene_native(value, schema, root=None):
    """After admission, give declared integer/float fields native Python types."""
    if type(schema) is bool:
        return value
    if root is None:
        root=_SCENE_SCHEMA
    if '$ref' in schema:
        value = _scene_native(value, root['$defs'][schema['$ref'].split('/')[-1]],root)
    for union in ('anyOf', 'oneOf'):
        for child in schema.get(union, []):
            if _scene_schema(value, child,root):
                value = _scene_native(value, child,root)
                break
    if schema.get('type') == 'integer' or 'const' in schema and _region_integer(schema['const']):
        return int(value)
    if type(value) is list and 'items' in schema:
        for index in range(len(value)):
            value[index] = _scene_native(value[index], schema['items'],root)
    if type(value) is dict and ('properties' in schema or 'additionalProperties' in schema):
        properties = schema.get('properties', {})
        for key in value:
            value[key] = _scene_native(value[key], properties.get(key, schema.get('additionalProperties', True)),root)
    if schema.get('x-pinta-property') and type(value) is dict:
        if value['type'] == 'int':
            value['value'] = int(value['value'])
        elif value['type'] == 'float':
            value['value'] = float(value['value'])
    return value

def _scene_tile_key(text):
    # Number(key), including radix forms and JS whitespace; never Python's underscores/digits.
    text = text.strip(' \\t\\n\\r\\v\\f\\u00a0\\u1680\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff')
    if not text:
        return 0
    for prefix, base, digits, maximum in [('0x',16,'[0-9a-fA-F]+',2),('0b',2,'[01]+',8),('0o',8,'[0-7]+',3)]:
        if text.lower().startswith(prefix):
            part = text[2:]
            if not re.fullmatch(digits, part, re.ASCII):
                return -1
            part = part.lstrip('0')
            return int(part or '0', base) if len(part) <= maximum else -1
    if not re.fullmatch(r'[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?', text, re.ASCII):
        return -1
    number = float(text)
    return int(number) if math.isfinite(number) and number.is_integer() else -1

def _scene_metadata(scene, grid_index_bytes):
    tilesets, art, sets = scene['tilesets'], scene.get('art', []), scene.get('sets', [])
    def unique(values):
        return len(values) == len(set(values))
    if not unique([a['id'] for a in tilesets + art]) or not unique([s['id'] for s in sets]):
        return False
    tile_by_id = {t['id']:t for t in tilesets}
    art_by_id = {a['id']:a for a in art}
    set_ids = {s['id'] for s in sets}
    for image in art:
        sprite = image.get('sprite')
        if not sprite:
            continue
        if not unique([a['id'] for a in sprite['animations']]) or image['width'] % sprite['frameWidth'] or image['height'] % sprite['frameHeight'] or image['width'] != sprite['columns'] * sprite['frameWidth'] or any(f['tile'] >= sprite['columns'] * image['height'] / sprite['frameHeight'] for a in sprite['animations'] for f in a['frames']):
            return False
    resources = scene.get('resources', [])
    if not unique([r['id'] for r in resources]) or any(r['id'] == r['sourceId'] or r['id'] not in tile_by_id and r['id'] not in art_by_id for r in resources):
        return False
    for tileset in tilesets:
        indices = tileset['solid'] + tileset['platform']
        indices += [_scene_tile_key(k) for k in tileset.get('animations', {})]
        indices += [f['tile'] for animation in tileset.get('animations', {}).values() for f in animation]
        indices += [_scene_tile_key(k) for k in tileset.get('tileProperties', {})]
        indices += [_scene_tile_key(k) for terrain in tileset.get('terrains', []) for k in terrain['tiles']]
        if any(n < 0 or n >= tileset['count'] for n in indices) or any(c > len(terrain['colors']) for terrain in tileset.get('terrains', []) for corners in terrain['tiles'].values() for c in corners):
            return False
    for index, current in enumerate([scene] + sets):
        groups, ids = set(), set()
        if grid_index_bytes[index] // 2 > ${PINTA_SCENE_LIMITS.cells}:
            return False
        for layer in current['layers']:
            if layer['id'] in ids or 'parentId' in layer and layer['parentId'] not in groups:
                return False
            ids.add(layer['id'])
            if layer['kind'] == 'group':
                groups.add(layer['id'])
            if layer['kind'] == 'tiles' and layer['tilesetId'] not in tile_by_id:
                return False
            if layer['kind'] != 'objects':
                continue
            if not unique([o['id'] for o in layer['objects']]):
                return False
            for obj in layer['objects']:
                if obj.get('collision') and scene.get('physics') == 'legacy' or index > 0 and 'setId' in obj or 'setId' in obj and obj['setId'] not in set_ids:
                    return False
                ref = obj.get('art')
                if not ref:
                    continue
                target = ref['assetId']
                if target not in tile_by_id and target not in art_by_id:
                    return False
                if 'tile' in ref and target in tile_by_id and ref['tile'] >= tile_by_id[target]['count']:
                    return False
                if 'animationId' in ref and not any(a['id'] == ref['animationId'] for a in art_by_id.get(target, {}).get('sprite', {}).get('animations', [])):
                    return False
    return True

class _PlanoCena:
    __slots__ = ('_scene', '_plans', '_bytes', '_id', '_name')

    def __init__(self, scene, plans, index_bytes):
        self._scene, self._plans, self._bytes = scene, tuple(plans), index_bytes
        self._id, self._name = scene['id'], scene['name']

    @property
    def id(self):
        return self._id

    @property
    def name(self):
        return self._name

    @property
    def index_bytes(self):
        return self._bytes

    def decode(self):
        scene, plans = self._scene, self._plans
        self._scene, self._plans = None, ()
        if scene is None:
            return None
        tile_counts = {t['id']: t['count'] for t in scene['tilesets']}
        for current, plan in zip([scene] + scene.get('sets', []), plans):
            grids = plan.decode()
            if grids is None:
                return None
            rect = dict(current['origin'], cols=current['cols'], rows=current['rows'])
            index = 0
            for layer in current['layers']:
                if layer['kind'] != 'tiles':
                    continue
                grid = grids[index]
                if any((cell & ${CELL_MAX_TILES - 1}) >= tile_counts[layer['tilesetId']] for cell, col, row in grid.occupied(rect)):
                    return None
                layer['cells'] = grid
                index += 1
        return scene

def _preparar_cena_valor(scene,max_index_bytes):
    # Internal owned JSON snapshot only. The caller must first admit its wire size.
    if not _region_integer(max_index_bytes) or max_index_bytes<0 or max_index_bytes>_SCENE_MAX_INDICES or not _scene_schema(scene,_SCENE_SCHEMA):
        return None
    plans,index_bytes=[],0
    for current in [scene]+scene.get('sets',[]):
        grids=[layer['cells'] for layer in current['layers'] if layer['kind']=='tiles']
        plan=preparar_regioes(grids,dict(current['origin'],cols=current['cols'],rows=current['rows']))
        if plan is None:
            return None
        index_bytes+=plan.index_bytes
        if index_bytes>max_index_bytes:
            return None
        plans.append(plan)
    if not _scene_metadata(scene,[plan.index_bytes for plan in plans]):
        return None
    scene=_scene_native(scene,_SCENE_SCHEMA)
    return _PlanoCena(scene,plans,index_bytes)

def _pinta_parse_json(text):
    def invalid_constant(value):
        raise ValueError('Non-JSON numeric constant')
    return json.loads(text,parse_int=float,parse_float=float,parse_constant=invalid_constant)

def preparar_cena(text, max_index_bytes=_SCENE_MAX_INDICES):
    """Strict private scene-4 JSON; no graphics, network or dense world allocation."""
    try:
        if type(text) is not str or len(text) > _SCENE_MAX_JSON or len(text.encode('utf-8')) > _SCENE_MAX_JSON or not _region_integer(max_index_bytes) or max_index_bytes < 0 or max_index_bytes > _SCENE_MAX_INDICES:
            return None
        return _preparar_cena_valor(_pinta_parse_json(text),max_index_bytes)
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        return None
`
