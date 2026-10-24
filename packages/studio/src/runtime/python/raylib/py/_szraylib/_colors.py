"""Funções de cor do raylib (rtextures.c), com as mesmas contas e arredondamentos."""
import math

from ._args import color, integer, number, unpack_color, vec4
from ._structs import Color, Vector3, Vector4, f32


def _c(value, function, param='color'):
    return unpack_color(color(value, function, param))


def _clamp01(value):
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else value


def fade(color_, alpha, /):
    c = _c(color_, 'fade')
    c.a = int(255.0 * _clamp01(f32(number(alpha, 'fade', 'alpha'))))
    return c


def color_alpha(color_, alpha, /):
    c = _c(color_, 'color_alpha')
    c.a = int(255.0 * _clamp01(f32(number(alpha, 'color_alpha', 'alpha'))))
    return c


def color_from_hsv(hue, saturation, value, /):
    f = 'color_from_hsv'
    h, s, v = number(hue, f, 'hue'), number(saturation, f, 'saturation'), number(value, f, 'value')
    channels = []
    for offset in (5.0, 3.0, 1.0):
        k = math.fmod(offset + h / 60.0, 6)
        t = 4.0 - k
        k = t if t < k else k
        k = k if k < 1 else 1
        k = k if k > 0 else 0
        channels.append(int((v - v * s * k) * 255.0) & 255)
    return Color(channels[0], channels[1], channels[2], 255)


def color_to_hsv(color_, /):
    c = _c(color_, 'color_to_hsv')
    r, g, b = c.r / 255.0, c.g / 255.0, c.b / 255.0
    low, high = min(r, g, b), max(r, g, b)
    delta = high - low
    if delta < 0.00001:
        return Vector3(0.0, 0.0, high)
    if high <= 0.0:
        return Vector3(math.nan, 0.0, high)
    if r >= high:
        hue = (g - b) / delta
    elif g >= high:
        hue = 2.0 + (b - r) / delta
    else:
        hue = 4.0 + (r - g) / delta
    hue *= 60.0
    if hue < 0.0:
        hue += 360.0
    return Vector3(hue, delta / high, high)


def color_brightness(color_, factor, /):
    c = _c(color_, 'color_brightness')
    k = max(-1.0, min(1.0, number(factor, 'color_brightness', 'factor')))
    channels = [float(c.r), float(c.g), float(c.b)]
    if k < 0.0:
        channels = [value * (1.0 + k) for value in channels]
    else:
        channels = [(255 - value) * k + value for value in channels]
    return Color(int(channels[0]), int(channels[1]), int(channels[2]), c.a)


def color_tint(color_, tint, /):
    c = _c(color_, 'color_tint')
    t = _c(tint, 'color_tint', 'tint')
    return Color(c.r * t.r // 255, c.g * t.g // 255, c.b * t.b // 255, c.a * t.a // 255)


def color_contrast(color_, contrast, /):
    c = _c(color_, 'color_contrast')
    k = max(-1.0, min(1.0, number(contrast, 'color_contrast', 'contrast')))
    k = (1.0 + k) ** 2

    def apply(value):
        result = ((value / 255.0 - 0.5) * k + 0.5) * 255.0
        return int(max(0.0, min(255.0, result)))

    return Color(apply(c.r), apply(c.g), apply(c.b), c.a)


def color_lerp(color1, color2, factor, /):
    a = _c(color1, 'color_lerp', 'color1')
    b = _c(color2, 'color_lerp', 'color2')
    t = _clamp01(number(factor, 'color_lerp', 'factor'))
    return Color(int((1.0 - t) * a.r + t * b.r), int((1.0 - t) * a.g + t * b.g),
                 int((1.0 - t) * a.b + t * b.b), int((1.0 - t) * a.a + t * b.a))


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
    value = integer(hexValue, 'get_color', 'hexValue') & 0xFFFFFFFF
    return unpack_color(value)


def color_normalize(color_, /):
    c = _c(color_, 'color_normalize')
    return Vector4(c.r / 255.0, c.g / 255.0, c.b / 255.0, c.a / 255.0)


def color_from_normalized(normalized, /):
    x, y, z, w = vec4(normalized, 'color_from_normalized', 'normalized')
    return Color(int(x * 255.0) & 255, int(y * 255.0) & 255, int(z * 255.0) & 255,
                 int(w * 255.0) & 255)

