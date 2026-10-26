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
from ._ffi import NULL, Pointer, ffi
from ._names import C_NAMES, FUNCTION_KINDS, FUNCTION_PARAMS
from ._structs import STRUCTS

_MODULES_2D = ('_core', '_draw2d', '_text', '_assets', '_collide2d', '_raymath', '_audio',
               '_camera2d', '_colors')
_MODULES_3D = ('_models', '_draw3d', '_camera3d', '_collide3d', '_shaders')
# As funções do raygui que o pyray do computador traz (o Estúdio ainda não desenha botões dele).
_GUI_NAMES = (
    'gui_button', 'gui_check_box', 'gui_color_bar_alpha', 'gui_color_bar_hue', 'gui_color_panel',
    'gui_color_panel_hsv', 'gui_color_picker', 'gui_color_picker_hsv', 'gui_combo_box',
    'gui_disable', 'gui_disable_tooltip', 'gui_draw_icon', 'gui_dropdown_box', 'gui_dummy_rec',
    'gui_enable', 'gui_enable_tooltip', 'gui_get_font', 'gui_get_icons', 'gui_get_state',
    'gui_get_style', 'gui_get_text_width', 'gui_grid', 'gui_group_box', 'gui_icon_text',
    'gui_is_locked', 'gui_label', 'gui_label_button', 'gui_line', 'gui_list_view',
    'gui_list_view_ex', 'gui_load_icons', 'gui_load_style', 'gui_load_style_default',
    'gui_load_style_from_memory', 'gui_lock', 'gui_message_box', 'gui_panel', 'gui_progress_bar',
    'gui_scroll_panel', 'gui_set_alpha', 'gui_set_font', 'gui_set_icon_scale', 'gui_set_state',
    'gui_set_style', 'gui_set_tooltip', 'gui_slider', 'gui_slider_bar', 'gui_spinner',
    'gui_status_bar', 'gui_tab_bar', 'gui_text_box', 'gui_text_input_box', 'gui_toggle',
    'gui_toggle_group', 'gui_toggle_slider', 'gui_unlock', 'gui_value_box', 'gui_value_box_float',
    'gui_window_box',
)
_cache = {}


def _stub(name, reason):
    def unavailable(*args, **kwargs):
        raise NotImplementedError(reason)
    unavailable.__name__ = name
    unavailable.__qualname__ = name
    unavailable.__doc__ = reason
    return unavailable


def _missing(name):
    # Uma função que a Raylib 3D faz já ganha o aviso dela em _functions(); aqui só chega o que
    # nenhuma das duas extensões faz, então dizer "use a Raylib 3D" seria mentira.
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
        except ModuleNotFoundError as error:
            # Só um módulo que ainda não existe é pulado; um erro dentro dele aparece.
            if error.name != f'_szraylib.{module_name}':
                raise
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
    for name in _GUI_NAMES:
        found.setdefault(name, _missing(name))
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


def _c_style(name, c_name, function):
    """A função com o nome do C, do jeito do cffi cru (o módulo ``raylib`` do computador).

    Lá o texto vai em bytes (``b'Oi'``) e um parâmetro ``Image *`` ou ``Camera3D *`` quer um
    ponteiro (``ffi.new('Camera3D *', camera)`` ou ``ffi.addressof(camera)``), não o struct.
    Sem isso, um jogo que roda aqui quebraria no computador (e o contrário).
    """
    kinds = FUNCTION_KINDS.get(name)
    if not kinds or getattr(function, '__name__', '') == 'unavailable':
        return function
    texts = [i for i, kind in enumerate(kinds) if kind == 'str']
    pointers = [i for i, kind in enumerate(kinds)
                if kind.startswith('ptr:') and kind[4:] in STRUCTS]
    if not texts and not pointers:
        return function

    def call(*args):
        values = list(args)
        for i in texts:
            if i < len(values):
                value = values[i]
                if isinstance(value, str):
                    raise TypeError(f'{c_name}: no módulo raylib (com os nomes do C) o texto vai '
                                    f"em bytes, como b'Oi'. Ou use o pyray: {name}('Oi', ...).")
                if isinstance(value, (bytes, bytearray)):
                    values[i] = bytes(value).decode('utf-8')
        for i in pointers:
            if i < len(values):
                value = values[i]
                if isinstance(value, Pointer) and value.items:
                    values[i] = value.items[0]
                elif value is not None and value is not NULL:
                    struct_name = kinds[i][4:]
                    raise TypeError(f'{c_name}: no módulo raylib (com os nomes do C) este '
                                    f'parâmetro é um ponteiro: passe ffi.addressof(...) ou '
                                    f"ffi.new('{struct_name} *', ...). Ou use o pyray: {name}(...).")
        return function(*values)

    call.__name__ = c_name
    call.__qualname__ = c_name
    call.__doc__ = function.__doc__
    return call


def raylib_rl():
    if 'rl' not in _cache:
        rl = types.SimpleNamespace()
        functions = _functions()
        for snake, c_name in C_NAMES.items():
            setattr(rl, c_name, _c_style(snake, c_name, functions.get(snake) or _missing(snake)))
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
