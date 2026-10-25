"""Estado do motor Raylib do Estúdio e a troca com o navegador (uma por quadro).

O jogo é o laço da própria criança::

    while not window_should_close():
        begin_drawing()
        ...
        end_drawing()

``end_drawing`` manda a lista de desenho do quadro e recebe de volta a entrada (teclas, mouse),
o relógio e os sons que acabaram. É a única espera do quadro: o navegador responde no ritmo da
tela (ou do ``set_target_fps``), e o Python calcula o quadro seguinte enquanto ele pinta.
"""
import json
import os
from array import array

from . import _constants as K

# Opcodes da lista de desenho (iguais aos de protocol.ts).
OP_CLEAR = 1
OP_RECT_PRO = 2
OP_RECT_GRADIENT = 3
OP_RECT_LINES = 4
OP_RECT_LINES_EX = 5
OP_RECT_ROUNDED = 6
OP_RECT_ROUNDED_LINES = 7
OP_LINE = 8
OP_LINE_EX = 9
OP_PIXEL = 10
OP_CIRCLE_SECTOR = 11
OP_CIRCLE_SECTOR_LINES = 12
OP_CIRCLE_GRADIENT = 13
OP_CIRCLE_LINES = 14
OP_ELLIPSE = 15
OP_ELLIPSE_LINES = 16
OP_RING = 17
OP_RING_LINES = 18
OP_TRIANGLE = 19
OP_TRIANGLE_LINES = 20
OP_POLY = 21
OP_POLY_LINES = 22
OP_POLY_LINES_EX = 23
OP_TEXTURE = 24
OP_TEXT = 25
OP_BEGIN_2D = 26
OP_END_2D = 27
OP_BEGIN_TEXTURE = 28
OP_END_TEXTURE = 29
OP_BEGIN_SCISSOR = 30
OP_END_SCISSOR = 31
OP_BEGIN_BLEND = 32
OP_END_BLEND = 33
OP_PUSH = 34
OP_POP = 35
OP_TRANSLATE = 36
OP_ROTATE = 37
OP_SCALE = 38
OP_LINE_BEZIER = 39
OP_POINTS = 40
OP_TEXTURE_NPATCH = 41
# 3D (a extensão Raylib 3D): _camera3d.py, _draw3d.py e _models.py.
OP_BEGIN_3D = 60
OP_END_3D = 61
OP_LINE_3D = 62
OP_POINT_3D = 63
OP_CIRCLE_3D = 64
OP_TRIANGLE_3D = 65
OP_CUBE = 66
OP_CUBE_WIRES = 67
OP_SPHERE = 68
OP_SPHERE_WIRES = 69
OP_CYLINDER = 70
OP_CYLINDER_WIRES = 71
OP_CYLINDER_EX = 72
OP_CYLINDER_WIRES_EX = 73
OP_CAPSULE = 74
OP_CAPSULE_WIRES = 75
OP_PLANE = 76
OP_GRID = 77
OP_QUAD_3D = 78
OP_RL_STATE = 79
# Malha de modelo: tamanho variável (ver _models.emit_mesh).
OP_MESH = 80
# Shaders (ver _shaders.py): o modo do lote, valores de uniform (tamanho variável), matriz e textura.
OP_SHADER_MODE = 81
OP_SHADER_VALUE = 82
OP_SHADER_MATRIX = 83
OP_SHADER_TEXTURE = 84

MAX_RECORDS = 400_000
MAX_TEXTURES = 2048
MAX_TEXTURE_SIDE = 8192
MAX_TOTAL_PIXELS = 48 * 1024 * 1024
MAX_PATH_CHARS = 512
MAX_TITLE_CHARS = 200
MAX_AUDIO_COMMANDS = 64
FRAME_ATTACHMENT_BYTES = 24 * 1024 * 1024
ATTACHMENTS_PER_FRAME = 120

# Texturas internas do navegador: a branca do rlgl e o atlas da fonte padrão.
DEFAULT_TEXTURE_ID = 1
DEFAULT_FONT_TEXTURE_ID = 2


class RaylibError(RuntimeError):
    """O navegador não conseguiu mostrar o quadro (uma imagem que não abre, por exemplo)."""


class _Window:
    def __init__(self):
        self.open = False
        self.closed = False
        self.width = 0
        self.height = 0
        self.title = ''
        self.target_fps = 0
        self.exit_key = K.KEY_ESCAPE
        self.should_close = False
        self.drawing = False
        self.mode_2d = False
        self.mode_3d = False
        self.texture_mode = False
        self.frame_counter = 0
        # Relógio (segundos): o navegador manda o seu, que para enquanto a aba está escondida.
        self.base = None
        self.now = 0.0
        self.previous = 0.0
        self.frame_time = 0.0
        self.fps_history = []
        self.cursor_locked = False
        self.cursor_hidden = False
        self.config_flags = 0
        self.clear_color = (0, 0, 0, 255)


class _Input:
    def __init__(self):
        self.down = bytearray(512)
        self.previous = bytearray(512)
        self.repeat = bytearray(512)
        self.key_queue = []
        self.char_queue = []
        # Tecla apertada e solta no mesmo quadro: conta como apertada neste e solta no próximo.
        self.release_next = []
        self.mouse_x = 0.0
        self.mouse_y = 0.0
        self.previous_mouse_x = 0.0
        self.previous_mouse_y = 0.0
        self.delta_x = 0.0
        self.delta_y = 0.0
        self.buttons = bytearray(8)
        self.previous_buttons = bytearray(8)
        self.buttons_release_next = []
        self.wheel = 0.0
        self.wheel_next = 0.0
        self.on_screen = False
        self.focused = True


window = _Window()
input = _Input()

ops = array('d')
_previous_payload = None
_transport = None
_decoder = None
_root = '.'
mode = '2d'

# Recursos que o navegador ainda não recebeu, e os que o jogo descartou.
pending_textures = []   # [id, 'f', path] | [id, 'p', w, h, bytes] | [id, 'r', w, h] | [id, 'e', size, bytes]
pending_fonts = []      # [id, path, baseSize, emPx, ascentPx, [codepoints]]
pending_free = []
pending_models = []     # 3D: ['mesh', id, vertices, índices, partes, tamanho, bytes] (ver _models.py)
#                       e ['shader', id, vs, fs, uniforms, 0, b''] (ver _shaders.py)
audio = []
_texture_count = 0
_total_pixels = 0
next_id = 10


_checkpoint = None


def configure(transport, decoder, root, extension_mode='2d', *, checkpoint=None):
    """Chamado uma vez pelo Estúdio antes do programa da criança."""
    global _transport, _decoder, _root, mode, _checkpoint
    _transport = transport
    _decoder = decoder
    _root = root
    mode = extension_mode
    if checkpoint is not None and not callable(checkpoint):
        raise TypeError('O checkpoint interno precisa ser uma função.')
    _checkpoint = checkpoint


def checkpoint():
    if _checkpoint is not None:
        _checkpoint()


def new_id():
    global next_id
    next_id += 1
    return next_id


def project_path(path, function):
    """Caminho do arquivo dentro do projeto, como o serviço de mídia do Estúdio o nomeia."""
    if not isinstance(path, (str, bytes)):
        raise TypeError(f'{function}: o nome do arquivo precisa ser um texto, como "imagens/nave.png".')
    if isinstance(path, bytes):
        path = path.decode('utf-8')
    absolute = os.path.abspath(path)
    relative = os.path.relpath(absolute, os.path.abspath(_root)).replace(os.sep, '/')
    if relative.startswith('../') or relative == '..':
        raise FileNotFoundError(f'{function}: o arquivo {path!r} precisa estar dentro do projeto.')
    if len(relative) > MAX_PATH_CHARS:
        raise ValueError(f'{function}: o caminho {relative[:60]!r}… é longo demais.')
    if not os.path.isfile(absolute):
        raise FileNotFoundError(
            f'{function}: o arquivo {path!r} não está no projeto. Confira o nome e a pasta '
            f'(os materiais ficam na janela "Materiais do jogo").')
    return relative, absolute


def count_texture(width, height, function):
    global _texture_count, _total_pixels
    if width > MAX_TEXTURE_SIDE or height > MAX_TEXTURE_SIDE:
        raise ValueError(f'{function}: a imagem passa de {MAX_TEXTURE_SIDE} pixels de lado.')
    _texture_count += 1
    _total_pixels += width * height
    if _texture_count > MAX_TEXTURES:
        raise RuntimeError(f'{function}: o jogo carregou mais de {MAX_TEXTURES} texturas. '
                           'Carregue as imagens uma vez, antes do laço do jogo.')
    if _total_pixels > MAX_TOTAL_PIXELS:
        raise RuntimeError(f'{function}: as imagens do jogo somam pixels demais. Carregue cada '
                           'imagem uma vez, antes do laço, e descarregue as que não usa mais.')


def forget_texture(width, height):
    global _texture_count, _total_pixels
    _texture_count = max(0, _texture_count - 1)
    _total_pixels = max(0, _total_pixels - width * height)


def require_window(function):
    if not window.open:
        if window.closed:
            raise RuntimeError(f'{function}: a janela já foi fechada (close_window).')
        raise RuntimeError(f'{function}: abra a janela antes com init_window(largura, altura, "título").')


def check_records():
    if len(ops) > MAX_RECORDS:
        raise RuntimeError('O quadro tem desenhos demais. Um laço está desenhando sem parar? '
                           'Confira se end_drawing() está dentro do laço do jogo.')


# Troca com o navegador --------------------------------------------------------------------

def _exchange(header, payload):
    if _transport is None:
        raise RuntimeError('A tela do Raylib não está disponível aqui.')
    text, pixels = _transport(json.dumps(header, separators=(',', ':')), payload)
    reply = json.loads(text)
    if 'error' in reply:
        raise RaylibError(str(reply['error']))
    return reply, pixels


def decode_image(path):
    """RGBA de um arquivo do projeto, decodificado no navegador (sem pygame, sem PIL)."""
    if _decoder is None:
        raise RuntimeError('A leitura de imagens não está disponível aqui.')
    return _decoder(path)


def _attachments():
    """O que vai junto deste quadro: arquivos pelo caminho, pixels dentro do pacote."""
    textures, blobs, budget = [], [], FRAME_ATTACHMENT_BYTES - len(ops) * 8
    taken = 0
    for entry in pending_textures:
        if taken >= ATTACHMENTS_PER_FRAME:
            break
        if entry[1] == 'p':
            size = len(entry[4])
            if size > budget and taken:
                break
            budget -= size
            blobs.append(entry[4])
            textures.append([entry[0], 'p', entry[2], entry[3], size])
        elif entry[1] == 'e':
            size = entry[2]
            if size > budget and taken:
                break
            budget -= size
            blobs.append(entry[3])
            textures.append([entry[0], 'e', size])
        else:
            textures.append(list(entry))
        taken += 1
    models = []
    for entry in pending_models:
        if len(models) >= 16 or (entry[5] > budget and (taken or models)):
            break
        budget -= entry[5]
        blobs.append(entry[6])
        models.append(entry[:6])
    return taken, textures, blobs, models


def present():
    """Manda o quadro desenhado e aplica a resposta (entrada, relógio, sons)."""
    global _previous_payload
    from . import _audio
    _audio.watch_music()
    w = window
    title = w.title[:MAX_TITLE_CHARS]
    payload = ops.tobytes()
    taken, textures, blobs, models = _attachments()
    fonts = pending_fonts[:ATTACHMENTS_PER_FRAME]
    keep = (payload == _previous_payload and not textures and not fonts and not models
            and not pending_free)
    header = {
        'w': w.width,
        'h': w.height,
        'title': title,
        'fps': w.target_fps,
        'keep': keep,
        'list': 0 if keep else len(payload),
        'textures': textures,
        'fonts': fonts,
        'models': models,
        'free': pending_free[:],
        'audio': audio[:],
        'cursor': [w.cursor_locked, w.cursor_hidden],
        'mode': mode,
    }
    body = b'' if keep else payload
    if blobs:
        body = body + b''.join(blobs)
    reply, _ = _exchange(header, body)
    del pending_textures[:taken]
    del pending_fonts[:len(fonts)]
    del pending_models[:len(models)]
    pending_free.clear()
    audio.clear()
    _previous_payload = payload
    _apply_reply(reply)
    return reply


def _apply_reply(reply):
    w = window
    now = float(reply.get('now', 0)) / 1000.0
    if w.base is None:
        # O primeiro quadro conta como um quadro de 1/60 s desde a abertura da janela.
        w.base = now - 1 / 60
        w.previous = w.base
    current = now - w.base
    w.frame_time = max(0.0, current - w.previous) if w.frame_counter else current
    w.previous = current
    w.now = current
    w.frame_counter += 1
    if w.frame_time > 0:
        w.fps_history.append(w.frame_time)
        if len(w.fps_history) > 30:
            del w.fps_history[0]
    _poll(reply.get('events', ()))
    from . import _audio
    _audio.ended(reply.get('ended', ()))


def _poll(events):
    """PollInputEvents: o estado atual vira o anterior e os eventos do quadro se aplicam."""
    i = input
    i.previous[:] = i.down
    i.previous_buttons[:] = i.buttons
    i.repeat = bytearray(512)
    for key in i.release_next:
        i.down[key] = 0
    i.release_next = []
    for button in i.buttons_release_next:
        i.buttons[button] = 0
    i.buttons_release_next = []
    i.key_queue.clear()
    i.char_queue.clear()
    i.previous_mouse_x = i.mouse_x
    i.previous_mouse_y = i.mouse_y
    i.delta_x = 0.0
    i.delta_y = 0.0
    i.wheel = 0.0
    pressed_now = set()
    pressed_buttons = set()
    for event in events:
        kind = event[0]
        if kind == 'kd':
            key = int(event[1])
            if 0 < key < 512:
                if i.down[key] and key not in pressed_now:
                    i.repeat[key] = 1
                else:
                    pressed_now.add(key)
                    if len(i.key_queue) < 16:
                        i.key_queue.append(key)
                i.down[key] = 1
                if key == window.exit_key and window.exit_key:
                    window.should_close = True
        elif kind == 'ku':
            key = int(event[1])
            if 0 < key < 512:
                if key in pressed_now:
                    i.release_next.append(key)
                else:
                    i.down[key] = 0
        elif kind == 'ch':
            if len(i.char_queue) < 16:
                i.char_queue.append(int(event[1]))
        elif kind == 'md' or kind == 'mu':
            button = int(event[1])
            if 0 <= button < 8:
                if kind == 'md':
                    i.buttons[button] = 1
                    pressed_buttons.add(button)
                elif button in pressed_buttons:
                    i.buttons_release_next.append(button)
                else:
                    i.buttons[button] = 0
            i.mouse_x, i.mouse_y = float(event[2]), float(event[3])
        elif kind == 'mm':
            i.mouse_x, i.mouse_y = float(event[1]), float(event[2])
            i.delta_x += float(event[3])
            i.delta_y += float(event[4])
            i.on_screen = True
        elif kind == 'mw':
            i.wheel += float(event[1])
        elif kind == 'leave':
            i.on_screen = False
        elif kind == 'blur':
            i.down = bytearray(512)
            i.buttons = bytearray(8)
            i.release_next = []
            i.buttons_release_next = []
            i.focused = False
        elif kind == 'focus':
            i.focused = True
        elif kind == 'close':
            window.should_close = True
    if not window.cursor_locked:
        # Sem o mouse travado, o deslocamento é a diferença de posição entre os quadros.
        i.delta_x = i.mouse_x - i.previous_mouse_x
        i.delta_y = i.mouse_y - i.previous_mouse_y
