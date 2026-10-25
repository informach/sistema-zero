"""O pedacinho do cffi que os jogos em raylib usam: ``ffi.NULL`` e ``ffi.new(...)``.

No computador, ``ffi`` é o do pacote cffi. Aqui ele só guarda valores numa lista que o motor
lê: ``ffi.new('struct Vector2 *', [1, 0])`` (um valor para o shader), ``ffi.new('int *', 0)``
(a contagem que load_model_animations preenche) e ``ffi.new('int[]', [...])`` (uma lista de
números). Para os caracteres de uma fonte, o pyray do computador quer ``None`` (ou ``ffi.NULL``)
e a quantidade, como em ``load_font_ex('fonts/x.ttf', 32, None, 250)``.
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
    """Um ponteiro do cffi: ``p[0]`` lê e escreve; num struct, ``p.x`` também.

    Como no cffi, só um ARRAY (``ffi.new('int[]', ...)``) tem tamanho e se percorre com
    ``for``. Um ponteiro (``modelo.materials``, ``load_model_animations(...)``) só tem índice:
    no computador, ``len()`` e ``for`` nele dão TypeError, então aqui também.
    """
    __slots__ = ('ctype', 'items')

    def __init__(self, ctype, items):
        object.__setattr__(self, 'ctype', ctype)
        object.__setattr__(self, 'items', items)

    def _array(self):
        return '[' in self.ctype

    def _index(self, index):
        if isinstance(index, slice):
            if index.start is None or index.stop is None or index.step is not None:
                raise IndexError(f'{self.ctype}: no raylib a fatia precisa de começo e fim, '
                                 'como p[0:3].')
            return index
        if isinstance(index, int) and not isinstance(index, bool) and index < 0:
            raise IndexError(f'{self.ctype}: índice negativo ({index}) não existe aqui; no '
                             'computador ele leria a memória de fora.')
        return index

    def __getitem__(self, index):
        index = self._index(index)
        if isinstance(index, slice):
            return Pointer(self.ctype.replace('*', '[]', 1), self.items[index])
        return self.items[index]

    def __setitem__(self, index, value):
        current = self.items[self._index(index)]
        if hasattr(current, '_assign'):
            current._assign(value)
        else:
            self.items[index] = value

    def __bool__(self):
        return True

    def __len__(self):
        if self._array():
            return len(self.items)
        raise TypeError(f"len() não funciona num ponteiro do raylib ({self.ctype}): use o "
                        "contador que vem junto, como modelo.materialCount, modelo.meshCount ou "
                        "o número que load_model_animations põe na caixinha do ffi.")

    def __iter__(self):
        if self._array():
            return iter(self.items)
        raise TypeError(f"um ponteiro do raylib ({self.ctype}) não se percorre com for: use "
                        "for i in range(modelo.materialCount) (ou o contador certo) e "
                        "p[i] dentro do laço.")

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
