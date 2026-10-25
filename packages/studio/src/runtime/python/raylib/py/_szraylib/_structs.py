"""Structs do raylib com a mesma semântica do pyray (raylib-python-cffi).

O que o cffi faz e nós repetimos, porque muda o resultado de um jogo:

* os campos float guardam float32 (``Vector2(0.1, 0).x`` vale 0.10000000149011612);
* atribuir um struct a um campo COPIA (``camera.target = pos`` não liga os dois);
* ler um campo struct devolve uma vista VIVA (``camera.target.x = 5`` muda a câmera);
* campo inteiro recusa número com vírgula, cor recusa valor fora de 0..255;
* o construtor só aceita argumentos na ordem (sem ``x=``) e completa o resto com zero;
* struct não se compara por valor, não se percorre e não tem índice.

As mensagens de erro são em português; o tipo da exceção é o do cffi.
"""
from array import array
import math

from ._names import STRUCT_ALIASES, STRUCT_FIELDS

_set = object.__setattr__
_F = array('f', [0.0, 0.0, 0.0, 0.0])
_INF = math.inf

STRUCTS = {}


def _number_error(struct, field, value):
    return TypeError(
        f'{struct}.{field} precisa de um número, mas recebeu {type(value).__name__} ({value!r:.40}).')


def f32(value, struct='valor', field='número'):
    """Arredonda para float32, como o C guarda; recusa o que não é número."""
    try:
        _F[0] = value
    except TypeError:
        raise _number_error(struct, field, value) from None
    except OverflowError:
        return _INF if value > 0 else -_INF
    return _F[0]


def _int_value(value, struct, field, low, high):
    if type(value) is not int:
        if type(value) is bool or isinstance(value, int):
            value = int(value)
        else:
            raise TypeError(
                f'{struct}.{field} precisa de um número inteiro (int), mas recebeu '
                f'{type(value).__name__} ({value!r:.40}). Use int(...) para arredondar.')
    if value < low or value > high:
        if value < 0 and low == 0:
            raise OverflowError(
                f'{struct}.{field} não aceita número negativo ({value}).')
        raise OverflowError(f'{struct}.{field} vai de {low} a {high}, e recebeu {value}.')
    return value


def _converter(struct, field, kind):
    if kind == 'float':
        return lambda value: f32(value, struct, field)
    if kind == 'int':
        return lambda value: _int_value(value, struct, field, -2147483648, 2147483647)
    if kind == 'uint':
        return lambda value: _int_value(value, struct, field, 0, 4294967295)
    if kind == 'uchar':
        return lambda value: _int_value(value, struct, field, 0, 255)
    if kind == 'bool':
        return lambda value: bool(_int_value(value, struct, field, -2147483648, 2147483647))
    # Ponteiros e vetores do C ficam como objetos do motor: o jogo não os monta à mão.
    return lambda value: value


def _zero(kind):
    if kind == 'float':
        return 0.0
    if kind in ('int', 'uint', 'uchar', 'char'):
        return 0
    if kind == 'bool':
        return False
    return None


class Struct:
    """Base de todo struct do raylib no Estúdio."""
    __slots__ = ()
    _name = 'Struct'
    _fields = ()
    _kinds = {}
    _conv = {}
    _nested = {}

    def __init__(self, *args):
        fields = self._fields
        if len(args) > len(fields):
            raise ValueError(
                f'{self._name} tem {len(fields)} campos ({", ".join(fields)}), '
                f'mas recebeu {len(args)} valores.')
        nested = self._nested
        for index, field in enumerate(fields):
            kind = nested.get(field)
            if kind is not None:
                child = STRUCTS[kind]()
                _set(self, field, child)
                if index < len(args):
                    child._assign(args[index])
            elif index < len(args):
                _set(self, field, self._conv[field](args[index]))
            else:
                _set(self, field, _zero(self._kinds[field]))

    def __setattr__(self, name, value):
        conv = self._conv.get(name)
        if conv is None:
            raise AttributeError(f'{self._name} não tem o campo {name!r}. Os campos são: '
                                 f'{", ".join(self._fields)}.')
        if name in self._nested:
            getattr(self, name)._assign(value)
        else:
            _set(self, name, conv(value))

    def _assign(self, value):
        """Copia um valor para dentro deste struct (o que o C faz numa atribuição)."""
        if type(value) is type(self):
            for field in self._fields:
                if field in self._nested:
                    getattr(self, field)._assign(getattr(value, field))
                else:
                    _set(self, field, getattr(value, field))
            return
        if type(value) is tuple or type(value) is list:
            if len(value) > len(self._fields):
                raise ValueError(f'{self._name} tem {len(self._fields)} campos, mas recebeu '
                                 f'{len(value)} valores.')
            for index, field in enumerate(self._fields):
                if index < len(value):
                    self.__setattr__(field, value[index])
                elif field in self._nested:
                    getattr(self, field)._assign(())
                else:
                    _set(self, field, _zero(self._kinds[field]))
            return
        if type(value) is dict:
            for field in self._fields:
                if field in value:
                    self.__setattr__(field, value[field])
                elif field in self._nested:
                    getattr(self, field)._assign(())
                else:
                    _set(self, field, _zero(self._kinds[field]))
            for key in value:
                if key not in self._conv:
                    raise AttributeError(f'{self._name} não tem o campo {key!r}.')
            return
        raise TypeError(
            f'Esperava um {self._name} (ou uma tupla com {len(self._fields)} números), '
            f'mas recebeu {type(value).__name__}.')

    def __repr__(self):
        parts = []
        for field in self._fields:
            value = getattr(self, field)
            if isinstance(value, float):
                value = round(value, 6)
            parts.append(f'{field}={value!r}')
        return f'{self._name}({", ".join(parts)})'

    def __iter__(self):
        raise TypeError(f'Um {self._name} não se percorre nem se desempacota: leia os campos '
                        f'({", ".join(self._fields)}).')

    def __getitem__(self, index):
        raise TypeError(f'Um {self._name} não tem índice: leia os campos '
                        f'({", ".join(self._fields)}).')

    def __reduce__(self):
        return (type(self), tuple(getattr(self, field) for field in self._fields))


def _make(name, fields):
    names = tuple(field for field, _ in fields)
    kinds = {field: kind for field, kind in fields}
    attrs = {
        '__slots__': names,
        '_name': name,
        '_fields': names,
        '_kinds': kinds,
        '_conv': {field: _converter(name, field, kind) for field, kind in fields},
        '_nested': {field: kind[7:] for field, kind in fields if kind.startswith('struct:')},
    }
    return type(name, (Struct,), attrs)


# Os mais usados ganham construtor e atribuição sem laço: um jogo cria milhares por quadro.

class Vector2(Struct):
    __slots__ = ('x', 'y')
    _name = 'Vector2'
    _fields = ('x', 'y')
    _kinds = {'x': 'float', 'y': 'float'}
    _nested = {}

    def __init__(self, x=0.0, y=0.0, /, *extra):
        if extra:
            raise ValueError(f'Vector2 tem 2 campos (x, y), mas recebeu {2 + len(extra)} valores.')
        try:
            _F[0] = x
            _F[1] = y
        except TypeError:
            raise TypeError('Vector2 precisa de números em x e y, mas recebeu '
                            f'{type(x).__name__} e {type(y).__name__}.') from None
        except OverflowError:
            _F[0] = f32(x)
            _F[1] = f32(y)
        _set(self, 'x', _F[0])
        _set(self, 'y', _F[1])

    def __setattr__(self, name, value):
        if name != 'x' and name != 'y':
            raise AttributeError(f'Vector2 não tem o campo {name!r}. Os campos são: x, y.')
        _set(self, name, f32(value, 'Vector2', name))

    def _assign(self, value):
        if type(value) is Vector2:
            _set(self, 'x', value.x)
            _set(self, 'y', value.y)
        else:
            Struct._assign(self, value)


class Vector3(Struct):
    __slots__ = ('x', 'y', 'z')
    _name = 'Vector3'
    _fields = ('x', 'y', 'z')
    _kinds = {'x': 'float', 'y': 'float', 'z': 'float'}
    _nested = {}

    def __init__(self, x=0.0, y=0.0, z=0.0, /, *extra):
        if extra:
            raise ValueError(f'Vector3 tem 3 campos (x, y, z), mas recebeu {3 + len(extra)} valores.')
        try:
            _F[0] = x
            _F[1] = y
            _F[2] = z
        except TypeError:
            raise TypeError('Vector3 precisa de números em x, y e z.') from None
        except OverflowError:
            _F[0] = f32(x)
            _F[1] = f32(y)
            _F[2] = f32(z)
        _set(self, 'x', _F[0])
        _set(self, 'y', _F[1])
        _set(self, 'z', _F[2])

    def __setattr__(self, name, value):
        if name != 'x' and name != 'y' and name != 'z':
            raise AttributeError(f'Vector3 não tem o campo {name!r}. Os campos são: x, y, z.')
        _set(self, name, f32(value, 'Vector3', name))

    def _assign(self, value):
        if type(value) is Vector3:
            _set(self, 'x', value.x)
            _set(self, 'y', value.y)
            _set(self, 'z', value.z)
        else:
            Struct._assign(self, value)


class Rectangle(Struct):
    __slots__ = ('x', 'y', 'width', 'height')
    _name = 'Rectangle'
    _fields = ('x', 'y', 'width', 'height')
    _kinds = {'x': 'float', 'y': 'float', 'width': 'float', 'height': 'float'}
    _nested = {}

    def __init__(self, x=0.0, y=0.0, width=0.0, height=0.0, /, *extra):
        if extra:
            raise ValueError('Rectangle tem 4 campos (x, y, width, height), mas recebeu '
                             f'{4 + len(extra)} valores.')
        try:
            _F[0] = x
            _F[1] = y
            _F[2] = width
            _F[3] = height
        except TypeError:
            raise TypeError('Rectangle precisa de números em x, y, width e height.') from None
        except OverflowError:
            _F[0] = f32(x)
            _F[1] = f32(y)
            _F[2] = f32(width)
            _F[3] = f32(height)
        _set(self, 'x', _F[0])
        _set(self, 'y', _F[1])
        _set(self, 'width', _F[2])
        _set(self, 'height', _F[3])

    def __setattr__(self, name, value):
        if name not in Rectangle._kinds:
            raise AttributeError(f'Rectangle não tem o campo {name!r}. Os campos são: x, y, '
                                 'width, height.')
        _set(self, name, f32(value, 'Rectangle', name))

    def _assign(self, value):
        if type(value) is Rectangle:
            _set(self, 'x', value.x)
            _set(self, 'y', value.y)
            _set(self, 'width', value.width)
            _set(self, 'height', value.height)
        else:
            Struct._assign(self, value)


def _channel(value, field):
    if type(value) is not int:
        if type(value) is bool or isinstance(value, int):
            value = int(value)
        else:
            raise TypeError(f'Color.{field} precisa de um número inteiro de 0 a 255, mas recebeu '
                            f'{type(value).__name__} ({value!r:.40}). Use int(...).')
    if value < 0 or value > 255:
        raise OverflowError(f'Color.{field} vai de 0 a 255, e recebeu {value}.')
    return value


class Color(Struct):
    __slots__ = ('r', 'g', 'b', 'a')
    _name = 'Color'
    _fields = ('r', 'g', 'b', 'a')
    _kinds = {'r': 'uchar', 'g': 'uchar', 'b': 'uchar', 'a': 'uchar'}
    _nested = {}

    def __init__(self, r=0, g=0, b=0, a=0, /, *extra):
        if extra:
            raise ValueError(f'Color tem 4 campos (r, g, b, a), mas recebeu {4 + len(extra)} valores.')
        _set(self, 'r', _channel(r, 'r'))
        _set(self, 'g', _channel(g, 'g'))
        _set(self, 'b', _channel(b, 'b'))
        _set(self, 'a', _channel(a, 'a'))

    def __setattr__(self, name, value):
        if name not in Color._kinds:
            raise AttributeError(f'Color não tem o campo {name!r}. Os campos são: r, g, b, a.')
        _set(self, name, _channel(value, name))


for _cls in (Vector2, Vector3, Rectangle, Color):
    _cls._conv = {field: _converter(_cls._name, field, kind) for field, kind in _cls._kinds.items()}
    STRUCTS[_cls._name] = _cls

for _name, _fields in STRUCT_FIELDS.items():
    if _name not in STRUCTS and not _name.startswith(('GLFW', 'rl', 'Gui', 'Physics')):
        STRUCTS[_name] = _make(_name, _fields)

for _alias, _target in STRUCT_ALIASES.items():
    STRUCTS[_alias] = STRUCTS[_target]

Vector4 = STRUCTS['Vector4']
Matrix = STRUCTS['Matrix']
Camera2D = STRUCTS['Camera2D']
Camera3D = STRUCTS['Camera3D']
BoundingBox = STRUCTS['BoundingBox']
Ray = STRUCTS['Ray']
RayCollision = STRUCTS['RayCollision']
Texture = STRUCTS['Texture']
RenderTexture = STRUCTS['RenderTexture']
Image = STRUCTS['Image']
Font = STRUCTS['Font']
GlyphInfo = STRUCTS['GlyphInfo']
NPatchInfo = STRUCTS['NPatchInfo']
Sound = STRUCTS['Sound']
Music = STRUCTS['Music']
AudioStream = STRUCTS['AudioStream']
Shader = STRUCTS['Shader']
Mesh = STRUCTS['Mesh']
Material = STRUCTS['Material']
MaterialMap = STRUCTS['MaterialMap']
Model = STRUCTS['Model']
ModelAnimation = STRUCTS['ModelAnimation']
Transform = STRUCTS['Transform']
Wave = STRUCTS['Wave']
BoneInfo = STRUCTS['BoneInfo']
