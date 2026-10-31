"""As seis ilhas do anel, versão leve: a silhueta que você vê de longe e que ganha cor quando a
ponte abre.

Desde 31/10/2026 a silhueta sai das ilhas completas (`src/assets/ilhas/<ilha>.glb`), com os marcos:
o mesmo contorno, a mesma altura e a mesma largura, para a troca na ponte não mudar o tamanho. Cada
ilha vira UMA malha de até `TETO` triângulos, com a cor de cada material passada para a cor por
vértice (`COLOR_0`) num material só, `ilha`; a lava do Vale fica no material `lava`, que brilha.

Referencial: o mesmo do arquivo da ilha completa (o jogo põe a leve e a completa no mesmo grupo,
`centroNoAnel`, e gira as duas com `giroDaIlha`). O centro da ilha na origem, y = 0 no mar, o tampo
em y = 1 (em cima do colisor da leve, `apoiosDaIlhaLeve`) e a chegada da ponte no +x. Nas Nuvens o
grupo fica a y = 7 (`ALTURA_DAS_NUVENS`): no arquivo o tampo continua em y = 1 e o mar fica em -7.

Um nó por ilha, com o `id` do contrato: `bosque`, `vila-doce`, `recife`, `pico`,
`vale-dos-dinos`, `nuvens`. O jogo puxa as cores para o cinza antes do posto e as devolve
conforme a ponte abre (a lava acende junto).

Os ajudantes de cima (`base`, `contorno`, `coral`, `pirulito`…) desenham o chão e algumas peças das
ilhas completas (`arte/ilhas`, `arte/ilhas-b`), que os importam daqui.
"""
from lib_mundo import *

RAIO = RAIO_DA_ILHA_DO_ANEL
TOPO = 1.0


def contorno(raio, semente, n=36, amp=(0.05, 0.03), lobo=None):
    """O contorno de uma ilha: um círculo com ondinhas. `lobo` (`(angulo, quanto, meia_abertura)`, o
    ângulo no chão do Blender) cresce a ilha para um lado, suave: em `angulo` o raio vai a
    `1 + quanto` vezes, e some a `meia_abertura` dali. Com lobo, o contorno tem o dobro de pontos
    (a curva do lobo fica lisa)."""
    if lobo:
        n *= 2
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append((math.cos(a) * raio * fator_do_contorno(a, semente, amp, lobo),
                    math.sin(a) * raio * fator_do_contorno(a, semente, amp, lobo)))
    return pts


def fator_do_contorno(a, semente, amp=(0.05, 0.03), lobo=None):
    """Quanto o raio vale no ângulo `a` (o mesmo cálculo de `raioDoTampo` em `src/mundo/medidas.ts`)."""
    k = 1 + amp[0] * math.sin(3 * a + semente) + amp[1] * math.sin(5 * a + semente * 2)
    if lobo:
        centro, quanto, meia = lobo
        d = math.atan2(math.sin(a - centro), math.cos(a - centro))
        if abs(d) < meia:
            k *= 1 + quanto * math.cos(d / meia * math.pi / 2) ** 2
    return k


# O Bosque cresce para o lado de fora (o -x do modelo, longe da chegada da ponte): o lugar da
# cabana que a criança constrói. Os mesmos números em `LOBO_DO_BOSQUE` (src/mundo/medidas.ts).
LOBO_DO_BOSQUE = (math.pi, 0.55, math.radians(70))


def base(semente, topo='grama', praia='areia', fundo='terraIlha', borda_topo=None, flutua=False, lobo=None):
    """Tampo plano, uma faixa de praia e o barranco até embaixo d'água (ou a rocha da ilha que
    flutua)."""
    p = []
    p.append(slab(contorno(RAIO - 0.35, semente, lobo=lobo), TOPO - 0.35, TOPO, topo, bevel=0.22, segs=1, name='topo',
                  fundo=False))
    if borda_topo:
        p.append(slab(contorno(RAIO - 0.1, semente, lobo=lobo), TOPO - 0.5, TOPO - 0.2, borda_topo, bevel=0.1, segs=1,
                      name='borda', fundo=False))
    if not flutua:
        p.append(slab(contorno(RAIO + 0.9, semente + 0.4, amp=(0.06, 0.03), lobo=lobo), TOPO - 0.95, TOPO - 0.42, praia,
                      bevel=0.2, segs=1, name='praia', fundo=False))
        p.append(slab(contorno(RAIO + 1.4, semente + 0.4, amp=(0.06, 0.03), lobo=lobo), -1.0, TOPO - 0.95, fundo, bevel=0.0,
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


def pedra_leve(x, z, s, m='pedra', seed=0, y=TOPO):
    bx, by = g(x, z)
    return [rock((bx, by, y - 0.15), (1.4 * s, 1.2 * s, 0.9 * s), m, seed=seed, subdiv=1, rough=0.2)]


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




# ------------------------------------------------------------------ a silhueta
ILHAS_COMPLETAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'assets', 'ilhas')
ILHAS = ['bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens']

TETO = 3000            # triângulos por ilha (o pedido)
ALVO = 2900            # o que se pede ao decimar (sobra para o arredondamento)
MIUDO = 0.5            # peça menor que isto (m, a maior medida) não se vê de longe
PLANO = math.radians(2)  # faces quase no mesmo plano e da mesma cor viram uma
POTENCIA = 0.3         # quanto a área pesa na parte de cada peça (abaixo de 1: as pequenas ganham)
LINEAR = 0.02          # e o pedaço que cresce com a área (o chão e as montanhas)
ESTREITO = 0.5         # peça comprida e fina (poste, mastro) conta como uma faixa desta largura
PISO = 6               # menos triângulos que isto não desenham a peça: ela sai
PESO_DO_MARCO = 3.0    # o marco da ilha (`marco-*`), o que se reconhece de longe
BEIRA = 0.25           # peça a menos disto da caixa da ilha fica (a altura e a largura não mudam)


def _nao_desenha(o):
    """Colisores (`col-*`) e formas de escalar (`escalada-*`) não aparecem no jogo."""
    while o:
        if o.name.startswith(('col-', 'escalada-')):
            return True
        o = o.parent
    return False


def _cor(m):
    return tuple(m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)[:3]


def _partes(bm):
    """As peças soltas (vértices ligados por arestas)."""
    vistos, partes = set(), []
    for v in bm.verts:
        if v in vistos:
            continue
        pilha, parte = [v], []
        vistos.add(v)
        while pilha:
            a = pilha.pop()
            parte.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b not in vistos:
                    vistos.add(b)
                    pilha.append(b)
        partes.append(parte)
    return partes


def _caixa(vs):
    return [min(v.co[i] for v in vs) for i in range(3)], [max(v.co[i] for v in vs) for i in range(3)]


def _ler(nome):
    """O desenho da ilha completa num bmesh só, no referencial do arquivo, com o material de cada face
    e uma camada `no` com o nó de onde a face veio."""
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ILHAS_COMPLETAS, f'{nome}.glb'))
    novos = [o for o in bpy.data.objects if o not in antes]
    bpy.context.view_layer.update()
    bm = bmesh.new()
    camada = bm.faces.layers.int.new('no')
    mats, nos = [], []
    for o in novos:
        if o.type != 'MESH' or _nao_desenha(o):
            continue
        me = o.data.copy()
        me.transform(o.matrix_world)
        idx = []
        for m in me.materials:
            if m not in mats:
                mats.append(m)
            idx.append(mats.index(m))
        nos.append(o.name)
        n0 = len(bm.faces)
        bm.from_mesh(me)
        bm.faces.ensure_lookup_table()
        for f in bm.faces[n0:]:
            f.material_index = idx[f.material_index] if idx else 0
            f[camada] = len(nos) - 1
        bpy.data.meshes.remove(me)
    for o in novos:
        bpy.data.objects.remove(o)
    return bm, mats, nos


def _decimar(bm, razao):
    me = bpy.data.meshes.new('decimar')
    bm.to_mesh(me)
    o = bpy.data.objects.new('decimar', me)
    bpy.context.collection.objects.link(o)
    d = o.modifiers.new('d', 'DECIMATE')
    d.ratio = razao
    d.use_collapse_triangulate = True
    novo = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(o)
    bpy.data.meshes.remove(me)
    return novo


def _material_da_ilha():
    """`ilha`: branco que multiplica a cor de cada vértice (o glTF leva como COLOR_0)."""
    m = bpy.data.materials.get('ilha')
    if m:
        return m
    m = bpy.data.materials.new('ilha')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.9
    at = nt.nodes.new('ShaderNodeVertexColor')
    at.layer_name = 'Col'
    nt.links.new(at.outputs['Color'], b.inputs['Base Color'])
    return m


def silhueta(nome):
    """A versão leve de uma ilha, feita da completa:

    1. junta as malhas que desenham (sem `col-*` e `escalada-*`) e solda os vértices encostados;
    2. tira as peças miúdas e junta as faces quase no mesmo plano (não muda a forma);
    3. reparte os triângulos entre as peças pela área (as pequenas ganham mais que a conta direta, o
       marco ganha mais) e decima cada uma; a que fica com menos de `PISO` sai. A lava e as peças na
       beira da caixa (o topo, as pontas) sempre ficam;
    4. pinta cada canto com a cor do material da face e deixa só os materiais `ilha` e `lava`."""
    bm, mats, nos = _ler(nome)
    camada = bm.faces.layers.int['no']
    lava = {i for i, m in enumerate(mats) if m.name.split('.')[0] == 'lava'}
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    c0, c1 = _caixa(bm.verts)

    def na_beira(vs):
        a, b = _caixa(vs)
        return (b[2] > c1[2] - BEIRA or a[0] < c0[0] + BEIRA or b[0] > c1[0] - BEIRA or a[1] < c0[1] + BEIRA
                or b[1] > c1[1] - BEIRA)

    tirar = []
    for parte in _partes(bm):
        a, b = _caixa(parte)
        if max(b[i] - a[i] for i in range(3)) < MIUDO and not na_beira(parte):
            tirar += parte
    bmesh.ops.delete(bm, geom=tirar, context='VERTS')
    bmesh.ops.dissolve_limit(bm, angle_limit=PLANO, verts=bm.verts, edges=bm.edges, delimit={'MATERIAL'})
    bmesh.ops.triangulate(bm, faces=bm.faces)

    pecas = []
    for parte in _partes(bm):
        faces = {f for v in parte for f in v.link_faces}
        a, b = _caixa(parte)
        area = max(sum(f.calc_area() for f in faces), ESTREITO * max(b[i] - a[i] for i in range(3)))
        peso = area ** POTENCIA + LINEAR * area
        if any(nos[f[camada]].startswith('marco-') for f in faces):
            peso *= PESO_DO_MARCO
        fica = na_beira(parte) or any(f.material_index in lava for f in faces)
        pecas.append((parte, faces, len(faces), peso, fica))

    def quantos(t, peso, fica, k):
        n = min(t, k * peso)
        if n >= min(t, PISO):
            return n
        return min(t, PISO) if fica else 0

    def montar(k):
        saida = bmesh.new()
        for parte, faces, t, peso, fica in pecas:
            n = quantos(t, peso, fica, k)
            if n == 0:
                continue
            sub = bmesh.new()
            novo = {v: sub.verts.new(v.co) for v in parte}
            for f in faces:
                sub.faces.new([novo[v] for v in f.verts]).material_index = f.material_index
            if n >= t - 0.5 or any(f.material_index in lava for f in faces):
                me = bpy.data.meshes.new('peca')
                sub.to_mesh(me)
            else:
                me = _decimar(sub, n / t)
            sub.free()
            saida.from_mesh(me)
            bpy.data.meshes.remove(me)
        # A decimação deixa faces repetidas (o `validate` tira).
        me = bpy.data.meshes.new(nome)
        saida.to_mesh(me)
        saida.free()
        me.validate()
        return me

    # O k que reparte `ALVO` triângulos pela conta, para começar.
    lo, hi = 0.0, 1e4
    for _ in range(60):
        k = (lo + hi) / 2
        if sum(quantos(t, p, f, k) for _, _, t, p, f in pecas) > ALVO:
            hi = k
        else:
            lo = k
    # A decimação não acerta a conta (e peças saem de uma vez): busca o k pelo medido, entre dois.
    k, me, abaixo, acima = lo, None, 0.0, None
    for _ in range(10):
        feita = montar(k)
        n = len(feita.polygons)
        if n <= TETO and (me is None or n > len(me.polygons)):
            if me:
                bpy.data.meshes.remove(me)
            me = feita
        else:
            bpy.data.meshes.remove(feita)
        if abs(n - ALVO) <= 40:
            break
        if n < ALVO:
            abaixo = k
        else:
            acima = k
        k = (abaixo + acima) / 2 if acima is not None else k * 1.25
    bm.free()
    me.name = nome
    for m in mats:
        me.materials.append(m)
    _pintar(me, lava)
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    assert len(me.polygons) <= TETO, f'{nome}: {len(me.polygons)} triângulos'
    return o


def _pintar(me, lava):
    """A cor de cada face vai para os cantos (`Col`); fica o material `ilha` e, no Vale, o `lava`.
    Sombreado liso: os vértices se dividem só onde a cor muda (o arquivo fica leve)."""
    cores = [_cor(m) for m in me.materials]
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for p in me.polygons:
        c = cores[p.material_index]
        for li in p.loop_indices:
            attr.data[li].color = (c[0], c[1], c[2], 1)
    materiais = [_material_da_ilha()]
    if lava:
        m = me.materials[min(lava)]
        m.name = 'lava'
        materiais.append(m)
    eh_lava = [p.material_index in lava for p in me.polygons]
    me.materials.clear()
    for m in materiais:
        me.materials.append(m)
    for p, lv in zip(me.polygons, eh_lava):
        p.material_index = 1 if lv else 0
        p.use_smooth = True


def main():
    lib_q.reset()
    exportar('ilhas-do-anel', {nome: [silhueta(nome)] for nome in ILHAS})


if __name__ == '__main__':
    main()
