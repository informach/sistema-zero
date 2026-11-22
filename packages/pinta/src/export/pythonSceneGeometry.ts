/** Framework-independent Python geometry. Embedded into each adapter, not copied by hand.
 * Inputs are admitted scene objects and a body exposing x/y/width/height/edges.
 * Rendering, file admission, world lookup and physics-mode selection belong to callers.
 */
export const pythonSceneGeometryFunctions = `def objeto_intersecta_corpo(objeto, rect):
    """Authored outline versus the body's interior; art flips do not change geometry."""
    values = [rect.x, rect.y, rect.width, rect.height, objeto.get('x'), objeto.get('y'), objeto.get('width'), objeto.get('height'), objeto.get('rotation', 0)]
    if any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) for v in values) or rect.width <= 0 or rect.height <= 0:
        return False
    angle = -math.radians(objeto.get('rotation', 0))
    cosine, sine = math.cos(angle), math.sin(angle)
    inset = min(rect.width, rect.height, 1) * 1e-9
    def local(x, y):
        dx, dy = x - objeto['x'], y - objeto['y']
        return (dx * cosine - dy * sine, dx * sine + dy * cosine)
    query = [local(rect.left + inset, rect.top + inset), local(rect.right - inset, rect.top + inset), local(rect.right - inset, rect.bottom - inset), local(rect.left + inset, rect.bottom - inset)]
    def cross(a, b, p):
        return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    def inside(p, points):
        result = False
        for a, b in zip(points, points[1:] + points[:1]):
            if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]:
                result = not result
        return result
    def on(a, b, p):
        return cross(a, b, p) == 0 and min(a[0], b[0]) <= p[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])
    def segment_crosses(a, b, c, d):
        x, y, u, v = cross(a, b, c), cross(a, b, d), cross(c, d, a), cross(c, d, b)
        return (((x > 0 and y < 0) or (x < 0 and y > 0)) and ((u > 0 and v < 0) or (u < 0 and v > 0))) or on(a, b, c) or on(a, b, d) or on(c, d, a) or on(c, d, b)
    width, height = objeto['width'], objeto['height']
    shape = objeto.get('shape', 'point' if width == height == 0 else 'rect')
    if shape == 'point':
        return inside((0, 0), query)
    if shape == 'ellipse':
        if width <= 0 or height <= 0:
            return False
        rx, ry = width / 2, height / 2
        # A positive subnormal radius can underflow to zero. JavaScript's
        # normalized query is non-finite there and has no intersecting edge.
        if rx == 0 or ry == 0:
            return False
        circle = [((p[0] - rx) / rx, (p[1] - ry) / ry) for p in query]
        if inside((0, 0), circle):
            return True
        for a, b in zip(circle, circle[1:] + circle[:1]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            t = max(0, min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy or 1)))
            ex, ey = a[0] + t * dx, a[1] + t * dy
            # Multiplication follows JS overflow to infinity; **2 can raise.
            if ex * ex + ey * ey < 1:
                return True
        return False
    points = [(p['x'], p['y']) for p in objeto.get('points', [])] if shape in ('polygon', 'polyline') else [(0, 0), (width, 0), (width, height), (0, height)]
    if not points or any(not math.isfinite(x) or not math.isfinite(y) for x, y in points):
        return False
    opened = shape == 'polyline'
    second = next((p for p in points if p != points[0]), None)
    if not opened and (len(points) < 3 or second is None or not any(cross(points[0], second, p) != 0 for p in points)):
        return False
    if any(inside(p, query) for p in points) or (not opened and any(inside(p, points) for p in query)):
        return True
    segments = zip(points, points[1:] if opened else points[1:] + points[:1])
    return any(segment_crosses(a, b, c, d) for a, b in segments for c, d in zip(query, query[1:] + query[:1]))

def quadro_arte(arte, animation_id, tempo):
    sprite = arte.get('sprite')
    if not sprite:
        return (0, 0, arte['width'], arte['height'])
    animation = next((a for a in sprite['animations'] if a['id'] == animation_id), None)
    tile = sprite['animations'][0]['frames'][0]['tile']
    if animation:
        frames = animation['frames']
        total = sum(f['duration'] for f in frames)
        at = max(0, tempo) % total if animation['loop'] else min(max(0, tempo), total)
        tile = frames[-1]['tile']
        for frame in frames:
            at -= frame['duration']
            if at < 0:
                tile = frame['tile']
                break
    w, h = sprite['frameWidth'], sprite['frameHeight']
    return (tile % sprite['columns'] * w, tile // sprite['columns'] * h, w, h)

def transformar_objeto_conjunto(parent, child, largura, altura, ids):
    """A mesma base afim de transformSceneSetObject; a geometria não usa flips da arte."""
    sx, sy = parent['width'] / largura, parent['height'] / altura
    a, b = math.radians(parent.get('rotation', 0)), math.radians(child.get('rotation', 0))
    mx, my = -sx if parent.get('flipX') else sx, -sy if parent.get('flipY') else sy
    def vector(x, y):
        return (x * mx * math.cos(a) - y * my * math.sin(a), x * mx * math.sin(a) + y * my * math.cos(a))
    u, v = vector(math.cos(b), math.sin(b)), vector(-math.sin(b), math.cos(b))
    ux, vy = math.hypot(*u), math.hypot(*v)
    reflected = u[0] * v[1] - u[1] * v[0] < 0
    p, origin = vector(child['x'], child['y']), vector(-largura if parent.get('flipX') else 0, -altura if parent.get('flipY') else 0)
    result = dict(child, id=parent['id'] + '/' + child['id'] if child['id'] in ids else child['id'],
                  x=parent['x'] + p[0] + origin[0] + (v[0] * child['height'] if reflected else 0),
                  y=parent['y'] + p[1] + origin[1] + (v[1] * child['height'] if reflected else 0),
                  width=child['width'] * ux, height=child['height'] * vy,
                  rotation=math.degrees(math.atan2(u[1], u[0])), flipX=bool(child.get('flipX')), flipY=bool(child.get('flipY')) != reflected)
    result['properties'] = {key: dict(value, value=parent['id'] + '/' + str(value['value'])) if isinstance(value, dict) and value.get('type') == 'object' and str(value['value']) in ids else value for key, value in child.get('properties', {}).items()}
    if 'points' in child:
        result['points'] = [{'x': point['x'] * ux, 'y': (child['height'] - point['y'] if reflected else point['y']) * vy} for point in child['points']]
    if abs(u[0] * v[0] + u[1] * v[1]) <= 1e-8 * ux * vy:
        return result
    def world(x, y):
        return (parent['x'] + p[0] + origin[0] + u[0] * x + v[0] * y, parent['y'] + p[1] + origin[1] + u[1] * x + v[1] * y)
    if child.get('shape') == 'ellipse':
        bx, by, cx, cy = u[0] * child['width'] / 2, u[1] * child['width'] / 2, v[0] * child['height'] / 2, v[1] * child['height'] / 2
        xx, yy, xy = bx * bx + cx * cx, by * by + cy * cy, bx * by + cx * cy
        delta = math.hypot(xx - yy, 2 * xy)
        rx, ry = math.sqrt(max(0, (xx + yy + delta) / 2)), math.sqrt(max(0, (xx + yy - delta) / 2))
        theta, center = math.atan2(2 * xy, xx - yy) / 2, world(child['width'] / 2, child['height'] / 2)
        result.update(x=center[0] - rx * math.cos(theta) + ry * math.sin(theta), y=center[1] - rx * math.sin(theta) - ry * math.cos(theta), width=rx * 2, height=ry * 2, rotation=math.degrees(theta), flipX=False, flipY=False)
    else:
        at = world(0, 0)
        points = child.get('points', [{'x': 0, 'y': 0}, {'x': child['width'], 'y': 0}, {'x': child['width'], 'y': child['height']}, {'x': 0, 'y': child['height']}])
        result.update(x=at[0], y=at[1], rotation=0, shape=child.get('shape') if child.get('shape') in ('polyline', 'point') else 'polygon',
                      points=[{'x': u[0] * point['x'] + v[0] * point['y'], 'y': u[1] * point['x'] + v[1] * point['y']} for point in points], flipX=bool(child.get('flipX')), flipY=bool(child.get('flipY')))
    return result

`

export const pythonSceneGeometry = `import math\n\n${pythonSceneGeometryFunctions}`
