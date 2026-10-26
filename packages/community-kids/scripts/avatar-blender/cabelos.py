import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

HEAD_C = Vector((0, -0.03, 1.70))


def hairline(p):
    """Altura mínima do cabelo em volta da cabeça: testa alta, nuca baixa."""
    th = math.atan2(p.x, -(p.y - HEAD_C.y))
    return 1.40 + (1.90 - 1.40) * math.cos(th / 2) ** 2


def cap(arm, head, dist=0.035, thick=0.03, low=0.0):
    """Casca justa sobre o couro cabeludo, copiada da própria cabeça e inflada."""
    c = duplicate(head, 'cap')
    c.data.materials.clear()
    c.vertex_groups.clear()
    delete_verts(c, lambda p, v: p.z < hairline(p) - low or (abs(p.x) > 0.43 and p.z < 1.82) or p.z < 1.30)
    inflate(c, dist)
    solidify(c, thick, offset=1)
    return c


def curls(points, r, jitter=0.25, sub=1):
    out = []
    for p in points:
        rr = r * (1 + random.uniform(-jitter, jitter))
        out.append(ico(p, rr, sub=sub))
    return out


def scalp_points(head, step, out_dist, low=0.0, front_cut=1.90):
    """Pontos sobre a cabeça (inflada) para espalhar cachos."""
    pts = []
    head.data.update()
    mw = head.matrix_world
    for v in head.data.vertices:
        p = mw @ v.co
        if p.z < hairline(p) - low or (abs(p.x) > 0.43 and p.z < 1.80) or p.z < 1.30:
            continue
        n = (mw.to_3x3() @ v.normal).normalized()
        pts.append(p + n * out_dist)
    # amostragem rala por grade
    seen, res = set(), []
    for p in pts:
        k = (round(p.x / step), round(p.y / step), round(p.z / step))
        if k not in seen:
            seen.add(k)
            res.append(p)
    return res


def finish(parts, arm, head, pid, voxel=0.018, smooth=2, extra=()):
    o = join(parts, 'Hair')
    remesh_smooth(o, voxel, smooth)
    shade(o, True)
    set_material(o, mat('Color_', hexrgb('#4a3120'), 0.7))
    meshes = [o]
    for e in extra:
        meshes.append(e)
    for m in meshes:
        bind(m, arm, head, {'Head': 1.0})
    export(arm, meshes, pid)


def base():
    reset()
    random.seed(7)
    arm, head = load('head-01')
    return arm, head


def tie(center, R, axis_rot, color='#e84393'):
    t = torus(center, R, 0.018, seg=20, rseg=6, rot=axis_rot)
    set_material(t, mat('Prendedor', hexrgb(color), 0.6))
    shade(t, True)
    return t


def ponytail():
    arm, head = base()
    c = cap(arm, head)
    # Rabo preso no alto da cabeça: sobe acima do topo (aparece de frente) e cai pelas costas.
    pts = [(0, 0.18, 2.12), (0, 0.24, 2.24), (0, 0.36, 2.31), (0, 0.52, 2.26), (0, 0.64, 2.10), (0, 0.70, 1.88), (0, 0.68, 1.64), (0, 0.62, 1.44), (0, 0.56, 1.30)]
    rad = [0.11, 0.12, 0.13, 0.14, 0.14, 0.13, 0.11, 0.08, 0.02]
    t = tube(pts, rad, seg=14)
    finish([c, t], arm, head, 'hair-rabo', extra=[tie(Vector((0, 0.22, 2.20)), 0.11, (math.radians(30), 0, 0))])
    bpy.data.objects.remove(head)


def afro():
    arm, head = base()
    c = cap(arm, head, dist=0.06, thick=0.06)
    pts = scalp_points(head, 0.075, 0.13, low=0.04)
    pts += scalp_points(head, 0.09, 0.22, low=-0.02)
    parts = [c] + curls(pts, 0.085)
    finish(parts, arm, head, 'hair-crespo', voxel=0.02, smooth=1)


def fringe(side=1):
    """Franja de lado: uma mecha achatada atravessando a testa."""
    pts = [(-0.30 * side, -0.33, 2.02), (-0.12 * side, -0.41, 1.98), (0.08 * side, -0.43, 1.92), (0.24 * side, -0.40, 1.86), (0.33 * side, -0.34, 1.80)]
    t = tube(pts, [0.06, 0.075, 0.07, 0.06, 0.035], seg=10)
    for v in t.data.vertices:
        v.co.y = -0.30 + (v.co.y + 0.30) * 0.75
    return t


def braid(side):
    """Trança: contas achatadas alternando de lado, do lado da orelha até o ombro."""
    out = []
    path = [Vector((0.37 * side, 0.02, 1.62)), Vector((0.41 * side, -0.02, 1.48)), Vector((0.41 * side, -0.05, 1.34)), Vector((0.39 * side, -0.06, 1.22))]
    n = 9
    for i in range(n):
        t = i / (n - 1)
        seg = min(int(t * 3), 2)
        lt = t * 3 - seg
        p = path[seg].lerp(path[seg + 1], lt)
        r = 0.065 - 0.02 * t
        off = Vector((0.018 * (1 if i % 2 else -1), 0, 0))
        out.append(ico(p + off, r, sub=2, scale=(1.0, 0.85, 1.25)))
    return out, path[-1] + Vector((0, 0, -0.03))


def trancas():
    arm, head = base()
    parts = [cap(arm, head), fringe(1)]
    ties = []
    for s_ in (1, -1):
        b, end = braid(s_)
        parts += b
        ties.append(tie(end, 0.04, (0, 0, 0)))
    finish(parts, arm, head, 'hair-trancas', extra=ties)


def longo():
    arm, head = base()
    parts = [cap(arm, head, dist=0.04, thick=0.04), fringe(-1)]
    # Cortina de trás e dos lados: anéis abertos na frente, descendo até os ombros.
    bm = bmesh.new()
    rings = []
    # (altura, raio, quanto abre na frente): acompanha a cabeça e desce até os ombros.
    prof = [(1.92, 0.36, 100), (1.82, 0.46, 108), (1.68, 0.52, 112), (1.52, 0.53, 112), (1.38, 0.52, 110), (1.26, 0.50, 106), (1.16, 0.47, 100), (1.10, 0.43, 92)]
    for z, R, ab in prof:
        ring = []
        for k in range(17):
            a = math.radians(-ab + 2 * ab * k / 16)  # 0 = nuca
            ring.append(bm.verts.new((R * math.sin(a), 0.0 + R * math.cos(a) * 0.92, z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(16):
            bm.faces.new((rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]))
    cur = new_obj('cortina', bm)
    solidify(cur, 0.08, offset=-1)
    parts.append(cur)
    # Mechas por cima da cortina: dão volume e recortam a barra em pontas.
    for k in range(11):
        a = math.radians(-100 + 200 * k / 10)
        low = 1.08 if k % 2 else 1.03
        pts = []
        for z, R, _ in prof[1:]:
            pts.append(Vector(((R + 0.015) * math.sin(a), (R + 0.015) * math.cos(a) * 0.92, z)))
        pts.append(Vector(((prof[-1][1] - 0.02) * math.sin(a), (prof[-1][1] - 0.02) * math.cos(a) * 0.92, low)))
        rad = [0.045] * (len(pts) - 1) + [0.018]
        parts.append(tube(pts, rad, seg=8))
    finish(parts, arm, head, 'hair-longo', voxel=0.016, smooth=3)


def coque():
    arm, head = base()
    parts = [cap(arm, head), uvsphere((0, 0.02, 2.24), 0.15, scale=(1, 1, 0.85))]
    finish(parts, arm, head, 'hair-coque', extra=[tie(Vector((0, 0.02, 2.14)), 0.10, (0, 0, 0))])


def chiquinha():
    arm, head = base()
    parts = [cap(arm, head), fringe(1)]
    ties = []
    for s_ in (1, -1):
        pts = [(0.36 * s_, 0.12, 1.88), (0.50 * s_, 0.14, 1.84), (0.60 * s_, 0.15, 1.70), (0.62 * s_, 0.14, 1.52), (0.58 * s_, 0.12, 1.36), (0.54 * s_, 0.10, 1.26)]
        parts.append(tube(pts, [0.08, 0.10, 0.11, 0.10, 0.075, 0.05], seg=12))
        parts.append(ico(pts[-1], 0.05, sub=2))  # ponta arredondada
        ties.append(tie(Vector((0.47 * s_, 0.14, 1.855)), 0.075, (0, math.radians(90 - 15 * s_), 0)))
    finish(parts, arm, head, 'hair-chiquinha', extra=ties)


def cachos():
    arm, head = base()
    c = cap(arm, head, dist=0.03, thick=0.04)
    pts = scalp_points(head, 0.065, 0.07)
    parts = [c] + curls(pts, 0.06, jitter=0.2)
    finish(parts, arm, head, 'hair-cachos', voxel=0.016, smooth=1)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
