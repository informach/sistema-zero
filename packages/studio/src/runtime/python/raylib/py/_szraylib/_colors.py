"""Funções de cor do raylib (rtextures.c), com as mesmas contas e arredondamentos.

As contas são em float, operação por operação, como no C (ver _float32.py): em double, uma
cor saía 102 onde o raylib dá 101.
"""
import math

from ._args import color, integer, number, unpack_color, vec4
from ._float32 import fadd as _add, fdiv as _div, fmul as _mul, fsub as _sub
from ._structs import Color, Vector3, Vector4, f32


def _c(value, function, param='color'):
    return unpack_color(color(value, function, param))


def _clamp01(value):
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else value


def fade(color_, alpha, /):
    c = _c(color_, 'fade')
    c.a = int(_mul(255.0, _clamp01(f32(number(alpha, 'fade', 'alpha')))))
    return c


def color_alpha(color_, alpha, /):
    c = _c(color_, 'color_alpha')
    c.a = int(_mul(255.0, _clamp01(f32(number(alpha, 'color_alpha', 'alpha')))))
    return c


def color_from_hsv(hue, saturation, value, /):
    f = 'color_from_hsv'
    h = f32(number(hue, f, 'hue'))
    s = f32(number(saturation, f, 'saturation'))
    v = f32(number(value, f, 'value'))
    channels = []
    for offset in (5.0, 3.0, 1.0):
        k = math.fmod(_add(offset, _div(h, 60.0)), 6)
        t = _sub(4.0, k)
        k = t if t < k else k
        k = k if k < 1 else 1
        k = k if k > 0 else 0
        channels.append(int(_mul(_sub(v, _mul(_mul(v, s), k)), 255.0)) & 255)
    return Color(channels[0], channels[1], channels[2], 255)


_HSV_EPSILON = f32(0.00001)


def color_to_hsv(color_, /):
    c = _c(color_, 'color_to_hsv')
    r, g, b = _div(c.r, 255.0), _div(c.g, 255.0), _div(c.b, 255.0)
    low, high = min(r, g, b), max(r, g, b)
    delta = _sub(high, low)
    if delta < _HSV_EPSILON:
        return Vector3(0.0, 0.0, high)
    if high <= 0.0:
        return Vector3(math.nan, 0.0, high)
    if r >= high:
        hue = _div(_sub(g, b), delta)
    elif g >= high:
        hue = _add(2.0, _div(_sub(b, r), delta))
    else:
        hue = _add(4.0, _div(_sub(r, g), delta))
    hue = _mul(hue, 60.0)
    if hue < 0.0:
        hue = _add(hue, 360.0)
    return Vector3(hue, _div(delta, high), high)


def color_brightness(color_, factor, /):
    c = _c(color_, 'color_brightness')
    k = max(-1.0, min(1.0, f32(number(factor, 'color_brightness', 'factor'))))
    channels = [float(c.r), float(c.g), float(c.b)]
    if k < 0.0:
        k = _add(1.0, k)
        channels = [_mul(value, k) for value in channels]
    else:
        channels = [_add(_mul(_sub(255.0, value), k), value) for value in channels]
    return Color(int(channels[0]), int(channels[1]), int(channels[2]), c.a)


def color_tint(color_, tint, /):
    c = _c(color_, 'color_tint')
    t = _c(tint, 'color_tint', 'tint')
    return Color(c.r * t.r // 255, c.g * t.g // 255, c.b * t.b // 255, c.a * t.a // 255)


def color_contrast(color_, contrast, /):
    c = _c(color_, 'color_contrast')
    k = max(-1.0, min(1.0, f32(number(contrast, 'color_contrast', 'contrast'))))
    k = _add(1.0, k)
    k = _mul(k, k)

    def apply(value):
        result = _mul(_add(_mul(_sub(_div(value, 255.0), 0.5), k), 0.5), 255.0)
        return int(max(0.0, min(255.0, result)))

    return Color(apply(c.r), apply(c.g), apply(c.b), c.a)


def color_lerp(color1, color2, factor, /):
    a = _c(color1, 'color_lerp', 'color1')
    b = _c(color2, 'color_lerp', 'color2')
    t = _clamp01(f32(number(factor, 'color_lerp', 'factor')))
    u = _sub(1.0, t)

    def mix(first, second):
        return int(_add(_mul(u, first), _mul(t, second)))

    return Color(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b), mix(a.a, b.a))


def color_alpha_blend(dst, src, tint, /):
    d = _c(dst, 'color_alpha_blend', 'dst')
    s = _c(src, 'color_alpha_blend', 'src')
    t = _c(tint, 'color_alpha_blend', 'tint')
    s = Color((s.r * (t.r + 1)) >> 8, (s.g * (t.g + 1)) >> 8, (s.b * (t.b + 1)) >> 8,
              (s.a * (t.a + 1)) >> 8)
    if s.a == 0:
        return d
    if s.a == 255:
        return s
    alpha = s.a + 1
    out_a = (alpha * 256 + d.a * (256 - alpha)) >> 8
    if out_a <= 0:
        return Color(255, 255, 255, 0)
    blend = lambda sc, dc: (((sc * alpha * 256 + dc * d.a * (256 - alpha)) // out_a) >> 8) & 255  # noqa: E731
    return Color(blend(s.r, d.r), blend(s.g, d.g), blend(s.b, d.b), out_a & 255)


def color_is_equal(col1, col2, /):
    a = _c(col1, 'color_is_equal', 'col1')
    b = _c(col2, 'color_is_equal', 'col2')
    return (a.r, a.g, a.b, a.a) == (b.r, b.g, b.b, b.a)


def color_to_int(color_, /):
    packed = color(color_, 'color_to_int')
    return packed - (1 << 32) if packed >= 1 << 31 else packed


def get_color(hexValue, /):
    value = integer(hexValue, 'get_color', 'hexValue')
    # unsigned int no C: o pyray do computador recusa negativo (e color_to_int devolve
    # negativo para as cores com muito vermelho, então os dois não se desfazem).
    if value < 0 or value > 0xFFFFFFFF:
        raise OverflowError(f'get_color: o número da cor vai de 0 a 0xFFFFFFFF (por exemplo '
                            f'0xFF0000FF é vermelho), e recebeu {value}.')
    return unpack_color(value)


def color_normalize(color_, /):
    c = _c(color_, 'color_normalize')
    return Vector4(c.r / 255.0, c.g / 255.0, c.b / 255.0, c.a / 255.0)


def color_from_normalized(normalized, /):
    x, y, z, w = vec4(normalized, 'color_from_normalized', 'normalized')
    return Color(int(_mul(x, 255.0)) & 255, int(_mul(y, 255.0)) & 255,
                 int(_mul(z, 255.0)) & 255, int(_mul(w, 255.0)) & 255)

