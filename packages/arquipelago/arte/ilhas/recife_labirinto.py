"""O labirinto de corais do Recife Coral (lugar de exploração de mergulho, um GLB à parte).

Paredes de recife em grade de 5 x 4 quadras de 3,6 m. Cada trecho de parede são cabeças de coral
redondas e lisas, de cores diferentes, em cima de um miolo escuro: duas embaixo, uma no meio e a
coroa de coral-cérebro com o sulco, que sai um pouco da água (de longe se vê o desenho do labirinto).
Nos lados crescem cérebros, esponjas, corais-pilar, chifres-de-veado, leques, anêmonas e bolhas; no
chão há conchas, estrelas, pedrinhas e algas (algumas balançam).

- Corredores com 2,6 m entre os colisores, com a água de 3,5 m de fundo:
  dá para nadar na superfície ou mergulhar.
- Entrada no −z, com o arco de coral alto e a boia listrada; saída no +z, com o arco da estrela e a
  boia verde. Três bifurcações (logo depois da entrada, no meio do lado direito e perto da saída) e
  três becos.
- Dois arcos de coral baixos, na altura da água, que só se passa mergulhando por baixo (vão de
  2,3 m até a areia).
- O beco do tesouro, no canto de trás à esquerda: uma gruta com teto de coral (entra-se por baixo),
  um mexilhão gigante aberto com pérolas que brilham e moedas na areia.

Referencial: o centro do labirinto na linha d'água (y = 0 no mar), a areia em y = −3,5 (o
`FUNDO_DO_MAR` do jogo). Entrada para −z, saída para +z. A proposta de onde ele fica no Recife está
no README.

Saída: `recife-labirinto.glb` (nós `paredes`, `corais`, `chao`, `portais`, `gruta`,
`alga-1`…`alga-6`, os `col-*` e as âncoras `entrada`, `saida`, `tesouro`), com o clipe `balancar`.
"""
from lib_ilhas import *
import recife as rc

lib_q.PALETTE.update({
    'coralina': ('#b48bb8', 0.85, None, 0),
    'coralPessego': ('#f4a582', 0.8, None, 0),
    'coralAreia': ('#e9c27d', 0.85, None, 0),
    'coralMenta': ('#86d3b8', 0.8, None, 0),
    'coralinaClara': ('#d3a9cf', 0.85, None, 0),
    'moedaOuro': ('#ffd34f', 0.35, '#ffb800', 0.2),
    'boiaVerde': ('#5fd08a', 0.6, None, 0),
    'boiaBranca': ('#fffaf3', 0.6, None, 0),
    'boiaAmarela': ('#ffd36b', 0.6, None, 0),
})

FUNDO = -3.5
AREIA = FUNDO + 0.02
S = 3.6                 # lado da quadra
COLUNAS, LINHAS = 5, 4
TOPO_PAREDE = 0.7       # a parede sai um pouco da água
GROSSURA = 1.2          # do desenho
GROSSURA_COL = 0.8      # do colisor (dentro do desenho)
CORES = ['coral', 'coralRosa', 'coralLilas', 'coralLaranja', 'coralAmarelo', 'coralAzul']

# Passagens abertas entre quadras (coluna, linha). Quadra (c, l): x = (c − 2)·S, z = (l − 1,5)·S.
ABERTAS = {
    ((2, 0), (2, 1)), ((2, 1), (1, 1)), ((2, 1), (3, 1)), ((2, 1), (2, 2)), ((2, 2), (2, 3)), ((2, 3), (1, 3)),
    ((1, 3), (0, 3)), ((0, 3), (0, 2)), ((1, 1), (1, 0)), ((1, 0), (0, 0)), ((0, 0), (0, 1)), ((3, 1), (3, 0)),
    ((3, 0), (4, 0)), ((3, 1), (4, 1)), ((4, 1), (4, 2)), ((4, 2), (3, 2)), ((4, 2), (4, 3)), ((4, 3), (3, 3)),
}
ENTRADA = (2, 0)        # abre para −z
SAIDA = (3, 3)          # abre para +z
MACICA = (1, 2)         # a quadra sem passagem vira um bloco de coral
TESOURO = (0, 2)        # o beco com a gruta
ARCOS_BAIXOS = [((3, 1), (4, 1)), ((2, 2), (2, 3))]


def centro(c, l):
    return (c - 2) * S, (l - 1.5) * S


def aberta(a, b):
    return (a, b) in ABERTAS or (b, a) in ABERTAS


def paredes_da_grade():
    """Lista de paredes (x0, z0, x1, z1): as arestas da grade sem passagem."""
    out = []
    x0, z0 = -COLUNAS / 2 * S, -LINHAS / 2 * S
    for c in range(COLUNAS):
        for l in range(LINHAS + 1):
            # Aresta horizontal embaixo da quadra (c, l).
            de, para = (c, l - 1), (c, l)
            if l == 0 and (c, l) == ENTRADA or l == LINHAS and (c, l - 1) == SAIDA:
                continue
            if 0 < l < LINHAS and aberta(de, para):
                continue
            out.append((x0 + c * S, z0 + l * S, x0 + (c + 1) * S, z0 + l * S))
    for c in range(COLUNAS + 1):
        for l in range(LINHAS):
            de, para = (c - 1, l), (c, l)
            if 0 < c < COLUNAS and aberta(de, para):
                continue
            out.append((x0 + c * S, z0 + l * S, x0 + c * S, z0 + (l + 1) * S))
    return out


def ondular(o, amp=0.12, seed=0):
    """Amassa os vértices com ondas suaves (a parede fica orgânica, sem perder a forma)."""
    rnd = random.Random(seed)
    fases = [rnd.uniform(0, 6.28) for _ in range(3)]
    for v in o.data.vertices:
        c = v.co
        k = (math.sin(c.x * 1.7 + fases[0]) + math.sin(c.y * 2.1 + fases[1]) + math.sin(c.z * 1.3 + fases[2])) / 3
        n = Vector((c.x, c.y, c.z * 0.3))
        if n.length > 1e-4:
            v.co = c + n.normalized() * amp * k
    return o


def pintar_recife(o, cor, corte, cor2=None):
    """Coral em cima, uma faixa de outro coral no meio e a rocha só no pé (os cortes ondulam)."""
    bpy.context.view_layer.update()
    cor2 = cor2 or CORES[(CORES.index(cor) + 3) % len(CORES)]

    def regra(c, nn):
        onda = 0.25 * math.sin(c.x * 1.3 + c.y * 0.9)
        if c.z > corte + onda:
            return cor
        if c.z > corte - 1.2 + 0.3 * math.sin(c.x * 0.8 - c.y * 1.4):
            return cor2
        return 'rochaRecifeEscura' if c.z < FUNDO + 0.4 else None
    return pintar_por(o, regra)


# ------------------------------------------------------------------ corais miúdos (baratos)
def tubos(x, z, y, cor, s=1.0, seed=0):
    rnd = random.Random(seed)
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.3, 0.3)
        d = 0.0 if k == 0 else 0.22 * s
        h = rnd.uniform(0.45, 0.9) * s
        cx, cy = x + math.cos(a) * d, -z + math.sin(a) * d
        p.append(cyl(0.11 * s, h, (cx, cy, y + h / 2 - 0.08), cor, verts=5, r2=0.13 * s))
        p.append(cyl(0.085 * s, 0.02, (cx, cy, y + h - 0.08 + 0.005), 'rochaRecifeEscura', verts=5))
    return p


def leque(x, z, y, cor, s=1.0, rot=0.0):
    pts = [(0, 0)] + [(math.cos(math.pi * k / 8) * (0.7 + 0.08 * math.sin(k * 2.3)) * s,
                       math.sin(math.pi * k / 8) * (0.7 + 0.08 * math.sin(k * 2.3)) * s * 1.2) for k in range(9)]
    return [prism(pts, 0.05 * s, (x, -z, y + 0.1 * s), cor, rot=(0, 0, rot)),
            cyl(0.05 * s, 0.2 * s, (x, -z, y + 0.05 * s), cor, verts=5)]


def cerebro(x, z, y, cor, s=1.0):
    risca = 'coralLilas' if cor != 'coralLilas' else 'coralRosa'
    return [superellipsoid((1.0 * s, 0.9 * s, 0.6 * s), (x, -z, y + 0.12 * s), cor, e1=0.8, e2=0.9, seg=9, ring=5,
                           flat_bottom=0.2),
            torus(0.26 * s, 0.035 * s, (x, -z, y + 0.4 * s), risca, seg=10, rseg=3)]


def anemona(x, y_bl, z, cor, nrm, s=1.0):
    """Anêmona grudada na parede: um toquinho e tentáculos curtos."""
    base = Vector((x, y_bl, z))
    p = [cyl(0.12 * s, 0.2 * s, tuple(base + nrm * 0.08), 'concha', verts=6)]
    p[-1].rotation_euler = nrm.to_track_quat('Z', 'Y').to_euler()
    for k in range(5):
        a = 2 * math.pi * k / 5
        lado = nrm.cross(Vector((0, 0, 1)))
        if lado.length < 1e-3:
            lado = Vector((1, 0, 0))
        lado.normalize()
        cima = lado.cross(nrm)
        d = (lado * math.cos(a) + cima * math.sin(a)) * 0.12 * s
        ini = base + nrm * 0.17 * s + d * 0.5
        p.append(tube([ini, ini + nrm * 0.16 * s + d], [0.035 * s, 0.015 * s], cor, seg=4))
    return p


# ------------------------------------------------------------------ paredes de coral
# Cada parede é uma fileira de montes de coral encostados (um em cada canto da grade e um no meio de
# cada trecho), cada um com caroços, de uma cor de recife. Nos lados que dão para corredor e em
# cima crescem as peças: pratos de coral saindo da parede, esponjas-barril, tubos, bolhas, galhos,
# leques e anêmonas. A colisão é uma caixa por trecho e um cilindro por canto, por dentro dos montes.
CORES_MONTE = ['coralina', 'coralPessego', 'coralAreia', 'coralMenta', 'coralRosa', 'coralAzul']
MEIA_GROSSURA_COL = 0.5


def monte(x, y, L, W, z0, z1, giro, cor, seed, seg=11, ring=6):
    """Corpo de coral maciço, redondo e liso (como um travesseiro), com caroços suaves."""
    H = z1 - z0
    o = superellipsoid((L, W, H), (0, 0, 0), cor, e1=0.8, e2=0.85, seg=seg, ring=ring)
    rnd = random.Random(seed)
    carocos = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.4, 1))).normalized(), rnd.uniform(0.12, 0.25))
               for _ in range(6)]
    for v in o.data.vertices:
        d = Vector((v.co.x / (L / 2), v.co.y / (W / 2), v.co.z / (H / 2)))
        if d.length < 1e-4:
            continue
        dn = d.normalized()
        k = sum(a * max(0.0, dn.dot(c)) ** 3 for c, a in carocos)
        nrm = Vector((v.co.x / (L / 2) ** 2, v.co.y / (W / 2) ** 2, v.co.z / (H / 2) ** 2)).normalized()
        v.co = v.co + nrm * k
    o.rotation_euler = (0, 0, giro)
    o.location = (x, y, (z0 + z1) / 2)
    lib_q.smooth(o)
    return o


# Peças que crescem no lado de um monte: `c` é o ponto na face (Blender), `n` a normal deitada.
def p_barris(c, n, s, cor, seed):
    rnd = random.Random(seed)
    lado = Vector((-n.y, n.x, 0))
    p = []
    for k, t in enumerate((-0.3, 0.3)):
        h = rnd.uniform(0.75, 1.05) * s
        d = (n * rnd.uniform(0.35, 0.6) + Vector((0, 0, 1))).normalized()
        base = c + lado * t * s - n * 0.05
        rot = d.to_track_quat('Z', 'Y').to_euler()
        p.append(cyl(0.22 * s, h, tuple(base + d * (h / 2)), cor if k == 0 else CORES[(CORES.index(cor) + 2) % len(CORES)],
                     verts=8, r2=0.3 * s, rot=rot))
        p.append(cyl(0.31 * s, 0.03, tuple(base + d * (h + 0.016)), 'rochaRecifeEscura', verts=8, rot=rot))
    return p


def p_bolhas(c, n, s, cor, seed):
    rnd = random.Random(seed)
    lado = Vector((-n.y, n.x, 0))
    return [uvball(rnd.uniform(0.17, 0.25) * s, tuple(c + n * (0.12 * s) + lado * rnd.uniform(-0.35, 0.35) * s +
                                                    Vector((0, 0, rnd.uniform(-0.3, 0.3) * s))), cor, seg=6, ring=4)
            for _ in range(3)]


def p_galho(c, n, s, cor, seed):
    rnd = random.Random(seed)
    lado = Vector((-n.y, n.x, 0))
    p = []
    for k in range(3):
        a = -0.7 + 0.7 * k + rnd.uniform(-0.2, 0.2)
        ponta = c + n * (0.5 * s) + lado * (math.sin(a) * 0.45 * s) + Vector((0, 0, rnd.uniform(0.5, 0.85) * s))
        meio = c + n * (0.25 * s) + lado * (math.sin(a) * 0.15 * s) + Vector((0, 0, 0.25 * s))
        p.append(tube([c - n * 0.1, meio, ponta], [0.11 * s, 0.09 * s, 0.065 * s], cor, seg=4, cap=False))
        p.append(uvball(0.09 * s, tuple(ponta), cor, seg=4, ring=3))
    return p


def p_leque(c, n, s, cor, seed):
    pts = [(0, 0)] + [(math.cos(math.pi * k / 8) * (0.62 + 0.07 * math.sin(k * 2.3 + seed)) * s,
                       math.sin(math.pi * k / 8) * (0.62 + 0.07 * math.sin(k * 2.3 + seed)) * s * 1.15) for k in range(9)]
    return [prism(pts, 0.05 * s, tuple(c + n * 0.15), cor, rot=(R(-18), 0, math.atan2(n.y, n.x) + math.pi / 2))]


def p_anemona(c, n, s, cor, seed):
    return anemona(c.x, c.y, c.z, cor, n, s * 1.15)


def cerebro_leve(x, y, z, cor, s):
    """Coral-cérebro com dois anéis (o do recife.py, mais leve)."""
    risca = 'coralLilas' if cor != 'coralLilas' else 'coralRosa'
    p = [superellipsoid((1.2 * s, 1.1 * s, 0.75 * s), (x, y, z + 0.2 * s), cor, e1=0.8, e2=0.9, seg=9, ring=5,
                        flat_bottom=0.25)]
    p.append(torus(0.32 * s, 0.045 * s, (x, y, z + 0.53 * s), risca, seg=9, rseg=3))
    return p


def p_cerebro(c, n, s, cor, seed):
    """Cabeça de coral-cérebro grudada na parede."""
    q = c + n * (0.3 * s)
    return cerebro_leve(q.x, q.y, q.z - 0.25 * s, cor, 0.55 * s)


def p_colunas(c, n, s, cor, seed):
    """Coral-pilar no pé da parede: tubos grossos em pé, saindo da areia, com a ponta clara."""
    rnd = random.Random(seed)
    lado = Vector((-n.y, n.x, 0))
    p = []
    for k in range(3):
        h = rnd.uniform(0.9, 1.6) * s
        q = c + n * (0.15 * s) + lado * ((k - 1) * 0.3 * s)
        r = 0.13 * s
        fundo_ = AREIA - 0.05 - 0.03 * k - 0.01 * (seed % 5)
        p.append(cyl(r, AREIA + h - 0.05 - fundo_, (q.x, q.y, (AREIA + h - 0.05 + fundo_) / 2), cor, verts=6, r2=r * 0.85))
        p.append(uvball(r * 0.86, (q.x, q.y, AREIA + h - 0.05), 'coralinaClara', seg=6, ring=3, scale=(1, 1, 0.7)))
    return p


LADO_BAIXO = [p_cerebro, p_barris, p_colunas, p_cerebro, p_colunas]
LADO_ALTO = [p_leque, p_galho, p_anemona, p_bolhas, p_galho, p_leque]


def topo(x, y, z, k, deco):
    """Enfeite em cima do monte (fora d'água: de longe se vê o recife colorido)."""
    cor = CORES[(k * 7 + 2) % len(CORES)]
    tipo = k % 5
    if tipo == 0:
        deco += tubos(x, -y, z - 0.15, cor, 1.5, seed=k)
    elif tipo == 1:
        deco += rc.coral_galho(x, -y, cor, 1.0, seed=k, y=z - 0.2)
    elif tipo == 2:
        deco += leque(x, -y, z - 0.2, cor, 1.45, rot=k)
    elif tipo == 3:
        deco += cerebro_leve(x, y, z - 0.3, cor, 1.0)
    else:
        deco += p_barris(Vector((x, y, z - 0.3)), Vector((1, 0, 0)), 1.3, cor, k)


def decorar_lados(cx, cy, u, comp, k, deco):
    """Uma peça em cada lado do monte que dá para um corredor."""
    rnd = random.Random(700 + k)
    nrm = Vector((-u.y, u.x, 0))
    for i, lado in enumerate((1, -1)):
        n = nrm * lado
        teste = Vector((cx, cy, 0)) + n * 1.3
        if abs(teste.x) > COLUNAS / 2 * S - 0.3 or abs(teste.y) > LINHAS / 2 * S - 0.3:
            continue
        sinal = 1 if rnd.random() < 0.5 else -1
        # Parede da borda (o outro lado é o mar aberto): uma peça só, alternando embaixo e em cima.
        atras = Vector((cx, cy, 0)) - n * 1.3
        borda_ = abs(atras.x) > COLUNAS / 2 * S - 0.3 or abs(atras.y) > LINHAS / 2 * S - 0.3
        for j, baixo in enumerate(((k % 2 == 0,) if borda_ else ((k + i) % 2 == 0,))):
            t = rnd.uniform(0.1, 0.4) * comp * (sinal if baixo else -sinal)
            z = rnd.uniform(-2.7, -2.2) if baixo else rnd.uniform(-1.3, -0.6)
            c = Vector((cx, cy, z)) + u * t + n * 0.72
            lista = LADO_BAIXO if baixo else LADO_ALTO
            f = lista[rnd.randrange(len(lista))]
            deco += f(c, n, rnd.uniform(1.35, 1.6), CORES[rnd.randrange(len(CORES))], k * 10 + i * 2 + j)


def cabeca(c, raios, cor, seed, sulco=False, seg=8, ring=5):
    """Uma cabeça de coral redonda e lisa (uma das que formam a parede); com `sulco`, os dois sulcos
    sinuosos do coral-cérebro por cima."""
    o = uvball(1.0, tuple(c), cor, seg=seg, ring=ring, scale=raios)
    o.rotation_euler = (0, 0, seed * 1.3)
    p = [o]
    if sulco:
        risca = CORES[(CORES.index(cor) + 2) % len(CORES)] if cor in CORES else 'coralLilas'
        rnd = random.Random(seed)
        for fileira in (0.0,):
            pts = []
            for i in range(7):
                u = -0.78 + 1.56 * i / 6
                v = fileira + 0.35 * math.sin(i * 1.9 + rnd.uniform(0, 1))
                lz = raios[2] * math.sqrt(max(0.05, 1 - u * u - v * v)) * 1.03
                pts.append((c.x + u * raios[0], c.y + v * raios[1], c.z + lz))
            p.append(tube(pts, [0.045] * len(pts), risca, seg=4, cap=False))
    return p


def parede(x0, z0, x1, z1, k, col, deco):
    """Um trecho de parede: o miolo escuro e, na frente dele, cabeças de coral de cores diferentes
    (duas embaixo, uma no meio e a coroa de coral-cérebro, que sai da água)."""
    cx, cy = (x0 + x1) / 2, -(z0 + z1) / 2
    L = math.hypot(x1 - x0, z1 - z0)
    giro = math.atan2(-(z1 - z0), x1 - x0)
    rnd = random.Random(300 + k)
    u = Vector((math.cos(giro), math.sin(giro), 0))
    altura = TOPO_PAREDE - FUNDO + 0.2
    miolo = superellipsoid((L - 0.3, 1.0, altura), (cx, cy, FUNDO - 0.2 + altura / 2), 'rochaRecifeEscura', e1=0.5, e2=0.6,
                           seg=6, ring=4, rot=(0, 0, giro))
    pecas = [miolo]
    base = k * 3
    for j, (t, z, rx, rz) in enumerate(((-0.27, -2.75, 0.98, 0.95), (0.27, -2.6, 0.95, 1.0), (0.04, -1.35, 1.25, 0.85))):
        cor = CORES_MONTE[(base + j * 2) % len(CORES_MONTE)] if j < 2 else CORES[(base + 1) % len(CORES)]
        c = Vector((cx, cy, z + rnd.uniform(-0.1, 0.1))) + u * (t * L + rnd.uniform(-0.1, 0.1))
        h = cabeca(c, (rx * (L / 3.6), 0.82, rz), cor, base + j, sulco=(j == 2 and k % 2 == 0))
        h[0].rotation_euler = (0, 0, giro)
        pecas.append(h[0])
        deco += h[1:]
    alto = TOPO_PAREDE + rnd.uniform(0.0, 0.3)
    cor2 = CORES[(k * 5 + 4) % len(CORES)]
    meio = -0.55
    coroa = cabeca(Vector((cx, cy, (meio + alto) / 2)) + u * rnd.uniform(-0.3, 0.3), ((L - 1.0) / 2, 0.7, (alto - meio) / 2 + 0.1),
                   cor2, base + 7, sulco=True, seg=9)
    coroa[0].rotation_euler = (0, 0, giro)
    pecas.append(coroa[0])
    deco += coroa[1:]
    col.append(col_caixa('parede', (L - 0.2, 2 * MEIA_GROSSURA_COL, altura - 0.45), (cx, cy, FUNDO - 0.2 + altura / 2 - 0.1),
                         (0, 0, giro)))
    decorar_lados(cx, cy, u, L - 0.6, k, deco)
    return pecas


def canto(x, z, k, col, deco):
    rnd = random.Random(400 + k)
    alto = TOPO_PAREDE + rnd.uniform(0.15, 0.5)
    h = (alto - FUNDO + 0.3) / 2
    o = cabeca(Vector((x, -z, FUNDO - 0.3 + h)), (0.88, 0.85, h), CORES_MONTE[(k * 5 + 3) % len(CORES_MONTE)], 50 + k, seg=9,
               ring=6)
    altura = TOPO_PAREDE - FUNDO + 0.2
    col.append(col_cilindro('pilar', 0.62, altura - 0.4, (x, -z, FUNDO - 0.2 + (altura - 0.4) / 2)))
    if k % 3 == 0:
        topo(x, -z, alto, k + 1, deco)
    return o


def bloco_macico(c, l, col, deco):
    x, z = centro(c, l)
    p = []
    for i, (dx, dz) in enumerate(((-0.85, -0.85), (0.85, -0.85), (-0.85, 0.85), (0.85, 0.85))):
        p.append(monte(x + dx, -(z + dz), 2.3, 2.2, FUNDO - 0.3, TOPO_PAREDE + 0.2 + 0.25 * (i % 2), i, CORES_MONTE[(i + 2) % 6],
                       900 + i))
    altura = TOPO_PAREDE - FUNDO + 0.2
    col.append(col_caixa('bloco', (S - 0.3, S - 0.3, altura - 0.4), (x, -z, FUNDO - 0.2 + altura / 2 - 0.1)))
    topo(x, -z, TOPO_PAREDE + 0.4, 3, deco)
    for i, (dx, dy) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
        n = Vector((dx, dy, 0))
        cc = Vector((x, -z, -1.0 if i % 2 else -2.4)) + n * (S / 2 - 0.1)
        f = (p_galho, p_cerebro, p_leque, p_barris)[i]
        deco += f(cc, n, 1.2, CORES[(i + 1) % len(CORES)], 300 + i)
    return p


def arco_baixo(a, b, k, col):
    """Ponte de coral na altura da água, por cima de uma passagem: só se passa mergulhando."""
    (ca, la), (cb, lb) = a, b
    xa, za = centro(ca, la)
    xb, zb = centro(cb, lb)
    mx, mz = (xa + xb) / 2, (za + zb) / 2
    if ca != cb:   # passagem numa aresta vertical: a ponte vai ao longo de z
        giro = math.pi / 2
    else:
        giro = 0.0
    alto, baixo = TOPO_PAREDE + 0.1, -1.15
    o = superellipsoid((S + 0.6, 1.1, alto - baixo), (mx, -mz, (alto + baixo) / 2), 'rochaRecife', e1=0.5, e2=0.7,
                       seg=12, ring=6)
    o.rotation_euler = (0, 0, giro)
    ondular(o, 0.07, seed=200 + k)
    pintar_recife(o, CORES[(k + 3) % len(CORES)], -0.7)
    col.append(col_caixa('arco', (S - 0.4, GROSSURA_COL, alto - baixo - 0.35), (mx, -mz, (alto + baixo) / 2 + 0.05),
                         (0, 0, giro)))
    p = [o]
    # Algas penduradas na beira de baixo da ponte.
    for t in (-0.8, 0.2, 1.0):
        dx, dy = (math.cos(giro) * t, math.sin(giro) * t)
        q = Vector((mx + dx, -mz + dy, baixo + 0.1))
        p.append(tube([q, q + Vector((0.05, 0.0, -0.35)), q + Vector((0.12, 0.05, -0.6))], [0.07, 0.05, 0.02], 'algaClara',
                      seg=4))
    return p


# ------------------------------------------------------------------ portais, chão, tesouro
def boia(x, z, cor_a, cor_b, bandeira):
    """Boia de sinal que flutua na linha d'água, com a poita (corrente) até o fundo."""
    bx, by = x, -z
    p = [uvball(0.55, (bx, by, 0.05), cor_a, seg=10, ring=6, scale=(1, 1, 0.8))]
    p.append(torus(0.5, 0.09, (bx, by, 0.12), cor_b, seg=14, rseg=4))
    p.append(cyl(0.05, 1.2, (bx, by, 0.9), 'metalEscuro', verts=6))
    p.append(prism([(0, 0), (0.55, -0.15), (0, -0.32)], 0.02, (bx + 0.02, by, 1.45), bandeira))
    p.append(tube([(bx, by, -0.35), (bx + 0.3, by + 0.2, -1.8), (bx + 0.1, by, FUNDO + 0.25)], [0.03] * 3, 'metalEscuro',
                  seg=4))
    p.append(cyl(0.3, 0.25, (bx + 0.1, by, FUNDO + 0.12), 'rochaRecifeEscura', verts=8))
    return p


def portal(x, z, cor, estrela):
    """Arco alto na boca do corredor (por cima da água, não atrapalha quem nada)."""
    p = [torus(S / 2, 0.24, (x, -z, TOPO_PAREDE + 0.2), cor, seg=14, rseg=6, rot=(R(90), 0, 0), arc=180)]
    for k in range(5):
        a = math.pi * (0.1 + 0.2 * k)
        p.append(uvball(0.16, (x + math.cos(a) * S / 2, -z - 0.05, TOPO_PAREDE + 0.2 + math.sin(a) * S / 2),
                        'perolaLuz' if k == 2 else 'concha', seg=6, ring=4))
    if estrela:
        p.append(prism(star_pts(0.6, 0.26, 5, 90), 0.16, (x, -z, TOPO_PAREDE + 0.2 + S / 2 + 0.55), 'coralLaranja',
                       rot=(0, 0, 0), bevel=0.04))
    else:
        p.append(uvball(0.32, (x, -z, TOPO_PAREDE + 0.2 + S / 2 + 0.25), 'coralRosa', seg=10, ring=6))
        for k in range(6):
            a = 2 * math.pi * k / 6
            p.append(tube([(x, -z, TOPO_PAREDE + S / 2 + 0.45), (x + math.cos(a) * 0.55, -z, TOPO_PAREDE + S / 2 + 0.45 +
                                                                 math.sin(a) * 0.55)], [0.07, 0.03], 'coralRosa', seg=4))
    return p


def chao(deco):
    p = [slab(blob(0, 0, 11.8, 9.8, seed=31, n=24, wob=0.06), FUNDO - 0.12, AREIA, 'areiaMolhada', bevel=0.06, segs=1,
              name='areia', fundo=False)]
    rnd = random.Random(41)
    # Conchas, estrelas, pedrinhas lisas e tufos de alga nos corredores (miúdo do chão: não colide).
    lugares = [centro(c, l) for c in range(COLUNAS) for l in range(LINHAS) if (c, l) != MACICA]
    for i, (x, z) in enumerate(lugares):
        for j in range(3):
            dx, dz = rnd.uniform(-0.75, 0.75), rnd.uniform(-0.75, 0.75)
            bx, by = x + dx, -(z + dz)
            tipo = (i + j) % 4
            if tipo == 0:
                p.append(prism(star_pts(0.24, 0.1, 5, i * 13 + j), 0.05, (bx, by, AREIA + 0.03),
                               ('coral', 'coralLaranja', 'coralAmarelo')[(i + j) % 3], rot=(R(90), 0, rnd.uniform(0, 1))))
            elif tipo == 1:
                p.append(uvball(0.17, (bx, by, AREIA + 0.02), 'concha' if j % 2 else 'coralRosa', seg=7, ring=4,
                                scale=(1, 0.8, 0.45)))
                p.append(torus(0.1, 0.025, (bx, by - 0.02, AREIA + 0.08), 'coralPessego', seg=7, rseg=3, rot=(R(80), 0, 0)))
            elif tipo == 2:
                for m in range(2):
                    p.append(uvball(0.1 + 0.05 * m, (bx + 0.18 * m, by - 0.1 * m, AREIA + 0.01), 'rochaRecife' if m else
                                    'rochaRecifeEscura', seg=6, ring=4, scale=(1, 0.85, 0.5)))
            elif j == 0:
                # Tufo de alga parado (as que balançam são nós à parte).
                for m in range(3):
                    a = 2 * math.pi * m / 3 + rnd.uniform(-0.4, 0.4)
                    pe = (bx + math.cos(a) * 0.07, by + math.sin(a) * 0.07, AREIA - 0.05)
                    p.append(lib_ilha.lock(pe, (math.cos(a) * 0.2, math.sin(a) * 0.2, 1.0), 0.8 + 0.3 * m, 0.07,
                                           ('alga', 'algaClara', 'algaFunda')[m],
                                           bend=(math.cos(a + 1.2) * 0.2, math.sin(a + 1.2) * 0.2, 0), n=4, seg=4))
    return p


def gruta_do_tesouro(col):
    """Teto de coral por cima do beco do tesouro e o mexilhão aberto com as pérolas."""
    x, z = centro(*TESOURO)
    teto = slab(blob(x, -z, S / 2 + 0.55, S / 2 + 0.5, seed=8, n=18, wob=0.08), -0.75, TOPO_PAREDE + 0.15,
                'rochaRecife', bevel=0.25, segs=1, name='teto')
    pintar_por(teto, lambda c, nn: 'coralLilas' if nn.z > 0.3 else None)
    col.append(col_caixa('teto', (S - 0.3, S - 0.3, TOPO_PAREDE + 0.75 - 0.3), (x, -z, (TOPO_PAREDE - 0.75) / 2 + 0.1)))
    p = [teto]
    p += cerebro(x + 0.6, z - 0.3, TOPO_PAREDE + 0.1, 'coralRosa', 1.0)
    p += tubos(x - 0.8, z + 0.5, TOPO_PAREDE + 0.1, 'coralAmarelo', 0.9, seed=5)
    # Mexilhão gigante no fundo do beco (a boca para a entrada do beco, +z).
    mx, mz = x, z - 0.55
    q = (mx, -mz, AREIA)
    p.append(uvball(0.8, (q[0], q[1], AREIA + 0.15), 'coralLilas', seg=14, ring=6, scale=(1, 1, 0.32)))
    tampa = uvball(0.78, (q[0], q[1] + 0.35, AREIA + 0.8), 'coralLilas', seg=14, ring=6, scale=(1, 1, 0.3))
    tampa.rotation_euler = (R(-40), 0, 0)
    p.append(tampa)
    for k in range(3):
        p.append(uvball(0.16 - 0.03 * k, (q[0] - 0.2 + k * 0.22, q[1] - 0.05 * k, AREIA + 0.38), 'perolaLuz', seg=10, ring=6))
    col.append(col_cilindro('mexilhao', 0.7, 0.6, (q[0], q[1] + 0.1, AREIA + 0.3)))
    rnd = random.Random(2)
    for k in range(12):
        a = rnd.uniform(R(200), R(340))
        d = rnd.uniform(0.9, 1.5)
        p.append(cyl(0.06, 0.015, (q[0] + math.cos(a) * d, q[1] + math.sin(a) * d, AREIA + 0.012 + 0.006 * (k % 3)),
                     'moedaOuro', verts=8, rot=(rnd.uniform(0, 0.5), 0, a)))
    return p, (mx, mz + 1.0)


ALGAS = [(-7.2, -5.4), (-3.6, 0.6), (0.8, -2.6), (4.6, -6.0), (8.0, -1.2), (-4.6, 6.4)]


def alga(x, z, y, seed=0, s=1.0):
    """Tufo de três fitas (o pé de cada uma afastado: sem faces no mesmo plano)."""
    rnd = random.Random(seed)
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(-0.4, 0.4)
        d = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 1.0))
        pe = (x + math.cos(a) * 0.08, -z + math.sin(a) * 0.08, y - 0.05)
        p.append(lib_ilha.lock(pe, d, (1.1 + 0.35 * k) * s, 0.09 * s, ('alga', 'algaClara', 'algaFunda')[k],
                               bend=(math.cos(a + 1.3) * 0.3, math.sin(a + 1.3) * 0.3, 0), n=5, seg=5))
    return p, (x, -z, y)


# ------------------------------------------------------------------ montagem
def construir():
    lib_q.reset()
    col, deco = [], []
    pare = []
    segmentos = paredes_da_grade()
    for k, (x0, z0, x1, z1) in enumerate(segmentos):
        pare += parede(x0, z0, x1, z1, k, col, deco)
    # Um monte (e um cilindro de colisão) em cada canto que tem parede encostada.
    cantos = set()
    for x0, z0, x1, z1 in segmentos:
        cantos.add((round(x0, 2), round(z0, 2)))
        cantos.add((round(x1, 2), round(z1, 2)))
    for k, (x, z) in enumerate(sorted(cantos)):
        pare += canto(x, z, k, col, deco)
    pare += bloco_macico(*MACICA, col, deco)
    for k, (a, b) in enumerate(ARCOS_BAIXOS):
        pare += arco_baixo(a, b, k, col)
    ex, ez = centro(*ENTRADA)
    sx, sz = centro(*SAIDA)
    portas = portal(ex, ez - S / 2, 'coralAzul', False) + portal(sx, sz + S / 2, 'coralAmarelo', True)
    portas += boia(ex + 2.6, ez - S / 2 - 1.8, 'boia', 'boiaBranca', 'boiaBranca')
    portas += boia(sx - 2.6, sz + S / 2 + 1.8, 'boiaVerde', 'boiaAmarela', 'boiaAmarela')
    fundo = chao(deco)
    tes, lugar_tesouro = gruta_do_tesouro(col)
    algas = {}
    for i, (x, z) in enumerate(ALGAS):
        objs, pivo = alga(x, z, AREIA, seed=60 + i, s=1.25)
        algas[f'alga-{i + 1}'] = (objs, pivo)
    anc = [ancora('entrada', ex, ez - S / 2 - 1.2, 0.0), ancora('saida', sx, sz + S / 2 + 1.2, 0.0),
           ancora('tesouro', lugar_tesouro[0], lugar_tesouro[1], AREIA)]
    exportar('recife-labirinto', {'paredes': pare, 'corais': deco, 'chao': fundo, 'portais': portas, 'gruta': tes,
                                  **algas}, anc, clipes_=rc.clipe_algas, colisores=col)


if __name__ == '__main__':
    construir()
