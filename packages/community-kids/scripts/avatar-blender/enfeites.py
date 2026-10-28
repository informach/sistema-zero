"""Enfeites de cabelo: todos presos ao osso da cabeça, com a parte principal em `Color_`."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

C = Vector((0, -0.04, 1.70))  # centro da cabeça


def base():
    reset()
    return load('head-01')


RX, RZ = 0.47, 0.50  # meia-largura e altura do arco: encosta no cabelo dos lados e no topo


def arc_points(R, a0, a1, n, y=-0.04, tilt=0.0):
    """Arco por cima da cabeça, de orelha a orelha (ângulos em graus, 0 = topo). `R` é a
    escala relativa ao arco justo (0.53 = justo; maior afasta do cabelo)."""
    k = R / 0.53
    pts = []
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / (n - 1))
        pts.append(Vector((RX * k * math.sin(a), y + tilt * math.cos(a), C.z + RZ * k * math.cos(a))))
    return pts


def finish(arm, head, pid, meshes):
    for m in meshes:
        shade(m, True)
        bind(m, arm, head, {'Head': 1.0})
    export(arm, meshes, pid)


def lobe(center, s, sinal, rot):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * s * 0.95, v.co.y * s * 0.40, v.co.z * s * 0.62))
        t = (v.co.x / (s * 0.95) + 1) / 2 if sinal > 0 else (1 - v.co.x / (s * 0.95)) / 2
        v.co.z *= 0.35 + 0.65 * t
        v.co.x += sinal * s * 0.95
    o = new_obj('lobo', bm)
    o.location = center
    o.rotation_euler = rot
    return o


def laco():
    arm, head = base()
    c = Vector((0.27, -0.06, 2.12))
    rot = (math.radians(-8), math.radians(30), 0)
    s = 0.13
    parts = [lobe(c, s, 1, rot), lobe(c, s, -1, rot), ico(c, s * 0.33, sub=2)]
    o = join(parts, 'Laco')
    set_material(o, mat('Color_', hexrgb('#e84393'), 0.5))
    finish(arm, head, 'enfeite-laco', [o])


def tiara():
    arm, head = base()
    pts = arc_points(0.53, -84, 84, 26, y=-0.10)
    band = tube(pts, [0.028] * len(pts), seg=8)
    for v in band.data.vertices:  # faixa achatada, mais larga que alta
        d = v.co - C
        v.co.y = -0.10 + (v.co.y + 0.10) * 2.2
    set_material(band, mat('Color_', hexrgb('#9b59b6'), 0.4))
    finish(arm, head, 'enfeite-tiara', [band])


def flores():
    arm, head = base()
    pts = arc_points(0.53, -84, 84, 26, y=-0.10)
    band = tube(pts, [0.016] * len(pts), seg=6)
    set_material(band, mat('Folha', hexrgb('#27ae60'), 0.7))
    flowers = []
    cores = ['#f8a5c2', '#ffffff', '#f1c40f', '#f8a5c2', '#ffffff', '#f1c40f', '#f8a5c2']
    for i, a in enumerate(range(-66, 67, 22)):
        p = arc_points(0.555, a, a, 1, y=-0.10)[0] if False else None
        ar = math.radians(a)
        p = Vector((RX * 1.04 * math.sin(ar), -0.13, C.z + RZ * 1.04 * math.cos(ar)))
        n = (p - Vector((0, -0.10, C.z))).normalized()
        petals = []
        u = n.cross(Vector((0, 1, 0))).normalized()
        w = n.cross(u).normalized()
        for k in range(5):
            t = 2 * math.pi * k / 5
            petals.append(ico(p + (u * math.cos(t) + w * math.sin(t)) * 0.045, 0.034, sub=1, scale=(1, 1, 1)))
        f = join(petals, 'flor')
        set_material(f, mat('Color_', hexrgb(cores[i]), 0.6))  # pétalas: cor da paleta
        mid = ico(p + n * 0.012, 0.024, sub=1)
        set_material(mid, mat('Miolo', hexrgb('#f39c12'), 0.6))
        flowers += [f, mid]
    pet = join([o for o in flowers if o.data.materials[0].name.startswith('Color_')], 'Petalas')
    mio = join([o for o in bpy.data.objects if o.type == 'MESH' and o.data.materials and o.data.materials[0].name.startswith('Miolo')], 'Miolos')
    finish(arm, head, 'enfeite-flores', [band, pet, mio])


def star(center, r, depth, normal):
    bm = bmesh.new()
    pts = []
    for k in range(10):
        t = math.pi / 2 + 2 * math.pi * k / 10
        rr = r if k % 2 == 0 else r * 0.45
        pts.append((rr * math.cos(t), rr * math.sin(t)))
    top = [bm.verts.new((x, y, depth / 2)) for x, y in pts]
    bot = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    for k in range(10):
        bm.faces.new((top[k], bot[k], bot[(k + 1) % 10], top[(k + 1) % 10]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj('estrela', bm)
    rot = Vector((0, 0, 1)).rotation_difference(normal).to_matrix().to_4x4()
    o.data.transform(rot)
    o.data.transform(Matrix.Translation(center))
    return o


def presilhas():
    arm, head = base()
    n = Vector((0.55, -0.55, 0.62)).normalized()
    a = star(Vector((0.30, -0.33, 1.99)), 0.09, 0.03, n)
    b = star(Vector((0.37, -0.20, 2.08)), 0.075, 0.03, Vector((0.6, -0.45, 0.66)).normalized())
    o = join([a, b], 'Presilhas')
    set_material(o, mat('Color_', hexrgb('#f1c40f'), 0.4))
    finish(arm, head, 'enfeite-presilhas', [o])


def gatinho():
    arm, head = base()
    pts = arc_points(0.53, -84, 84, 26, y=-0.06)
    band = tube(pts, [0.022] * len(pts), seg=8)
    ears, inner = [], []
    for s_ in (1, -1):
        a = math.radians(32 * s_)
        base_p = Vector((RX * math.sin(a), -0.06, C.z + RZ * math.cos(a)))
        out = (base_p - Vector((0, -0.06, C.z))).normalized()
        side = Vector((math.cos(a), 0, -math.sin(a)))
        for lst, sc, dy in ((ears, 1.0, 0.0), (inner, 0.62, -0.022)):
            bm = bmesh.new()
            tip = bm.verts.new(base_p + out * 0.20 * sc + Vector((0, dy, 0)))
            l = bm.verts.new(base_p + side * 0.11 * sc - out * 0.01 + Vector((0, dy, 0)))
            r = bm.verts.new(base_p - side * 0.11 * sc - out * 0.01 + Vector((0, dy, 0)))
            bf = bm.verts.new(base_p + Vector((0, 0.05 * sc + dy, 0)))
            bk = bm.verts.new(base_p + Vector((0, -0.03 * sc + dy, 0)))
            for f in ((tip, l, bk), (tip, bk, r), (tip, r, bf), (tip, bf, l), (l, r, bk), (l, bf, r)):
                bm.faces.new(f)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            lst.append(new_obj('orelha', bm))
    o = join([band] + ears, 'Gatinho')
    set_material(o, mat('Color_', hexrgb('#2c3e50'), 0.5))
    i = join(inner, 'Dentro')
    set_material(i, mat('Rosa', hexrgb('#f8a5c2'), 0.6))
    for m in (o, i):
        for p in m.data.polygons:
            p.use_smooth = False
    for m in (o, i):
        bind(m, arm, head, {'Head': 1.0})
    export(arm, [o, i], 'enfeite-gatinho')


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
