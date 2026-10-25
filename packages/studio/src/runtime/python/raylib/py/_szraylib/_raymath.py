"""raymath.h do raylib em Python: vetores, matrizes e quatérnios.

Os nomes seguem o pyray (``vector2_add``); o módulo ``raylib`` também os oferece com os nomes do
C (``Vector2Add``). A matriz é coluna-maior, como no raylib (m0, m4, m8, m12 é a 1ª linha).
O teste diferencial (scripts/raylib/tests) compara cada função com o raylib do computador.
"""
import math

from ._args import number, vec2, vec3, vec4, struct
from ._structs import Matrix, Vector2, Vector3, Vector4

_EPSILON = 0.000001


def _matrix(value, function, param='mat'):
    return struct(value, Matrix, function, param)


def _m(m):
    return (m.m0, m.m1, m.m2, m.m3, m.m4, m.m5, m.m6, m.m7,
            m.m8, m.m9, m.m10, m.m11, m.m12, m.m13, m.m14, m.m15)


def _make(values):
    """Matriz a partir de m0..m15 (na ordem dos índices)."""
    m = Matrix()
    (m.m0, m.m1, m.m2, m.m3, m.m4, m.m5, m.m6, m.m7,
     m.m8, m.m9, m.m10, m.m11, m.m12, m.m13, m.m14, m.m15) = values
    return m


# Escalares --------------------------------------------------------------------------------------

def clamp(value, min, max, /):
    f = 'clamp'
    v, lo, hi = number(value, f, 'value'), number(min, f, 'min'), number(max, f, 'max')
    result = lo if v < lo else v
    return float(hi if result > hi else result)


def lerp(start, end, amount, /):
    f = 'lerp'
    s = number(start, f, 'start')
    return float(s + number(amount, f, 'amount') * (number(end, f, 'end') - s))


def normalize(value, start, end, /):
    f = 'normalize'
    s = number(start, f, 'start')
    return float((number(value, f, 'value') - s) / (number(end, f, 'end') - s))


def remap(value, inputStart, inputEnd, outputStart, outputEnd, /):
    f = 'remap'
    v, a, b = number(value, f, 'value'), number(inputStart, f, 'inputStart'), number(inputEnd, f, 'inputEnd')
    c, d = number(outputStart, f, 'outputStart'), number(outputEnd, f, 'outputEnd')
    return float((v - a) / (b - a) * (d - c) + c)


def wrap(value, min, max, /):
    f = 'wrap'
    v, lo, hi = number(value, f, 'value'), number(min, f, 'min'), number(max, f, 'max')
    return float(v - (hi - lo) * math.floor((v - lo) / (hi - lo)))


def float_equals(x, y, /):
    a, b = number(x, 'float_equals', 'x'), number(y, 'float_equals', 'y')
    return int(abs(a - b) <= _EPSILON * max(1.0, max(abs(a), abs(b))))


# Vector2 ----------------------------------------------------------------------------------------

def vector2_zero():
    return Vector2(0.0, 0.0)


def vector2_one():
    return Vector2(1.0, 1.0)


def vector2_add(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_add', 'v1')
    bx, by = vec2(v2, 'vector2_add', 'v2')
    return Vector2(ax + bx, ay + by)


def vector2_add_value(v, add, /):
    x, y = vec2(v, 'vector2_add_value', 'v')
    a = number(add, 'vector2_add_value', 'add')
    return Vector2(x + a, y + a)


def vector2_subtract(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_subtract', 'v1')
    bx, by = vec2(v2, 'vector2_subtract', 'v2')
    return Vector2(ax - bx, ay - by)


def vector2_subtract_value(v, sub, /):
    x, y = vec2(v, 'vector2_subtract_value', 'v')
    s = number(sub, 'vector2_subtract_value', 'sub')
    return Vector2(x - s, y - s)


def vector2_length(v, /):
    x, y = vec2(v, 'vector2_length', 'v')
    return math.sqrt(x * x + y * y)


def vector2_length_sqr(v, /):
    x, y = vec2(v, 'vector2_length_sqr', 'v')
    return x * x + y * y


def vector2_dot_product(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_dot_product', 'v1')
    bx, by = vec2(v2, 'vector2_dot_product', 'v2')
    return ax * bx + ay * by


def vector2_cross_product(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_cross_product', 'v1')
    bx, by = vec2(v2, 'vector2_cross_product', 'v2')
    return ax * by - ay * bx


def vector2_distance(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_distance', 'v1')
    bx, by = vec2(v2, 'vector2_distance', 'v2')
    return math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)


def vector2_distance_sqr(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_distance_sqr', 'v1')
    bx, by = vec2(v2, 'vector2_distance_sqr', 'v2')
    return (ax - bx) ** 2 + (ay - by) ** 2


def vector2_angle(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_angle', 'v1')
    bx, by = vec2(v2, 'vector2_angle', 'v2')
    dot = ax * bx + ay * by
    det = ax * by - ay * bx
    return math.atan2(det, dot)


def vector2_line_angle(start, end, /):
    ax, ay = vec2(start, 'vector2_line_angle', 'start')
    bx, by = vec2(end, 'vector2_line_angle', 'end')
    return -math.atan2(by - ay, bx - ax)


def vector2_scale(v, scale, /):
    x, y = vec2(v, 'vector2_scale', 'v')
    s = number(scale, 'vector2_scale', 'scale')
    return Vector2(x * s, y * s)


def vector2_multiply(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_multiply', 'v1')
    bx, by = vec2(v2, 'vector2_multiply', 'v2')
    return Vector2(ax * bx, ay * by)


def vector2_negate(v, /):
    x, y = vec2(v, 'vector2_negate', 'v')
    return Vector2(-x, -y)


def vector2_divide(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_divide', 'v1')
    bx, by = vec2(v2, 'vector2_divide', 'v2')
    return Vector2(_div(ax, bx), _div(ay, by))


def _div(a, b):
    if b == 0:
        return math.copysign(math.inf, a) if a else math.nan
    return a / b


def vector2_normalize(v, /):
    x, y = vec2(v, 'vector2_normalize', 'v')
    length = math.sqrt(x * x + y * y)
    if length > 0:
        inv = 1.0 / length
        return Vector2(x * inv, y * inv)
    return Vector2(0.0, 0.0)


def vector2_transform(v, mat, /):
    x, y = vec2(v, 'vector2_transform', 'v')
    m = _matrix(mat, 'vector2_transform')
    return Vector2(m.m0 * x + m.m4 * y + m.m12, m.m1 * x + m.m5 * y + m.m13)


def vector2_lerp(v1, v2, amount, /):
    ax, ay = vec2(v1, 'vector2_lerp', 'v1')
    bx, by = vec2(v2, 'vector2_lerp', 'v2')
    t = number(amount, 'vector2_lerp', 'amount')
    return Vector2(ax + t * (bx - ax), ay + t * (by - ay))


def vector2_reflect(v, normal, /):
    x, y = vec2(v, 'vector2_reflect', 'v')
    nx, ny = vec2(normal, 'vector2_reflect', 'normal')
    dot = x * nx + y * ny
    return Vector2(x - 2.0 * nx * dot, y - 2.0 * ny * dot)


def vector2_min(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_min', 'v1')
    bx, by = vec2(v2, 'vector2_min', 'v2')
    return Vector2(min(ax, bx), min(ay, by))


def vector2_max(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_max', 'v1')
    bx, by = vec2(v2, 'vector2_max', 'v2')
    return Vector2(max(ax, bx), max(ay, by))


def vector2_rotate(v, angle, /):
    x, y = vec2(v, 'vector2_rotate', 'v')
    a = number(angle, 'vector2_rotate', 'angle')
    c, s = math.cos(a), math.sin(a)
    return Vector2(x * c - y * s, x * s + y * c)


def vector2_move_towards(v, target, maxDistance, /):
    x, y = vec2(v, 'vector2_move_towards', 'v')
    tx, ty = vec2(target, 'vector2_move_towards', 'target')
    step = number(maxDistance, 'vector2_move_towards', 'maxDistance')
    dx, dy = tx - x, ty - y
    value = dx * dx + dy * dy
    if value == 0 or (step >= 0 and value <= step * step):
        return Vector2(tx, ty)
    dist = math.sqrt(value)
    return Vector2(x + dx / dist * step, y + dy / dist * step)


def vector2_invert(v, /):
    x, y = vec2(v, 'vector2_invert', 'v')
    return Vector2(_div(1.0, x), _div(1.0, y))


def vector2_clamp(v, min, max, /):
    x, y = vec2(v, 'vector2_clamp', 'v')
    lx, ly = vec2(min, 'vector2_clamp', 'min')
    hx, hy = vec2(max, 'vector2_clamp', 'max')
    return Vector2(_clamp_axis(x, lx, hx), _clamp_axis(y, ly, hy))


def _clamp_axis(value, low, high):
    # fminf(max, fmaxf(min, v)): com min > max, vale o max (como no raymath).
    return min(high, max(low, value))


def vector2_clamp_value(v, min, max, /):
    x, y = vec2(v, 'vector2_clamp_value', 'v')
    lo, hi = number(min, 'vector2_clamp_value', 'min'), number(max, 'vector2_clamp_value', 'max')
    length = x * x + y * y
    if length > 0:
        length = math.sqrt(length)
        scale = 1.0
        if length < lo:
            scale = lo / length
        elif length > hi:
            scale = hi / length
        return Vector2(x * scale, y * scale)
    return Vector2(x, y)


def vector2_equals(p, q, /):
    px, py = vec2(p, 'vector2_equals', 'p')
    qx, qy = vec2(q, 'vector2_equals', 'q')
    return int(abs(px - qx) <= _EPSILON * max(1.0, abs(px), abs(qx)) and
               abs(py - qy) <= _EPSILON * max(1.0, abs(py), abs(qy)))


def vector2_refract(v, n, r, /):
    x, y = vec2(v, 'vector2_refract', 'v')
    nx, ny = vec2(n, 'vector2_refract', 'n')
    ratio = number(r, 'vector2_refract', 'r')
    dot = x * nx + y * ny
    d = 1.0 - ratio * ratio * (1.0 - dot * dot)
    if d >= 0.0:
        d = math.sqrt(d)
        return Vector2(ratio * x - (ratio * dot + d) * nx, ratio * y - (ratio * dot + d) * ny)
    return Vector2(0.0, 0.0)


# Vector3 ----------------------------------------------------------------------------------------

def vector3_zero():
    return Vector3(0.0, 0.0, 0.0)


def vector3_one():
    return Vector3(1.0, 1.0, 1.0)


def vector3_add(v1, v2, /):
    a = vec3(v1, 'vector3_add', 'v1')
    b = vec3(v2, 'vector3_add', 'v2')
    return Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vector3_add_value(v, add, /):
    a = vec3(v, 'vector3_add_value', 'v')
    s = number(add, 'vector3_add_value', 'add')
    return Vector3(a[0] + s, a[1] + s, a[2] + s)


def vector3_subtract(v1, v2, /):
    a = vec3(v1, 'vector3_subtract', 'v1')
    b = vec3(v2, 'vector3_subtract', 'v2')
    return Vector3(a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vector3_subtract_value(v, sub, /):
    a = vec3(v, 'vector3_subtract_value', 'v')
    s = number(sub, 'vector3_subtract_value', 'sub')
    return Vector3(a[0] - s, a[1] - s, a[2] - s)


def vector3_scale(v, scalar, /):
    a = vec3(v, 'vector3_scale', 'v')
    s = number(scalar, 'vector3_scale', 'scalar')
    return Vector3(a[0] * s, a[1] * s, a[2] * s)


def vector3_multiply(v1, v2, /):
    a = vec3(v1, 'vector3_multiply', 'v1')
    b = vec3(v2, 'vector3_multiply', 'v2')
    return Vector3(a[0] * b[0], a[1] * b[1], a[2] * b[2])


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def vector3_cross_product(v1, v2, /):
    return Vector3(*_cross(vec3(v1, 'vector3_cross_product', 'v1'),
                           vec3(v2, 'vector3_cross_product', 'v2')))


def vector3_perpendicular(v, /):
    a = vec3(v, 'vector3_perpendicular', 'v')
    lowest = abs(a[0])
    axis = (1.0, 0.0, 0.0)
    if abs(a[1]) < lowest:
        lowest = abs(a[1])
        axis = (0.0, 1.0, 0.0)
    if abs(a[2]) < lowest:
        axis = (0.0, 0.0, 1.0)
    return Vector3(*_cross(a, axis))


def vector3_length(v, /):
    a = vec3(v, 'vector3_length', 'v')
    return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def vector3_length_sqr(v, /):
    a = vec3(v, 'vector3_length_sqr', 'v')
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2]


def vector3_dot_product(v1, v2, /):
    a = vec3(v1, 'vector3_dot_product', 'v1')
    b = vec3(v2, 'vector3_dot_product', 'v2')
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def vector3_distance(v1, v2, /):
    a = vec3(v1, 'vector3_distance', 'v1')
    b = vec3(v2, 'vector3_distance', 'v2')
    return math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2)


def vector3_distance_sqr(v1, v2, /):
    a = vec3(v1, 'vector3_distance_sqr', 'v1')
    b = vec3(v2, 'vector3_distance_sqr', 'v2')
    return (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2


def vector3_angle(v1, v2, /):
    a = vec3(v1, 'vector3_angle', 'v1')
    b = vec3(v2, 'vector3_angle', 'v2')
    c = _cross(a, b)
    length = math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2])
    dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    return math.atan2(length, dot)


def vector3_negate(v, /):
    a = vec3(v, 'vector3_negate', 'v')
    return Vector3(-a[0], -a[1], -a[2])


def vector3_divide(v1, v2, /):
    a = vec3(v1, 'vector3_divide', 'v1')
    b = vec3(v2, 'vector3_divide', 'v2')
    return Vector3(_div(a[0], b[0]), _div(a[1], b[1]), _div(a[2], b[2]))


def _normalize3(a):
    length = math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
    if length != 0.0:
        inv = 1.0 / length
        return (a[0] * inv, a[1] * inv, a[2] * inv)
    return a


def vector3_normalize(v, /):
    return Vector3(*_normalize3(vec3(v, 'vector3_normalize', 'v')))


def vector3_project(v1, v2, /):
    a = vec3(v1, 'vector3_project', 'v1')
    b = vec3(v2, 'vector3_project', 'v2')
    mag = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (b[0] * b[0] + b[1] * b[1] + b[2] * b[2])
    return Vector3(b[0] * mag, b[1] * mag, b[2] * mag)


def vector3_reject(v1, v2, /):
    a = vec3(v1, 'vector3_reject', 'v1')
    b = vec3(v2, 'vector3_reject', 'v2')
    mag = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (b[0] * b[0] + b[1] * b[1] + b[2] * b[2])
    return Vector3(a[0] - b[0] * mag, a[1] - b[1] * mag, a[2] - b[2] * mag)


def vector3_transform(v, mat, /):
    x, y, z = vec3(v, 'vector3_transform', 'v')
    m = _matrix(mat, 'vector3_transform')
    return Vector3(m.m0 * x + m.m4 * y + m.m8 * z + m.m12,
                   m.m1 * x + m.m5 * y + m.m9 * z + m.m13,
                   m.m2 * x + m.m6 * y + m.m10 * z + m.m14)


def vector3_rotate_by_quaternion(v, q, /):
    x, y, z = vec3(v, 'vector3_rotate_by_quaternion', 'v')
    qx, qy, qz, qw = vec4(q, 'vector3_rotate_by_quaternion', 'q')
    return Vector3(
        x * (qx * qx + qw * qw - qy * qy - qz * qz) + y * (2 * qx * qy - 2 * qw * qz) + z * (2 * qx * qz + 2 * qw * qy),
        x * (2 * qw * qz + 2 * qx * qy) + y * (qw * qw - qx * qx + qy * qy - qz * qz) + z * (-2 * qw * qx + 2 * qy * qz),
        x * (-2 * qw * qy + 2 * qx * qz) + y * (2 * qw * qx + 2 * qy * qz) + z * (qw * qw - qx * qx - qy * qy + qz * qz))


def vector3_rotate_by_axis_angle(v, axis, angle, /):
    f = 'vector3_rotate_by_axis_angle'
    vx, vy, vz = vec3(v, f, 'v')
    ax, ay, az = _normalize3(vec3(axis, f, 'axis'))
    a = number(angle, f, 'angle') / 2.0
    s = math.sin(a)
    bx, by, bz, w = ax * s, ay * s, az * s, math.cos(a)
    wx, wy, wz = _cross((bx, by, bz), (vx, vy, vz))
    wwx, wwy, wwz = _cross((bx, by, bz), (wx, wy, wz))
    w2 = w * 2
    return Vector3(vx + wx * w2 + wwx * 2, vy + wy * w2 + wwy * 2, vz + wz * w2 + wwz * 2)


def vector3_move_towards(v, target, maxDistance, /):
    f = 'vector3_move_towards'
    x, y, z = vec3(v, f, 'v')
    tx, ty, tz = vec3(target, f, 'target')
    step = number(maxDistance, f, 'maxDistance')
    dx, dy, dz = tx - x, ty - y, tz - z
    value = dx * dx + dy * dy + dz * dz
    if value == 0 or (step >= 0 and value <= step * step):
        return Vector3(tx, ty, tz)
    dist = math.sqrt(value)
    return Vector3(x + dx / dist * step, y + dy / dist * step, z + dz / dist * step)


def vector3_lerp(v1, v2, amount, /):
    a = vec3(v1, 'vector3_lerp', 'v1')
    b = vec3(v2, 'vector3_lerp', 'v2')
    t = number(amount, 'vector3_lerp', 'amount')
    return Vector3(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]))


def vector3_reflect(v, normal, /):
    a = vec3(v, 'vector3_reflect', 'v')
    n = vec3(normal, 'vector3_reflect', 'normal')
    dot = a[0] * n[0] + a[1] * n[1] + a[2] * n[2]
    return Vector3(a[0] - 2.0 * n[0] * dot, a[1] - 2.0 * n[1] * dot, a[2] - 2.0 * n[2] * dot)


def vector3_min(v1, v2, /):
    a = vec3(v1, 'vector3_min', 'v1')
    b = vec3(v2, 'vector3_min', 'v2')
    return Vector3(min(a[0], b[0]), min(a[1], b[1]), min(a[2], b[2]))


def vector3_max(v1, v2, /):
    a = vec3(v1, 'vector3_max', 'v1')
    b = vec3(v2, 'vector3_max', 'v2')
    return Vector3(max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2]))


def vector3_invert(v, /):
    a = vec3(v, 'vector3_invert', 'v')
    return Vector3(_div(1.0, a[0]), _div(1.0, a[1]), _div(1.0, a[2]))


def vector3_clamp(v, min, max, /):
    a = vec3(v, 'vector3_clamp', 'v')
    lo = vec3(min, 'vector3_clamp', 'min')
    hi = vec3(max, 'vector3_clamp', 'max')
    return Vector3(*(_clamp_axis(a[i], lo[i], hi[i]) for i in range(3)))


def vector3_clamp_value(v, min, max, /):
    a = vec3(v, 'vector3_clamp_value', 'v')
    lo, hi = number(min, 'vector3_clamp_value', 'min'), number(max, 'vector3_clamp_value', 'max')
    length = a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
    if length > 0:
        length = math.sqrt(length)
        scale = 1.0
        if length < lo:
            scale = lo / length
        elif length > hi:
            scale = hi / length
        return Vector3(a[0] * scale, a[1] * scale, a[2] * scale)
    return Vector3(*a)


def vector3_equals(p, q, /):
    a = vec3(p, 'vector3_equals', 'p')
    b = vec3(q, 'vector3_equals', 'q')
    return int(all(abs(a[i] - b[i]) <= _EPSILON * max(1.0, abs(a[i]), abs(b[i])) for i in range(3)))


def vector3_barycenter(p, a, b, c, /):
    f = 'vector3_barycenter'
    P, A, B, C = vec3(p, f, 'p'), vec3(a, f, 'a'), vec3(b, f, 'b'), vec3(c, f, 'c')
    v0 = tuple(B[i] - A[i] for i in range(3))
    v1 = tuple(C[i] - A[i] for i in range(3))
    v2 = tuple(P[i] - A[i] for i in range(3))
    dot = lambda u, w: u[0] * w[0] + u[1] * w[1] + u[2] * w[2]  # noqa: E731
    d00, d01, d11, d20, d21 = dot(v0, v0), dot(v0, v1), dot(v1, v1), dot(v2, v0), dot(v2, v1)
    denom = d00 * d11 - d01 * d01
    y = (d11 * d20 - d01 * d21) / denom
    z = (d00 * d21 - d01 * d20) / denom
    return Vector3(1.0 - (z + y), y, z)


# Matrix -----------------------------------------------------------------------------------------

def matrix_identity():
    return _make((1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0))


def _mul(left, right):
    """MatrixMultiply(left, right) do raymath, sobre tuplas m0..m15."""
    l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15 = left
    r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15 = right
    return (
        l0 * r0 + l1 * r4 + l2 * r8 + l3 * r12,
        l0 * r1 + l1 * r5 + l2 * r9 + l3 * r13,
        l0 * r2 + l1 * r6 + l2 * r10 + l3 * r14,
        l0 * r3 + l1 * r7 + l2 * r11 + l3 * r15,
        l4 * r0 + l5 * r4 + l6 * r8 + l7 * r12,
        l4 * r1 + l5 * r5 + l6 * r9 + l7 * r13,
        l4 * r2 + l5 * r6 + l6 * r10 + l7 * r14,
        l4 * r3 + l5 * r7 + l6 * r11 + l7 * r15,
        l8 * r0 + l9 * r4 + l10 * r8 + l11 * r12,
        l8 * r1 + l9 * r5 + l10 * r9 + l11 * r13,
        l8 * r2 + l9 * r6 + l10 * r10 + l11 * r14,
        l8 * r3 + l9 * r7 + l10 * r11 + l11 * r15,
        l12 * r0 + l13 * r4 + l14 * r8 + l15 * r12,
        l12 * r1 + l13 * r5 + l14 * r9 + l15 * r13,
        l12 * r2 + l13 * r6 + l14 * r10 + l15 * r14,
        l12 * r3 + l13 * r7 + l14 * r11 + l15 * r15)


def matrix_multiply(left, right, /):
    return _make(_mul(_m(_matrix(left, 'matrix_multiply', 'left')),
                      _m(_matrix(right, 'matrix_multiply', 'right'))))


def matrix_translate(x, y, z, /):
    f = 'matrix_translate'
    return _make((1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
                  number(x, f, 'x'), number(y, f, 'y'), number(z, f, 'z'), 1.0))


def matrix_scale(x, y, z, /):
    f = 'matrix_scale'
    return _make((number(x, f, 'x'), 0.0, 0.0, 0.0, 0.0, number(y, f, 'y'), 0.0, 0.0,
                  0.0, 0.0, number(z, f, 'z'), 0.0, 0.0, 0.0, 0.0, 1.0))


def _rotate(axis, angle):
    x, y, z = axis
    length = x * x + y * y + z * z
    if length != 1.0 and length != 0.0:
        length = 1.0 / math.sqrt(length)
        x, y, z = x * length, y * length, z * length
    s, c = math.sin(angle), math.cos(angle)
    t = 1.0 - c
    return (x * x * t + c, y * x * t + z * s, z * x * t - y * s, 0.0,
            x * y * t - z * s, y * y * t + c, z * y * t + x * s, 0.0,
            x * z * t + y * s, y * z * t - x * s, z * z * t + c, 0.0,
            0.0, 0.0, 0.0, 1.0)


def matrix_rotate(axis, angle, /):
    return _make(_rotate(vec3(axis, 'matrix_rotate', 'axis'), number(angle, 'matrix_rotate', 'angle')))


def matrix_rotate_x(angle, /):
    a = number(angle, 'matrix_rotate_x', 'angle')
    c, s = math.cos(a), math.sin(a)
    return _make((1.0, 0.0, 0.0, 0.0, 0.0, c, s, 0.0, 0.0, -s, c, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_y(angle, /):
    a = number(angle, 'matrix_rotate_y', 'angle')
    c, s = math.cos(a), math.sin(a)
    return _make((c, 0.0, -s, 0.0, 0.0, 1.0, 0.0, 0.0, s, 0.0, c, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_z(angle, /):
    a = number(angle, 'matrix_rotate_z', 'angle')
    c, s = math.cos(a), math.sin(a)
    return _make((c, s, 0.0, 0.0, -s, c, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_xyz(angle, /):
    ax, ay, az = vec3(angle, 'matrix_rotate_xyz', 'angle')
    cz, sz = math.cos(-az), math.sin(-az)
    cy, sy = math.cos(-ay), math.sin(-ay)
    cx, sx = math.cos(-ax), math.sin(-ax)
    m0 = cz * cy
    m1 = (cz * sy * sx) - (sz * cx)
    m2 = (cz * sy * cx) + (sz * sx)
    m4 = sz * cy
    m5 = (sz * sy * sx) + (cz * cx)
    m6 = (sz * sy * cx) - (cz * sx)
    m8 = -sy
    m9 = cy * sx
    m10 = cy * cx
    return _make((m0, m1, m2, 0.0, m4, m5, m6, 0.0, m8, m9, m10, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_zyx(angle, /):
    ax, ay, az = vec3(angle, 'matrix_rotate_zyx', 'angle')
    cz, sz = math.cos(az), math.sin(az)
    cy, sy = math.cos(ay), math.sin(ay)
    cx, sx = math.cos(ax), math.sin(ax)
    m0 = cz * cy
    m4 = cz * sy * sx - cx * sz
    m8 = sz * sx + cz * cx * sy
    m1 = cy * sz
    m5 = cz * cx + sz * sy * sx
    m9 = cx * sz * sy - cz * sx
    m2 = -sy
    m6 = cy * sx
    m10 = cy * cx
    return _make((m0, m1, m2, 0.0, m4, m5, m6, 0.0, m8, m9, m10, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_transpose(mat, /):
    m = _m(_matrix(mat, 'matrix_transpose'))
    return _make((m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13],
                  m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]))


def _invert(m):
    a00, a01, a02, a03 = m[0], m[1], m[2], m[3]
    a10, a11, a12, a13 = m[4], m[5], m[6], m[7]
    a20, a21, a22, a23 = m[8], m[9], m[10], m[11]
    a30, a31, a32, a33 = m[12], m[13], m[14], m[15]
    b00 = a00 * a11 - a01 * a10
    b01 = a00 * a12 - a02 * a10
    b02 = a00 * a13 - a03 * a10
    b03 = a01 * a12 - a02 * a11
    b04 = a01 * a13 - a03 * a11
    b05 = a02 * a13 - a03 * a12
    b06 = a20 * a31 - a21 * a30
    b07 = a20 * a32 - a22 * a30
    b08 = a20 * a33 - a23 * a30
    b09 = a21 * a32 - a22 * a31
    b10 = a21 * a33 - a23 * a31
    b11 = a22 * a33 - a23 * a32
    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    inv = 1.0 / det if det else math.inf
    return ((a11 * b11 - a12 * b10 + a13 * b09) * inv,
            (-a01 * b11 + a02 * b10 - a03 * b09) * inv,
            (a31 * b05 - a32 * b04 + a33 * b03) * inv,
            (-a21 * b05 + a22 * b04 - a23 * b03) * inv,
            (-a10 * b11 + a12 * b08 - a13 * b07) * inv,
            (a00 * b11 - a02 * b08 + a03 * b07) * inv,
            (-a30 * b05 + a32 * b02 - a33 * b01) * inv,
            (a20 * b05 - a22 * b02 + a23 * b01) * inv,
            (a10 * b10 - a11 * b08 + a13 * b06) * inv,
            (-a00 * b10 + a01 * b08 - a03 * b06) * inv,
            (a30 * b04 - a31 * b02 + a33 * b00) * inv,
            (-a20 * b04 + a21 * b02 - a23 * b00) * inv,
            (-a10 * b09 + a11 * b07 - a12 * b06) * inv,
            (a00 * b09 - a01 * b07 + a02 * b06) * inv,
            (-a30 * b03 + a31 * b01 - a32 * b00) * inv,
            (a20 * b03 - a21 * b01 + a22 * b00) * inv)


def matrix_invert(mat, /):
    return _make(_invert(_m(_matrix(mat, 'matrix_invert'))))


def matrix_determinant(mat, /):
    m = _m(_matrix(mat, 'matrix_determinant'))
    a00, a01, a02, a03 = m[0], m[1], m[2], m[3]
    a10, a11, a12, a13 = m[4], m[5], m[6], m[7]
    a20, a21, a22, a23 = m[8], m[9], m[10], m[11]
    a30, a31, a32, a33 = m[12], m[13], m[14], m[15]
    return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
            a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
            a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
            a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
            a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
            a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33)


def matrix_trace(mat, /):
    m = _matrix(mat, 'matrix_trace')
    return m.m0 + m.m5 + m.m10 + m.m15


def matrix_add(left, right, /):
    a = _m(_matrix(left, 'matrix_add', 'left'))
    b = _m(_matrix(right, 'matrix_add', 'right'))
    return _make(tuple(a[i] + b[i] for i in range(16)))


def matrix_subtract(left, right, /):
    a = _m(_matrix(left, 'matrix_subtract', 'left'))
    b = _m(_matrix(right, 'matrix_subtract', 'right'))
    return _make(tuple(a[i] - b[i] for i in range(16)))


def matrix_multiply_value(left, value, /):
    a = _m(_matrix(left, 'matrix_multiply_value', 'left'))
    s = number(value, 'matrix_multiply_value', 'value')
    return _make(tuple(a[i] * s for i in range(16)))


def frustum(left, right, bottom, top, near, far):
    rl, tb, fn = right - left, top - bottom, far - near
    return ((near * 2.0) / rl, 0.0, 0.0, 0.0,
            0.0, (near * 2.0) / tb, 0.0, 0.0,
            (right + left) / rl, (top + bottom) / tb, -(far + near) / fn, -1.0,
            0.0, 0.0, -(far * near * 2.0) / fn, 0.0)


def perspective(fovY, aspect, near, far):
    top = near * math.tan(fovY * 0.5)
    right = top * aspect
    return frustum(-right, right, -top, top, near, far)


def ortho(left, right, bottom, top, near, far):
    rl, tb, fn = right - left, top - bottom, far - near
    return (2.0 / rl, 0.0, 0.0, 0.0, 0.0, 2.0 / tb, 0.0, 0.0, 0.0, 0.0, -2.0 / fn, 0.0,
            -(left + right) / rl, -(top + bottom) / tb, -(far + near) / fn, 1.0)


def look_at(eye, target, up):
    vz = _normalize3((eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]))
    vx = _normalize3(_cross(up, vz))
    vy = _cross(vz, vx)
    dot = lambda a, b: a[0] * b[0] + a[1] * b[1] + a[2] * b[2]  # noqa: E731
    return (vx[0], vy[0], vz[0], 0.0,
            vx[1], vy[1], vz[1], 0.0,
            vx[2], vy[2], vz[2], 0.0,
            -dot(vx, eye), -dot(vy, eye), -dot(vz, eye), 1.0)


def matrix_frustum(left, right, bottom, top, nearPlane, farPlane, /):
    f = 'matrix_frustum'
    return _make(frustum(number(left, f), number(right, f), number(bottom, f), number(top, f),
                         number(nearPlane, f), number(farPlane, f)))


def matrix_perspective(fovY, aspect, nearPlane, farPlane, /):
    f = 'matrix_perspective'
    return _make(perspective(number(fovY, f), number(aspect, f), number(nearPlane, f),
                             number(farPlane, f)))


def matrix_ortho(left, right, bottom, top, nearPlane, farPlane, /):
    f = 'matrix_ortho'
    return _make(ortho(number(left, f), number(right, f), number(bottom, f), number(top, f),
                       number(nearPlane, f), number(farPlane, f)))


def matrix_look_at(eye, target, up, /):
    f = 'matrix_look_at'
    return _make(look_at(vec3(eye, f, 'eye'), vec3(target, f, 'target'), vec3(up, f, 'up')))


# Quaternion -------------------------------------------------------------------------------------

def quaternion_identity():
    return Vector4(0.0, 0.0, 0.0, 1.0)


def quaternion_add(q1, q2, /):
    a, b = vec4(q1, 'quaternion_add', 'q1'), vec4(q2, 'quaternion_add', 'q2')
    return Vector4(*(a[i] + b[i] for i in range(4)))


def quaternion_subtract(q1, q2, /):
    a, b = vec4(q1, 'quaternion_subtract', 'q1'), vec4(q2, 'quaternion_subtract', 'q2')
    return Vector4(*(a[i] - b[i] for i in range(4)))


def quaternion_length(q, /):
    a = vec4(q, 'quaternion_length', 'q')
    return math.sqrt(sum(v * v for v in a))


def _qnormalize(a):
    length = math.sqrt(sum(v * v for v in a))
    if length == 0.0:
        length = 1.0
    inv = 1.0 / length
    return tuple(v * inv for v in a)


def quaternion_normalize(q, /):
    return Vector4(*_qnormalize(vec4(q, 'quaternion_normalize', 'q')))


def quaternion_invert(q, /):
    x, y, z, w = vec4(q, 'quaternion_invert', 'q')
    length = x * x + y * y + z * z + w * w
    if length != 0.0:
        inv = 1.0 / length
        return Vector4(-x * inv, -y * inv, -z * inv, w * inv)
    return Vector4(x, y, z, w)


def _qmul(a, b):
    qax, qay, qaz, qaw = a
    qbx, qby, qbz, qbw = b
    return (qax * qbw + qaw * qbx + qay * qbz - qaz * qby,
            qay * qbw + qaw * qby + qaz * qbx - qax * qbz,
            qaz * qbw + qaw * qbz + qax * qby - qay * qbx,
            qaw * qbw - qax * qbx - qay * qby - qaz * qbz)


def quaternion_multiply(q1, q2, /):
    return Vector4(*_qmul(vec4(q1, 'quaternion_multiply', 'q1'), vec4(q2, 'quaternion_multiply', 'q2')))


def quaternion_scale(q, mul, /):
    a = vec4(q, 'quaternion_scale', 'q')
    s = number(mul, 'quaternion_scale', 'mul')
    return Vector4(*(v * s for v in a))


def quaternion_lerp(q1, q2, amount, /):
    a, b = vec4(q1, 'quaternion_lerp', 'q1'), vec4(q2, 'quaternion_lerp', 'q2')
    t = number(amount, 'quaternion_lerp', 'amount')
    return Vector4(*(a[i] + t * (b[i] - a[i]) for i in range(4)))


def quaternion_nlerp(q1, q2, amount, /):
    a, b = vec4(q1, 'quaternion_nlerp', 'q1'), vec4(q2, 'quaternion_nlerp', 'q2')
    t = number(amount, 'quaternion_nlerp', 'amount')
    return Vector4(*_qnormalize(tuple(a[i] + t * (b[i] - a[i]) for i in range(4))))


def slerp(a, b, t):
    cos_half = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
    if cos_half < 0:
        b = tuple(-v for v in b)
        cos_half = -cos_half
    if abs(cos_half) >= 1.0:
        return a
    if cos_half > 0.95:
        return _qnormalize(tuple(a[i] + t * (b[i] - a[i]) for i in range(4)))
    half = math.acos(cos_half)
    sin_half = math.sqrt(1.0 - cos_half * cos_half)
    if abs(sin_half) < _EPSILON:
        return tuple(a[i] * 0.5 + b[i] * 0.5 for i in range(4))
    ra = math.sin((1 - t) * half) / sin_half
    rb = math.sin(t * half) / sin_half
    return tuple(a[i] * ra + b[i] * rb for i in range(4))


def quaternion_slerp(q1, q2, amount, /):
    return Vector4(*slerp(vec4(q1, 'quaternion_slerp', 'q1'), vec4(q2, 'quaternion_slerp', 'q2'),
                          number(amount, 'quaternion_slerp', 'amount')))


def quaternion_from_axis_angle(axis, angle, /):
    ax, ay, az = vec3(axis, 'quaternion_from_axis_angle', 'axis')
    a = number(angle, 'quaternion_from_axis_angle', 'angle')
    length = math.sqrt(ax * ax + ay * ay + az * az)
    if length != 0.0:
        a *= 0.5
        ax, ay, az = ax / length, ay / length, az / length
        s, c = math.sin(a), math.cos(a)
        return Vector4(*_qnormalize((ax * s, ay * s, az * s, c)))
    return Vector4(0.0, 0.0, 0.0, 1.0)


def quaternion_from_euler(pitch, yaw, roll, /):
    f = 'quaternion_from_euler'
    p, y, r = number(pitch, f, 'pitch') * 0.5, number(yaw, f, 'yaw') * 0.5, number(roll, f, 'roll') * 0.5
    x0, x1 = math.cos(p), math.sin(p)
    y0, y1 = math.cos(y), math.sin(y)
    z0, z1 = math.cos(r), math.sin(r)
    return Vector4(x1 * y0 * z0 - x0 * y1 * z1, x0 * y1 * z0 + x1 * y0 * z1,
                   x0 * y0 * z1 - x1 * y1 * z0, x0 * y0 * z0 + x1 * y1 * z1)


def quaternion_to_euler(q, /):
    x, y, z, w = vec4(q, 'quaternion_to_euler', 'q')
    roll_x = math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))
    sin_p = 2 * (w * y - z * x)
    sin_p = 1.0 if sin_p > 1.0 else -1.0 if sin_p < -1.0 else sin_p
    pitch_y = math.asin(sin_p)
    yaw_z = math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
    return Vector3(roll_x, pitch_y, yaw_z)


def quaternion_to_matrix_values(q):
    x, y, z, w = q
    a2, b2, c2 = x * x, y * y, z * z
    ac, ab, bc = x * z, x * y, y * z
    ad, bd, cd = w * x, w * y, w * z
    return (1 - 2 * (b2 + c2), 2 * (ab + cd), 2 * (ac - bd), 0.0,
            2 * (ab - cd), 1 - 2 * (a2 + c2), 2 * (bc + ad), 0.0,
            2 * (ac + bd), 2 * (bc - ad), 1 - 2 * (a2 + b2), 0.0,
            0.0, 0.0, 0.0, 1.0)


def quaternion_to_matrix(q, /):
    return _make(quaternion_to_matrix_values(vec4(q, 'quaternion_to_matrix', 'q')))


def quaternion_transform(q, mat, /):
    x, y, z, w = vec4(q, 'quaternion_transform', 'q')
    m = _matrix(mat, 'quaternion_transform')
    return Vector4(m.m0 * x + m.m4 * y + m.m8 * z + m.m12 * w,
                   m.m1 * x + m.m5 * y + m.m9 * z + m.m13 * w,
                   m.m2 * x + m.m6 * y + m.m10 * z + m.m14 * w,
                   m.m3 * x + m.m7 * y + m.m11 * z + m.m15 * w)


def quaternion_equals(p, q, /):
    a = vec4(p, 'quaternion_equals', 'p')
    b = vec4(q, 'quaternion_equals', 'q')
    same = all(abs(a[i] - b[i]) <= _EPSILON * max(1.0, abs(a[i]), abs(b[i])) for i in range(4))
    opposite = all(abs(a[i] + b[i]) <= _EPSILON * max(1.0, abs(a[i]), abs(b[i])) for i in range(4))
    return int(same or opposite)


# Vector4 (o mesmo struct do quatérnio) ----------------------------------------------------------

def vector4_zero():
    return Vector4(0.0, 0.0, 0.0, 0.0)


def vector4_one():
    return Vector4(1.0, 1.0, 1.0, 1.0)


def vector4_add(v1, v2, /):
    return quaternion_add(v1, v2)


def vector4_subtract(v1, v2, /):
    return quaternion_subtract(v1, v2)


def vector4_scale(v, scale, /):
    return quaternion_scale(v, scale)


def vector4_length(v, /):
    return quaternion_length(v)


def vector4_normalize(v, /):
    a = vec4(v, 'vector4_normalize', 'v')
    length = math.sqrt(sum(c * c for c in a))
    if length > 0:
        return Vector4(*(c / length for c in a))
    return Vector4(*a)


def vector4_lerp(v1, v2, amount, /):
    return quaternion_lerp(v1, v2, amount)


def vector4_dot_product(v1, v2, /):
    a, b = vec4(v1, 'vector4_dot_product', 'v1'), vec4(v2, 'vector4_dot_product', 'v2')
    return sum(a[i] * b[i] for i in range(4))


def _v4(value, function, param='v'):
    return vec4(value, function, param)


def vector4_add_value(v, add, /):
    a = _v4(v, 'vector4_add_value')
    s = number(add, 'vector4_add_value', 'add')
    return Vector4(*(c + s for c in a))


quaternion_add_value = vector4_add_value


def vector4_subtract_value(v, add, /):
    a = _v4(v, 'vector4_subtract_value')
    s = number(add, 'vector4_subtract_value', 'add')
    return Vector4(*(c - s for c in a))


quaternion_subtract_value = vector4_subtract_value


def vector4_length_sqr(v, /):
    return sum(c * c for c in _v4(v, 'vector4_length_sqr'))


def vector4_distance(v1, v2, /):
    a, b = _v4(v1, 'vector4_distance', 'v1'), _v4(v2, 'vector4_distance', 'v2')
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(4)))


def vector4_distance_sqr(v1, v2, /):
    a, b = _v4(v1, 'vector4_distance_sqr', 'v1'), _v4(v2, 'vector4_distance_sqr', 'v2')
    return sum((a[i] - b[i]) ** 2 for i in range(4))


def vector4_multiply(v1, v2, /):
    a, b = _v4(v1, 'vector4_multiply', 'v1'), _v4(v2, 'vector4_multiply', 'v2')
    return Vector4(*(a[i] * b[i] for i in range(4)))


def vector4_divide(v1, v2, /):
    a, b = _v4(v1, 'vector4_divide', 'v1'), _v4(v2, 'vector4_divide', 'v2')
    return Vector4(*(_div(a[i], b[i]) for i in range(4)))


quaternion_divide = vector4_divide


def vector4_negate(v, /):
    return Vector4(*(-c for c in _v4(v, 'vector4_negate')))


def vector4_invert(v, /):
    return Vector4(*(_div(1.0, c) for c in _v4(v, 'vector4_invert')))


def vector4_min(v1, v2, /):
    a, b = _v4(v1, 'vector4_min', 'v1'), _v4(v2, 'vector4_min', 'v2')
    return Vector4(*(min(a[i], b[i]) for i in range(4)))


def vector4_max(v1, v2, /):
    a, b = _v4(v1, 'vector4_max', 'v1'), _v4(v2, 'vector4_max', 'v2')
    return Vector4(*(max(a[i], b[i]) for i in range(4)))


def vector4_move_towards(v, target, maxDistance, /):
    a = _v4(v, 'vector4_move_towards')
    t = _v4(target, 'vector4_move_towards', 'target')
    step = number(maxDistance, 'vector4_move_towards', 'maxDistance')
    d = [t[i] - a[i] for i in range(4)]
    value = sum(c * c for c in d)
    if value == 0 or (step >= 0 and value <= step * step):
        return Vector4(*t)
    dist = math.sqrt(value)
    return Vector4(*(a[i] + d[i] / dist * step for i in range(4)))


def vector4_equals(p, q, /):
    a, b = _v4(p, 'vector4_equals', 'p'), _v4(q, 'vector4_equals', 'q')
    return int(all(abs(a[i] - b[i]) <= _EPSILON * max(1.0, abs(a[i]), abs(b[i])) for i in range(4)))


def vector3_refract(v, n, r, /):
    x, y, z = vec3(v, 'vector3_refract', 'v')
    nx, ny, nz = vec3(n, 'vector3_refract', 'n')
    ratio = number(r, 'vector3_refract', 'r')
    dot = x * nx + y * ny + z * nz
    d = 1.0 - ratio * ratio * (1.0 - dot * dot)
    if d >= 0.0:
        d = math.sqrt(d)
        k = ratio * dot + d
        return Vector3(ratio * x - k * nx, ratio * y - k * ny, ratio * z - k * nz)
    return Vector3(0.0, 0.0, 0.0)


def quaternion_from_matrix_values(m):
    four_w = m[0] + m[5] + m[10]
    four_x = m[0] - m[5] - m[10]
    four_y = m[5] - m[0] - m[10]
    four_z = m[10] - m[0] - m[5]
    biggest = 0
    biggest_value = four_w
    for index, candidate in ((1, four_x), (2, four_y), (3, four_z)):
        if candidate > biggest_value:
            biggest, biggest_value = index, candidate
    big = math.sqrt(biggest_value + 1.0) * 0.5
    mult = 0.25 / big
    if biggest == 0:
        return ((m[6] - m[9]) * mult, (m[8] - m[2]) * mult, (m[1] - m[4]) * mult, big)
    if biggest == 1:
        return (big, (m[1] + m[4]) * mult, (m[8] + m[2]) * mult, (m[6] - m[9]) * mult)
    if biggest == 2:
        return ((m[1] + m[4]) * mult, big, (m[6] + m[9]) * mult, (m[8] - m[2]) * mult)
    return ((m[8] + m[2]) * mult, (m[6] + m[9]) * mult, big, (m[1] - m[4]) * mult)


def quaternion_from_matrix(mat, /):
    return Vector4(*quaternion_from_matrix_values(_m(_matrix(mat, 'quaternion_from_matrix'))))


def quaternion_from_vector3_to_vector3(start, to, /):
    a = vec3(start, 'quaternion_from_vector3_to_vector3', 'from')
    b = vec3(to, 'quaternion_from_vector3_to_vector3', 'to')
    cos2 = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    c = _cross(a, b)
    w = math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2] + cos2 * cos2) + cos2
    return Vector4(*_qnormalize((c[0], c[1], c[2], w)))


def _rotate_by_quaternion(v, q):
    x, y, z = v
    qx, qy, qz, qw = q
    return (x * (qx * qx + qw * qw - qy * qy - qz * qz) + y * (2 * qx * qy - 2 * qw * qz) + z * (2 * qx * qz + 2 * qw * qy),
            x * (2 * qw * qz + 2 * qx * qy) + y * (qw * qw - qx * qx + qy * qy - qz * qz) + z * (-2 * qw * qx + 2 * qy * qz),
            x * (-2 * qw * qy + 2 * qx * qz) + y * (2 * qw * qx + 2 * qy * qz) + z * (qw * qw - qx * qx - qy * qy + qz * qz))


def matrix_compose_values(translation, rotation, scale):
    right = _rotate_by_quaternion((scale[0], 0.0, 0.0), rotation)
    up = _rotate_by_quaternion((0.0, scale[1], 0.0), rotation)
    forward = _rotate_by_quaternion((0.0, 0.0, scale[2]), rotation)
    # Inicializador do C na ordem dos campos: m0, m4, m8, m12, m1, m5...
    return (right[0], right[1], right[2], 0.0, up[0], up[1], up[2], 0.0,
            forward[0], forward[1], forward[2], 0.0, translation[0], translation[1], translation[2], 1.0)


def vector3_unproject(source, projection, view, /):
    f = 'vector3_unproject'
    x, y, z = vec3(source, f, 'source')
    inv = _invert(_mul(_m(_matrix(view, f, 'view')), _m(_matrix(projection, f, 'projection'))))
    q = (inv[0] * x + inv[4] * y + inv[8] * z + inv[12],
         inv[1] * x + inv[5] * y + inv[9] * z + inv[13],
         inv[2] * x + inv[6] * y + inv[10] * z + inv[14],
         inv[3] * x + inv[7] * y + inv[11] * z + inv[15])
    return Vector3(_div(q[0], q[3]), _div(q[1], q[3]), _div(q[2], q[3]))


def vector3_cubic_hermite(v1, tangent1, v2, tangent2, amount, /):
    f = 'vector3_cubic_hermite'
    a, ta = vec3(v1, f, 'v1'), vec3(tangent1, f, 'tangent1')
    b, tb = vec3(v2, f, 'v2'), vec3(tangent2, f, 'tangent2')
    t = number(amount, f, 'amount')
    t2, t3 = t * t, t * t * t
    return Vector3(*((2 * t3 - 3 * t2 + 1) * a[i] + (t3 - 2 * t2 + t) * ta[i] + (-2 * t3 + 3 * t2) * b[i] +
                     (t3 - t2) * tb[i] for i in range(3)))


def matrix_compose(translation, rotation, scale, /):
    f = 'matrix_compose'
    return _make(matrix_compose_values(vec3(translation, f, 'translation'), vec4(rotation, f, 'rotation'),
                                       vec3(scale, f, 'scale')))
