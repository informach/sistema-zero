"""Colisões 3D (rmodels.c do raylib 6.0): esferas, caixas e raios.

As contas são as do raylib, inclusive os detalhes que mudam o resultado: o raio que sai de dentro
da caixa (distância negativa), a normal da caixa arredondada para o eixo e o triângulo que só
conta no sentido em que o raio o atravessa (sem descartar a face de trás).
"""
from . import _raymath as rm
from ._args import struct
from ._float32 import F, c_int, sqrtf
from ._raymath import number, vec3
from ._structs import BoundingBox, Ray, RayCollision, Vector3

# As contas em float, operação por operação, como no C (ver _float32.py).
_EPSILON = F(0.000001)


def _box(value, function, param='box'):
    b = struct(value, BoundingBox, function, param)
    return (F(b.min.x), F(b.min.y), F(b.min.z)), (F(b.max.x), F(b.max.y), F(b.max.z))


def _ray(value, function):
    r = struct(value, Ray, function, 'ray')
    return ((F(r.position.x), F(r.position.y), F(r.position.z)),
            (F(r.direction.x), F(r.direction.y), F(r.direction.z)))


def _dist2(a, b):
    # Vector3DistanceSqr(a, b)
    dx, dy, dz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    return dx * dx + dy * dy + dz * dz


def _clamp(value, low, high):
    value = low if value < low else value
    return high if value > high else value


def check_collision_spheres(center1, radius1, center2, radius2, /):
    f = 'check_collision_spheres'
    a, b = vec3(center1, f, 'center1'), vec3(center2, f, 'center2')
    total = number(radius1, f, 'radius1') + number(radius2, f, 'radius2')
    return _dist2(a, b) <= total * total


def check_collision_boxes(box1, box2, /):
    f = 'check_collision_boxes'
    (a_min, a_max), (b_min, b_max) = _box(box1, f, 'box1'), _box(box2, f, 'box2')
    if a_max[0] >= b_min[0] and a_min[0] <= b_max[0]:
        if a_max[1] < b_min[1] or a_min[1] > b_max[1]:
            return False
        if a_max[2] < b_min[2] or a_min[2] > b_max[2]:
            return False
        return True
    return False


def check_collision_box_sphere(box, center, radius, /):
    f = 'check_collision_box_sphere'
    low, high = _box(box, f)
    c = vec3(center, f, 'center')
    r = number(radius, f, 'radius')
    closest = (_clamp(c[0], low[0], high[0]), _clamp(c[1], low[1], high[1]),
               _clamp(c[2], low[2], high[2]))
    return _dist2(c, closest) <= r * r


def _collision(hit=False, distance=0.0, point=(0.0, 0.0, 0.0), normal=(0.0, 0.0, 0.0)):
    return RayCollision(hit, distance, Vector3(*point), Vector3(*normal))


def get_ray_collision_sphere(ray, center, radius, /):
    f = 'get_ray_collision_sphere'
    origin, direction = _ray(ray, f)
    c = vec3(center, f, 'center')
    r = number(radius, f, 'radius')
    to_center = rm._sub3(c, origin)
    along = to_center[0] * direction[0] + to_center[1] * direction[1] + to_center[2] * direction[2]
    distance = rm._length3(to_center)
    d = r * r - (distance * distance - along * along)
    hit = d >= 0.0
    root = sqrtf(d)
    if distance < r:
        t = along + root
        point = rm._add3(origin, (direction[0] * t, direction[1] * t, direction[2] * t))
        n = rm._normalize3(rm._sub3(point, c))
        normal = (-n[0], -n[1], -n[2])
    else:
        t = along - root
        point = rm._add3(origin, (direction[0] * t, direction[1] * t, direction[2] * t))
        normal = rm._normalize3(rm._sub3(point, c))
    return _collision(hit, t, point, normal)


def _fmin(a, b):
    """fmin do C: um NaN perde para o outro número."""
    if a != a:
        return b
    if b != b:
        return a
    return a if a < b else b


def _fmax(a, b):
    if a != a:
        return b
    if b != b:
        return a
    return a if a > b else b


def ray_box(origin, direction, low, high):
    """GetRayCollisionBox do rmodels.c, conta por conta."""
    origin, direction, low, high = rm._f(origin), rm._f(direction), rm._f(low), rm._f(high)
    inside = all(low[i] < origin[i] < high[i] for i in range(3))
    if inside:
        direction = (-direction[0], -direction[1], -direction[2])
    inv = [1.0 / direction[i] for i in range(3)]
    t = []
    for i in range(3):
        t.append((low[i] - origin[i]) * inv[i])
        t.append((high[i] - origin[i]) * inv[i])
    t6 = F(_fmax(_fmax(_fmin(t[0], t[1]), _fmin(t[2], t[3])), _fmin(t[4], t[5])))
    t7 = F(_fmin(_fmin(_fmax(t[0], t[1]), _fmax(t[2], t[3])), _fmax(t[4], t[5])))
    hit = not (t7 < 0 or t6 > t7)
    distance = t6
    point = rm._add3(origin, (direction[0] * distance, direction[1] * distance,
                              direction[2] * distance))
    # O centro é Vector3Lerp(min, max, 0.5): min + 0.5*(max - min), não (min + max)/2.
    center = tuple(low[i] + 0.5 * (high[i] - low[i]) for i in range(3))
    raw = rm._sub3(point, center)
    # (float)((int)x): o C trunca; nan ou infinito vira o menor int (como no x86).
    normal = tuple(F(c_int(raw[i] * 2.01 / (high[i] - low[i]))) for i in range(3))
    normal = rm._normalize3(normal)
    if inside:
        distance = distance * -1.0
        normal = (-normal[0], -normal[1], -normal[2])
    return hit, distance, point, normal


def get_ray_collision_box(ray, box, /):
    f = 'get_ray_collision_box'
    origin, direction = _ray(ray, f)
    low, high = _box(box, f)
    return _collision(*ray_box(origin, direction, low, high))


def ray_triangle(origin, direction, p1, p2, p3):
    edge1 = rm._sub3(p2, p1)
    edge2 = rm._sub3(p3, p1)
    p = rm._cross(direction, edge2)
    det = edge1[0] * p[0] + edge1[1] * p[1] + edge1[2] * p[2]
    if -_EPSILON < det < _EPSILON:
        return None
    inv = 1.0 / det
    tv = rm._sub3(origin, p1)
    u = (tv[0] * p[0] + tv[1] * p[1] + tv[2] * p[2]) * inv
    if u < 0.0 or u > 1.0:
        return None
    q = rm._cross(tv, edge1)
    v = (direction[0] * q[0] + direction[1] * q[1] + direction[2] * q[2]) * inv
    if v < 0.0 or u + v > 1.0:
        return None
    t = (edge2[0] * q[0] + edge2[1] * q[1] + edge2[2] * q[2]) * inv
    if t <= _EPSILON:
        return None
    normal = rm._normalize3(rm._cross(edge1, edge2))
    point = rm._add3(origin, (direction[0] * t, direction[1] * t, direction[2] * t))
    return t, point, normal


def get_ray_collision_triangle(ray, p1, p2, p3, /):
    f = 'get_ray_collision_triangle'
    origin, direction = _ray(ray, f)
    found = ray_triangle(origin, direction, vec3(p1, f, 'p1'), vec3(p2, f, 'p2'), vec3(p3, f, 'p3'))
    if found is None:
        return _collision()
    t, point, normal = found
    return _collision(True, t, point, normal)


def get_ray_collision_quad(ray, p1, p2, p3, p4, /):
    f = 'get_ray_collision_quad'
    origin, direction = _ray(ray, f)
    a, b, c, d = vec3(p1, f, 'p1'), vec3(p2, f, 'p2'), vec3(p3, f, 'p3'), vec3(p4, f, 'p4')
    found = ray_triangle(origin, direction, a, b, d) or ray_triangle(origin, direction, b, c, d)
    if found is None:
        return _collision()
    t, point, normal = found
    return _collision(True, t, point, normal)
