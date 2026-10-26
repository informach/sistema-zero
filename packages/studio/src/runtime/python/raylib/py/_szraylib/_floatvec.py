"""As contas em float do raylib para muitos números de uma vez (as poses das animações).

Cada operação de um ``FV`` vale para todos os elementos e arredonda o resultado para float em
bloco (``array('f')`` faz isso em C), então a conta sai igual à do C, operação por operação,
sem pagar o Python a cada número. Carregar as animações faz a mesma conta para cada osso em cada
quadro, e é aqui que ela roda (ver _gltf.py e _models.py).

As funções do raymath daqui são transcrições na mesma ordem de contas do raymath.h, e os ``if``
do C viram uma escolha elemento a elemento (``choose``).
"""
import math
from array import array
from itertools import repeat

from ._float32 import _quotient, f32

_add, _sub, _mul = float.__add__, float.__sub__, float.__mul__
_EPSILON = f32(0.000001)


def _round(values):
    values = list(values)
    try:
        return array('f', values)
    except OverflowError:
        return array('f', map(f32, values))


def _safe(function, fallback):
    def run(values):
        try:
            return _round(map(function, values))
        except (ValueError, OverflowError):
            return _round(map(fallback, values))
    return run


def _nan_or(function):
    def call(x):
        try:
            return function(x)
        except (ValueError, OverflowError):
            return math.nan
    return call


_sqrt = _safe(math.sqrt, _nan_or(math.sqrt))
_sin = _safe(math.sin, _nan_or(math.sin))
_cos = _safe(math.cos, _nan_or(math.cos))
_acos = _safe(math.acos, _nan_or(math.acos))


class FV:
    """Um vetor de floats do C: cada operação arredonda todos os resultados para float."""
    __slots__ = ('a',)

    def __init__(self, values):
        self.a = values if isinstance(values, array) else _round(values)

    @staticmethod
    def full(value, count):
        return FV(_round(repeat(f32(value), count)))

    def __len__(self):
        return len(self.a)

    def _other(self, other):
        return other.a if other.__class__ is FV else repeat(f32(other), len(self.a))

    def __add__(self, other):
        return FV(_round(map(_add, self.a, self._other(other))))

    def __radd__(self, other):
        return FV(_round(map(_add, self._other(other), self.a)))

    def __sub__(self, other):
        return FV(_round(map(_sub, self.a, self._other(other))))

    def __rsub__(self, other):
        return FV(_round(map(_sub, self._other(other), self.a)))

    def __mul__(self, other):
        return FV(_round(map(_mul, self.a, self._other(other))))

    def __rmul__(self, other):
        return FV(_round(map(_mul, self._other(other), self.a)))

    def __truediv__(self, other):
        return FV(_round(map(_quotient, self.a, self._other(other))))

    def __rtruediv__(self, other):
        return FV(_round(map(_quotient, self._other(other), self.a)))

    def __neg__(self):
        return FV(array('f', [-v for v in self.a]))


def vec(value, count):
    """O valor como FV (um número vira um vetor com ele repetido)."""
    return value if value.__class__ is FV else FV.full(value, count)


def items(value, count):
    return value.a if value.__class__ is FV else repeat(f32(value), count)


def sqrt(v):
    return FV(_sqrt(v.a))


def sin(v):
    return FV(_sin(v.a))


def cos(v):
    return FV(_cos(v.a))


def acos(v):
    return FV(_acos(v.a))


def fabs(v):
    return FV(array('f', [abs(x) for x in v.a]))


def fmax(a, b, count):
    """fmaxf do C elemento a elemento (um nan perde para o outro número)."""
    out = []
    for x, y in zip(items(a, count), items(b, count)):
        out.append(y if x != x else x if y != y else (x if x > y else y))
    return FV(array('f', out))


def choose(mask, a, b, count):
    """Elemento a elemento: a quando mask, senão b."""
    return FV(array('f', [x if m else y for m, x, y in zip(mask, items(a, count), items(b, count))]))


def less(a, b, count):
    return [x < y for x, y in zip(items(a, count), items(b, count))]


def greater(a, b, count):
    return [x > y for x, y in zip(items(a, count), items(b, count))]


# raymath.h ---------------------------------------------------------------------------------

def vector3_lerp(a, b, t):
    return tuple(a[i] + t * (b[i] - a[i]) for i in range(3))


def quaternion_to_matrix(q):
    """QuaternionToMatrix: 16 posições m0..m15 (FV ou número)."""
    x, y, z, w = q
    a2, b2, c2 = x * x, y * y, z * z
    ac, ab, bc = x * z, x * y, y * z
    ad, bd, cd = w * x, w * y, w * z
    return (1 - 2 * (b2 + c2), 2 * (ab + cd), 2 * (ac - bd), 0.0,
            2 * (ab - cd), 1 - 2 * (a2 + c2), 2 * (bc + ad), 0.0,
            2 * (ac + bd), 2 * (bc - ad), 1 - 2 * (a2 + b2), 0.0,
            0.0, 0.0, 0.0, 1.0)


def scale_matrix(s):
    return (s[0], 0.0, 0.0, 0.0, 0.0, s[1], 0.0, 0.0, 0.0, 0.0, s[2], 0.0, 0.0, 0.0, 0.0, 1.0)


def translate_matrix(t):
    return (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, t[0], t[1], t[2], 1.0)


def _accumulate(total, a, b, count):
    """total + a*b, na ordem do C, com atalhos exatos para os 0 e 1 constantes das matrizes.

    Um termo 0*x não precisa de arredondamento: dá o zero com o sinal de x (ou nan, se x for
    infinito ou nan), e somar esse zero não muda total (a não ser o sinal de um zero). Um termo
    1*x é x. O resultado é o mesmo da conta inteira do C, bit a bit.
    """
    fa, fb = a.__class__ is FV, b.__class__ is FV
    if not fa and not fb:
        term = f32(f32(a) * f32(b))
        if total is None:
            return term
        if total.__class__ is FV:
            return total + term
        return f32(total + term)
    x, c = (b, a) if fb and not fa else (a, b) if fa and not fb else (None, None)
    if x is not None and c == 0.0:
        c = f32(c)
        if total is None:
            return FV(array('f', [c * v for v in x.a]))
        return FV(array('f', [t + c * v for t, v in zip(items(total, count), x.a)]))
    if x is not None and c == 1.0:
        term = x
    else:
        term = a * b if fa else b.__rmul__(a)
    if total is None:
        return term
    return total + term if total.__class__ is FV else term.__radd__(total)


def matrix_multiply(l, r, count):
    """MatrixMultiply(left, right), na ordem de soma do C."""
    out = []
    for i in (0, 4, 8, 12):
        for j in range(4):
            total = None
            for k in range(4):
                total = _accumulate(total, l[i + k], r[4 * k + j], count)
            out.append(vec(total, count))
    return tuple(out)


def trs_matrix(t, r, s, count):
    """MatrixMultiply(MatrixMultiply(MatrixScale(s), QuaternionToMatrix(r)), MatrixTranslate(t))."""
    return matrix_multiply(matrix_multiply(scale_matrix(s), quaternion_to_matrix(r), count),
                           translate_matrix(t), count)


def matrix_invert(m, count):
    m = tuple(vec(c, count) for c in m)
    a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33 = m
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
    inv = 1.0 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
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


def quaternion_multiply(a, b):
    qax, qay, qaz, qaw = a
    qbx, qby, qbz, qbw = b
    return (qax * qbw + qaw * qbx + qay * qbz - qaz * qby,
            qay * qbw + qaw * qby + qaz * qbx - qax * qbz,
            qaz * qbw + qaw * qbz + qax * qby - qay * qbx,
            qaw * qbw - qax * qbx - qay * qby - qaz * qbz)


def vector3_rotate_by_quaternion(v, q):
    x, y, z = v
    qx, qy, qz, qw = q
    return (x * (qx * qx + qw * qw - qy * qy - qz * qz) + y * (2 * qx * qy - 2 * qw * qz)
            + z * (2 * qx * qz + 2 * qw * qy),
            x * (2 * qw * qz + 2 * qx * qy) + y * (qw * qw - qx * qx + qy * qy - qz * qz)
            + z * (-2 * qw * qx + 2 * qy * qz),
            x * (-2 * qw * qy + 2 * qx * qz) + y * (2 * qw * qx + 2 * qy * qz)
            + z * (qw * qw - qx * qx - qy * qy + qz * qz))


def _normalize4(q, count):
    """QuaternionNormalize: comprimento zero vira 1."""
    length = sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3])
    length = choose([v == 0.0 for v in length.a], 1.0, length, count)
    inverse = 1.0 / length
    return tuple(c * inverse for c in q)


def quaternion_slerp(a, b, t, count):
    """QuaternionSlerp com os quatro caminhos do C escolhidos elemento a elemento."""
    a = tuple(vec(c, count) for c in a)
    b = tuple(vec(c, count) for c in b)
    t = vec(t, count)
    cos_half = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
    flip = less(cos_half, 0, count)
    b = tuple(choose(flip, -c, c, count) for c in b)
    cos_half = choose(flip, -cos_half, cos_half, count)
    same = [abs(v) >= 1.0 for v in cos_half.a]
    near = greater(cos_half, 0.95, count)
    # QuaternionNlerp
    nlerp = _normalize4(tuple(a[i] + t * (b[i] - a[i]) for i in range(4)), count)
    half = acos(cos_half)
    sin_half = sqrt(1.0 - cos_half * cos_half)
    tiny = [abs(v) < _EPSILON for v in sin_half.a]
    average = tuple(a[i] * 0.5 + b[i] * 0.5 for i in range(4))
    ratio_a = sin((1 - t) * half) / sin_half
    ratio_b = sin(t * half) / sin_half
    spherical = tuple(a[i] * ratio_a + b[i] * ratio_b for i in range(4))
    out = []
    for i in range(4):
        far = choose(tiny, average[i], spherical[i], count)
        out.append(choose(same, a[i], choose(near, nlerp[i], far, count), count))
    return tuple(out)


def _quaternion_from_matrix(m, count):
    """QuaternionFromMatrix: o maior dos quatro decide o caminho (elemento a elemento)."""
    m0, m1, m2, m4, m5, m6, m8, m9, m10 = m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]
    w4 = m0 + m5 + m10
    x4 = m0 - m5 - m10
    y4 = m5 - m0 - m10
    z4 = m10 - m0 - m5
    biggest = [0] * count
    value = list(w4.a)
    for index, candidate in ((1, x4), (2, y4), (3, z4)):
        for e, c in enumerate(candidate.a):
            if c > value[e]:
                value[e] = c
                biggest[e] = index
    big = sqrt(FV(array('f', value)) + 1.0) * 0.5
    mult = 0.25 / big
    a = (m6 - m9) * mult
    b = (m8 - m2) * mult
    c = (m1 - m4) * mult
    d = (m1 + m4) * mult
    e = (m8 + m2) * mult
    f = (m6 + m9) * mult
    # (x, y, z, w) de cada caminho do switch do C.
    paths = ((a, b, c, big), (big, d, e, a), (d, big, f, b), (e, f, big, c))
    return tuple(FV(array('f', [paths[k][axis].a[i] for i, k in enumerate(biggest)]))
                 for axis in range(4))


def matrix_decompose(m, count):
    """MatrixDecompose: (translação, rotação, escala), cada componente um FV."""
    m = tuple(vec(c, count) for c in m)
    eps = f32(1e-9)
    translation = (m[12], m[13], m[14])
    columns = [(m[0], m[4], m[8]), (m[1], m[5], m[9]), (m[2], m[6], m[10])]
    stabilizer = FV.full(eps, count)
    for column in columns:
        for value in column:
            stabilizer = fmax(stabilizer, fabs(value), count)

    def scaled(v, k):
        return (v[0] * k, v[1] * k, v[2] * k)

    def dot(p, q):
        return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]

    def sub(p, q):
        return (p[0] - q[0], p[1] - q[1], p[2] - q[2])

    def length(v):
        return sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])

    def keep(mask, a, b):
        return tuple(choose(mask, a[i], b[i], count) for i in range(3))

    inverse = 1.0 / stabilizer
    columns = [scaled(column, inverse) for column in columns]
    sx = length(columns[0])
    columns[0] = keep(greater(sx, eps, count), scaled(columns[0], 1.0 / sx), columns[0])
    columns[1] = sub(columns[1], scaled(columns[0], dot(columns[0], columns[1])))
    sy = length(columns[1])
    columns[1] = keep(greater(sy, eps, count), scaled(columns[1], 1.0 / sy), columns[1])
    columns[2] = sub(columns[2], scaled(columns[0], dot(columns[0], columns[2])))
    columns[2] = sub(columns[2], scaled(columns[1], dot(columns[1], columns[2])))
    sz = length(columns[2])
    columns[2] = keep(greater(sz, eps, count), scaled(columns[2], 1.0 / sz), columns[2])
    c0, c1, c2 = columns
    # Vector3CrossProduct(c1, c2) e o produto escalar com c0.
    cross = (c1[1] * c2[2] - c1[2] * c2[1], c1[2] * c2[0] - c1[0] * c2[2],
             c1[0] * c2[1] - c1[1] * c2[0])
    flip = less(dot(c0, cross), 0, count)
    scale = (sx, sy, sz)
    scale = keep(flip, (-sx, -sy, -sz), scale)
    columns = [keep(flip, (-c[0], -c[1], -c[2]), c) for c in columns]
    scale = scaled(scale, stabilizer)
    c0, c1, c2 = columns
    # A matriz de rotação do C é escrita por posição: m0, m4, m8, m12, m1, m5...
    fields = (c0[0], c1[0], c2[0], 0.0, c0[1], c1[1], c2[1], 0.0,
              c0[2], c1[2], c2[2], 0.0, 0.0, 0.0, 0.0, 1.0)
    return translation, _quaternion_from_matrix(fields, count), scale
