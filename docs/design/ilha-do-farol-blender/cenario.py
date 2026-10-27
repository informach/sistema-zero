"""Os quatro cenários da ilha: praia tropical, costa rochosa, ilha nevada e noite na ilha.

Cada cenário é UM modelo (`cenario-<nome>`): céu, mar, ilha, ponte, árvores, moitas e as pedras
que escondem a chave. Na personalização a criança troca o modelo em um bloco só. Os quatro têm
EXATAMENTE a mesma caixa (o mar de 140 x 140 e a cúpula do céu): o Jogo 3D encaixa e centraliza o
modelo pela caixa, então trocar o cenário não mexe na ilha.

Todos seguem o desenho de `<cenario>.svg`: mar, água rasa clara, espuma, areia clara e areia,
borda e duas manchas de grama separadas pela trilha que leva à ponte, e a ilhota do farol à direita
(+X). Muda a paleta e o que cresce na grama: coqueiros (praia), pedregulhos (costa), pinheiros com
neve (nevada) e vaga-lumes sob a lua (noite, sem árvores, como no desenho).

As medidas e as posições são as dos projetos do Molda que estas peças substituem (mapa de
reintegração): a área em que o personagem anda (x de -11 a 0,6 e z de -5 a 5, a ponte e a ilhota)
continua dentro da grama e da areia. O mar, o terreno, a ponte e as moitas ficam na origem; os
coqueiros e as pedras têm o referencial próprio, com a base no chão.

O coqueiro e as pedras seguem a FORMA das referências que a autora fez no Molda (`referencias/`);
o acabamento é daqui. As pedras escondem a chave em (-2, 1, -3), vista da câmera do jogo
(0, 12, 21): o `verificar_pedra.py` confere isso a cada mudança.
"""
from lib_ilha import *

# Cores tiradas dos SVGs de cada cenário. `ceu` = (horizonte, alto).
TEMAS = {
    'praia-tropical': dict(mar='#6e9bff', onda='#8fb3ff', aguaRasa='#94d5f5', espuma='#ffffff',
                           areiaClara='#fae1ab', areia='#dfc283', areiaEscura='#c9aa6c', gramaBorda='#4e9081',
                           grama='#0b7a54', folha='#29905a', folhaEscura='#21734f', madeira='#835d3f',
                           madeiraClara='#95633d', madeiraEscura='#61432f', corda='#d8b57a',
                           ceu=('#bfe6fb', '#6fb8ef'), pedra='azul', arvore='coqueiro'),
    'costa-rochosa': dict(mar='#3a7b9c', onda='#5b98b5', aguaRasa='#8fc8d6', espuma='#ffffff',
                          areiaClara='#d4cdb9', areia='#b4aa91', areiaEscura='#9b917a', gramaBorda='#89958a',
                          grama='#516c6b', folha='#5f7d78', folhaEscura='#46605d', madeira='#9b7659',
                          madeiraClara='#a8835f', madeiraEscura='#7a5132', corda='#d4cdb9',
                          ceu=('#dfe8ee', '#97b3c8'), pedra='cinza', arvore='rochas'),
    'ilha-nevada': dict(mar='#557eb0', onda='#7096c2', aguaRasa='#90b7d7', espuma='#f7fbff',
                        areiaClara='#eef5f6', areia='#a8b9c8', areiaEscura='#93a5b6', gramaBorda='#d2e5e7',
                        grama='#a8c7d0', folha='#7fa3a8', folhaEscura='#5f8a8c', madeira='#835d3f',
                        madeiraClara='#9b7659', madeiraEscura='#7a5132', corda='#eef5f6',
                        ceu=('#f2f8fc', '#a9cbe6'), pedra='neve', arvore='pinheiro'),
    'noite-na-ilha': dict(mar='#203857', onda='#355775', aguaRasa='#355775', espuma='#668ba6',
                          areiaClara='#b2a8aa', areia='#857c88', areiaEscura='#6c6370', gramaBorda='#285464',
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


def _mar():
    p = [slab(blob(0, 0, 70, 70, seed=1, n=96, wob=0.0), -0.5, -0.3, cor('mar'), fundo=False)]
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
        p.append(strip(pts, w, -0.3, -0.285, cor('onda')))
        feitas += 1
    return p


def _terreno():
    p = []
    camadas = [  # (papel, topo, raios da ilha, raios da ilhota)
        ('aguaRasa', -0.24, (8.9, 9.0), (2.75, 2.25)),
        ('espuma', -0.15, (7.95, 8.2), (2.5, 2.1)),
        ('areiaClara', -0.06, (7.7, 8.0), (2.3, 1.9)),
        ('areia', 0.0, (7.1, 7.75), (1.9, 1.5)),
    ]
    for i, (papel, topo, (rx, rz), (ix, iz)) in enumerate(camadas):
        base = -0.31 if i == 0 else topo - 0.1
        p.append(slab(_ilha(-5.6, 0, rx, rz, seed=11), base, topo, cor(papel), bevel=0.035, segs=2, fundo=False))
        p.append(slab(_ilha(5.25, 0.4, ix, iz, seed=12, n=32), base - 0.005, topo - 0.004, cor(papel), bevel=0.03, segs=2, fundo=False))
    # Grama: a borda e as duas manchas do desenho.
    p.append(slab(_ilha(-6.25, 0, 6.1, 7.35, seed=21, wob=0.04), -0.06, 0.035, cor('gramaBorda'), bevel=0.03, fundo=False))
    p.append(slab(_ilha(-6.6, -3.7, 5.0, 3.1, seed=22, wob=0.06), 0.0, 0.06, cor('grama'), bevel=0.025, fundo=False))
    p.append(slab(_ilha(-6.5, 4.0, 4.9, 2.85, seed=23, wob=0.06), 0.0, 0.06, cor('grama'), bevel=0.025, fundo=False))
    # Trilha de areia da beira esquerda até a ponte, alargando perto da praia.
    xs = [-12.9 + 15.5 * t / 30 for t in range(31)]
    trilha = [g(x, 0.75 + 0.1 * math.sin(x * 0.7)) for x in xs]
    larg = [0.62 + 0.38 * max(0.0, (x + 1.5) / 4.1) ** 2 for x in xs]
    p.append(strip(trilha, larg, -0.02, 0.075, cor('areia'), bevel=0.03))
    # Pedrinhas e marcas na areia (as manchinhas do desenho).
    rnd = random.Random(31)
    for _ in range(16):
        a = rnd.uniform(-math.pi * 0.55, math.pi * 0.55)
        r = rnd.uniform(0.89, 0.97)
        x, z = -5.6 + 7.4 * r * math.cos(a), 7.8 * r * math.sin(a)
        if abs(z - 0.75) < 1.2 and x > -1:
            continue
        p.append(ellipsoid((*g(x, z), -0.02), (rnd.uniform(0.07, 0.15), rnd.uniform(0.05, 0.1), 0.035),
                           cor('areiaEscura'), seg=8, ring=5))
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
            p.append(cyl(0.065, 0.7, (*g(x, z), 0.35), cor('madeiraEscura'), verts=10))
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
        nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
        nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 1.0
        b.inputs['Roughness'].default_value = 1.0
        m.use_backface_culling = True
        lib_q._MATS[nome] = m
    m = lib_q._MATS[nome]
    seg, anel = 32, 10
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
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


def _moita(x, z, seed, s=1.0):
    """Moita do desenho: três folhas largas e pontudas abertas em leque, a do meio mais em pé."""
    rnd = random.Random(seed)
    p = []
    cx, cy = g(x, z)
    giro = rnd.uniform(0, 2 * math.pi)
    for abre, m in ((-1, 'folhaEscura'), (0, 'grama'), (1, 'folhaEscura')):
        # As do lado abrem para fora; a do meio sobe quase reta.
        yaw = giro + abre * math.pi / 2
        p.append(leaf((cx, cy, 0.03), yaw, (0.24 if abre else 0.05) * s, 0.1 * s, cor(m),
                      lift=(0.24 if abre else 0.4) * s, droop=(0.06 if abre else 0.0) * s, fold=0.35, n=8))
    return p


def _vegetacao():
    p = []
    lugares = [(-0.35, -4.0, 1.0), (0.05, 4.5, 1.0), (-3.25, -4.7, 1.0), (-10.3, -1.6, 0.9), (-4.4, 2.35, 0.8),
               (-9.4, 5.6, 1.0), (-2.2, 5.9, 0.9), (-11.4, 3.0, 0.8), (-5.4, -6.4, 0.9), (-9.8, -5.6, 1.0)]
    for i, (x, z, s) in enumerate(lugares):
        p += _moita(x, z, 60 + i, s)
    return p


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
    place(p, loc=(*g(-2, -1), 0))
    return p


ARVORES = {'coqueiro': _coqueiros, 'pinheiro': _pinheiros, 'rochas': _rochas, 'vagalumes': _vagalumes}


def pecas_do_cenario(nome, ceu=True):
    """Todas as peças de um cenário, já no lugar (referencial do jogo, com a origem no centro)."""
    global TEMA
    TEMA = nome
    p = _mar() + _terreno() + _ponte() + _vegetacao() + ARVORES[TEMAS[nome]['arvore']]() + _pedras()
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


TODOS = ['cenario-praia-tropical', 'cenario-costa-rochosa', 'cenario-ilha-nevada', 'cenario-noite-na-ilha',
         'pedras', 'bancada']
