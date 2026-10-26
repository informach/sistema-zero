import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

EYE = [Vector((0.15, -0.475, 1.70)), Vector((-0.15, -0.475, 1.70))]


def hastes():
    """Aproveita as hastes dos óculos 1 (já encaixadas nas orelhas) e descarta a frente."""
    arm, g = load('glasses-01')
    h = duplicate(g, 'hastes')
    delete_verts(h, lambda p, v: p.y < -0.36 or abs(p.x) < 0.30)
    bpy.data.objects.remove(g)
    return arm, h


def aro(c, R, r, gatinho=False):
    t = torus(c, R, r, seg=32, rseg=8, rot=(math.radians(90), 0, 0), scale=(1.08, 1, 0.92))
    if gatinho:
        side = 1 if c.x > 0 else -1
        for v in t.data.vertices:
            d = v.co - c
            # puxa o canto de cima, do lado de fora, para cima e para fora
            k = max(0.0, (d.x * side) / R) * max(0.0, d.z / R)
            v.co += Vector((side * 0.06, 0, 0.05)) * (k ** 1.5) * 1.6
    return t


def oculos(pid, gatinho):
    reset()
    arm, h = hastes()
    parts = [aro(EYE[0], 0.11, 0.014, gatinho), aro(EYE[1], 0.11, 0.014, gatinho)]
    parts.append(tube([(-0.045, -0.49, 1.73), (0, -0.50, 1.745), (0.045, -0.49, 1.73)], [0.011] * 3, seg=6))
    # liga cada aro à haste
    for s in (1, -1):
        parts.append(tube([(s * 0.26, -0.47, 1.73), (s * 0.31, -0.40, 1.735), (s * 0.34, -0.34, 1.74)], [0.012] * 3, seg=6))
    f = join(parts, 'Frente')
    m = mat('Color_', hexrgb('#e84393'), 0.35)
    set_material(f, m)
    set_material(h, m)
    shade(f, True)
    bind(f, arm, h, {'Head': 1.0})
    bind(h, arm, h, {'Head': 1.0})
    export(arm, [f, h], pid)


def redondo():
    oculos('glasses-redondo', False)


def gatinho():
    oculos('glasses-gatinho', True)


def sardas():
    reset()
    random.seed(3)
    arm, blush = load('face-01')
    b = duplicate(blush, 'tmp')
    pts = [v.co.copy() for v in b.data.vertices]
    out = []
    for s in (1, -1):
        side = [p for p in pts if p.x * s > 0]
        c = sum(side, Vector()) / len(side)
        front = min(p.y for p in side)
        for k in range(7):
            a = random.uniform(0, 2 * math.pi)
            r = random.uniform(0.0, 0.07)
            q = Vector((c.x + r * math.cos(a), 0, c.z + 0.02 + r * math.sin(a) * 0.6))
            near = min(side, key=lambda p: (p.x - q.x) ** 2 + (p.z - q.z) ** 2)
            out.append(ico(Vector((q.x, near.y - 0.004, q.z)), random.uniform(0.010, 0.014), sub=1, scale=(1, 0.35, 1)))
    bpy.data.objects.remove(b)
    o = join(out, 'Sardas')
    set_material(o, mat('Sarda', hexrgb('#8a4b2a'), 0.9))
    bind(o, arm, blush, {'Head': 1.0})
    bpy.data.objects.remove(blush)
    export(arm, [o], 'face-sardas')


def bochecha():
    reset()
    arm, blush = load('face-01')
    b = duplicate(blush, 'tmp')
    pts = [v.co.copy() for v in b.data.vertices]
    out = []
    for s in (1, -1):
        side = [p for p in pts if p.x * s > 0]
        c = sum(side, Vector()) / len(side)
        front = min(side, key=lambda p: (p.x - c.x) ** 2 + (p.z - c.z) ** 2)
        d = ico(Vector((c.x, front.y + 0.006, c.z)), 0.062, sub=3, scale=(1, 0.18, 0.62))
        out.append(d)
    bpy.data.objects.remove(b)
    o = join(out, 'Bochecha')
    set_material(o, mat('Rosado', hexrgb('#f3a6b4'), 0.9))
    shade(o, True)
    bind(o, arm, blush, {'Head': 1.0})
    bpy.data.objects.remove(blush)
    export(arm, [o], 'face-bochecha')


def colar():
    reset()
    arm, top = load('top-03')
    alvo = duplicate(top, 'alvo')
    # Corrente: laço em U (alto atrás, baixo na frente), depois assentado no peito.
    pts = []
    for i in range(48):
        a = 2 * math.pi * i / 48
        pts.append(Vector((0.22 * math.sin(a), -0.07 - 0.22 * math.cos(a), 1.10 + 0.17 * (1 - math.cos(a)) / 2)))
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    for i in range(48):
        bm.edges.new((vs[i], vs[(i + 1) % 48]))
    curva = new_obj('curva', bm)
    sw = curva.modifiers.new('sw', 'SHRINKWRAP')
    sw.target = alvo
    sw.wrap_method = 'NEAREST_SURFACEPOINT'
    sw.wrap_mode = 'OUTSIDE_SURFACE'
    sw.offset = 0.014
    bpy.context.view_layer.objects.active = curva
    bpy.ops.object.modifier_apply(modifier='sw')
    cp = [curva.matrix_world @ v.co for v in curva.data.vertices]
    chain = tube(cp + [cp[0]], [0.009] * (len(cp) + 1), seg=6, cap=False)
    set_material(chain, mat('Ouro', hexrgb('#e2b13c'), 0.3))
    front = min(cp, key=lambda p: p.y)
    c = front + Vector((0, -0.02, -0.05))
    heart = [ico(c + Vector((0.026, 0, 0.014)), 0.031, sub=2, scale=(1, 0.45, 1)), ico(c + Vector((-0.026, 0, 0.014)), 0.031, sub=2, scale=(1, 0.45, 1))]
    tip = ico(c + Vector((0, 0, -0.014)), 0.036, sub=2, scale=(1, 0.45, 1))
    for v in tip.data.vertices:
        if v.co.z < c.z - 0.014:
            dz = c.z - 0.014 - v.co.z
            v.co.x *= 0.15 + 0.85 * max(0, 1 - dz / 0.036)
            v.co.z -= dz * 0.6
    p = join(heart + [tip], 'Pingente')
    set_material(p, mat('Color_', hexrgb('#e74c3c'), 0.3))
    for o in (chain, p):
        shade(o, True)
        bind(o, arm, top, {'Spine2': 0.7, 'Neck': 0.3})
    for o in (top, alvo, curva):
        bpy.data.objects.remove(o)
    export(arm, [chain, p], 'acc-colar')


def cachecol():
    reset()
    arm, top = load('top-01')
    ring = torus(Vector((0, -0.01, 1.25)), 0.19, 0.06, seg=32, rseg=10, rot=(math.radians(-10), 0, 0), scale=(1.05, 1.08, 1))
    tail = tube([(0.10, -0.24, 1.22), (0.12, -0.33, 1.08), (0.13, -0.39, 0.94), (0.135, -0.405, 0.86)], [0.05, 0.05, 0.048, 0.045], seg=10)
    for v in tail.data.vertices:  # ponta achatada contra o peito
        v.co.y = -0.33 + (v.co.y + 0.33) * 0.55 if v.co.z < 1.15 else v.co.y
    m = mat('Color_', hexrgb('#c0392b'), 0.9)
    for o in (ring, tail):
        set_material(o, m)
        shade(o, True)
    bind(ring, arm, top, {'Spine2': 0.6, 'Neck': 0.4})
    bind(tail, arm, top, lambda p: {'Spine2': 1.0} if p.z > 1.05 else {'Spine1': 0.6, 'Spine2': 0.4})
    bpy.data.objects.remove(top)
    export(arm, [ring, tail], 'acc-cachecol')


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
