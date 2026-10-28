"""Os quatro cenários da ilha: praia tropical, costa rochosa, ilha nevada e noite na ilha.

Cada cenário é UM modelo (`cenario-<nome>`): céu, mar, ilha, ponte, árvores e moitas. Na
personalização a criança troca o modelo em um bloco só. Os quatro têm EXATAMENTE a mesma caixa (o
mar de 140 x 140 e a cúpula do céu): o Jogo 3D encaixa e centraliza o modelo pela caixa, então
trocar o cenário não mexe na ilha. As pedras que escondem a chave são um modelo à parte
(`pedras`): o curso as cria como o objeto `pedra`.

Acabamento de jogo 3D (decisão de 27/10/2026: não precisa copiar o 2D): o chão é UM terreno
contínuo pintado nos vértices (areia, trilha, praia seca e molhada) que desce e continua por baixo
da água; o mar é translúcido, então o raso clareia sozinho sobre a areia; uma linha de espuma
marca a beira; a grama é um tapete com a borda nítida e inclinada, manchas de tom e tufos. As
cores vêm da paleta de cada cenário (tirada de `<cenario>.svg`), e muda o que cresce na grama:
coqueiros (praia), pedregulhos (costa), pinheiros com neve (nevada) e vaga-lumes sob a lua (noite).

As medidas e as posições são as dos projetos do Molda que estas peças substituem (mapa de
reintegração): a área em que o personagem anda (x de -11 a 0,6 e z de -5 a 5, a ponte e a ilhota)
fica no platô, no nível 0. O mar, o terreno, a ponte e as moitas ficam na origem; os coqueiros e as
pedras têm o referencial próprio, com a base no chão.

O coqueiro e as pedras seguem a FORMA das referências que a autora fez no Molda (`referencias/`);
o acabamento é daqui. As pedras escondem a chave em (-2, 1, -3), vista da câmera do jogo
(0, 12, 21): o `verificar_pedra.py` confere isso a cada mudança.
"""
from lib_ilha import *
import mathutils

# Cores tiradas dos SVGs de cada cenário. `ceu` = (horizonte, alto).
TEMAS = {
    'praia-tropical': dict(mar='#6e9bff', onda='#8fb3ff', aguaRasa='#94d5f5', espuma='#ffffff',
                           areiaClara='#fae1ab', areia='#dfc283', areiaEscura='#c9aa6c',
                           grama='#0b7a54', folha='#29905a', folhaEscura='#21734f', madeira='#835d3f',
                           madeiraClara='#95633d', madeiraEscura='#61432f', corda='#d8b57a',
                           ceu=('#bfe6fb', '#6fb8ef'), pedra='azul', arvore='coqueiro'),
    'costa-rochosa': dict(mar='#3a7b9c', onda='#5b98b5', aguaRasa='#8fc8d6', espuma='#ffffff',
                          areiaClara='#d4cdb9', areia='#b4aa91', areiaEscura='#9b917a',
                          grama='#516c6b', folha='#5f7d78', folhaEscura='#46605d', madeira='#9b7659',
                          madeiraClara='#a8835f', madeiraEscura='#7a5132', corda='#d4cdb9',
                          ceu=('#dfe8ee', '#97b3c8'), pedra='cinza', arvore='rochas'),
    'ilha-nevada': dict(mar='#557eb0', onda='#7096c2', aguaRasa='#90b7d7', espuma='#f7fbff',
                        areiaClara='#eef5f6', areia='#a8b9c8', areiaEscura='#93a5b6',
                        grama='#a8c7d0', folha='#7fa3a8', folhaEscura='#5f8a8c', madeira='#835d3f',
                        madeiraClara='#9b7659', madeiraEscura='#7a5132', corda='#eef5f6',
                        ceu=('#f2f8fc', '#a9cbe6'), pedra='neve', arvore='pinheiro'),
    'noite-na-ilha': dict(mar='#203857', onda='#355775', aguaRasa='#355775', espuma='#668ba6',
                          areiaClara='#8f8790', areia='#6f6878', areiaEscura='#5a5262',
                          grama='#183c48', folha='#3c685e', folhaEscura='#2e544c', madeira='#8c7282',
                          madeiraClara='#9a8190', madeiraEscura='#533e4b', corda='#b2a8aa',
                          ceu=('#2c4470', '#0b1630'), pedra='noite', arvore='vagalumes'),
}
PEDRAS = {  # (base, clara, topo) dos blocos grandes e das colunas de trás
    'azul': (('#566c86', '#647b96', '#7c93ae'), ('#333c57', '#3d4766', '#4f5b7d')),
    'cinza': (('#647887', '#73889a', '#a5bbca'), ('#46536e', '#51607d', '#6c7c96')),
    'neve': (('#647887', '#73889a', '#f7fbff'), ('#46536e', '#51607d', '#eef5f6')),
    'noite': (('#3e4f66', '#4a5c76', '#5d7190'), ('#262d45', '#2f3752', '#3d4766')),
}
TEMA = 'praia-tropical'   # o cenário que está sendo montado (as peças leem a cor por papel)


def cor(papel):
    """Material do papel (grama, areia…) no cenário atual: '<cenário>/<papel>'."""
    hexa = TEMAS[TEMA][papel]
    chave = f'{TEMA}/{papel}'
    lib_q.PALETTE.setdefault(chave, (hexa, 0.9 if papel not in ('mar', 'aguaRasa', 'onda') else 0.35, None, 0))
    return chave


def cor_hex(hexa, rug=0.85, emissao=None, forca=0.0):
    chave = f'hex/{hexa}/{emissao}'
    lib_q.PALETTE.setdefault(chave, (hexa, rug, emissao, forca))
    return chave


def _ilha(x, z, rx, rz, seed, wob=0.035, n=64):
    """Contorno de ilha no chão do Blender a partir do centro e dos raios no jogo."""
    cx, cy = g(x, z)
    return blob(cx, cy, rx, rz, seed=seed, n=n, wob=wob, waves=(2, 3, 5, 7))


def _ruido(seed, escala):
    """Ruído suave e determinístico (value noise em grade) em [0, 1], para variar o tom do chão."""
    rnd = random.Random(seed)
    tab = {}

    def v(i, j):
        if (i, j) not in tab:
            tab[(i, j)] = rnd.random()
        return tab[(i, j)]

    def f(x, z):
        x, z = x / escala, z / escala
        i, j = math.floor(x), math.floor(z)
        fx, fz = x - i, z - j
        sx, sz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
        a = v(i, j) + (v(i + 1, j) - v(i, j)) * sx
        b = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * sx
        return a + (b - a) * sz
    return f


def _distancia(x0, z0, rx, rz, seed, wob, waves=(2, 3, 5, 7)):
    """Distância normalizada ao contorno de `_ilha` (1 = na borda), para o chão contínuo."""
    rnd = random.Random(seed)
    termos = [(k, rnd.uniform(0, 2 * math.pi), wob * rnd.uniform(0.5, 1.0) / (i + 1) ** 0.5)
              for i, k in enumerate(waves)]
    cx, cy = g(x0, z0)

    def d(x, z):
        bx, by = g(x, z)
        u, v = (bx - cx) / rx, (by - cy) / rz
        t = math.atan2(v, u)
        return math.hypot(u, v) / (1 + sum(a * math.sin(k * t + ph) for k, ph, a in termos))
    return d


def _suave(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _mistura(c0, c1, t):
    return tuple(a + (b - a) * t for a, b in zip(c0, c1))


AGUA = -0.3        # a superfície do mar
FUNDO = -0.48      # o fundo do mar perto da ilha (o leito vai até -0,5, a caixa de sempre)
# As duas ilhas: (centro, raios da areia, semente, platô, praia até a água, declive submerso).
# Dentro do platô o chão fica no nível 0, onde o personagem anda (x de -11 a 0,6 e z de -5 a 5, a
# ponte e a ilhota); a praia desce até a água e continua por baixo dela, como numa ilha de verdade.
ILHAS = (((-5.6, 0), (7.1, 7.75), 11, 0.035, 1.0, 0.11, 0.2),
         ((5.25, 0.4), (1.9, 1.5), 12, 0.035, 1.12, 0.22, 0.35))


def _perfil(d, plato, praia, declive):
    """Altura do chão pela distância normalizada: platô no 0, praia até a água, declive submerso."""
    if d <= plato:
        return 0.0
    if d <= plato + praia:
        return (AGUA - 0.04) * _suave(plato, plato + praia, d)
    return AGUA - 0.04 + (FUNDO - AGUA + 0.04) * min(1.0, (d - plato - praia) / declive)


def _beira_da_agua(plato, praia, declive):
    """Distância normalizada em que o chão cruza a superfície do mar (onde fica a espuma)."""
    a, b = plato, plato + praia
    for _ in range(40):
        m = (a + b) / 2
        a, b = (m, b) if _perfil(m, plato, praia, declive) > AGUA else (a, m)
    return (a + b) / 2


def _cor_vertice(papel):
    return lib_q.srgb(TEMAS[TEMA][papel])


def _leito():
    """Cor do fundo do mar (linear): o azul do mar, mais escuro."""
    return tuple(v * 0.7 for v in _cor_vertice('mar'))


def _mat_terreno():
    """Material do chão: a cor vem dos vértices (grama, areia, praia molhada e o fundo raso)."""
    nome = 'terreno-vertices'
    if nome not in lib_q._MATS:
        m = bpy.data.materials.new(nome)
        m.use_nodes = True
        nt = m.node_tree
        b = nt.nodes['Principled BSDF']
        ca = nt.nodes.new('ShaderNodeVertexColor')
        ca.layer_name = 'Col'
        nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.92
        # O chão não faz sombra (vai nos extras do material; o Jogo 3D respeita): é uma folha aberta,
        # e as encostas viradas para longe do sol fariam sombra nelas mesmas.
        m['szSemSombra'] = True
        lib_q._MATS[nome] = m
    return lib_q._MATS[nome]


def _trilha_centro(x):
    """z do meio da trilha de areia (da beira esquerda até a ponte)."""
    return 0.75 + 0.1 * math.sin(x * 0.7)


def _trilha_meia(x):
    """Meia largura da trilha: alarga perto da praia, onde chega a ponte."""
    return 0.62 + 0.38 * max(0.0, (x + 1.5) / 4.1) ** 2


# As duas manchas de grama (centro, raios, semente) e de que lado da trilha cada uma fica.
GRAMAS = (((-6.6, -3.7), (5.0, 3.1), 22, -1), ((-6.5, 4.0), (4.9, 2.85), 23, 1))
GRAMA_H = 0.045    # a grama fica um pouco acima da areia, com uma borda inclinada


def _dentro(pts, x, z):
    dentro = False
    n = len(pts)
    for i in range(n):
        (x1, z1), (x2, z2) = pts[i], pts[i - 1]
        if (z1 > z) != (z2 > z) and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1):
            dentro = not dentro
    return dentro


def _contorno_grama(centro, raios, semente, lado):
    """Contorno (no jogo) de uma mancha de grama, recortado pela trilha com uma folga."""
    pts = []
    for bx, by in _ilha(centro[0], centro[1], raios[0], raios[1], seed=semente, wob=0.06, n=160):
        x, z = bx, -by
        if -13.2 <= x <= 2.9:
            limite = _trilha_centro(x) + lado * (_trilha_meia(x) + 0.14)
            if lado * (z - limite) < 0:
                z = limite
        pts.append((x, z))
    return pts


def _grama():
    """A grama: duas manchas com a borda nítida e inclinada (como um tapete sobre a areia), o tampo
    triangulado por dentro para a cor variar em manchas de tom, a borda mais clara e o pé escuro.
    Usa o material de cor nos vértices do terreno (não faz sombra)."""
    r1, r2, r3 = _ruido(5, 2.6), _ruido(6, 0.9), _ruido(7, 1.7)
    c = {k: _cor_vertice(k) for k in ('grama', 'folha', 'folhaEscura', 'areiaEscura')}

    def tom(x, z):
        base = _mistura(c['grama'], c['folha'], 0.3 + 0.75 * r1(x, z) + 0.15 * (r2(x, z) - 0.5))
        return _mistura(base, c['folhaEscura'], 0.35 * _suave(0.55, 0.9, r3(x, z)))
    pe = _mistura(c['folhaEscura'], c['areiaEscura'], 0.45)
    p = []
    for centro, raios, semente, lado in GRAMAS:
        borda = _contorno_grama(centro, raios, semente, lado)
        n = len(borda)
        area = sum(borda[i - 1][0] * borda[i][1] - borda[i][0] * borda[i - 1][1] for i in range(n))
        sentido = 1 if area > 0 else -1
        # Pontos de dentro numa grade (longe da borda) para a triangulação ter onde variar a cor.
        xs = [x for x, _ in borda]
        zs = [z for _, z in borda]
        miolo = []
        passo = 0.32
        x = min(xs) + passo / 2
        while x < max(xs):
            z = min(zs) + passo / 2
            while z < max(zs):
                if _dentro(borda, x, z) and min(math.hypot(x - a, z - b) for a, b in borda) > 0.2:
                    miolo.append((x, z))
                z += passo
            x += passo
        todos = borda + miolo
        vs, _, faces, orig, _, _ = mathutils.geometry.delaunay_2d_cdt(
            [Vector(g(x, z)) for x, z in todos], [], [list(range(n))], 1, 1e-6)
        bm = bmesh.new()
        cores = bm.loops.layers.float_color.new('Col')
        topo, cor_de = [], {}
        for k, v2 in enumerate(vs):
            x, z = v2.x, -v2.y
            vert = bm.verts.new((v2.x, v2.y, GRAMA_H))
            cor_ = tom(x, z)
            if any(o < n for o in orig[k]):  # a borda de cima, mais clara
                cor_ = _mistura(cor_, c['folha'], 0.35)
            topo.append((vert, x, z))
            cor_de[vert] = cor_
        for f in faces:
            face = bm.faces.new([topo[i][0] for i in f])
            if face.normal.z < 0:
                face.normal_flip()
            for loop in face.loops:
                loop[cores] = (*cor_de[loop.vert], 1.0)
        # A borda inclinada: o anel de cima (os vértices da borda) desce até o pé, um pouco para fora.
        anel = {}
        for k, o in enumerate(orig):
            for i in o:
                if i < n:
                    anel[i] = topo[k][0]
        baixo = []
        for i in range(n):
            (ax, az), (bx, bz) = borda[i - 1], borda[(i + 1) % n]
            dx, dz = bx - ax, bz - az
            L = math.hypot(dx, dz) or 1
            nx, nz = sentido * dz / L, -sentido * dx / L
            x, z = borda[i]
            baixo.append(bm.verts.new((*g(x + nx * 0.07, z + nz * 0.07), -0.012)))
        for i in range(n):
            j = (i + 1) % n
            if i not in anel or j not in anel or anel[i] is anel[j]:
                continue
            face = bm.faces.new((anel[i], anel[j], baixo[j], baixo[i]))
            if face.normal.z < 0:
                face.normal_flip()
            for loop in face.loops:
                loop[cores] = (*cor_de.get(loop.vert, pe), 1.0)
        me = bpy.data.meshes.new('grama')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('grama', me)
        bpy.context.collection.objects.link(o)
        o.data.materials.append(_mat_terreno())
        for f in o.data.polygons:
            f.use_smooth = True
        p.append(o)
    return p


def _terreno():
    """O chão da ilha como um terreno só, no jeito dos jogos 3D: platô de areia no nível em que o
    personagem anda, praia que desce e continua por baixo da água (é ela que dá o tom claro do raso,
    vista pelo mar translúcido) e a trilha mais batida no meio, tudo pintado nos vértices. A grama é
    uma peça à parte (`_grama`), com a borda nítida. As cores são as do cenário; a forma não copia
    as camadas chapadas do desenho 2D."""
    dists = [(_distancia(c[0], c[1], r[0], r[1], sd, wob), pl, pr, dc)
             for c, r, sd, wob, pl, pr, dc in ILHAS]
    r2 = _ruido(6, 0.9)
    c = {k: _cor_vertice(k) for k in ('areia', 'areiaClara', 'areiaEscura', 'aguaRasa', 'mar')}
    leito = _leito()
    molhada = _mistura(c['areiaEscura'], c['aguaRasa'], 0.15)
    areia_seca = _mistura(c['areia'], c['areiaClara'], 0.4)

    def trilha(x, z):
        if x < -13.2 or x > 2.9:
            return 0.0
        w = _trilha_meia(x)
        return 1 - _suave(w - 0.1, w + 0.12, abs(z - _trilha_centro(x)) + 0.05 * (r2(x, z) - 0.5))

    def ponto(x, z):
        h, cor_ = FUNDO, leito
        for dist, pl, pr, dc in dists:
            d = dist(x, z)
            hh = _perfil(d, pl, pr, dc)
            if hh <= h:
                continue
            h = hh
            if hh >= 0.0:
                cor_ = areia_seca
            elif hh > AGUA:  # praia seca até a molhada
                t = hh / AGUA
                cor_ = _mistura(_mistura(areia_seca, c['areiaClara'], _suave(0.0, 0.35, t)), molhada, _suave(0.55, 1.0, t))
            else:  # por baixo da água: areia clara no raso, escurecendo até o fundo
                t = (AGUA - hh) / (AGUA - FUNDO)
                cor_ = _mistura(_mistura(c['areiaClara'], c['aguaRasa'], 0.45), leito, _suave(0.0, 1.0, t))
        if h >= 0.0:
            cor_ = _mistura(areia_seca, c['areiaEscura'], 0.3 * trilha(x, z) + 0.15 * r2(x, z))
        return h, cor_

    passo = 0.2
    nx, nz = int(round((10.5 - -15.5) / passo)), int(round((11.0 - -11.0) / passo))
    xs = [-15.5 + i * passo for i in range(nx + 1)]
    zs = [-11.0 + j * passo for j in range(nz + 1)]
    grade = [[ponto(x, z) for x in xs] for z in zs]
    bm = bmesh.new()
    cores = bm.loops.layers.float_color.new('Col')
    vert = {}

    def v(i, j):
        if (i, j) not in vert:
            vert[(i, j)] = bm.verts.new((*g(xs[i], zs[j]), grade[j][i][0]))
        return vert[(i, j)]
    for j in range(nz):
        for i in range(nx):
            q = ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))
            if all(grade[b][a][0] <= FUNDO + 1e-6 for a, b in q):
                continue  # mar fundo: o leito cobre
            f = bm.faces.new([v(a, b) for a, b in q])
            for loop, (a, b) in zip(f.loops, q):
                loop[cores] = (*grade[b][a][1], 1.0)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    me = bpy.data.meshes.new('terreno')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('terreno', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(_mat_terreno())
    for f in o.data.polygons:
        f.use_smooth = True
    p = [o]
    # Pedrinhas na areia, perto da praia.
    rnd = random.Random(31)
    for _ in range(16):
        a = rnd.uniform(-math.pi * 0.55, math.pi * 0.55)
        r = rnd.uniform(0.89, 0.97)
        x, z = -5.6 + 7.4 * r * math.cos(a), 7.8 * r * math.sin(a)
        if abs(z - 0.75) < 1.2 and x > -1:
            continue
        p.append(ellipsoid((*g(x, z), -0.02), (rnd.uniform(0.07, 0.15), rnd.uniform(0.05, 0.1), 0.035),
                           cor('areiaEscura'), seg=8, ring=5))
    # Espuma: uma linha fina e translúcida onde a praia encontra a água.
    espuma = f'{TEMA}/espumaLinha'
    lib_q.PALETTE.setdefault(espuma, (TEMAS[TEMA]['espuma'], 0.6, None, 0))
    lib_q.ALPHA[espuma] = 0.8
    for (cx, cz), (rx, rz), sd, wob, pl, pr, dc in ILHAS:
        k = _beira_da_agua(pl, pr, dc)
        p.append(_anel(_ilha(cx, cz, rx * k, rz * k, seed=sd, wob=wob, n=128), 0.07, AGUA + 0.008, espuma))
    return p


def _anel(pts, meia, z, m):
    """Faixa fechada e plana de largura 2·`meia` em volta do contorno `pts` (a linha de espuma)."""
    n = len(pts)
    bm = bmesh.new()
    fora, dentro = [], []
    for i, (x, y) in enumerate(pts):
        ax, ay = pts[i - 1]
        bx, by = pts[(i + 1) % n]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1
        nx, ny = dy / L, -dx / L
        fora.append(bm.verts.new((x + nx * meia, y + ny * meia, z)))
        dentro.append(bm.verts.new((x - nx * meia, y - ny * meia, z)))
    for i in range(n):
        f = bm.faces.new((dentro[i], dentro[(i + 1) % n], fora[(i + 1) % n], fora[i]))
        if f.normal.z < 0:
            f.normal_flip()
    return lib_q._obj('espuma', bm, m)


def _mar():
    """O mar: o leito (escuro) e, por cima, a superfície translúcida. Perto da ilha a areia aparece
    por baixo da água e o raso fica claro sozinho, sem anéis pintados."""
    agua = f'{TEMA}/agua'
    lib_q.PALETTE.setdefault(agua, (TEMAS[TEMA]['mar'], 0.25, None, 0))
    lib_q.ALPHA[agua] = 0.62
    # O leito usa o MESMO material de cor nos vértices do terreno: a borda funda do terreno (que
    # termina na cor do leito) emenda nele sem degrau de tom.
    fundo = slab(blob(0, 0, 70, 70, seed=1, n=96, wob=0.0), -0.5, FUNDO - 0.01, cor('mar'), fundo=False)
    fundo.data.materials.clear()
    fundo.data.materials.append(_mat_terreno())
    cores = fundo.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for item in cores.data:
        item.color = (*_leito(), 1.0)
    p = [fundo, slab(blob(0, 0, 70, 70, seed=1, n=96, wob=0.0), AGUA - 0.001, AGUA, agua, fundo=False)]
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
        p.append(strip(pts, w, AGUA, AGUA + 0.012, cor('onda')))
        feitas += 1
    return p


def _ponte():
    p = []
    x0, x1 = 1.5, 3.65
    n = 9
    rnd = random.Random(41)
    for i in range(n):
        t = (i + 0.5) / n
        x = x0 + (x1 - x0) * t
        y = 0.16 + 0.07 * math.sin(math.pi * t)
        p.append(box((0.2, 1.06, 0.06), (*g(x, 0.75), y), cor(rnd.choice(['madeira', 'madeiraClara', 'madeira'])),
                     bevel=0.018, rot=(rnd.uniform(-0.03, 0.03), 0, rnd.uniform(-0.05, 0.05))))
    for z in (0.32, 1.18):  # vigas por baixo, acompanhando o arco
        pts = [(*g(x0 + (x1 - x0) * t / 8, z), 0.1 + 0.07 * math.sin(math.pi * t / 8)) for t in range(9)]
        p.append(tube(pts, [0.045] * 9, cor('madeiraEscura'), seg=8))
    for x in (x0 + 0.02, x1 - 0.02):
        for z in (0.15, 1.35):
            p.append(cyl(0.065, 1.2, (*g(x, z), 0.1), cor('madeiraEscura'), verts=10))  # até o fundo
            p.append(sphere(0.07, (*g(x, z), 0.71), cor('madeiraEscura'), subdiv=1))
            p.append(torus(0.07, 0.018, (*g(x, z), 0.56), cor('corda'), seg=10, rseg=5))
    for z in (0.15, 1.35):  # corrimão de corda, caído no meio
        pts = [(*g(x0 + 0.02 + (x1 - x0 - 0.04) * t / 10, z), 0.56 - 0.1 * math.sin(math.pi * t / 10)) for t in range(11)]
        p.append(tube(pts, [0.022] * 11, cor('corda'), seg=6))
    return p


CEU_R = 68.0   # raio da cúpula do céu (cabe dentro do mar de 70): a caixa é a mesma em todo cenário


def _ceu():
    """Cúpula do céu vista por dentro, com o degradê do horizonte ao alto do cenário. Brilha sozinha
    (emissão) para a luz da cena não escurecer o céu."""
    baixo, alto = TEMAS[TEMA]['ceu']
    nome = f'{TEMA}/ceu'
    if nome not in lib_q._MATS:
        n = 32
        img = bpy.data.images.new(nome, width=2, height=n, alpha=False)
        c0, c1 = srgb(baixo), srgb(alto)
        px = []
        for j in range(n):
            t = (j / (n - 1)) ** 0.7
            px += [*(c0[k] + (c1[k] - c0[k]) * t for k in range(3)), 1.0] * 2
        img.pixels[:] = px
        img.pack()
        m = bpy.data.materials.new(nome)
        m.use_nodes = True
        nt = m.node_tree
        b = nt.nodes['Principled BSDF']
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.extension = 'EXTEND'
        mapa = nt.nodes.new('ShaderNodeUVMap')
        mapa.uv_map = 'UVMap'  # explícito: sem ele o exportador não liga a textura às coordenadas
        nt.links.new(mapa.outputs['UV'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
        nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 1.0
        b.inputs['Roughness'].default_value = 1.0
        m.use_backface_culling = True
        lib_q._MATS[nome] = m
    m = lib_q._MATS[nome]
    seg, anel = 32, 10
    bm = bmesh.new()
    # 'UVMap', o mesmo nome das outras peças: ao juntar, as coordenadas do céu vão para a primeira
    # camada (TEXCOORD_0). Com outro nome viravam uma segunda camada que o exportador não ligava à
    # textura, e o degradê se perdia.
    uv = bm.loops.layers.uv.new('UVMap')
    rings = []
    for j in range(anel + 1):
        el = (math.pi / 2) * j / anel
        rings.append([bm.verts.new((CEU_R * math.cos(el) * math.cos(2 * math.pi * i / seg),
                                    CEU_R * math.cos(el) * math.sin(2 * math.pi * i / seg),
                                    CEU_R * math.sin(el) - 0.3)) for i in range(seg)])
    for j in range(anel):
        for i in range(seg):
            i2 = (i + 1) % seg
            # Ordem que deixa a normal para DENTRO (a câmera fica dentro da cúpula).
            f = bm.faces.new((rings[j][i], rings[j + 1][i], rings[j + 1][i2], rings[j][i2]))
            for loop, v in zip(f.loops, (j / anel, (j + 1) / anel, (j + 1) / anel, j / anel)):
                loop[uv].uv = (0.5, v)
    me = bpy.data.meshes.new('ceu')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('ceu', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    for f in o.data.polygons:
        f.use_smooth = True
        if f.normal.dot(-f.center) < 0:
            f.flip()
    p = [o]
    if TEMA == 'noite-na-ilha':
        # Lua e estrelas baixas no horizonte do fundo (é a faixa de céu que a câmera do jogo vê).
        estrela = cor_hex('#e7cf76', 0.5, '#e7cf76', 2.0)
        rnd = random.Random(91)
        for _ in range(70):
            az = rnd.uniform(0.5, 2.6)  # +Y do Blender = o fundo (-Z) do jogo, para onde a câmera olha
            el = rnd.uniform(0.01, 0.2)
            r = CEU_R - 1.5
            p.append(sphere(rnd.uniform(0.12, 0.3), (r * math.cos(el) * math.cos(az), r * math.cos(el) * math.sin(az),
                                                       r * math.sin(el)), estrela, subdiv=1))
        lua = cor_hex('#d9ecf2', 0.5, '#d9ecf2', 1.6)
        az, el, r = 1.05, 0.045, CEU_R - 4  # à direita e ao fundo, como a lua do desenho
        centro = Vector((r * math.cos(el) * math.cos(az), r * math.cos(el) * math.sin(az), r * math.sin(el)))
        p.append(sphere(2.4, tuple(centro), lua, subdiv=3))
    return p


def _coqueiro(escala, giro, onde):
    """Coqueiro na forma da referência da autora (`referencias/coqueiro.glb`, feita no Molda):
    tronco fino e alto, copa larga de folhas pontudas em dois andares e cocos embaixo da copa.

    O acabamento é daqui: anéis no tronco, cada folha refeita com nervura dobrada, arco até a
    ponta e as duas metades em tons diferentes (o jeito low-poly da referência, com luz), e três
    cocos lapidados. A posição, o tamanho e a inclinação de cada folha são os da referência.
    `onde` = (x, z) da base no jogo."""
    ref = importar_referencia('coqueiro')
    tronco = next(o for o in ref if o.name.startswith('Tronco'))
    folhas = [o for o in ref if o.name.startswith('Plano')]
    cocos = [o for o in ref if o.name.startswith('Coco')]
    # A base do tronco vai para a origem (é onde o curso põe o coqueiro).
    vs = [v.co for v in tronco.data.vertices]
    zmin = min(v.z for v in vs)
    base = [v for v in vs if v.z < zmin + 0.05]
    bx, by = sum(v.x for v in base) / len(base), sum(v.y for v in base) / len(base)
    for o in ref:
        o.data.transform(Matrix.Translation((-bx, -by, -zmin)))
    p = []
    # Tronco: a malha da referência, com anéis em dois tons a cada 0,26.
    tronco.data.materials.clear()
    tronco.data.materials.append(mat('troncoRef'))
    tronco.data.materials.append(mat('troncoRefAnel'))
    for f in tronco.data.polygons:
        f.material_index = int(f.center.z / 0.26) % 2
    p.append(tronco)
    # Folhas: o eixo comprido de cada plano da referência vai do miolo da copa até a ponta.
    topo = max((v.co for v in tronco.data.vertices), key=lambda v: v.z)
    for k, o in enumerate(folhas):
        pts = [v.co.copy() for v in o.data.vertices]
        # As duas pontas do losango: os vértices mais distantes entre si.
        a, b = max(((u, w) for u in pts for w in pts), key=lambda uw: (uw[0] - uw[1]).length)
        if (a - topo).length > (b - topo).length:
            a, b = b, a
        # Largura e "cima" da folha: o vértice mais longe do eixo dá a largura e o lado.
        eixo = (b - a).normalized()
        lado = max(pts, key=lambda v: ((v - a) - eixo * (v - a).dot(eixo)).length)
        meia = ((lado - a) - eixo * (lado - a).dot(eixo))
        largura = meia.length
        lado_dir = meia.normalized()
        cima = eixo.cross(lado_dir).normalized()
        if cima.z < 0:
            cima = -cima
        p += _folha_ref(a, b, lado_dir, cima, largura, k)
        bpy.data.objects.remove(o)
    p.append(sphere(0.13, tuple(topo + Vector((0, 0, 0.05))), 'troncoRefAnel', subdiv=1, smooth_it=False))
    for c in cocos:
        bpy.data.objects.remove(c)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        p.append(sphere(0.15, (topo.x + 0.2 * math.cos(a), topo.y + 0.2 * math.sin(a), topo.z - 0.22),
                        'cocoRef', subdiv=1, smooth_it=False))
    place(p, loc=(*g(*onde), 0), rot_z=giro, scale=escala)
    return p


def _folha_ref(a, b, lado, cima, largura, k, n=6):
    """Folha low-poly de A (junto do tronco) a B (ponta): losango comprido com a nervura funda,
    arqueando para baixo até a ponta. Metade de cada lado num tom (a luz bate num lado só)."""
    L = (b - a).length
    eixo = (b - a).normalized()
    bm_e, bm_d = bmesh.new(), bmesh.new()
    nerv, borda_e, borda_d = [], [], []
    for i in range(n + 1):
        t = i / n
        # Losango largo como o da referência: mais largo a 40% e afinando até a ponta.
        w = largura * (0.2 + 0.8 * t / 0.4 if t < 0.4 else ((1 - t) / 0.6) ** 0.8)
        arco = -0.22 * L * t * t + 0.06 * L * math.sin(math.pi * t)
        c = a + eixo * L * t + cima * arco
        nerv.append(c - cima * 0.025 * (1 - t))
        borda_e.append(c + lado * w + cima * 0.05 * w)
        borda_d.append(c - lado * w + cima * 0.05 * w)
    for bm, borda in ((bm_e, borda_e), (bm_d, borda_d)):
        vn = [bm.verts.new(v) for v in nerv]
        vb = [bm.verts.new(v) for v in borda]
        for i in range(n):
            bm.faces.new((vn[i], vn[i + 1], vb[i + 1], vb[i]))
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    tons = [('folhaRefClara', 'folhaRef'), ('folhaRef', 'folhaRefEscura')][k % 2]
    out = []
    for bm, m in ((bm_e, tons[0]), (bm_d, tons[1])):
        o = lib_q._obj('folha', bm, m)
        lib_q.flat(o)
        out.append(o)
    return out


# Os dois lugares de árvore do desenho (os coqueiros do Molda): (x, z) no jogo.
ARVORE_TRAS, ARVORE_FRENTE = (-7.0, -4.2), (-6.6, 4.5)


def _coqueiros():
    # O coqueiro de trás é o mesmo na escala 1,2 do Molda (o da frente é 1,15), girado.
    return _coqueiro(1.2 / 1.15, R(40), ARVORE_TRAS) + _coqueiro(1.0, 0.0, ARVORE_FRENTE)


def _pinheiro(onde, escala=1.0, seed=0):
    """Pinheiro com neve (ilha nevada): tronco, três andares de copa e neve na ponta de cada um."""
    x, y = g(*onde)
    p = [cyl(0.13 * escala, 0.6 * escala, (x, y, 0.3 * escala), cor('madeira'), verts=10)]
    verde = cor_hex('#486f70', 0.85)
    neve = cor('espuma')
    for k, (r, z) in enumerate(((1.0, 0.55), (0.78, 1.15), (0.55, 1.7))):
        r, z = r * escala, z * escala
        p.append(cone(r, 0.9 * escala, (x, y, z + 0.45 * escala), verde, verts=10))
        p.append(cone(r * 0.62, 0.42 * escala, (x, y + 0.02, z + 0.72 * escala), neve, verts=10))
    return p


def _pinheiros():
    return (_pinheiro(ARVORE_TRAS, 1.15) + _pinheiro((-9.6, -2.6), 0.9) + _pinheiro(ARVORE_FRENTE, 1.05)
            + [ellipsoid((*g(x, z), 0.02), (rx, rx * 0.7, 0.06), cor('espuma'), seg=12, ring=6)
               for x, z, rx in ((-9.8, 5.8, 0.5), (-8.4, 6.1, 0.35), (-3.9, -5.6, 0.4), (-10.6, -0.4, 0.3))])


def _rochas():
    """Pedregulhos (costa rochosa) nos lugares das árvores e soltos na grama, como no desenho."""
    base, _ = PEDRAS['cinza']
    pedra, topo = cor_hex(base[0]), cor_hex(base[2])
    p = []
    rnd = random.Random(55)
    for (x, z), n in ((ARVORE_TRAS, 3), (ARVORE_FRENTE, 3), ((-10.4, -2.4), 2), ((-9.8, 5.2), 2), ((-3.6, -5.6), 1)):
        for k in range(n):
            s = rnd.uniform(0.55, 1.0) * (1.0 if k == 0 else 0.6)
            dx, dz = (0, 0) if k == 0 else (rnd.uniform(-0.8, 0.8), rnd.uniform(-0.6, 0.6))
            p.append(rock((*g(x + dx, z + dz), 0), (s * 1.6, s * 1.3, s * 1.1), pedra, seed=rnd.randint(0, 999),
                          subdiv=1, rough=0.2, top_m=topo))
    return p


def _vagalumes():
    """Vaga-lumes sobre a grama (noite na ilha), como as estrelinhas do desenho."""
    luz = cor_hex('#e7cf76', 0.5, '#f3dd84', 2.5)
    rnd = random.Random(77)
    p = []
    while len(p) < 16:
        x, z = rnd.uniform(-11.5, -1.5), rnd.uniform(-6.5, 6.5)
        if abs(z - 0.75) < 1.0:
            continue
        p.append(sphere(0.05, (*g(x, z), rnd.uniform(0.35, 1.3)), luz, subdiv=1))
    return p


def _moita(x, z, seed, s=1.0, tons=('folhaEscura', 'grama')):
    """Moita do desenho: três folhas largas e pontudas abertas em leque, a do meio mais em pé.
    `tons` = (as dos lados, a do meio)."""
    rnd = random.Random(seed)
    p = []
    cx, cy = g(x, z)
    giro = rnd.uniform(0, 2 * math.pi)
    for abre, m in ((-1, tons[0]), (0, tons[1]), (1, tons[0])):
        # As do lado abrem para fora; a do meio sobe quase reta.
        yaw = giro + abre * math.pi / 2
        p.append(leaf((cx, cy, 0.03), yaw, (0.24 if abre else 0.05) * s, 0.1 * s, cor(m),
                      lift=(0.24 if abre else 0.4) * s, droop=(0.06 if abre else 0.0) * s, fold=0.35, n=8))
    return p


def _vegetacao():
    p = []
    lugares = [(-0.35, -4.0, 1.0), (0.05, 4.5, 1.0), (-3.25, -4.7, 1.0), (-10.3, -1.6, 0.9), (-4.4, 2.35, 0.8),
               (-9.4, 5.6, 1.0), (-2.2, 5.9, 0.9), (-11.4, 3.0, 0.8), (-5.4, -6.4, 0.9), (-9.8, -5.6, 1.0)]
    contornos = [_contorno_grama(*gr) for gr in GRAMAS]
    for i, (x, z, s) in enumerate(lugares):
        na_grama = any(_dentro(cc, x, z) for cc in contornos)
        p += [_desce(o, GRAMA_H if na_grama else 0.0) for o in _moita(x, z, 60 + i, s)]
    # Tufos pequenos espalhados pela grama (o que faz a grama parecer grama de perto).
    rnd = random.Random(88)
    feitos = 0
    while feitos < 26:
        x, z = rnd.uniform(-12, -1.5), rnd.uniform(-7, 7)
        if not any(_dentro(cc, x, z) for cc in contornos):
            continue
        if min(math.hypot(x - a, z - b) for a, b in (ARVORE_TRAS, ARVORE_FRENTE)) < 1.0:
            continue
        # Mais claros que a grama, para aparecerem sobre ela.
        p += [_desce(o, GRAMA_H) for o in _moita(x, z, 300 + feitos, rnd.uniform(0.45, 0.65), ('folha', 'folha'))]
        feitos += 1
    return p


def _desce(o, dz):
    """Sobe a peça `dz` (os tufos nascem no chão de areia; na grama ficam no tampo dela)."""
    o.location.z += dz
    return o


def _pedras():
    """Pedras na forma da referência da autora (`referencias/pedras.glb`, feita no Molda): o
    bloco grande azul-acinzentado com a cópia menor na frente e as duas colunas azul-marinho
    atrás, à esquerda. O acabamento é daqui: quinas chanfradas que pegam luz, o tampo mais claro
    e as faces dos lados em dois tons, como pedra lapidada, e três pedrinhas no pé. As cores são as
    do cenário (azul, cinza, com neve no tampo ou de noite). Posição do curso: (-2, 0, -1)."""
    ref = importar_referencia('pedras')
    grandes, colunas = PEDRAS[TEMAS[TEMA]['pedra']]
    rnd = random.Random(71)
    p = []
    for o in ref:
        base, clara, topo = [cor_hex(h) for h in (colunas if 'menor' in o.name else grandes)]
        bevel_mod(o, 0.035, segs=1, angle=25)
        o.data.materials.clear()
        for m in (base, clara, topo):
            o.data.materials.append(mat(m))
        for f in o.data.polygons:
            if f.normal.z > 0.7:
                f.material_index = 2
            elif f.normal.z > -0.5:
                f.material_index = 1 if rnd.random() < 0.4 else 0
        lib_q.flat(o)
        p.append(o)
    for x, y, s, sd, tons in ((0.15, -1.85, 0.36, 73, grandes), (-1.95, -1.15, 0.3, 74, colunas),
                              (1.95, -1.2, 0.26, 75, grandes)):
        p.append(rock((x, y, 0), (s * 1.3, s, s * 0.7), cor_hex(tons[0]), seed=sd, subdiv=1, rough=0.2,
                      top_m=cor_hex(tons[2])))
    # 7% maior que a referência: assim a chave do esconderijo (-2, 1, -3) fica toda escondida,
    # inclusive a ponta, vista da câmera do jogo (o `verificar_pedra.py` confere).
    place(p, loc=(*g(-2, -1), 0), scale=1.07)
    return p


ARVORES = {'coqueiro': _coqueiros, 'pinheiro': _pinheiros, 'rochas': _rochas, 'vagalumes': _vagalumes}


def pecas_do_cenario(nome, ceu=True):
    """Todas as peças de um cenário, já no lugar (referencial do jogo, com a origem no centro)."""
    global TEMA
    TEMA = nome
    # As pedras NÃO entram: o curso as põe como objeto próprio (`pedra`, modelo `pedras`) no mesmo
    # lugar, e duas cópias no mesmo lugar brigam pela superfície.
    p = _mar() + _terreno() + _grama() + _ponte() + _vegetacao() + ARVORES[TEMAS[nome]['arvore']]()
    return p + (_ceu() if ceu else [])


def _exportar_cenario(nome):
    reset()
    p = pecas_do_cenario(nome)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in p for c in o.bound_box]
    mn = [round(min(v[i] for v in pts), 2) for i in range(3)]
    mx = [round(max(v[i] for v in pts), 2) for i in range(3)]
    # A mesma caixa em todos: o mar (±70) e a cúpula (até 67,7). Sem isso, trocar o cenário mexeria na ilha.
    if mn != [-70.0, -70.0, -0.5] or mx != [70.0, 70.0, round(CEU_R - 0.3, 2)]:
        raise RuntimeError(f'caixa do cenário {nome} fora do contrato: {mn} {mx}')
    exportar_estatico(f'cenario-{nome}', p)


def cenario_praia_tropical():
    _exportar_cenario('praia-tropical')


def cenario_costa_rochosa():
    _exportar_cenario('costa-rochosa')


def cenario_ilha_nevada():
    _exportar_cenario('ilha-nevada')


def cenario_noite_na_ilha():
    _exportar_cenario('noite-na-ilha')


def pedras():
    """As pedras sozinhas (praia tropical, no referencial do Molda): para o `verificar_pedra.py`."""
    reset()
    global TEMA
    TEMA = 'praia-tropical'
    p = _pedras()
    place(p, loc=(*(-Vector((*g(-2, -1), 0))),))
    export('pedras', p)


def bancada():
    """Bancada das experiências: o chão de 10 x 10 em que a aula mostra o personagem, a chave, os
    eixos e a grade. Um pedaço da ilha no mesmo acabamento do cenário: tampo de grama no nível 0 (a
    grade e os marcadores da cena ficam logo acima), com a borda inclinada, sobre a areia e a
    espuma."""
    reset()
    global TEMA
    TEMA = 'praia-tropical'
    p = []
    quadrado = lambda m: [(x * m, y * m) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    p.append(slab(quadrado(5.35), -0.3, -0.12, 'espuma', bevel=0.06, segs=3))
    p.append(slab(quadrado(5.3), -0.25, -0.03, 'areia', bevel=0.08, segs=3))
    # Tampo de grama: grade com a cor variando em manchas e a borda descendo, um pouco para fora.
    r1, r2, r3 = _ruido(5, 2.6), _ruido(6, 0.9), _ruido(7, 1.7)
    c = {k: _cor_vertice(k) for k in ('grama', 'folha', 'folhaEscura', 'areiaEscura')}

    def tom(x, z):
        base = _mistura(c['grama'], c['folha'], 0.3 + 0.75 * r1(x, z) + 0.15 * (r2(x, z) - 0.5))
        return _mistura(base, c['folhaEscura'], 0.35 * _suave(0.55, 0.9, r3(x, z)))
    n, L = 25, 5.0
    bm = bmesh.new()
    cores = bm.loops.layers.float_color.new('Col')
    pos = [-L + 2 * L * i / n for i in range(n + 1)]
    topo = [[bm.verts.new((x, y, 0.0)) for x in pos] for y in pos]
    cor_de = {}
    for j, y in enumerate(pos):
        for i, x in enumerate(pos):
            borda = i in (0, n) or j in (0, n)
            cor_de[topo[j][i]] = _mistura(tom(x, -y), c['folha'], 0.35 if borda else 0.0)
    faces = [[topo[j][i], topo[j][i + 1], topo[j + 1][i + 1], topo[j + 1][i]] for j in range(n) for i in range(n)]
    anel = ([topo[0][i] for i in range(n)] + [topo[j][n] for j in range(n)]
            + [topo[n][i] for i in range(n, 0, -1)] + [topo[j][0] for j in range(n, 0, -1)])
    pe = _mistura(c['folhaEscura'], c['areiaEscura'], 0.45)
    baixo = []
    for v in anel:
        x, y = v.co.x, v.co.y
        k = 1 + 0.06 / max(abs(x), abs(y))
        b = bm.verts.new((x * k, y * k, -0.06))
        cor_de[b] = pe
        baixo.append(b)
    for i in range(len(anel)):
        faces.append([anel[i], anel[(i + 1) % len(anel)], baixo[(i + 1) % len(anel)], baixo[i]])
    for f in faces:
        face = bm.faces.new(f)
        if face.normal.z < 0 or (face.normal.z < 0.5 and face.normal.xy.dot(face.calc_center_median().xy) < 0):
            face.normal_flip()
        for loop in face.loops:
            loop[cores] = (*cor_de[loop.vert], 1.0)
    me = bpy.data.meshes.new('tampo')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('tampo', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(_mat_terreno())
    for f in o.data.polygons:
        f.use_smooth = True
    p.append(o)
    # Pedrinhas na areia da borda, fora do tampo.
    rnd = random.Random(81)
    for _ in range(14):
        lado = rnd.choice((-1, 1))
        t = rnd.uniform(-4.9, 4.9)
        x, y = (lado * 5.15, t) if rnd.random() < 0.5 else (t, lado * 5.15)
        p.append(ellipsoid((x, y, -0.03), (rnd.uniform(0.05, 0.1), rnd.uniform(0.04, 0.08), 0.02), 'areiaEscura', seg=8, ring=5))
    exportar_estatico('bancada', p)


TODOS = ['cenario-praia-tropical', 'cenario-costa-rochosa', 'cenario-ilha-nevada', 'cenario-noite-na-ilha',
         'pedras', 'bancada']
