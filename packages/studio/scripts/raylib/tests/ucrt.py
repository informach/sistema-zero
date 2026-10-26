"""--ucrt: o seno, o cosseno e o arco-cosseno em float da UCRT (a biblioteca C do Windows).

O motor do Estúdio calcula sinf/cosf/acosf arredondando o valor exato (o mesmo em qualquer
computador). O raylib do computador usa os da biblioteca C do sistema, e os da UCRT erram uma
unidade na última casa em alguns ângulos (cosf(5.497787) dá 0.70710671, e o certo é 0.70710665).
Com --ucrt, o lado do Estúdio usa os da UCRT, e então os diferenciais comparam bit a bit com o
raylib do Windows: o que sobra de diferença é do motor, não da biblioteca C.
"""
import ctypes
import sys
from array import array


def use_ucrt_libm():
    if sys.platform != 'win32':
        raise SystemExit('--ucrt só existe no Windows (a UCRT é a biblioteca C de lá).')
    lib = ctypes.CDLL('ucrtbase.dll')
    functions = {}
    for name in ('sinf', 'cosf', 'tanf', 'acosf', 'asinf', 'atanf'):
        function = getattr(lib, name)
        function.restype = ctypes.c_float
        function.argtypes = [ctypes.c_float]
        functions[name] = function
    from _szraylib import _float32, _floatvec
    original = {name: getattr(_float32, name) for name in functions}
    for name, function in functions.items():
        replacement = (lambda fn: lambda x: _float32.F(fn(float(x))))(function)
        for module in list(sys.modules.values()):
            if (getattr(module, '__name__', '').startswith('_szraylib')
                    and getattr(module, name, None) is original[name]):
                setattr(module, name, replacement)
    _floatvec._sin = lambda values: array('f', [functions['sinf'](v) for v in values])
    _floatvec._cos = lambda values: array('f', [functions['cosf'](v) for v in values])
    _floatvec._acos = lambda values: array('f', [functions['acosf'](v) for v in values])
