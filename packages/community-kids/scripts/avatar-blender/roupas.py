import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

ARM_BONES = {'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftShoulder', 'RightShoulder'}
LEG_BONES = {'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'}


def skin_to_color(o, bones):
    sk, co = slot(o, 'Skin_'), slot(o, 'Color_')
    n = 0
    for p in o.data.polygons:
        if p.material_index == sk and face_bone(o, p) in bones:
            p.material_index = co
            n += 1
    print('faces de pele viraram roupa:', n)


def mangalonga(pid='top-mangalonga'):
    reset()
    arm, top = load('top-01')
    # Braço até o punho (em pose T o braço corre no eixo x; a mão começa em |x| ~0.75).
    sk, co = slot(top, 'Skin_'), slot(top, 'Color_')
    mw = top.matrix_world
    for p in top.data.polygons:
        c = mw @ p.center
        if p.material_index == sk and 0.25 < abs(c.x) < 0.74:
            p.material_index = co
    if pid:
        export(arm, [top], pid)
    return arm, top


def listrada():
    reset()
    arm, top = load('top-01')
    co = slot(top, 'Color_')
    wi = add_slot(top, mat('Listra', hexrgb('#f4f4f4'), 0.8))
    mw = top.matrix_world
    inv = mw.inverted()
    # Corta a malha nas bordas das listras: a troca de cor fica reta, sem serrilhado.
    bm = bmesh.new()
    bm.from_mesh(top.data)
    planes = [(Vector((0, 0, z)), Vector((0, 0, 1))) for z in [i * 0.07 for i in range(6, 21)]]
    planes += [(Vector((sx * (x - 0.3), 0, 0)), Vector((1, 0, 0))) for x in [i * 0.07 for i in range(9, 15)] for sx in (1, -1)]
    for co_w, n_w in planes:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=inv @ co_w, plane_no=(inv.to_3x3() @ n_w).normalized())
    bm.to_mesh(top.data)
    bm.free()
    for p in top.data.polygons:
        if p.material_index != co:
            continue
        c = mw @ p.center
        k = c.z if abs(c.x) < 0.30 else abs(c.x) + 0.3
        if int(math.floor(k / 0.07)) % 2:
            p.material_index = wi
    export(arm, [top], 'top-listrada')


def moletom():
    arm, top = mangalonga(None)
    cor = top.data.materials[slot(top, 'Color_')]
    hood = torus(Vector((0, 0.07, 1.31)), 0.17, 0.075, seg=28, rseg=10, scale=(1.05, 0.95, 1))
    delete_verts(hood, lambda p, v: p.y < -0.02)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * 0.34, -0.372 + v.co.y * 0.03, 0.76 + v.co.z * 0.15))
    pocket = new_obj('bolso', bm)
    for o in (hood, pocket):
        set_material(o, cor)
        shade(o, True)
    bind(hood, arm, top, {'Spine2': 0.6, 'Neck': 0.4})
    bind(pocket, arm, top, {'Spine': 1.0})
    strings = []
    for x in (-0.06, 0.06):
        strings.append(tube([(x, -0.215, 1.25), (x, -0.30, 1.12), (x * 1.08, -0.35, 1.00)], [0.009, 0.009, 0.007], seg=6))
    s = join(strings, 'cordao')
    set_material(s, mat('Cordao', hexrgb('#f4f4f4'), 0.6))
    bind(s, arm, top, {'Spine2': 1.0})
    export(arm, [top, hood, pocket, s], 'top-moletom')


def calca():
    reset()
    arm, b = load('bottom-01')
    skin_to_color(b, LEG_BONES)
    export(arm, [b], 'bottom-calca')


def alongar(o, faces_pred, z_top, z_new_bottom, flare=0.25):
    """Desce a barra de uma saia: estica os vértices das faces escolhidas abaixo de `z_top`."""
    mw = o.matrix_world
    idx = set()
    for p in o.data.polygons:
        if faces_pred(p):
            idx.update(p.vertices)
    zs = [(mw @ o.data.vertices[i].co).z for i in idx]
    zb = min(zs)
    k = (z_top - z_new_bottom) / (z_top - zb)
    cx = sum((mw @ o.data.vertices[i].co).x for i in idx) / len(idx)
    cy = sum((mw @ o.data.vertices[i].co).y for i in idx) / len(idx)
    print('barra de', round(zb, 3), 'para', z_new_bottom, 'fator', round(k, 2))

    def f(w, v):
        if v.index not in idx or w.z >= z_top:
            return None
        d = (z_top - w.z) * k
        t = d / (z_top - z_new_bottom)
        s = 1 + flare * t
        return Vector((cx + (w.x - cx) * s, cy + (w.y - cy) * s, z_top - d))
    world_edit(o, f)


def repesar_barra(o, faces_pred, z_top, z_bottom, leg_share=0.8):
    """Pesos da parte comprida da saia: no alto segue o quadril; descendo, passa a seguir as
    coxas (cada lado a sua; o meio da frente e de trás divide entre as duas). Sem isso a barra
    esticada fica presa ao quadril e o joelho atravessa o tecido nas poses de perna dobrada."""
    mw = o.matrix_world
    idx = set()
    for p in o.data.polygons:
        if faces_pred(p):
            idx.update(p.vertices)
    names = ['mixamorig:Hips', 'mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg']
    for n in names:
        if n not in o.vertex_groups:
            o.vertex_groups.new(name=n)
    keep = {o.vertex_groups[n].index for n in names}
    for i in idx:
        v = o.data.vertices[i]
        w = mw @ v.co
        if w.z >= z_top:
            continue
        t = min(1.0, (z_top - w.z) / (z_top - z_bottom))
        t = t * t * (3 - 2 * t)
        left = min(1.0, max(0.0, 0.5 + w.x / 0.28))
        for g in list(v.groups):
            if g.group not in keep:
                o.vertex_groups[g.group].remove([i])
        legs = leg_share * t
        o.vertex_groups['mixamorig:Hips'].add([i], 1 - legs, 'REPLACE')
        o.vertex_groups['mixamorig:LeftUpLeg'].add([i], legs * left, 'REPLACE')
        o.vertex_groups['mixamorig:RightUpLeg'].add([i], legs * (1 - left), 'REPLACE')


def saialonga():
    reset()
    arm, b = load('bottom-03')
    co = slot(b, 'Color_')
    alongar(b, lambda p: p.material_index == co, 0.60, 0.17, flare=0.18)
    repesar_barra(b, lambda p: p.material_index == co, 0.52, 0.17)
    export(arm, [b], 'bottom-saialonga')


def vestidolongo():
    reset()
    arm, d = load('outfit-01')
    sk = slot(d, 'Skin_')
    alongar(d, lambda p: p.material_index != sk, 0.62, 0.15, flare=0.20)
    repesar_barra(d, lambda p: p.material_index != sk, 0.54, 0.15)
    export(arm, [d], 'outfit-vestidolongo')


def bota():
    reset()
    arm, shoe = load('shoes-01')
    _, legs = load('bottom-03')  # pernas com pele até o joelho (a bermuda cobre quase tudo)
    cano = duplicate(legs, 'cano')
    sk = slot(cano, 'Skin_')
    bm = bmesh.new()
    bm.from_mesh(cano.data)
    bm.faces.ensure_lookup_table()
    dead = [f for f in bm.faces if f.material_index != sk or not (0.06 < f.calc_center_median().z < 0.27)]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(cano.data)
    bm.free()
    # Infla para fora a partir do eixo de cada perna (as normais herdadas não são confiáveis).
    sides = {}
    for v in cano.data.vertices:
        sides.setdefault(v.co.x > 0, []).append(v.co.copy())
    centers = {k: sum(vs, Vector()) / len(vs) for k, vs in sides.items()}
    for v in cano.data.vertices:
        c = centers[v.co.x > 0]
        d = Vector((v.co.x - c.x, v.co.y - c.y, 0)).normalized()
        v.co += d * 0.03
    bm = bmesh.new()
    bm.from_mesh(cano.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(cano.data)
    bm.free()
    solidify(cano, 0.02, offset=-1)
    cor = shoe.data.materials[slot(shoe, 'Color_')]
    set_material(cano, cor)
    shade(cano, True)
    attach(cano, arm)
    # Dobra no alto do cano: um anel por perna, um pouco mais largo, preso à canela.
    punhos = []
    for lado, bone in ((1, 'LeftLeg'), (-1, 'RightLeg')):
        vs = [v.co for v in cano.data.vertices if (v.co.x > 0) == (lado > 0)]
        top = max(v.z for v in vs)
        ring = [v for v in vs if v.z > top - 0.03]
        c = sum(ring, Vector()) / len(ring)
        rx = max(abs(v.x - c.x) for v in ring)
        ry = max(abs(v.y - c.y) for v in ring)
        t = ring_torus(Vector((c.x, c.y, top - 0.012)), rx + 0.004, ry + 0.004, 0.022)
        set_material(t, cor)
        shade(t, True)
        bind(t, arm, cano, {bone: 1.0})
        punhos.append(t)
    bpy.data.objects.remove(legs)
    export(arm, [shoe, cano] + punhos, 'shoes-bota')


def sapatilha():
    reset()
    arm, shoe = load('shoes-01')
    mw = shoe.matrix_world
    zmin = min((mw @ v.co).z for v in shoe.data.vertices)
    world_edit(shoe, lambda w, v: Vector((w.x, w.y, zmin + (w.z - zmin) * 0.5)))
    export(arm, [shoe], 'shoes-sapatilha')


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
