/** Placement and clipping shared by rendering and spatial queries on an admitted scene. */
export const pythonScenePlacement = `from collections import namedtuple


class _SceneBox(namedtuple('_SceneBox', 'x y width height')):
    __slots__ = ()
    left = property(lambda self: self.x)
    top = property(lambda self: self.y)
    right = property(lambda self: self.x + self.width)
    bottom = property(lambda self: self.y + self.height)

    def valid(self):
        return (
            self.width > 0
            and self.height > 0
            and all(math.isfinite(v) for v in (*self, self.right, self.bottom))
        )

    def corners(self):
        return (
            (self.left, self.top),
            (self.right, self.top),
            (self.right, self.bottom),
            (self.left, self.bottom),
        )


def _compose(m, n):
    a, b, c, d, e, f = m
    g, h, i, j, k, l = n
    return (
        a * g + c * h,
        b * g + d * h,
        a * i + c * j,
        b * i + d * j,
        a * k + c * l + e,
        b * k + d * l + f,
    )


def _offset(m, x, y):
    a, b, c, d, e, f = m
    return (a, b, c, d, a * x + c * y + e, b * x + d * y + f)


def _scale(m, sx, sy):
    a, b, c, d, e, f = m
    return (a * sx, b * sx, c * sy, d * sy, e, f)


def _placed(m, obj, width, height):
    angle = math.radians(obj.get('rotation', 0))
    co, si = math.cos(angle), math.sin(angle)
    at = _compose(m, (co, si, -si, co, obj['x'], obj['y']))
    fx, fy = obj.get('flipX'), obj.get('flipY')
    at = _offset(at, obj['width'] if fx else 0, obj['height'] if fy else 0)
    return _scale(
        at, (-1 if fx else 1) * obj['width'] / width, (-1 if fy else 1) * obj['height'] / height
    )


def _quad(matrix, x, y, width, height):
    a, b, c, d, e, f = _offset(matrix, x, y)
    return (
        (e, f),
        (e + a * width, f + b * width),
        (e + a * width + c * height, f + b * width + d * height),
        (e + c * height, f + d * height),
    )


def _overlaps(quad, box):
    xs, ys = zip(*quad)
    return min(xs) < box.right and max(xs) > box.left and min(ys) < box.bottom and max(ys) > box.top


def _cell_window(matrix, box, document, size):
    # Tile layers have orthogonal axes (one level of authored set placement).
    # Normalize each axis independently: a very small determinant can underflow.
    a, b, c, d, x, y = matrix
    sx, sy = math.hypot(a, b), math.hypot(c, d)
    if not sx or not sy or not all(math.isfinite(v) for v in (*matrix, sx, sy)):
        return None
    u, v = (a / sx, b / sx), (c / sy, d / sy)
    corners = [(px - x, py - y) for px, py in box.corners()]

    def span(axis, scale, origin, count):
        coords = [(px * axis[0] + py * axis[1]) / scale / size for px, py in corners]
        # Clip before conversion to int, including infinities from very small scales.
        start = math.floor(max(origin, min(origin + count, min(coords) - 1e-7)))
        stop = math.ceil(max(origin, min(origin + count, max(coords) + 1e-7)))
        return start, stop - start

    origin = document['origin']
    col, cols = span(u, sx, origin['col'], document['cols'])
    row, rows = span(v, sy, origin['row'], document['rows'])
    if cols and rows:
        return dict(col=col, row=row, cols=cols, rows=rows)


class _SceneLayers:
    def __init__(self, document):
        self.document = document
        self.visible = []
        self.object_ids = set()
        groups = {layer['id']: layer for layer in document['layers'] if layer['kind'] == 'group'}
        for layer in document['layers']:
            if layer['kind'] == 'group':
                continue
            # Keep sceneLayerState's leaf-to-root arithmetic, including fractional offsets.
            visible, alpha, x, y, px, py = True, 1, 0, 0, 1, 1
            current = layer
            while current is not None:
                visible = visible and current['visible']
                alpha *= current.get('opacity', 1)
                x += current.get('offsetX', 0)
                y += current.get('offsetY', 0)
                px *= current.get('parallaxX', 1)
                py *= current.get('parallaxY', 1)
                current = groups.get(current.get('parentId'))
            if visible:
                self.visible.append((layer, alpha, x, y, px, py))
            if layer['kind'] == 'objects':
                self.object_ids.update(o['id'] for o in layer['objects'])

    def objects(self):
        for layer, alpha, x, y, px, py in self.visible:
            if layer['kind'] == 'objects':
                for obj in layer['objects']:
                    yield dict(obj, x=obj['x'] + x, y=obj['y'] + y)
`
