"""Pico Gelado, a ilha completa: a montanha com a trilha que sobe em espiral até o cume, o iglu,
os pinheiros nevados, a parede de gelo para escalar, o lago congelado e o palco do Floco.

Gera três arquivos em `src/assets/ilhas/`:

- `pico.glb`: nós `chao` (o chão da ilha leve, mesmo contorno), `montanha` (com a trilha),
  `cenario` (iglu, palco, parede de gelo, árvores, lago, enfeites) e as âncoras;
- `pico-props.glb`: peças soltas para o jogo repetir (`pinheiro-nevado-a`, `pinheiro-nevado-b`,
  `bloco-de-gelo`, `boneco-de-neve`, `painel-de-gelo`), cada uma com a base em y = 0;
- `pico-treno.glb`: o trenó (`treno`), frente para −z do jogo.
"""
from lib_ilhas_b import *

MONTANHA = dict(x=-4.5, z=-1.5, r=6.6, h=10.0)


# ------------------------------------------------------------------ montanha com a trilha
def raio_montanha(t):
    return MONTANHA['r'] * (1 - 0.82 * t)


def montanha():
    """Montanha facetada em anéis, rocha embaixo e neve em cima, com a trilha em espiral."""
    rnd = random.Random(11)
    cx, cy = MONTANHA['x'], -MONTANHA['z']
    h = MONTANHA['h']
    ts = [0.0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.82, 0.92]
    n = 20
    verts, faces = [], []
    for k, t in enumerate(ts):
        for i in range(n):
            a = 2 * math.pi * i / n + k * 0.13
            rr = raio_montanha(t) * (1 + rnd.uniform(-0.06, 0.06))
            verts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr, TOPO - 0.35 + h * t + rnd.uniform(-0.12, 0.12)))
    verts.append((cx + 0.2, cy - 0.1, TOPO - 0.35 + h))
    for k in range(len(ts) - 1):
        for i in range(n):
            a0, a1 = k * n + i, k * n + (i + 1) % n
            b0, b1 = (k + 1) * n + i, (k + 1) * n + (i + 1) % n
            faces += [(a0, a1, b1), (a0, b1, b0)]
    topo = len(verts) - 1
    k = len(ts) - 1
    for i in range(n):
        faces.append((k * n + i, k * n + (i + 1) % n, topo))
    o = malha('montanha', verts, faces, 'rochaMontanha', cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    corte = TOPO - 0.35 + h * 0.62
    pintar_por(o, lambda c, nn: 'neve' if c.z > corte + (0.6 if nn.z < 0.4 else 0) else
               ('rochaMontanhaEscura' if nn.z < 0.3 else None))
    lib_q.flat(o)
    p = [o]

    # Trilha: uma rampa (prateleira) que dá 1,25 volta, do pé (lado da ilha) até perto do cume.
    pts = []
    passos = 46
    t_fim = 0.8
    a0 = math.radians(5)
    for i in range(passos + 1):
        u = i / passos
        t = u * t_fim
        a = a0 + u * 2 * math.pi * 1.25
        rr = raio_montanha(t) + 0.15
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr, max(TOPO + 0.04, TOPO - 0.35 + h * t + 0.05)))
    p.append(faixa(pts, 0.62, 'neveTrilha', -0.6, 0.0, nome='trilha'))
    # Postinhos com corda na beira de fora da trilha.
    postes = []
    for i in range(3, passos, 3):
        u = i / passos
        t = u * t_fim
        a = a0 + u * 2 * math.pi * 1.25
        rr = raio_montanha(t) + 0.15 + 0.55
        x, y, z = cx + math.cos(a) * rr, cy + math.sin(a) * rr, TOPO - 0.35 + h * t + 0.05
        postes.append((x, y, z + 0.75))
        p.append(cyl(0.06, 0.8, (x, y, z + 0.38), 'poste', verts=6))
    for (a, b) in zip(postes, postes[1:]):
        meio = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 - 0.08)
        p.append(tube([a, meio, b], [0.025] * 3, 'corda', seg=4, cap=False))
    # Cume: platô de neve, bandeira e um mirante com banco.
    zc = TOPO - 0.35 + h * 0.92
    p.append(cyl(1.15, 0.4, (cx, cy, zc - 0.05), 'neve', verts=12, bevel=0.1))
    p.append(cyl(0.05, 1.8, (cx + 0.3, cy, zc + 1.0), 'metalEscuro', verts=6))
    p.append(prism([(0, 0), (0.9, -0.25), (0, -0.55)], 0.03, (cx + 0.33, cy, zc + 1.85), 'cachecol', rot=(R(90), 0, 0)))
    return p, pts[0], pts[-1], (cx, cy, zc + 0.15)


# ------------------------------------------------------------------ peças
def pinheiro_nevado(variante='a', s=1.0):
    """Pinheiro com neve nas pontas dos andares. a: largo, três andares; b: fino, quatro."""
    p = [cyl(0.17 * s, 0.9 * s, (0, 0, 0.45 * s), 'tronco', verts=7)]
    andares = ((0.7, 1.35, 1.7), (1.65, 1.0, 1.5), (2.5, 0.68, 1.3)) if variante == 'a' else \
        ((0.7, 1.0, 1.5), (1.5, 0.82, 1.35), (2.25, 0.62, 1.2), (2.95, 0.42, 1.0))
    for k, (z0, r, hh) in enumerate(andares):
        p.append(cone(r * s, hh * s, (0, 0, (z0 + hh / 2) * s), 'pinheiro' if k % 2 == 0 else 'copaFunda', verts=8))
        # Neve: um chapéu na ponta e uma saia de bolinhas na borda do andar.
        p.append(cone(r * s * 0.42, hh * s * 0.38, (0, 0, (z0 + hh * 0.81) * s), 'neve', verts=8))
        for i in range(6):
            a = 2 * math.pi * i / 6 + k * 0.5
            p.append(uvball(0.16 * s, (math.cos(a) * r * s * 0.86, math.sin(a) * r * s * 0.86, (z0 + 0.08) * s),
                            'neve', seg=6, ring=4, scale=(1.3, 1.3, 0.6)))
    return p


def bloco_de_gelo(s=1.0, seed=0):
    rnd = random.Random(seed)
    w, d, h = (1.0 + rnd.uniform(-0.2, 0.2)) * s, (0.9 + rnd.uniform(-0.2, 0.2)) * s, (0.8 + rnd.uniform(-0.1, 0.3)) * s
    return [box((w, d, h), (0, 0, h / 2), 'gelo', bevel=0.1, segs=1),
            box((w * 0.55, d * 0.55, h * 0.5), (w * 0.12, -d * 0.1, h * 0.55), 'geloClaro', bevel=0.06, segs=1),
            box((w * 1.06, d * 1.06, 0.12), (0, 0, h), 'neve', bevel=0.05, segs=1)]


def boneco_de_neve(s=1.0):
    p = [uvball(0.62 * s, (0, 0, 0.55 * s), 'neve', seg=12, ring=8),
         uvball(0.45 * s, (0, 0, 1.35 * s), 'neve', seg=12, ring=8),
         uvball(0.33 * s, (0, 0, 1.95 * s), 'neve', seg=12, ring=8),
         cone(0.07 * s, 0.38 * s, (0, -0.48 * s, 1.95 * s), 'orange', verts=8, rot=(R(90), 0, 0)),
         torus(0.36 * s, 0.07 * s, (0, 0, 1.72 * s), 'cachecol', seg=14, rseg=5),
         box((0.12 * s, 0.05 * s, 0.4 * s), (0.22 * s, -0.3 * s, 1.55 * s), 'cachecol', bevel=0.02, segs=1, rot=(R(10), 0, R(-15))),
         cyl(0.24 * s, 0.05 * s, (0, 0, 2.22 * s), 'black', verts=12),
         cyl(0.17 * s, 0.32 * s, (0, 0, 2.4 * s), 'black', verts=12)]
    for k in (-1, 1):
        p.append(uvball(0.045 * s, (k * 0.12 * s, -0.3 * s, 2.05 * s), 'black', seg=6, ring=4))
        p.append(tube([(k * 0.4 * s, 0, 1.4 * s), (k * 0.8 * s, -0.05 * s, 1.65 * s), (k * 1.0 * s, 0, 1.85 * s)],
                      [0.035 * s] * 3, 'tronco', seg=5))
    for z in (1.2, 1.4):
        p.append(uvball(0.05 * s, (0, -0.44 * s, z * s), 'black', seg=6, ring=4))
    return p


def painel_de_gelo(w=2.2, h=3.0, seed=0):
    """Painel de gelo de escalar: placa translúcida com agarras coloridas e neve em cima."""
    rnd = random.Random(seed)
    p = [box((w, 0.5, h), (0, 0, h / 2), 'gelo', bevel=0.12, segs=1),
         box((w * 0.8, 0.52, h * 0.7), (rnd.uniform(-0.2, 0.2), 0, h * 0.45), 'geloClaro', bevel=0.08, segs=1),
         box((w + 0.1, 0.6, 0.18), (0, 0, h), 'neve', bevel=0.08, segs=1)]
    for i in range(7):
        x = (i % 3 - 1) * w * 0.3 + rnd.uniform(-0.15, 0.15)
        z = 0.45 + i * (h - 0.8) / 7
        p.append(uvball(0.11, (x, -0.29, z), 'agarra' if i % 2 == 0 else 'agarraAzul', seg=7, ring=4, scale=(1.2, 0.7, 0.9)))
    return p


def iglu():
    """Iglu de blocos: cúpula com as juntas, túnel de entrada virado para −Y e um tapete."""
    p = [meia_esfera(2.1, (0, 0, 0), 'iglu', seg=20, ring=12, sz=0.9)]
    for k, z in enumerate((0.5, 1.0, 1.45)):
        rr = 2.1 * math.sqrt(max(0.0, 1 - (z / (2.1 * 0.9)) ** 2)) + 0.015
        p.append(torus(rr, 0.035, (0, 0, z), 'igluJunta', seg=24, rseg=3))
        for i in range(10 - k * 2):
            a = 2 * math.pi * (i + 0.5 * (k % 2)) / (10 - k * 2)
            p.append(box((0.05, 0.05, 0.48), (math.cos(a) * rr, math.sin(a) * rr, z - 0.24), 'igluJunta', bevel=0.0,
                         rot=(0, 0, a)))
    tunel = cyl(0.85, 1.4, (0, -2.05, 0), 'iglu', verts=14, rot=(R(90), 0, 0))
    p.append(cortar_abaixo(tunel, 0.0))
    p.append(cortar_abaixo(cyl(0.6, 0.06, (0, -2.76, 0), 'black', verts=14, rot=(R(90), 0, 0)), 0.0))
    p.append(cortar_abaixo(torus(0.82, 0.05, (0, -2.74, 0), 'igluJunta', seg=16, rseg=3, rot=(R(90), 0, 0)), 0.0))
    p.append(cyl(0.7, 0.03, (0, -3.4, 0.05), 'tapete', verts=14))
    p.append(cyl(0.45, 0.03, (0, -3.4, 0.065), 'tapeteClaro', verts=14))
    return p


def palco():
    """Palco do Floco: tablado redondo com degraus, arco de gelo, cortinas, caixas de som, o
    pedestal do microfone e um varal de bandeirinhas."""
    p = [cyl(2.4, 0.45, (0, 0, 0.225), 'palco', verts=20, bevel=0.06),
         cyl(2.25, 0.04, (0, 0, 0.46), 'palcoClaro', verts=20)]
    for i in range(10):
        a = math.pi + i * math.pi / 9
        p.append(box((0.06, 0.3, 0.02), (math.cos(a) * 1.6, math.sin(a) * 1.6, 0.48), 'palco', bevel=0.0, rot=(0, 0, a)))
    for k, (y, h) in enumerate(((-2.65, 0.15), (-2.95, 0.3))):
        p.append(box((1.6, 0.35, h), (0, y + 0.3, h / 2), 'palcoClaro', bevel=0.03, segs=1))
    # Arco de gelo atrás, com as estrelas de neve.
    p.append(torus(2.1, 0.22, (0, 1.6, 0.45), 'gelo', seg=20, rseg=6, rot=(R(90), 0, 0), arc=180))
    p.append(torus(2.1, 0.1, (0, 1.6, 0.45), 'geloClaro', seg=20, rseg=4, rot=(R(90), 0, 0), arc=180))
    for i, a in enumerate((0.35, 0.95, 1.57, 2.2, 2.8)):
        p.append(prism(star_pts(0.22, 0.09, 6, i * 10), 0.05, (math.cos(a) * 2.1, 1.35, 0.45 + math.sin(a) * 2.1),
                       'geloClaro', rot=(R(90), 0, 0)))
    for x in (-1.85, 1.85):
        p.append(box((0.5, 0.25, 2.3), (x, 1.45, 1.6), 'cortina', bevel=0.08, segs=1))
        p.append(box((0.6, 0.6, 0.85), (x * 0.82, -0.7 if x < 0 else -0.6, 0.9), 'metalEscuro', bevel=0.05, segs=1))
        p.append(cyl(0.18, 0.04, (x * 0.82, -1.01 if x < 0 else -0.91, 1.0), 'black', verts=12, rot=(R(90), 0, 0)))
        p.append(cyl(0.1, 0.04, (x * 0.82, -1.01 if x < 0 else -0.91, 0.65), 'black', verts=10, rot=(R(90), 0, 0)))
    p.append(cyl(0.03, 1.3, (0.3, -0.6, 1.12), 'metalEscuro', verts=6))
    p.append(cyl(0.2, 0.03, (0.3, -0.6, 0.48), 'metalEscuro', verts=10))
    p.append(uvball(0.08, (0.3, -0.62, 1.8), 'black', seg=8, ring=5, scale=(1, 1, 1.3)))
    # Notas musicais na placa do palco.
    p.append(box((1.3, 0.08, 0.6), (0, 1.6, 3.15), 'acabamento', bevel=0.03, segs=1))
    for i, x in enumerate((-0.35, 0.0, 0.35)):
        p.append(uvball(0.08, (x, 1.54, 3.02 + 0.06 * (i % 2)), 'nota', seg=8, ring=4, scale=(1.2, 0.5, 1)))
        p.append(box((0.025, 0.02, 0.28), (x + 0.07, 1.54, 3.16 + 0.06 * (i % 2)), 'nota', bevel=0.0))
    p += bandeirinhas((-2.2, 1.4, 2.9), (2.2, 1.4, 2.9), ['bandeirinhaA', 'bandeirinhaB', 'bandeirinhaC'], n=9, flecha=0.5)
    return p


def treno():
    """Trenó de madeira e vermelho, com os patins curvados na frente (para −Y) e a corda."""
    p = []
    for x in (-0.38, 0.38):
        pts = [(x, 0.75, 0.06), (x, -0.55, 0.06), (x, -0.78, 0.14), (x, -0.86, 0.3), (x, -0.78, 0.42)]
        p.append(tube(pts, [0.035] * len(pts), 'patimTreno', seg=6))
        for y in (-0.45, 0.0, 0.45):
            p.append(cyl(0.03, 0.22, (x, y, 0.18), 'trenoMadeira', verts=6))
    for i in range(6):
        p.append(box((0.92, 0.2, 0.05), (0, -0.55 + i * 0.25, 0.31), 'trenoMadeira', bevel=0.02, segs=1))
    for x in (-0.47, 0.47):
        p.append(box((0.06, 1.45, 0.16), (x, 0.08, 0.4), 'trenoVermelho', bevel=0.03, segs=1))
    p.append(box((0.98, 0.06, 0.32), (0, 0.8, 0.5), 'trenoVermelho', bevel=0.03, segs=1))
    p.append(tube([(-0.38, -0.8, 0.4), (0, -1.15, 0.3), (0.38, -0.8, 0.4)], [0.02] * 3, 'corda', seg=4))
    p.append(tube([(0, -1.15, 0.3), (0.05, -1.6, 0.12), (0.2, -1.9, 0.05)], [0.02] * 3, 'corda', seg=4))
    return p


def lago_congelado(x, z):
    p = [mancha(x, z, 2.4, 1.9, 'neve', seed=3, z1=TOPO + 0.06),
         mancha(x, z, 2.05, 1.6, 'gelo', seed=3, z1=TOPO + 0.09),
         mancha(x + 0.4, z - 0.2, 1.1, 0.8, 'geloFundo', seed=8, z1=TOPO + 0.095)]
    bx, by = x - 0.8, -z - 0.4
    p.append(cyl(0.28, 0.02, (bx, by, TOPO + 0.1), 'lagoaFunda', verts=12))
    p.append(torus(0.3, 0.06, (bx, by, TOPO + 0.1), 'neve', seg=12, rseg=4))
    return p


# ------------------------------------------------------------------ a ilha
def ilha():
    lib_q.reset()
    chao = base_da_ilha('pico', topo='neveSombra', praia='neve', fundo='rochaMontanhaEscura')
    mont, pe_trilha, fim_trilha, cume = montanha()
    cen = []
    # Caminho de neve batida da ponte até o meio e aos lugares.
    cen.append(caminho([(12.3, 0), (6, 0), (2.8, 0.2)], 1.0, 'neveTrilha'))
    # Cada ramo numa altura um pouco diferente: faces no mesmo plano piscam (e sombreiam preto).
    for k, ramo in enumerate(([(3, 0.2), (3.1, 2.5), (3.0, 4.2)], [(3, -0.2), (2.9, -3.0), (2.7, -4.6)],
                              [(2.8, 0.0), (2.6, -1.0), (pe_trilha[0], -pe_trilha[1])])):
        cen.append(caminho(ramo, 0.7, 'neveTrilha', z1=0.024 - 0.006 * k))
    # Iglu (frente para o caminho), palco do Floco, parede de gelo, lago congelado.
    cen += colocar(iglu(), 3.0, 7.2, angulo_para(3.0, 7.2, 3.0, 2.0), y=TOPO)
    cen += colocar(palco(), 2.6, -7.3, angulo_para(2.6, -7.3, 3.0, 0.0), y=TOPO)
    # Parede de gelo em degraus (três painéis lado a lado), virada para o meio da ilha.
    giro = angulo_para(-2.5, 9.4, -2.5, 4.0)
    for i, h in enumerate((2.6, 3.4, 4.2)):
        cen += colocar(painel_de_gelo(2.1, h, seed=i), -4.6 + i * 2.1, 9.4, giro, y=TOPO)
    cen.append(box((2.1, 1.6, 0.3), (-0.4, -10.0, TOPO + 4.25), 'neve', bevel=0.1, segs=1))
    cen += lago_congelado(8.0, -6.6)
    cen += colocar(treno(), 7.6, 4.3, R(-35), y=TOPO + 0.02)
    # Pinheiros nevados na volta, bonecos de neve, blocos de gelo e montinhos.
    for i, (x, z, s, v) in enumerate(((-9.5, 5.5, 1.1, 'a'), (-10.5, 1.5, 0.95, 'b'), (-7.5, -8.5, 1.15, 'a'),
                                      (-2.0, -10.5, 1.0, 'b'), (5.5, -10.2, 0.9, 'a'), (10.4, -3.8, 0.85, 'b'),
                                      (10.0, 4.6, 1.0, 'a'), (6.2, 9.6, 1.05, 'b'), (1.0, 11.0, 0.9, 'a'),
                                      (-6.8, 10.4, 0.95, 'b'), (-11.2, -3.0, 1.0, 'a'), (8.6, 8.0, 0.8, 'b'))):
        cen += colocar(pinheiro_nevado(v, s), x, z, R(37 * i), y=TOPO)
    cen += colocar(boneco_de_neve(), 6.6, 6.0, angulo_para(6.6, 6.0, 4, 0), y=TOPO)
    cen += colocar(boneco_de_neve(0.7), -1.2, -6.0, angulo_para(-1.2, -6.0, 2, 0), y=TOPO)
    for i, (x, z) in enumerate(((5.6, -4.2), (-1.0, 7.0), (9.4, -8.8), (-9.6, 7.8), (0.6, -10.2))):
        cen += colocar(bloco_de_gelo(0.9, seed=i), x, z, R(23 * i), y=TOPO)
    for i, (x, z, rx, rz) in enumerate(((-8.5, -5.5, 1.8, 1.2), (-4.0, -8.6, 1.0, 0.6), (-6.5, 6.8, 1.4, 0.9),
                                        (9.0, -1.0, 0.0, 0.0))):
        if rx:
            cen.append(superellipsoid((rx * 1.4, rz * 1.4, 0.55), (x, -z, TOPO), 'neve', e1=0.8, e2=0.9, seg=10, ring=5,
                                      flat_bottom=0.0))
    for x, z in ((5.0, -2.8), (5.0, 2.8), (1.0, -3.6)):
        cen += poste_lampiao(x, z)
    conferir_corredor(cen + mont, 'pico')
    ancoras = ancoras_padrao(
        lumis=[(5.2, 3.6), (-0.6, 4.8), (6.6, -3.4), (-0.6, -5.2)], morador=(3.4, -5.1),
        extras=[('palco', 2.6, -7.3, TOPO + 0.47), ('iglu', 3.0, 4.3), ('trilha-inicio', pe_trilha[0], -pe_trilha[1]),
                ('trilha-fim', fim_trilha[0], -fim_trilha[1], fim_trilha[2] + 0.05),
                ('cume', cume[0], -cume[1], cume[2]), ('parede-de-gelo', -2.5, 8.2),
                ('topo-da-parede', -0.4, 10.0, TOPO + 4.4), ('lago-congelado', 8.0, -6.6, TOPO + 0.1),
                ('treno', 7.6, 4.3)])
    exportar('pico', {'chao': chao, 'montanha': mont, 'cenario': cen}, ancoras)


def props():
    lib_q.reset()
    nos = {'pinheiro-nevado-a': pinheiro_nevado('a'), 'pinheiro-nevado-b': pinheiro_nevado('b'),
           'bloco-de-gelo': bloco_de_gelo(), 'boneco-de-neve': boneco_de_neve(), 'painel-de-gelo': painel_de_gelo()}
    exportar('pico-props', nos)


def so_treno():
    lib_q.reset()
    exportar('pico-treno', {'treno': treno()})


if __name__ == '__main__':
    qual = sys.argv[-1] if len(sys.argv) > 1 else 'tudo'
    if qual in ('ilha', 'tudo'):
        ilha()
    if qual in ('props', 'tudo'):
        props()
    if qual in ('treno', 'tudo'):
        so_treno()
