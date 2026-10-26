"""Ajudantes para protótipos de peças do avatar (Blender sem tela).

Convenções do avatar (Quaternius/WawaSensei): z para cima, rosto virado para -Y, cabeça entre
z 1.28 e 2.13, pescoço em z ~1.30, braços abertos (pose T). Materiais `Color_*` pegam a cor da
paleta; `Skin_*` usam a pele compartilhada. Toda exportação passa por `reordenar.py`, que devolve
as juntas à ordem do Armature.glb.
"""
import bpy, bmesh, math, os, subprocess, random
from mathutils import Vector, Matrix, noise

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'avatar3d'))
OUT = os.environ.get('AVATAR_OUT', os.path.join(HERE, 'out'))
os.makedirs(OUT, exist_ok=True)

# Nome de trabalho de cada função → id oficial do catálogo (o arquivo sai com o id oficial).
OFFICIAL = {
    'hair-longo': 'hair-12', 'hair-rabo': 'hair-13', 'hair-trancas': 'hair-14',
    'hair-crespo': 'hair-15', 'hair-cachos': 'hair-16', 'hair-coque': 'hair-17',
    'hair-chiquinha': 'hair-18', 'head-sorriso': 'head-05', 'head-fechado': 'head-06',
    'eyes-cilios': 'eyes-13', 'eyes-brilho': 'eyes-14', 'eyebrow-fina': 'eyebrow-11',
    'nose-pequeno': 'nose-05', 'face-sardas': 'face-09', 'face-bochecha': 'face-10',
    'glasses-redondo': 'glasses-05', 'glasses-gatinho': 'glasses-06',
    'top-mangalonga': 'top-04', 'top-moletom': 'top-05', 'top-listrada': 'top-06',
    'bottom-calca': 'bottom-04', 'bottom-saialonga': 'bottom-05',
    'outfit-vestidolongo': 'outfit-06', 'shoes-bota': 'shoes-04', 'shoes-sapatilha': 'shoes-05',
    'acc-colar': 'acc-09', 'acc-cachecol': 'acc-10', 'enfeite-laco': 'enfeite-01',
    'enfeite-tiara': 'enfeite-02', 'enfeite-flores': 'enfeite-03',
    'enfeite-presilhas': 'enfeite-04', 'enfeite-gatinho': 'enfeite-05',
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load(part):
    """Importa uma peça; devolve (armadura, malha com pesos). Remove a icosfera solta do pacote."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'{BASE}/parts/{part}.glb')
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    meshes = [o for o in new if o.type == 'MESH' and o.vertex_groups]
    for o in new:
        if o.type == 'MESH' and not o.vertex_groups:
            bpy.data.objects.remove(o)
    return arm, meshes[0]


def mat(name, rgb=(1, 1, 1), rough=0.8):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    return m


def hexrgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def new_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return o


def ico(center, r, sub=2, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    for v in bm.verts:
        v.co = Vector(center) + Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
    return new_obj('ico', bm)


def uvsphere(center, r, scale=(1, 1, 1), seg=16, ring=10):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    for v in bm.verts:
        v.co = Vector(center) + Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
    return new_obj('esfera', bm)


def tube(points, radii, seg=10, cap=True):
    """Tubo por uma lista de pontos com raio variável (laço fechado nas pontas)."""
    bm = bmesh.new()
    rings = []
    n = len(points)
    for i, p in enumerate(points):
        p = Vector(p)
        d = (Vector(points[min(i + 1, n - 1)]) - Vector(points[max(i - 1, 0)])).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        a = d.cross(up).normalized()
        b = d.cross(a).normalized()
        ring = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            ring.append(bm.verts.new(p + (a * math.cos(t) + b * math.sin(t)) * radii[i]))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj('tubo', bm)


def torus(center, R, r, seg=32, rseg=8, scale=(1, 1, 1), rot=(0, 0, 0)):
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        u = 2 * math.pi * i / seg
        ring = []
        for k in range(rseg):
            w = 2 * math.pi * k / rseg
            x = (R + r * math.cos(w)) * math.cos(u)
            y = (R + r * math.cos(w)) * math.sin(u)
            z = r * math.sin(w)
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    for i in range(seg):
        for k in range(rseg):
            a, b = rings[i], rings[(i + 1) % seg]
            bm.faces.new((a[k], b[k], b[(k + 1) % rseg], a[(k + 1) % rseg]))
    m = Matrix.Translation(center) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X') @ Matrix.Diagonal((*scale, 1))
    for v in bm.verts:
        v.co = m @ v.co
    return new_obj('toro', bm)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def remesh_smooth(o, voxel=0.02, smooth_iters=2):
    """Funde as partes numa casca só (voxel remesh) e suaviza; bom para cabelo de bolhas."""
    m = o.modifiers.new('r', 'REMESH')
    m.mode = 'VOXEL'
    m.voxel_size = voxel
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='r')
    if smooth_iters:
        s = o.modifiers.new('s', 'SMOOTH')
        s.iterations = smooth_iters
        s.factor = 0.5
        bpy.ops.object.modifier_apply(modifier='s')
    d = o.modifiers.new('d', 'DECIMATE')
    d.ratio = 0.35
    bpy.ops.object.modifier_apply(modifier='d')


def shade(o, smooth=True):
    for p in o.data.polygons:
        p.use_smooth = smooth


def set_material(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.material_index = 0


def bind(o, arm, template, weights):
    """Pesos fixos: `weights` = {osso: peso} para todos os vértices, ou função(vértice_mundo)->{osso: peso}."""
    for g in template.vertex_groups:
        if g.name not in o.vertex_groups:
            o.vertex_groups.new(name=g.name)
    for v in o.data.vertices:
        w = weights(o.matrix_world @ v.co) if callable(weights) else weights
        tot = sum(w.values()) or 1
        for bone, val in w.items():
            o.vertex_groups['mixamorig:' + bone].add([v.index], val / tot, 'REPLACE')
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    if not any(m.type == 'ARMATURE' for m in o.modifiers):
        mod = o.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm


def export(arm, meshes, pid, morph=False):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for m in meshes:
        m.select_set(True)
    pid = OFFICIAL.get(pid, pid)
    raw = f'{OUT}/{pid}.raw.glb'
    bpy.ops.export_scene.gltf(filepath=raw, export_format='GLB', use_selection=True, export_skins=True,
                              export_animations=False, export_apply=False, export_morph=morph)
    subprocess.run(['python3', os.path.join(HERE, 'reordenar.py'), f'{BASE}/base/Armature.glb', raw, f'{OUT}/{pid}.glb'], check=True)
    os.remove(raw)
    print('EXPORTADO', pid, sum(len(m.data.vertices) for m in meshes), 'vértices')


def delete_verts(o, pred):
    """Apaga os vértices da malha para os quais pred(co_mundo, vértice) é verdadeiro."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    dv = [v for v in bm.verts if pred(o.matrix_world @ v.co, v)]
    bmesh.ops.delete(bm, geom=dv, context='VERTS')
    bm.to_mesh(o.data)
    bm.free()


def duplicate(o, name):
    c = o.copy()
    c.data = o.data.copy()
    c.name = name
    bpy.context.collection.objects.link(c)
    if c.data.shape_keys:
        c.shape_key_clear()
    worldify(c)
    return c


def worldify(o):
    """Tira o objeto do pai (a armadura importada tem escala 0.01 e eixo Y para cima) e grava os
    vértices em coordenadas do mundo, com matriz identidade. Assim as medidas valem em metros."""
    mw = o.matrix_world.copy()
    o.parent = None
    for m in [m for m in o.modifiers if m.type == 'ARMATURE']:
        o.modifiers.remove(m)
    o.data.transform(mw)
    o.matrix_world = Matrix.Identity(4)
    o.data.update()


def inflate(o, dist):
    """Empurra cada vértice pela normal (casca justa ao corpo)."""
    o.data.update()
    for v in o.data.vertices:
        v.co += v.normal * dist


def solidify(o, t, offset=1):
    m = o.modifiers.new('sol', 'SOLIDIFY')
    m.thickness = t
    m.offset = offset
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='sol')


def attach(o, arm):
    """Prende ao esqueleto mantendo os pesos que a malha já tem."""
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    if not any(m.type == 'ARMATURE' for m in o.modifiers):
        mod = o.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm


def face_bone(o, poly):
    """Osso que mais pesa nos vértices de uma face (sem o prefixo mixamorig:)."""
    names = {g.index: g.name for g in o.vertex_groups}
    acc = {}
    for vi in poly.vertices:
        for g in o.data.vertices[vi].groups:
            acc[names[g.group]] = acc.get(names[g.group], 0) + g.weight
    return max(acc, key=acc.get).replace('mixamorig:', '') if acc else ''


def slot(o, prefix):
    for i, m in enumerate(o.data.materials):
        if m and m.name.startswith(prefix):
            return i
    return -1


def add_slot(o, m):
    o.data.materials.append(m)
    return len(o.data.materials) - 1


def world_edit(o, fn):
    """Edita vértices em coordenadas do mundo numa malha que continua presa à armadura."""
    mw = o.matrix_world
    inv = mw.inverted()
    for v in o.data.vertices:
        w = mw @ v.co
        nw = fn(w, v)
        if nw is not None:
            v.co = inv @ nw
    o.data.update()


def ring_torus(center, rx, ry, r, seg=28, rseg=8):
    """Anel de seção redonda sobre uma elipse (rx, ry) no plano horizontal."""
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        u = 2 * math.pi * i / seg
        ring = []
        for k in range(rseg):
            w = 2 * math.pi * k / rseg
            ring.append(bm.verts.new((center.x + (rx + r * math.cos(w)) * math.cos(u),
                                      center.y + (ry + r * math.cos(w)) * math.sin(u),
                                      center.z + r * math.sin(w))))
        rings.append(ring)
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for k in range(rseg):
            bm.faces.new((a[k], b[k], b[(k + 1) % rseg], a[(k + 1) % rseg]))
    return new_obj('anel', bm)
