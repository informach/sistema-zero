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
    """Coqueiro do desenho: tronco liso e curvo afinando para cima, copa de folhas largas e lisas
    em três verdes caindo em volta, e cocos escuros embaixo da copa."""
    reset()
    rnd = random.Random(seed)
    p = []
    H = 2.15
    N = 12
    pts = [(lean[0] * (t / N) ** 1.8, lean[1] * (t / N) ** 1.8, H * t / N) for t in range(N + 1)]
    p.append(tube(pts, [0.16 - 0.065 * t / N for t in range(N + 1)], 'troncoLiso', seg=12))
    top = Vector(pts[-1])
    verdes = ['folhaEscura', 'folha', 'folhaClara']
    for k in range(7):
        yaw = yaw0 + 2 * math.pi * k / 7 + rnd.uniform(-0.12, 0.12)
        L = rnd.uniform(1.3, 1.55)
        p.append(leaf((top.x, top.y, top.z + 0.05), yaw, L, 0.3, verdes[k % 3],
                      lift=0.5, droop=1.1 + rnd.uniform(-0.1, 0.15), fold=0.3, n=16))
    for k in range(3):  # folhas novas, mais curtas e para cima
        yaw = yaw0 + 2 * math.pi * (k + 0.5) / 3
        p.append(leaf((top.x, top.y, top.z + 0.08), yaw, 0.75, 0.26, 'folhaClara', lift=0.6, droop=0.55, fold=0.3))
    for k in range(3):  # cocos grandes logo abaixo da copa, à vista como no desenho
        a = 2 * math.pi * k / 3 + 0.4 + yaw0
        p.append(sphere(0.15, (top.x + 0.17 * math.cos(a), top.y + 0.17 * math.sin(a), top.z - 0.14), 'coco', subdiv=2))
    export(pid, p)


def coqueiro_tras():
    _coqueiro('coqueiro-tras', 51, (0.35, 0.15), 0.2)


def coqueiro_frente():
    _coqueiro('coqueiro-frente', 52, (0.3, -0.2), 0.6)


def _moita(x, z, seed, s=1.0):
    """Moita do desenho: três folhas largas e pontudas abertas em leque, a do meio mais em pé."""
    rnd = random.Random(seed)
    p = []
    cx, cy = g(x, z)
    giro = rnd.uniform(0, 2 * math.pi)
    for abre, m in ((-1, 'folhaEscura'), (0, 'grama'), (1, 'folhaEscura')):
        # As do lado abrem para fora; a do meio sobe quase reta.
        yaw = giro + abre * math.pi / 2
        p.append(leaf((cx, cy, 0.03), yaw, (0.24 if abre else 0.05) * s, 0.1 * s, m,
                      lift=(0.24 if abre else 0.4) * s, droop=(0.06 if abre else 0.0) * s, fold=0.35, n=8))
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
    # Musgo no alto das pedras (liga as pedras à grama da ilha), pousado no topo de verdade: um raio
    # de cima para baixo acha a altura da pedra em cada ponto.
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    for (x, y), rr in (((0.0, -0.1), (0.55, 0.42, 0.09)), ((0.75, 0.3), (0.35, 0.3, 0.07)),
                       ((-1.05, -0.3), (0.32, 0.27, 0.06))):
        hit, loc, *_ = bpy.context.scene.ray_cast(deps, Vector((x, y, 10)), Vector((0, 0, -1)))
        if hit:
            p.append(ellipsoid((x, y, loc.z - rr[2] * 0.35), rr, 'musgo', seg=14, ring=8))
    export('pedras', p)


def bancada():
    """Bancada das experiências: o chão de 10 x 10 em que a aula mostra o personagem, a chave, os
    eixos e a grade. Tampo de grama no nível 0 (a grade e os marcadores da cena ficam logo acima)
    sobre uma base de areia com borda de espuma, como um pedaço da ilha."""
    reset()
    p = []
    quadrado = lambda m: [(x * m, y * m) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    p.append(slab(quadrado(5.35), -0.3, -0.12, 'espuma', bevel=0.06, segs=3))
    p.append(slab(quadrado(5.3), -0.25, -0.03, 'areia', bevel=0.08, segs=3))
    p.append(slab(quadrado(5.0), -0.06, 0.0, 'gramaBorda', bevel=0.03, segs=2))
    # Pedrinhas na areia da borda (as manchinhas do desenho), fora do tampo.
    rnd = random.Random(81)
    for _ in range(14):
        lado = rnd.choice((-1, 1))
        t = rnd.uniform(-4.9, 4.9)
        x, y = (lado * 5.15, t) if rnd.random() < 0.5 else (t, lado * 5.15)
        p.append(ellipsoid((x, y, -0.03), (rnd.uniform(0.05, 0.1), rnd.uniform(0.04, 0.08), 0.02), 'areiaEscura', seg=8, ring=5))
    export('bancada', p)


TODOS = ['mar', 'terreno', 'ponte', 'coqueiro-tras', 'coqueiro-frente', 'vegetacao', 'pedras', 'bancada']
