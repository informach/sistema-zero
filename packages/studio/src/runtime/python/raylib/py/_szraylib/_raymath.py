"""raymath.h do raylib em Python: vetores, matrizes e quatérnios.

Os nomes seguem o pyray (``vector2_add``); o módulo ``raylib`` também os oferece com os nomes do
C (``Vector2Add``). A matriz é coluna-maior, como no raylib (m0, m4, m8, m12 é a 1ª linha).
O teste diferencial (scripts/raylib/tests) compara cada função com o raylib do computador.
"""
import math

from ._args import number as _number, struct, vec2 as _vec2, vec3 as _vec3, vec4 as _vec4
from ._float32 import (F, acosf, asinf, atan2f, cosf, exact, fabsf, floorf, fmaxf, fminf, rounded,
                       sinf, sqrtf)
from ._structs import STRUCTS, Matrix, Vector2, Vector3, Vector4

# O raymath faz cada conta em float (32 bits), operação por operação. Aqui os números de entrada
# viram F (_float32.py), que arredonda para float depois de cada operação: a mesma conta, escrita
# na mesma ordem do C, dá o mesmo resultado bit a bit. O que sai para o jogo volta a ser float do
# Python (o pyray do computador devolve o float do C convertido para double, sem perder nada).
_EPSILON = F(0.000001)


def number(value, function, param='valor'):
    return F(_number(value, function, param))


def vec2(value, function, param):
    x, y = _vec2(value, function, param)
    return F(x), F(y)


def vec3(value, function, param):
    x, y, z = _vec3(value, function, param)
    return F(x), F(y), F(z)


def vec4(value, function, param):
    x, y, z, w = _vec4(value, function, param)
    return F(x), F(y), F(z), F(w)


def _f(values):
    """Uma tupla de números como floats do C (para as funções que outros módulos chamam)."""
    return tuple(map(F, values))


def _matrix(value, function, param='mat'):
    return struct(value, Matrix, function, param)


def _m(m):
    return (F(m.m0), F(m.m1), F(m.m2), F(m.m3), F(m.m4), F(m.m5), F(m.m6), F(m.m7),
            F(m.m8), F(m.m9), F(m.m10), F(m.m11), F(m.m12), F(m.m13), F(m.m14), F(m.m15))


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
    return float(_div(number(value, f, 'value') - s, number(end, f, 'end') - s))


def remap(value, inputStart, inputEnd, outputStart, outputEnd, /):
    f = 'remap'
    v, a, b = number(value, f, 'value'), number(inputStart, f, 'inputStart'), number(inputEnd, f, 'inputEnd')
    c, d = number(outputStart, f, 'outputStart'), number(outputEnd, f, 'outputEnd')
    return float(_div(v - a, b - a) * (d - c) + c)


def wrap(value, min, max, /):
    f = 'wrap'
    v, lo, hi = number(value, f, 'value'), number(min, f, 'min'), number(max, f, 'max')
    return float(v - (hi - lo) * _floor(_div(v - lo, hi - lo)))


def float_equals(x, y, /):
    a, b = number(x, 'float_equals', 'x'), number(y, 'float_equals', 'y')
    return int(fabsf(a - b) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(a), fabsf(b))))


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
    return float(sqrtf(x * x + y * y))


def vector2_length_sqr(v, /):
    x, y = vec2(v, 'vector2_length_sqr', 'v')
    return float(x * x + y * y)


def vector2_dot_product(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_dot_product', 'v1')
    bx, by = vec2(v2, 'vector2_dot_product', 'v2')
    return float(ax * bx + ay * by)


def vector2_cross_product(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_cross_product', 'v1')
    bx, by = vec2(v2, 'vector2_cross_product', 'v2')
    return float(ax * by - ay * bx)


def vector2_distance(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_distance', 'v1')
    bx, by = vec2(v2, 'vector2_distance', 'v2')
    return float(sqrtf((ax - bx) * (ax - bx) + (ay - by) * (ay - by)))


def vector2_distance_sqr(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_distance_sqr', 'v1')
    bx, by = vec2(v2, 'vector2_distance_sqr', 'v2')
    return float((ax - bx) * (ax - bx) + (ay - by) * (ay - by))


def vector2_angle(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_angle', 'v1')
    bx, by = vec2(v2, 'vector2_angle', 'v2')
    dot = ax * bx + ay * by
    det = ax * by - ay * bx
    return float(atan2f(det, dot))


def vector2_line_angle(start, end, /):
    ax, ay = vec2(start, 'vector2_line_angle', 'start')
    bx, by = vec2(end, 'vector2_line_angle', 'end')
    return float(-atan2f(by - ay, bx - ax))


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
    """A divisão do C (IEEE): dividir por zero dá infinito com sinal, ou nan (0/0)."""
    if b == 0:
        if a == 0 or a != a:
            return math.nan
        return math.copysign(math.inf, a) * math.copysign(1.0, b)
    return a / b


def _floor(x):
    """floorf do C: nan e infinito passam como estão (o math.floor do Python lança)."""
    return floorf(x)


def vector2_normalize(v, /):
    x, y = vec2(v, 'vector2_normalize', 'v')
    length = sqrtf(x * x + y * y)
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
    return Vector2(fminf(ax, bx), fminf(ay, by))


def vector2_max(v1, v2, /):
    ax, ay = vec2(v1, 'vector2_max', 'v1')
    bx, by = vec2(v2, 'vector2_max', 'v2')
    return Vector2(fmaxf(ax, bx), fmaxf(ay, by))


def vector2_rotate(v, angle, /):
    x, y = vec2(v, 'vector2_rotate', 'v')
    a = number(angle, 'vector2_rotate', 'angle')
    c, s = cosf(a), sinf(a)
    return Vector2(x * c - y * s, x * s + y * c)


def vector2_move_towards(v, target, maxDistance, /):
    x, y = vec2(v, 'vector2_move_towards', 'v')
    tx, ty = vec2(target, 'vector2_move_towards', 'target')
    step = number(maxDistance, 'vector2_move_towards', 'maxDistance')
    dx, dy = tx - x, ty - y
    value = dx * dx + dy * dy
    if value == 0 or (step >= 0 and value <= step * step):
        return Vector2(tx, ty)
    dist = sqrtf(value)
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
    return fminf(high, fmaxf(low, value))


def vector2_clamp_value(v, min, max, /):
    x, y = vec2(v, 'vector2_clamp_value', 'v')
    lo, hi = number(min, 'vector2_clamp_value', 'min'), number(max, 'vector2_clamp_value', 'max')
    length = x * x + y * y
    if length > 0:
        length = sqrtf(length)
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
    return int(fabsf(px - qx) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(px), fabsf(qx))) and
               fabsf(py - qy) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(py), fabsf(qy))))


def vector2_refract(v, n, r, /):
    x, y = vec2(v, 'vector2_refract', 'v')
    nx, ny = vec2(n, 'vector2_refract', 'n')
    ratio = number(r, 'vector2_refract', 'r')
    dot = x * nx + y * ny
    d = 1.0 - ratio * ratio * (1.0 - dot * dot)
    if d >= 0.0:
        d = sqrtf(d)
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
    a, b = _f(a), _f(b)
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
    return float(sqrtf(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]))


def vector3_length_sqr(v, /):
    a = vec3(v, 'vector3_length_sqr', 'v')
    return float(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def vector3_dot_product(v1, v2, /):
    a = vec3(v1, 'vector3_dot_product', 'v1')
    b = vec3(v2, 'vector3_dot_product', 'v2')
    return float(a[0] * b[0] + a[1] * b[1] + a[2] * b[2])


def vector3_distance(v1, v2, /):
    a = vec3(v1, 'vector3_distance', 'v1')
    b = vec3(v2, 'vector3_distance', 'v2')
    return float(sqrtf((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) + (b[2] - a[2]) * (b[2] - a[2])))


def vector3_distance_sqr(v1, v2, /):
    a = vec3(v1, 'vector3_distance_sqr', 'v1')
    b = vec3(v2, 'vector3_distance_sqr', 'v2')
    return float((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) + (b[2] - a[2]) * (b[2] - a[2]))


def vector3_angle(v1, v2, /):
    a = vec3(v1, 'vector3_angle', 'v1')
    b = vec3(v2, 'vector3_angle', 'v2')
    c = _cross(a, b)
    length = sqrtf(c[0] * c[0] + c[1] * c[1] + c[2] * c[2])
    dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    return float(atan2f(length, dot))


def vector3_negate(v, /):
    a = vec3(v, 'vector3_negate', 'v')
    return Vector3(-a[0], -a[1], -a[2])


def vector3_divide(v1, v2, /):
    a = vec3(v1, 'vector3_divide', 'v1')
    b = vec3(v2, 'vector3_divide', 'v2')
    return Vector3(_div(a[0], b[0]), _div(a[1], b[1]), _div(a[2], b[2]))


def _normalize3(a):
    a = _f(a)
    length = sqrtf(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
    if length != 0.0:
        inv = 1.0 / length
        return (a[0] * inv, a[1] * inv, a[2] * inv)
    return a


def _add3(a, b):
    a, b = _f(a), _f(b)
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _sub3(a, b):
    a, b = _f(a), _f(b)
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _length3(a):
    a = _f(a)
    return sqrtf(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def _angle3(a, b):
    a, b = _f(a), _f(b)
    c = _cross(a, b)
    return atan2f(_length3(c), a[0] * b[0] + a[1] * b[1] + a[2] * b[2])


def _rotate_axis_angle(v, axis, angle):
    """Vector3RotateByAxisAngle (fórmula de Euler-Rodrigues) sobre tuplas."""
    v, axis, angle = _f(v), _f(axis), F(angle)
    vx, vy, vz = v
    ax, ay, az = _normalize3(axis)
    half = angle / 2.0
    s = sinf(half)
    bx, by, bz, w = ax * s, ay * s, az * s, cosf(half)
    wx, wy, wz = _cross((bx, by, bz), (vx, vy, vz))
    wwx, wwy, wwz = _cross((bx, by, bz), (wx, wy, wz))
    w2 = w * 2
    return (vx + wx * w2 + wwx * 2, vy + wy * w2 + wwy * 2, vz + wz * w2 + wwz * 2)


def vector3_normalize(v, /):
    return Vector3(*_normalize3(vec3(v, 'vector3_normalize', 'v')))


def vector3_project(v1, v2, /):
    a = vec3(v1, 'vector3_project', 'v1')
    b = vec3(v2, 'vector3_project', 'v2')
    mag = _div(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], b[0] * b[0] + b[1] * b[1] + b[2] * b[2])
    return Vector3(b[0] * mag, b[1] * mag, b[2] * mag)


def vector3_reject(v1, v2, /):
    a = vec3(v1, 'vector3_reject', 'v1')
    b = vec3(v2, 'vector3_reject', 'v2')
    mag = _div(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], b[0] * b[0] + b[1] * b[1] + b[2] * b[2])
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
    return Vector3(*_rotate_axis_angle(vec3(v, f, 'v'), vec3(axis, f, 'axis'),
                                       number(angle, f, 'angle')))


def vector3_move_towards(v, target, maxDistance, /):
    f = 'vector3_move_towards'
    x, y, z = vec3(v, f, 'v')
    tx, ty, tz = vec3(target, f, 'target')
    step = number(maxDistance, f, 'maxDistance')
    dx, dy, dz = tx - x, ty - y, tz - z
    value = dx * dx + dy * dy + dz * dz
    if value == 0 or (step >= 0 and value <= step * step):
        return Vector3(tx, ty, tz)
    dist = sqrtf(value)
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
    return Vector3(fminf(a[0], b[0]), fminf(a[1], b[1]), fminf(a[2], b[2]))


def vector3_max(v1, v2, /):
    a = vec3(v1, 'vector3_max', 'v1')
    b = vec3(v2, 'vector3_max', 'v2')
    return Vector3(fmaxf(a[0], b[0]), fmaxf(a[1], b[1]), fmaxf(a[2], b[2]))


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
        length = sqrtf(length)
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
    return int(all(fabsf(a[i] - b[i]) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(a[i]), fabsf(b[i]))) for i in range(3)))


def vector3_barycenter(p, a, b, c, /):
    f = 'vector3_barycenter'
    P, A, B, C = vec3(p, f, 'p'), vec3(a, f, 'a'), vec3(b, f, 'b'), vec3(c, f, 'c')
    v0 = tuple(B[i] - A[i] for i in range(3))
    v1 = tuple(C[i] - A[i] for i in range(3))
    v2 = tuple(P[i] - A[i] for i in range(3))
    dot = lambda u, w: u[0] * w[0] + u[1] * w[1] + u[2] * w[2]  # noqa: E731
    d00, d01, d11, d20, d21 = dot(v0, v0), dot(v0, v1), dot(v1, v1), dot(v2, v0), dot(v2, v1)
    denom = d00 * d11 - d01 * d01
    y = _div(d11 * d20 - d01 * d21, denom)
    z = _div(d00 * d21 - d01 * d20, denom)
    return Vector3(1.0 - (z + y), y, z)


# Matrix -----------------------------------------------------------------------------------------

def matrix_identity():
    return _make((1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0))


def _mul(left, right):
    """MatrixMultiply(left, right) do raymath, sobre tuplas m0..m15.

    Em float, como no C, mas arredondando as 16 posições de uma vez: o produto de dois floats é
    exato em double, e cada soma (na ordem do C) é arredondada para float em bloco.
    """
    try:
        l, r = rounded(left), rounded(right)
        rows = (0, 4, 8, 12)
        total = rounded([l[i] * r[j] for i in rows for j in range(4)])
        for k in (1, 2, 3):
            terms = [l[i + k] * r[4 * k + j] for i in rows for j in range(4)]
            total = rounded(map(float.__add__, total, rounded(terms)))
    except OverflowError:
        return _mul_slow(left, right)
    return exact(total)


def _mul_slow(left, right):
    """A mesma conta, uma operação por vez (quando algum valor passa do maior float)."""
    left, right = _f(left), _f(right)
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
    axis, angle = _f(axis), F(angle)
    x, y, z = axis
    length = x * x + y * y + z * z
    if length != 1.0 and length != 0.0:
        length = 1.0 / sqrtf(length)
        x, y, z = x * length, y * length, z * length
    s, c = sinf(angle), cosf(angle)
    t = 1.0 - c
    return (x * x * t + c, y * x * t + z * s, z * x * t - y * s, 0.0,
            x * y * t - z * s, y * y * t + c, z * y * t + x * s, 0.0,
            x * z * t + y * s, y * z * t - x * s, z * z * t + c, 0.0,
            0.0, 0.0, 0.0, 1.0)


def matrix_rotate(axis, angle, /):
    return _make(_rotate(vec3(axis, 'matrix_rotate', 'axis'), number(angle, 'matrix_rotate', 'angle')))


def matrix_rotate_x(angle, /):
    a = number(angle, 'matrix_rotate_x', 'angle')
    c, s = cosf(a), sinf(a)
    return _make((1.0, 0.0, 0.0, 0.0, 0.0, c, s, 0.0, 0.0, -s, c, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_y(angle, /):
    a = number(angle, 'matrix_rotate_y', 'angle')
    c, s = cosf(a), sinf(a)
    return _make((c, 0.0, -s, 0.0, 0.0, 1.0, 0.0, 0.0, s, 0.0, c, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_z(angle, /):
    a = number(angle, 'matrix_rotate_z', 'angle')
    c, s = cosf(a), sinf(a)
    return _make((c, s, 0.0, 0.0, -s, c, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0))


def matrix_rotate_xyz(angle, /):
    ax, ay, az = vec3(angle, 'matrix_rotate_xyz', 'angle')
    cz, sz = cosf(-az), sinf(-az)
    cy, sy = cosf(-ay), sinf(-ay)
    cx, sx = cosf(-ax), sinf(-ax)
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
    cz, sz = cosf(az), sinf(az)
    cy, sy = cosf(ay), sinf(ay)
    cx, sx = cosf(ax), sinf(ax)
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
    m = _f(m)
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
    inv = 1.0 / det
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
    # Expansão de Laplace por menores 2x2, como no raymath (40 multiplicações).
    (m0, m1, m2, m3, m4, m5, m6, m7,
     m8, m9, m10, m11, m12, m13, m14, m15) = _m(_matrix(mat, 'matrix_determinant'))
    return float(
        m0 * (m5 * (m10 * m15 - m11 * m14) - m9 * (m6 * m15 - m7 * m14) + m13 * (m6 * m11 - m7 * m10))
        - m4 * (m1 * (m10 * m15 - m11 * m14) - m9 * (m2 * m15 - m3 * m14) + m13 * (m2 * m11 - m3 * m10))
        + m8 * (m1 * (m6 * m15 - m7 * m14) - m5 * (m2 * m15 - m3 * m14) + m13 * (m2 * m7 - m3 * m6))
        - m12 * (m1 * (m6 * m11 - m7 * m10) - m5 * (m2 * m11 - m3 * m10) + m9 * (m2 * m7 - m3 * m6)))


def matrix_trace(mat, /):
    m = _matrix(mat, 'matrix_trace')
    return float(F(m.m0) + m.m5 + m.m10 + m.m15)


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


def _frustum_from(rl, tb, fn, left, right, bottom, top, near, far):
    """O fim de MatrixFrustum e MatrixPerspective: as diferenças vêm de double, o resto é float."""
    rl, tb, fn = F(rl), F(tb), F(fn)
    near_f, far_f = F(near), F(far)
    return (near_f * 2.0 / rl, 0.0, 0.0, 0.0,
            0.0, near_f * 2.0 / tb, 0.0, 0.0,
            (F(right) + F(left)) / rl, (F(top) + F(bottom)) / tb, -(far_f + near_f) / fn, -1.0,
            0.0, 0.0, -(far_f * near_f * 2.0) / fn, 0.0)


def frustum(left, right, bottom, top, near, far):
    """MatrixFrustum: os parâmetros são double, como no C."""
    left, right, bottom, top, near, far = (float(v) for v in (left, right, bottom, top, near, far))
    return _frustum_from(right - left, top - bottom, far - near, left, right, bottom, top, near, far)


def perspective(fovY, aspect, near, far):
    """MatrixPerspective: o topo e a direita são contados em double (tan do C), o resto em float."""
    fovY, aspect, near, far = float(fovY), float(aspect), float(near), float(far)
    top = near * math.tan(fovY * 0.5)
    right = top * aspect
    return _frustum_from(right - -right, top - -top, far - near, -right, right, -top, top, near, far)


def ortho(left, right, bottom, top, near, far):
    """MatrixOrtho: as diferenças em double, convertidas para float; as divisões em float."""
    left, right, bottom, top, near, far = (float(v) for v in (left, right, bottom, top, near, far))
    rl, tb, fn = F(right - left), F(top - bottom), F(far - near)
    return (2.0 / rl, 0.0, 0.0, 0.0, 0.0, 2.0 / tb, 0.0, 0.0, 0.0, 0.0, -2.0 / fn, 0.0,
            -(F(left) + F(right)) / rl, -(F(top) + F(bottom)) / tb, -(F(far) + F(near)) / fn, 1.0)


def look_at(eye, target, up):
    eye, target, up = _f(eye), _f(target), _f(up)
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
    return _make(frustum(_number(left, f), _number(right, f), _number(bottom, f), _number(top, f),
                         _number(nearPlane, f), _number(farPlane, f)))


def matrix_perspective(fovY, aspect, nearPlane, farPlane, /):
    f = 'matrix_perspective'
    return _make(perspective(_number(fovY, f), _number(aspect, f), _number(nearPlane, f),
                             _number(farPlane, f)))


def matrix_ortho(left, right, bottom, top, nearPlane, farPlane, /):
    f = 'matrix_ortho'
    return _make(ortho(_number(left, f), _number(right, f), _number(bottom, f), _number(top, f),
                       _number(nearPlane, f), _number(farPlane, f)))


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
    return float(sqrtf(sum(v * v for v in a)))


def _qnormalize(a):
    a = _f(a)
    length = sqrtf(sum(v * v for v in a))
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
    a, b = _f(a), _f(b)
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
    # O cosseno em float, como no C: com dois quadros quase iguais ele vira 1.0f e o raylib
    # devolve o primeiro sem interpolar (em double daria 0.9999999 e uma interpolação).
    a, b, t = _f(a), _f(b), F(t)
    cos_half = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
    if cos_half < 0:
        b = tuple(-v for v in b)
        cos_half = -cos_half
    if abs(cos_half) >= 1.0:
        return a
    if cos_half > 0.95:
        return _qnormalize(tuple(a[i] + t * (b[i] - a[i]) for i in range(4)))
    half = acosf(cos_half)
    sin_half = sqrtf(1.0 - cos_half * cos_half)
    if abs(sin_half) < _EPSILON:
        return tuple(a[i] * 0.5 + b[i] * 0.5 for i in range(4))
    ra = sinf((1 - t) * half) / sin_half
    rb = sinf(t * half) / sin_half
    return tuple(a[i] * ra + b[i] * rb for i in range(4))


def quaternion_slerp(q1, q2, amount, /):
    return Vector4(*slerp(vec4(q1, 'quaternion_slerp', 'q1'), vec4(q2, 'quaternion_slerp', 'q2'),
                          number(amount, 'quaternion_slerp', 'amount')))


def quaternion_from_axis_angle(axis, angle, /):
    ax, ay, az = vec3(axis, 'quaternion_from_axis_angle', 'axis')
    a = number(angle, 'quaternion_from_axis_angle', 'angle')
    length = sqrtf(ax * ax + ay * ay + az * az)
    if length == 0.0:
        return Vector4(0.0, 0.0, 0.0, 1.0)
    a = a * 0.5
    inverse = 1.0 / length
    ax, ay, az = ax * inverse, ay * inverse, az * inverse
    s, c = sinf(a), cosf(a)
    return Vector4(*_qnormalize((ax * s, ay * s, az * s, c)))


def quaternion_from_euler(pitch, yaw, roll, /):
    f = 'quaternion_from_euler'
    p, y, r = number(pitch, f, 'pitch') * 0.5, number(yaw, f, 'yaw') * 0.5, number(roll, f, 'roll') * 0.5
    x0, x1 = cosf(p), sinf(p)
    y0, y1 = cosf(y), sinf(y)
    z0, z1 = cosf(r), sinf(r)
    return Vector4(x1 * y0 * z0 - x0 * y1 * z1, x0 * y1 * z0 + x1 * y0 * z1,
                   x0 * y0 * z1 - x1 * y1 * z0, x0 * y0 * z0 + x1 * y1 * z1)


def quaternion_to_euler(q, /):
    x, y, z, w = vec4(q, 'quaternion_to_euler', 'q')
    roll_x = atan2f(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))
    sin_p = 2 * (w * y - z * x)
    sin_p = 1.0 if sin_p > 1.0 else -1.0 if sin_p < -1.0 else sin_p
    pitch_y = asinf(sin_p)
    yaw_z = atan2f(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
    return Vector3(roll_x, pitch_y, yaw_z)


def quaternion_to_matrix_values(q):
    q = _f(q)
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
    same = all(fabsf(a[i] - b[i]) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(a[i]), fabsf(b[i]))) for i in range(4))
    opposite = all(fabsf(a[i] + b[i]) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(a[i]), fabsf(b[i]))) for i in range(4))
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
    x, y, z, w = vec4(v, 'vector4_normalize', 'v')
    length = sqrtf(x * x + y * y + z * z + w * w)
    if length > 0:
        inverse = 1.0 / length
        return Vector4(x * inverse, y * inverse, z * inverse, w * inverse)
    return Vector4(0.0, 0.0, 0.0, 0.0)


def vector4_lerp(v1, v2, amount, /):
    return quaternion_lerp(v1, v2, amount)


def vector4_dot_product(v1, v2, /):
    a, b = vec4(v1, 'vector4_dot_product', 'v1'), vec4(v2, 'vector4_dot_product', 'v2')
    return float(sum(a[i] * b[i] for i in range(4)))


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
    return float(sum(c * c for c in _v4(v, 'vector4_length_sqr')))


def vector4_distance(v1, v2, /):
    a, b = _v4(v1, 'vector4_distance', 'v1'), _v4(v2, 'vector4_distance', 'v2')
    return float(sqrtf(sum((a[i] - b[i]) * (a[i] - b[i]) for i in range(4))))


def vector4_distance_sqr(v1, v2, /):
    a, b = _v4(v1, 'vector4_distance_sqr', 'v1'), _v4(v2, 'vector4_distance_sqr', 'v2')
    return float(sum((a[i] - b[i]) * (a[i] - b[i]) for i in range(4)))


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
    return Vector4(*(fminf(a[i], b[i]) for i in range(4)))


def vector4_max(v1, v2, /):
    a, b = _v4(v1, 'vector4_max', 'v1'), _v4(v2, 'vector4_max', 'v2')
    return Vector4(*(fmaxf(a[i], b[i]) for i in range(4)))


def vector4_move_towards(v, target, maxDistance, /):
    a = _v4(v, 'vector4_move_towards')
    t = _v4(target, 'vector4_move_towards', 'target')
    step = number(maxDistance, 'vector4_move_towards', 'maxDistance')
    d = [t[i] - a[i] for i in range(4)]
    value = sum(c * c for c in d)
    if value == 0 or (step >= 0 and value <= step * step):
        return Vector4(*t)
    dist = sqrtf(value)
    return Vector4(*(a[i] + d[i] / dist * step for i in range(4)))


def vector4_equals(p, q, /):
    a, b = _v4(p, 'vector4_equals', 'p'), _v4(q, 'vector4_equals', 'q')
    return int(all(fabsf(a[i] - b[i]) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(a[i]), fabsf(b[i]))) for i in range(4)))


def vector3_refract(v, n, r, /):
    x, y, z = vec3(v, 'vector3_refract', 'v')
    nx, ny, nz = vec3(n, 'vector3_refract', 'n')
    ratio = number(r, 'vector3_refract', 'r')
    dot = x * nx + y * ny + z * nz
    d = 1.0 - ratio * ratio * (1.0 - dot * dot)
    if d >= 0.0:
        d = sqrtf(d)
        k = ratio * dot + d
        return Vector3(ratio * x - k * nx, ratio * y - k * ny, ratio * z - k * nz)
    return Vector3(0.0, 0.0, 0.0)


def quaternion_from_matrix_values(m):
    m = _f(m)
    four_w = m[0] + m[5] + m[10]
    four_x = m[0] - m[5] - m[10]
    four_y = m[5] - m[0] - m[10]
    four_z = m[10] - m[0] - m[5]
    biggest = 0
    biggest_value = four_w
    for index, candidate in ((1, four_x), (2, four_y), (3, four_z)):
        if candidate > biggest_value:
            biggest, biggest_value = index, candidate
    big = sqrtf(biggest_value + 1.0) * 0.5
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
    w = sqrtf(c[0] * c[0] + c[1] * c[1] + c[2] * c[2] + cos2 * cos2) + cos2
    return Vector4(*_qnormalize((c[0], c[1], c[2], w)))


def _rotate_by_quaternion(v, q):
    v, q = _f(v), _f(q)
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


# A posição de cada campo num inicializador de Matrix do C ({a, b, c...}): a struct guarda
# m0, m4, m8, m12, m1, m5... nessa ordem, então o segundo valor vai para m4, não para m1.
_POSITIONAL = (0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15)


def _positional(values):
    fields = [0.0] * 16
    for position, value in zip(_POSITIONAL, values):
        fields[position] = value
    return fields


def vector3_unproject(source, projection, view, /):
    f = 'vector3_unproject'
    x, y, z = vec3(source, f, 'source')
    point = unproject(x, y, z, _m(_matrix(projection, f, 'projection')), _m(_matrix(view, f, 'view')))
    return Vector3(*point)


def unproject(x, y, z, p, v):
    """Vector3Unproject sobre tuplas m0..m15 (a câmera 3D também usa)."""
    x, y, z, p, v = F(x), F(y), F(z), _f(p), _f(v)
    # Vector3Unproject escreve a multiplicação e a inversa por posição (ver _POSITIONAL).
    product = _positional([v[row] * p[col] + v[row + 1] * p[col + 4] + v[row + 2] * p[col + 8]
                           + v[row + 3] * p[col + 12] for row in (0, 4, 8, 12) for col in range(4)])
    inverse = _positional(_invert(product))
    w = F(1.0)
    qx = inverse[0] * x + inverse[4] * y + inverse[8] * z + inverse[12] * w
    qy = inverse[1] * x + inverse[5] * y + inverse[9] * z + inverse[13] * w
    qz = inverse[2] * x + inverse[6] * y + inverse[10] * z + inverse[14] * w
    qw = inverse[3] * x + inverse[7] * y + inverse[11] * z + inverse[15] * w
    return qx / qw, qy / qw, qz / qw


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


def vector3_to_float_v(v, /):
    """Vector3ToFloatV: um float3 com os três números em v."""
    result = STRUCTS['float3']()
    result.v = vec3(v, 'vector3_to_float_v', 'v')
    return result


def matrix_to_float_v(mat, /):
    """MatrixToFloatV: um float16 com m0..m15 em v, nessa ordem."""
    result = STRUCTS['float16']()
    result.v = _m(_matrix(mat, 'matrix_to_float_v'))
    return result


def quaternion_cubic_hermite_spline(q1, outTangent1, q2, inTangent2, t, /):
    """QuaternionCubicHermiteSpline do raymath, em float (t3 é t2*t)."""
    f = 'quaternion_cubic_hermite_spline'
    a, out = vec4(q1, f, 'q1'), vec4(outTangent1, f, 'outTangent1')
    b, inner = vec4(q2, f, 'q2'), vec4(inTangent2, f, 'inTangent2')
    t = number(t, f, 't')
    t2 = t * t
    t3 = t2 * t
    h00, h10, h01, h11 = 2 * t3 - 3 * t2 + 1, t3 - 2 * t2 + t, -2 * t3 + 3 * t2, t3 - t2
    result = tuple(a[i] * h00 + out[i] * h10 + b[i] * h01 + inner[i] * h11 for i in range(4))
    return Vector4(*_qnormalize(result))
