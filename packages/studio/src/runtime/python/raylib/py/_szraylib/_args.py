"""Conferência dos argumentos, com as regras do cffi e mensagens em português.

O pyray do computador recusa, por exemplo, ``draw_circle(10.5, 20, 5, RED)``: o centro é ``int``
no C. Recusar aqui também garante que o jogo feito no Estúdio roda igual no computador.
"""
from ._structs import Color, Rectangle, Struct, Vector2, Vector3, Vector4, f32

_COLOR_CACHE = {}
_warned_colors = set()


def _where(function, param):
    return f'{function}: o parâmetro {param}' if param else function


def integer(value, function, param=''):
    if type(value) is int:
        return value
    if type(value) is bool or isinstance(value, int):
        return int(value)
    raise TypeError(
        f'{_where(function, param)} precisa de um número inteiro (int), mas recebeu '
        f'{type(value).__name__} ({value!r:.40}). Use int(...) para arredondar.')


def unsigned(value, function, param=''):
    value = integer(value, function, param)
    if value < 0:
        raise OverflowError(f'{_where(function, param)} não aceita número negativo ({value}).')
    return value


def number(value, function, param=''):
    if type(value) is float or type(value) is int:
        return value
    if isinstance(value, (int, float)):
        return float(value)
    raise TypeError(
        f'{_where(function, param)} precisa de um número, mas recebeu '
        f'{type(value).__name__} ({value!r:.40}).')


def boolean(value, function, param=''):
    if type(value) is bool:
        return value
    return bool(integer(value, function, param))


def text(value, function, param=''):
    if type(value) is str:
        return value
    if isinstance(value, bytes):
        return value.decode('utf-8', 'replace')
    if isinstance(value, str):
        return str(value)
    raise TypeError(
        f'{_where(function, param)} precisa de um texto, mas recebeu {type(value).__name__}. '
        f'Use str(...) ou um f-string, como f"Pontos: {{pontos}}".')


def _sequence(value, size, kind, function, param):
    n = len(value)
    if n > size:
        raise ValueError(f'{_where(function, param)}: um {kind} tem {size} números, '
                         f'mas recebeu {n}.')
    items = [number(item, function, param) for item in value]
    while len(items) < size:
        items.append(0.0)
    return items


def _wrong(value, kind, size, function, param):
    if isinstance(value, Struct):
        return TypeError(f'{_where(function, param)} precisa de um {kind}, mas recebeu um '
                         f'{type(value).__name__}.')
    return TypeError(f'{_where(function, param)} precisa de um {kind} (ou de uma tupla com '
                     f'{size} números), mas recebeu {type(value).__name__}.')


def vec2(value, function, param=''):
    if type(value) is Vector2:
        return value.x, value.y
    if type(value) is tuple or type(value) is list:
        x, y = _sequence(value, 2, 'Vector2', function, param)
        return x, y
    if type(value) is dict:
        return number(value.get('x', 0.0), function, param), number(value.get('y', 0.0), function, param)
    raise _wrong(value, 'Vector2', 2, function, param)


def vec3(value, function, param=''):
    if type(value) is Vector3:
        return value.x, value.y, value.z
    if type(value) is tuple or type(value) is list:
        x, y, z = _sequence(value, 3, 'Vector3', function, param)
        return x, y, z
    if type(value) is dict:
        return (number(value.get('x', 0.0), function, param), number(value.get('y', 0.0), function, param),
                number(value.get('z', 0.0), function, param))
    raise _wrong(value, 'Vector3', 3, function, param)


def vec4(value, function, param=''):
    if type(value) is Vector4:
        return value.x, value.y, value.z, value.w
    if type(value) is tuple or type(value) is list:
        return tuple(_sequence(value, 4, 'Vector4', function, param))
    raise _wrong(value, 'Vector4', 4, function, param)


def rect(value, function, param=''):
    if type(value) is Rectangle:
        return value.x, value.y, value.width, value.height
    if type(value) is tuple or type(value) is list:
        x, y, w, h = _sequence(value, 4, 'Rectangle', function, param)
        return x, y, w, h
    if type(value) is dict:
        return tuple(number(value.get(k, 0.0), function, param) for k in ('x', 'y', 'width', 'height'))
    raise _wrong(value, 'Rectangle', 4, function, param)


def _channel(value, function, param):
    if type(value) is not int:
        if type(value) is bool or isinstance(value, int):
            value = int(value)
        else:
            raise TypeError(f'{_where(function, param)}: cada número da cor precisa ser inteiro de '
                            f'0 a 255, mas recebeu {type(value).__name__} ({value!r:.40}).')
    if value < 0 or value > 255:
        raise OverflowError(f'{_where(function, param)}: cada número da cor vai de 0 a 255, e '
                            f'recebeu {value}.')
    return value


def color(value, function, param='color'):
    """A cor empacotada num inteiro 0xRRGGBBAA (é assim que ela viaja na lista de desenho)."""
    if type(value) is tuple:
        packed = _COLOR_CACHE.get(value)
        if packed is not None:
            return packed
    if type(value) is Color:
        return (value.r << 24) | (value.g << 16) | (value.b << 8) | value.a
    if type(value) is tuple or type(value) is list:
        if len(value) > 4:
            raise ValueError(f'{_where(function, param)}: uma cor tem 4 números (r, g, b, a), '
                             f'mas recebeu {len(value)}.')
        channels = [_channel(item, function, param) for item in value]
        if len(channels) < 4:
            # Igual ao C: o que falta vira 0, e alfa 0 é invisível. Avisamos uma vez.
            key = (function, len(channels))
            if key not in _warned_colors and len(_warned_colors) < 64:
                _warned_colors.add(key)
                print(f'Aviso: {function} recebeu uma cor com {len(channels)} números. Faltou o '
                      f'alfa (a opacidade): sem ele a cor fica invisível. Use (r, g, b, 255).')
            channels += [0] * (4 - len(channels))
        r, g, b, a = channels
        packed = (r << 24) | (g << 16) | (b << 8) | a
        if type(value) is tuple and len(_COLOR_CACHE) < 4096:
            _COLOR_CACHE[value] = packed
        return packed
    if type(value) is dict:
        r, g, b, a = (_channel(value.get(k, 0), function, param) for k in 'rgba')
        return (r << 24) | (g << 16) | (b << 8) | a
    raise _wrong(value, 'Color', 4, function, param)


def unpack_color(packed):
    return Color((packed >> 24) & 255, (packed >> 16) & 255, (packed >> 8) & 255, packed & 255)


def struct(value, cls, function, param=''):
    """Struct passado inteiro (Texture, Font, Camera2D...): aceita o struct ou uma tupla."""
    if type(value) is cls:
        return value
    if type(value) is tuple or type(value) is list or type(value) is dict:
        result = cls()
        result._assign(value)
        return result
    raise TypeError(f'{_where(function, param)} precisa de um {cls._name}, mas recebeu '
                    f'{type(value).__name__}.')


__all__ = ['integer', 'unsigned', 'number', 'boolean', 'text', 'vec2', 'vec3', 'vec4', 'rect',
           'color', 'unpack_color', 'struct', 'f32']
