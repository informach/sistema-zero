"""Café e banca de feira para a casa (`src/assets/casa/casa-cafe.glb`, um móvel por nó).

O mesmo contrato dos móveis dos cômodos (`comodos.py`, README desta pasta): célula de 1, base em
z = 0, centrado em x no footprint e frente para -Y; os de encostar têm o fundo em y = +0,35; a peça
de parede fica centrada na origem com o fundo em y = +0,10. As cores são as da casa e as da Vila
Doce (rosa e creme), com os mesmos nomes de material de `arte/ilhas/lib_ilhas.py` e as mesmas cores.

- `cafe-mesa-redonda` (1 × 1): mesa de pé central, tampo creme de 0,8 de diâmetro a 0,75;
- `cafe-cadeira` (1 × 1): cadeira de bistrô com assento rosa a 0,50 e encosto de coração;
- `cafe-balcao` (2 × 1): balcão de 1,8 × 1,0 de altura, painéis rosa e apoio de pé dourado;
- `cafe-vitrine-doces` (1 × 1): vitrine com vidro (`vidroArmario`, o único translúcido da casa) e
  doces em dois andares;
- `cafe-lousa-cardapio` (parede, 0,8 × 0,6): lousa de giz com moldura de madeira;
- `cafe-banca-feira` (2 × 1): banca de 1,8 × 2,0 com toldo listrado rosa e creme, frutas e a placa
  (`placaFace`, como as barracas das festas, para o jogo escrever);
- `cafe-caixote` (1 × 1): caixote de ripas, empilhável (um em cima do outro a cada 0,32).
"""
from lib_casa import *
from lib_casa import _objeto
from comodos import FUNDO, recentrar_parede  # noqa: F401  (também traz a paleta dos cômodos e o vidroArmario)

# Vila Doce: os mesmos nomes e cores de `arte/ilhas/lib_ilhas.py`.
VILA_DOCE = {
    'toldoRosa': ('#ff8fb8', 0.8, None, 0),
    'toldoBranco': ('#fffaf5', 0.8, None, 0),
    'baunilha': ('#fff3cf', 0.6, None, 0),
    'chocolate': ('#6b3f25', 0.5, None, 0),
    'chocolateClaro': ('#8a5634', 0.5, None, 0),
    'menta': ('#9ff0cf', 0.6, None, 0),
    'casquinha': ('#e3a858', 0.7, None, 0),
    'madeiraDoce': ('#c98d55', 0.85, None, 0),
    'confeito': ('#ffffff', 0.5, None, 0),
    'farinha': ('#fbf6ec', 0.9, None, 0),
}
for _nome, _cor in VILA_DOCE.items():
    lib_q.PALETTE.setdefault(_nome, _cor)


def meio_disco(r, n=8):
    """Meio disco virado para baixo (a franja recortada dos toldos e do balcão), no plano XZ."""
    return [(r * math.cos(math.pi + math.pi * k / n), r * math.sin(math.pi + math.pi * k / n)) for k in range(n + 1)]


# ---------------------------------------------------------------- peças
def mesa_redonda():
    """1 × 1: tampo de 0,8 de diâmetro a 0,75 (creme, com a borda rosa), pé central e base redonda."""
    seg = 32
    p = [torneado([(0, 0.75), (0.388, 0.75), (0.4, 0.742)], 'baunilha', seg=seg)]
    p.append(torneado([(0.4, 0.742), (0.4, 0.722), (0.385, 0.712), (0.2, 0.712), (0, 0.712)], 'toldoRosa', seg=seg))
    p.append(cyl(0.035, 0.64, (0, 0, 0.392), 'toldoRosa', verts=12))
    p.append(cyl(0.1, 0.03, (0, 0, 0.697), 'toldoRosa', verts=16))
    p.append(torneado([(0, 0.0), (0.24, 0.0), (0.24, 0.015), (0.2, 0.04), (0.06, 0.07), (0.04, 0.09), (0, 0.09)],
                      'toldoRosa', seg=24))
    return [sem_fundo(o) if i == len(p) - 1 else o for i, o in enumerate(p)]


def cadeira():
    """1 × 1: cadeira de bistrô: armação creme, assento rosa a 0,50 e um coração no encosto."""
    p = []
    zs = 0.46
    p.append(torneado([(0, zs), (0.2, zs), (0.215, zs + 0.012), (0.21, 0.49), (0.18, 0.5), (0, 0.5)], 'toldoRosa',
                      seg=24))
    p.append(lib_q.torus(0.205, 0.014, (0, 0, zs), 'baunilha', seg=24, rseg=6))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(tube([(sx * 0.14, sy * 0.14, zs), (sx * 0.175, sy * 0.175, 0.0015)], [0.016, 0.014], 'baunilha',
                          seg=8))
    p.append(lib_q.torus(0.158, 0.009, (0, 0, 0.2), 'baunilha', seg=20, rseg=5))
    # Encosto: dois montantes que sobem das pernas de trás e dois arcos.
    for sx in (-1, 1):
        p.append(tube([(sx * 0.14, 0.14, zs), (sx * 0.15, 0.17, 0.7), (sx * 0.14, 0.19, 0.92)], [0.014] * 3,
                      'baunilha', seg=8))
    for z, r in ((0.92, 0.014), (0.7, 0.011)):
        arco = [(0.2 * math.cos(R(a)), 0.2 * math.sin(R(a)) - 0.005 + (0.0 if z > 0.8 else -0.02), z)
                for a in range(45, 136, 9)]
        p.append(tube(arco, [r] * len(arco), 'baunilha', seg=8))
    coracao = prism(lib_q.heart_pts(0.075, 24), 0.02, (0, 0.175, 0.81), 'toldoRosa')
    p.append(coracao)
    return p


def balcao():
    """2 × 1: balcão do café, 1,8 de largura e 1,0 de altura (tampo de madeira), corpo creme com
    painéis rosa, franja recortada embaixo do tampo e apoio de pé dourado na frente."""
    p = [sem_fundo(caixa(-0.86, 0.86, -0.26, 0.26, 0.0, 0.08, 'chocolate'))]
    p.append(caixa(-0.88, 0.88, -0.28, 0.28, 0.08, 0.94, 'baunilha'))
    p.append(caixa(-0.9, 0.9, -0.3, 0.3, 0.94, 1.0, 'madeiraDoce', bevel=0.012))
    for x in (-0.66, -0.22, 0.22, 0.66):
        p.append(caixa(x - 0.18, x + 0.18, -0.295, -0.28, 0.16, 0.8, 'toldoRosa', bevel=0.008))
        p.append(caixa(x - 0.12, x + 0.12, -0.302, -0.29, 0.24, 0.72, 'baunilha', bevel=0.005))
    for k in range(16):
        x = -0.84 + k * 0.112
        p.append(prism(meio_disco(0.056), 0.012, (x, -0.29, 0.94), 'toldoRosa' if k % 2 == 0 else 'farinha'))
    # Apoio de pé: barra dourada na frente, presa por três suportes.
    p.append(cyl(0.016, 1.6, (0, -0.36, 0.2), 'macaneta', verts=10, rot=(0, R(90), 0)))
    for x in (-0.44, 0.0, 0.44):
        p.append(cyl(0.012, 0.08, (x, -0.32, 0.2), 'macaneta', verts=8, rot=(R(90), 0, 0)))
    return p


def cupcake(x, y, z, cobertura, cereja=True, k=1.35):
    p = [torneado([(0, 0), (0.028 * k, 0), (0.038 * k, 0.045 * k), (0, 0.045 * k)], 'forminha', seg=12, pos=(x, y, z))]
    p.append(uvball(0.038 * k, (x, y, z + 0.055 * k), cobertura, scale=(1, 1, 0.7), seg=12, ring=7))
    p.append(uvball(0.024 * k, (x, y, z + 0.082 * k), cobertura, scale=(1, 1, 0.8), seg=10, ring=6))
    if cereja:
        p.append(uvball(0.011 * k, (x, y, z + 0.107 * k), 'morango', seg=8, ring=5))
    return p


def rosquinha(x, y, z, cobertura):
    cob = lib_q.torus(0.034, 0.014, (x, y, z + 0.03), cobertura, seg=14, rseg=6)
    cob.scale = (1, 1, 0.45)
    return [lib_q.torus(0.034, 0.016, (x, y, z + 0.016), 'casquinha', seg=14, rseg=6), cob]


def vitrine_doces():
    """1 × 1, de encostar: armário rosa com a vitrine de vidro em cima (0,79 a 1,22) e doces em dois
    andares: bolo, cupcakes, rosquinhas e brigadeiros."""
    p = [sem_fundo(caixa(-0.43, 0.43, -0.27, FUNDO - 0.03, 0.0, 0.08, 'chocolate'))]
    p.append(caixa(-0.45, 0.45, -0.29, FUNDO, 0.08, 0.75, 'toldoRosa'))
    p.append(caixa(-0.38, 0.38, -0.3, -0.29, 0.16, 0.67, 'baunilha', bevel=0.006))
    p.append(caixa(-0.46, 0.46, -0.31, FUNDO, 0.75, 0.79, 'madeiraDoce', bevel=0.008))
    zt, zv = 0.79, 1.22
    # Postes de canto, o fundo creme e o tampo.
    for x0, x1 in ((-0.45, -0.42), (0.42, 0.45)):
        for y0, y1 in ((-0.29, -0.26), (FUNDO - 0.04, FUNDO - 0.01)):
            p.append(caixa(x0, x1, y0, y1, zt - 0.005, zv + 0.005, 'baunilha'))
    p.append(caixa(-0.42, 0.42, FUNDO - 0.028, FUNDO - 0.015, zt - 0.015, zv + 0.015, 'baunilha'))
    p.append(caixa(-0.46, 0.46, -0.3, FUNDO, zv, zv + 0.04, 'baunilha', bevel=0.01))
    for k in range(9):
        x = -0.4 + k * 0.1
        p.append(prism(meio_disco(0.05), 0.01, (x, -0.305, zv), 'toldoRosa'))
    # Vidros: frente e lados, encaixados nos postes (as pontas ficam dentro deles).
    p.append(caixa(-0.43, 0.43, -0.279, -0.273, zt - 0.011, zv + 0.011, 'vidroArmario'))
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.432, s * 0.438))
        p.append(caixa(x0, x1, -0.265, FUNDO - 0.035, zt - 0.011, zv + 0.011, 'vidroArmario'))
    # Prateleira do meio.
    p.append(caixa(-0.415, 0.415, -0.24, FUNDO - 0.02, 1.0, 1.015, 'baunilha'))
    # Embaixo: o bolo no prato alto e três cupcakes.
    p.append(torneado([(0, zt), (0.03, zt), (0.025, zt + 0.06), (0.13, zt + 0.065), (0.13, zt + 0.075), (0, zt + 0.075)],
                      'loucaBranca', seg=20, pos=(-0.2, 0.05, 0)))
    zb = zt + 0.075
    p.append(torneado([(0, zb), (0.11, zb), (0.11, zb + 0.06), (0, zb + 0.06)], 'bolo', seg=20, pos=(-0.2, 0.05, 0)))
    p.append(torneado([(0, zb + 0.06), (0.113, zb + 0.06), (0.113, zb + 0.072), (0.1, zb + 0.08), (0, zb + 0.08)],
                      'toldoRosa', seg=20, pos=(-0.2, 0.05, 0)))
    for k in range(6):
        a = R(60 * k)
        p.append(uvball(0.016, (-0.2 + 0.08 * math.cos(a), 0.05 + 0.08 * math.sin(a), zb + 0.09), 'morango', seg=8,
                        ring=5))
    for k, (x, m) in enumerate(((0.06, 'baunilha'), (0.19, 'toldoRosa'), (0.32, 'menta'))):
        p += cupcake(x, -0.08 + 0.08 * (k % 2), zt, m)
    # Em cima: rosquinhas e brigadeiros nas forminhas.
    for k, (x, m) in enumerate(((-0.3, 'toldoRosa'), (-0.2, 'chocolate'), (-0.1, 'baunilha'))):
        p += rosquinha(x, -0.02 + 0.05 * (k % 2), 1.015, m)
    for k in range(6):
        x, y = 0.06 + (k % 3) * 0.09, -0.04 + (k // 3) * 0.09
        p.append(torneado([(0, 1.015), (0.022, 1.015), (0.03, 1.04), (0, 1.04)], 'forminha', seg=10, pos=(x, y, 0)))
        p.append(uvball(0.026, (x, y, 1.05), 'brigadeiro', seg=10, ring=6))
    return p


def lousa_cardapio():
    """Parede, 0,8 × 0,6: lousa de giz (`metalEscuro`) com moldura de madeira, uma xícara, um cupcake e
    as linhas do cardápio a giz. O fundo encosta na parede (y = +0,10)."""
    p = [caixa(-0.395, 0.395, 0.06, 0.1, -0.295, 0.295, 'madeiraDoce')]
    # A moldura é uma malha só com o vão da lousa (sem emenda em T nos cantos).
    p.append(parede_grade(-0.4, 0.4, 0.04, 0.06, -0.3, 0.3, [(0.0, 0.7, -0.25, 0.25)], 'madeiraDoce', 'madeiraDoce',
                          'madeiraDoce', 'madeiraDoce', tampas=True, fundo=True, nome='moldura'))
    p.append(caixa(-0.35, 0.35, 0.05, 0.06, -0.25, 0.25, 'metalEscuro'))
    y0, y1 = 0.046, 0.05
    # Xícara no alto à esquerda (giz branco) e o vapor.
    # Xícara a giz em três traços que não se encostam (lado a lado no mesmo plano dariam emenda).
    p.append(caixa(-0.285, -0.195, y0, y1, 0.1, 0.112, 'confeito'))
    for x in (-0.29, -0.202):
        p.append(caixa(x, x + 0.012, y0, y1, 0.116, 0.19, 'confeito'))
    p.append(caixa(-0.34, -0.14, y0, y1, 0.084, 0.094, 'confeito'))
    alca = lib_q.torus(0.025, 0.006, (-0.163, (y0 + y1) / 2, 0.15), 'confeito', seg=10, rseg=4, rot=(R(90), 0, 0),
                       arc=180)
    alca.rotation_euler = (R(90), R(-90), 0)
    p.append(alca)
    for x in (-0.26, -0.22):
        onda = [(x + 0.01 * math.sin(k * 1.4), (y0 + y1) / 2, 0.205 + 0.012 * k) for k in range(4)]
        p.append(tube(onda, [0.004] * 4, 'confeito', seg=4))
    # Cupcake no alto à direita (giz rosa e verde).
    p.append(prism([(-0.035, 0), (0.035, 0), (0.045, 0.05), (-0.045, 0.05)], 0.004, (0.25, (y0 + y1) / 2, 0.09),
                   'menta'))
    p.append(prism(meio_disco(0.05, 10), 0.004, (0.25, (y0 + y1) / 2, 0.142), 'toldoRosa', rot=(0, R(180), 0)))
    # Linhas do cardápio: palavras (traços) e o preço (pontinho) em cada linha.
    linhas = [(0.0, [0.08, 0.05, 0.1]), (-0.07, [0.12, 0.06]), (-0.14, [0.06, 0.09, 0.05]), (-0.21, [0.1, 0.07])]
    for z, palavras in linhas:
        x = -0.3
        for w in palavras:
            p.append(caixa(x, x + w, y0, y1, z, z + 0.014, 'confeito'))
            x += w + 0.025
        p.append(caixa(0.22, 0.28, y0, y1, z, z + 0.014, 'toldoRosa'))
    return recentrar_parede(p)


def banca_feira():
    """2 × 1: banca de feira de 1,8 × 2,0: quatro postes, mesa com três caixotes de frutas, saia creme
    com a franja rosa, toldo listrado rosa e creme caindo para a frente e a placa pendurada."""
    p = []
    yf, yt = -0.32, 0.32
    for x in (-0.82, 0.82):
        p.append(cyl(0.035, 1.81, (x, yf, 0.905), 'madeiraDoce', verts=10))
        p.append(cyl(0.035, 1.96, (x, yt, 0.98), 'madeiraDoce', verts=10))
    p.append(caixa(-0.86, 0.86, -0.4, 0.38, 0.8, 0.85, 'madeiraDoce', bevel=0.01))
    p.append(caixa(-0.84, 0.84, -0.405, -0.39, 0.32, 0.8, 'baunilha'))
    for k in range(15):
        x = -0.784 + k * 0.112
        p.append(prism(meio_disco(0.056), 0.01, (x, -0.41, 0.36), 'toldoRosa'))
    p.append(caixa(-0.82, 0.82, -0.02, 0.02, 0.3, 0.34, 'madeiraDoce'))
    # Caixotes rasos com frutas.
    frutas = (('abobora', 0.035), ('limao', 0.03), ('morango', 0.022))
    for i, (m, r) in enumerate(frutas):
        cx = -0.52 + i * 0.52
        p.append(sem_fundo(caixa(cx - 0.2, cx + 0.2, -0.28, 0.08, 0.85, 0.87, 'madeira')))
        for s in (-1, 1):
            y0, y1 = sorted((-0.1 + s * 0.2, -0.1 + s * 0.185))
            p.append(sem_fundo(caixa(cx - 0.22, cx + 0.22, y0, y1, 0.85, 0.95, 'madeira')))
            x0, x1 = sorted((cx + s * 0.216, cx + s * 0.201))
            p.append(sem_fundo(caixa(x0, x1, -0.285, 0.085, 0.85, 0.945, 'madeira')))
        n = int(0.38 / (2 * r))
        for a in range(n):
            for b in range(int(0.34 / (2 * r))):
                x = cx - 0.19 + r + a * 2 * r * 1.02
                y = -0.27 + r + b * 2 * r * 1.02
                if abs(x - cx) > 0.2 - r or y > 0.07 - r:
                    continue
                if (a * 7 + b * 3) % 5 == 0:
                    continue
                p.append(uvball(r, (x, y, 0.87 + r * 0.95 + 0.012 * ((a + b) % 2)), m, seg=7, ring=4))
    # Toldo: nove listras da frente (1,78) para trás (1,98), com a franja recortada na frente.
    n = 9
    w = 1.8 / n
    z0, z1, y0, y1 = 1.76, 1.96, -0.45, 0.4
    for k in range(n):
        x0 = -0.9 + k * w
        m = 'toldoRosa' if k % 2 == 0 else 'toldoBranco'
        bm = bmesh.new()
        v = [bm.verts.new(c) for c in ((x0, y0, z0), (x0 + w, y0, z0), (x0 + w, y1, z1), (x0, y1, z1),
                                       (x0, y0, z0 + 0.04), (x0 + w, y0, z0 + 0.04), (x0 + w, y1, z1 + 0.04),
                                       (x0, y1, z1 + 0.04))]
        for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (3, 0, 4, 7)):
            bm.faces.new([v[i] for i in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        p.append(_objeto('listra', bm, [m]))
        p.append(prism(meio_disco(w / 2), 0.012, (x0 + w / 2, y0 - 0.006, z0 + 0.002), m))
    # A placa pendurada embaixo do toldo, na frente.
    p.append(caixa(-0.4, 0.4, -0.37, -0.34, 1.42, 1.6, 'placa', bevel=0.012))
    p.append(caixa(-0.36, 0.36, -0.38, -0.37, 1.44, 1.58, 'placaFace'))
    for x in (-0.3, 0.3):
        p.append(cyl(0.006, 0.19, (x, -0.355, 1.695), 'corda', verts=5))
    return p


def caixote():
    """1 × 1: caixote de feira de ripas, 0,6 × 0,32 × 0,4. Empilha: o próximo vai 0,32 acima (os
    pés de um encostam no alto dos postes do outro, de costas)."""
    H, X, Y = 0.32, 0.3, 0.2
    p = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0, x1 = sorted((sx * (X - 0.02), sx * (X - 0.06)))
            y0, y1 = sorted((sy * (Y - 0.02), sy * (Y - 0.06)))
            p.append(sem_fundo(caixa(x0, x1, y0, y1, 0.0, H, 'madeira')))
    # As ripas dos lados curtos ficam 4 mm para dentro e 4 mm mais estreitas que as dos compridos: as
    # pontas não ficam no mesmo plano das vizinhas (sem emenda em T).
    for z0, z1 in ((0.02, 0.1), (0.12, 0.2), (0.22, 0.3)):
        for s in (-1, 1):
            y0, y1 = sorted((s * Y, s * (Y - 0.015)))
            p.append(caixa(-X, X, y0, y1, z0, z1, 'madeiraDoce'))
            x0, x1 = sorted((s * (X - 0.004), s * (X - 0.019)))
            p.append(caixa(x0, x1, -(Y - 0.015), Y - 0.015, z0 + 0.004, z1 - 0.004, 'madeiraDoce'))
    for y in (-0.095, 0.0, 0.095):
        p.append(sem_fundo(caixa(-(X - 0.019), X - 0.019, y - 0.045, y + 0.045, 0.0, 0.02, 'madeiraDoce')))
    # A pegada recortada dos lados curtos (uma faixa escura no meio da ripa de cima).
    for s in (-1, 1):
        x0, x1 = sorted((s * (X + 0.005), s * (X - 0.01)))
        p.append(caixa(x0, x1, -0.06, 0.06, 0.245, 0.275, 'madeiraEscura'))
    return p


PECAS = {
    'cafe-mesa-redonda': mesa_redonda, 'cafe-cadeira': cadeira, 'cafe-balcao': balcao,
    'cafe-vitrine-doces': vitrine_doces, 'cafe-lousa-cardapio': lousa_cardapio, 'cafe-banca-feira': banca_feira,
    'cafe-caixote': caixote,
}
FOOTPRINT = {
    'cafe-mesa-redonda': '1 × 1', 'cafe-cadeira': '1 × 1', 'cafe-balcao': '2 × 1', 'cafe-vitrine-doces': '1 × 1',
    'cafe-lousa-cardapio': 'parede, 0,8 de largura', 'cafe-banca-feira': '2 × 1',
    'cafe-caixote': '1 × 1; empilha a cada 0,32',
}


def main():
    novo()
    nos = {nome: fn() for nome, fn in PECAS.items()}
    exportar_casa('casa-cafe', nos, grupo='cafe', notas=FOOTPRINT)


if __name__ == '__main__':
    main()
