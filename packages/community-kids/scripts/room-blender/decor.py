"""Enfeites de chão e de parede, plantas e luzes do quarto.

Chão: base em z = 0, frente para -Y. Parede: centrada na origem, a face para -Y e o fundo
encostado em y = +0.10 (o quarto pendura a peça 0.14 à frente da parede).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_q import *

WALL_BACK = 0.10


def shift_x(objs, dx):
    """Desloca a peça inteira em x (para caber no seu footprint)."""
    for o in objs:
        o.location.x += dx
    return objs


def plate(w, h, d, m, z=0.0, y=None, bevel=0.02, x=0.0):
    """Placa de parede (frente para -Y), com o fundo encostado na parede."""
    y = WALL_BACK - d / 2 if y is None else y
    return box((w, d, h), (x, y, z), m, bevel=bevel)


# ── Chão ───────────────────────────────────────────────────────────────────────
def ursinho():
    reset()
    p = [sphere(0.3, (0, 0, 0.34), 'fur', scale=(1, 0.85, 1.05), subdiv=3)]
    p.append(sphere(0.18, (0, -0.2, 0.32), 'furLight', scale=(1, 0.5, 1.1), subdiv=2))
    p.append(sphere(0.25, (0, -0.02, 0.8), 'fur', scale=(1, 0.9, 0.95), subdiv=3))
    for s in (-1, 1):
        p.append(sphere(0.09, (s * 0.2, 0.0, 1.02), 'fur', subdiv=2))
        p.append(sphere(0.05, (s * 0.2, -0.05, 1.02), 'furLight', scale=(1, 0.5, 1), subdiv=1))
        p.append(sphere(0.11, (s * 0.3, -0.1, 0.42), 'fur', scale=(0.8, 0.8, 1.3), subdiv=2))  # braço
        p.append(sphere(0.13, (s * 0.17, -0.2, 0.1), 'fur', scale=(1, 1.3, 0.75), subdiv=2))  # pé
        p.append(sphere(0.07, (s * 0.17, -0.34, 0.1), 'furLight', scale=(1, 0.4, 1), subdiv=1))
        p.append(sphere(0.03, (s * 0.09, -0.22, 0.86), 'black', subdiv=1))  # olho
    p.append(sphere(0.11, (0, -0.2, 0.74), 'furLight', scale=(1, 0.7, 0.8), subdiv=2))
    p.append(sphere(0.04, (0, -0.28, 0.77), 'black', scale=(1.2, 1, 0.8), subdiv=1))
    # Lacinho no pescoço.
    for s in (-1, 1):
        p.append(sphere(0.07, (s * 0.07, -0.22, 0.6), 'red', scale=(1, 0.5, 0.7), subdiv=1))
    p.append(sphere(0.035, (0, -0.24, 0.6), 'red', subdiv=1))
    export('ursinho', p)


def balao():
    reset()
    p = [cyl(0.1, 0.08, (0, 0, 0.04), 'grayDark', verts=12, bevel=0.01)]
    for cor, dx, dy, top in (('red', 0.0, 0.0, 1.9), ('yellow', -0.3, 0.12, 1.66), ('blue', 0.28, 0.14, 1.6)):
        cx, cy, cz = dx, dy, top - 0.22
        b = sphere(0.27, (cx, cy, cz), cor, scale=(1, 1, 1.18), subdiv=3)
        for v in b.data.vertices:  # gota: mais estreito embaixo
            if v.co.z < 0:
                f = 1 + v.co.z / 0.27 * 0.25
                v.co.x *= f
                v.co.y *= f
        p.append(b)
        p.append(cone(0.045, 0.06, (cx, cy, cz - 0.33), cor, verts=8))
        fio = [(cx * t, cy * t, 0.08 + (cz - 0.38) * t + 0.04 * math.sin(t * 9)) for t in [i / 10 for i in range(11)]]
        fio = [(x + 0.02 * math.sin(i * 1.3), y, z) for i, (x, y, z) in enumerate(fio)]
        p.append(tube(fio, [0.008] * len(fio), 'white', seg=5))
    export('balao', p)


def bandeira():
    reset()
    p = [cyl(0.16, 0.06, (0, 0.1, 0.03), 'grayDark', verts=14, bevel=0.01)]
    p.append(cyl(0.025, 1.75, (0, 0.1, 0.9), 'woodDark', verts=10))
    p.append(sphere(0.045, (0, 0.1, 1.8), 'yellow', subdiv=2))
    # Pano ondulado: grade dobrada em seno, preso ao mastro.
    bm = bmesh.new()
    nx, nz = 10, 5
    vs = [[bm.verts.new((0.02 + 0.68 * i / nx, 0.1 + 0.05 * math.sin(i / nx * math.pi * 2), 1.2 + 0.44 * k / nz)) for k in range(nz + 1)] for i in range(nx + 1)]
    for i in range(nx):
        for k in range(nz):
            bm.faces.new((vs[i][k], vs[i + 1][k], vs[i + 1][k + 1], vs[i][k + 1]))
    pano = smooth(__import__('lib_q')._obj('pano', bm, 'red'))
    sol = pano.modifiers.new('s', 'SOLIDIFY')
    sol.thickness = 0.02
    __import__('lib_q')._apply(pano, sol)
    p.append(pano)
    estrela = prism(star_pts(0.1, 0.045), 0.03, (0.36, 0.1 + 0.05 * math.sin(math.pi), 1.42), 'yellow')
    estrela.location.y -= 0.03
    p.append(estrela)
    export('bandeira', shift_x(p, -0.27))


def globo():
    reset()
    p = [cyl(0.2, 0.06, (0, 0, 0.03), 'woodDark', verts=16, bevel=0.015)]
    p.append(cyl(0.03, 0.22, (0, 0, 0.17), 'metal', verts=10))
    g = (0, 0, 0.56)
    p.append(sphere(0.27, g, 'blue', subdiv=3))
    random.seed(4)
    # Continentes: placas verdes coladas na esfera.
    for lat, lon, s in ((30, -100, 0.15), (-15, -60, 0.12), (45, 15, 0.12), (5, 20, 0.14), (40, 90, 0.16), (-25, 135, 0.1)):
        la, lo = math.radians(lat), math.radians(lon)
        d = Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))
        c = sphere(s, (g[0] + d.x * 0.25, g[1] + d.y * 0.25, g[2] + d.z * 0.25), 'leafLight', scale=(1, 1, 0.35), subdiv=1, smooth_it=False)
        c.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
        p.append(c)
    meridiano = torus(0.31, 0.015, g, 'metal', seg=28, rseg=6, rot=(math.radians(90), math.radians(23), 0), arc=200)
    p.append(meridiano)
    export('globo', p)


def guitarra():
    """Violão encostado no suporte: dois bojos, boca, cavalete, braço com trastes e a cabeça."""
    reset()
    inc = math.radians(10)  # inclinado para trás, apoiado no suporte

    def em_pe(z, y=0.0):
        """Ponto do eixo do violão já inclinado (base no chão, sobe para +Z e recua para +Y)."""
        return (0, y + z * math.sin(inc), z * math.cos(inc))

    p = [box((0.5, 0.36, 0.05), (0, 0.06, 0.025), 'black', bevel=0.015)]
    for s_ in (-1, 1):
        p.append(cyl(0.015, 0.5, (s_ * 0.14, 0.16, 0.27), 'black', verts=6, rot=(math.radians(-14), 0, 0)))
    rot = (math.radians(90) - inc, 0, 0)
    for z, r in ((0.42, 0.3), (0.82, 0.23)):
        p.append(cyl(r, 0.13, em_pe(z, 0.0), 'orange', verts=28, bevel=0.025, rot=rot))
    p.append(cyl(0.16, 0.135, em_pe(0.62, 0.0), 'orange', verts=20, rot=rot))  # cintura
    bx, by, bz = em_pe(0.74, -0.07)
    p.append(cyl(0.09, 0.02, (bx, by, bz), 'black', verts=20, rot=rot))
    p.append(torus(0.105, 0.012, (bx, by - 0.005, bz), 'woodLight', seg=24, rseg=5, rot=rot))
    cx, cy, cz = em_pe(0.34, -0.075)
    p.append(box((0.22, 0.03, 0.05), (cx, cy, cz), 'woodDark', bevel=0.01, rot=(-inc, 0, 0)))
    nx, ny, nz = em_pe(1.32, -0.03)
    p.append(box((0.085, 0.05, 0.84), (nx, ny, nz), 'woodDark', bevel=0.012, rot=(-inc, 0, 0)))
    for k in range(7):
        fx, fy, fz = em_pe(1.0 + 0.1 * k, -0.058)
        p.append(box((0.088, 0.008, 0.008), (fx, fy, fz), 'metal', bevel=0.0, rot=(-inc, 0, 0)))
    hx, hy, hz = em_pe(1.84, -0.02)
    p.append(box((0.16, 0.05, 0.22), (hx, hy, hz), 'woodDark', bevel=0.03, rot=(-inc, 0, 0)))
    for k in range(3):
        for s_ in (-1, 1):
            tx, ty, tz = em_pe(1.77 + 0.07 * k, -0.02)
            p.append(cyl(0.014, 0.05, (s_ * 0.1, ty, tz), 'metal', verts=6, rot=(0, math.radians(90), 0)))
    for k in range(6):
        x = -0.026 + 0.0104 * k
        a = em_pe(0.34, -0.1)
        b_ = em_pe(1.74, -0.06)
        p.append(tube([(x, a[1], a[2]), (x, b_[1], b_[2])], [0.0028, 0.0028], 'metal', seg=4, cap=False))
    export('guitarra', p)


def bola():
    reset()
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=0.28)
    import lib_q
    o = lib_q._obj('bola', bm, 'white')
    o.data.materials.append(mat('black'))
    # Gomos pretos ao redor dos 12 vértices do icosaedro (o desenho clássico da bola).
    phi = (1 + 5 ** 0.5) / 2
    tops = [Vector(v).normalized() for v in ((-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0), (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi), (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1))]
    for poly in o.data.polygons:
        c = poly.center.normalized()
        if max(c.dot(t) for t in tops) > 0.93:
            poly.material_index = 1
    flat(o)
    o.location = (0, 0, 0.28)
    export('bola', [o])


# ── Parede ─────────────────────────────────────────────────────────────────────
def quadro():
    reset()
    p = [plate(1.8, 1.8, 0.1, 'woodDark', bevel=0.03)]
    y = WALL_BACK - 0.1
    p.append(plate(1.56, 1.56, 0.02, 'cream', y=y - 0.0, bevel=0.0))
    p.append(prism([(-0.7, -0.6), (0.7, -0.6), (0.7, -0.2), (-0.7, -0.2)], 0.02, (0, y - 0.02, 0), 'leafLight'))
    p.append(prism([(-0.72, -0.25), (-0.3, 0.45), (0.1, -0.1), (0.35, 0.25), (0.72, -0.25)], 0.02, (0, y - 0.03, 0), 'leaf'))
    p.append(prism([(-0.4, 0.29), (-0.3, 0.45), (-0.2, 0.29)], 0.02, (0, y - 0.04, 0), 'white'))
    sol = cyl(0.17, 0.02, (0.45, y - 0.03, 0.42), 'yellow', verts=20, rot=(math.radians(90), 0, 0))
    p.append(sol)
    p.append(prism([(-0.25, 0.25), (0.05, 0.28), (0.15, 0.36), (-0.15, 0.4)], 0.015, (0, y - 0.04, 0), 'white'))
    export('quadro', p)


def estrela():
    reset()
    s = prism(star_pts(0.46, 0.2), 0.12, (0, WALL_BACK - 0.06, 0), 'yellow', bevel=0.03)
    # Volume: o miolo da estrela é mais alto que as pontas.
    for v in s.data.vertices:
        if v.co.y < 0:
            r = math.hypot(v.co.x, v.co.z)
            v.co.y -= 0.08 * max(0, 1 - r / 0.46)
    m = prism(star_pts(0.2, 0.09), 0.04, (0, WALL_BACK - 0.16, 0), 'lamp', bevel=0.01)
    export('estrela', [s, m])


def janela():
    reset()
    y = WALL_BACK
    p = [plate(1.7, 1.7, 0.12, 'white', bevel=0.03)]
    p.append(plate(1.5, 1.5, 0.02, 'glass', y=y - 0.13, bevel=0.0))
    for x in (0,):
        p.append(plate(0.07, 1.5, 0.05, 'white', y=y - 0.14, x=x))
    p.append(plate(1.5, 0.07, 0.05, 'white', y=y - 0.14))
    p.append(box((1.86, 0.22, 0.07), (0, y - 0.13, -0.88), 'white', bevel=0.02))
    # Nuvem no vidro e cortininhas presas no alto.
    for dx, r in ((-0.35, 0.12), (-0.22, 0.16), (-0.08, 0.12)):
        p.append(sphere(r, (dx, y - 0.13, 0.38), 'white', scale=(1, 0.2, 0.8), subdiv=2))
    p.append(box((2.0, 0.06, 0.06), (0, y - 0.26, 0.92), 'woodDark', bevel=0.02))
    for s in (-1, 1):
        cort = cushion((0.34, 0.08, 1.6), (s * 0.86, y - 0.26, 0.1), 'pink', puff=0.0, round_=0.3)
        for v in cort.data.vertices:
            v.co.y += 0.03 * math.sin(v.co.x * 30)
            if v.co.z < 0:
                v.co.x *= 1 + 0.4 * (-v.co.z / 0.8)
        p.append(cort)
    export('janela', p)


def relogio():
    reset()
    y = WALL_BACK
    p = [cyl(0.44, 0.1, (0, y - 0.05, 0), 'red', verts=32, bevel=0.03, rot=(math.radians(90), 0, 0))]
    p.append(cyl(0.38, 0.02, (0, y - 0.11, 0), 'white', verts=32, rot=(math.radians(90), 0, 0)))
    for i in range(12):
        a = math.radians(i * 30)
        big = i % 3 == 0
        p.append(box((0.03 if big else 0.02, 0.02, 0.09 if big else 0.05), (0.31 * math.sin(a), y - 0.13, 0.31 * math.cos(a)), 'black', bevel=0.0, rot=(0, a, 0)))
    p.append(box((0.04, 0.02, 0.22), (0.05, y - 0.15, 0.08), 'black', bevel=0.005, rot=(0, math.radians(30), 0)))
    p.append(box((0.03, 0.02, 0.3), (-0.1, y - 0.16, 0.08), 'black', bevel=0.005, rot=(0, math.radians(-50), 0)))
    p.append(cyl(0.04, 0.03, (0, y - 0.17, 0), 'yellow', verts=12, rot=(math.radians(90), 0, 0)))
    for s in (-1, 1):  # sininhos do despertador
        p.append(sphere(0.12, (s * 0.3, y - 0.05, 0.42), 'yellow', scale=(1, 0.7, 0.7), subdiv=2))
    export('relogio', p)


def prateleira():
    reset()
    y = WALL_BACK
    p = [box((1.86, 0.44, 0.07), (0, y - 0.22, -0.2), 'wood', bevel=0.02)]
    for s in (-1, 1):
        # Mão-francesa: o lado reto na parede, o de cima embaixo da tábua.
        p.append(prism([(0, 0), (0, 0.22), (-0.26, 0.22)], 0.05, (s * 0.7, y, -0.455), 'woodDark', rot=(0, 0, math.radians(90))))
    cores = ['red', 'blue', 'yellow', 'green', 'purple']
    x = -0.82
    for i in range(5):
        h = 0.32 + 0.06 * (i % 3)
        p.append(box((0.08, 0.3, h), (x, y - 0.24, -0.165 + h / 2), cores[i], bevel=0.01))
        x += 0.095
    p.append(box((0.08, 0.3, 0.34), (x + 0.02, y - 0.24, 0.0), 'teal', bevel=0.01, rot=(0, math.radians(20), 0)))
    p.append(cyl(0.11, 0.18, (0.15, y - 0.24, -0.075), 'terracotta', verts=12, r2=0.09))
    for k in range(5):
        a = k * 1.25
        p.append(sphere(0.07, (0.15 + 0.08 * math.cos(a), y - 0.24 + 0.05 * math.sin(a), 0.06 + 0.04 * (k % 2)), 'leafLight', scale=(1, 1, 0.7), subdiv=1, smooth_it=False))
    p.append(box((0.24, 0.24, 0.22), (0.6, y - 0.24, -0.055), 'yellow', bevel=0.03))
    p.append(sphere(0.07, (0.6, y - 0.24, 0.12), 'red', subdiv=2))
    export('prateleira', p)


def poster():
    reset()
    y = WALL_BACK
    p = [plate(0.88, 1.84, 0.03, 'navy', bevel=0.01)]
    yy = y - 0.04
    p.append(sphere(0.2, (0.18, yy, 0.46), 'orange', scale=(1, 0.15, 1), subdiv=2))
    # Anel achatado no plano do pôster (inclinado, mas sem atravessar a parede).
    anel = torus(0.3, 0.02, (0.18, yy - 0.01, 0.46), 'yellow', seg=24, rseg=5, rot=(math.radians(90), math.radians(20), 0))
    anel.scale = (1, 0.35, 1)
    p.append(anel)
    for k in range(14):
        random.seed(k)
        p.append(sphere(0.015, (random.uniform(-0.38, 0.38), yy, random.uniform(-0.8, 0.85)), 'white', subdiv=1))
    # Foguete subindo.
    p.append(cyl(0.07, 0.34, (-0.16, yy - 0.01, -0.1), 'white', verts=12, rot=(0, math.radians(-25), 0)))
    p.append(cone(0.07, 0.14, (-0.08, yy - 0.01, 0.13), 'red', verts=12, rot=(0, math.radians(-25), 0)))
    p.append(cone(0.06, 0.2, (-0.27, yy - 0.01, -0.33), 'lamp', verts=10, rot=(0, math.radians(155), 0)))
    p.append(text('JOGUE', 0.15, (0, yy - 0.01, -0.7), 'yellow', depth=0.01))
    export('poster', p)


def espelho():
    reset()
    y = WALL_BACK
    f = cyl(0.48, 0.08, (0, y - 0.04, 0), 'woodLight', verts=32, bevel=0.025, rot=(math.radians(90), 0, 0))
    f.scale = (1, 1, 1)
    for v in f.data.vertices:
        v.co.y *= 1.95  # oval alto (y local vira z depois do giro)
    g = cyl(0.42, 0.02, (0, y - 0.09, 0), 'glass', verts=32, rot=(math.radians(90), 0, 0))
    for v in g.data.vertices:
        v.co.y *= 2.0
    brilho = box((0.05, 0.01, 0.4), (-0.18, y - 0.105, 0.25), 'white', bevel=0.0, rot=(0, math.radians(25), 0))
    export('espelho', [f, g, brilho])


# ── Plantas ───────────────────────────────────────────────────────────────────
def folha(base, ang, comp, larg, incl, m='leaf'):
    """Folha recortada (prisma fino) inclinada para fora a partir da base."""
    pts = [(larg * math.sin(math.pi * t) * (1 - 0.3 * t), comp * t) for t in [i / 8 for i in range(9)]]
    pts = pts + [(-x, y) for x, y in reversed(pts[1:-1])]
    o = prism(pts, 0.02, base, m)
    o.rotation_euler = (math.radians(incl), 0, math.radians(ang))
    return o


def planta():
    reset()
    p = [cyl(0.24, 0.46, (0, 0, 0.23), 'terracotta', verts=16, r2=0.3, bevel=0.02)]
    p.append(torus(0.29, 0.03, (0, 0, 0.45), 'terracotta', seg=20, rseg=6))
    p.append(cyl(0.26, 0.04, (0, 0, 0.43), 'woodDark', verts=16))
    for k in range(9):
        p.append(folha((0, 0, 0.45), k * 40, 0.55 + 0.1 * (k % 3), 0.17, 35 + 10 * (k % 2), 'leaf' if k % 2 else 'leafLight'))
    export('planta', p)


def arvore():
    reset()
    p = [cyl(0.38, 0.6, (0, 0, 0.3), 'white', verts=18, r2=0.44, bevel=0.03)]
    p.append(cyl(0.4, 0.04, (0, 0, 0.58), 'woodDark', verts=18))
    p.append(tube([(0, 0, 0.55), (0.05, 0, 1.2), (-0.04, 0.02, 1.8), (0.02, 0, 2.2)], [0.08, 0.07, 0.06, 0.05], 'woodDark', seg=8))
    random.seed(11)
    for k in range(16):
        a = k * 2.4
        z = 1.35 + 1.1 * (k / 16)
        r = 0.55 * (1 - 0.6 * (k / 16))
        c = (r * math.cos(a), r * math.sin(a), z)
        p.append(sphere(0.32 - 0.1 * (k / 16), c, 'leaf' if k % 3 else 'leafLight', scale=(1, 1, 0.85), subdiv=1, smooth_it=False))
    export('arvore', p)


# ── Luzes ────────────────────────────────────────────────────────────────────
def luminaria():
    reset()
    p = [cyl(0.26, 0.05, (0, 0, 0.025), 'grayDark', verts=20, bevel=0.015)]
    p.append(tube([(0, 0, 0.05), (0, 0, 1.4), (0.05, 0, 1.85), (0.22, 0, 2.0)], [0.025] * 4, 'metal', seg=8))
    sh = cyl(0.3, 0.32, (0.3, 0, 1.92), 'yellow', verts=24, r2=0.16)
    p.append(sh)
    p.append(cyl(0.27, 0.02, (0.3, 0, 1.77), 'lamp', verts=24))
    p.append(sphere(0.09, (0.3, 0, 1.84), 'lamp', subdiv=2))
    export('luminaria', shift_x(p, -0.15))


def vela():
    reset()
    p = [cyl(0.24, 0.06, (0, 0, 0.03), 'gold', verts=20, bevel=0.015)]
    p.append(torus(0.2, 0.03, (0, 0, 0.07), 'gold', seg=20, rseg=6))
    p.append(cyl(0.15, 0.5, (0, 0, 0.31), 'cream', verts=16))
    for a, l in ((0.3, 0.16), (2.4, 0.1), (4.2, 0.2)):
        p.append(sphere(0.04, (0.15 * math.cos(a), 0.15 * math.sin(a), 0.56 - l / 2), 'cream', scale=(1, 1, l / 0.08), subdiv=1))
    p.append(cyl(0.01, 0.06, (0, 0, 0.59), 'black', verts=6))
    chama = sphere(0.06, (0, 0, 0.68), 'lamp', scale=(1, 1, 1.8), subdiv=2)
    for v in chama.data.vertices:
        if v.co.z > 0:
            f = max(0.1, 1 - v.co.z / 0.11)
            v.co.x *= f
            v.co.y *= f
    p.append(chama)
    export('vela', p)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name.replace('-', '_')]()
