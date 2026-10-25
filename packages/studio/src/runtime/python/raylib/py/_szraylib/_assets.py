"""Imagens (na memória do Python) e texturas (na tela), como no rtextures.c do raylib.

* ``load_texture`` lê só o tamanho no cabeçalho do arquivo: quem decodifica é o navegador.
* ``load_image`` decodifica os pixels (RGBA) para o programa poder mexer neles; as operações de
  imagem (cinza, inverter, tingir, gradiente, recortar...) usam as contas do raylib.
* Formatos: PNG, JPG, BMP e GIF, os mesmos que o raylib do pacote ``raylib`` abre no computador.
"""
import math
import os
import struct as _bin

from . import _rt as rt
from . import _random
from ._args import color, integer, number, rect, struct, text, unpack_color, vec2
from ._structs import Color, Image, Rectangle, RenderTexture, Texture

FORMAT_GRAYSCALE = 1
FORMAT_GRAY_ALPHA = 2
FORMAT_R8G8B8 = 4
FORMAT_R8G8B8A8 = 7
_SUPPORTED = ('.png', '.jpg', '.jpeg', '.bmp', '.gif')


class Pixels(bytearray):
    """Os pixels RGBA de uma Image (o ``data`` do struct)."""

    def __repr__(self):
        return f'<pixels: {len(self) // 4} pixels RGBA>'


# Tamanho pelo cabeçalho -----------------------------------------------------------------------

def _png_size(head):
    if head[:8] == b'\x89PNG\r\n\x1a\n' and head[12:16] == b'IHDR':
        return _bin.unpack('>II', head[16:24])


def _gif_size(head):
    if head[:6] in (b'GIF87a', b'GIF89a'):
        return _bin.unpack('<HH', head[6:10])


def _bmp_size(head):
    if head[:2] == b'BM':
        width, height = _bin.unpack('<ii', head[18:26])
        return width, abs(height)


def _jpeg_size(path):
    with open(path, 'rb') as stream:
        if stream.read(2) != b'\xff\xd8':
            return None
        while True:
            marker = stream.read(2)
            if len(marker) < 2 or marker[0] != 0xFF:
                return None
            kind = marker[1]
            length = _bin.unpack('>H', stream.read(2))[0]
            if kind in (0xC0, 0xC1, 0xC2):
                stream.read(1)
                height, width = _bin.unpack('>HH', stream.read(4))
                return width, height
            stream.seek(length - 2, 1)


def _check_format(path, function):
    extension = os.path.splitext(str(path))[1].lower()
    if extension not in _SUPPORTED:
        hint = ' O raylib não abre SVG: use a versão PNG do desenho.' if extension == '.svg' else ''
        raise ValueError(f'{function}: o raylib abre imagens PNG, JPG, BMP e GIF, e o arquivo '
                         f'{path!r} é {extension or "sem extensão"}.{hint}')
    return extension


def file_size(absolute, path, function):
    with open(absolute, 'rb') as stream:
        head = stream.read(32)
    size = _png_size(head) or _gif_size(head) or _bmp_size(head) or _jpeg_size(absolute)
    if not size or not size[0] or not size[1]:
        raise ValueError(f'{function}: o arquivo {path!r} não é uma imagem PNG, JPG, BMP ou GIF '
                         'válida.')
    return size


# Texturas -------------------------------------------------------------------------------------

def load_texture(fileName, /):
    f = 'load_texture'
    path = text(fileName, f, 'fileName')
    rt.require_window(f)
    extension = _check_format(path, f)
    relative, absolute = rt.project_path(path, f)
    width, height = file_size(absolute, path, f)
    rt.count_texture(width, height, f)
    texture_id = rt.new_id()
    rt.pending_textures.append([texture_id, 'f', relative])
    fmt = FORMAT_R8G8B8 if extension in ('.jpg', '.jpeg') else FORMAT_R8G8B8A8
    return Texture(texture_id, width, height, 1, fmt)


def load_texture_from_image(image, /):
    f = 'load_texture_from_image'
    img = struct(image, Image, f, 'image')
    rt.require_window(f)
    if img.width <= 0 or img.height <= 0 or not isinstance(img.data, (bytes, bytearray)):
        print(f'Aviso: {f}: a imagem está vazia; a textura não terá nada.')
        return Texture(0, 0, 0, 0, 0)
    rt.count_texture(img.width, img.height, f)
    texture_id = rt.new_id()
    rt.pending_textures.append([texture_id, 'p', img.width, img.height, bytes(img.data)])
    return Texture(texture_id, img.width, img.height, 1, img.format)


def update_texture(texture, pixels, /):
    tex = struct(texture, Texture, 'update_texture', 'texture')
    data = bytes(pixels.data if isinstance(pixels, Image) else pixels)
    if len(data) != tex.width * tex.height * 4:
        raise ValueError('update_texture: os pixels precisam ter largura x altura x 4 bytes (RGBA).')
    rt.pending_textures.append([tex.id, 'p', tex.width, tex.height, data])


def unload_texture(texture, /):
    tex = struct(texture, Texture, 'unload_texture', 'texture')
    if tex.id > rt.DEFAULT_FONT_TEXTURE_ID:
        rt.pending_free.append(tex.id)
        rt.forget_texture(tex.width, tex.height)


def is_texture_valid(texture, /):
    tex = struct(texture, Texture, 'is_texture_valid', 'texture')
    return tex.id > 0 and tex.width > 0 and tex.height > 0


is_texture_ready = is_texture_valid


def set_texture_filter(texture, filter, /):
    tex = struct(texture, Texture, 'set_texture_filter', 'texture')
    mode = integer(filter, 'set_texture_filter', 'filter')
    rt.pending_textures.append([tex.id, 'filter', mode])


def set_texture_wrap(texture, wrap, /):
    tex = struct(texture, Texture, 'set_texture_wrap', 'texture')
    mode = integer(wrap, 'set_texture_wrap', 'wrap')
    rt.pending_textures.append([tex.id, 'wrap', mode])


def gen_texture_mipmaps(texture, /):
    return None


def load_render_texture(width, height, /):
    f = 'load_render_texture'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    rt.require_window(f)
    if w <= 0 or h <= 0:
        raise ValueError(f'{f}: largura e altura precisam ser maiores que zero.')
    rt.count_texture(w, h, f)
    texture_id = rt.new_id()
    rt.pending_textures.append([texture_id, 'r', w, h])
    return RenderTexture(texture_id, Texture(texture_id, w, h, 1, FORMAT_R8G8B8A8),
                         Texture(texture_id, w, h, 1, 19))


def unload_render_texture(target, /):
    rtx = struct(target, RenderTexture, 'unload_render_texture', 'target')
    if rtx.texture.id > rt.DEFAULT_FONT_TEXTURE_ID:
        rt.pending_free.append(rtx.texture.id)
        rt.forget_texture(rtx.texture.width, rtx.texture.height)


def is_render_texture_valid(target, /):
    rtx = struct(target, RenderTexture, 'is_render_texture_valid', 'target')
    return rtx.id > 0


# Imagens ----------------------------------------------------------------------------------------

def _image(width, height, data, fmt=FORMAT_R8G8B8A8):
    return Image(Pixels(data), width, height, 1, fmt)


def _ref(image, function):
    if type(image) is not Image:
        raise TypeError(f'{function} precisa de uma Image (a que load_image ou gen_image_... '
                        f'devolveu), mas recebeu {type(image).__name__}.')
    if not isinstance(image.data, bytearray):
        image.data = Pixels(image.data or b'')
    return image


def _restore_format(image):
    """Imagem em tons de cinza (formato 1) não tem transparência, como no raylib."""
    if image.format == FORMAT_GRAYSCALE:
        _to_gray(image)
    elif image.format == FORMAT_R8G8B8:
        data = image.data
        data[3::4] = b'\xff' * (len(data) // 4)


def _to_gray(image):
    data = image.data
    for i in range(0, len(data), 4):
        gray = int((data[i] / 255 * 0.299 + data[i + 1] / 255 * 0.587 + data[i + 2] / 255 * 0.114) * 255)
        data[i] = data[i + 1] = data[i + 2] = gray
        data[i + 3] = 255


def load_image(fileName, /):
    f = 'load_image'
    path = text(fileName, f, 'fileName')
    extension = _check_format(path, f)
    relative, absolute = rt.project_path(path, f)
    width, height = file_size(absolute, path, f)
    pixels = rt.decode_image(absolute)
    if len(pixels) != width * height * 4:
        raise RuntimeError(f'{f}: não consegui ler os pixels de {path!r}.')
    image = _image(width, height, bytes(pixels),
                   FORMAT_R8G8B8 if extension in ('.jpg', '.jpeg') else FORMAT_R8G8B8A8)
    return image


def unload_image(image, /):
    if type(image) is Image:
        image.data = Pixels()


def is_image_valid(image, /):
    return type(image) is Image and image.width > 0 and image.height > 0 and bool(image.data)


is_image_ready = is_image_valid


def image_copy(image, /):
    img = struct(image, Image, 'image_copy', 'image')
    return Image(Pixels(img.data or b''), img.width, img.height, img.mipmaps, img.format)


def gen_image_color(width, height, color_, /):
    f = 'gen_image_color'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    packed = color(color_, f)
    pixel = _bin.pack('>I', packed)
    return _image(w, h, pixel * (max(w, 0) * max(h, 0)))


def gen_image_gradient_linear(width, height, direction, start, end, /):
    f = 'gen_image_gradient_linear'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    d = integer(direction, f, 'direction')
    s = unpack_color(color(start, f, 'start'))
    e = unpack_color(color(end, f, 'end'))
    radian = (90 - d) / 180.0 * 3.14159
    cos_d, sin_d = math.cos(radian), math.sin(radian)
    starting = 0.5 - (cos_d * w / 2) - (sin_d * h / 2)
    same_sign = (math.copysign(1, sin_d) < 0) == (math.copysign(1, cos_d) < 0)
    maximum = abs(starting) if same_sign else abs(starting + w * cos_d)
    data = bytearray(w * h * 4)
    for i in range(w):
        for j in range(h):
            factor = (starting + (i * cos_d + j * sin_d)) / maximum if maximum else 0.0
            factor = max(-1.0, min(1.0, factor)) / 2.0 + 0.5
            k = (j * w + i) * 4
            data[k] = int(e.r * factor + s.r * (1 - factor))
            data[k + 1] = int(e.g * factor + s.g * (1 - factor))
            data[k + 2] = int(e.b * factor + s.b * (1 - factor))
            data[k + 3] = int(e.a * factor + s.a * (1 - factor))
    return _image(w, h, data)


def _blend(distance, span):
    """O fator do gradiente como no C: dividir por zero dá infinito (ou nan, que vira 0)."""
    if span == 0:
        return 1.0 if distance > 0 else 0.0
    return min(max(distance / span, 0.0), 1.0)


def gen_image_gradient_radial(width, height, density, inner, outer, /):
    f = 'gen_image_gradient_radial'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    dens = number(density, f, 'density')
    a = unpack_color(color(inner, f, 'inner'))
    b = unpack_color(color(outer, f, 'outer'))
    radius = (w if w < h else h) / 2.0
    cx, cy = w / 2.0, h / 2.0
    data = bytearray(w * h * 4)
    span = radius * (1.0 - dens)
    for y in range(h):
        for x in range(w):
            dist = math.hypot(x - cx, y - cy)
            factor = _blend(dist - radius * dens, span)
            k = (y * w + x) * 4
            data[k] = int(b.r * factor + a.r * (1 - factor))
            data[k + 1] = int(b.g * factor + a.g * (1 - factor))
            data[k + 2] = int(b.b * factor + a.b * (1 - factor))
            data[k + 3] = int(b.a * factor + a.a * (1 - factor))
    return _image(w, h, data)


def gen_image_gradient_square(width, height, density, inner, outer, /):
    f = 'gen_image_gradient_square'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    dens = number(density, f, 'density')
    a = unpack_color(color(inner, f, 'inner'))
    b = unpack_color(color(outer, f, 'outer'))
    cx, cy = w / 2.0, h / 2.0
    data = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            nx = abs(x - cx) / cx if cx else 0.0
            ny = abs(y - cy) / cy if cy else 0.0
            dist = max(nx, ny)
            factor = _blend(dist - dens, 1.0 - dens)
            k = (y * w + x) * 4
            data[k] = int(b.r * factor + a.r * (1 - factor))
            data[k + 1] = int(b.g * factor + a.g * (1 - factor))
            data[k + 2] = int(b.b * factor + a.b * (1 - factor))
            data[k + 3] = int(b.a * factor + a.a * (1 - factor))
    return _image(w, h, data)


def gen_image_checked(width, height, checksX, checksY, col1, col2, /):
    f = 'gen_image_checked'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    cx, cy = integer(checksX, f, 'checksX'), integer(checksY, f, 'checksY')
    if cx <= 0 or cy <= 0:
        raise ZeroDivisionError(f'{f}: checksX e checksY precisam ser maiores que zero.')
    one = _bin.pack('>I', color(col1, f, 'col1'))
    two = _bin.pack('>I', color(col2, f, 'col2'))
    data = bytearray()
    for y in range(h):
        data += b''.join(one if (x // cx + y // cy) % 2 == 0 else two for x in range(w))
    return _image(w, h, data)


def gen_image_white_noise(width, height, factor, /):
    f = 'gen_image_white_noise'
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    chance = int(number(factor, f, 'factor') * 100)
    white, black = b'\xff\xff\xff\xff', b'\x00\x00\x00\xff'
    data = b''.join(white if _random.get_value(0, 99) < chance else black for _ in range(w * h))
    return _image(w, h, data)


def image_color_grayscale(image, /):
    img = _ref(image, 'image_color_grayscale')
    img.format = FORMAT_GRAYSCALE
    _to_gray(img)


def image_color_invert(image, /):
    img = _ref(image, 'image_color_invert')
    data = img.data
    table = bytes(255 - i for i in range(256))
    alpha = bytes(data[3::4])
    data[:] = data.translate(table)
    data[3::4] = alpha
    _restore_format(img)


def image_color_tint(image, color_, /):
    img = _ref(image, 'image_color_tint')
    c = unpack_color(color(color_, 'image_color_tint'))
    data = img.data
    for channel, value in enumerate((c.r, c.g, c.b, c.a)):
        table = bytes((i * value) // 255 for i in range(256))
        data[channel::4] = bytes(data[channel::4]).translate(table)
    _restore_format(img)


def image_color_brightness(image, brightness, /):
    img = _ref(image, 'image_color_brightness')
    amount = max(-255, min(255, integer(brightness, 'image_color_brightness', 'brightness')))
    # ImageColorBrightness: o que passa de 0 para baixo vira 1 (não 0), como no C.
    table = bytes(1 if i + amount < 0 else min(255, i + amount) for i in range(256))
    data = img.data
    for channel in range(3):
        data[channel::4] = bytes(data[channel::4]).translate(table)
    _restore_format(img)


def image_color_contrast(image, contrast, /):
    img = _ref(image, 'image_color_contrast')
    amount = max(-100, min(100, integer(contrast, 'image_color_contrast', 'contrast')))
    factor = ((100.0 + amount) / 100.0) ** 2
    table = bytes(max(0, min(255, int((((i / 255.0) - 0.5) * factor + 0.5) * 255.0)))
                  for i in range(256))
    data = img.data
    for channel in range(3):
        data[channel::4] = bytes(data[channel::4]).translate(table)
    _restore_format(img)


def image_color_replace(image, color_, replace, /):
    img = _ref(image, 'image_color_replace')
    old = _bin.pack('>I', color(color_, 'image_color_replace', 'color'))
    new = _bin.pack('>I', color(replace, 'image_color_replace', 'replace'))
    data = img.data
    for i in range(0, len(data), 4):
        if data[i:i + 4] == old:
            data[i:i + 4] = new


def image_flip_vertical(image, /):
    img = _ref(image, 'image_flip_vertical')
    row = img.width * 4
    data = img.data
    rows = [data[i:i + row] for i in range(0, len(data), row)]
    data[:] = b''.join(reversed(rows))


def image_flip_horizontal(image, /):
    img = _ref(image, 'image_flip_horizontal')
    row = img.width * 4
    data = img.data
    out = bytearray()
    for start in range(0, len(data), row):
        line = data[start:start + row]
        out += b''.join(line[i:i + 4] for i in range(row - 4, -1, -4))
    data[:] = out


def image_rotate_cw(image, /):
    img = _ref(image, 'image_rotate_cw')
    w, h, data = img.width, img.height, img.data
    out = bytearray(len(data))
    for y in range(h):
        for x in range(w):
            src = (y * w + x) * 4
            dst = (x * h + (h - 1 - y)) * 4
            out[dst:dst + 4] = data[src:src + 4]
    data[:] = out
    img.width, img.height = h, w


def image_rotate_ccw(image, /):
    img = _ref(image, 'image_rotate_ccw')
    w, h, data = img.width, img.height, img.data
    out = bytearray(len(data))
    for y in range(h):
        for x in range(w):
            src = (y * w + x) * 4
            dst = ((w - 1 - x) * h + y) * 4
            out[dst:dst + 4] = data[src:src + 4]
    data[:] = out
    img.width, img.height = h, w


def image_from_image(image, rec, /):
    f = 'image_from_image'
    img = struct(image, Image, f, 'image')
    x, y, w, h = (int(v) for v in rect(rec, f, 'rec'))
    out = bytearray()
    row = img.width * 4
    for line in range(y, y + h):
        if 0 <= line < img.height:
            start = line * row + max(0, x) * 4
            end = line * row + min(img.width, x + w) * 4
            out += img.data[start:end]
    width = max(0, min(img.width, x + w) - max(0, x))
    height = len(out) // (width * 4) if width else 0
    return _image(width, height, out, img.format)


def image_crop(image, crop, /):
    f = 'image_crop'
    img = _ref(image, f)
    # ImageCrop: com o retângulo começando fora da imagem, o C avisa e não muda nada.
    r = rect(crop, f, 'crop')
    x, y = max(0.0, r[0]), max(0.0, r[1])
    if x > img.width or y > img.height or not img.width or not img.height:
        print('WARNING: IMAGE: Failed to crop, rectangle out of bounds')
        return
    result = image_from_image(img, crop)
    img.data[:] = result.data
    img.width, img.height = result.width, result.height


def image_resize_nn(image, newWidth, newHeight, /):
    f = 'image_resize_nn'
    img = _ref(image, f)
    nw, nh = integer(newWidth, f, 'newWidth'), integer(newHeight, f, 'newHeight')
    w, h, data = img.width, img.height, img.data
    x_ratio = int((w << 16) / nw) + 1 if nw else 0
    y_ratio = int((h << 16) / nh) + 1 if nh else 0
    out = bytearray()
    for y in range(nh):
        sy = (y * y_ratio) >> 16
        for x in range(nw):
            sx = (x * x_ratio) >> 16
            k = (sy * w + sx) * 4
            out += data[k:k + 4]
    data[:] = out
    img.width, img.height = nw, nh


def image_resize(image, newWidth, newHeight, /):
    """Bilinear (o raylib usa o stb_image_resize; a diferença é de arredondamento)."""
    f = 'image_resize'
    img = _ref(image, f)
    nw, nh = integer(newWidth, f, 'newWidth'), integer(newHeight, f, 'newHeight')
    w, h, data = img.width, img.height, img.data
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        fy = (y + 0.5) * h / nh - 0.5
        y0 = max(0, min(h - 1, int(math.floor(fy))))
        y1 = min(h - 1, y0 + 1)
        ty = min(1.0, max(0.0, fy - y0))
        for x in range(nw):
            fx = (x + 0.5) * w / nw - 0.5
            x0 = max(0, min(w - 1, int(math.floor(fx))))
            x1 = min(w - 1, x0 + 1)
            tx = min(1.0, max(0.0, fx - x0))
            k = (y * nw + x) * 4
            for c in range(4):
                a = data[(y0 * w + x0) * 4 + c] * (1 - tx) + data[(y0 * w + x1) * 4 + c] * tx
                b = data[(y1 * w + x0) * 4 + c] * (1 - tx) + data[(y1 * w + x1) * 4 + c] * tx
                out[k + c] = int(a * (1 - ty) + b * ty + 0.5)
    data[:] = out
    img.width, img.height = nw, nh


def get_image_color(image, x, y, /):
    f = 'get_image_color'
    img = struct(image, Image, f, 'image')
    px, py = integer(x, f, 'x'), integer(y, f, 'y')
    if 0 <= px < img.width and 0 <= py < img.height and img.data:
        k = (py * img.width + px) * 4
        d = img.data
        return Color(d[k], d[k + 1], d[k + 2], d[k + 3])
    return Color(0, 0, 0, 0)


def image_draw_pixel(dst, posX, posY, color_, /):
    f = 'image_draw_pixel'
    img = _ref(dst, f)
    x, y = integer(posX, f, 'posX'), integer(posY, f, 'posY')
    if 0 <= x < img.width and 0 <= y < img.height:
        k = (y * img.width + x) * 4
        img.data[k:k + 4] = _bin.pack('>I', color(color_, f))


def image_draw_rectangle(dst, posX, posY, width, height, color_, /):
    f = 'image_draw_rectangle'
    img = _ref(dst, f)
    x, y = integer(posX, f, 'posX'), integer(posY, f, 'posY')
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    pixel = _bin.pack('>I', color(color_, f))
    x0, x1 = max(0, x), min(img.width, x + w)
    for line in range(max(0, y), min(img.height, y + h)):
        if x1 > x0:
            start = (line * img.width + x0) * 4
            img.data[start:start + (x1 - x0) * 4] = pixel * (x1 - x0)


def image_clear_background(dst, color_, /):
    img = _ref(dst, 'image_clear_background')
    img.data[:] = _bin.pack('>I', color(color_, 'image_clear_background')) * (img.width * img.height)


def load_image_colors(image, /):
    img = struct(image, Image, 'load_image_colors', 'image')
    d = img.data
    from ._ffi import Pointer
    return Pointer('Color *', [Color(d[i], d[i + 1], d[i + 2], d[i + 3]) for i in range(0, len(d), 4)])


def unload_image_colors(colors, /):
    return None


def get_image_alpha_border(image, threshold, /):
    f = 'get_image_alpha_border'
    img = struct(image, Image, f, 'image')
    limit = int(number(threshold, f, 'threshold') * 255)
    left, top, right, bottom = img.width, img.height, -1, -1
    d = img.data
    for y in range(img.height):
        for x in range(img.width):
            if d[(y * img.width + x) * 4 + 3] > limit:
                left, right = min(left, x), max(right, x)
                top, bottom = min(top, y), max(bottom, y)
    if right < 0:
        return Rectangle(0, 0, 0, 0)
    return Rectangle(left, top, right + 1 - left, bottom + 1 - top)
