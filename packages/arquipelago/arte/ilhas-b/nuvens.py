"""Ilha das Nuvens, a ilha completa: o tear do arco-íris com os seis fios, o ninho da Iriê na
árvore alta, as ilhas flutuantes que sobem em degraus e o balão.

Gera dois arquivos em `src/assets/ilhas/`:

- `nuvens.glb`: nós `chao` (o chão da ilha leve que flutua, mesmo contorno), `cenario`, `fio-1`
  a `fio-6` (os fios do tear, um material cada: o jogo acende um por um quando a cor volta),
  `plataforma-1` a `plataforma-4` (ilhas flutuantes, cada uma no seu lugar, para o jogo mexer) e
  as âncoras e os colisores `col-*` (aj-ligar-01/10: o `col-terreno` do chão que flutua, formas
  simples para as peças e o tampo de cada plataforma, `col-cil-plataforma-N`, no mesmo lugar do nó
  `plataforma-N`: quem move a plataforma move o colisor junto). No jogo a ilha fica num grupo a
  y = 7.
- `nuvens-balao.glb`: o balão (`balao`, base do cesto em y = 0) com o clipe `flutuar` (3 s, em
  laço: sobe, desce e balança um pouco).
"""
from lib_ilhas_b import *

FIOS = ['fio1', 'fio2', 'fio3', 'fio4', 'fio5', 'fio6']
TEAR = dict(x=-4.2, z=-3.6)
NINHO = dict(x=-5.8, z=5.4)


# ------------------------------------------------------------------ peças
def tear(col=None):
    """Tear de madeira de frente para −Y: dois pés, o rolo de cima e o de baixo, o pente, os fios
    da urdidura e o pano do arco-íris saindo pela frente. Devolve (peças, [fio1..fio6])."""
    p = []
    if col is not None:
        # O quadro inteiro (pés, rolos, pente e fios) e o banquinho da frente.
        col.append(col_caixa('tear', (3.5, 0.65, 3.05), (0, -0.05, 1.52)))
        col.append(col_caixa('banquinho', (1.2, 0.5, 0.61), (0, -1.3, 0.305)))
    for x in (-1.6, 1.6):
        p.append(box((0.22, 0.9, 0.18), (x, 0, 0.09), 'madeiraTearEscura', bevel=0.03, segs=1))
        # O poste começa em cima do pé (os dois no mesmo plano do chão piscariam).
        p.append(box((0.18, 0.18, 2.72), (x, 0, 0.18 + 1.36), 'madeiraTear', bevel=0.03, segs=1))
        p.append(uvball(0.14, (x, 0, 2.95), 'madeiraTearEscura', seg=8, ring=5))
    p.append(cyl(0.14, 3.4, (0, 0, 2.6), 'madeiraTearEscura', verts=10, rot=(0, R(90), 0)))
    p.append(cyl(0.16, 3.4, (0, -0.25, 0.75), 'madeiraTearEscura', verts=10, rot=(0, R(90), 0)))
    p.append(box((3.2, 0.12, 0.16), (0, -0.05, 1.55), 'madeiraTear', bevel=0.03, segs=1))
    # Banquinho na frente e novelos.
    p.append(box((1.2, 0.5, 0.12), (0, -1.3, 0.55), 'madeiraTear', bevel=0.04, segs=1))
    for x in (-0.45, 0.45):
        # Os pés afundam 2 cm: o pano estendido no chão passa embaixo do banquinho.
        p.append(box((0.1, 0.4, 0.52), (x, -1.3, 0.24), 'madeiraTearEscura', bevel=0.02, segs=1))
    fios = []
    for k, m in enumerate(FIOS):
        x = -1.25 + k * 0.5
        f = [box((0.34, 0.04, 1.85), (x, -0.02, 1.68), m, bevel=0.015, segs=1)]
        # A parte já tecida desce pela frente e vira a faixa do pano, deitada no chão.
        f.append(box((0.42, 0.06, 0.9), (x, -0.3, 0.32), m, bevel=0.015, segs=1, rot=(R(-35), 0, 0)))
        f.append(box((0.42, 1.6, 0.04), (x, -1.0 - 0.8, 0.02), m, bevel=0.01, segs=1))
        fios.append(f)
    for k in range(6):
        p.append(uvball(0.2, (1.9 + (k % 2) * 0.35, -0.7 - (k // 2) * 0.4, 0.2), FIOS[k], seg=8, ring=5))
    return p, fios


def arvore_do_ninho(col=None):
    """Árvore alta e torta com o ninho grande da Iriê lá em cima, penas coloridas na borda e um
    poleiro de balanço."""
    if col is not None:
        col.append(col_cilindro('tronco-ninho', 0.42, 4.0, (0.05, 0.1, 2.0)))
        # O fundo do ninho se pisa (a âncora `ninho`); a borda de palha segura quem está dentro.
        col.append(col_cilindro('ninho-fundo', 1.15, 0.2, (0.1, -0.05, 3.98)))
        for k in range(10):
            a = 2 * math.pi * k / 10
            col.append(col_caixa('guarda-ninho', (0.85, 0.4, 0.5), (0.1 + math.cos(a) * 1.3, -0.05 + math.sin(a) * 1.3, 4.3),
                                 rot=(0, 0, a + math.pi / 2)))
    pts = [(0, 0, 0), (0.15, 0.1, 1.2), (-0.1, 0.3, 2.4), (0.25, 0.1, 3.4), (0.1, -0.05, 4.0)]
    p = [tube(pts, [0.42, 0.36, 0.3, 0.26, 0.22], 'tronco', seg=8)]
    for a, h, L in ((0.4, 2.2, 1.6), (2.6, 2.8, 1.3), (4.4, 3.3, 1.4)):
        ponta = (math.cos(a) * L, math.sin(a) * L, h + 0.7)
        p.append(tube([(0, 0, h), (math.cos(a) * L * 0.5, math.sin(a) * L * 0.5, h + 0.4), ponta], [0.14, 0.1, 0.07], 'tronco', seg=6))
        p.append(superellipsoid((1.2, 1.1, 0.8), ponta, 'copaClara', e1=0.8, e2=0.9, seg=9, ring=6))
        if col is not None:
            col.append(col_cilindro('copa-ninho', 0.5, 0.7, ponta))
    topo = (0.1, -0.05, 4.1)
    p.append(torus(1.25, 0.36, topo, 'ninho', seg=18, rseg=6))
    p.append(cyl(1.1, 0.2, (topo[0], topo[1], topo[2] - 0.12), 'ninhoEscuro', verts=14))
    rnd = random.Random(5)
    for k in range(14):
        a = 2 * math.pi * k / 14
        p.append(cyl(0.035, 1.1, (topo[0] + math.cos(a) * 1.25, topo[1] + math.sin(a) * 1.25, topo[2] + 0.1), 'ninhoEscuro',
                     verts=4, rot=(R(80), 0, a + rnd.uniform(-0.6, 0.6))))
    for k, m in enumerate(('penaVermelha', 'penaAzul', 'penaAmarela', 'penaVermelha', 'penaAzul')):
        a = 0.8 + k * 0.6
        base = (topo[0] + math.cos(a) * 1.4, topo[1] + math.sin(a) * 1.4, topo[2] + 0.2)
        p.append(leaf(base, a, 0.9, 0.18, m, lift=0.6, droop=0.3, fold=0.2, n=8))
    # Poleiro de balanço pendurado no galho.
    a, h = 2.6, 2.8
    gx, gy = math.cos(a) * 1.0, math.sin(a) * 1.0
    for d in (-0.3, 0.3):
        p.append(tube([(gx + d, gy, h + 0.55), (gx + d, gy, h - 0.9)], [0.015, 0.015], 'corda', seg=4))
    p.append(cyl(0.05, 0.75, (gx, gy, h - 0.9), 'troncoClaro', verts=6, rot=(0, R(90), 0)))
    return p


def ilha_flutuante(r, seed, arvore=False):
    """Ilhinha que flutua: tampo de grama, a rocha de baixo em cone e nuvens agarradas."""
    rnd = random.Random(seed)
    pts = blob(0, 0, r, r * 0.9, seed=seed, n=18, wob=0.1)
    p = [slab(pts, -0.35, 0.0, 'gramaClara', bevel=0.12, segs=1, name='tampo', fundo=False)]
    p.append(slab(blob(0, 0, r * 0.95, r * 0.85, seed=seed, n=18, wob=0.1), -0.9, -0.3, 'terraIlha', bevel=0.12, segs=1,
                  name='rocha'))
    p.append(cone(r * 0.8, r * 1.4, (0, 0, -0.9 - r * 0.7), 'terraIlhaEscura', verts=9, rot=(R(180), 0, 0)))
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.4, 0.4)
        p += nuvem_fofa(math.cos(a) * r * 0.8, math.sin(a) * r * 0.8, -0.8, 0.55, seed * 10 + k, 'nuvem', 'nuvemAzulada', 4)
    if arvore:
        p.append(cyl(0.12, 0.9, (0.3, 0.2, 0.45), 'tronco', verts=6))
        p.append(superellipsoid((1.0, 1.0, 0.85), (0.3, 0.2, 1.2), 'copaClara', e1=0.8, e2=0.9, seg=8, ring=5))
    else:
        for k in range(3):
            a = rnd.uniform(0, 2 * math.pi)
            p += flor((math.cos(a) * r * 0.5, math.sin(a) * r * 0.5, 0.0), ('petalaRosa', 'petalaAmarela', 'petalaLilas')[k],
                      seed=seed + k)
    return p


def balao():
    """Balão de ar quente listrado: gomos em três cores, faixa, cordas, o cesto e a chama."""
    perfil = [(0.0, 6.6), (1.0, 6.45), (1.8, 6.0), (2.25, 5.3), (2.35, 4.5), (2.15, 3.7), (1.7, 3.0), (1.1, 2.45),
              (0.65, 2.15)]
    n = 18
    cores = ['balaoA', 'balaoB', 'balaoC']
    verts, faces, mats = [], [], []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        for (r, z) in perfil:
            verts.append((math.cos(a) * r, math.sin(a) * r, z))
    L = len(perfil)
    for i in range(n):
        for j in range(L - 1):
            a0, a1 = i * L + j, (i + 1) * L + j
            faces.append((a0, a1, a1 + 1, a0 + 1))
            mats.append(i % 3)
    o = malha('envelope', verts, faces, cores[0], materiais=cores[1:], liso=True, cima=False)
    for p_, mi in zip(o.data.polygons, mats):
        p_.material_index = mi
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    p = [o, torus(2.36, 0.08, (0, 0, 4.5), 'cesta', seg=24, rseg=4), torus(0.66, 0.06, (0, 0, 2.15), 'cestaEscura', seg=14, rseg=4)]
    # Cesto, borda acolchoada e o queimador com a chama.
    p.append(box((1.1, 1.1, 0.75), (0, 0, 0.38), 'cesta', bevel=0.08, segs=1))
    p.append(box((1.18, 1.18, 0.14), (0, 0, 0.78), 'cestaEscura', bevel=0.06, segs=1))
    for z in (0.22, 0.5):
        p.append(box((1.12, 1.12, 0.05), (0, 0, z), 'cestaEscura', bevel=0.02, segs=1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(tube([(sx * 0.5, sy * 0.5, 0.82), (sx * 0.58, sy * 0.58, 2.2)], [0.02, 0.02], 'corda', seg=4))
    p.append(cyl(0.18, 0.25, (0, 0, 1.45), 'metalEscuro', verts=10))
    p.append(cone(0.14, 0.4, (0, 0, 1.75), 'chama', verts=8))
    return p


# ------------------------------------------------------------------ a ilha
PLATAFORMAS = [  # (x, z, altura acima do tampo, raio): sobem em degraus do lado de trás (−x)
    (-15.5, -3.0, 2.2, 1.9),
    (-17.0, 2.8, 4.0, 1.7),
    (-14.0, 8.0, 5.8, 1.6),
    (-9.0, 12.6, 7.6, 2.0),
]


def ilha():
    lib_q.reset()
    col = []
    chao = base_da_ilha('nuvens', topo='gramaClara', praia='terraIlha', flutua=True)
    cen = []
    cen.append(caminho([(12.3, 0), (6.5, 0.0), (1.5, -0.4)], 1.0, 'nuvemAzulada'))
    for k, ramo in enumerate(([(1.8, -0.4), (-1.0, -2.0), (TEAR['x'] + 0.4, TEAR['z'] + 2.1)],
                              [(1.6, 0.0), (-1.5, 2.6), (NINHO['x'] + 1.2, NINHO['z'] - 1.4)])):
        cen.append(caminho(ramo, 0.7, 'nuvemAzulada', z1=0.024 - 0.006 * k))
    c = []
    pecas, fios = tear(c)
    giro = angulo_para(TEAR['x'], TEAR['z'], TEAR['x'] + 1.5, TEAR['z'] + 4.0)
    colocar(pecas, TEAR['x'], TEAR['z'], giro, y=TOPO)
    col.extend(colocar(c, TEAR['x'], TEAR['z'], giro, y=TOPO))
    for f in fios:
        colocar(f, TEAR['x'], TEAR['z'], giro, y=TOPO)
    cen += pecas
    c = []
    cen += colocar(arvore_do_ninho(c), NINHO['x'], NINHO['z'], R(20), y=TOPO)
    col.extend(colocar(c, NINHO['x'], NINHO['z'], R(20), y=TOPO))
    # Nuvens fofas no chão (moitas de nuvem) e no ar em volta.
    for i, (x, z, s, dy) in enumerate(((3.5, 5.5, 0.8, 0.4), (7.5, -6.0, 0.9, 0.4), (-1.0, 9.6, 0.7, 0.4),
                                       (-9.6, -5.5, 0.85, 0.4), (4.0, -9.8, 0.75, 0.4), (9.8, 5.8, 0.7, 0.4),
                                       (6.0, 9.0, 1.2, 4.8), (-3.0, -9.0, 1.3, 5.4), (9.0, -3.5, 1.0, 6.5))):
        cen += nuvem_fofa(x, -z, TOPO + dy, s, i)
        if dy < 1:
            # As do chão são moitas de nuvem (macias: a câmera passa); as do alto ficam fora do alcance.
            col.append(col_cilindro('moita-nuvem', 0.95 * s, dy + 0.75 * s, (x, -z, TOPO + (dy + 0.75 * s) / 2)))
    # Arco-íris pequeno saindo do pano do tear (o resto ele tece).
    bx, by = TEAR['x'] + 3.2, -(TEAR['z'] - 3.0)
    for k, m in enumerate(FIOS):
        cen.append(torus(2.9 - k * 0.2, 0.1, (bx, by, TOPO + 0.05), m, seg=18, rseg=4, rot=(R(90), 0, R(25)), arc=180))
    for d in (-2.4, 2.4):
        nx, ny = bx + d * math.cos(R(25)), by + d * math.sin(R(25))
        cen += nuvem_fofa(nx, ny, TOPO + 0.3, 0.6, 70 + int(d))
        # O pé do arco-íris (os seis arcos, de 1,9 a 2,9 do meio) e a nuvem em volta dele.
        col.append(col_cilindro('moita-nuvem', 0.75, 0.8, (nx, ny, TOPO + 0.4)))
        px, py = bx + math.copysign(2.4, d) * math.cos(R(25)), by + math.copysign(2.4, d) * math.sin(R(25))
        col.append(col_caixa('pe-arco-iris', (1.2, 0.3, 1.6), (px, py, TOPO + 0.8), rot=(0, 0, R(25))))
    # Degraus de nuvem da beira da ilha até a primeira ilha flutuante.
    for k, (x, z, dy) in enumerate(((-11.6, -2.2, 0.5), (-12.9, -2.6, 1.1), (-14.1, -2.9, 1.7))):
        cen += nuvem_fofa(x, -z, TOPO + dy, 0.55, 80 + k, 'nuvem', 'nuvemAzulada', 4)
        # Degrau que se pisa: o topo na bola do meio, que é achatada (0,6 × 0,72 = 0,43 acima).
        col.append(col_cilindro('degrau-nuvem', 0.6, 0.6, (x, -z, TOPO + dy + 0.13)))
    # Cata-ventos coloridos na beira do caminho.
    for k, (x, z) in enumerate(((3.6, 1.6), (0.2, -1.8), (-0.6, 1.8), (8.4, -3.2))):
        bx2, by2 = x, -z
        cen.append(cyl(0.04, 1.3, (bx2, by2, TOPO + 0.65), 'madeiraTear', verts=6))
        col.append(col_cilindro('poste-cataventos', 0.08, 1.4, (bx2, by2, TOPO + 0.7)))
        for j in range(4):
            a = j * math.pi / 2 + k
            cen.append(prism([(0, 0), (0.32, 0.1), (0.3, 0.32)], 0.02, (bx2, by2 - 0.06, TOPO + 1.3), FIOS[(k + j) % 6],
                             rot=(R(90), a, 0)))
    for i, (x, z, s) in enumerate(((-8.6, -1.0, 0.9), (8.8, 7.6, 0.85), (-1.5, -10.4, 0.9), (2.8, 10.6, 0.8))):
        cen += anel.arvore_leve(x, z, s, 'copaClara', seed=60 + i)
        col.append(col_cilindro('tronco', 0.22 * s, 1.6 * s, (x, -z, TOPO + 0.8 * s)))
        col.append(col_cilindro('copa', 1.0 * s, 1.8 * s, (x, -z, TOPO + 2.3 * s)))
    for i, (x, z) in enumerate(((5.0, 3.6), (-2.8, 5.5), (6.4, -4.2), (-6.0, 1.2), (0.8, -5.4), (3.8, 8.0))):
        for k in range(3):
            cen += flor((x + 0.4 * k, -z + 0.3 * (k % 2), TOPO), ('petalaRosa', 'petalaAmarela', 'petalaLilas')[k], seed=i * 3 + k)
    # Poste de amarrar o balão, com a corda solta.
    bx, by = 4.6, -7.6
    cen.append(cyl(0.12, 1.2, (bx, by, TOPO + 0.6), 'poste', verts=8))
    col.append(col_cilindro('poste-balao', 0.15, 1.2, (bx, by, TOPO + 0.6)))
    cen.append(torus(0.16, 0.04, (bx, by, TOPO + 1.0), 'corda', seg=10, rseg=3))
    # A corda solta desce do poste e corre pelo chão até perto do cesto (âncora `balao`).
    cen.append(tube([(bx, by, TOPO + 1.0), (bx + 0.4, by + 0.4, TOPO + 0.4), (bx + 0.8, by + 1.0, TOPO + 0.05)],
                    [0.03] * 3, 'corda', seg=4))
    for x, z in ((5.0, -2.8), (5.0, 2.8)):
        cen += poste_lampiao(x, z)
        col.append(col_cilindro('poste-lampiao', 0.1, 2.9, (x, -z, TOPO + 1.45)))
    conferir_corredor(cen + [o for f in fios for o in f], 'nuvens')
    # O chão que se pisa: o tampo e a rocha de baixo da ilha que flutua.
    col.insert(0, col_terreno(chao))
    plataformas = {}
    for i, (x, z, dy, r) in enumerate(PLATAFORMAS, 1):
        objs = ilha_flutuante(r, seed=i, arvore=(i == 4))
        colocar(objs, x, z, R(30 * i), y=TOPO + dy)
        plataformas[f'plataforma-{i}'] = (objs, (x, -z, TOPO + dy))
        # O tampo (o meio dele no y do tampo); a rocha de baixo é fora do alcance.
        # Base sem número: o contador dá col-cil-plataforma-1 a -4, o mesmo número do nó.
        col.append(col_cilindro('plataforma', r * 0.9, 0.35, (x, -z, TOPO + dy - 0.175)))
    # O balão (âncora `balao`, z do jogo) fica a 1,9 m do poste, no chão livre mais perto da corda:
    # o cesto e o envelope (2,35 m de raio) não encostam em copa nem lampião (o teste confere).
    ancoras = ancoras_padrao(
        lumis=[(5.4, 4.6), (-0.8, 4.0), (6.2, -3.8), (-0.6, -4.6)], morador=(-3.4, 3.2),
        extras=[('tear', TEAR['x'] + 1.1, TEAR['z'] + 2.6), ('ninho', NINHO['x'] + 0.1, NINHO['z'] + 0.05, TOPO + 4.1),
                ('pe-da-arvore', NINHO['x'] + 1.2, NINHO['z'] - 1.4), ('balao', 5.6, 6.0),
                ('arco-iris', TEAR['x'] + 2.5, TEAR['z'] - 2.8),
                # O meio do deque do mirante, em cima dele (o mesmo MIRANTE e DEQUE de
                # nuvens_constelacoes.py: o deque e a luneta vêm no nuvens-constelacoes.glb).
                ('mirante', -6.0, -8.0, TOPO + 0.35)]
        + [(f'topo-plataforma-{i}', x, z, TOPO + dy + 0.02) for i, (x, z, dy, r) in enumerate(PLATAFORMAS, 1)])
    nos = {'chao': chao, 'cenario': cen}
    for k, f in enumerate(fios, 1):
        nos[f'fio-{k}'] = f
    nos.update(plataformas)
    exportar('nuvens', nos, ancoras, colisores=col)


# Onde a criança fica no balão (fase4-09): no piso do cesto (a base dele tem 10 cm de fundo),
# no meio. Filha do nó animado `balao`, então sobe e balança junto com o clipe `flutuar`.
PASSAGEIRO = (0.0, 0.0, 0.1)


def passageiro(balao_):
    e = bpy.data.objects.new('passageiro', None)
    e.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(e)
    e.parent = balao_
    e.matrix_parent_inverse.identity()
    e.location = PASSAGEIRO
    return e


def so_balao():
    lib_q.reset()
    # A âncora nasce com o nó `balao` já juntado (dentro do `clipes_`); `exportar` lê a lista depois.
    filhas = []

    def clipes(juntos):
        b = juntos['balao']
        filhas.append(passageiro(b))
        sobe = [(1, (0, 0, 0)), (37, (0, 0, 0.35)), (73, (0, 0, 0))]
        balanca = [(1, (0, 0, 0)), (19, (R(2.5), 0, 0)), (55, (R(-2.5), 0, 0)), (73, (0, 0, 0))]
        return {'flutuar': {b: {'location': sobe, 'rotation_euler': balanca}}}

    exportar('nuvens-balao', {'balao': balao()}, filhas, clipes_=clipes)


if __name__ == '__main__':
    qual = sys.argv[-1] if len(sys.argv) > 1 else 'tudo'
    if qual in ('ilha', 'tudo'):
        ilha()
    if qual in ('balao', 'tudo'):
        so_balao()
