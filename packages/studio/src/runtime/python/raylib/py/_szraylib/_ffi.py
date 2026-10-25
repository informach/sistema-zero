"""O pedacinho do cffi que os jogos em raylib usam: ``ffi.NULL`` e ``ffi.new(...)``.

No computador, ``ffi`` é o do pacote cffi. Aqui ele só guarda valores numa lista que o motor
lê: ``ffi.new('struct Vector2 *', [1, 0])`` (um valor para o shader), ``ffi.new('int *', 0)``
(a contagem que load_model_animations preenche) e ``ffi.new('int[]', [...])`` (codepoints).
"""
import re

from ._structs import STRUCTS


class _Null:
    __slots__ = ()

    def __repr__(self):
        return "<cdata 'void *' NULL>"

    def __bool__(self):
        return False


NULL = _Null()
_SPEC = re.compile(r'^\s*(?:struct\s+)?(\w+(?:\s+\w+)?)\s*(\*|\[\s*(\d*)\s*\])\s*$')
_NUMBERS = {'int', 'float', 'double', 'unsigned int', 'unsigned char', 'char', 'bool', '_Bool',
            'short', 'unsigned short', 'long', 'unsigned long'}


class Pointer:
    """Um ponteiro do cffi: ``p[0]`` lê e escreve; num struct, ``p.x`` também."""
    __slots__ = ('ctype', 'items')

    def __init__(self, ctype, items):
        object.__setattr__(self, 'ctype', ctype)
        object.__setattr__(self, 'items', items)

    def __getitem__(self, index):
        return self.items[index]

    def __setitem__(self, index, value):
        current = self.items[index]
        if hasattr(current, '_assign'):
            current._assign(value)
        else:
            self.items[index] = value

    def __len__(self):
        return len(self.items)

    def __iter__(self):
        return iter(self.items)

    def __getattr__(self, name):
        return getattr(self.items[0], name)

    def __setattr__(self, name, value):
        setattr(self.items[0], name, value)

    def __repr__(self):
        return f"<cdata '{self.ctype}' {self.items!r}>"


def new(ctype, init=None):
    match = _SPEC.match(str(ctype))
    if not match:
        raise TypeError(f'ffi.new: não entendi o tipo {ctype!r}. Use, por exemplo, '
                        '"int *" ou "struct Vector2 *".')
    base, kind, size = match.group(1), match.group(2), match.group(3)
    array = kind.startswith('[')
    if base in STRUCTS:
        cls = STRUCTS[base]
        if array:
            values = list(init or [])
            count = int(size) if size else len(values)
            items = []
            for i in range(count):
                item = cls()
                if i < len(values):
                    item._assign(values[i])
                items.append(item)
            return Pointer(ctype, items)
        item = cls()
        if init is not None:
            item._assign(init)
        return Pointer(ctype, [item])
    if base in _NUMBERS:
        zero = 0.0 if base in ('float', 'double') else 0
        if array:
            values = list(init or [])
            count = int(size) if size else len(values)
            return Pointer(ctype, [values[i] if i < len(values) else zero for i in range(count)])
        return Pointer(ctype, [zero if init is None else init])
    raise TypeError(f'ffi.new: o tipo {base!r} não existe no raylib.')


def cast(ctype, value):
    return value


def string(value, maxlen=-1):
    if isinstance(value, Pointer):
        value = bytes(value.items)
    if isinstance(value, bytes):
        return value.split(b'\0', 1)[0]
    return str(value).encode('utf-8')


def addressof(value, *fields):
    return Pointer('void *', [value])


def typeof(value):
    return type(value).__name__


class _FFI:
    NULL = NULL
    new = staticmethod(new)
    cast = staticmethod(cast)
    string = staticmethod(string)
    addressof = staticmethod(addressof)
    typeof = staticmethod(typeof)

    def __repr__(self):
        return '<ffi do Estúdio>'


ffi = _FFI()
