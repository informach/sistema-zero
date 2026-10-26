"""Rosto mais delicado: expressões suaves da própria cabeça, olhos com cílios, sobrancelha fina, nariz menor."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *


def cabeca(pid, mix, head='head-01'):
    reset()
    arm, h = load(head)
    for k in h.data.shape_keys.key_blocks:
        k.value = mix.get(k.name, 0.0)
    export(arm, [h], pid, morph=True)


def sorrisos():
    cabeca('head-sorriso', {'smile': 0.5})
    cabeca('head-fechado', {'neutral': 0.6, 'smile': 0.4})


def face_y(head, x, z, r=0.03):
    """Frente da pele do rosto no ponto (x, z)."""
    # Interpola a frente do rosto pelos vértices mais próximos (a malha é rala na testa).
    mw = head.matrix_world
    pts = [mw @ v.co for v in head.data.vertices]
    pts = [p for p in pts if p.y < -0.2]
    near = sorted(pts, key=lambda p: (p.x - x) ** 2 + (p.z - z) ** 2)[:4]
    ws = [1 / (1e-4 + (p.x - x) ** 2 + (p.z - z) ** 2) for p in near]
    return sum(p.y * w for p, w in zip(near, ws)) / sum(ws)


def eye_boxes(o):
    mw = o.matrix_world
    out = {}
    for s in (1, -1):
        pts = [mw @ v.co for v in o.data.vertices if (mw @ v.co).x * s > 0]
        out[s] = (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
                  Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))
    return out


def lashes(box, s, size=1.0):
    """Três cílios saindo do canto de cima, do lado de fora."""
    lo, hi = box
    cx, cz = (lo.x + hi.x) / 2, (lo.z + hi.z) / 2
    rx, rz = (hi.x - lo.x) / 2, (hi.z - lo.z) / 2
    out = []
    for i, ang in enumerate((35, 60, 85)):
        a = math.radians(ang)
        bx = cx + s * rx * math.cos(math.radians(90 - ang * 0.9)) * 0.95
        bz = cz + rz * math.sin(math.radians(90 - ang * 0.9)) * 0.95
        base = Vector((bx, lo.y - 0.002, bz))
        d = Vector((s * math.sin(a), 0, math.cos(a)))
        L = (0.045 + 0.012 * i) * size
        out.append(tube([base, base + d * L * 0.6 + Vector((0, -0.004, 0)), base + d * L + Vector((s * 0.01, -0.006, -0.004))], [0.009 * size, 0.006 * size, 0.0015], seg=6))
    return out


def olhos(pid, big=False):
    reset()
    arm, e = load('eyes-09')
    boxes = eye_boxes(e)
    if big:
        mw = e.matrix_world
        cs = {s: (b[0] + b[1]) / 2 for s, b in boxes.items()}
        def f(w, v):
            c = cs[1 if w.x > 0 else -1]
            return Vector((c.x + (w.x - c.x) * 1.22, w.y - 0.006, c.z + (w.z - c.z) * 1.22))
        world_edit(e, f)
        boxes = eye_boxes(e)
    extra = []
    for s in (1, -1):
        extra += lashes(boxes[s], s, 1.15 if big else 1.0)
    l = join(extra, 'Cilios')
    set_material(l, mat('Cilio', hexrgb('#111111'), 0.4))
    meshes = [e, l]
    if big:
        dots = []
        for s in (1, -1):
            lo, hi = boxes[s]
            c = (lo + hi) / 2
            dots.append(ico(Vector((c.x - 0.018, lo.y - 0.004, c.z + 0.022)), 0.017, sub=2, scale=(1, 0.3, 1)))
            dots.append(ico(Vector((c.x + 0.016, lo.y - 0.004, c.z - 0.02)), 0.008, sub=1, scale=(1, 0.3, 1)))
        d = join(dots, 'Brilho')
        set_material(d, mat('Brilho', (1, 1, 1), 0.2))
        meshes.append(d)
    for m in meshes[1:]:
        shade(m, True)
        bind(m, arm, e, {'Head': 1.0})
    export(arm, meshes, pid, morph=True)


def cilios():
    olhos('eyes-cilios')


def brilho():
    olhos('eyes-brilho', big=True)


def sobrancelha():
    reset()
    arm, head = load('head-01')
    h = duplicate(head, 'h')
    arcs = []
    for s in (1, -1):
        pts = []
        for x, z in ((0.08, 1.792), (0.12, 1.818), (0.165, 1.832), (0.21, 1.824), (0.245, 1.80)):
            y = face_y(h, s * x, z) - 0.006
            pts.append(Vector((s * x, y, z)))
        arcs.append(tube(pts, [0.0045, 0.0065, 0.006, 0.0045, 0.002], seg=8))
    o = join(arcs, 'Sobrancelha')
    for v in o.data.vertices:  # achata contra a pele
        pass
    set_material(o, mat('Color_', hexrgb('#4a3120'), 0.6))
    shade(o, True)
    bind(o, arm, head, {'Head': 1.0})
    bpy.data.objects.remove(h)
    bpy.data.objects.remove(head)
    export(arm, [o], 'eyebrow-fina')


def nariz():
    reset()
    arm, n = load('nose-01')
    mw = n.matrix_world
    pts = [mw @ v.co for v in n.data.vertices]
    back = max(p.y for p in pts)
    a = Vector((0, back, sum(p.z for p in pts) / len(pts)))
    world_edit(n, lambda w, v: Vector((a.x + (w.x - a.x) * 0.66, a.y + (w.y - a.y) * 0.9 - 0.006, a.z + (w.z - a.z) * 0.66)))
    export(arm, [n], 'nose-pequeno')


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
