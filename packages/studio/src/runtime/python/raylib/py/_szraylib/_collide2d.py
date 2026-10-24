"""Colisões 2D do raylib (rshapes.c), com as mesmas regras de borda.

Por exemplo, ``check_collision_recs`` usa ``<`` e ``>``: dois retângulos que só se encostam na
borda NÃO colidem; ``check_collision_point_rec`` conta a borda esquerda/de cima e não a direita.
"""
from ._args import integer, number, rect, vec2
from ._structs import Rectangle, Vector2

_EPSILON = 1.1920928955078125e-07  # FLT_EPSILON


def check_collision_recs(rec1, rec2, /):
    f = 'check_collision_recs'
    ax, ay, aw, ah = rect(rec1, f, 'rec1')
    bx, by, bw, bh = rect(rec2, f, 'rec2')
    return ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by


def check_collision_circles(center1, radius1, center2, radius2, /):
    f = 'check_collision_circles'
    x1, y1 = vec2(center1, f, 'center1')
    x2, y2 = vec2(center2, f, 'center2')
    r = number(radius1, f, 'radius1') + number(radius2, f, 'radius2')
    dx, dy = x2 - x1, y2 - y1
    return dx * dx + dy * dy <= r * r


def check_collision_circle_rec(center, radius, rec, /):
    f = 'check_collision_circle_rec'
    cx, cy = vec2(center, f, 'center')
    r = number(radius, f, 'radius')
    x, y, w, h = rect(rec, f, 'rec')
    dx = abs(cx - (x + w / 2.0))
    dy = abs(cy - (y + h / 2.0))
    if dx > w / 2.0 + r or dy > h / 2.0 + r:
        return False
    if dx <= w / 2.0 or dy <= h / 2.0:
        return True
    corner = (dx - w / 2.0) ** 2 + (dy - h / 2.0) ** 2
    return corner <= r * r


def check_collision_circle_line(center, radius, p1, p2, /):
    f = 'check_collision_circle_line'
    cx, cy = vec2(center, f, 'center')
    r = number(radius, f, 'radius')
    x1, y1 = vec2(p1, f, 'p1')
    x2, y2 = vec2(p2, f, 'p2')
    dx, dy = x1 - x2, y1 - y2
    if abs(dx) + abs(dy) <= _EPSILON:
        return (x1 - cx) ** 2 + (y1 - cy) ** 2 <= r * r
    length = dx * dx + dy * dy
    dot = ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / length
    dot = 1.0 if dot > 1.0 else 0.0 if dot < 0.0 else dot
    ex = (x1 - dot * dx) - cx
    ey = (y1 - dot * dy) - cy
    return ex * ex + ey * ey <= r * r


def check_collision_point_rec(point, rec, /):
    f = 'check_collision_point_rec'
    px, py = vec2(point, f, 'point')
    x, y, w, h = rect(rec, f, 'rec')
    return x <= px < x + w and y <= py < y + h


def check_collision_point_circle(point, center, radius, /):
    f = 'check_collision_point_circle'
    px, py = vec2(point, f, 'point')
    cx, cy = vec2(center, f, 'center')
    r = number(radius, f, 'radius')
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def check_collision_point_triangle(point, p1, p2, p3, /):
    f = 'check_collision_point_triangle'
    px, py = vec2(point, f, 'point')
    ax, ay = vec2(p1, f, 'p1')
    bx, by = vec2(p2, f, 'p2')
    cx, cy = vec2(p3, f, 'p3')
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if den == 0:
        return False
    alpha = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den
    beta = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den
    gamma = 1.0 - alpha - beta
    return alpha > 0 and beta > 0 and gamma > 0


def check_collision_point_poly(point, points, pointCount, /):
    f = 'check_collision_point_poly'
    px, py = vec2(point, f, 'point')
    count = integer(pointCount, f, 'pointCount')
    pts = [vec2(p, f, 'points') for p in list(points)[:count]]
    inside = False
    if len(pts) > 2:
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
    return inside


def check_collision_lines(startPos1, endPos1, startPos2, endPos2, collisionPoint, /):
    f = 'check_collision_lines'
    ax, ay = vec2(startPos1, f, 'startPos1')
    bx, by = vec2(endPos1, f, 'endPos1')
    cx, cy = vec2(startPos2, f, 'startPos2')
    dx, dy = vec2(endPos2, f, 'endPos2')
    rx, ry = bx - ax, by - ay
    sx, sy = dx - cx, dy - cy
    div = rx * sy - ry * sx
    if abs(div) < _EPSILON:
        return False
    t = ((cx - ax) * sy - (cy - ay) * sx) / div
    u = ((cx - ax) * ry - (cy - ay) * rx) / div
    if 0.0 <= t <= 1.0 and 0.0 <= u <= 1.0:
        if isinstance(collisionPoint, Vector2):
            collisionPoint.x = ax + t * rx
            collisionPoint.y = ay + t * ry
        return True
    return False


def check_collision_point_line(point, p1, p2, threshold, /):
    f = 'check_collision_point_line'
    px, py = vec2(point, f, 'point')
    x1, y1 = vec2(p1, f, 'p1')
    x2, y2 = vec2(p2, f, 'p2')
    margin = integer(threshold, f, 'threshold')
    dxc, dyc = px - x1, py - y1
    dxl, dyl = x2 - x1, y2 - y1
    cross = dxc * dyl - dyc * dxl
    if abs(cross) < margin * max(abs(dxl), abs(dyl)):
        if abs(dxl) >= abs(dyl):
            return x1 <= px <= x2 if dxl > 0 else x2 <= px <= x1
        return y1 <= py <= y2 if dyl > 0 else y2 <= py <= y1
    return False


def get_collision_rec(rec1, rec2, /):
    f = 'get_collision_rec'
    ax, ay, aw, ah = rect(rec1, f, 'rec1')
    bx, by, bw, bh = rect(rec2, f, 'rec2')
    left = max(ax, bx)
    right = min(ax + aw, bx + bw)
    top = max(ay, by)
    bottom = min(ay + ah, by + bh)
    if left < right and top < bottom:
        return Rectangle(left, top, right - left, bottom - top)
    return Rectangle(0, 0, 0, 0)
