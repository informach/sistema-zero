"""Monta os nomes públicos de ``pyray`` e ``raylib`` (os dois módulos que os jogos importam).

* ``pyray``: funções em snake_case, structs, constantes, cores (tuplas) e enums;
* ``raylib``: as mesmas funções com os nomes do C (``Vector2Normalize``), constantes, cores,
  ``ffi`` e ``rl``.

Funções que o raylib tem e o Estúdio ainda não faz existem com o nome certo e explicam isso em
português ao serem chamadas. Com a extensão Raylib 2D, as funções 3D explicam que são da
extensão Raylib 3D.
"""
import types

from . import _constants as K
from . import _rt as rt
from ._ffi import ffi
from ._names import C_NAMES, FUNCTION_PARAMS
from ._structs import STRUCTS

_MODULES_2D = ('_core', '_draw2d', '_text', '_assets', '_collide2d', '_raymath', '_audio',
               '_camera2d', '_colors')
_MODULES_3D = ('_models', '_draw3d', '_camera3d', '_collide3d', '_shaders')
_3D_WORDS = ('_3d', 'model', 'mesh', 'shader', 'cube', 'sphere', 'cylinder', 'capsule', 'billboard',
             'bounding_box', 'ray_collision', 'screen_to_world_ray', 'world_to_screen', 'material',
             'grid', 'plane', 'camera', 'cubemap', 'vr_', 'rl_', 'animation', 'skybox')
_cache = {}


def _stub(name, reason):
    def unavailable(*args, **kwargs):
        raise NotImplementedError(reason)
    unavailable.__name__ = name
    unavailable.__qualname__ = name
    unavailable.__doc__ = reason
    return unavailable


def _missing(name):
    if rt.mode == '2d' and any(word in name for word in _3D_WORDS):
        return _stub(name, f'{name} é do raylib 3D: este projeto usa a extensão Raylib 2D. Para '
                           'jogos 3D, use a extensão Raylib 3D.')
    if name.startswith('gui_'):
        return _stub(name, f'{name} é do raygui, que ainda não existe no Estúdio.')
    return _stub(name, f'{name} existe no raylib do computador, mas ainda não funciona no '
                       'Estúdio.')


def _functions():
    """Função pública -> implementação, conforme a extensão instalada."""
    found = {}
    for module_name in _MODULES_2D:
        module = __import__(f'_szraylib.{module_name}', fromlist=['_'])
        for name, value in vars(module).items():
            if callable(value) and not name.startswith('_') and name in FUNCTION_PARAMS:
                found[name] = value
    three = {}
    for module_name in _MODULES_3D:
        try:
            module = __import__(f'_szraylib.{module_name}', fromlist=['_'])
        except ImportError:
            continue
        for name, value in vars(module).items():
            if callable(value) and not name.startswith('_') and name in FUNCTION_PARAMS:
                three[name] = value
    if rt.mode == '3d':
        found.update(three)
    else:
        for name in three:
            found[name] = _stub(name, f'{name} é do raylib 3D: este projeto usa a extensão '
                                      'Raylib 2D. Para jogos 3D, use a extensão Raylib 3D.')
    for name in FUNCTION_PARAMS:
        if name not in found:
            found[name] = _missing(name)
    # Nomes do pyray que não vêm do C (o pyray os escreve à mão).
    from ._draw2d import draw_text  # noqa: F401
    return found


def _constants():
    values = {}
    for name in dir(K):
        if name.startswith('_') or name in ('IntEnum', 'ENUM_NAMES', 'COLOR_NAMES',
                                            'RAYLIB_PACKAGE_VERSION'):
            continue
        values[name] = getattr(K, name)
    return values


def pyray_namespace():
    if 'pyray' not in _cache:
        names = {}
        names.update(_constants())
        names.update({name: cls for name, cls in STRUCTS.items()})
        names.update(_functions())
        names['ffi'] = ffi
        names['text_format'] = _stub('text_format', 'Use f-strings do Python em vez de '
                                                    'text_format(), como f"Pontos: {pontos}".')
        names['rl'] = raylib_rl()
        _cache['pyray'] = names
    return _cache['pyray']


def raylib_rl():
    if 'rl' not in _cache:
        rl = types.SimpleNamespace()
        functions = _functions()
        for snake, c_name in C_NAMES.items():
            setattr(rl, c_name, functions.get(snake) or _missing(snake))
        for name, value in _constants().items():
            if not isinstance(value, type):
                setattr(rl, name, value)
        _cache['rl'] = rl
    return _cache['rl']


def raylib_namespace():
    if 'raylib' not in _cache:
        rl = raylib_rl()
        names = dict(vars(rl))
        names['rl'] = rl
        names['ffi'] = ffi
        names['__version__'] = K.RAYLIB_PACKAGE_VERSION
        _cache['raylib'] = names
    return _cache['raylib']


def public(names):
    return sorted(name for name in names if not name.startswith('_'))
