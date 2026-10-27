"""Cenário da praia tropical: mar, ilha, ponte, coqueiros, moitas e pedras.

Segue `praia-tropical.svg`: mar azul, faixa de água rasa clara, espuma branca, areia clara e
areia, borda verde-azulada e duas manchas de grama verde-escura separadas pela trilha de areia que
leva à ponte. A ilhota do farol fica à direita (+X), ligada pela ponte de madeira.

As medidas e as posições são as dos projetos do Molda que estas peças substituem (mapa de
reintegração): a área em que o personagem anda (x de -11 a 0,6 e z de -5 a 5, a ponte e a ilhota)
continua dentro da grama e da areia. O mar, o terreno, a ponte e as moitas ficam na origem; os
coqueiros e as pedras têm o referencial próprio, com a base no chão.

As pedras escondem a chave nas duas posições do curso, (-2, 1, -3) e (-3, 1, -2), vistas da
câmera do jogo (0, 12, 21): o `verificar_pedra.py` confere isso a cada mudança.
"""
from lib_ilha import *


def _ilha(x, z, rx, rz, seed, wob=0.035, n=64):
    """Contorno de ilha no chão do Blender a partir do centro e dos raios no jogo."""
    cx, cy = g(x, z)
    return blob(cx, cy, rx, rz, seed=seed, n=n, wob=wob, waves=(2, 3, 5, 7))


def mar():
    reset()
    p = [slab(blob(0, 0, 70, 70, seed=1, n=96, wob=0.0), -0.5, -0.3, 'mar', fundo=False)]
    # Marolas claras espalhadas pelo mar (longe da ilha), como traços de onda.
    rnd = random.Random(7)
    feitas = 0
    while feitas < 16:
        x, z = rnd.uniform(-26, 24), rnd.uniform(-22, 13)
        if (x + 5) ** 2 / 12.5 ** 2 + z ** 2 / 11 ** 2 < 1 or (x - 8.5) ** 2 + (z - 4.5) ** 2 < 9:
            continue
        L = rnd.uniform(1.0, 2.0)
        pts = [g(x + L * (t / 8 - 0.5), z + 0.12 * math.sin(math.pi * t / 8)) for t in range(9)]
        w = [0.07 * math.sin(math.pi * (t + 0.5) / 9) + 0.02 for t in range(9)]
        p.append(strip(pts, w, -0.3, -0.285, 'marOnda'))
        feitas += 1
    export('mar', p)


def terreno():
    reset()
    p = []
    camadas = [  # (material, topo, raios da ilha, raios da ilhota)
        ('aguaRasa', -0.24, (8.9, 9.0), (2.75, 2.25)),
        ('espuma', -0.15, (7.95, 8.2), (2.5, 2.1)),
        ('areiaClara', -0.06, (7.7, 8.0), (2.3, 1.9)),
        ('areia', 0.0, (7.1, 7.75), (1.9, 1.5)),
    ]
    for i, (m, topo, (rx, rz), (ix, iz)) in enumerate(camadas):
        base = -0.31 if i == 0 else topo - 0.1
        p.append(slab(_ilha(-5.6, 0, rx, rz, seed=11), base, topo, m, bevel=0.035, segs=2, fundo=False))
        p.append(slab(_ilha(5.25, 0.4, ix, iz, seed=12, n=32), base - 0.005, topo - 0.004, m, bevel=0.03, segs=2, fundo=False))
    # Grama: borda verde-azulada e as duas manchas verde-escuras do desenho.
    p.append(slab(_ilha(-6.25, 0, 6.1, 7.35, seed=21, wob=0.04), -0.06, 0.035, 'gramaBorda', bevel=0.03, fundo=False))
    p.append(slab(_ilha(-6.6, -3.7, 5.0, 3.1, seed=22, wob=0.06), 0.0, 0.06, 'grama', bevel=0.025, fundo=False))
    p.append(slab(_ilha(-6.5, 4.0, 4.9, 2.85, seed=23, wob=0.06), 0.0, 0.06, 'grama', bevel=0.025, fundo=False))
    # Trilha de areia da beira esquerda até a ponte, alargando perto da praia.
    xs = [-12.9 + 15.5 * t / 30 for t in range(31)]
    trilha = [g(x, 0.75 + 0.1 * math.sin(x * 0.7)) for x in xs]
    larg = [0.62 + 0.38 * max(0.0, (x + 1.5) / 4.1) ** 2 for x in xs]
    p.append(strip(trilha, larg, -0.02, 0.075, 'areia', bevel=0.03))
    # Pedrinhas e marcas na areia (as manchinhas do desenho).
    rnd = random.Random(31)
    for _ in range(16):
        a = rnd.uniform(-math.pi * 0.55, math.pi * 0.55)
        r = rnd.uniform(0.89, 0.97)
        x, z = -5.6 + 7.4 * r * math.cos(a), 7.8 * r * math.sin(a)
        if abs(z - 0.75) < 1.2 and x > -1:
            continue
        p.append(ellipsoid((*g(x, z), -0.02), (rnd.uniform(0.07, 0.15), rnd.uniform(0.05, 0.1), 0.035),
                           'areiaEscura', seg=8, ring=5))
    export('terreno', p)


def ponte():
    reset()
    p = []
    x0, x1 = 1.5, 3.65
    n = 9
    rnd = random.Random(41)
    for i in range(n):
        t = (i + 0.5) / n
        x = x0 + (x1 - x0) * t
        y = 0.16 + 0.07 * math.sin(math.pi * t)
        p.append(box((0.2, 1.06, 0.06), (*g(x, 0.75), y), rnd.choice(['madeira', 'madeiraClara', 'madeira']),
                     bevel=0.018, rot=(rnd.uniform(-0.03, 0.03), 0, rnd.uniform(-0.05, 0.05))))
    for z in (0.32, 1.18):  # vigas por baixo, acompanhando o arco
        pts = [(*g(x0 + (x1 - x0) * t / 8, z), 0.1 + 0.07 * math.sin(math.pi * t / 8)) for t in range(9)]
        p.append(tube(pts, [0.045] * 9, 'madeiraEscura', seg=8))
    for x in (x0 + 0.02, x1 - 0.02):
        for z in (0.15, 1.35):
            p.append(cyl(0.065, 0.7, (*g(x, z), 0.35), 'madeiraEscura', verts=10))
            p.append(sphere(0.07, (*g(x, z), 0.71), 'madeiraEscura', subdiv=1))
            p.append(torus(0.07, 0.018, (*g(x, z), 0.56), 'corda', seg=10, rseg=5))
    for z in (0.15, 1.35):  # corrimão de corda, caído no meio
        pts = [(*g(x0 + 0.02 + (x1 - x0 - 0.04) * t / 10, z), 0.56 - 0.1 * math.sin(math.pi * t / 10)) for t in range(11)]
        p.append(tube(pts, [0.022] * 11, 'corda', seg=6))
    export('ponte', p)


def _coqueiro(pid, seed, lean, yaw0):
    reset()
    rnd = random.Random(seed)
    p = []
    H = 2.15
    # Tronco curvo em gomos (os anéis do desenho), afinando para cima.
    N = 9
    pts = [Vector((lean[0] * (t / N) ** 1.8, lean[1] * (t / N) ** 1.8, H * t / N)) for t in range(N + 1)]
    for i in range(N):
        a, b = pts[i], pts[i + 1]
        r0 = 0.15 - 0.05 * i / N
        mid = a.lerp(b, 0.5)
        p.append(tube([tuple(a), tuple(a.lerp(b, 0.15)), tuple(mid), tuple(b.lerp(a, 0.08)), tuple(b)],
                      [r0 * 0.88, r0 * 1.05, r0, r0 * 0.92, r0 * 0.82], 'tronco' if i % 2 else 'troncoEscuro', seg=12))
    top = pts[-1]
    # Copa: folhas compridas e recortadas caindo em volta, em dois tons.
    for k in range(8):
        yaw = yaw0 + 2 * math.pi * k / 8 + rnd.uniform(-0.15, 0.15)
        L = rnd.uniform(1.35, 1.6)
        p.append(leaf((top.x, top.y, top.z + 0.05), yaw, L, 0.3, 'folha' if k % 2 else 'folhaEscura',
                      lift=0.45, droop=1.05 + rnd.uniform(-0.1, 0.15), fold=0.35, teeth=7, n=16))
    for k in range(3):  # folhas novas, mais curtas e para cima
        yaw = yaw0 + 2 * math.pi * (k + 0.3) / 3
        p.append(leaf((top.x, top.y, top.z + 0.08), yaw, 0.8, 0.2, 'folha', lift=0.55, droop=0.55, fold=0.3, teeth=5))
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.4
        p.append(sphere(0.12, (top.x + 0.13 * math.cos(a), top.y + 0.13 * math.sin(a), top.z - 0.1), 'coco', subdiv=2))
    p.append(sphere(0.16, (top.x, top.y, top.z + 0.02), 'troncoEscuro', subdiv=2))
    export(pid, p)


def coqueiro_tras():
    _coqueiro('coqueiro-tras', 51, (0.35, 0.15), 0.2)


def coqueiro_frente():
    _coqueiro('coqueiro-frente', 52, (0.3, -0.2), 0.6)


def _moita(x, z, seed, s=1.0):
    rnd = random.Random(seed)
    p = []
    cx, cy = g(x, z)
    for k in range(7):
        yaw = 2 * math.pi * k / 7 + rnd.uniform(-0.3, 0.3)
        p.append(leaf((cx, cy, 0.02), yaw, 0.38 * s * rnd.uniform(0.85, 1.15), 0.085 * s,
                      'folha' if k % 2 else 'folhaEscura', lift=0.42 * s, droop=0.3 * s, fold=0.45, n=8))
    return p


def vegetacao():
    reset()
    p = []
    lugares = [(-0.35, -4.0, 1.0), (0.05, 4.5, 1.0), (-3.25, -4.7, 1.0), (-10.3, -1.6, 0.9), (-4.4, 2.35, 0.8),
               (-9.4, 5.6, 1.0), (-2.2, 5.9, 0.9), (-11.4, 3.0, 0.8), (-5.4, -6.4, 0.9), (-9.8, -5.6, 1.0)]
    for i, (x, z, s) in enumerate(lugares):
        p += _moita(x, z, 60 + i, s)
    export('vegetacao', p)


def pedras():
    reset()
    p = []
    # Pedra grande (alta o bastante para esconder a chave atrás dela) e a menor à esquerda.
    p.append(rock((0.2, -0.04, 0), (2.6, 2.0, 2.85), 'pedra', seed=71, rough=0.16, flat_top=0.2, top_m='pedraClara'))
    p.append(rock((-1.05, -0.3, 0), (1.5, 1.25, 2.1), 'pedra', seed=72, rough=0.18, flat_top=0.15, top_m='pedraClara'))
    for x, y, s, sd in ((1.25, -0.85, 0.5, 73), (-0.3, -0.95, 0.38, 74), (1.55, 0.35, 0.42, 75)):
        p.append(rock((x, y, 0), (s * 1.2, s, s * 0.75), 'pedraEscura', seed=sd, subdiv=1, rough=0.2, top_m='pedra'))
    # Musgo no alto das pedras: liga as pedras à grama da ilha.
    for loc, rr in (((0.0, -0.1, 2.72), (0.55, 0.42, 0.09)), ((0.75, 0.3, 2.62), (0.35, 0.3, 0.07)),
                    ((-1.1, -0.3, 2.05), (0.32, 0.27, 0.06))):
        p.append(ellipsoid(loc, rr, 'musgo', seg=14, ring=8))
    export('pedras', p)


TODOS = ['mar', 'terreno', 'ponte', 'coqueiro-tras', 'coqueiro-frente', 'vegetacao', 'pedras']
