"""As contas em float (32 bits) do C do raylib, operação por operação.

O raylib faz quase toda conta em ``float`` e arredonda depois de CADA operação. Fazer a conta
em double e arredondar só no fim pode cair do outro lado (uma cor 101 em vez de 102, o último
dígito de uma matriz). Aqui cada operação é feita em double e arredondada para float logo em
seguida, o que dá exatamente o resultado da operação em float: com 53 bits de double, somar,
subtrair, multiplicar, dividir e tirar a raiz em double e arredondar para float nunca erra o
arredondamento (vale para formatos com pelo menos 2·24 + 2 bits).

``F`` é um float que arredonda sozinho depois de cada operação, para escrever a conta como no C:
``F(x) * F(y) + 1.0`` faz duas operações em float. Um operando ``float`` comum vira float do C
antes de entrar na conta, como um literal ``1.0f``.
"""
import math
from array import array

_BOX = array('f', [0.0])
_INF = math.inf


def f32(value):
    """O número como o C guarda num float."""
    try:
        _BOX[0] = value
    except OverflowError:
        return _INF if value > 0 else -_INF
    return _BOX[0]


def _quotient(a, b):
    """Divisão IEEE: por zero dá infinito com o sinal certo, e 0/0 dá nan."""
    try:
        return a / b
    except ZeroDivisionError:
        if a != a or a == 0:
            return math.nan
        negative = (math.copysign(1.0, a) < 0) != (math.copysign(1.0, b) < 0)
        return -_INF if negative else _INF


_new = float.__new__
_add = float.__add__
_sub = float.__sub__
_mul = float.__mul__


def _keep(value):
    """Arredonda um resultado em double para float e devolve um F (o caminho rápido das contas)."""
    try:
        _BOX[0] = value
    except OverflowError:
        return _new(F, _INF if value > 0 else -_INF)
    return _new(F, _BOX[0])


class F(float):
    """Um float do C: cada operação com ele é arredondada para float."""
    __slots__ = ()

    def __new__(cls, value=0.0):
        return _new(cls, f32(value))

    # O outro operando vira float do C (um literal 1.0 é 1.0f); um F já é.
    def __add__(self, other):
        return _keep(_add(self, other if other.__class__ is F else f32(other)))

    def __radd__(self, other):
        return _keep(_add(f32(other), self))

    def __sub__(self, other):
        return _keep(_sub(self, other if other.__class__ is F else f32(other)))

    def __rsub__(self, other):
        return _keep(_sub(f32(other), self))

    def __mul__(self, other):
        return _keep(_mul(self, other if other.__class__ is F else f32(other)))

    def __rmul__(self, other):
        return _keep(_mul(f32(other), self))

    def __truediv__(self, other):
        return _keep(_quotient(float(self), f32(other)))

    def __rtruediv__(self, other):
        return _keep(_quotient(f32(other), float(self)))

    def __neg__(self):
        return _new(F, -float(self))

    def __pos__(self):
        return self

    def __abs__(self):
        return _new(F, abs(float(self)))


def exact(values):
    """Os valores (já em float do C) como F, sem arredondar de novo."""
    return tuple(_new(F, value) for value in values)


def rounded(values):
    """Arredonda vários resultados em double para float de uma vez (array('f') faz isso em C)."""
    return array('f', values)


def fadd(a, b):
    return f32(f32(a) + f32(b))


def fsub(a, b):
    return f32(f32(a) - f32(b))


def fmul(a, b):
    return f32(f32(a) * f32(b))


def fdiv(a, b):
    return f32(_quotient(f32(a), f32(b)))


# As funções da math.h em float (sqrtf, sinf...). A raiz é exata; as trigonométricas são as do
# double arredondadas, que é o que a biblioteca do C devolve fora de casos raríssimos.
def sqrtf(x):
    x = float(x)
    if x < 0 or x != x:
        return F(math.nan)
    return F(math.sqrt(x))


def _wrap(function):
    def call(x):
        try:
            return F(function(float(x)))
        except (ValueError, OverflowError):
            return F(math.nan)
    return call


sinf = _wrap(math.sin)
cosf = _wrap(math.cos)
tanf = _wrap(math.tan)
asinf = _wrap(math.asin)
acosf = _wrap(math.acos)
atanf = _wrap(math.atan)
expf = _wrap(math.exp)
logf = _wrap(math.log)


def atan2f(y, x):
    return F(math.atan2(float(y), float(x)))


def powf(x, y):
    try:
        return F(math.pow(float(x), float(y)))
    except (ValueError, OverflowError):
        return F(math.nan)


def hypotf(x, y):
    return F(math.hypot(float(x), float(y)))


def fabsf(x):
    return F(abs(float(x)))


def floorf(x):
    x = float(x)
    if x != x or x in (_INF, -_INF):
        return F(x)
    return F(math.floor(x))


def fminf(a, b):
    """fminf do C: um nan é ignorado (devolve o outro)."""
    a, b = float(a), float(b)
    if a != a:
        return F(b)
    if b != b:
        return F(a)
    return F(a if a < b else b)


def fmaxf(a, b):
    a, b = float(a), float(b)
    if a != a:
        return F(b)
    if b != b:
        return F(a)
    return F(a if a > b else b)


def fmodf(a, b):
    try:
        return F(math.fmod(float(a), float(b)))
    except ValueError:
        return F(math.nan)


def c_int(value):
    """``(int)x`` do C no x86: trunca; nan ou fora do int32 dá -2147483648."""
    value = float(value)
    if value != value or not -2147483649.0 < value < 2147483648.0:
        return -2147483648
    return int(value)


def c_uchar(value):
    """``(unsigned char)(int)x``: o int truncado e os 8 bits de baixo."""
    return c_int(value) & 255


# PI e DEG2RAD do raymath são float: 3.14159265358979323846f e PI/180.0f.
PI = F(3.14159265358979323846)
DEG2RAD = PI / 180.0
RAD2DEG = 180.0 / PI
