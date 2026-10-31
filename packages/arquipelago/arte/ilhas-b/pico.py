"""Pico Gelado, a ilha completa: a montanha com a trilha que sobe em espiral até o cume, o iglu,
os pinheiros nevados, a parede de gelo para escalar, o lago congelado e o palco do Floco.

Gera três arquivos em `src/assets/ilhas/`:

- `pico.glb`: nós `chao` (o chão da ilha leve, mesmo contorno), `montanha` (com a trilha),
  `cenario` (iglu, palco, parede de gelo, árvores, lago, enfeites), `treno` (no platô do cume),
  `caverna` e `caverna-joia` (a caverna de cristal de `pico_caverna.py`, atrás da montanha) e as
  âncoras, com as da subida ao cume (`subida-N`, `floco-N`) e da descida de trenó (`treno-curva-N`);
- `pico-props.glb`: peças soltas para o jogo repetir (`pinheiro-nevado-a`, `pinheiro-nevado-b`,
  `bloco-de-gelo`, `boneco-de-neve`, `painel-de-gelo`), cada uma com a base em y = 0;
- `pico-treno.glb`: o trenó (`treno`), frente para −z do jogo.
"""
from lib_ilhas_b import *
from pico_caverna import montar_caverna
import lib_cais

# O ponto de embarque do barco (pedido de arte de 30/10/2026): o −x é da caverna de cristal, então o
# deque sai no rumo de 250° (o lado de fora, entre a caverna e o palco), longe da trilha e do iglu.
# A beira do tampo (13,3 do meio) e o degrau (0,4 depois) foram medidos no `col-terreno`; a ponta
# fica 3,3 além do barranco (15,5).
PORTO = dict(terra=(-4.549, -12.498), rumo=250, degrau=0.4, comprimento=5.5, lado=1)

MONTANHA = dict(x=-4.5, z=-1.5, r=6.6, h=12.0)
# A trilha (para o jogo, fase3-07): um corte em espiral na encosta, 1,25 volta no sentido horário
# (do lado do iglu; o palco fica do outro lado), do pé ao platô do cume. O chão do corte vai da
# parede de dentro (`raio_montanha - largura`) até a beira da encosta: uns 1,5 a 1,9 m (o facetado
# desvia a beira), a cápsula do corpo tem 0,7. A rampa tem a mesma inclinação do começo ao fim (bem
# abaixo dos 52° que o corpo sobe); a encosta (66°) não se sobe, e o guarda-corpo invisível da beira
# segura quem anda.
TRILHA = dict(largura=1.75, voltas=1.25, a0=R(5), secoes=96, folga_poste=0.3, alto_do_corte=4.0)
# O desvio do facetado da montanha (raio e altura de cada vértice dos anéis, menos o do platô).
DESVIO_DO_RAIO = 0.03
DESVIO_DA_ALTURA = 0.06
# O platô do cume: plano, uns 5 m de diâmetro (o corte da trilha chega nele).
T_DO_PLATO = 0.739
# A caverna de cristal (fase3-07): a peça de `pico_caverna.py` com a boca aqui, sem giro, atrás da
# montanha; o morro fica por cima do mar (proposta do README).
BOCA_DA_CAVERNA = dict(x=-14.2, z=-0.5)
# A subida ao cume com tempo (fase3-07): paradas em 1/4, 1/2, 3/4 e no fim da trilha, e os flocos
# de neve (o jogo põe a altura) nestas frações do caminho.
PARADAS_DA_SUBIDA = (0.25, 0.5, 0.75, 1.0)
LARGADA_DA_SUBIDA = (2.6, -1.0)
FLOCOS_DA_SUBIDA = (0.14, 0.34, 0.54, 0.74, 0.9)
# O trenó no platô: a esta distância do meio, deste tanto (graus) antes da boca da trilha (do lado
# oposto ao de onde a trilha chega, que vem dos ângulos maiores), virado para ela. A descida segue a linha do meio da trilha, um ponto a cada `PASSO_DA_DESCIDA` seções.
TRENO_NO_PLATO = dict(raio=1.45, desvio=55)
PASSO_DA_DESCIDA = 4


def raio_montanha(t):
    return MONTANHA['r'] * (1 - 0.82 * t)


def altura_montanha(t):
    return TOPO - 0.35 + MONTANHA['h'] * t


def caminho_da_trilha():
    """Os pontos da trilha, de baixo para cima: (ângulo, t, altura do chão). A altura sobe a mesma
    fração do caminho andado (pela linha do meio do chão), até o platô."""
    h = MONTANHA['h']
    y0, y1 = TOPO + 0.04, altura_montanha(T_DO_PLATO) + 0.05
    total = TRILHA['voltas'] * 2 * math.pi
    n = 960

    def subir(rampa):
        y, pts = y0, []
        for i in range(n + 1):
            a = TRILHA['a0'] - total * i / n
            t = min(max((y - 0.05 - (TOPO - 0.35)) / h, 0.0), T_DO_PLATO)
            pts.append((a, t, y))
            meio = raio_montanha(t) - TRILHA['largura'] * 0.5
            y += rampa * meio * total / n
        return pts

    lo, hi = 0.0, 1.0
    for _ in range(60):
        g = (lo + hi) / 2
        if subir(g)[-1][2] > y1:
            hi = g
        else:
            lo = g
    pts = subir((lo + hi) / 2)
    passo = n // TRILHA['secoes']
    return [pts[i] for i in range(0, n + 1, passo)], math.degrees(math.atan((lo + hi) / 2))


def montanha(col):
    """Montanha facetada em anéis, rocha embaixo e neve em cima, com o platô do cume e a trilha
    cavada na encosta."""
    rnd = random.Random(11)
    cx, cy = MONTANHA['x'], -MONTANHA['z']
    ts = [0.0, 0.15, 0.3, 0.45, 0.6, T_DO_PLATO]
    n = 20
    verts, faces = [], []
    for k, t in enumerate(ts):
        plato = k == len(ts) - 1
        for i in range(n):
            a = 2 * math.pi * i / n + k * 0.13
            rr = raio_montanha(t) * (1 + (0 if plato else rnd.uniform(-DESVIO_DO_RAIO, DESVIO_DO_RAIO)))
            verts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr,
                          altura_montanha(t) + (0 if plato else rnd.uniform(-DESVIO_DA_ALTURA, DESVIO_DA_ALTURA))))
    zc = altura_montanha(T_DO_PLATO)
    verts.append((cx, cy, zc))
    for k in range(len(ts) - 1):
        for i in range(n):
            a0, a1 = k * n + i, k * n + (i + 1) % n
            b0, b1 = (k + 1) * n + i, (k + 1) * n + (i + 1) % n
            faces += [(a0, a1, b1), (a0, b1, b0)]
    topo = len(verts) - 1
    k = len(ts) - 1
    for i in range(n):
        faces.append((k * n + i, k * n + (i + 1) % n, topo))
    # O fundo fechado (embaixo do tampo da ilha), para o corte da trilha ter um sólido.
    fundo = len(verts)
    verts.append((cx, cy, TOPO - 0.35))
    for i in range(n):
        faces.append((fundo, (i + 1) % n, i))
    o = malha('montanha', verts, faces, 'rochaMontanha', cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()

    meio, rampa = cavar_trilha(o)
    TRILHA['meio'] = meio
    comp = sum(math.dist(a, b) for a, b in zip(meio, meio[1:]))
    print(f'TRILHA do Pico: rampa de {rampa:.1f}°, {len(meio)} pontos, {comp:.1f} m pela linha do meio')
    corte = altura_montanha(0.5)
    # O chão da trilha é o plano de cima abaixo do platô; a neve cobre o alto e o platô.
    pintar_por(o, lambda c, nn: ('neveTrilha' if c.z < zc - 0.02 else 'neve') if nn.z > 0.9 else
               ('neve' if c.z > corte + (0.6 if nn.z < 0.4 else 0) else
                ('rochaMontanhaEscura' if nn.z < 0.3 else None)))
    lib_q.flat(o)
    p = [o] + guarda_da_trilha(col)
    # Mastro com a bandeira no meio do platô.
    p.append(cyl(0.05, 1.8, (cx, cy, zc + 0.9), 'metalEscuro', verts=6))
    p.append(prism([(0, 0), (0.9, -0.25), (0, -0.55)], 0.03, (cx + 0.03, cy, zc + 1.75), 'cachecol', rot=(R(90), 0, 0)))
    col.append(col_cilindro('poste-mastro', 0.08, 1.8, (cx, cy, zc + 0.9)))
    # O começo fica um pouco para dentro do corte (a borda dele é a encosta).
    return p, o, meio[2], meio[-1], (cx, cy, zc)


def cavar_trilha(montanha_):
    """Tira da montanha o corte da trilha: um sólido varrido ao longo da espiral, do chão da trilha
    até `alto_do_corte` acima, da parede de dentro até fora da encosta (boolean exato)."""
    cx, cy = MONTANHA['x'], -MONTANHA['z']
    pts, rampa = caminho_da_trilha()
    verts, faces, meio = [], [], []
    for a, t, y in pts:
        r0 = raio_montanha(t) - TRILHA['largura']
        r1 = raio_montanha(t) + 2.5
        y1 = y + TRILHA['alto_do_corte']
        ca, sa = math.cos(a), math.sin(a)
        verts += [(cx + ca * r0, cy + sa * r0, y), (cx + ca * r1, cy + sa * r1, y),
                  (cx + ca * r1, cy + sa * r1, y1), (cx + ca * r0, cy + sa * r0, y1)]
        rm = raio_montanha(t) - TRILHA['largura'] * 0.5
        meio.append((cx + ca * rm, cy + sa * rm, y))
    for i in range(len(pts) - 1):
        a, b = 4 * i, 4 * (i + 1)
        faces += [(a, a + 1, b + 1, b), (a + 1, a + 2, b + 2, b + 1), (a + 2, a + 3, b + 3, b + 2),
                  (a + 3, a, b, b + 3)]
    m = 4 * (len(pts) - 1)
    faces += [(0, 3, 2, 1), (m, m + 1, m + 2, m + 3)]
    me = bpy.data.meshes.new('corte-trilha')
    me.from_pydata(verts, [], faces)
    me.update()
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(me)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    molde = bpy.data.objects.new('corte-trilha', me)
    bpy.context.collection.objects.link(molde)
    mod = montanha_.modifiers.new('trilha', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = molde
    bpy.context.view_layer.objects.active = montanha_
    bpy.ops.object.select_all(action='DESELECT')
    montanha_.select_set(True)
    bpy.ops.object.modifier_apply(modifier='trilha')
    bpy.data.objects.remove(molde, do_unlink=True)
    # O boolean deixa vértices quase no mesmo lugar (décimos de milímetro): juntos, sem emenda aberta.
    bm = _bm.new()
    bm.from_mesh(montanha_.data)
    _bm.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
    _bm.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.002)
    bm.to_mesh(montanha_.data)
    bm.free()
    # As faces do corte chegam sem material: tudo volta à rocha, e a pintura decide depois.
    montanha_.data.materials.clear()
    montanha_.data.materials.append(lib_q.mat('rochaMontanha'))
    for f in montanha_.data.polygons:
        f.material_index = 0
    TRILHA['pontos'] = pts
    return meio, rampa


def guarda_da_trilha(col):
    """Postinhos com corda na beira de fora (a cada 3 seções), com o guarda-corpo invisível
    (`col-guarda-trilha-*`) entre eles. O começo fica aberto (chega-se pelo caminho da ilha) e o fim
    também (a trilha entra no platô)."""
    cx, cy = MONTANHA['x'], -MONTANHA['z']
    beira = []
    for a, t, y in TRILHA['pontos']:
        rb = raio_montanha(t) - TRILHA['folga_poste']
        beira.append((cx + math.cos(a) * rb, cy + math.sin(a) * rb, y))
    p, postes = [], []
    for i in range(4, len(beira) - 3, 3):
        x, y, z = beira[i]
        postes.append((x, y, z))
        p.append(cyl(0.06, 0.8, (x, y, z + 0.38), 'poste', verts=6))
        col.append(col_cilindro('poste-trilha', 0.08, 0.9, (x, y, z + 0.4)))
    for a_, b_ in zip(postes, postes[1:]):
        topo_a, topo_b = (a_[0], a_[1], a_[2] + 0.75), (b_[0], b_[1], b_[2] + 0.75)
        sag = ((a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2, (a_[2] + b_[2]) / 2 + 0.75 - 0.08)
        p.append(tube([topo_a, sag, topo_b], [0.025] * 3, 'corda', seg=4, cap=False))
        col.append(col_entre('guarda-trilha', a_, b_, 0.1, 1.0, baixo=0.2))
    return p


# ------------------------------------------------------------------ peças
def pinheiro_nevado(variante='a', s=1.0, col=None):
    """Pinheiro com neve nas pontas dos andares. a: largo, três andares; b: fino, quatro."""
    p = [cyl(0.17 * s, 0.9 * s, (0, 0, 0.45 * s), 'tronco', verts=7)]
    if col is not None:
        # O tronco e o miolo dos andares de baixo (a folhagem de fora é macia, fica para fora).
        col.append(col_cilindro('pinheiro', 0.55 * s, 2.0 * s, (0, 0, 1.0 * s)))
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


def bloco_de_gelo(s=1.0, seed=0, col=None):
    rnd = random.Random(seed)
    w, d, h = (1.0 + rnd.uniform(-0.2, 0.2)) * s, (0.9 + rnd.uniform(-0.2, 0.2)) * s, (0.8 + rnd.uniform(-0.1, 0.3)) * s
    if col is not None:
        col.append(col_caixa('bloco-de-gelo', (w, d, h + 0.12), (0, 0, (h + 0.12) / 2)))
    return [box((w, d, h), (0, 0, h / 2), 'gelo', bevel=0.1, segs=1),
            box((w * 0.55, d * 0.55, h * 0.5), (w * 0.12, -d * 0.1, h * 0.55), 'geloClaro', bevel=0.06, segs=1),
            box((w * 1.06, d * 1.06, 0.12), (0, 0, h), 'neve', bevel=0.05, segs=1)]


def boneco_de_neve(s=1.0, col=None):
    if col is not None:
        col.append(col_cilindro('boneco', 0.55 * s, 2.3 * s, (0, 0, 1.15 * s)))
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


def painel_de_gelo(w=2.2, h=3.0, seed=0, col=None):
    """Painel de gelo de escalar: placa translúcida com agarras coloridas e neve em cima."""
    rnd = random.Random(seed)
    if col is not None:
        col.append(col_caixa('parede-gelo', (w, 0.5, h + 0.09), (0, 0, (h + 0.09) / 2)))
    p = [box((w, 0.5, h), (0, 0, h / 2), 'gelo', bevel=0.12, segs=1),
         box((w * 0.8, 0.52, h * 0.7), (rnd.uniform(-0.2, 0.2), 0, h * 0.45), 'geloClaro', bevel=0.08, segs=1),
         box((w + 0.1, 0.6, 0.18), (0, 0, h), 'neve', bevel=0.08, segs=1)]
    for i in range(7):
        x = (i % 3 - 1) * w * 0.3 + rnd.uniform(-0.15, 0.15)
        z = 0.45 + i * (h - 0.8) / 7
        p.append(uvball(0.11, (x, -0.29, z), 'agarra' if i % 2 == 0 else 'agarraAzul', seg=7, ring=4, scale=(1.2, 0.7, 0.9)))
    return p


# O iglu por dentro (fase3-08): a cúpula oca, grande para a criança andar de pé lá dentro (a
# cápsula vai a 1,8 m dos pés), com a porta em arco virada para −Y, o vestíbulo na frente dela, o
# fogareiro no fundo, dois bancos de gelo e o tapete. `raio` e `achata` são da cúpula de fora; a
# parede tem `parede` de espessura. A porta tem `porta` de meia-largura, os lados retos até
# `ombro` e o arco em cima (2,2 no alto). O vestíbulo sai `fundo` para fora da cúpula.
IGLU = dict(x=3.4, z=7.6, raio=2.9, achata=0.95, parede=0.3, porta=0.75, ombro=1.45, fundo=1.2)
# Onde ficam as coisas lá dentro (no referencial do iglu, a porta para −Y).
# O fogareiro no fundo, os bancos dos lados perto da porta e o xilofone no fundo à esquerda, longe
# o bastante dos dois: de pé junto de cada um, ele é o mais perto (`tests/colisores-do-pico.test.ts`).
DENTRO_DO_IGLU = dict(fogareiro=(0.0, 1.35), xilofone=(-1.3, 0.95), bancos=((-1.45, -0.8), (1.45, -0.8)))
# O anel de paredes que segura o corpo: de `de` a `ate` do meio, em `n` pedaços, menos os da porta.
PAREDE_DO_IGLU = dict(de=2.0, ate=3.0, n=24, altura=2.3)


def _cortar(o, cortes):
    """Diferença exata (o booleano do Blender) de cada corte, apagando os cortes depois."""
    for c in cortes:
        m = o.modifiers.new('corte', 'BOOLEAN')
        m.operation, m.solver, m.object = 'DIFFERENCE', 'EXACT', c
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(c, do_unlink=True)
    return o


def _vao_da_porta(comprimento, y, folga=0.0):
    """O vão em arco (lados retos e meia-lua em cima), deitado ao longo de Y, para cortar."""
    e = IGLU
    w, h = e['porta'] + folga, e['ombro']
    reto = box((2 * w, comprimento, h + 0.3), (0, y, (h - 0.3) / 2), 'iglu', bevel=0.0, segs=1)
    arco = cyl(w, comprimento, (0, y, h), 'iglu', verts=20, rot=(R(90), 0, 0))
    m = reto.modifiers.new('arco', 'BOOLEAN')
    m.operation, m.solver, m.object = 'UNION', 'EXACT', arco
    bpy.context.view_layer.objects.active = reto
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(arco, do_unlink=True)
    return reto


def _giro_do_banco(bx, by):
    """O giro em z que vira o +Y de um banco em (bx, by) para o meio do iglu."""
    return math.atan2(bx, -by)


def iglu(col):
    """O iglu de blocos (fase3-08): `telhado` (a cúpula oca com as juntas e o vestíbulo, que o jogo
    esmaece quando fica entre a câmera e a criança) e `dentro` (o tapete, o fogareiro e os bancos)."""
    e = IGLU
    r, sz, t = e['raio'], e['achata'], e['parede']
    ri = r - t
    # A cúpula: a esfera de fora menos a de dentro (o material de dentro vem dela), menos a metade
    # de baixo e menos o vão da porta.
    fora = uvball(r, (0, 0, 0), 'iglu', seg=28, ring=16, scale=(1, 1, sz))
    dentro = uvball(ri, (0, 0, 0), 'igluDentro', seg=28, ring=16, scale=(1, 1, (r * sz - t) / ri))
    baixo = box((2 * r + 1, 2 * r + 1, r), (0, 0, -r / 2), 'iglu', bevel=0.0, segs=1)
    cupula = _cortar(fora, [dentro, baixo, _vao_da_porta(r + 1.0, -r / 2 - 0.5)])
    telhado = [cupula]
    # As juntas dos blocos por fora: três anéis e as juntas de pé entre eles, menos na porta.
    for k, z in enumerate((0.55, 1.15, 1.75, 2.3)):
        rr = r * math.sqrt(max(0.0, 1 - (z / (r * sz)) ** 2)) + 0.012
        n = 14 - k * 3
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * (k % 2)) / n
            perto_da_porta = abs(math.atan2(math.sin(a + math.pi / 2), math.cos(a + math.pi / 2))) < 0.42
            if perto_da_porta and z < e['ombro'] + e['porta']:
                continue
            telhado.append(box((0.05, 0.05, 0.55), (math.cos(a) * rr, math.sin(a) * rr, z - 0.27), 'igluJunta',
                               bevel=0.0, rot=(0, 0, a)))
        if z > e['ombro'] + e['porta'] + 0.05:
            telhado.append(torus(rr, 0.035, (0, 0, z), 'igluJunta', seg=28, rseg=3))
    # O vestíbulo: um túnel de blocos com o mesmo arco, da cúpula para fora.
    y0 = -math.sqrt(max(0.0, r * r - (e['porta'] + t) ** 2)) + 0.25
    y1 = -r - e['fundo']
    comp = y0 - y1
    tunel = box((2 * (e['porta'] + t), comp, e['ombro'] + 0.3), (0, (y0 + y1) / 2, (e['ombro'] - 0.3) / 2),
                'iglu', bevel=0.0, segs=1)
    teto = cyl(e['porta'] + t, comp, (0, (y0 + y1) / 2, e['ombro']), 'iglu', verts=20, rot=(R(90), 0, 0))
    m = tunel.modifiers.new('teto', 'BOOLEAN')
    m.operation, m.solver, m.object = 'UNION', 'EXACT', teto
    bpy.context.view_layer.objects.active = tunel
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(teto, do_unlink=True)
    baixo = box((4, comp + 2, 2), (0, (y0 + y1) / 2, -1), 'iglu', bevel=0.0, segs=1)
    telhado.append(_cortar(tunel, [_vao_da_porta(comp + 2, (y0 + y1) / 2), baixo]))
    telhado.append(torus(e['porta'] + t / 2, 0.05, (0, y1 - 0.01, e['ombro']), 'igluJunta', seg=16, rseg=3,
                         rot=(R(90), 0, 0), arc=180))
    # Por dentro: o tapete, o fogareiro (pedras em roda, a brasa e a panela) e os bancos de gelo.
    dentro_ = [cyl(1.1, 0.03, (0, 0.1, 0.015), 'tapete', verts=20), cyl(0.7, 0.03, (0, 0.1, 0.03), 'tapeteClaro', verts=20)]
    fx, fy = DENTRO_DO_IGLU['fogareiro']
    for i in range(9):
        a = 2 * math.pi * i / 9
        dentro_.append(uvball(0.12, (fx + math.cos(a) * 0.34, fy + math.sin(a) * 0.34, 0.08), 'rochaMontanha', seg=7,
                              ring=4, scale=(1.1, 1.0, 0.75)))
    dentro_.append(uvball(0.24, (fx, fy, 0.06), 'brasa', seg=10, ring=5, scale=(1, 1, 0.35)))
    for i in range(3):
        a = 2 * math.pi * i / 3 + 0.4
        dentro_.append(cyl(0.025, 0.62, (fx + math.cos(a) * 0.22, fy + math.sin(a) * 0.22, 0.32), 'metalEscuro',
                           verts=5, rot=(math.sin(a) * 0.32, -math.cos(a) * 0.32, 0)))
    dentro_.append(cyl(0.2, 0.2, (fx, fy, 0.62), 'metalEscuro', verts=12, r2=0.17))
    dentro_.append(cyl(0.2, 0.02, (fx, fy, 0.73), 'chocolate', verts=12))
    for bx, by in DENTRO_DO_IGLU['bancos']:
        g = _giro_do_banco(bx, by)
        dentro_.append(box((1.1, 0.5, 0.42), (bx, by, 0.21), 'gelo', bevel=0.06, segs=2, rot=(0, 0, g)))
        dentro_.append(box((1.0, 0.42, 0.04), (bx, by, 0.44), 'tapeteClaro', bevel=0.02, segs=1, rot=(0, 0, g)))
    # O que segura o corpo: o anel da parede (menos a porta), os lados do vestíbulo, o fogareiro e os
    # bancos (`col-banco-N`, onde a criança pode sentar).
    w = PAREDE_DO_IGLU
    meio_r = (w['de'] + w['ate']) / 2
    larg = 2 * w['ate'] * math.tan(math.pi / w['n']) + 0.05
    fundo_ = w['ate'] - w['de']
    for i in range(w['n']):
        a = 2 * math.pi * i / w['n'] - math.pi / 2
        ca, sa = math.cos(a), math.sin(a)
        # Fora o pedaço com algum canto no corredor da porta (|x| < porta, do lado de −Y).
        cantos = [((meio_r + dr) * ca - dt * sa, (meio_r + dr) * sa + dt * ca)
                  for dr in (-fundo_ / 2, fundo_ / 2) for dt in (-larg / 2, larg / 2)]
        if any(abs(x) < e['porta'] + 0.02 and y < 0 for x, y in cantos):
            continue
        col.append(col_caixa('parede-iglu', (fundo_, larg, w['altura']), (meio_r * ca, meio_r * sa, w['altura'] / 2),
                             rot=(0, 0, a)))
    # Os lados do vestíbulo vão da boca até dentro da cúpula e cobrem a espessura dela.
    # Vão até 1,2 do meio: ali a cúpula ainda passa de 1,9 de altura, e não sobra fresta entre eles e
    # o anel onde a cabeça bateria na cúpula.
    for lado in (-1, 1):
        y_fim = -1.2
        col.append(col_caixa('parede-iglu', (0.7, y_fim - y1, w['altura']),
                             (lado * (e['porta'] + 0.35), (y_fim + y1) / 2, w['altura'] / 2)))
    col.append(col_cilindro('fogareiro', 0.46, 0.8, (fx, fy, 0.4)))
    # A frente de um `col-banco-N` é o +Y dele (o −Z no jogo, `bancosDosColisores`): girado para
    # olhar para o meio do iglu, com o comprido (1,1) ao longo do banco.
    for bx, by in DENTRO_DO_IGLU['bancos']:
        col.append(col_caixa('banco', (1.1, 0.5, 0.46), (bx, by, 0.23), rot=(0, 0, _giro_do_banco(bx, by))))
    return {'telhado': telhado, 'dentro': dentro_}


# A banda do festival de inverno (fase3-08): onde cada instrumento se perdeu (o xilofone dentro
# do iglu, o violão na beira do lago congelado, a bateria no platô do cume, do lado oposto à boca
# da trilha) e, no palco, onde ele toca (`banda-*`) e onde o pinguim músico fica (`musico-*`),
# no referencial do palco (a frente para −Y; o Floco fica no meio).
INSTRUMENTOS_DA_BANDA = ('xilofone', 'violao', 'bateria')
VIOLAO_PERDIDO = (8.6, -4.5)
BATERIA_NO_PLATO = 1.5
NO_PALCO = {'xilofone': ((-1.2, 0.3), (-1.2, 0.72)), 'violao': ((1.2, 0.3), (1.2, 0.72)),
            'bateria': ((0.0, 0.95), (0.0, 1.32))}


def ancoras_da_banda(giro_iglu, giro_palco, cume, a_boca):
    """As âncoras do iglu por dentro e da banda (pontos do jogo; a altura de cada uma)."""
    e = IGLU
    a = [('iglu-dentro', *no_mundo(0, 0, e['x'], e['z'], giro_iglu), TOPO),
         ('fogareiro', *no_mundo(*DENTRO_DO_IGLU['fogareiro'], e['x'], e['z'], giro_iglu), TOPO),
         ('instrumento-xilofone', *no_mundo(*DENTRO_DO_IGLU['xilofone'], e['x'], e['z'], giro_iglu), TOPO + 0.03),
         ('instrumento-violao', *VIOLAO_PERDIDO, TOPO)]
    cx, cy, zc = cume
    bx = cx + math.cos(a_boca + math.pi) * BATERIA_NO_PLATO
    by = cy + math.sin(a_boca + math.pi) * BATERIA_NO_PLATO
    a.append(('instrumento-bateria', bx, -by, zc + 0.02))
    for nome in INSTRUMENTOS_DA_BANDA:
        lugar, musico = NO_PALCO[nome]
        a.append((f'banda-{nome}', *no_mundo(*lugar, 2.6, -7.3, giro_palco), TOPO + 0.47))
        a.append((f'musico-{nome}', *no_mundo(*musico, 2.6, -7.3, giro_palco), TOPO + 0.47))
    return a


def no_mundo(lx, ly, x, z, giro):
    """Um ponto do referencial de uma peça (Blender, a frente para −Y) posta em (x, z) do jogo com
    `giro`, em (x, z) do jogo."""
    c, s_ = math.cos(giro), math.sin(giro)
    return x + lx * c - ly * s_, -(-z + lx * s_ + ly * c)


# Os degraus da frente do palco: o de fora (mais longe do meio) baixo, o de dentro mais alto, e o
# tablado a 0,45 (0,15 de cada vez).
DEGRAUS_DO_PALCO = ((-2.95, 0.15), (-2.65, 0.3))


def palco(col=None):
    """Palco do Floco: tablado redondo com degraus, arco de gelo, cortinas, caixas de som, o
    pedestal do microfone e um varal de bandeirinhas."""
    if col is not None:
        # O tablado se pisa (0,45, pelos degraus de 0,15 e 0,3 na frente).
        col.append(col_cilindro('palco', 2.4, 0.45, (0, 0, 0.225)))
        for y, h in DEGRAUS_DO_PALCO:
            col.append(col_caixa('degrau-palco', (1.6, 0.35, h), (0, y + 0.3, h / 2)))
        for x in (-1.85, 1.85):
            col.append(col_cilindro('poste-arco', 0.24, 2.3, (x * 2.1 / 1.85, 1.6, 0.45 + 1.15)))
            col.append(col_caixa('cortina', (0.5, 0.25, 2.3), (x, 1.45, 1.6)))
            col.append(col_caixa('caixa-de-som', (0.6, 0.6, 0.85), (x * 0.82, -0.7 if x < 0 else -0.6, 0.9)))
        col.append(col_cilindro('poste-microfone', 0.1, 1.4, (0.3, -0.6, 1.15)))
    p = [cyl(2.4, 0.45, (0, 0, 0.225), 'palco', verts=20, bevel=0.06),
         cyl(2.25, 0.04, (0, 0, 0.46), 'palcoClaro', verts=20)]
    for i in range(10):
        a = math.pi + i * math.pi / 9
        p.append(box((0.06, 0.3, 0.02), (math.cos(a) * 1.6, math.sin(a) * 1.6, 0.48), 'palco', bevel=0.0, rot=(0, 0, a)))
    # O fundo afunda 2 cm no chão: no mesmo plano do fundo do tablado, as faces piscariam.
    for y, h in DEGRAUS_DO_PALCO:
        p.append(box((1.6, 0.35, h + 0.02), (0, y + 0.3, h / 2 - 0.01), 'palcoClaro', bevel=0.03, segs=1))
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


def treno(col=None):
    """Trenó de madeira e vermelho, com os patins curvados na frente (para −Y) e a corda."""
    p = []
    if col is not None:
        col.append(col_caixa('treno', (1.0, 1.75, 0.66), (0, -0.05, 0.33)))
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


def bandeiras_da_trilha(antes, inicio, col, lado=0.95):
    """Duas bandeirinhas no começo da trilha (pontos do jogo): um mastro de cada lado do caminho,
    meio metro antes do início, com a bandeira virada para quem vem da chegada."""
    dx, dz = inicio[0] - antes[0], inicio[1] - antes[1]
    n = math.hypot(dx, dz)
    dx, dz = dx / n, dz / n
    px, pz = -dz, dx
    x0, z0 = inicio[0] - dx * 0.5, inicio[1] - dz * 0.5
    giro = angulo_para(x0, z0, antes[0], antes[1])
    p = []
    for s in (-1, 1):
        mastro = [cyl(0.045, 1.5, (0, 0, 0.75), 'poste', verts=6),
                  prism([(0, 0), (0.42, -0.12), (0, -0.26)], 0.02, (0.04, 0, 1.45), 'agarra',
                        rot=(R(90), 0, 0))]
        x, z = x0 + px * lado * s, z0 + pz * lado * s
        p += colocar(mastro, x, z, giro, y=TOPO)
        col.append(col_cilindro('poste-bandeira', 0.07, 1.5, (x, -z, TOPO + 0.75)))
    return p


# ------------------------------------------------------------------ a ilha
def ilha():
    lib_q.reset()
    col = []
    chao = base_da_ilha('pico', topo='neveSombra', praia='neve', fundo='rochaMontanhaEscura')
    mont, montanha_, pe_trilha, fim_trilha, cume = montanha(col)
    cen = []

    def montar(pecas, x, z, giro, y=TOPO):
        """Põe uma peça montada na origem (desenho e colisores dela) no lugar."""
        c = []
        objs = colocar(pecas(c), x, z, giro, y=y)
        col.extend(colocar(c, x, z, giro, y=y))
        return objs

    # Caminho de neve batida da ponte até o meio e aos lugares.
    cen.append(caminho([(12.3, 0), (6, 0), (2.8, 0.2)], 1.0, 'neveTrilha'))
    # Cada ramo numa altura um pouco diferente: faces no mesmo plano piscam (e sombreiam preto).
    porta_iglu = no_mundo(0, -IGLU['raio'] - IGLU['fundo'] - 0.6, IGLU['x'], IGLU['z'],
                          angulo_para(IGLU['x'], IGLU['z'], 3.0, 2.0))
    for k, ramo in enumerate(([(3, 0.2), (3.1, 2.0), porta_iglu], [(3, -0.2), (2.9, -3.0), (2.7, -4.6)],
                              [(2.8, 0.0), (2.6, -1.0), (pe_trilha[0], -pe_trilha[1])])):
        cen.append(caminho(ramo, 0.7, 'neveTrilha', z1=0.024 - 0.006 * k))
    # Duas bandeirinhas laranja marcam o começo da trilha, uma de cada lado (de longe, no branco).
    cen += bandeiras_da_trilha(LARGADA_DA_SUBIDA, (pe_trilha[0], -pe_trilha[1]), col)
    # Iglu (frente para o caminho), palco do Floco, parede de gelo, lago congelado.
    giro_iglu = angulo_para(IGLU['x'], IGLU['z'], 3.0, 2.0)
    c_iglu = []
    partes_do_iglu = iglu(c_iglu)
    telhado_iglu = colocar(partes_do_iglu['telhado'], IGLU['x'], IGLU['z'], giro_iglu, y=TOPO)
    cen += colocar(partes_do_iglu['dentro'], IGLU['x'], IGLU['z'], giro_iglu, y=TOPO)
    col.extend(colocar(c_iglu, IGLU['x'], IGLU['z'], giro_iglu, y=TOPO))
    giro_palco = angulo_para(2.6, -7.3, 3.0, 0.0)
    cen += montar(lambda c: palco(c), 2.6, -7.3, giro_palco)
    # Parede de gelo em degraus (três painéis lado a lado), virada para o meio da ilha.
    giro = angulo_para(-2.5, 9.4, -2.5, 4.0)
    for i, h in enumerate((2.6, 3.4, 4.2)):
        cen += montar(lambda c, h=h, i=i: painel_de_gelo(2.1, h, seed=i, col=c), -4.6 + i * 2.1, 9.4, giro)
    cen.append(box((2.1, 1.6, 0.3), (-0.4, -10.0, TOPO + 4.25), 'neve', bevel=0.1, segs=1))
    col.append(col_caixa('topo-parede', (2.1, 1.6, 0.3), (-0.4, -10.0, TOPO + 4.25)))
    cen += lago_congelado(8.0, -6.6)
    # Pinheiros nevados na volta, bonecos de neve, blocos de gelo e montinhos.
    for i, (x, z, s_, v) in enumerate(((-9.5, 5.5, 1.1, 'a'), (-10.5, 1.5, 0.95, 'b'), (-7.5, -8.5, 1.15, 'a'),
                                       (-2.0, -10.5, 1.0, 'b'), (5.5, -10.2, 0.9, 'a'), (10.4, -3.8, 0.85, 'b'),
                                       (10.0, 4.6, 1.0, 'a'), (6.2, 9.6, 1.05, 'b'), (1.0, 11.0, 0.9, 'a'),
                                       (-6.8, 10.4, 0.95, 'b'), (-11.2, -3.0, 1.0, 'a'), (8.6, 8.0, 0.8, 'b'))):
        cen += montar(lambda c, v=v, s_=s_: pinheiro_nevado(v, s_, col=c), x, z, R(37 * i))
    cen += montar(lambda c: boneco_de_neve(col=c), 6.6, 6.0, angulo_para(6.6, 6.0, 4, 0))
    # O pequeno saiu do pé da montanha (estava enterrado na encosta), para perto do palco.
    cen += montar(lambda c: boneco_de_neve(0.7, col=c), -1.6, -8.8, angulo_para(-1.6, -8.8, 2, 0))
    # O segundo saiu da frente do painel mais alto (estava onde sobe o vento do planador, fase3-09).
    for i, (x, z) in enumerate(((5.6, -4.2), (-2.7, 6.3), (9.4, -8.8), (-9.6, 7.8), (0.6, -10.2))):
        cen += montar(lambda c, i=i: bloco_de_gelo(0.9, seed=i, col=c), x, z, R(23 * i))
    montinhos = []
    for i, (x, z, rx, rz) in enumerate(((-8.5, -5.5, 1.8, 1.2), (-4.0, -8.6, 1.0, 0.6), (-6.5, 6.8, 1.4, 0.9),
                                        (9.0, -1.0, 0.0, 0.0))):
        if rx:
            montinhos.append(superellipsoid((rx * 1.4, rz * 1.4, 0.55), (x, -z, TOPO), 'neve', e1=0.8, e2=0.9, seg=10,
                                            ring=5, flat_bottom=0.0))
    cen += montinhos
    # O lampião do meio saiu do pé da montanha (a base ficava 1 m dentro da encosta).
    for x, z in ((5.0, -2.8), (5.0, 2.8), (2.2, -3.8)):
        cen += poste_lampiao(x, z)
        col.append(col_cilindro('poste-lampiao', 0.1, 2.9, (x, -z, TOPO + 1.45)))
    # O trenó no platô, ao lado da boca da trilha e virado para ela (a descida começa nele).
    meio = TRILHA['meio']
    cx, cy, zc = cume
    bx, by, _ = meio[-1]
    a_boca = math.atan2(by - cy, bx - cx)
    a_treno = a_boca - R(TRENO_NO_PLATO['desvio'])
    tx = cx + math.cos(a_treno) * TRENO_NO_PLATO['raio']
    ty = cy + math.sin(a_treno) * TRENO_NO_PLATO['raio']
    treno_ = montar(lambda c: treno(c), tx, -ty, angulo_para(tx, -ty, bx, -by), y=zc + 0.02)
    # A descida: do trenó à boca da trilha e trilha abaixo pela linha do meio, no chão dela.
    # Acaba no começo da trilha (a seção 2, a âncora `trilha-inicio`): as duas primeiras seções
    # ficam debaixo da beira da encosta.
    descida = [(tx, ty, zc)] + [meio[i] for i in range(len(meio) - 1, 2, -PASSO_DA_DESCIDA)]
    descida.append(meio[2])
    # A boca da trilha fica uns 5 cm acima do platô: a linha nunca sobe (o trenó só desce).
    for i in range(1, len(descida)):
        x, y, z = descida[i]
        descida[i] = (x, y, min(z, descida[i - 1][2]))
    extras_do_jogo = [('treno', tx, -ty, zc)]
    extras_do_jogo += [(f'treno-curva-{k}', x, -y, z) for k, (x, y, z) in enumerate(descida, 1)]
    ultimo = len(meio) - 1
    # A largada da subida: no caminho, antes das bandeirinhas (o mesmo ponto que as vira).
    extras_do_jogo.append(('subida-largada', *LARGADA_DA_SUBIDA, TOPO))
    for k, f in enumerate(PARADAS_DA_SUBIDA, 1):
        x, y, z = meio[round(ultimo * f)]
        extras_do_jogo.append((f'subida-{k}', x, -y, z))
    for k, f in enumerate(FLOCOS_DA_SUBIDA, 1):
        x, y, z = meio[round(ultimo * f)]
        extras_do_jogo.append((f'floco-{k}', x, -y, z))
    # A caverna de cristal no lugar dela: desenho, joia (some quando a criança pega), colisores com
    # `caverna-` no nome e as âncoras com `caverna-` (menos o `cristal-raro`).
    cav_nos, cav_anc, cav_col = montar_caverna()
    dx, dz = BOCA_DA_CAVERNA['x'], BOCA_DA_CAVERNA['z']
    caverna_ = colocar([o for k, v in cav_nos.items() if k != 'joia' for o in v], dx, dz, 0)
    joia_ = colocar(cav_nos['joia'], dx, dz, 0)
    for o in colocar(cav_col, dx, dz, 0):
        # O poste da placa segue os outros postes (a câmera passa: `col-cil-poste-*`).
        if o.name.startswith('col-cil-poste-'):
            o.name = o.name.replace('col-cil-poste-', 'col-cil-poste-caverna-', 1)
        elif o.name.startswith('col-cil-'):
            o.name = o.name.replace('col-cil-', 'col-cil-caverna-', 1)
        else:
            o.name = o.name.replace('col-', 'col-caverna-', 1)
        col.append(o)
    for n, x, z, y in cav_anc:
        extras_do_jogo.append((n if n == 'cristal-raro' else f'caverna-{n}', x + dx, z + dz, y))
    conferir_corredor(cen + mont, 'pico')
    # O chão que se pisa: tampo, praia e barranco, a montanha com a trilha e os montinhos de neve
    # (as manchas e os caminhos, milímetros acima, só desenham).
    col.insert(0, col_terreno(chao + [montanha_] + montinhos))
    ancoras = ancoras_padrao(
        lumis=[(5.2, 3.6), (-0.6, 4.8), (6.6, -3.4), (0.4, -9.2)], morador=(3.4, -5.1),
        extras=[('palco', 2.6, -7.3, TOPO + 0.47), ('iglu', *porta_iglu),
                ('trilha-inicio', pe_trilha[0], -pe_trilha[1], pe_trilha[2]),
                ('trilha-fim', fim_trilha[0], -fim_trilha[1], fim_trilha[2]),
                ('cume', cume[0], -cume[1], cume[2]), ('parede-de-gelo', -2.5, 8.2),
                ('topo-da-parede', -0.4, 10.0, TOPO + 4.4), ('lago-congelado', 8.0, -6.6, TOPO + 0.1),
                # O vento que sobe na frente do painel mais alto (fase3-09): com o planador, leva ao
                # alto da parede. O jogo põe o raio e a altura (`CORRENTE_DO_PICO`).
                ('corrente-de-ar', -0.9, 7.7, TOPO)]
        + extras_do_jogo + ancoras_da_banda(giro_iglu, giro_palco, (cx, cy, zc), a_boca))
    # O desenho do trenó num nó próprio, com a origem na base dele: o jogo o leva debaixo de quem
    # desce de trenó (o nome `treno` é da âncora; dois nós com o mesmo nome viravam `treno.001`).
    nos = {'chao': chao, 'montanha': mont, 'cenario': cen, 'telhado-iglu': telhado_iglu,
           'treno-desenho': (treno_, (tx, ty, zc + 0.02)), 'caverna': caverna_, 'caverna-joia': joia_}
    porto, _, dados_porto = lib_cais.deque_de_praia(**PORTO, col=col, col_caixa=col_caixa, col_cilindro=col_cilindro)
    ancoras += lib_cais.ancoras_do_porto(ancora, dados_porto)
    dados_porto['caixa_do_deque'] = lib_cais.caixa_no_jogo(porto)
    dados_porto['caixa_da_ilha'] = lib_cais.caixas_da_ilha(nos, porto)
    nos['porto'] = porto
    exportar('pico', nos, ancoras, colisores=col, porto=dados_porto)


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
