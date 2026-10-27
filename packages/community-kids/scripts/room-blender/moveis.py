"""Móveis do quarto (chão). Frente para -Y, fundo para +Y (a parede), base em z = 0."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_q import *


def pes(xs, ys, h, m='woodDark', r=0.05, taper=0.8):
    return [cyl(r, h, (x, y, h / 2), m, verts=10, r2=r * taper) for x in xs for y in ys]


def cama():
    reset()
    p = []
    p.append(box((1.86, 2.84, 0.26), (0, 0, 0.27), 'woodDark', bevel=0.05))
    p += pes((-0.84, 0.84), (-1.32, 1.32), 0.16, r=0.06)
    p.append(cushion((1.72, 2.6, 0.24), (0, -0.04, 0.5), 'white', puff=0.15))
    # Coberta: cai sobre o pé da cama, com a dobra na frente.
    p.append(cushion((1.8, 1.7, 0.1), (0, -0.46, 0.64), 'pink', puff=0.3))
    p.append(cushion((1.8, 0.22, 0.12), (0, 0.38, 0.66), 'white', puff=0.2))
    p.append(box((1.82, 0.08, 0.34), (0, -1.33, 0.46), 'pink', bevel=0.03))
    # Travesseiro fofo e cabeceira arredondada.
    p.append(cushion((0.9, 0.5, 0.2), (0, 1.02, 0.72), 'blue', puff=0.6))
    p.append(box((1.94, 0.14, 0.95), (0, 1.38, 0.62), 'wood', bevel=0.06, segs=3))
    p.append(box((1.6, 0.06, 0.5), (0, 1.31, 0.72), 'woodLight', bevel=0.04))
    export('cama', p)


def cadeira():
    reset()
    p = []
    p.append(cushion((0.74, 0.72, 0.12), (0, -0.05, 0.5), 'wood', puff=0.1))
    p += pes((-0.3, 0.3), (-0.34, 0.24), 0.46, r=0.045)
    p.append(box((0.74, 0.1, 0.62), (0, 0.32, 0.86), 'wood', bevel=0.04, segs=3, rot=(math.radians(-8), 0, 0)))
    p.append(cushion((0.6, 0.6, 0.06), (0, -0.05, 0.58), 'red', puff=0.5))
    export('cadeira', p)


def mesa():
    reset()
    p = [box((1.84, 1.84, 0.1), (0, 0, 0.76), 'wood', bevel=0.04)]
    p.append(box((1.64, 1.64, 0.1), (0, 0, 0.66), 'woodDark', bevel=0.02))
    p += pes((-0.74, 0.74), (-0.74, 0.74), 0.66, r=0.07, taper=0.6)
    export('mesa', p)


def sofa():
    reset()
    p = [box((2.9, 1.7, 0.36), (0, 0, 0.26), 'teal', bevel=0.08, segs=3)]
    p += pes((-1.3, 1.3), (-0.7, 0.7), 0.1, 'woodDark', r=0.06)
    for x in (-0.86, 0, 0.86):
        p.append(cushion((0.84, 1.2, 0.22), (x, -0.16, 0.54), 'teal', puff=0.35))
        p.append(cushion((0.84, 0.32, 0.62), (x, 0.62, 0.84), 'teal', puff=0.25, rot=(math.radians(-10), 0, 0)))
    for s in (-1, 1):
        p.append(cushion((0.32, 1.66, 0.62), (s * 1.34, 0, 0.6), 'teal', puff=0.2))
    p.append(cushion((0.5, 0.18, 0.46), (-0.95, 0.38, 0.86), 'yellow', puff=0.8, rot=(math.radians(-15), 0, math.radians(10))))
    p.append(cushion((0.5, 0.18, 0.46), (0.95, 0.38, 0.86), 'pink', puff=0.8, rot=(math.radians(-15), 0, math.radians(-10))))
    export('sofa', p)


def estante():
    """Estante ABERTA na frente (a antiga escondia prateleiras e livros dentro da caixa)."""
    reset()
    d, W, H = 0.7, 1.86, 2.4
    p = []
    for s in (-1, 1):
        p.append(box((0.08, d, H), (s * (W / 2 - 0.04), 0, H / 2), 'wood', bevel=0.02))
    p.append(box((W, d, 0.08), (0, 0, H - 0.04), 'wood', bevel=0.02))
    p.append(box((W - 0.12, 0.04, H - 0.1), (0, d / 2 - 0.02, H / 2), 'woodDark', bevel=0.0))
    # Tampos das prateleiras: o de cima de cada uma bate com SURFACE_SLOTS (0.76, 1.44, 2.10).
    for top in (0.12, 0.76, 1.44, 2.10):
        p.append(box((W - 0.12, d - 0.04, 0.06), (0, -0.02, top - 0.03), 'wood', bevel=0.01))
    p.append(box((W, 0.06, 0.1), (0, -d / 2 + 0.03, 0.05), 'woodDark', bevel=0.01))
    cores = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'teal', 'pink']
    # Prateleira de baixo cheia; a 1ª só à esquerda (o nicho dela fica na direita).
    x = -0.82
    for i in range(10):
        h = 0.42 + 0.12 * ((i * 37) % 5) / 4
        w = 0.1 + 0.03 * ((i * 13) % 3)
        p.append(box((w, 0.42, h), (x + w / 2, -0.04, 0.15 + h / 2), cores[i % 8], bevel=0.012))
        x += w + 0.015
    x = -0.82
    for i in range(5):
        h = 0.4 + 0.1 * ((i * 29) % 4) / 3
        w = 0.1 + 0.025 * (i % 3)
        p.append(box((w, 0.4, h), (x + w / 2, -0.04, 0.79 + h / 2), cores[(i + 3) % 8], bevel=0.012))
        x += w + 0.015
    tomb = box((0.1, 0.4, 0.42), (-0.12, -0.04, 0.82), 'teal', bevel=0.012, rot=(0, math.radians(68), 0))
    p.append(tomb)
    # Nas de cima, o meio fica livre (nichos no centro): livros e enfeites nas pontas.
    for i, xx in enumerate((-0.78, -0.66, -0.55)):
        p.append(box((0.1, 0.38, 0.44), (xx, -0.04, 1.47 + 0.22), cores[(i + 5) % 8], bevel=0.012))
    p.append(sphere(0.12, (0.7, -0.06, 1.59), 'blue', subdiv=2))
    p.append(cyl(0.1, 0.18, (-0.72, -0.06, 2.22), 'terracotta', verts=12))
    p.append(sphere(0.13, (-0.72, -0.06, 2.37), 'leafLight', scale=(1, 1, 0.8), subdiv=1, smooth_it=False))
    p.append(box((0.26, 0.26, 0.2), (0.7, -0.04, 2.23), 'yellow', bevel=0.03))
    export('estante', p)


def bau():
    reset()
    p = [box((1.8, 1.4, 0.7), (0, 0, 0.37), 'wood', bevel=0.05)]
    tampa = cyl(0.7, 1.8, (0, 0, 0.72), 'woodDark', verts=24, rot=(0, math.radians(90), 0))
    # Depois do giro, o x local aponta para BAIXO: achata a metade de baixo e a cúpula fica baixa.
    for v in tampa.data.vertices:
        v.co.x = 0 if v.co.x > 0 else v.co.x * 0.5
    p.append(tampa)
    for x in (-0.6, 0.6):
        p.append(box((0.12, 1.44, 0.74), (x, 0, 0.37), 'metal', bevel=0.02))
        arco = [(x, 0.72 * math.cos(t), 0.72 + 0.37 * math.sin(t)) for t in [math.pi * i / 16 for i in range(17)]]
        p.append(tube(arco, [0.045] * 17, 'metal', seg=8))
    p.append(box((0.2, 0.08, 0.26), (0, -0.72, 0.68), 'yellow', bevel=0.03))
    p.append(cyl(0.03, 0.04, (0, -0.77, 0.66), 'black', verts=8, rot=(math.radians(90), 0, 0)))
    export('bau', p)


def mesa_estudo():
    reset()
    p = [box((1.88, 0.88, 0.08), (0, 0, 0.8), 'woodLight', bevel=0.03)]
    p.append(box((0.08, 0.8, 0.76), (-0.86, 0, 0.38), 'wood', bevel=0.02))
    p.append(box((0.64, 0.76, 0.76), (0.58, 0, 0.38), 'white', bevel=0.03))
    for z in (0.18, 0.44, 0.66):
        p.append(box((0.58, 0.04, 0.2), (0.58, -0.39, z), 'blue', bevel=0.02))
        p.append(box((0.16, 0.04, 0.03), (0.58, -0.42, z + 0.04), 'metal', bevel=0.01))
    # Notebook aberto na esquerda (a ponta direita do tampo é o nicho).
    p.append(box((0.62, 0.42, 0.03), (-0.36, -0.06, 0.855), 'grayDark', bevel=0.01))
    tela = box((0.62, 0.03, 0.4), (-0.36, 0.16, 1.06), 'grayDark', bevel=0.01, rot=(math.radians(-12), 0, 0))
    p.append(tela)
    p.append(box((0.54, 0.01, 0.32), (-0.36, 0.14, 1.06), 'screen', bevel=0.0, rot=(math.radians(-12), 0, 0)))
    p.append(box((0.5, 0.2, 0.01), (-0.36, -0.12, 0.872), 'black', bevel=0.0))
    p.append(cyl(0.05, 0.16, (0.1, 0.18, 0.92), 'red', verts=10))
    for i, c in enumerate(('yellow', 'blue', 'green')):
        p.append(cyl(0.008, 0.2, (0.1 + 0.015 * (i - 1), 0.18, 1.0), c, verts=6, rot=(math.radians(8 * (i - 1)), 0, 0)))
    export('mesa-estudo', p)


def tv():
    reset()
    p = [box((1.8, 0.62, 0.4), (0, 0, 0.24), 'woodDark', bevel=0.04)]
    p += pes((-0.8, 0.8), (-0.24, 0.24), 0.06, 'black', r=0.04)
    for x in (-0.45, 0.45):
        p.append(box((0.8, 0.02, 0.28), (x, -0.31, 0.24), 'wood', bevel=0.01))
        p.append(box((0.12, 0.03, 0.02), (x, -0.33, 0.33), 'metal', bevel=0.005))
    p.append(box((0.3, 0.16, 0.04), (0, 0.04, 0.46), 'black', bevel=0.01))
    p.append(box((0.06, 0.06, 0.16), (0, 0.06, 0.54), 'black', bevel=0.01))
    p.append(box((1.6, 0.08, 0.86), (0, 0.06, 1.03), 'black', bevel=0.03))
    p.append(box((1.5, 0.01, 0.76), (0, 0.015, 1.03), 'screen', bevel=0.0))
    p.append(cyl(0.012, 0.01, (0.74, 0.01, 0.62), 'neonCyan', verts=8, rot=(math.radians(90), 0, 0)))
    p.append(box((0.3, 0.14, 0.04), (-0.5, -0.12, 0.46), 'grayDark', bevel=0.02))
    export('tv', p)


def beliche():
    reset()
    p = []
    for x in (-0.86, 0.86):
        for y in (-1.36, 1.36):
            p.append(box((0.12, 0.12, 2.5), (x, y, 1.25), 'wood', bevel=0.03))
    for z, cor in ((0.42, 'blue'), (1.66, 'green')):
        p.append(box((1.84, 2.84, 0.14), (0, 0, z), 'woodDark', bevel=0.03))
        p.append(cushion((1.66, 2.6, 0.2), (0, 0, z + 0.16), 'white', puff=0.15))
        p.append(cushion((1.7, 1.6, 0.08), (0, -0.44, z + 0.27), cor, puff=0.3))
        p.append(cushion((0.8, 0.44, 0.16), (0, 1.0, z + 0.34), 'white', puff=0.6))
    # Grade de proteção da cama de cima (laterais e cabeceira) e escada na frente.
    for z in (2.0, 2.24):
        p.append(box((0.06, 2.72, 0.06), (-0.86, 0, z), 'wood', bevel=0.015))
        p.append(box((1.72, 0.06, 0.06), (0, 1.36, z), 'wood', bevel=0.015))
        p.append(box((0.06, 1.6, 0.06), (0.86, 0.56, z), 'wood', bevel=0.015))
    for x in (0.66, 1.0):
        p.append(box((0.06, 0.06, 2.3), (x, -1.44, 1.15), 'wood', bevel=0.015))
    for z in (0.4, 0.82, 1.24, 1.66, 2.08):
        p.append(cyl(0.025, 0.34, (0.83, -1.44, z), 'woodLight', verts=8, rot=(0, math.radians(90), 0)))
    export('beliche', p)


def pufe():
    reset()
    b = sphere(0.44, (0, 0, 0.32), 'purple', scale=(1, 1, 0.78), subdiv=3)
    for v in b.data.vertices:
        if v.co.z < -0.25:
            v.co.z = -0.25 - (v.co.z + 0.25) * 0.15
        # Afundado no meio (alguém sentou).
        r = math.hypot(v.co.x, v.co.y)
        if v.co.z > 0.1:
            v.co.z -= 0.12 * max(0, 1 - r / 0.3)
    b.location = (0, 0, 0.248)
    p = [b, torus(0.22, 0.03, (0, 0, 0.418), 'pink', seg=20, rseg=6)]
    export('pufe', p)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name.replace('-', '_')]()
