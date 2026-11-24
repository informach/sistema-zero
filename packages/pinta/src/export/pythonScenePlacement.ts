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


class _SceneBounds:
    """A conservative definition-space envelope. Uncertain arithmetic cannot cull it."""

    __slots__ = ('edges', 'magnitude', 'uncertain')

    def __init__(self, magnitude):
        self.edges = None
        self.magnitude = magnitude
        self.uncertain = False

    def include(self, edges, magnitude):
        if not all(math.isfinite(v) for v in (*edges, magnitude)):
            self.uncertain = True
            return
        left, top, right, bottom = edges
        if self.edges is not None:
            x0, y0, x1, y1 = self.edges
            left, top = min(left, x0), min(top, y0)
            right, bottom = max(right, x1), max(bottom, y1)
        self.edges = left, top, right, bottom
        self.magnitude = max(self.magnitude, magnitude, *(abs(v) for v in edges))

    def include_quad(self, quad, magnitude):
        if not all(math.isfinite(v) for point in quad for v in point):
            self.uncertain = True
            return
        xs, ys = zip(*quad)
        self.include((min(xs), min(ys), max(xs), max(ys)), magnitude)

    def might_intersect(self, matrix, box, reach=0, placement=0):
        if self.uncertain:
            return True
        if self.edges is None:
            return False
        left, top, right, bottom = self.edges
        a, b, c, d, e, f = matrix
        stretch = math.hypot(a, b) + math.hypot(c, d)
        # Broad-phase only. Bound the rounding of offset, rotation, scaling and
        # corners relative to their operands, including cancellation in offsets.
        magnitude = max(1, abs(e), abs(f), stretch * self.magnitude, placement)
        pad = stretch * reach + 32 * math.ulp(magnitude)
        quad = _quad(matrix, left, top, right - left, bottom - top)
        if not math.isfinite(pad) or not all(math.isfinite(v) for point in quad for v in point):
            return True
        xs, ys = zip(*quad)
        return (
            min(xs) - pad < box.right and max(xs) + pad > box.left
            and min(ys) - pad < box.bottom and max(ys) + pad > box.top
        )


def _tile_query_layer(layer, sheet, platforms):
    forced = layer.get('collision', False)
    return not forced and bool(sheet['platform']) if platforms else forced or bool(sheet['solid'])


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


class _SceneSetLayers(_SceneLayers):
    """One summary per definition and pass. Stored cells stay in the common reader."""

    def __init__(self, document, size, sheets, precise):
        super().__init__(document)
        col, row = document['origin']['col'], document['origin']['row']
        end_col, end_row = col + document['cols'], row + document['rows']
        origin = max(abs(col), abs(row)) * size
        self.draw_bounds = _SceneBounds(origin), _SceneBounds(origin)
        self.solid_tiles = _SceneBounds(origin)
        self.platform_tiles = _SceneBounds(origin)
        self.outlines = _SceneBounds(origin)
        self.outline_reach = 0
        for layer, alpha, x, y, _, _ in self.visible:
            offset = max(abs(x), abs(y))
            if layer['kind'] == 'tiles':
                chunks = layer['cells'].chunk_bounds
                if chunks is None:
                    continue
                left, top = max(col, chunks[0]), max(row, chunks[1])
                right, bottom = min(end_col, chunks[2]), min(end_row, chunks[3])
                edges = left * size + x, top * size + y, right * size + x, bottom * size + y
                magnitude = max(offset, max(abs(left), abs(top), abs(right), abs(bottom)) * size)
                if alpha > 0 and not layer.get('collision'):
                    self.draw_bounds[bool(layer.get('front'))].include(edges, magnitude)
                sheet = sheets[layer['tilesetId']]
                if _tile_query_layer(layer, sheet, False):
                    self.solid_tiles.include(edges, magnitude)
                if _tile_query_layer(layer, sheet, True):
                    self.platform_tiles.include(edges, magnitude)
                continue
            for obj in layer['objects']:
                width, height = obj['width'], obj['height']
                magnitude = max(offset, abs(obj['x']), abs(obj['y']), width, height)
                if alpha > 0 and obj.get('art') and width > 0 and height > 0:
                    # Every animation crop fills this same authored rectangle.
                    matrix = _placed((1, 0, 0, 1, x, y), obj, 1, 1)
                    self.draw_bounds[False].include_quad(_quad(matrix, 0, 0, 1, 1), magnitude)
                if precise and obj.get('collision'):
                    ox, oy = obj['x'] + x, obj['y'] + y
                    self.outlines.include((ox, oy, ox, oy), magnitude)
                    point_reach = max(
                        (abs(p['x']) + abs(p['y']) for p in obj.get('points', ())), default=0
                    )
                    # Reconstructing a reflected shape can move its anchor by a
                    # height and measure its points from the opposite edge. An
                    # anchor plus reach stays conservative through that step,
                    # including the ellipse/near-orthogonal shape conversion.
                    reach = max(width + height, point_reach) + 2 * height
                    self.outline_reach = max(self.outline_reach, reach)

    def might_collide(self, matrix, query, platforms, placement):
        if platforms:
            return self.platform_tiles.might_intersect(matrix, query)
        return self.solid_tiles.might_intersect(matrix, query) or self.outlines.might_intersect(
            matrix, query, self.outline_reach, placement
        )
`
