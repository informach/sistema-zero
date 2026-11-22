/** Engine-free queries. Keep the two authored physics policies independent of storage version. */
export const pythonScenePhysics = `def _tile_intersects(points, body):
    if not _overlaps(points, body):
        return False
    # The box axes were tested by _overlaps. Only the two independent tile normals remain.
    box = body.corners()
    origin = points[0]
    for end in (points[1], points[3]):
        nx, ny = end[1] - origin[1], origin[0] - end[0]

        def projection(p):
            return (p[0] - origin[0]) * nx + (p[1] - origin[1]) * ny

        tile_span = [projection(p) for p in points]
        box_span = [projection(p) for p in box]
        if max(tile_span) <= min(box_span) or max(box_span) <= min(tile_span):
            return False
    return True


def _platform_surface(points, body, direction):
    left = max(body.left, min(p[0] for p in points))
    right = min(body.right, max(p[0] for p in points))
    if right - left <= 1e-9:
        return None
    heights = []
    for a, b in zip(points, points[1:] + points[:1]):
        if left <= a[0] <= right:
            heights.append(a[1])
        if a[0] != b[0]:
            for x in (left, right):
                if min(a[0], b[0]) <= x <= max(a[0], b[0]):
                    heights.append(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))
    return (min(heights) if direction > 0 else max(heights)) if heights else None


class _ScenePhysics:
    def _contexts(self):
        yield self._root, self._world_matrix, None
        for obj in self._root.objects():
            definition = self._sets.get(obj.get('setId'))
            if definition and obj['width'] > 0 and obj['height'] > 0:
                yield definition, self._set_matrix(self._world_matrix, obj, definition), obj

    def _colliders(self, query, platforms=False):
        size = self._size
        for layers, matrix, parent in self._contexts():
            for layer, alpha, x, y, px, py in layers.visible:
                if layer['kind'] == 'objects':
                    if not platforms and self.fisica == 'precise':
                        for obj in layer['objects']:
                            if obj.get('collision'):
                                placed = dict(obj, x=obj['x'] + x, y=obj['y'] + y)
                                if parent is not None:
                                    placed = self._set_child(parent, placed, layers)
                                yield self._scaled_object(placed), None
                    continue
                sheet = self._sheets[layer['tilesetId']]
                forced = layer.get('collision', False)
                if (
                    platforms
                    and (forced or not sheet['platform'])
                    or not platforms
                    and not forced
                    and not sheet['solid']
                ):
                    continue
                m = _offset(matrix, x, y)
                window = _cell_window(m, query, layers.document, size)
                if window:
                    for cell, col, row in layer['cells'].occupied(window):
                        tile = cell & _TILE_MASK
                        solid = forced or tile in sheet['solid']
                        if (platforms and not solid and tile in sheet['platform']) or (
                            not platforms and solid
                        ):
                            yield None, _quad(m, col * size, row * size, size, size)

    def bloqueado(self, corpo):
        """Full body versus map bounds and solid tiles. Precise mode adds authored outlines."""
        box = _SceneBox(*corpo)
        if not box.valid():
            return False
        limits = self.limites
        if (
            box.left < limits.left
            or box.right > limits.right
            or box.top < limits.top
            or box.bottom > limits.bottom
        ):
            return True
        for obj, tile in self._colliders(box):
            if (
                objeto_intersecta_corpo(obj, box)
                if obj is not None
                else _tile_intersects(tile, box)
            ):
                return True
        return False

    def pouso(self, anterior, atual, gravidade=1):
        """Resolve a precise one-way platform after solid motion. Does not mutate either body."""
        before, after = _SceneBox(*anterior), _SceneBox(*atual)
        if (
            self.fisica != 'precise'
            or not before.valid()
            or not after.valid()
            or not math.isfinite(gravidade)
            or not gravidade
        ):
            return None
        direction = 1 if gravidade > 0 else -1
        epsilon = 1e-6
        if (after.y - before.y) * direction < -epsilon:
            return None
        x, y = min(before.x, after.x) - epsilon, min(before.y, after.y) - epsilon
        query = _SceneBox(
            x,
            y,
            max(before.right, after.right) - x + epsilon,
            max(before.bottom, after.bottom) - y + epsilon,
        )
        if not query.valid():
            return None
        selected, supported = None, False
        for _, tile in self._colliders(query, True):
            surface = _platform_surface(tile, after, direction)
            if surface is None:
                continue
            old_surface = _platform_surface(tile, before, direction)
            old_surface = surface if old_surface is None else old_surface
            old_feet, feet = (
                (before.bottom, after.bottom) if direction > 0 else (before.top, after.top)
            )
            if (old_feet - old_surface) * direction > epsilon or (
                feet - surface
            ) * direction < -epsilon:
                continue
            candidate = after._replace(y=surface - (after.height if direction > 0 else 0))
            if selected is None or (candidate.y - selected.y) * direction < 0:
                selected, supported = candidate, abs(old_feet - old_surface) <= epsilon
        if selected is not None and self.bloqueado(selected):
            return before if supported and not self.bloqueado(before) else None
        return selected
`
