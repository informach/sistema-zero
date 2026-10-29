"""O navio afundado do Recife Coral (lugar de exploração de mergulho, um GLB à parte).

Um veleiro de madeira inteiro, deitado no fundo, inclinado 18° para bombordo e meio enterrado na
areia:
- o casco de tábuas (faixa vermelha na borda, fundo escuro, vigias de bronze), com o rombo do lado
  de boreste embaixo da amurada, as tábuas da beira quebradas e entortadas para fora; é por ali que
  se nada para dentro do porão;
- o convés de tábuas com a escotilha aberta, um pedaço desabado perto da proa (as tábuas penduradas
  para dentro), o timão e a lanterna da popa; o mastro grande quebrado sai da água (de longe se vê
  onde o navio está) e o do traquete é um toco;
- o porão: areia no chão, barris, caixotes, rolo de corda, moedas espalhadas, o lampião pendurado
  e uma poça de luz quente em volta do baú; o baú fica na âncora `bau` (o jogo põe ali o `bau.glb`
  dos itens);
- o pedaço de cima do mastro caiu para bombordo, apoiado na amurada, com a verga atravessada e a
  vela listrada caída por cima: embaixo dela fica o cesto da gávea, onde se esconde a página;
- a âncora de ferro meio enterrada na frente da proa, com a corrente até o escovém;
- corais, cracas, estrelas-do-mar e algas crescendo no navio (as algas balançam).

Referencial: o centro do navio na linha d'água (y = 0 no mar), o fundo do mar em y = −3,5 (o
`FUNDO_DO_MAR` do jogo). A proa aponta para +x e o rombo olha para +z. A proposta de onde ele fica
no Recife está no README.

Saída: `recife-navio.glb` (nós `navio`, `vela`, `carga`, `fundo`, `corais`, `alga-1`…`alga-6`,
os `col-*` e as âncoras), com o clipe `balancar` das algas.
"""
from lib_ilhas import *
import recife as rc
from mathutils import Matrix  # noqa: E402

lib_q.PALETTE.update({
    'madeiraNavio': ('#a8743f', 0.85, None, 0),
    'madeiraNavioEscura': ('#8a5a30', 0.85, None, 0),
    'madeiraNavioClara': ('#d2a56a', 0.85, None, 0),
    'navioFaixa': ('#d9644f', 0.75, None, 0),
    'navioFundo': ('#6a4a35', 0.9, None, 0),
    'velaNavio': ('#f6ead0', 0.9, None, 0),
    'velaListra': ('#e07a5f', 0.9, None, 0),
    'ferroNavio': ('#5d6672', 0.55, None, 0),
    'ferrugem': ('#a8653d', 0.8, None, 0),
    'vidroNavio': ('#8cc7cf', 0.2, None, 0),
    'moedaOuro': ('#ffd34f', 0.35, '#ffb800', 0.2),
    'luzBau': ('#ffe2a0', 0.8, '#ffc970', 0.35),
})

FUNDO = -3.5            # o fundo do mar do jogo
AREIA_DENTRO = -3.35    # a areia que entrou no porão (plana: assentou depois do naufrágio)
CONVES = -1.0           # o convés, no meio do navio
ROLAGEM = R(-18)        # deitado para bombordo (+y do Blender, −z do jogo)
ARFAGEM = R(-3)         # a popa um pouco mais enterrada
M_NAVIO = Matrix.Translation((0, 0, CONVES)) @ Matrix.Rotation(ARFAGEM, 4, 'Y') @ Matrix.Rotation(ROLAGEM, 4, 'X')

# Casco: estações ao longo de x (popa → proa) e pontos de cada seção em U (boreste → quilha →
# bombordo). O rombo tira os quadriláteros das estações 5 a 8 e das linhas 0 a 4 (boreste).
NX = 15
XS = [-5.2 + i * (10.95 / (NX - 1)) for i in range(NX)]
NT = 14
ROMBO_I = (5, 8)
ROMBO_J = (1, 5)
ESPESSURA = 0.14
MASTRO = 0.6
TRAQUETE = 3.6
ESCOTILHA = (-2.3, -0.9, 0.75)   # x0, x1, meia-largura


def meia_boca(i):
    x = XS[i]
    if i == NX - 1:
        return 0.06
    if x >= 0:
        return max(0.06, 2.1 * math.sqrt(max(0.0, 1 - (x / 5.9) ** 2)))
    return 2.1 * (1 - 0.25 * (x / 5.2) ** 2)


def boca_em(x):
    """Meia-boca no convés em qualquer x (interpolada entre as estações)."""
    if x <= XS[0]:
        return meia_boca(0)
    for i in range(NX - 1):
        if XS[i] <= x <= XS[i + 1]:
            t = (x - XS[i]) / (XS[i + 1] - XS[i])
            return meia_boca(i) * (1 - t) + meia_boca(i + 1) * t
    return 0.06


def borda(x):
    return 0.35 + (0.35 * (x / 5.75) ** 2 if x >= 0 else 0.5 * (x / 5.2) ** 2)


def calado(x):
    return 3.3 - (0.9 * (x / 5.75) ** 3 if x >= 0 else 0.45 * (x / 5.2) ** 2)


def ponto_casco(i, t):
    """Ponto da face de fora do casco na estação i e no ângulo t (−90° boreste, 0 quilha, 90° bombordo)."""
    x = XS[i]
    s, c = math.sin(t), math.cos(t)
    return Vector((x, meia_boca(i) * math.copysign(abs(s) ** 0.65, s), borda(x) - calado(x) * abs(c) ** 0.65))


def _ts_por_arco():
    """Ângulos das linhas do casco com o mesmo comprimento de tábua entre elas (seção do meio)."""
    n = 400
    ts = [-math.pi / 2 + math.pi * k / n for k in range(n + 1)]
    i = NX // 2
    pts = [ponto_casco(i, t) for t in ts]
    arco = [0.0]
    for a, b in zip(pts, pts[1:]):
        arco.append(arco[-1] + (b - a).length)
    out = []
    for j in range(NT + 1):
        alvo = arco[-1] * j / NT
        k = min(range(n + 1), key=lambda k: abs(arco[k] - alvo))
        out.append(ts[k])
    return out


_TS = []


def t_de(j):
    """Ângulo da linha j do casco (j pode ser fracionário)."""
    if not _TS:
        _TS.extend(_ts_por_arco())
    j = max(0.0, min(float(NT), j))
    j0 = min(int(j), NT - 1)
    return _TS[j0] + (_TS[j0 + 1] - _TS[j0]) * (j - j0)


def no_navio(x, y, z):
    return M_NAVIO @ Vector((x, y, z))


def transformar(objs, M=M_NAVIO):
    bpy.context.view_layer.update()
    for o in objs:
        o.matrix_world = M @ o.matrix_world
    return objs


def no_rombo(i, j):
    return ROMBO_I[0] <= i < ROMBO_I[1] and ROMBO_J[0] <= j < ROMBO_J[1]


# ------------------------------------------------------------------ casco
def casco():
    verts = [ponto_casco(i, t_de(j)) for i in range(NX) for j in range(NT + 1)]

    def v(i, j):
        return i * (NT + 1) + j

    faces, mats = [], []
    cores = ['madeiraNavio', 'madeiraNavioEscura', 'navioFaixa', 'navioFundo']
    for i in range(NX - 1):
        for j in range(NT):
            if no_rombo(i, j):
                continue
            faces.append((v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)))
            if j in (0, NT - 1):
                mats.append(2)
            elif j in (NT // 2 - 1, NT // 2):
                mats.append(3)
            else:
                mats.append(j % 2)
    # Painel da popa (o espelho): fecha a primeira seção.
    faces.append(tuple(v(0, j) for j in range(NT + 1)))
    mats.append(1)
    o = malha('casco', verts, faces, cores[0], materiais=cores[1:], cima=False)
    for p, mi in zip(o.data.polygons, mats):
        p.material_index = mi
    # Normais para fora: longe do eixo do navio (e o espelho para −x).
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    bm.faces.ensure_lookup_table()
    for f in bm.faces:
        f.normal_update()
        c = f.calc_center_median()
        if len(f.verts) > 4:
            fora = Vector((-1, 0, 0))
        else:
            fora = c - Vector((c.x, 0, borda(c.x) - calado(c.x) * 0.55))
        if f.normal.dot(fora) < 0:
            f.normal_flip()
    bm.to_mesh(o.data)
    bm.free()
    s = o.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = ESPESSURA
    s.offset = -1
    s.use_rim = True
    lib_q._apply(o, s)
    shade_auto(o, 40)
    p = [o]
    # Borda de cima (o corrimão da amurada), inteira: o rombo fica embaixo dela.
    for lado, j in ((-1, 0), (1, NT)):
        trecho = []
        for i in range(NX):
            if False:
                if len(trecho) > 1:
                    p.append(tube(trecho, [0.09] * len(trecho), 'madeiraNavioClara', seg=6))
                trecho = []
                continue
            q = ponto_casco(i, t_de(j))
            trecho.append((q.x, q.y - lado * 0.05, q.z + 0.03))
        if len(trecho) > 1:
            p.append(tube(trecho, [0.09] * len(trecho), 'madeiraNavioClara', seg=6))
    # Tábuas quebradas em volta do rombo, entortadas para fora (o navio bateu de dentro para fora
    # quando afundou): cada uma sai da beira e se dobra para fora do casco.
    rnd = random.Random(7)
    ja, jb = ROMBO_J
    beira = []
    for k in range(4):
        beira.append((ROMBO_I[0] + 0.4 + k * 0.75, jb, 'baixo'))
        beira.append((ROMBO_I[0] + 0.3 + k * 0.8, ja, 'cima'))
    for k in range(3):
        beira.append((ROMBO_I[0], ja + 0.6 + k * 1.2, 'popa'))
        beira.append((ROMBO_I[1], ja + 0.5 + k * 1.2, 'proa'))
    for k, (i, j, lado) in enumerate(beira):
        i0 = min(int(i), NX - 2)
        a = ponto_casco(i0, t_de(j))
        b = ponto_casco(i0 + 1, t_de(j))
        q = a + (b - a) * (i - i0)
        centro = Vector((q.x, 0, borda(q.x) - calado(q.x) * 0.55))
        fora = (q - centro)
        fora.x = 0
        fora.normalize()
        meio_rombo = ponto_casco((ROMBO_I[0] + ROMBO_I[1]) // 2, t_de((ja + jb) / 2))
        para_dentro = (meio_rombo - q)
        para_dentro -= fora * para_dentro.dot(fora)
        para_dentro.normalize()
        L = rnd.uniform(0.45, 0.8)
        dobra = rnd.uniform(0.5, 0.9)
        base = q - fora * ESPESSURA * 0.5
        meio = base + para_dentro * (L * 0.5)
        ponta = meio + (para_dentro * (1 - dobra) + fora * dobra).normalized() * (L * 0.55)
        for c0, c1, f in ((base, meio, 1.0), (meio, ponta, 0.8)):
            d = c1 - c0
            tab = box((d.length + 0.04, 0.2 * f, 0.06), tuple((c0 + c1) / 2), 'madeiraNavioClara' if k % 2 else 'madeiraNavio',
                      bevel=0.0)
            tab.rotation_euler = d.to_track_quat('X', 'Z').to_euler()
            p.append(tab)
    # Escotilhas redondas (vigias) nos dois lados, fora do rombo.
    for i, j in ((2, 2), (3, 2), (9, 2), (10, 2), (2, 11), (4, 11), (7, 11), (9, 11)):
        t = t_de(j + 0.5)
        q = (ponto_casco(i, t) + ponto_casco(i + 1, t)) / 2
        centro = Vector((q.x, 0, borda(q.x) - calado(q.x) * 0.55))
        nrm = (q - centro)
        nrm.x = 0
        nrm.normalize()
        rot = nrm.to_track_quat('Z', 'X').to_euler()
        p.append(torus(0.22, 0.06, tuple(q + nrm * 0.01), 'bronze', seg=12, rseg=4, rot=rot))
        p.append(cyl(0.19, 0.04, tuple(q - nrm * 0.03), 'vidroNavio', verts=12, rot=rot))
    # Janelas da popa no espelho e a lanterna de popa num suporte.
    for y in (-0.7, 0.0, 0.7):
        p.append(box((0.12, 0.42, 0.5), (XS[0] - 0.04, y, -0.55), 'madeiraNavioClara', bevel=0.03, segs=1))
        p.append(box((0.13, 0.3, 0.36), (XS[0] - 0.055, y, -0.55), 'vidroNavio', bevel=0.0))
    zp = borda(XS[0])
    p.append(tube([(XS[0] + 0.1, 0, zp), (XS[0] - 0.5, 0, zp + 0.5), (XS[0] - 0.7, 0, zp + 0.4)], [0.05, 0.05, 0.04],
                  'ferroNavio', seg=5))
    p.append(cyl(0.16, 0.34, (XS[0] - 0.7, 0, zp + 0.12), 'lanterna', verts=6))
    p.append(cone(0.22, 0.2, (XS[0] - 0.7, 0, zp + 0.38), 'ferroNavio', verts=6))
    p.append(cyl(0.18, 0.05, (XS[0] - 0.7, 0, zp - 0.07), 'ferroNavio', verts=6))
    # Gurupés (o mastro da proa) com a corda solta.
    zb = borda(XS[-1])
    p.append(tube([(XS[-1] - 0.6, 0, zb - 0.1), (XS[-1] + 1.2, 0, zb + 0.55), (XS[-1] + 2.3, 0, zb + 1.0)],
                  [0.16, 0.12, 0.08], 'madeiraNavio', seg=8))
    p.append(tube([(XS[-1] + 2.2, 0, zb + 0.96), (XS[-1] + 1.6, -0.15, zb - 0.2), (XS[-1] + 1.3, -0.3, zb - 0.9)],
                  [0.025] * 3, 'corda', seg=4))
    return p


def colisao_casco():
    """Uma caixa por pedaço do casco (5 trechos ao longo e 6 em volta), fina e no meio da tábua;
    sem as duas do rombo. Mais o espelho da popa."""
    col = []
    gi = [(0, 2), (2, 5), (5, 8), (8, 11), (11, 14)]
    gj = [(0, 1), (1, 3), (3, 5), (5, 7), (7, 9), (9, 11), (11, 13), (13, 14)]
    for i0, i1 in gi:
        for j0, j1 in gj:
            if i0 == ROMBO_I[0] and j0 >= ROMBO_J[0] and j1 <= ROMBO_J[1]:
                continue
            pts = [ponto_casco(i, t_de(j)) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)]
            meio = sum(pts, Vector()) / len(pts)
            jm = (j0 + j1) / 2
            u = ponto_casco(i1, t_de(jm)) - ponto_casco(i0, t_de(jm))
            im = (i0 + i1) // 2
            vv = ponto_casco(im, t_de(j1)) - ponto_casco(im, t_de(j0))
            n = u.cross(vv).normalized()
            centro_eixo = Vector((meio.x, 0, borda(meio.x) - calado(meio.x) * 0.55))
            if n.dot(meio - centro_eixo) < 0:
                n = -n
            vv_ = n.cross(u).normalized()
            u_ = u.normalized()
            rot = Matrix((u_, vv_, n)).transposed().to_euler()
            larg_v = abs(vv.dot(vv_))
            # A face de fora passa pelo ponto mais para dentro do pedaço (o casco é convexo): a
            # caixa fica dentro da tábua, nunca para fora do desenho.
            fora = min((q - meio).dot(n) for q in pts)
            esp = ESPESSURA * 0.8
            col.append(col_caixa('casco', (u.length + 0.03, larg_v + 0.03, esp),
                                 tuple(meio + n * (fora - esp / 2 - 0.01)), rot))
    x0 = XS[0] + ESPESSURA / 2
    col.append(col_caixa('casco', (ESPESSURA * 0.85, 2 * meia_boca(0) * 0.92, calado(XS[0]) * 0.8),
                         (x0, 0, borda(XS[0]) - calado(XS[0]) * 0.45)))
    return col


# ------------------------------------------------------------------ convés, mastros, timão
def conves():
    """Tábuas ao longo do navio (cada uma até onde o casco deixa), com a escotilha aberta, um
    buraco quebrado perto da proa e o rombo de boreste; vigas embaixo nas pontas do porão."""
    p = []
    col = []
    larg = 0.34
    n = 12
    ex0, ex1, ew = ESCOTILHA
    rnd = random.Random(3)
    for k in range(n):
        y = -(n - 1) / 2 * (larg + 0.03) + k * (larg + 0.03)
        borda_y = abs(y) + larg / 2
        xs = [x / 20 for x in range(int((XS[0] + ESPESSURA + 0.03) * 20), int(XS[-1] * 20))]
        dentro = [x for x in xs if boca_em(x) - 0.1 >= borda_y]
        if not dentro:
            continue
        x0, x1 = dentro[0], dentro[-1]
        cortes = [(x0, x1)]

        def tirar(a, b):
            novos = []
            for c0, c1 in cortes:
                if b <= c0 or a >= c1:
                    novos.append((c0, c1))
                    continue
                if a - c0 > 0.2:
                    novos.append((c0, a))
                if c1 - b > 0.2:
                    novos.append((b, c1))
            cortes[:] = novos

        if abs(y) - larg / 2 < ew:
            tirar(ex0 - 0.02, ex1 + 0.02)
        if -0.9 < y < 1.3:
            tirar(2.1 + rnd.uniform(-0.15, 0.15), 3.35 + rnd.uniform(-0.1, 0.1))
        if y < -1.05:
            tirar(XS[ROMBO_I[0]] - 0.35, XS[ROMBO_I[1]] + 0.35)
        for c0, c1 in cortes:
            dz = 0.012 * ((k * 7) % 3 - 1)
            p.append(box((c1 - c0, larg, 0.1), ((c0 + c1) / 2, y, -0.05 + dz), 'madeiraNavio' if k % 2 else
                         'madeiraNavioEscura', bevel=0.0))
    # O pedaço desabado perto da proa: tábuas que ainda pendem da beira, caídas para dentro do porão.
    for k in range(5):
        y = -0.7 + k * 0.42
        x0 = 2.1 if k % 2 else 3.35
        sentido = 1 if k % 2 else -1
        comp = rnd.uniform(0.9, 1.3)
        incl = R(rnd.uniform(40, 62))
        cx = x0 + sentido * math.cos(incl) * comp / 2
        cz = -0.05 - math.sin(incl) * comp / 2
        p.append(box((comp, 0.32, 0.08), (cx, y, cz), 'madeiraNavioClara' if k % 2 else 'madeiraNavio', bevel=0.0,
                     rot=(0, incl * sentido, 0)))
    # Colisão do convés: inteiro, menos a escotilha e o pedaço desabado (dá para entrar pelos dois).
    def faixa_col(a, b, y0, y1):
        col.append(col_caixa('conves', (b - a, y1 - y0, 0.12), ((a + b) / 2, (y0 + y1) / 2, -0.06)))

    bmax = 2.0
    r0, r1 = XS[ROMBO_I[0]] - 0.3, XS[ROMBO_I[1]] + 0.3
    faixa_col(XS[0] + 0.1, ex0, -bmax, bmax)
    for a, b in ((ex0, r0), (r0, ex1)):
        faixa_col(a, b, ew, bmax)
        faixa_col(a, b, -bmax if b <= r0 else -1.05, -ew)
    faixa_col(ex1, r1, -1.05, bmax)
    faixa_col(r1, 2.1, -bmax, bmax)
    faixa_col(2.1, 3.35, -bmax, -0.9)
    faixa_col(2.1, 3.35, 1.3, bmax)
    faixa_col(3.35, 4.4, -bmax, bmax)
    faixa_col(4.4, 5.4, -0.9, 0.9)
    # Moldura da escotilha.
    for x in (ex0 - 0.06, ex1 + 0.06):
        p.append(box((0.12, 2 * ew + 0.24, 0.24), (x, 0, 0.04), 'madeiraNavioEscura', bevel=0.03, segs=1))
    for y in (-ew - 0.06, ew + 0.06):
        p.append(box((ex1 - ex0, 0.12, 0.22), ((ex0 + ex1) / 2, y, 0.03), 'madeiraNavioEscura', bevel=0.03, segs=1))
    # A grade da escotilha, solta, encostada de lado.
    gx, gy = ex1 + 0.9, 1.0
    for k in range(4):
        p.append(box((0.07, 1.3, 0.06), (gx - 0.36 + k * 0.24, gy, 0.22), 'madeiraNavioClara', bevel=0.0,
                     rot=(R(18), 0, 0)))
    for k in (-1, 1):
        p.append(box((0.9, 0.08, 0.11), (gx, gy + k * 0.5, 0.22 + k * 0.17), 'madeiraNavioEscura', bevel=0.0,
                     rot=(R(18), 0, 0)))
    # Vigas embaixo do convés, nas pontas do porão (no meio fica livre para o corpo passar).
    for x in (-4.1, 4.0):
        w = boca_em(x) - 0.25
        p.append(box((0.16, 2 * w, 0.14), (x, 0, -0.17), 'madeiraNavioEscura', bevel=0.02, segs=1))
    return p, col


def mastros():
    p, col = [], []
    # Mastro grande, do fundo do porão até acima da água, quebrado em lascas.
    topo = 2.3
    p.append(cyl(0.21, topo + 2.7, (MASTRO, 0, (topo - 2.7) / 2), 'madeiraNavio', verts=10, r2=0.19))
    col.append(col_cilindro('mastro', 0.19, topo + 2.7, (MASTRO, 0, (topo - 2.7) / 2)))
    p.append(cyl(0.17, 0.04, (MASTRO, 0, topo + 0.01), 'madeiraNavioClara', verts=10))
    rnd = random.Random(12)
    for k in range(7):
        a = 2 * math.pi * k / 7
        h = rnd.uniform(0.35, 0.85)
        p.append(cone(0.07, h, (MASTRO + math.cos(a) * 0.12, math.sin(a) * 0.12, topo + h / 2 - 0.02),
                      'madeiraNavioClara' if k % 2 else 'madeiraNavio', verts=4, rot=(math.sin(a) * 0.25, -math.cos(a) * 0.25, a)))
    for z in (0.12, 1.2):
        p.append(torus(0.22, 0.05, (MASTRO, 0, z), 'ferroNavio', seg=12, rseg=4))
    # Enxárcias soltas (cordas) do mastro até a borda, as que sobraram.
    for lado in (-1, 1):
        for dx in (-0.6, 0.5):
            x = MASTRO + dx
            yb = lado * (boca_em(x) - 0.05)
            p.append(tube([(MASTRO, lado * 0.15, topo - 0.4), (x, yb * 0.6, 0.9), (x, yb, borda(x) + 0.05)], [0.022] * 3,
                          'corda', seg=4, cap=False))
    # Traquete: um toco quebrado.
    p.append(cyl(0.17, 3.4, (TRAQUETE, 0, -1.0), 'madeiraNavio', verts=10))
    col.append(col_cilindro('mastro', 0.15, 3.4, (TRAQUETE, 0, -1.0)))
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.3
        h = rnd.uniform(0.2, 0.45)
        p.append(cone(0.06, h, (TRAQUETE + math.cos(a) * 0.09, math.sin(a) * 0.09, 0.7 + h / 2), 'madeiraNavioClara',
                      verts=4, rot=(math.sin(a) * 0.2, -math.cos(a) * 0.2, a)))
    p.append(torus(0.18, 0.05, (TRAQUETE, 0, 0.12), 'ferroNavio', seg=12, rseg=4))
    return p, col


def timao(x):
    """Timão de oito raios num pedestal, olhando para a proa."""
    p = [box((0.3, 0.3, 0.95), (x, 0, 0.47), 'madeiraNavioEscura', bevel=0.04, segs=1)]
    zc = 1.2
    rot = (0, R(90), 0)
    p.append(torus(0.48, 0.05, (x + 0.2, 0, zc), 'madeiraNavio', seg=16, rseg=5, rot=rot))
    p.append(cyl(0.09, 0.14, (x + 0.2, 0, zc), 'bronze', verts=10, rot=rot))
    p.append(cyl(0.04, 0.3, (x + 0.08, 0, zc), 'ferroNavio', verts=6, rot=rot))
    for k in range(8):
        a = 2 * math.pi * k / 8
        ca, sa = math.cos(a), math.sin(a)
        p.append(tube([(x + 0.2, ca * 0.08, zc + sa * 0.08), (x + 0.2, ca * 0.48, zc + sa * 0.48),
                       (x + 0.2, ca * 0.66, zc + sa * 0.66)], [0.03, 0.03, 0.045], 'madeiraNavio', seg=5))
    return p, [col_cilindro('timao', 0.15, 0.95, (x, 0, 0.47))]


# ------------------------------------------------------------------ porão (no mundo: a areia é plana)
def contorno_por_dentro(z, folga):
    """Contorno (no chão do Blender) da face de dentro do casco cortada na altura z do mundo."""
    bombordo, boreste = [], []
    for i in range(1, NX - 1):
        amostras = [M_NAVIO @ ponto_casco(i, -math.pi / 2 + math.pi * k / 120) for k in range(121)]
        cruza = {}
        for k in range(120):
            a, b = amostras[k], amostras[k + 1]
            if (a.z - z) * (b.z - z) <= 0 and a.z != b.z:
                cruza[1 if k >= 60 else -1] = a + (b - a) * ((z - a.z) / (b.z - a.z))
        if len(cruza) < 2:
            continue
        q_bb, q_be = cruza[1], cruza[-1]
        d = (q_bb - q_be)
        d.z = 0
        if d.length < 2 * (ESPESSURA + folga) + 0.3:
            continue
        u = d.normalized() * (ESPESSURA + folga)
        bombordo.append(((q_bb - u).x, (q_bb - u).y))
        boreste.append(((q_be + u).x, (q_be + u).y))
    return bombordo + boreste[::-1]


def porao():
    p, col = [], []
    contorno = contorno_por_dentro(AREIA_DENTRO, 0.06)
    p.append(slab(contorno, AREIA_DENTRO - 0.18, AREIA_DENTRO, 'areiaMolhada', bevel=0.05, segs=1, name='areiaPorao',
                  fundo=False))
    xs = [q[0] for q in contorno]
    ys = [q[1] for q in contorno]
    col.append(col_caixa('areia-porao', (max(xs) - min(xs) - 0.4, max(ys) - min(ys) - 0.3, 0.3),
                         ((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, AREIA_DENTRO - 0.15)))
    z = AREIA_DENTRO
    bau = no_navio(-3.0, 0.15, 0)
    bau.z = z
    # Barris (um deitado), caixotes, rolo de corda e moedas espalhadas em volta do baú.
    for k, (x, y) in enumerate(((-3.9, 0.9), (-3.95, -0.25))):
        q = no_navio(x, y, 0)
        p.append(cyl(0.34, 0.85, (q.x, q.y, z + 0.4), 'madeiraNavio', verts=12, r2=0.3))
        for dz in (0.12, 0.68):
            p.append(torus(0.335 - 0.04 * (dz > 0.5), 0.035, (q.x, q.y, z + dz), 'ferroNavio', seg=12, rseg=3))
        p.append(cyl(0.29, 0.03, (q.x, q.y, z + 0.83), 'madeiraNavioClara', verts=12))
        col.append(col_cilindro('barril', 0.32, 0.85, (q.x, q.y, z + 0.42)))
    q = no_navio(-1.4, 1.15, 0)
    rot = (R(90), 0, R(70))
    p.append(cyl(0.33, 0.8, (q.x, q.y, z + 0.3), 'madeiraNavioEscura', verts=12, rot=rot))
    for d in (-0.26, 0.26):
        p.append(torus(0.335, 0.035, (q.x + math.cos(R(70) - math.pi / 2) * d * -1, q.y + math.sin(R(70) - math.pi / 2) * d * -1,
                                      z + 0.3), 'ferroNavio', seg=12, rseg=3, rot=rot))
    col.append(col_caixa('barril-deitado', (0.8, 0.6, 0.6), (q.x, q.y, z + 0.3), (0, 0, R(70) + math.pi / 2)))
    for k, (x, y, s, giro) in enumerate(((1.6, 1.0, 0.7, 0.3), (2.3, 0.85, 0.5, -0.4), (1.9, 1.0, 0.45, 0.8))):
        q = no_navio(x, y, 0)
        zz = z if k < 2 else z + 0.7
        if k == 2:
            q = no_navio(1.6, 1.0, 0)
        p += caixote(q.x, -q.y, s=s, y=zz, rot=giro, m='madeiraNavioClara')
        if k < 2:
            col.append(col_caixa('caixote', (s * 0.95, s * 0.95, s), (q.x, q.y, zz + s / 2), (0, 0, giro)))
    q = no_navio(0.1, -0.9, 0)
    for k in range(3):
        p.append(torus(0.3 - 0.07 * k, 0.06, (q.x, q.y, z + 0.06 + 0.1 * k), 'corda', seg=12, rseg=4))
    rnd = random.Random(5)
    for k in range(12):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(0.45, 1.2)
        inc = rnd.uniform(0, 0.5)
        p.append(cyl(0.06, 0.015, (bau.x + math.cos(a) * d, bau.y + math.sin(a) * d, z + 0.012 + 0.008 * (k % 3)), 'moedaOuro',
                     verts=8, rot=(inc, 0, a)))
    for k in range(3):
        a = 1.2 + k * 0.5
        p.append(uvball(0.07, (bau.x + math.cos(a) * 0.7, bau.y + math.sin(a) * 0.7, z + 0.06), 'perolaLuz', seg=8, ring=5))
    # Lampião pendurado numa corrente presa debaixo do convés, acima do baú.
    alto = no_navio(-2.75, 0.15, -0.1)
    # Poça de luz quente na areia em volta do baú (brilho baixo: o baú se destaca no escuro do porão).
    p.append(slab(blob(bau.x, bau.y, 0.95, 0.8, seed=3, n=16, wob=0.08), z - 0.02, z + 0.012, 'luzBau', bevel=0.0,
                  name='luzBau', fundo=False))
    lz = AREIA_DENTRO + 1.45
    p.append(tube([(alto.x, alto.y, alto.z), (alto.x, alto.y, lz + 0.45)], [0.02, 0.02], 'ferroNavio', seg=4))
    p.append(torus(0.08, 0.02, (alto.x, alto.y, lz + 0.42), 'ferroNavio', seg=8, rseg=3, rot=(R(90), 0, 0)))
    p.append(cone(0.2, 0.18, (alto.x, alto.y, lz + 0.3), 'ferroNavio', verts=6))
    p.append(cyl(0.14, 0.32, (alto.x, alto.y, lz + 0.05), 'lanterna', verts=6))
    p.append(cyl(0.17, 0.06, (alto.x, alto.y, lz - 0.13), 'ferroNavio', verts=6))
    return p, col, bau


# ------------------------------------------------------------------ fundo: areia, pedras, mastro caído, âncora
def fundo():
    p, col = [], []
    p.append(slab(blob(-0.8, 1.9, 10.4, 7.4, seed=11, n=28, wob=0.08), FUNDO - 0.15, FUNDO + 0.12, 'areiaMolhada',
                  bevel=0.1, segs=1, name='leito', fundo=False))
    p.append(slab(blob(0.4, 3.4, 6.4, 3.8, seed=12, n=20, wob=0.1), FUNDO, FUNDO + 0.17, 'areia', bevel=0.08, segs=1,
                  name='leitoClaro', fundo=False))
    col.append(col_cilindro('areia', 6.4, 0.4, (-0.6, 1.8, FUNDO - 0.08)))
    # Montes de areia que enterram o bombordo e a proa.
    for k, (x, y, sx, sy, sz) in enumerate(((-3.0, 2.3, 3.6, 2.0, 1.5), (0.6, 2.5, 4.2, 2.2, 1.7), (3.8, 2.0, 3.4, 2.0, 1.4),
                                            (6.0, 0.4, 2.6, 2.4, 1.6), (-5.6, 0.8, 2.0, 2.6, 1.2))):
        p.append(superellipsoid((sx, sy, sz), (x, y, FUNDO + sz * 0.18), 'areiaMolhada' if k % 2 else 'areia', e1=0.9,
                                e2=0.95, seg=10, ring=5, flat_bottom=0.32))
    # Pedras do fundo; numa delas fica presa a verga com a vela.
    for k, (x, y, s) in enumerate(((-2.6, 6.8, 1.0), (5.6, 6.4, 1.1), (-7.4, -1.6, 0.8), (7.8, -2.8, 0.9), (-6.6, 4.4, 0.9))):
        p.append(rock((x, y, FUNDO - 0.1), (1.9 * s, 1.6 * s, 1.3 * s), 'rochaRecife' if k % 2 else 'rochaRecifeEscura',
                      seed=40 + k, subdiv=1, rough=0.2))
        col.append(col_cilindro('pedra', 0.62 * s, 1.1 * s, (x, y, FUNDO + 0.45 * s)))
    # O pedaço de cima do mastro quebrou e caiu para bombordo: uma ponta ficou apoiada na amurada, ao
    # lado do toco, e a outra na areia, com o cesto da gávea. A verga ficou atravessada nele e a vela
    # caiu por cima, fazendo uma tenda encostada no casco (a página se esconde no cesto, embaixo dela).
    a = no_navio(MASTRO + 0.7, boca_em(MASTRO + 0.7) - 0.1, borda(MASTRO + 0.7) + 0.15)
    b = Vector((MASTRO + 2.3, 7.4, FUNDO + 0.32))
    p.append(tube([a, a.lerp(b, 0.5) + Vector((0, 0, 0.1)), b], [0.17, 0.16, 0.14], 'madeiraNavio', seg=10))
    for k in range(5):
        ang = 2 * math.pi * k / 5
        d = (a - b).normalized()
        q = a + Vector((math.cos(ang) * 0.1, math.sin(ang) * 0.1, math.sin(ang) * 0.08))
        p.append(tube([q, q + d * 0.35 + Vector((0, 0, 0.05))], [0.06, 0.01], 'madeiraNavioClara', seg=4))
    col.append(lib_ilhas_col_entre('mastro-caido', a, b, 0.15))
    giro = math.atan2(b.y - a.y, b.x - a.x)
    d = Vector((math.cos(giro), math.sin(giro), 0))
    cesto = b - (b - a).normalized() * 1.3 + Vector((0.25, 0, 0.0))
    cesto.z = FUNDO + 0.6
    rot = (R(90), 0, giro + R(90))
    p.append(cyl(0.62, 0.7, tuple(cesto), 'madeiraNavio', verts=14, rot=rot))
    p.append(cyl(0.5, 0.72, tuple(cesto), 'navioFundo', verts=14, rot=rot))
    for s_ in (-0.34, 0.34):
        p.append(torus(0.62, 0.05, tuple(cesto + d * s_), 'ferroNavio', seg=14, rseg=4, rot=rot))
    col.append(col_caixa('cesto', (0.7, 1.1, 1.1), tuple(cesto + Vector((0, 0, 0.05))), (0, 0, giro)))
    pagina = cesto + Vector((0, 0, -0.35))
    # A verga atravessada no mastro, quase paralela ao casco.
    meio = a.lerp(b, 0.3)
    lado = Vector((1, -0.12, 0)).normalized()
    va = meio - lado * 1.9 + Vector((0, 0, 0.15))
    vb = meio + lado * 1.9 + Vector((0, 0, 0.15))
    p.append(tube([va, (va + vb) / 2, vb], [0.1, 0.11, 0.09], 'madeiraNavioEscura', seg=8))
    col.append(lib_ilhas_col_entre('verga', va, vb, 0.09))
    # A âncora de ferro, meio enterrada na frente da proa, e a corrente até o escovém.
    ax, ay = 8.6, 1.4
    anc = []
    anc.append(cyl(0.11, 2.0, (0, 0, 1.0), 'ferroNavio', verts=8))
    anc.append(torus(0.22, 0.06, (0, 0, 2.15), 'ferrugem', seg=12, rseg=4, rot=(R(90), 0, 0)))
    anc.append(cyl(0.07, 1.5, (0, 0, 1.75), 'ferroNavio', verts=6, rot=(R(90), 0, 0)))
    for s in (-1, 1):
        anc.append(uvball(0.1, (0, s * 0.78, 1.75), 'ferroNavio', seg=6, ring=4))
    anc.append(torus(0.7, 0.1, (0, 0, 0.75), 'ferroNavio', seg=14, rseg=5, rot=(R(90), 0, 0), arc=180))
    anc[-1].rotation_euler = (R(90), R(180), 0)
    for s in (-1, 1):
        anc.append(prism([(0, 0), (0.26, 0.2), (0.0, 0.55), (-0.26, 0.2)], 0.08, (s * 0.7, 0, 0.82), 'ferrugem',
                         rot=(0, s * R(-35), 0)))
    anc.append(cone(0.14, 0.3, (0, 0, -0.05), 'ferroNavio', verts=6, rot=(R(180), 0, 0)))
    bpy.context.view_layer.update()
    for o in anc:
        o.matrix_world = (Matrix.Translation((ax, ay, FUNDO - 0.35)) @ Matrix.Rotation(R(30), 4, 'Z')
                          @ Matrix.Rotation(R(-52), 4, 'Y') @ o.matrix_world)
    p += anc
    bpy.context.view_layer.update()
    argola = anc[1].matrix_world.translation.copy()
    col.append(col_caixa('ancora', (1.6, 0.5, 0.7), (ax - 0.2, ay - 0.1, FUNDO + 0.35), (0, 0, R(30))))
    escoven = no_navio(XS[-1] - 0.7, 0.45, -0.25)
    n = 12
    for k in range(n + 1):
        t = k / n
        q = escoven.lerp(argola, t)
        q.z -= 1.1 * math.sin(math.pi * t) * (1 - t * 0.3)
        q.z = max(q.z, FUNDO + 0.14)
        d = (argola - escoven).normalized()
        giro_elo = math.atan2(d.y, d.x)
        incl = math.atan2(argola.z - escoven.z, (argola - escoven).xy.length)
        rot = (R(90) if k % 2 else 0, -incl, giro_elo)
        p.append(torus(0.13, 0.035, tuple(q), 'ferroNavio' if k % 3 else 'ferrugem', seg=6, rseg=3, rot=rot))
    return p, col, pagina, (va, vb, cesto)


def lib_ilhas_col_entre(base, a, b, r):
    return col_entre(base, tuple(a), tuple(b), r, sobra=0.05)


def vela(va, vb, cesto):
    """A vela listrada caída da verga por cima do cesto: uma tenda de pano mole, aberta nas duas
    pontas (dá para entrar nadando), com dois rasgos e a barra de baixo esfiapada."""
    nu, nv = 12, 7
    ao_lado = Vector((-(vb - va).y, (vb - va).x, 0)).normalized()
    if ao_lado.dot(cesto - va) < 0:
        ao_lado = -ao_lado
    rnd = random.Random(9)
    verts = []
    for jv in range(nv + 1):
        for iu in range(nu + 1):
            u, v = iu / nu, jv / nv
            if jv == nv:
                v += rnd.uniform(-0.12, 0.03)   # barra esfiapada
            topo = va.lerp(vb, u) + Vector((0, 0, 0.1))
            q = topo + ao_lado * (3.6 * v) + (vb - va).normalized() * (0.25 * math.sin(math.pi * v) * (u - 0.5))
            h0 = topo.z - FUNDO
            altura = h0 * (1 - v ** 1.8) + 0.35 * math.sin(math.pi * v) - 0.12 * math.sin(math.pi * u) * math.sin(math.pi * v)
            q.z = FUNDO + 0.06 + max(0.0, altura) + 0.05 * math.sin(u * 9 + v * 4)
            verts.append(q)
    faces, mats = [], []
    for jv in range(nv):
        for iu in range(nu):
            if (jv, iu) in ((2, 8), (4, 3)):
                continue
            a = jv * (nu + 1) + iu
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
            mats.append(0 if (iu // 2) % 2 == 0 else 1)
    o = malha('vela', verts, faces, 'velaNavio', materiais=['velaListra'], cima=False, liso=True)
    for p_, mi in zip(o.data.polygons, mats):
        p_.material_index = mi
    s = o.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = 0.03
    lib_q._apply(o, s)
    p = [o]
    # Cordas soltas da vela, caídas na areia.
    for k, u in enumerate((0.1, 0.9)):
        q = va.lerp(vb, u) + Vector((0, 0, 0.1))
        fim = q - ao_lado * 0.9 + Vector((0.3 * k, 0, 0))
        fim.z = FUNDO + 0.15
        p.append(tube([q, (q + fim) / 2 - Vector((0, 0, 0.2)), fim], [0.025] * 3, 'corda', seg=4, cap=False))
    return p


# ------------------------------------------------------------------ corais e algas
def corais():
    """Corais e cracas no navio (no referencial do navio, tortos com ele) e em volta (no fundo)."""
    no_casco = []
    no_casco += rc.coral_cerebro(3.9, 0.6, 'coralAmarelo', 0.5, y=0.02)
    no_casco += rc.coral_tubo(-3.4, -1.1, 'coralLaranja', 0.55, seed=3, y=0.02)
    no_casco += rc.coral_galho(-1.0, -1.0, 'coralRosa', 0.45, seed=4, y=0.02)
    no_casco += rc.coral_leque(4.5, 0.9, 'coralLilas', 0.6, rot=R(70), y=borda(4.5) - 0.02)
    no_casco += rc.coral_galho(-4.4, 1.0, 'coralAzul', 0.5, seed=8, y=borda(-4.4) - 0.05)
    # Corais que cresceram no costado de boreste, perto do rombo e da quilha.
    for k, (i, j, f) in enumerate(((3.5, 6.2, 'cerebro'), (9.6, 5.8, 'tubo'), (11.2, 4.2, 'galho'), (2.2, 7.0, 'tubo'))):
        q = ponto_casco(int(i), t_de(j)).lerp(ponto_casco(int(i) + 1, t_de(j)), i - int(i))
        centro = Vector((q.x, 0, borda(q.x) - calado(q.x) * 0.55))
        nrm = (q - centro).normalized()
        c = q + nrm * 0.05
        cor = ('coralRosa', 'coralAmarelo', 'coralAzul', 'coralLaranja')[k]
        if f == 'cerebro':
            no_casco += rc.coral_cerebro(c.x, -c.y, cor, 0.6, y=c.z - 0.25)
        elif f == 'tubo':
            no_casco += rc.coral_tubo(c.x, -c.y, cor, 0.55, seed=30 + k, y=c.z - 0.1)
        else:
            no_casco += rc.coral_galho(c.x, -c.y, cor, 0.5, seed=30 + k, y=c.z - 0.1)
    # Cracas em cachos no costado de boreste.
    rnd = random.Random(17)
    for i, j in ((3, 2.6), (4, 3.4), (9, 3.0), (11, 2.2), (2, 4.4), (10, 4.6)):
        q = ponto_casco(i, t_de(j))
        centro = Vector((q.x, 0, borda(q.x) - calado(q.x) * 0.55))
        nrm = (q - centro).normalized()
        for k in range(5):
            dq = Vector((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.1, 0.1), rnd.uniform(-0.25, 0.25)))
            c = cone(0.07, 0.1, tuple(q + dq + nrm * 0.02), 'concha', verts=6)
            c.rotation_euler = nrm.to_track_quat('Z', 'Y').to_euler()
            no_casco.append(c)
    # Estrelas-do-mar no convés e no costado.
    for k, (x, y) in enumerate(((1.6, -0.9), (-3.0, 1.4))):
        no_casco.append(prism(star_pts(0.28, 0.12, 5, k * 15), 0.05, (x, y, 0.035), ('coral', 'coralLaranja')[k],
                              rot=(R(90), 0, k)))
    transformar(no_casco)
    fora = []
    fora += rc.coral_cerebro(-6.2, -2.4, 'coralRosa', 0.9, y=FUNDO + 0.05)
    fora += rc.coral_galho(-5.4, 3.4, 'coral', 0.9, seed=21, y=FUNDO + 0.1)
    fora += rc.coral_tubo(6.6, 3.0, 'coralLilas', 0.8, seed=22, y=FUNDO + 0.1)
    fora += rc.coral_leque(7.2, -4.0, 'coralAzul', 0.9, rot=R(20), y=FUNDO + 0.08)
    col = [col_cilindro('coral', 0.55, 0.9, (6.6, -3.0, FUNDO + 0.45)), col_cilindro('coral', 0.75, 0.8, (-6.2, 2.4, FUNDO + 0.4))]
    for k, (x, z, s) in enumerate(((-3.6, -5.2, 0.9), (4.6, 4.8, 0.8))):
        fora.append(prism(star_pts(0.3 * s, 0.13 * s, 5, k * 30), 0.05, (x, -z, FUNDO + 0.25), 'coralLaranja',
                          rot=(R(90), 0, k)))
    return no_casco + fora, col


def alga(x, z, y, seed=0, s=1.0):
    """Tufo de alga de três fitas como o do `recife.py`, com o pé de cada fita um pouco afastado
    (as três nascendo do mesmo ponto deixavam faces no mesmo plano)."""
    rnd = random.Random(seed)
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.4, 0.4)
        d = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 1.0))
        cor = ('alga', 'algaClara', 'algaFunda')[k]
        pe = (x + math.cos(a) * 0.08, -z + math.sin(a) * 0.08, y - 0.05)
        p.append(lib_ilha.lock(pe, d, (1.1 + 0.35 * k) * s, 0.09 * s, cor,
                               bend=(math.cos(a + 1.3) * 0.3, math.sin(a + 1.3) * 0.3, 0), n=6, seg=6))
    return p, (x, -z, y)


ALGAS = [(-6.8, -0.4, FUNDO + 0.05), (-3.0, -4.7, FUNDO + 0.05), (2.6, -4.6, FUNDO + 0.1), (7.0, 1.2, FUNDO + 0.1),
         (5.6, -6.2, FUNDO + 0.1), (-1.2, -5.0, FUNDO + 0.1)]


# ------------------------------------------------------------------ montagem
def construir():
    lib_q.reset()
    nav = casco()
    col = colisao_casco()
    tab, col_c = conves()
    nav += tab
    col += col_c
    m, col_m = mastros()
    nav += m
    col += col_m
    t, col_t = timao(-4.1)
    nav += t
    col += col_t
    transformar(nav)
    transformar(col)
    carga, col_p, bau = porao()
    col += col_p
    chao, col_f, pagina, tenda = fundo()
    col += col_f
    pano = vela(*tenda)
    cor, col_cor = corais()
    col += col_cor
    algas = {}
    for i, (x, z, y) in enumerate(ALGAS):
        objs, pivo = alga(x, z, y, seed=40 + i, s=1.3)
        algas[f'alga-{i + 1}'] = (objs, pivo)
    rombo = (no_navio((XS[ROMBO_I[0]] + XS[ROMBO_I[1]]) / 2, -2.4, -1.6))
    mastro = no_navio(MASTRO, 0, 2.3)
    escotilha = no_navio((ESCOTILHA[0] + ESCOTILHA[1]) / 2, 0, 0.2)
    anc = [ancora('entrada', rombo.x, -rombo.y, rombo.z), ancora('bau', bau.x, -bau.y, bau.z),
           ancora('pagina-diario', pagina.x, -pagina.y, pagina.z), ancora('escotilha', escotilha.x, -escotilha.y, escotilha.z),
           ancora('mastro', mastro.x, -mastro.y, 0.0)]
    # O baú olha para o rombo (giro em y, no jogo).
    anc[1].rotation_euler = (0, 0, math.atan2(rombo.y - bau.y, rombo.x - bau.x) + math.pi / 2)
    relatorio_medidas(bau)
    exportar('recife-navio', {'navio': nav, 'vela': pano, 'carga': carga, 'fundo': chao, 'corais': cor, **algas}, anc,
             clipes_=rc.clipe_algas, colisores=col)


def relatorio_medidas(bau):
    """Imprime o vão livre do porão (areia até o convés) e a altura do rombo, para conferir o corpo."""
    pts = []
    for x in (-3.0, -1.6, 0.0, 1.6, 2.8):
        for y in (-1.0, 0.0, 1.0):
            teto = no_navio(x, y, -0.1)
            pts.append((x, y, round(teto.z - AREIA_DENTRO, 2)))
    print('VAO_PORAO', pts)
    i0, i1 = ROMBO_I
    baixo = min((M_NAVIO @ ponto_casco(i, t_de(ROMBO_J[1]))).z for i in range(i0, i1 + 1))
    teto = max((no_navio(XS[i], -1.4, -0.1)).z for i in range(i0, i1 + 1))
    print('ROMBO de', round(baixo, 2), 'até o convés', round(teto, 2), 'largura', round(XS[i1] - XS[i0], 2))
    acima = [round((M_NAVIO @ ponto_casco(i, t_de(j))).z, 2) for i in range(NX) for j in (0, NT)]
    print('BORDA mais alta', max(acima), 'mastro', round(no_navio(MASTRO, 0, 2.3).z, 2), 'bau', tuple(round(v, 2) for v in bau))


if __name__ == '__main__':
    construir()
