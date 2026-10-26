"""Janela, tempo e entrada (rcore.c do raylib), sobre o estado de _rt."""
from . import _constants as K
from . import _random
from . import _rt as rt
from ._args import integer, number, text, vec2
from ._structs import Vector2

_MAX_WINDOW = 1920 * 1080


# Janela -----------------------------------------------------------------------------------------

def init_window(width, height, title, /):
    f = 'init_window'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    name = text(title, f, 'title')
    if rt.window.open:
        print('Aviso: init_window: a janela já está aberta.')
        return
    if w <= 0 or h <= 0:
        raise ValueError(f'{f}: largura e altura precisam ser maiores que zero.')
    if w > 3840 or h > 2160 or w * h > 4096 * 2160:
        raise ValueError(f'{f}: a janela vai até 3840 x 2160 pixels.')
    win = rt.window
    win.open = True
    if not win.frame_counter:
        win.mark = rt._clock()
    win.closed = False
    win.width, win.height, win.title = w, h, name
    win.should_close = False
    _random.set_seed(_seed_from_clock())


def _seed_from_clock():
    import time
    return int(time.time())


def close_window():
    win = rt.window
    if not win.open:
        return
    win.open = False
    win.closed = True
    win.should_close = True


def window_should_close():
    win = rt.window
    if not win.open:
        return True
    return win.should_close


def is_window_ready():
    return rt.window.open


def is_window_focused():
    return rt.input.focused


def is_window_hidden():
    return False


def is_window_minimized():
    return False


def is_window_maximized():
    return False


def is_window_fullscreen():
    return False


def is_window_resized():
    return False


def is_window_state(flag, /):
    return bool(rt.window.config_flags & integer(flag, 'is_window_state', 'flag'))


def set_config_flags(flags, /):
    rt.window.config_flags |= integer(flags, 'set_config_flags', 'flags')


def set_window_state(flags, /):
    rt.window.config_flags |= integer(flags, 'set_window_state', 'flags')


def clear_window_state(flags, /):
    rt.window.config_flags &= ~integer(flags, 'clear_window_state', 'flags')


def set_window_title(title, /):
    rt.window.title = text(title, 'set_window_title', 'title')


def set_window_size(width, height, /):
    f = 'set_window_size'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    if 0 < w <= 3840 and 0 < h <= 2160:
        rt.window.width, rt.window.height = w, h


def set_window_min_size(width, height, /):
    integer(width, 'set_window_min_size', 'width')
    integer(height, 'set_window_min_size', 'height')
    return None


def set_window_max_size(width, height, /):
    integer(width, 'set_window_max_size', 'width')
    integer(height, 'set_window_max_size', 'height')
    return None


def set_window_position(x, y, /):
    integer(x, 'set_window_position', 'x')
    integer(y, 'set_window_position', 'y')
    return None


def set_window_icon(image, /):
    return None


def set_window_opacity(opacity, /):
    return None


def toggle_fullscreen():
    return None


def toggle_borderless_windowed():
    return None


def maximize_window():
    return None


def minimize_window():
    return None


def restore_window():
    return None


def set_window_focused():
    return None


def get_screen_width():
    return rt.window.width


def get_screen_height():
    return rt.window.height


def get_render_width():
    return rt.window.width


def get_render_height():
    return rt.window.height


def get_monitor_width(monitor, /):
    integer(monitor, 'get_monitor_width', 'monitor')
    return 1920


def get_monitor_height(monitor, /):
    integer(monitor, 'get_monitor_height', 'monitor')
    return 1080


def get_monitor_count():
    return 1


def get_current_monitor():
    return 0


def get_monitor_refresh_rate(monitor, /):
    integer(monitor, 'get_monitor_refresh_rate', 'monitor')
    return 60


def get_window_scale_dpi():
    return Vector2(1.0, 1.0)


def get_window_position():
    return Vector2(0.0, 0.0)


def set_exit_key(key, /):
    rt.window.exit_key = integer(key, 'set_exit_key', 'key')


def set_trace_log_level(logLevel, /):
    integer(logLevel, 'set_trace_log_level', 'logLevel')


def trace_log(logLevel, text_, /):
    level = integer(logLevel, 'trace_log', 'logLevel')
    names = {1: 'TRACE', 2: 'DEBUG', 3: 'INFO', 4: 'WARNING', 5: 'ERROR', 6: 'FATAL'}
    print(f'{names.get(level, "INFO")}: {text(text_, "trace_log", "text")}')


def take_screenshot(fileName, /):
    print('Aviso: take_screenshot: no Estúdio a foto do jogo não vira arquivo.')


def open_url(url, /):
    print('Aviso: open_url: o jogo do Estúdio não abre páginas da internet.')


# Cursor -----------------------------------------------------------------------------------------

def disable_cursor():
    """Esconde e trava o mouse (jogos em primeira pessoa). O navegador trava no clique."""
    rt.window.cursor_locked = True
    rt.window.cursor_hidden = True


def enable_cursor():
    rt.window.cursor_locked = False
    rt.window.cursor_hidden = False


def hide_cursor():
    rt.window.cursor_hidden = True


def show_cursor():
    rt.window.cursor_hidden = False


def is_cursor_hidden():
    return rt.window.cursor_hidden


def is_cursor_on_screen():
    return rt.input.on_screen


def set_mouse_cursor(cursor, /):
    integer(cursor, 'set_mouse_cursor', 'cursor')


# Tempo ------------------------------------------------------------------------------------------

def set_target_fps(fps, /):
    value = integer(fps, 'set_target_fps', 'fps')
    rt.window.target_fps = value if value > 0 else 0


def get_frame_time():
    return rt.window.frame_time


def get_time():
    w = rt.window
    # GetTime conta desde o init_window, mesmo antes do primeiro quadro (wait_time anda).
    elapsed = rt._clock() - w.mark if w.frame_counter or w.open else 0.0
    w.returned = max(w.returned, w.now + max(0.0, elapsed))
    return w.returned


def get_fps():
    history = rt.window.fps_history
    if not history:
        return 0
    average = sum(history) / len(history)
    return int(round(1.0 / average)) if average > 0 else 0


def wait_time(seconds, /):
    """Espera de verdade, como o raylib (em fatias curtas, para o Parar continuar valendo)."""
    import time
    value = number(seconds, 'wait_time', 'seconds')
    end = time.perf_counter() + max(0.0, value)
    while True:
        left = end - time.perf_counter()
        if left <= 0:
            break
        time.sleep(min(left, 0.05))


def set_random_seed(seed, /):
    _random.set_seed(integer(seed, 'set_random_seed', 'seed') & 0xFFFFFFFF)


def get_random_value(min, max, /):
    f = 'get_random_value'
    return _random.get_value(integer(min, f, 'min'), integer(max, f, 'max'))


def load_random_sequence(count, min, max, /):
    f = 'load_random_sequence'
    n = integer(count, f, 'count')
    low, high = integer(min, f, 'min'), integer(max, f, 'max')
    if low > high:
        low, high = high, low
    from ._ffi import NULL, Pointer
    # No C, pedir mais números distintos do que o intervalo tem devolve NULL.
    if n > high - low + 1:
        return NULL
    values = []
    while len(values) < n:
        value = _random.get_value(low, high)
        if value not in values:
            values.append(value)
    return Pointer('int *', values)


def unload_random_sequence(sequence, /):
    return None


# Teclado ----------------------------------------------------------------------------------------

def _key(key, function):
    value = integer(key, function, 'key')
    return value if 0 < value < 512 else 0


def is_key_down(key, /):
    k = _key(key, 'is_key_down')
    return bool(k and rt.input.down[k])


def is_key_up(key, /):
    k = _key(key, 'is_key_up')
    # IsKeyUp: uma tecla fora da faixa (ou KEY_NULL) não está "solta", só falsa.
    return bool(k) and not rt.input.down[k]


def is_key_pressed(key, /):
    k = _key(key, 'is_key_pressed')
    return bool(k and rt.input.down[k] and not rt.input.previous[k])


def is_key_pressed_repeat(key, /):
    k = _key(key, 'is_key_pressed_repeat')
    return bool(k and rt.input.repeat[k])


def is_key_released(key, /):
    k = _key(key, 'is_key_released')
    return bool(k and not rt.input.down[k] and rt.input.previous[k])


def get_key_pressed():
    queue = rt.input.key_queue
    return queue.pop(0) if queue else 0


def get_char_pressed():
    queue = rt.input.char_queue
    return queue.pop(0) if queue else 0


def get_key_name(key, /):
    k = integer(key, 'get_key_name', 'key')
    if 32 < k < 127:
        return chr(k).lower()
    return ''


# Mouse ------------------------------------------------------------------------------------------

def _button(button, function):
    value = integer(button, function, 'button')
    return value if 0 <= value < 8 else -1


def is_mouse_button_down(button, /):
    b = _button(button, 'is_mouse_button_down')
    return bool(b >= 0 and rt.input.buttons[b])


def is_mouse_button_up(button, /):
    b = _button(button, 'is_mouse_button_up')
    return b >= 0 and not rt.input.buttons[b]


def is_mouse_button_pressed(button, /):
    b = _button(button, 'is_mouse_button_pressed')
    return bool(b >= 0 and rt.input.buttons[b] and not rt.input.previous_buttons[b])


def is_mouse_button_released(button, /):
    b = _button(button, 'is_mouse_button_released')
    return bool(b >= 0 and not rt.input.buttons[b] and rt.input.previous_buttons[b])


# set_mouse_offset e set_mouse_scale: como no raylib, a posição lida é (posição + deslocamento) ×
# escala (é o que ajusta o mouse a uma render texture ampliada). O delta não muda.
_mouse_offset = [0.0, 0.0]
_mouse_scale = [1.0, 1.0]


def get_mouse_x():
    return int((rt.input.mouse_x + _mouse_offset[0]) * _mouse_scale[0])


def get_mouse_y():
    return int((rt.input.mouse_y + _mouse_offset[1]) * _mouse_scale[1])


def get_mouse_position():
    return Vector2((rt.input.mouse_x + _mouse_offset[0]) * _mouse_scale[0],
                   (rt.input.mouse_y + _mouse_offset[1]) * _mouse_scale[1])


def get_mouse_delta():
    return Vector2(rt.input.delta_x, rt.input.delta_y)


def set_mouse_position(x, y, /):
    f = 'set_mouse_position'
    rt.input.mouse_x = float(integer(x, f, 'x'))
    rt.input.mouse_y = float(integer(y, f, 'y'))
    rt.input.previous_mouse_x = rt.input.mouse_x
    rt.input.previous_mouse_y = rt.input.mouse_y


def set_mouse_offset(offsetX, offsetY, /):
    _mouse_offset[:] = [integer(offsetX, 'set_mouse_offset', 'offsetX'),
                        integer(offsetY, 'set_mouse_offset', 'offsetY')]


def set_mouse_scale(scaleX, scaleY, /):
    _mouse_scale[:] = [number(scaleX, 'set_mouse_scale', 'scaleX'),
                       number(scaleY, 'set_mouse_scale', 'scaleY')]


def get_mouse_wheel_move():
    return float(rt.input.wheel)


def get_mouse_wheel_move_v():
    return Vector2(0.0, rt.input.wheel)


# Toque e controle (o Estúdio converte o toque em mouse) -----------------------------------------

def get_touch_x():
    return int(rt.input.mouse_x)


def get_touch_y():
    return int(rt.input.mouse_y)


def get_touch_position(index, /):
    integer(index, 'get_touch_position', 'index')
    return Vector2(rt.input.mouse_x, rt.input.mouse_y)


def get_touch_point_count():
    return 1 if rt.input.buttons[0] else 0


def is_gamepad_available(gamepad, /):
    integer(gamepad, 'is_gamepad_available', 'gamepad')
    return False


def is_gamepad_button_down(gamepad, button, /):
    integer(gamepad, 'is_gamepad_button_down', 'gamepad')
    integer(button, 'is_gamepad_button_down', 'button')
    return False


def is_gamepad_button_pressed(gamepad, button, /):
    integer(gamepad, 'is_gamepad_button_pressed', 'gamepad')
    integer(button, 'is_gamepad_button_pressed', 'button')
    return False


def get_gamepad_axis_movement(gamepad, axis, /):
    integer(gamepad, 'get_gamepad_axis_movement', 'gamepad')
    integer(axis, 'get_gamepad_axis_movement', 'axis')
    return 0.0
