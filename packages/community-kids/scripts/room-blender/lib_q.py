"""Ajudantes para as peças do quarto 3D (Blender sem tela, `bpy` do PyPI).

Convenções do quarto (`member-shell/src/components/cosmetics/room/coords.ts`): 1 célula da grade
= 1 unidade. No Blender, z é para cima e a FRENTE da peça olha para -Y; o exportador de glTF
converte para o y para cima do three.js, e a frente vira +Z, que é para onde o quarto vira as
peças. Peça de CHÃO: base em z = 0, centrada em x/y no seu footprint (w células em x, h em y).
Peça de PAREDE: centrada na origem, o fundo encostado em y = +0.10 (a parede fica atrás).

Materiais: o nome é a chave da paleta (`wood`, `woodDark`, …, as mesmas cores de
`materials.ts`), e as peças que brilham (`lamp`, `screen`, `gold`, `neon*`) levam emissão.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('ROOM_OUT', os.path.join(HERE, 'out'))
os.makedirs(OUT, exist_ok=True)

# Paleta do quarto (a de materials.ts, mais alguns tons novos). (cor, rugosidade, emissão, força)
PALETTE = {
    'wood': ('#b9824f', 0.8, None, 0),
    'woodLight': ('#d8b07a', 0.8, None, 0),
    'woodDark': ('#7c5836', 0.8, None, 0),
    'white': ('#f3efe7', 0.85, None, 0),
    'cream': ('#e7ddc8', 0.9, None, 0),
    'gray': ('#9aa3ab', 0.8, None, 0),
    'grayDark': ('#565d65', 0.7, None, 0),
    'black': ('#30343a', 0.6, None, 0),
    'red': ('#e0584f', 0.75, None, 0),
    'orange': ('#ef8a3c', 0.75, None, 0),
    'green': ('#5cb673', 0.8, None, 0),
    'teal': ('#3fb3a5', 0.8, None, 0),
    'blue': ('#5b8fd6', 0.8, None, 0),
    'navy': ('#34507e', 0.8, None, 0),
    'yellow': ('#f2c14e', 0.75, None, 0),
    'pink': ('#e88bb6', 0.85, None, 0),
    'purple': ('#9b6fd0', 0.8, None, 0),
    'leaf': ('#4e9c5a', 0.85, None, 0),
    'leafLight': ('#73bd6c', 0.85, None, 0),
    'terracotta': ('#c8714e', 0.9, None, 0),
    'fur': ('#b8784a', 0.95, None, 0),
    'furLight': ('#e8c9a0', 0.95, None, 0),
    'furDark': ('#3b3f46', 0.95, None, 0),
    'metal': ('#b9c0c7', 0.35, None, 0),
    'gold': ('#e8b23a', 0.3, '#ffd76a', 0.25),
    'glass': ('#bfe3f0', 0.1, '#bfe3f0', 0.08),
    'lamp': ('#ffe9b0', 0.6, '#ffd27a', 1.2),
    'screen': ('#2a2f3a', 0.3, '#3a86c8', 0.6),
    'neonPink': ('#ff5fa8', 0.4, '#ff5fa8', 0.9),
    'neonCyan': ('#4fe3ff', 0.4, '#4fe3ff', 0.9),
    'neonYellow': ('#ffe066', 0.4, '#ffe066', 0.9),
    'water': ('#7fd0ee', 0.15, '#7fd0ee', 0.15),
    'glassClear': ('#d6f1fa', 0.05, None, 0),
    'waterClear': ('#5cc3e8', 0.1, None, 0),
    'lavaGlass': ('#9b6fd0', 0.1, '#9b6fd0', 0.25),
    'cork': ('#c99a62', 0.95, None, 0),
    'neonGreen': ('#6dff9e', 0.4, '#6dff9e', 0.9),
    'neonOrange': ('#ffa24f', 0.4, '#ffa24f', 0.9),
}
# Materiais translúcidos (o vidro do aquário e da lâmpada de lava): alfa do glTF em BLEND.
ALPHA = {'glassClear': 0.28, 'waterClear': 0.42, 'lavaGlass': 0.55}
_MATS = {}


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def mat(key):
    if key in _MATS:
        return _MATS[key]
    color, rough, emit, strength = PALETTE[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = 0.0
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = strength
    if key in ALPHA:
        b.inputs['Alpha'].default_value = ALPHA[key]
        m.surface_render_method = 'BLENDED'
    _MATS[key] = m
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()


def _obj(name, bm, m):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(m))
    return o


def _apply(o, mod):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def box(size, loc, m, bevel=0.03, segs=2, rot=(0, 0, 0)):
    """Caixa com cantos chanfrados (o "polimento" que as caixas cruas do código não tinham)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    o = _obj('box', bm, m)
    if bevel > 0:
        b = o.modifiers.new('bv', 'BEVEL')
        b.width = min(bevel, min(size) * 0.45)
        b.segments = segs
        b.limit_method = 'NONE'
        _apply(o, b)
    flat(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def cushion(size, loc, m, puff=0.25, rot=(0, 0, 0), round_=0.45):
    """Almofada/colchão fofo: caixa com cantos bem arredondados (chanfro de vários segmentos),
    macia e um pouco estufada no meio. Mantém o contorno (subdivisão encolheria para uma bola)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    # Grade rala nas faces (para o estufado) ANTES do chanfro: barato e mantém o contorno.
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    o = _obj('cushion', bm, m)
    b = o.modifiers.new('bv', 'BEVEL')
    b.width = min(size) * round_
    b.segments = 3
    b.limit_method = 'ANGLE'
    b.angle_limit = math.radians(60)
    _apply(o, b)
    hx, hy = size[0] / 2, size[1] / 2
    for v in o.data.vertices:
        if v.co.z > 0:
            k = max(0.0, 1 - (v.co.x / hx) ** 2) * max(0.0, 1 - (v.co.y / hy) ** 2)
            v.co.z += puff * size[2] * k
    smooth(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def cyl(r, h, loc, m, verts=16, bevel=0.0, rot=(0, 0, 0), r2=None, smooth_sides=True):
    """Cilindro (ou tronco de cone com `r2`), base em z = -h/2."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r,
                          radius2=r if r2 is None else r2, depth=h)
    o = _obj('cyl', bm, m)
    if bevel > 0:
        b = o.modifiers.new('bv', 'BEVEL')
        b.width = bevel
        b.segments = 2
        b.limit_method = 'ANGLE'
        _apply(o, b)
    if smooth_sides:
        # Lados macios, tampas retas: suaviza só as faces quase verticais.
        for p in o.data.polygons:
            p.use_smooth = abs(p.normal.z) < 0.7
    else:
        flat(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def sphere(r, loc, m, scale=(1, 1, 1), subdiv=2, smooth_it=True):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
    o = _obj('sphere', bm, m)
    smooth(o) if smooth_it else flat(o)
    o.location = loc
    return o


def uvball(r, loc, m, scale=(1, 1, 1), seg=20, ring=12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
    o = _obj('ball', bm, m)
    smooth(o)
    o.location = loc
    return o


def cone(r, h, loc, m, verts=12, rot=(0, 0, 0), smooth_it=False):
    return cyl(r, h, loc, m, verts=verts, rot=rot, r2=0.0, smooth_sides=smooth_it)


def torus(R, r, loc, m, seg=24, rseg=10, rot=(0, 0, 0), arc=360):
    bm = bmesh.new()
    rings = []
    n = seg if arc >= 360 else seg + 1
    for i in range(n):
        u = math.radians(arc) * i / seg
        ring = []
        for k in range(rseg):
            w = 2 * math.pi * k / rseg
            ring.append(bm.verts.new(((R + r * math.cos(w)) * math.cos(u), (R + r * math.cos(w)) * math.sin(u), r * math.sin(w))))
        rings.append(ring)
    last = seg if arc >= 360 else seg
    for i in range(last):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(rseg):
            bm.faces.new((a[k], b[k], b[(k + 1) % rseg], a[(k + 1) % rseg]))
    o = _obj('torus', bm, m)
    smooth(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def tube(points, radii, m, seg=10, cap=True):
    bm = bmesh.new()
    rings = []
    n = len(points)
    for i, p in enumerate(points):
        p = Vector(p)
        d = (Vector(points[min(i + 1, n - 1)]) - Vector(points[max(i - 1, 0)])).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        a = d.cross(up).normalized()
        b = d.cross(a).normalized()
        rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * radii[i]) for k in range(seg)])
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(_obj('tube', bm, m))


def prism(points2d, depth, loc, m, rot=(0, 0, 0), bevel=0.0):
    """Placa recortada (estrela, coração, chama…) com espessura `depth`, no plano XZ, de frente."""
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in points2d]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in points2d]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(points2d)
    for i in range(n):
        bm.faces.new((front[i], back[i], back[(i + 1) % n], front[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('prism', bm, m)
    if bevel > 0:
        b = o.modifiers.new('bv', 'BEVEL')
        b.width = bevel
        b.segments = 2
        b.limit_method = 'ANGLE'
        _apply(o, b)
    flat(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def star_pts(r_out, r_in, n=5, rot=90):
    return [((r_out if k % 2 == 0 else r_in) * math.cos(math.radians(rot + 180 * k / n)),
             (r_out if k % 2 == 0 else r_in) * math.sin(math.radians(rot + 180 * k / n))) for k in range(2 * n)]


def heart_pts(s, n=28):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x * s / 17, z * s / 17))
    return pts


def text(body, size, loc, m, depth=0.03, rot=(math.radians(90), 0, 0), align='CENTER'):
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = depth
    cu.align_x = align
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('txt', cu)
    bpy.context.collection.objects.link(o)
    o.rotation_euler = rot
    o.location = loc
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.view_layer.objects.active
    o.data.materials.clear()
    o.data.materials.append(mat(m))
    return flat(o)


def mirror_x(objs):
    out = []
    for o in objs:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        c.location.x = -o.location.x
        c.rotation_euler = (o.rotation_euler.x, -o.rotation_euler.y, -o.rotation_euler.z)
        out.append(c)
    return objs + out


def join(objs, name='peca'):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def export(pid, objs=None, animated=False):
    """Exporta a cena (ou só `objs`) como GLB. Peça parada vira UMA malha (menos desenhos)."""
    if objs is None:
        objs = [o for o in bpy.data.objects if o.type == 'MESH']
    if not animated:
        # Uma malha só, com a transformação aplicada (o nó fica na origem, como o quarto espera).
        objs = [join(objs, pid)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        for c in o.children_recursive:
            c.select_set(True)
    path = os.path.join(OUT, f'{pid}.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
              export_yup=True, export_texcoords=False, export_animations=animated)
    if animated:
        kw.update(export_animation_mode='SCENE', export_force_sampling=True, export_frame_range=True)
    bpy.ops.export_scene.gltf(**kw)
    tris = sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
    print('EXPORTADO', pid, tris, 'triângulos', os.path.getsize(path) // 1024, 'KB')
