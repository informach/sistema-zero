"""Desenho 3D imediato (rmodels.c do raylib 6.0): cubos, esferas, cilindros, cápsulas, plano,
grade, linhas e billboards.

Cada função grava um registro na lista do quadro; o navegador monta os triângulos com as mesmas
contas do raylib (os mesmos anéis da esfera, os mesmos lados do cilindro). O billboard é montado
aqui, porque depende da câmera que o jogo passa (e não da câmera do modo 3D).
"""
import math

from . import _raymath as rm
from . import _rt as rt
from ._args import color, integer, number, rect, struct, vec2, vec3
from ._structs import BoundingBox, Camera3D, Ray, Texture

_ops = rt.ops
_extend = _ops.extend


def _drawing(function):
    if not rt.window.open:
        rt.require_window(function)


# Linhas, pontos e triângulos ---------------------------------------------------------------

def draw_line_3d(startPos, endPos, color_, /):
    f = 'draw_line_3d'
    a = vec3(startPos, f, 'startPos')
    b = vec3(endPos, f, 'endPos')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_LINE_3D, a[0], a[1], a[2], b[0], b[1], b[2], c))


def draw_point_3d(position, color_, /):
    f = 'draw_point_3d'
    p = vec3(position, f, 'position')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_POINT_3D, p[0], p[1], p[2], c))


def draw_circle_3d(center, radius, rotationAxis, rotationAngle, color_, /):
    f = 'draw_circle_3d'
    p = vec3(center, f, 'center')
    r = number(radius, f, 'radius')
    axis = vec3(rotationAxis, f, 'rotationAxis')
    angle = number(rotationAngle, f, 'rotationAngle')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_CIRCLE_3D, p[0], p[1], p[2], r, axis[0], axis[1], axis[2], angle, c))


def draw_triangle_3d(v1, v2, v3, color_, /):
    f = 'draw_triangle_3d'
    a, b, d = vec3(v1, f, 'v1'), vec3(v2, f, 'v2'), vec3(v3, f, 'v3')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_TRIANGLE_3D, a[0], a[1], a[2], b[0], b[1], b[2], d[0], d[1], d[2], c))


def draw_triangle_strip_3d(points, pointCount, color_, /):
    f = 'draw_triangle_strip_3d'
    count = integer(pointCount, f, 'pointCount')
    c = color(color_, f)
    try:
        listed = list(points)
    except TypeError:
        raise TypeError(f'{f}: points precisa ser uma lista de Vector3.') from None
    if count > len(listed):
        raise IndexError(f'{f}: pointCount ({count}) é maior que a lista de pontos ({len(listed)}).')
    vertices = [vec3(point, f, 'points') for point in listed[:count]]
    _drawing(f)
    for i in range(2, count):
        if i % 2 == 0:
            a, b, d = vertices[i], vertices[i - 2], vertices[i - 1]
        else:
            a, b, d = vertices[i], vertices[i - 1], vertices[i - 2]
        _extend((rt.OP_TRIANGLE_3D, a[0], a[1], a[2], b[0], b[1], b[2], d[0], d[1], d[2], c))


def draw_ray(ray, color_, /):
    f = 'draw_ray'
    r = struct(ray, Ray, f, 'ray')
    c = color(color_, f)
    _drawing(f)
    p, d = r.position, r.direction
    scale = 10000
    _extend((rt.OP_LINE_3D, p.x, p.y, p.z, p.x + d.x * scale, p.y + d.y * scale,
             p.z + d.z * scale, c))


# Cubo, esfera, cilindro, cápsula, plano e grade --------------------------------------------

def draw_cube(position, width, height, length, color_, /):
    f = 'draw_cube'
    p = vec3(position, f, 'position')
    w, h, l = number(width, f, 'width'), number(height, f, 'height'), number(length, f, 'length')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_CUBE, p[0], p[1], p[2], w, h, l, c))


def draw_cube_v(position, size, color_, /):
    f = 'draw_cube_v'
    p = vec3(position, f, 'position')
    s = vec3(size, f, 'size')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_CUBE, p[0], p[1], p[2], s[0], s[1], s[2], c))


def draw_cube_wires(position, width, height, length, color_, /):
    f = 'draw_cube_wires'
    p = vec3(position, f, 'position')
    w, h, l = number(width, f, 'width'), number(height, f, 'height'), number(length, f, 'length')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_CUBE_WIRES, p[0], p[1], p[2], w, h, l, c))


def draw_cube_wires_v(position, size, color_, /):
    f = 'draw_cube_wires_v'
    p = vec3(position, f, 'position')
    s = vec3(size, f, 'size')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_CUBE_WIRES, p[0], p[1], p[2], s[0], s[1], s[2], c))


def draw_bounding_box(box, color_, /):
    f = 'draw_bounding_box'
    b = struct(box, BoundingBox, f, 'box')
    c = color(color_, f)
    _drawing(f)
    sx = abs(b.max.x - b.min.x)
    sy = abs(b.max.y - b.min.y)
    sz = abs(b.max.z - b.min.z)
    _extend((rt.OP_CUBE_WIRES, b.min.x + sx / 2.0, b.min.y + sy / 2.0, b.min.z + sz / 2.0,
             sx, sy, sz, c))


def _sphere(op, f, centerPos, radius, rings, slices, color_):
    p = vec3(centerPos, f, 'centerPos')
    r = number(radius, f, 'radius')
    ri, sl = integer(rings, f, 'rings'), integer(slices, f, 'slices')
    c = color(color_, f)
    _drawing(f)
    # Sem anéis ou fatias o raylib não desenha nada (laços vazios), e dividir por zero também não.
    if sl <= 0 or ri < -1:
        return
    _extend((op, p[0], p[1], p[2], r, ri, sl, c))


def draw_sphere(centerPos, radius, color_, /):
    _sphere(rt.OP_SPHERE, 'draw_sphere', centerPos, radius, 16, 16, color_)


def draw_sphere_ex(centerPos, radius, rings, slices, color_, /):
    _sphere(rt.OP_SPHERE, 'draw_sphere_ex', centerPos, radius, rings, slices, color_)


def draw_sphere_wires(centerPos, radius, rings, slices, color_, /):
    _sphere(rt.OP_SPHERE_WIRES, 'draw_sphere_wires', centerPos, radius, rings, slices, color_)


def _cylinder(op, f, position, radiusTop, radiusBottom, height, slices, color_):
    p = vec3(position, f, 'position')
    top, bottom = number(radiusTop, f, 'radiusTop'), number(radiusBottom, f, 'radiusBottom')
    h = number(height, f, 'height')
    sides = integer(slices, f, 'slices')
    c = color(color_, f)
    _drawing(f)
    _extend((op, p[0], p[1], p[2], top, bottom, h, max(3, sides), c))


def draw_cylinder(position, radiusTop, radiusBottom, height, slices, color_, /):
    _cylinder(rt.OP_CYLINDER, 'draw_cylinder', position, radiusTop, radiusBottom, height, slices,
              color_)


def draw_cylinder_wires(position, radiusTop, radiusBottom, height, slices, color_, /):
    _cylinder(rt.OP_CYLINDER_WIRES, 'draw_cylinder_wires', position, radiusTop, radiusBottom,
              height, slices, color_)


def _cylinder_ex(op, f, startPos, endPos, startRadius, endRadius, sides, color_, sides_name):
    a, b = vec3(startPos, f, 'startPos'), vec3(endPos, f, 'endPos')
    r1, r2 = number(startRadius, f, 'startRadius'), number(endRadius, f, 'endRadius')
    n = integer(sides, f, sides_name)
    c = color(color_, f)
    _drawing(f)
    if a == b:
        return
    _extend((op, a[0], a[1], a[2], b[0], b[1], b[2], r1, r2, max(3, n), c))


def draw_cylinder_ex(startPos, endPos, startRadius, endRadius, sides, color_, /):
    _cylinder_ex(rt.OP_CYLINDER_EX, 'draw_cylinder_ex', startPos, endPos, startRadius, endRadius,
                 sides, color_, 'sides')


def draw_cylinder_wires_ex(startPos, endPos, startRadius, endRadius, slices, color_, /):
    _cylinder_ex(rt.OP_CYLINDER_WIRES_EX, 'draw_cylinder_wires_ex', startPos, endPos, startRadius,
                 endRadius, slices, color_, 'slices')


def _capsule(op, f, startPos, endPos, radius, rings, slices, color_):
    a, b = vec3(startPos, f, 'startPos'), vec3(endPos, f, 'endPos')
    r = number(radius, f, 'radius')
    # Medido na cena-gabarito shapes3d: no raylib 6.0.1.0 do pip o 4º número é o de anéis e o 5º
    # o de fatias, como o pyray os chama (o raylib.h da tag 6.0 do GitHub diz o contrário).
    ri, sl = integer(rings, f, 'rings'), integer(slices, f, 'slices')
    c = color(color_, f)
    _drawing(f)
    if ri <= 0:
        return
    _extend((op, a[0], a[1], a[2], b[0], b[1], b[2], r, max(3, sl), ri, c))


def draw_capsule(startPos, endPos, radius, rings, slices, color_, /):
    _capsule(rt.OP_CAPSULE, 'draw_capsule', startPos, endPos, radius, rings, slices, color_)


def draw_capsule_wires(startPos, endPos, radius, rings, slices, color_, /):
    _capsule(rt.OP_CAPSULE_WIRES, 'draw_capsule_wires', startPos, endPos, radius, rings, slices,
             color_)


def draw_plane(centerPos, size, color_, /):
    f = 'draw_plane'
    p = vec3(centerPos, f, 'centerPos')
    s = vec2(size, f, 'size')
    c = color(color_, f)
    _drawing(f)
    _extend((rt.OP_PLANE, p[0], p[1], p[2], s[0], s[1], c))


def draw_grid(slices, spacing, /):
    f = 'draw_grid'
    n = integer(slices, f, 'slices')
    s = number(spacing, f, 'spacing')
    _drawing(f)
    _extend((rt.OP_GRID, n, s))


# Billboards ---------------------------------------------------------------------------------

def _billboard(f, camera, texture, source, position, up, size, origin, rotation, tint):
    cam = struct(camera, Camera3D, f, 'camera')
    tex = struct(texture, Texture, f, 'texture')
    sx, sy, sw, sh = source
    view = rm.look_at((cam.position.x, cam.position.y, cam.position.z),
                      (cam.target.x, cam.target.y, cam.target.z), (cam.up.x, cam.up.y, cam.up.z))
    right = (view[0] * size[0], view[4] * size[0], view[8] * size[0])
    up = (up[0] * size[1], up[1] * size[1], up[2] * size[1])
    ox, oy = origin
    if size[0] < 0.0:
        sx -= size[0]
        sw *= -1.0
        right = (-right[0], -right[1], -right[2])
        ox *= -1.0
    if size[1] < 0.0:
        sy -= size[1]
        sh *= -1.0
        up = (-up[0], -up[1], -up[2])
        oy *= -1.0
    forward = rm._cross(right, up) if rotation != 0.0 else None
    nr, nu = rm._normalize3(right), rm._normalize3(up)
    origin3d = (nr[0] * ox + nu[0] * oy, nr[1] * ox + nu[1] * oy, nr[2] * ox + nu[2] * oy)
    corners = [(0.0, 0.0, 0.0), right, rm._add3(up, right), up]
    points = []
    for corner in corners:
        point = rm._sub3(corner, origin3d)
        if forward is not None:
            point = rm._rotate_axis_angle(point, forward, rotation * math.pi / 180.0)
        points.append(rm._add3(point, position))
    w, h = tex.width or 1, tex.height or 1
    uv = [(sx / w, (sy + sh) / h), ((sx + sw) / w, (sy + sh) / h), ((sx + sw) / w, sy / h),
          (sx / w, sy / h)]
    _drawing(f)
    record = [rt.OP_QUAD_3D, tex.id, tint]
    for point, (u, v) in zip(points, uv):
        record.extend((point[0], point[1], point[2], u, v))
    _extend(record)


def draw_billboard(camera, texture, position, scale, tint, /):
    f = 'draw_billboard'
    tex = struct(texture, Texture, f, 'texture')
    s = number(scale, f, 'scale')
    w, h = float(tex.width), float(tex.height)
    ratio = abs(w / h) if h else 0.0
    size = (s * ratio, s)
    _billboard(f, camera, tex, (0.0, 0.0, w, h), vec3(position, f, 'position'), (0.0, 1.0, 0.0),
               size, (size[0] * 0.5, size[1] * 0.5), 0.0, color(tint, f, 'tint'))


def draw_billboard_rec(camera, texture, source, position, size, tint, /):
    f = 'draw_billboard_rec'
    s = vec2(size, f, 'size')
    _billboard(f, camera, texture, rect(source, f, 'source'), vec3(position, f, 'position'),
               (0.0, 1.0, 0.0), s, (s[0] * 0.5, s[1] * 0.5), 0.0, color(tint, f, 'tint'))


def draw_billboard_pro(camera, texture, source, position, up, size, origin, rotation, tint, /):
    f = 'draw_billboard_pro'
    _billboard(f, camera, texture, rect(source, f, 'source'), vec3(position, f, 'position'),
               vec3(up, f, 'up'), vec2(size, f, 'size'), vec2(origin, f, 'origin'),
               number(rotation, f, 'rotation'), color(tint, f, 'tint'))


# Estado do rlgl -----------------------------------------------------------------------------
# O estado vale até o jogo mudar de novo, inclusive nos quadros seguintes, como no rlgl.
# (rl_enable_wire_mode não está aqui: o WebGL não desenha só as arestas dos triângulos.)

STATE_DEPTH_TEST = 1
STATE_DEPTH_MASK = 2
STATE_BACKFACE_CULLING = 3
STATE_COLOR_BLEND = 4


def _state(which, value, function):
    _drawing(function)
    _extend((rt.OP_RL_STATE, which, value))


def rl_enable_depth_test():
    _state(STATE_DEPTH_TEST, 1, 'rl_enable_depth_test')


def rl_disable_depth_test():
    _state(STATE_DEPTH_TEST, 0, 'rl_disable_depth_test')


def rl_enable_depth_mask():
    _state(STATE_DEPTH_MASK, 1, 'rl_enable_depth_mask')


def rl_disable_depth_mask():
    _state(STATE_DEPTH_MASK, 0, 'rl_disable_depth_mask')


def rl_enable_backface_culling():
    _state(STATE_BACKFACE_CULLING, 1, 'rl_enable_backface_culling')


def rl_disable_backface_culling():
    _state(STATE_BACKFACE_CULLING, 0, 'rl_disable_backface_culling')


def rl_enable_color_blend():
    _state(STATE_COLOR_BLEND, 1, 'rl_enable_color_blend')


def rl_disable_color_blend():
    _state(STATE_COLOR_BLEND, 0, 'rl_disable_color_blend')
