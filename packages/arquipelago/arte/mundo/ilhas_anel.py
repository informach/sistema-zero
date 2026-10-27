"""As seis ilhas do anel, versão leve (a silhueta que você vê de longe e que ganha cor quando a
ponte abre).

Referencial: o centro de cada ilha, com y = 0 no nível do mar (a Ilha das Nuvens fica num grupo
a y = 7 no jogo). O tampo é plano em y = 1 até ~12,5 de raio, em cima do colisor de antes
(cilindro de raio 12,5 com o topo em y = 1), e a ponte chega na borda a 12 do centro.

Um nó por ilha, com o `id` do contrato: `bosque`, `vila-doce`, `recife`, `pico`,
`vale-dos-dinos`, `nuvens`. As cores são as de verdade: o jogo puxa cada material para o cinza
antes do posto e devolve a cor conforme a ponte abre (a lava do Vale acende junto).

A CHEGADA da ponte é o +x de cada ilha (no jogo): o jogo gira o nó para o +x olhar para a ilha
central, e aqui nada fica num corredor de ~5 de largura do meio da ilha até a borda nesse lado.
"""
from lib_mundo import *

RAIO = RAIO_DA_ILHA_DO_ANEL
TOPO = 1.0


def contorno(raio, semente, n=36, amp=(0.05, 0.03)):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + amp[0] * math.sin(3 * a + semente) + amp[1] * math.sin(5 * a + semente * 2)
        pts.append((math.cos(a) * raio * k, math.sin(a) * raio * k))
    return pts


def base(semente, topo='grama', praia='areia', fundo='terraIlha', borda_topo=None, flutua=False):
    """Tampo plano, uma faixa de praia e o barranco até embaixo d'água (ou a rocha da ilha que
    flutua)."""
    p = []
    p.append(slab(contorno(RAIO - 0.35, semente), TOPO - 0.35, TOPO, topo, bevel=0.22, segs=1, name='topo',
                  fundo=False))
    if borda_topo:
        p.append(slab(contorno(RAIO - 0.1, semente), TOPO - 0.5, TOPO - 0.2, borda_topo, bevel=0.1, segs=1,
                      name='borda', fundo=False))
    if not flutua:
        p.append(slab(contorno(RAIO + 0.9, semente + 0.4, amp=(0.06, 0.03)), TOPO - 0.95, TOPO - 0.42, praia,
                      bevel=0.2, segs=1, name='praia', fundo=False))
        p.append(slab(contorno(RAIO + 1.4, semente + 0.4, amp=(0.06, 0.03)), -1.0, TOPO - 0.95, fundo, bevel=0.0,
                      name='barranco', fundo=False))
    else:
        # Rocha de baixo: cone irregular em camadas, como uma raiz de pedra.
        p.append(slab(contorno(RAIO - 0.2, semente), TOPO - 1.4, TOPO - 0.3, praia, bevel=0.2, segs=1, name='beira',
                      fundo=True))
        rnd = random.Random(int(semente * 10))
        for k, (r, z0, z1) in enumerate(((10.5, -1.6, TOPO - 1.35), (7.6, -3.4, -1.55), (4.6, -5.2, -3.3),
                                         (1.8, -6.4, -5.1))):
            p.append(slab(contorno(r, semente + k, n=24, amp=(0.1, 0.06)), z0, z1,
                          fundo if k % 2 == 0 else 'terraIlhaEscura', bevel=0.3, segs=1, name='raiz'))
        for k in range(5):
            a = rnd.uniform(0, 2 * math.pi)
            p.append(rock((math.cos(a) * 8, math.sin(a) * 8, -2.6), (2.2, 2.0, 1.8), 'terraIlhaEscura', seed=k,
                          subdiv=1))
    return p


def arvore_leve(x, z, s=1.0, copa='copa', seed=0, y=TOPO):
    bx, by = g(x, z)
    p = [cyl(0.2 * s, 1.6 * s, (bx, by, y + 0.8 * s), 'tronco', verts=6, r2=0.14 * s)]
    rnd = random.Random(seed)
    p.append(superellipsoid((2.3 * s, 2.2 * s, 1.9 * s), (bx, by, y + 2.3 * s), copa, e1=0.8, e2=0.9, seg=9, ring=6))
    p.append(superellipsoid((1.3 * s, 1.3 * s, 1.1 * s), (bx + rnd.uniform(-0.6, 0.6) * s, by + rnd.uniform(-0.6, 0.6) * s,
                                                          y + 3.1 * s), 'copaClara', e1=0.8, e2=0.9, seg=8, ring=5))
    return p


def pinheiro_leve(x, z, s=1.0, neve=False, y=TOPO):
    bx, by = g(x, z)
    p = [cyl(0.16 * s, 0.8 * s, (bx, by, y + 0.4 * s), 'tronco', verts=6)]
    for k, (z0, r, h) in enumerate(((0.6, 1.2, 1.6), (1.5, 0.9, 1.4), (2.3, 0.6, 1.2))):
        p.append(cone(r * s, h * s, (bx, by, y + (z0 + h / 2) * s), 'pinheiro', verts=7))
        if neve:
            p.append(cone(r * s * 0.45, h * s * 0.4, (bx, by, y + (z0 + h * 0.8) * s), 'neve', verts=7))
    return p


def moita_leve(x, z, s=1.0, m='copaEscura', y=TOPO):
    bx, by = g(x, z)
    return [superellipsoid((1.4 * s, 1.3 * s, 0.9 * s), (bx, by, y + 0.35 * s), m, e1=0.8, e2=0.9, seg=8, ring=5)]


def pedra_leve(x, z, s, m='pedra', seed=0, y=TOPO):
    bx, by = g(x, z)
    return [rock((bx, by, y - 0.15), (1.4 * s, 1.2 * s, 0.9 * s), m, seed=seed, subdiv=1, rough=0.2)]


# ------------------------------------------------------------------ as ilhas
def bosque():
    p = base(1.0 * 1.7 * 2)
    for i, (x, z, s, c) in enumerate([(-6, 3, 1.1, 'copa'), (4, 6, 1.3, 'copaEscura'), (0, -7, 1.0, 'copaFunda'),
                                      (7, -3, 1.2, 'copa'), (-7, -4, 1.25, 'copaEscura'), (-2, 8, 0.95, 'copa'),
                                      (8.5, 3.5, 0.9, 'copaFunda'), (-9, 0.5, 0.85, 'copaFunda'), (3, -9.5, 0.9, 'copa')]):
        p += arvore_leve(x, z, s, c, seed=i)
    # Casa na árvore no meio: tronco grosso, deque, casinha com telhado rosa e escada.
    p.append(cyl(0.55, 3.2, (0, 0, TOPO + 1.6), 'tronco', verts=8, r2=0.42))
    p.append(cyl(1.9, 0.22, (0, 0, TOPO + 3.2), 'troncoClaro', verts=12, bevel=0.05))
    p.append(box((2.4, 2.2, 1.5), (0, 0, TOPO + 4.05), 'casaArvore', bevel=0.06, segs=1))
    p.append(cone(2.0, 1.3, (0, 0, TOPO + 5.45), 'telhadoArvore', verts=4, rot=(0, 0, R(45))))
    p.append(box((0.6, 0.06, 0.95), (0, -1.12, TOPO + 3.85), 'tronco', bevel=0.02, segs=1))
    p.append(cyl(0.28, 0.06, (0.9, -1.12, TOPO + 4.2), 'cupulaAzul', verts=10, rot=(R(90), 0, 0)))
    for k in range(6):
        p.append(box((0.7, 0.08, 0.06), (0, -1.9, TOPO + 0.35 + k * 0.5), 'troncoClaro', bevel=0.0))
    for x in (-0.36, 0.36):
        p.append(box((0.07, 0.07, 3.2), (x, -1.9, TOPO + 1.6), 'tronco', bevel=0.0))
    # Toquinhas de bicho e cogumelos.
    for x, z in ((5, -7), (-4.5, 7.5)):
        bx, by = g(x, z)
        p.append(uvball(0.9, (bx, by, TOPO - 0.2), 'terraIlha', seg=10, ring=5, scale=(1, 1, 0.75)))
        p.append(cyl(0.38, 0.12, (bx, by - 0.62, TOPO + 0.25), 'black', verts=10, rot=(R(80), 0, 0)))
    for i, (x, z) in enumerate(((2, 3), (-3.2, -2), (5.5, 1), (-1, -4.5), (1.5, 9))):
        bx, by = g(x, z)
        p.append(cyl(0.12, 0.4, (bx, by, TOPO + 0.2), 'white', verts=6))
        p.append(uvball(0.32, (bx, by, TOPO + 0.42), 'red', seg=8, ring=4, scale=(1, 1, 0.6)))
    for x, z in ((-10, -5), (10, -6), (6.5, 9.5)):
        p += moita_leve(x, z, 1.1)
    return p


def casinha_doce(x, z, parede, cupula, rot=0.0):
    bx, by = g(x, z)
    p = [box((2.4, 2.2, 1.9), (bx, by, TOPO + 0.95), parede, bevel=0.2, segs=1)]
    p.append(uvball(1.45, (bx, by, TOPO + 1.85), cupula, seg=10, ring=6, scale=(1, 1, 0.8)))
    # Cobertura que escorre (bolinhas brancas na borda da cúpula) e a cereja.
    for k in range(7):
        a = 2 * math.pi * k / 7
        p.append(uvball(0.27, (bx + math.cos(a) * 1.3, by + math.sin(a) * 1.3, TOPO + 1.8), 'doceBranco', seg=5, ring=3))
    p.append(uvball(0.28, (bx, by, TOPO + 3.05), 'doceVermelho', seg=6, ring=4))
    da, db = math.cos(rot - math.pi / 2), math.sin(rot - math.pi / 2)
    p.append(box((0.7, 0.1, 1.1), (bx + da * 1.12, by + db * 1.12, TOPO + 0.55), 'doceBranco', bevel=0.04, segs=1,
                 rot=(0, 0, rot)))
    return p


def pirulito(x, z, cor, s=1.0):
    bx, by = g(x, z)
    p = [cyl(0.07 * s, 2.0 * s, (bx, by, TOPO + 1.0 * s), 'doceBranco', verts=6)]
    p.append(cyl(0.75 * s, 0.22 * s, (bx, by, TOPO + 2.5 * s), cor, verts=16, rot=(R(90), 0, 0)))
    p.append(torus(0.45 * s, 0.1 * s, (bx, by - 0.12 * s, TOPO + 2.5 * s), 'doceBranco', seg=10, rseg=3,
                   rot=(R(90), 0, 0)))
    return p


def jujuba(x, z, cor):
    bx, by = g(x, z)
    return [superellipsoid((0.9, 0.9, 0.8), (bx, by, TOPO + 0.32), cor, e1=0.7, e2=1.0, seg=8, ring=5,
                           flat_bottom=0.1)]


def bengala(x, z):
    bx, by = g(x, z)
    pts = [(bx, by, TOPO), (bx, by, TOPO + 1.6)] + [(bx + 0.35 - math.cos(t) * 0.35, by, TOPO + 1.6 + math.sin(t) * 0.35)
                                                   for t in (0.6, 1.4, 2.2, 3.0)]
    p = [tube(pts, [0.09] * len(pts), 'doceBranco', seg=6)]
    for k in range(4):
        p.append(torus(0.095, 0.03, (bx, by, TOPO + 0.25 + k * 0.38), 'doceVermelho', seg=6, rseg=3))
    return p


def vila_doce():
    p = base(3 * 1.7, topo='gramaClara', borda_topo='doceBranco')
    cores = [('casinhaRosa', 'cupulaRosa'), ('casinhaCreme', 'cupulaLaranja'), ('casinhaAzul', 'cupulaAzul')]
    for i, (x, z, r) in enumerate([(-3, 2, 0.4), (2, -3, 2.6), (3.5, 2.5, -0.6), (-2, -3.5, 3.4), (0, 0, 0.0),
                                   (-6.5, -1, 1.5), (6.5, -1.5, -1.2)]):
        if (x, z) == (0, 0):
            continue
        par, cup = cores[i % 3]
        p += casinha_doce(x, z, par, cup, r)
    # Praça no meio: fonte de chocolate (pires e gota).
    p.append(cyl(1.4, 0.4, (0, 0, TOPO + 0.2), 'doceBranco', verts=16, bevel=0.06))
    p.append(cyl(1.15, 0.12, (0, 0, TOPO + 0.42), 'terraIlha', verts=16))
    p.append(cyl(0.18, 1.1, (0, 0, TOPO + 0.9), 'doceBranco', verts=8))
    p.append(uvball(0.5, (0, 0, TOPO + 1.55), 'terraIlha', seg=10, ring=6, scale=(1, 1, 0.6)))
    for i, (x, z, c) in enumerate([(-8, 5, 'doceVermelho'), (7, 6, 'doceVerde'), (0, 8.5, 'cupulaRosa'),
                                   (-1, -8.5, 'cupulaAzul'), (9, -6, 'doceVermelho'), (-8.5, -6.5, 'cupulaLaranja')]):
        p += pirulito(x, z, c, 1.0 + 0.2 * (i % 2))
    for x, z, c in ((5, 8, 'doceVerde'), (-5, 8, 'cupulaLaranja'), (9.5, 1.5, 'cupulaRosa'), (-10, 1.5, 'doceVerde'),
                    (4, -8, 'cupulaAzul'), (-4.5, -8, 'doceVermelho')):
        p += jujuba(x, z, c)
    for x, z in ((1.6, 5.5), (-1.6, 5.5)):
        p += bengala(x, z)
    return p


def coral(x, z, cor, s=1.0, seed=0, y=TOPO):
    rnd = random.Random(seed)
    bx, by = g(x, z)
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.4, 0.4)
        ponta = (bx + math.cos(a) * 0.5 * s, by + math.sin(a) * 0.5 * s, y + rnd.uniform(0.9, 1.4) * s)
        meio = (bx + math.cos(a) * 0.15 * s, by + math.sin(a) * 0.15 * s, y + 0.5 * s)
        p.append(tube([(bx, by, y - 0.1), meio, ponta], [0.16 * s, 0.13 * s, 0.09 * s], cor, seg=5, cap=False))
        p.append(uvball(0.13 * s, ponta, cor, seg=5, ring=3))
    return p


def coqueiro_leve(x, z, s=1.0, y=TOPO, incl=(0.6, 0.0)):
    bx, by = g(x, z)
    pts = [(bx + incl[0] * t * t * s, by + incl[1] * t * t * s, y + 3.4 * t * s) for t in (0, 0.35, 0.7, 1.0)]
    p = [tube(pts, [0.2 * s, 0.17 * s, 0.15 * s, 0.13 * s], 'troncoClaro', seg=6)]
    topo = pts[-1]
    for k in range(6):
        a = 2 * math.pi * k / 6
        p.append(leaf(topo, a, 1.7 * s, 0.34 * s, 'copa' if k % 2 else 'copaEscura', lift=0.4, droop=1.1, fold=0.3,
                      teeth=5, n=7))
    return p


def recife():
    p = base(4 * 1.7, topo='areia', praia='areiaMolhada')
    # Lagoa no meio: água rasa num anel de areia molhada.
    p.append(slab(blob(0, 0, 5.8, 5.3, seed=2, n=32, wob=0.06), TOPO - 0.05, TOPO + 0.02, 'areiaMolhada', bevel=0.0,
                  name='beiraLagoa', fundo=False))
    p.append(slab(blob(0, 0, 5.2, 4.7, seed=2, n=32, wob=0.06), TOPO - 0.04, TOPO + 0.04, 'lagoa', bevel=0.0,
                  name='lagoa', fundo=False))
    p.append(slab(blob(0.4, 0.2, 2.6, 2.2, seed=5, n=24, wob=0.08), TOPO - 0.03, TOPO + 0.05, 'lagoaFunda', bevel=0.0,
                  name='funda', fundo=False))
    # Corais em volta da lagoa e dentro dela.
    cores = ['coral', 'coralRosa', 'coralLilas']
    for i in range(9):
        a = i * 0.7
        p += coral(math.cos(a) * 7.2, math.sin(a) * 7.2, cores[i % 3], 0.9 + 0.25 * (i % 3), seed=i)
    for i, (x, z) in enumerate(((1.5, -1.5), (-2, 1.2), (2.5, 2))):
        p += coral(x, z, cores[(i + 1) % 3], 0.6, seed=20 + i, y=TOPO - 0.05)
    # Conchas, estrelas do mar, coqueiros e pedras.
    for i, (x, z) in enumerate(((9.5, 3), (-9, -4), (3, 10), (-5, -9.5), (10, -5))):
        bx, by = g(x, z)
        o = uvball(0.35, (bx, by, TOPO + 0.05), 'concha', seg=8, ring=4, scale=(1, 0.8, 0.45))
        p.append(o)
        p.append(prism(star_pts(0.4, 0.17, 5, i * 20), 0.06, (bx + 0.8, by + 0.4, TOPO + 0.04), 'coral',
                       rot=(R(90), 0, 0)))
    for x, z, s in ((-8.5, 4.5, 1.0), (8, 7, 0.9), (0.5, -10, 1.1)):
        p += coqueiro_leve(x, z, s)
    for i, (x, z, s) in enumerate(((10, 1, 1.0), (-10.5, -1, 0.9), (6, -9, 0.8))):
        p += pedra_leve(x, z, s, 'pedraClara', seed=i)
    return p


def montanha(cx, cz, r, h, semente, picos=7):
    """Montanha facetada: anéis irregulares subindo até o cume, rocha embaixo e neve em cima."""
    rnd = random.Random(semente)
    verts, faces = [], []
    aneis = [(0.0, 1.0), (0.3, 0.78), (0.58, 0.52), (0.8, 0.28)]
    n = picos * 2
    bx, by = g(cx, cz)
    for k, (t, kr) in enumerate(aneis):
        for i in range(n):
            a = 2 * math.pi * i / n + k * 0.25
            rr = r * kr * (1 + rnd.uniform(-0.12, 0.12))
            verts.append((bx + math.cos(a) * rr, by + math.sin(a) * rr, TOPO - 0.3 + h * t + rnd.uniform(-0.25, 0.25)))
    verts.append((bx + r * 0.05, by, TOPO - 0.3 + h))
    for k in range(len(aneis) - 1):
        for i in range(n):
            a0, a1 = k * n + i, k * n + (i + 1) % n
            b0, b1 = (k + 1) * n + i, (k + 1) * n + (i + 1) % n
            faces += [(a0, a1, b1), (a0, b1, b0)]
    topo = len(verts) - 1
    k = len(aneis) - 1
    for i in range(n):
        faces.append((k * n + i, k * n + (i + 1) % n, topo))
    o = malha('montanha', verts, faces, 'rochaMontanha', cima=False)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    corte = TOPO - 0.3 + h * 0.55
    pintar_por(o, lambda c, nn: 'neve' if c.z > corte else ('rochaMontanhaEscura' if nn.z < 0.35 else None))
    lib_q.flat(o)
    return o


def pico():
    p = base(5 * 1.7, topo='neveSombra', praia='neve', fundo='rochaMontanhaEscura')
    p.append(montanha(0, -1, 8.0, 10.5, semente=3, picos=7))
    p.append(montanha(4.5, 3.5, 4.0, 5.5, semente=8, picos=5))
    for i, (x, z, s) in enumerate(((-8, 4, 1.1), (-6, 7.5, 0.9), (8.5, -5, 1.0), (-9, -5, 1.2), (2, 9.5, 0.9),
                                   (9.5, 3, 0.8), (-3, 9, 1.0))):
        p += pinheiro_leve(x, z, s, neve=True)
    # Bonecos de neve e blocos de gelo.
    bx, by = g(6, 8)
    p.append(uvball(0.6, (bx, by, TOPO + 0.5), 'neve', seg=10, ring=6))
    p.append(uvball(0.42, (bx, by, TOPO + 1.3), 'neve', seg=10, ring=6))
    p.append(cone(0.08, 0.35, (bx, by - 0.45, TOPO + 1.32), 'orange', verts=6, rot=(R(90), 0, 0)))
    for k in (-1, 1):
        p.append(uvball(0.05, (bx + k * 0.15, by - 0.36, TOPO + 1.45), 'black', seg=6, ring=4))
    for i, (x, z) in enumerate(((-5, -8), (7, -8.5), (-10, 0))):
        bx, by = g(x, z)
        p.append(box((1.2, 1.0, 0.9), (bx, by, TOPO + 0.4), 'cupulaAzul', bevel=0.12, segs=1, rot=(0, 0, i)))
    return p


def vulcao(cx, cz):
    bx, by = g(cx, cz)
    p = []
    o = cyl(5.5, 6.0, (bx, by, TOPO - 0.2 + 3.0), 'rochaVulcao', verts=10, r2=1.9, smooth_sides=False)
    rnd = random.Random(4)
    for v in o.data.vertices:
        if v.co.z < 2.9:
            v.co.x *= 1 + rnd.uniform(-0.08, 0.08)
            v.co.y *= 1 + rnd.uniform(-0.08, 0.08)
    p.append(o)
    p.append(cyl(2.0, 0.5, (bx, by, TOPO + 5.9), 'rochaVulcaoEscura', verts=10, r2=1.85, smooth_sides=False))
    p.append(cyl(1.55, 0.12, (bx, by, TOPO + 6.05), 'lava', verts=10))
    # Rios de lava descendo pelas encostas.
    for k, a in enumerate((-1.2, -0.3, 0.9)):
        pts = []
        for t in (0.0, 0.3, 0.6, 0.9):
            rr = 1.6 + (5.2 - 1.6) * t
            pts.append((bx + math.cos(a + 0.15 * t) * rr, by + math.sin(a + 0.15 * t) * rr,
                        TOPO - 0.2 + 6.05 - 6.0 * t + 0.08))
        p.append(tube(pts, [0.28, 0.32, 0.36, 0.3], 'lava', seg=5))
    # Fumacinha.
    for k, (dx, dz, r) in enumerate(((0, 0, 0.9), (0.5, 0.6, 0.7), (-0.3, 1.3, 0.55))):
        p.append(uvball(r, (bx + dx, by + dz * 0.3, TOPO + 6.8 + dz), 'nuvemSombra', seg=8, ring=5))
    return p


def samambaia(x, z, s=1.0, y=TOPO):
    bx, by = g(x, z)
    return [leaf((bx, by, y), 2 * math.pi * k / 6 + 0.3, 1.1 * s, 0.25 * s, 'samambaia', lift=0.7 * s, droop=0.75 * s,
                 fold=0.2, teeth=6, n=6) for k in range(6)]


def vale_dos_dinos():
    p = base(6 * 1.7, topo='gramaEscura')
    p += vulcao(0, -2)
    for i, (x, z, s) in enumerate(((-7, 4, 1.0), (6, 5.5, 1.2), (-4, 8, 0.8), (8.5, -1, 0.9), (-9, -2, 1.1),
                                   (3, 9, 0.9), (-6.5, -7.5, 1.0))):
        p += samambaia(x, z, s)
    for x, z, s in ((-9.5, 5.5, 1.1), (9, 6.5, 1.0)):
        p += coqueiro_leve(x, z, s, incl=(-0.5, 0.3))
    # Ninho com ovos de dino pintados.
    bx, by = g(2.5, 5.5)
    p.append(torus(0.9, 0.3, (bx, by, TOPO + 0.15), 'palha', seg=12, rseg=5))
    for k, (dx, dy) in enumerate(((0, 0), (0.42, 0.2), (-0.38, 0.25))):
        o = uvball(0.36, (bx + dx, by + dy, TOPO + 0.45), 'ovoDino', seg=10, ring=6, scale=(0.8, 0.8, 1.1))
        p.append(o)
        p.append(uvball(0.09, (bx + dx + 0.2, by + dy - 0.15, TOPO + 0.58), 'pintaDino', seg=6, ring=4))
    # Ossada e pegadas.
    bx, by = g(-3, 6)
    p.append(cyl(0.12, 2.4, (bx, by, TOPO + 0.12), 'osso', verts=6, rot=(0, R(90), 0.4)))
    for k in range(4):
        p.append(torus(0.4, 0.08, (bx - 0.8 + k * 0.5, by + 0.2 * k, TOPO + 0.2), 'osso', seg=10, rseg=4,
                       rot=(R(90), 0, 0.4), arc=180))
    for k in range(5):
        bx, by = g(5.5 + k * 0.9, -6 + (k % 2) * 0.6)
        p.append(cyl(0.3, 0.03, (bx, by, TOPO + 0.005), 'terraIlhaEscura', verts=7))
    for i, (x, z, s) in enumerate(((7, -6.5, 1.0), (-8.5, 1.5, 0.8), (-2, -9.5, 1.1))):
        p += pedra_leve(x, z, s, 'rochaVulcaoEscura', seed=i + 5)
    return p


def nuvem(x, y, z, s, seed):
    rnd = random.Random(seed)
    bx, by = g(x, z)
    p = []
    for k, (dx, dz, dy, r) in enumerate(((0, 0, 0, 1.2), (1.1, 0.2, -0.15, 0.9), (-1.05, -0.1, -0.2, 0.85),
                                         (0.2, -0.6, 0.25, 0.75))):
        p.append(uvball(r * s, (bx + dx * s, by - dz * s, y + dy * s), 'nuvem' if k % 2 == 0 else 'nuvemSombra',
                        seg=8, ring=5, scale=(1, 1, 0.8)))
    return p


def nuvens():
    p = base(7 * 1.7, topo='gramaClara', praia='terraIlha', flutua=True)
    for i, (x, y, z, s) in enumerate(((3, 1.8, 3, 1.0), (-4, 1.4, -2, 1.3), (1, 2.6, -5, 0.9), (-6, 2.2, 5, 0.8),
                                      (7, 2.0, -4, 0.85))):
        p += nuvem(x, TOPO + y, z, s, i)
    # Arco-íris saindo de uma nuvem para outra.
    cores = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
    for k, c in enumerate(cores):
        p.append(torus(4.6 - k * 0.32, 0.17, (0, -0.5, TOPO + 0.4), c, seg=16, rseg=4, rot=(R(90), 0, R(15)),
                       arc=180))
    for i, (x, z, s) in enumerate(((-8, -5, 0.9), (8.5, 5, 1.0), (-2, 9, 0.85))):
        p += arvore_leve(x, z, s, 'copaClara', seed=40 + i)
    for x, z in ((5, 9), (-9.5, 2), (9.5, -0.5)):
        p += moita_leve(x, z, 0.9, 'copa')
    return p


BASE = {'topo', 'borda', 'praia', 'barranco', 'beira', 'raiz'}


def abrir_chegada(objs):
    """Tira do corredor da chegada (+x do jogo = +x do Blender) o que não é chão."""
    bpy.context.view_layer.update()
    ficam = []
    for o in objs:
        if o.name.split('.')[0] in BASE:
            ficam.append(o)
            continue
        cantos = [o.matrix_world @ Vector(c) for c in o.bound_box]
        c = sum(cantos, Vector()) / 8
        if c.x > 5.0 and abs(c.y) < 2.6 and c.z > TOPO - 0.5:
            bpy.data.objects.remove(o)
        else:
            ficam.append(o)
    return ficam


ILHAS = {
    'bosque': bosque,
    'vila-doce': vila_doce,
    'recife': recife,
    'pico': pico,
    'vale-dos-dinos': vale_dos_dinos,
    'nuvens': nuvens,
}


def main():
    lib_q.reset()
    exportar('ilhas-do-anel', {nome: abrir_chegada(f()) for nome, f in ILHAS.items()})


if __name__ == '__main__':
    main()
