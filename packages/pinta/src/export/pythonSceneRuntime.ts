/** Private compositor/query surface for a PNG-5 world from ler_mundo_png.
 * The backend receives original crop pixels, a crop-local screen transform and straight opacity.
 * No graphics framework, image decode or player/door policy belongs here.
 */
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, CELL_MAX_TILES } from '../tiles/cell'
import { pythonSceneGeometry } from './pythonSceneGeometry'
import { pythonScenePhysics } from './pythonScenePhysics'
import { pythonScenePlacement } from './pythonScenePlacement'

export const pythonSceneRuntime = `${pythonSceneGeometry}
${pythonScenePlacement}
_TILE_MASK = ${CELL_MAX_TILES - 1}


def _tile_frame(sheet, cell, size, time):
    tile = cell & _TILE_MASK
    frames = sheet.get('animations', {}).get(str(tile), ())
    if frames:
        phase = time % sum(f['duration'] for f in frames)
        for frame in frames:
            phase -= frame['duration']
            if phase < 0:
                tile = frame['tile']
                break
    return (tile % sheet['columns'] * size, tile // sheet['columns'] * size, size, size)


def _tile_matrix(matrix, cell, col, row, size):
    h = -1 if cell & ${CELL_FLIP_H} else 1
    v = -1 if cell & ${CELL_FLIP_V} else 1
    diagonal = bool(cell & ${CELL_FLIP_D})
    flags = (0, v, h, 0) if diagonal else (h, 0, 0, v)
    return _compose(matrix, (*flags, (col + (h < 0)) * size, (row + (v < 0)) * size))


${pythonScenePhysics}


class CenaRegional(_ScenePhysics):
    """Read-only view of an admitted map. All public positions are signed pixels at export scale."""

    def __init__(self, mundo, mapa_id=None):
        self.mapa_id = mundo['rootId'] if mapa_id is None else mapa_id
        data = mundo['maps'][self.mapa_id]['data']
        scene = data['scene']
        self._scene = scene
        self._size, self._scale = scene['tileSize'], data['scale']
        self.tamanho_peca = self._size * self._scale
        self.fisica = scene['physics']
        self.limites = _SceneBox(
            scene['origin']['col'] * self.tamanho_peca,
            scene['origin']['row'] * self.tamanho_peca,
            scene['cols'] * self.tamanho_peca,
            scene['rows'] * self.tamanho_peca,
        )
        self._root = _SceneLayers(scene)
        self._sheets = {s['id']: s for s in scene['tilesets']}
        self._sets = {
            s['id']: _SceneSetLayers(s, self._size, self._sheets, self.fisica == 'precise')
            for s in scene.get('sets', ())
        }
        self._art = {a['id']: a for a in scene.get('art', ())}
        self._world_matrix = (self._scale, 0, 0, self._scale, 0, 0)

    def _set_matrix(self, matrix, obj, layers):
        doc = layers.document
        placed = _placed(matrix, obj, doc['cols'] * self._size, doc['rows'] * self._size)
        return _offset(
            placed, -doc['origin']['col'] * self._size, -doc['origin']['row'] * self._size
        )

    def desenhar(self, draw_affine, viewport, camera=(0, 0), frente=False, tempo=0):
        """Draw one pass. Camera is the top-left in game pixels; time is elapsed milliseconds."""
        box = _SceneBox(0, 0, *viewport)
        if not box.valid() or not all(math.isfinite(n) for n in (*camera, tempo)):
            return
        size = self._size

        def emit(url, crop, matrix, alpha):
            quad = _quad(matrix, 0, 0, *crop[2:])
            if all(math.isfinite(v) for point in quad for v in point) and _overlaps(quad, box):
                draw_affine(url, crop, matrix, alpha)

        def paint(layers, parent, opacity, cam):
            for layer, alpha, x, y, px, py in layers.visible:
                alpha *= opacity
                if alpha <= 0:
                    continue
                m = _offset(parent, x, y)
                m = (*m[:4], m[4] - cam[0] * px, m[5] - cam[1] * py)
                if layer['kind'] == 'tiles':
                    if layer.get('collision') or bool(layer.get('front')) != frente:
                        continue
                    window = _cell_window(m, box, layers.document, size)
                    if window:
                        sheet = self._sheets[layer['tilesetId']]
                        for cell, col, row in layer['cells'].occupied(window, True):
                            emit(
                                sheet['image'],
                                _tile_frame(sheet, cell, size, tempo),
                                _tile_matrix(m, cell, col, row, size),
                                alpha,
                            )
                    continue
                for obj in layer['objects']:
                    if obj['width'] <= 0 or obj['height'] <= 0:
                        continue
                    definition = self._sets.get(obj.get('setId'))
                    if definition:
                        placed = self._set_matrix(m, obj, definition)
                        if definition.draw_bounds[bool(frente)].might_intersect(placed, box):
                            paint(definition, placed, alpha, (0, 0))
                    elif not frente and obj.get('art'):
                        ref = obj['art']
                        sheet = self._sheets.get(ref['assetId'])
                        if sheet:
                            crop = _tile_frame(sheet, ref.get('tile', 0), size, tempo)
                            url = sheet['image']
                        else:
                            art = self._art[ref['assetId']]
                            crop = quadro_arte(art, ref.get('animationId'), tempo)
                            url = art['image']
                        emit(url, crop, _placed(m, obj, *crop[2:]), alpha)

        paint(self._root, self._world_matrix, 1, camera)

    def _scaled_object(self, obj):
        result = dict(obj)
        result['properties'] = {
            k: dict(v) if isinstance(v, dict) else v for k, v in obj['properties'].items()
        }
        if 'art' in obj:
            result['art'] = dict(obj['art'])
        for k in ('x', 'y', 'width', 'height'):
            result[k] *= self._scale
        if 'points' in obj:
            result['points'] = [
                dict(x=p['x'] * self._scale, y=p['y'] * self._scale) for p in obj['points']
            ]
        return result

    def _set_child(self, parent, child, definition):
        doc = definition.document
        placed = dict(
            child,
            x=child['x'] - doc['origin']['col'] * self._size,
            y=child['y'] - doc['origin']['row'] * self._size,
        )
        return transformar_objeto_conjunto(
            parent,
            placed,
            doc['cols'] * self._size,
            doc['rows'] * self._size,
            definition.object_ids,
        )

    def objetos(self, tipo=None):
        """Yield placed game-space objects and their scoped IDs in authored order."""
        for obj in self._root.objects():
            if tipo is None or tipo in (obj['type'], obj.get('role')):
                yield self._scaled_object(obj)
            definition = self._sets.get(obj.get('setId'))
            if definition:
                for child in definition.objects():
                    if tipo is None or tipo in (child['type'], child.get('role')):
                        yield self._scaled_object(self._set_child(obj, child, definition))

    def objeto_por_id(self, referencia):
        return next((o for o in self.objetos() if o['id'] == referencia), None)

    def ponto_inicial(self):
        for obj in self.objetos():
            if obj.get('role') == 'start' or obj['type'] == 'inicio':
                return (obj['x'], obj['y'])

        def center(start, length):
            return (max(start, min(0, start + length - 1)) + 0.5) * self.tamanho_peca

        origin = self._scene['origin']
        return (
            center(origin['col'], self._scene['cols']),
            center(origin['row'], self._scene['rows']),
        )

    @staticmethod
    def propriedade(objeto, chave):
        value = (objeto or {}).get('properties', {}).get(chave)
        return value.get('value') if isinstance(value, dict) else value

    def recurso_imagem(self, referencia):
        resource = self._sheets.get(referencia) or self._art.get(referencia)
        return resource['image'] if resource else None

    def propriedade_camada(self, referencia, chave):
        layer = next((l for l in self._scene['layers'] if l['id'] == referencia), None)
        return self.propriedade(layer, chave)

    def propriedade_peca(self, referencia, peca, chave):
        sheet = self._sheets.get(referencia)
        if (
            not sheet
            or type(peca) not in (float, int)
            or not 0 <= peca < sheet['count']
            or int(peca) != peca
        ):
            return None
        props = sheet.get('tileProperties', {}).get(str(int(peca)), {})
        return self.propriedade({'properties': props}, chave)
`
