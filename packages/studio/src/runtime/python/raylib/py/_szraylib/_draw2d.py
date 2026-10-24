"""Desenho 2D (rshapes, rtextures e rtext do raylib): cada função grava um registro na lista do
quadro. Quem transforma o registro em triângulos é o navegador, com as mesmas contas do raylib
(número de segmentos do círculo, linha grossa como faixa, cantos arredondados...).
"""
import math

from . import _rt as rt
from ._args import color, integer, number, rect, struct, text, vec2
from ._structs import Camera2D, Font, NPatchInfo, RenderTexture, Texture

_ops = rt.ops
_extend = _ops.extend


def _drawing(function):
    if not rt.window.open:
        rt.require_window(function)


# Fundo e modos ------------------------------------------------------------------------------

def clear_background(color_, /):
    c = color(color_, 'clear_background', 'color')
    _drawing('clear_background')
    _extend((rt.OP_CLEAR, c))


def begin_drawing():
    rt.require_window('begin_drawing')
    rt.window.drawing = True


def end_drawing():
    rt.require_window('end_drawing')
    w = rt.window
    if w.mode_2d:
        _extend((rt.OP_END_2D,))
        w.mode_2d = False
    if w.texture_mode:
        _extend((rt.OP_END_TEXTURE,))
        w.texture_mode = False
    w.drawing = False
    rt.check_records()
    rt.present()
    del _ops[:]


def begin_mode_2d(camera, /):
    cam = struct(camera, Camera2D, 'begin_mode_2d', 'camera')
    _drawing('begin_mode_2d')
    _extend((rt.OP_BEGIN_2D, cam.offset.x, cam.offset.y, cam.target.x, cam.target.y,
             cam.rotation, cam.zoom))
    rt.window.mode_2d = True


def end_mode_2d():
    _drawing('end_mode_2d')
    _extend((rt.OP_END_2D,))
    rt.window.mode_2d = False


def begin_texture_mode(target, /):
    rt_ = struct(target, RenderTexture, 'begin_texture_mode', 'target')
    _drawing('begin_texture_mode')
    _extend((rt.OP_BEGIN_TEXTURE, rt_.texture.id))
    rt.window.texture_mode = True


def end_texture_mode():
    _drawing('end_texture_mode')
    _extend((rt.OP_END_TEXTURE,))
    rt.window.texture_mode = False


def begin_scissor_mode(x, y, width, height, /):
    f = 'begin_scissor_mode'
    _drawing(f)
    _extend((rt.OP_BEGIN_SCISSOR, integer(x, f, 'x'), integer(y, f, 'y'),
             integer(width, f, 'width'), integer(height, f, 'height')))


def end_scissor_mode():
    _drawing('end_scissor_mode')
    _extend((rt.OP_END_SCISSOR,))


def begin_blend_mode(mode, /):
    _drawing('begin_blend_mode')
    _extend((rt.OP_BEGIN_BLEND, integer(mode, 'begin_blend_mode', 'mode')))


def end_blend_mode():
    _drawing('end_blend_mode')
    _extend((rt.OP_END_BLEND,))


# Matriz do rlgl (empilhar, mover, girar, escalar) -------------------------------------------

def rl_push_matrix():
    _drawing('rl_push_matrix')
    _extend((rt.OP_PUSH,))


def rl_pop_matrix():
    _drawing('rl_pop_matrix')
    _extend((rt.OP_POP,))


def rl_translatef(x, y, z, /):
    f = 'rl_translatef'
    _drawing(f)
    _extend((rt.OP_TRANSLATE, number(x, f, 'x'), number(y, f, 'y'), number(z, f, 'z')))


def rl_rotatef(angle, x, y, z, /):
    f = 'rl_rotatef'
    _drawing(f)
    _extend((rt.OP_ROTATE, number(angle, f, 'angle'), number(x, f, 'x'), number(y, f, 'y'),
             number(z, f, 'z')))


def rl_scalef(x, y, z, /):
    f = 'rl_scalef'
    _drawing(f)
    _extend((rt.OP_SCALE, number(x, f, 'x'), number(y, f, 'y'), number(z, f, 'z')))


# Pontos e linhas ----------------------------------------------------------------------------

def draw_pixel(posX, posY, color_, /):
    f = 'draw_pixel'
    _drawing(f)
    _extend((rt.OP_PIXEL, integer(posX, f, 'posX'), integer(posY, f, 'posY'), color(color_, f)))


def draw_pixel_v(position, color_, /):
    f = 'draw_pixel_v'
    x, y = vec2(position, f, 'position')
    _drawing(f)
    _extend((rt.OP_PIXEL, x, y, color(color_, f)))


def draw_line(startPosX, startPosY, endPosX, endPosY, color_, /):
    f = 'draw_line'
    _drawing(f)
    _extend((rt.OP_LINE, integer(startPosX, f, 'startPosX'), integer(startPosY, f, 'startPosY'),
             integer(endPosX, f, 'endPosX'), integer(endPosY, f, 'endPosY'), color(color_, f)))


def draw_line_v(startPos, endPos, color_, /):
    f = 'draw_line_v'
    x1, y1 = vec2(startPos, f, 'startPos')
    x2, y2 = vec2(endPos, f, 'endPos')
    _drawing(f)
    _extend((rt.OP_LINE, x1, y1, x2, y2, color(color_, f)))


def draw_line_ex(startPos, endPos, thick, color_, /):
    f = 'draw_line_ex'
    x1, y1 = vec2(startPos, f, 'startPos')
    x2, y2 = vec2(endPos, f, 'endPos')
    _drawing(f)
    _extend((rt.OP_LINE_EX, x1, y1, x2, y2, number(thick, f, 'thick'), color(color_, f)))


def draw_line_strip(points, pointCount, color_, /):
    f = 'draw_line_strip'
    count = integer(pointCount, f, 'pointCount')
    pts = _points(points, count, f)
    c = color(color_, f)
    _drawing(f)
    for i in range(len(pts) - 1):
        _extend((rt.OP_LINE, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c))


def draw_line_bezier(startPos, endPos, thick, color_, /):
    f = 'draw_line_bezier'
    x1, y1 = vec2(startPos, f, 'startPos')
    x2, y2 = vec2(endPos, f, 'endPos')
    _drawing(f)
    _extend((rt.OP_LINE_BEZIER, x1, y1, x2, y2, number(thick, f, 'thick'), color(color_, f)))


def draw_line_dashed(startPos, endPos, dashSize, spaceSize, color_, /):
    f = 'draw_line_dashed'
    x1, y1 = vec2(startPos, f, 'startPos')
    x2, y2 = vec2(endPos, f, 'endPos')
    dash = integer(dashSize, f, 'dashSize')
    space = integer(spaceSize, f, 'spaceSize')
    c = color(color_, f)
    _drawing(f)
    dx, dy = x2 - x1, y2 - y1
    length = math.sqrt(dx * dx + dy * dy)
    if length < dash + space or dash <= 0:
        _extend((rt.OP_LINE, x1, y1, x2, y2, c))
        return
    ux, uy = dx / length, dy / length
    travelled = 0.0
    while travelled < length:
        end = min(travelled + dash, length)
        _extend((rt.OP_LINE, x1 + travelled * ux, y1 + travelled * uy, x1 + end * ux,
                 y1 + end * uy, c))
        travelled = end + space


def _points(points, count, function):
    if count < 0:
        raise ValueError(f'{function}: pointCount não pode ser negativo.')
    try:
        items = list(points)
    except TypeError:
        raise TypeError(f'{function}: points precisa ser uma lista de Vector2.') from None
    if count > len(items):
        raise ValueError(f'{function}: pointCount ({count}) é maior que a lista de pontos '
                         f'({len(items)}).')
    return [vec2(item, function, 'points') for item in items[:count]]


# Círculos, elipses e anéis ------------------------------------------------------------------

def draw_circle(centerX, centerY, radius, color_, /):
    f = 'draw_circle'
    _drawing(f)
    _extend((rt.OP_CIRCLE_SECTOR, integer(centerX, f, 'centerX'), integer(centerY, f, 'centerY'),
             number(radius, f, 'radius'), 0, 360, 36, color(color_, f)))


def draw_circle_v(center, radius, color_, /):
    f = 'draw_circle_v'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_CIRCLE_SECTOR, x, y, number(radius, f, 'radius'), 0, 360, 36, color(color_, f)))


def draw_circle_sector(center, radius, startAngle, endAngle, segments, color_, /):
    f = 'draw_circle_sector'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_CIRCLE_SECTOR, x, y, number(radius, f, 'radius'),
             number(startAngle, f, 'startAngle'), number(endAngle, f, 'endAngle'),
             integer(segments, f, 'segments'), color(color_, f)))


def draw_circle_sector_lines(center, radius, startAngle, endAngle, segments, color_, /):
    f = 'draw_circle_sector_lines'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_CIRCLE_SECTOR_LINES, x, y, number(radius, f, 'radius'),
             number(startAngle, f, 'startAngle'), number(endAngle, f, 'endAngle'),
             integer(segments, f, 'segments'), color(color_, f)))


def draw_circle_gradient(center, radius, inner, outer, /):
    f = 'draw_circle_gradient'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_CIRCLE_GRADIENT, x, y, number(radius, f, 'radius'), color(inner, f, 'inner'),
             color(outer, f, 'outer')))


def draw_circle_lines(centerX, centerY, radius, color_, /):
    f = 'draw_circle_lines'
    _drawing(f)
    _extend((rt.OP_CIRCLE_LINES, integer(centerX, f, 'centerX'), integer(centerY, f, 'centerY'),
             number(radius, f, 'radius'), color(color_, f)))


def draw_circle_lines_v(center, radius, color_, /):
    f = 'draw_circle_lines_v'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_CIRCLE_LINES, x, y, number(radius, f, 'radius'), color(color_, f)))


def draw_ellipse(centerX, centerY, radiusH, radiusV, color_, /):
    f = 'draw_ellipse'
    _drawing(f)
    _extend((rt.OP_ELLIPSE, integer(centerX, f, 'centerX'), integer(centerY, f, 'centerY'),
             number(radiusH, f, 'radiusH'), number(radiusV, f, 'radiusV'), color(color_, f)))


def draw_ellipse_v(center, radiusH, radiusV, color_, /):
    f = 'draw_ellipse_v'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_ELLIPSE, x, y, number(radiusH, f, 'radiusH'), number(radiusV, f, 'radiusV'),
             color(color_, f)))


def draw_ellipse_lines(centerX, centerY, radiusH, radiusV, color_, /):
    f = 'draw_ellipse_lines'
    _drawing(f)
    _extend((rt.OP_ELLIPSE_LINES, integer(centerX, f, 'centerX'), integer(centerY, f, 'centerY'),
             number(radiusH, f, 'radiusH'), number(radiusV, f, 'radiusV'), color(color_, f)))


def draw_ellipse_lines_v(center, radiusH, radiusV, color_, /):
    f = 'draw_ellipse_lines_v'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_ELLIPSE_LINES, x, y, number(radiusH, f, 'radiusH'),
             number(radiusV, f, 'radiusV'), color(color_, f)))


def draw_ring(center, innerRadius, outerRadius, startAngle, endAngle, segments, color_, /):
    f = 'draw_ring'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_RING, x, y, number(innerRadius, f, 'innerRadius'),
             number(outerRadius, f, 'outerRadius'), number(startAngle, f, 'startAngle'),
             number(endAngle, f, 'endAngle'), integer(segments, f, 'segments'), color(color_, f)))


def draw_ring_lines(center, innerRadius, outerRadius, startAngle, endAngle, segments, color_, /):
    f = 'draw_ring_lines'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_RING_LINES, x, y, number(innerRadius, f, 'innerRadius'),
             number(outerRadius, f, 'outerRadius'), number(startAngle, f, 'startAngle'),
             number(endAngle, f, 'endAngle'), integer(segments, f, 'segments'), color(color_, f)))


# Retângulos ---------------------------------------------------------------------------------

def draw_rectangle(posX, posY, width, height, color_, /):
    f = 'draw_rectangle'
    _drawing(f)
    _extend((rt.OP_RECT_PRO, integer(posX, f, 'posX'), integer(posY, f, 'posY'),
             integer(width, f, 'width'), integer(height, f, 'height'), 0, 0, 0, color(color_, f)))


def draw_rectangle_v(position, size, color_, /):
    f = 'draw_rectangle_v'
    x, y = vec2(position, f, 'position')
    w, h = vec2(size, f, 'size')
    _drawing(f)
    _extend((rt.OP_RECT_PRO, x, y, w, h, 0, 0, 0, color(color_, f)))


def draw_rectangle_rec(rec, color_, /):
    f = 'draw_rectangle_rec'
    x, y, w, h = rect(rec, f, 'rec')
    _drawing(f)
    _extend((rt.OP_RECT_PRO, x, y, w, h, 0, 0, 0, color(color_, f)))


def draw_rectangle_pro(rec, origin, rotation, color_, /):
    f = 'draw_rectangle_pro'
    x, y, w, h = rect(rec, f, 'rec')
    ox, oy = vec2(origin, f, 'origin')
    _drawing(f)
    _extend((rt.OP_RECT_PRO, x, y, w, h, ox, oy, number(rotation, f, 'rotation'), color(color_, f)))


def draw_rectangle_gradient_v(posX, posY, width, height, top, bottom, /):
    f = 'draw_rectangle_gradient_v'
    t, b = color(top, f, 'top'), color(bottom, f, 'bottom')
    _drawing(f)
    _extend((rt.OP_RECT_GRADIENT, integer(posX, f, 'posX'), integer(posY, f, 'posY'),
             integer(width, f, 'width'), integer(height, f, 'height'), t, b, b, t))


def draw_rectangle_gradient_h(posX, posY, width, height, left, right, /):
    f = 'draw_rectangle_gradient_h'
    left_, right_ = color(left, f, 'left'), color(right, f, 'right')
    _drawing(f)
    _extend((rt.OP_RECT_GRADIENT, integer(posX, f, 'posX'), integer(posY, f, 'posY'),
             integer(width, f, 'width'), integer(height, f, 'height'), left_, left_, right_, right_))


def draw_rectangle_gradient_ex(rec, topLeft, bottomLeft, bottomRight, topRight, /):
    f = 'draw_rectangle_gradient_ex'
    x, y, w, h = rect(rec, f, 'rec')
    _drawing(f)
    _extend((rt.OP_RECT_GRADIENT, x, y, w, h, color(topLeft, f, 'topLeft'),
             color(bottomLeft, f, 'bottomLeft'), color(bottomRight, f, 'bottomRight'),
             color(topRight, f, 'topRight')))


def draw_rectangle_lines(posX, posY, width, height, color_, /):
    f = 'draw_rectangle_lines'
    _drawing(f)
    _extend((rt.OP_RECT_LINES, integer(posX, f, 'posX'), integer(posY, f, 'posY'),
             integer(width, f, 'width'), integer(height, f, 'height'), color(color_, f)))


def draw_rectangle_lines_ex(rec, lineThick, color_, /):
    f = 'draw_rectangle_lines_ex'
    x, y, w, h = rect(rec, f, 'rec')
    _drawing(f)
    _extend((rt.OP_RECT_LINES_EX, x, y, w, h, number(lineThick, f, 'lineThick'), color(color_, f)))


def draw_rectangle_rounded(rec, roundness, segments, color_, /):
    f = 'draw_rectangle_rounded'
    x, y, w, h = rect(rec, f, 'rec')
    _drawing(f)
    _extend((rt.OP_RECT_ROUNDED, x, y, w, h, number(roundness, f, 'roundness'),
             integer(segments, f, 'segments'), color(color_, f)))


def draw_rectangle_rounded_lines(rec, roundness, segments, color_, /):
    f = 'draw_rectangle_rounded_lines'
    x, y, w, h = rect(rec, f, 'rec')
    _drawing(f)
    _extend((rt.OP_RECT_ROUNDED_LINES, x, y, w, h, number(roundness, f, 'roundness'),
             integer(segments, f, 'segments'), 1.0, color(color_, f)))


def draw_rectangle_rounded_lines_ex(rec, roundness, segments, lineThick, color_, /):
    f = 'draw_rectangle_rounded_lines_ex'
    x, y, w, h = rect(rec, f, 'rec')
    _drawing(f)
    _extend((rt.OP_RECT_ROUNDED_LINES, x, y, w, h, number(roundness, f, 'roundness'),
             integer(segments, f, 'segments'), number(lineThick, f, 'lineThick'), color(color_, f)))


# Triângulos e polígonos ---------------------------------------------------------------------

def draw_triangle(v1, v2, v3, color_, /):
    f = 'draw_triangle'
    a = vec2(v1, f, 'v1')
    b = vec2(v2, f, 'v2')
    c = vec2(v3, f, 'v3')
    _drawing(f)
    _extend((rt.OP_TRIANGLE, a[0], a[1], b[0], b[1], c[0], c[1], color(color_, f)))


def draw_triangle_lines(v1, v2, v3, color_, /):
    f = 'draw_triangle_lines'
    a = vec2(v1, f, 'v1')
    b = vec2(v2, f, 'v2')
    c = vec2(v3, f, 'v3')
    _drawing(f)
    _extend((rt.OP_TRIANGLE_LINES, a[0], a[1], b[0], b[1], c[0], c[1], color(color_, f)))


def draw_triangle_fan(points, pointCount, color_, /):
    f = 'draw_triangle_fan'
    pts = _points(points, integer(pointCount, f, 'pointCount'), f)
    c = color(color_, f)
    _drawing(f)
    if len(pts) >= 3:
        for i in range(1, len(pts) - 1):
            _extend((rt.OP_TRIANGLE, pts[0][0], pts[0][1], pts[i][0], pts[i][1],
                     pts[i + 1][0], pts[i + 1][1], c))


def draw_triangle_strip(points, pointCount, color_, /):
    f = 'draw_triangle_strip'
    pts = _points(points, integer(pointCount, f, 'pointCount'), f)
    c = color(color_, f)
    _drawing(f)
    for i in range(2, len(pts)):
        a, b, d = (pts[i], pts[i - 2], pts[i - 1]) if i % 2 == 0 else (pts[i], pts[i - 1], pts[i - 2])
        _extend((rt.OP_TRIANGLE, a[0], a[1], b[0], b[1], d[0], d[1], c))


def draw_poly(center, sides, radius, rotation, color_, /):
    f = 'draw_poly'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_POLY, x, y, integer(sides, f, 'sides'), number(radius, f, 'radius'),
             number(rotation, f, 'rotation'), color(color_, f)))


def draw_poly_lines(center, sides, radius, rotation, color_, /):
    f = 'draw_poly_lines'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_POLY_LINES, x, y, integer(sides, f, 'sides'), number(radius, f, 'radius'),
             number(rotation, f, 'rotation'), color(color_, f)))


def draw_poly_lines_ex(center, sides, radius, rotation, lineThick, color_, /):
    f = 'draw_poly_lines_ex'
    x, y = vec2(center, f, 'center')
    _drawing(f)
    _extend((rt.OP_POLY_LINES_EX, x, y, integer(sides, f, 'sides'), number(radius, f, 'radius'),
             number(rotation, f, 'rotation'), number(lineThick, f, 'lineThick'), color(color_, f)))


# Texturas -----------------------------------------------------------------------------------

def _texture(value, function):
    if type(value) is Texture:
        return value
    return struct(value, Texture, function, 'texture')


def _texture_pro(tex, sx, sy, sw, sh, dx, dy, dw, dh, ox, oy, rotation, tint):
    _extend((rt.OP_TEXTURE, tex.id, tex.width, tex.height, sx, sy, sw, sh, dx, dy, dw, dh, ox, oy,
             rotation, tint))


def draw_texture(texture, posX, posY, tint, /):
    f = 'draw_texture'
    tex = _texture(texture, f)
    x, y = integer(posX, f, 'posX'), integer(posY, f, 'posY')
    c = color(tint, f, 'tint')
    _drawing(f)
    w, h = tex.width, tex.height
    _texture_pro(tex, 0, 0, w, h, x, y, w, h, 0, 0, 0, c)


def draw_texture_v(texture, position, tint, /):
    f = 'draw_texture_v'
    tex = _texture(texture, f)
    x, y = vec2(position, f, 'position')
    c = color(tint, f, 'tint')
    _drawing(f)
    w, h = tex.width, tex.height
    _texture_pro(tex, 0, 0, w, h, x, y, w, h, 0, 0, 0, c)


def draw_texture_ex(texture, position, rotation, scale, tint, /):
    f = 'draw_texture_ex'
    tex = _texture(texture, f)
    x, y = vec2(position, f, 'position')
    r = number(rotation, f, 'rotation')
    s = number(scale, f, 'scale')
    c = color(tint, f, 'tint')
    _drawing(f)
    w, h = tex.width, tex.height
    _texture_pro(tex, 0, 0, w, h, x, y, w * s, h * s, 0, 0, r, c)


def draw_texture_rec(texture, source, position, tint, /):
    f = 'draw_texture_rec'
    tex = _texture(texture, f)
    sx, sy, sw, sh = rect(source, f, 'source')
    x, y = vec2(position, f, 'position')
    c = color(tint, f, 'tint')
    _drawing(f)
    _texture_pro(tex, sx, sy, sw, sh, x, y, abs(sw), abs(sh), 0, 0, 0, c)


def draw_texture_pro(texture, source, dest, origin, rotation, tint, /):
    f = 'draw_texture_pro'
    tex = _texture(texture, f)
    sx, sy, sw, sh = rect(source, f, 'source')
    dx, dy, dw, dh = rect(dest, f, 'dest')
    ox, oy = vec2(origin, f, 'origin')
    r = number(rotation, f, 'rotation')
    c = color(tint, f, 'tint')
    _drawing(f)
    _texture_pro(tex, sx, sy, sw, sh, dx, dy, dw, dh, ox, oy, r, c)


def draw_texture_npatch(texture, nPatchInfo, dest, origin, rotation, tint, /):
    f = 'draw_texture_npatch'
    tex = _texture(texture, f)
    info = struct(nPatchInfo, NPatchInfo, f, 'nPatchInfo')
    dx, dy, dw, dh = rect(dest, f, 'dest')
    ox, oy = vec2(origin, f, 'origin')
    _drawing(f)
    s = info.source
    _extend((rt.OP_TEXTURE_NPATCH, tex.id, tex.width, tex.height, s.x, s.y, s.width, s.height,
             info.left, info.top, info.right, info.bottom, info.layout, dx, dy, dw, dh, ox, oy,
             number(rotation, f, 'rotation'), color(tint, f, 'tint')))


# Texto ----------------------------------------------------------------------------------------

def draw_text(text_, posX, posY, fontSize, color_, /):
    from . import _text
    f = 'draw_text'
    value = text(text_, f, 'text')
    x, y = integer(posX, f, 'posX'), integer(posY, f, 'posY')
    size = integer(fontSize, f, 'fontSize')
    c = color(color_, f)
    _drawing(f)
    if size < 10:
        size = 10
    _text.draw(_text.default_font(), value, x, y, float(size), float(size // 10), c)


def draw_text_ex(font, text_, position, fontSize, spacing, tint, /):
    from . import _text
    f = 'draw_text_ex'
    fnt = struct(font, Font, f, 'font')
    value = text(text_, f, 'text')
    x, y = vec2(position, f, 'position')
    size = number(fontSize, f, 'fontSize')
    gap = number(spacing, f, 'spacing')
    c = color(tint, f, 'tint')
    _drawing(f)
    _text.draw(fnt, value, x, y, size, gap, c)


def draw_text_pro(font, text_, position, origin, rotation, fontSize, spacing, tint, /):
    from . import _text
    f = 'draw_text_pro'
    fnt = struct(font, Font, f, 'font')
    value = text(text_, f, 'text')
    x, y = vec2(position, f, 'position')
    ox, oy = vec2(origin, f, 'origin')
    r = number(rotation, f, 'rotation')
    size = number(fontSize, f, 'fontSize')
    gap = number(spacing, f, 'spacing')
    c = color(tint, f, 'tint')
    _drawing(f)
    _extend((rt.OP_PUSH, rt.OP_TRANSLATE, x, y, 0, rt.OP_ROTATE, r, 0, 0, 1,
             rt.OP_TRANSLATE, -ox, -oy, 0))
    _text.draw(fnt, value, 0.0, 0.0, size, gap, c)
    _extend((rt.OP_POP,))


def draw_text_codepoint(font, codepoint, position, fontSize, tint, /):
    from . import _text
    f = 'draw_text_codepoint'
    fnt = struct(font, Font, f, 'font')
    cp = integer(codepoint, f, 'codepoint')
    x, y = vec2(position, f, 'position')
    size = number(fontSize, f, 'fontSize')
    c = color(tint, f, 'tint')
    _drawing(f)
    _text.draw(fnt, chr(cp) if 0 <= cp < 0x110000 else '?', x, y, size, 0.0, c)


def draw_fps(posX, posY, /):
    from . import _core
    f = 'draw_fps'
    x, y = integer(posX, f, 'posX'), integer(posY, f, 'posY')
    fps = _core.get_fps()
    tint = (0, 158, 47, 255)  # LIME
    if fps < 30:
        tint = (255, 161, 0, 255) if fps >= 15 else (230, 41, 55, 255)  # ORANGE / RED
    draw_text(f'{fps:2d} FPS', x, y, 20, tint)
