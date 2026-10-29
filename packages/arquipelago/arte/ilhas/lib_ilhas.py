"""Ajudantes das ilhas completas do Arquipélago (Blender sem tela, o mesmo `bpy` do mundo).

Reaproveita o `lib_mundo` (paleta, formas, `_juntar`) e as ilhas leves de `arte/mundo/ilhas_anel.py`
(o mesmo chão, com o mesmo contorno: a ilha completa troca a leve sem mudar de tamanho). Acrescenta:

- a paleta das três ilhas (toldos, doces, casca da Maré, pergaminho);
- peças que se repetem (árvore grande, plataforma, ponte de corda, escada em espiral, cerca);
- `ancora(nome, x, z, y)`: um nó vazio com nome fixo, onde o jogo põe morador, Lumis e pontos;
- `exportar(pid, nos, ancoras, clipes_)`: um GLB com um nó por chave, as âncoras e, se houver,
  os clipes (faixas do NLA, como o farol da Ilha do Farol);
- `conferir_corredor(objs)`: nada acima do chão no corredor da chegada da ponte;
- `col_caixa`, `col_cilindro`, `col_entre` e `col_terreno`: os nós de colisão `col-*` (invisíveis,
  sem material), que o jogo lê para montar os colisores; as peças que pisam (deque, ponte, escada,
  cerca) recebem uma lista `col` e põem ali a colisão delas, ao lado do desenho.

Referencial de cada ilha: o centro dela, y = 0 no mar, tampo plano em y = 1 (o mesmo das leves).
A chegada da ponte é o +x do jogo; o corredor é x > 5,5 e |z| < 2,5 (o jogo gira a ilha).
"""
import json
import math
import os
import random
import sys

sys.dont_write_bytecode = True
ILHAS_DIR = os.path.dirname(os.path.abspath(__file__))
ILHAS_OUT = os.environ.get('ILHAS_OUT', os.path.join(ILHAS_DIR, '..', '..', 'src', 'assets', 'ilhas'))
os.makedirs(ILHAS_OUT, exist_ok=True)
os.environ['MUNDO_OUT'] = ILHAS_OUT
sys.path.insert(0, os.path.join(ILHAS_DIR, '..', 'mundo'))

import lib_mundo  # noqa: E402
from lib_mundo import *  # noqa: E402,F401,F403
import ilhas_anel as anel  # noqa: E402
import lib_ilha  # noqa: E402

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

R = math.radians
TOPO = anel.TOPO
RAIO = anel.RAIO
RELATORIO_ILHAS = os.path.join(ILHAS_DIR, 'relatorio.json')

lib_q.PALETTE.update({
    # bosque
    'troncoGrande': ('#6e4b2c', 0.9, None, 0),
    'troncoGrandeClaro': ('#8a6038', 0.9, None, 0),
    'casca': ('#5a3d24', 0.9, None, 0),
    'ipe': ('#ff8fc4', 0.8, None, 0),
    'ipeClaro': ('#ffb7d8', 0.8, None, 0),
    'cipo': ('#5c8f3a', 0.9, None, 0),
    'folhaCipo': ('#79b84a', 0.85, None, 0),
    'tora': ('#8b5e36', 0.9, None, 0),
    'toraAnel': ('#d9b07a', 0.9, None, 0),
    'cogumeloChapeu': ('#e8574a', 0.6, None, 0),
    'cogumeloPinta': ('#fff8ee', 0.7, None, 0),
    'lagoBosque': ('#5cc6c9', 0.25, None, 0),
    'vitoriaRegia': ('#6cc46a', 0.7, None, 0),
    'cabana': ('#a5713f', 0.9, None, 0),
    'cabanaEscura': ('#875a30', 0.9, None, 0),
    'telhaMusgo': ('#5d9a4a', 0.9, None, 0),
    'placaBranca': ('#fffaf3', 0.8, None, 0),
    'cruzVerde': ('#3fb27f', 0.6, None, 0),
    # vila doce
    'calcada': ('#efe0c8', 0.9, None, 0),
    'calcadaPedra': ('#e2cdb0', 0.9, None, 0),
    'chocolate': ('#6b3f25', 0.5, None, 0),
    'chocolateClaro': ('#8a5634', 0.5, None, 0),
    'morango': ('#ff4f6a', 0.45, None, 0),
    'menta': ('#9ff0cf', 0.6, None, 0),
    'baunilha': ('#fff3cf', 0.6, None, 0),
    'casquinha': ('#e3a858', 0.7, None, 0),
    'casquinhaEscura': ('#c4883e', 0.7, None, 0),
    'pao': ('#e2a35c', 0.75, None, 0),
    'paoEscuro': ('#b8783a', 0.75, None, 0),
    'farinha': ('#fbf6ec', 0.9, None, 0),
    'madeiraDoce': ('#c98d55', 0.85, None, 0),
    'toldoRosa': ('#ff8fb8', 0.8, None, 0),
    'toldoAmarelo': ('#ffd36b', 0.8, None, 0),
    'toldoAzul': ('#7fc8f8', 0.8, None, 0),
    'toldoVerde': ('#7ee0a1', 0.8, None, 0),
    'toldoLaranja': ('#ffad5a', 0.8, None, 0),
    'toldoLilas': ('#c7a6ff', 0.8, None, 0),
    'toldoBranco': ('#fffaf5', 0.8, None, 0),
    'confeito': ('#ffffff', 0.5, None, 0),
    # recife
    'cascaTartaruga': ('#5fae7a', 0.7, None, 0),
    'cascaTartarugaEscura': ('#3f8a5c', 0.7, None, 0),
    'cascaPlaca': ('#86cc8f', 0.7, None, 0),
    'paredeConcha': ('#fff0e0', 0.8, None, 0),
    'pergaminho': ('#f6e7c1', 0.9, None, 0),
    'pergaminhoEscuro': ('#e3cf9c', 0.9, None, 0),
    'tintaMapa': ('#5a7fa8', 0.8, None, 0),
    'fitaMapa': ('#e0584f', 0.7, None, 0),
    'alga': ('#3fa86a', 0.8, None, 0),
    'algaClara': ('#6fd08a', 0.8, None, 0),
    'algaFunda': ('#2f8a5f', 0.8, None, 0),
    'coralLaranja': ('#ffa25a', 0.7, None, 0),
    'coralAmarelo': ('#ffd86b', 0.7, None, 0),
    'coralAzul': ('#7fc8f8', 0.7, None, 0),
    # O coral desbotado (fase3-03): o branco de osso, fosco, e a sombra dele nos detalhes.
    'coralDesbotado': ('#ebe6d8', 0.95, None, 0),
    'coralDesbotadoSombra': ('#cbc4b2', 0.95, None, 0),
    'rochaRecife': ('#8a96a8', 0.9, None, 0),
    'rochaRecifeEscura': ('#6c7889', 0.9, None, 0),
    'perolaLuz': ('#f4f1ff', 0.3, '#cfe8ff', 1.0),
    'cristalLuz': ('#9fe8ff', 0.2, '#7fd8ff', 1.0),
    'cascoBarco': ('#e0584f', 0.6, None, 0),
    'cascoBarcoBranco': ('#fffaf3', 0.6, None, 0),
    'deckBarco': ('#c08a5a', 0.85, None, 0),
    'cabineBarco': ('#7fc8f8', 0.7, None, 0),
    'boia': ('#ff6b5a', 0.6, None, 0),
    'bronze': ('#c8913f', 0.4, None, 0),
})


# ------------------------------------------------------------------ ponto e âncora
def P(x, z, y=TOPO):
    """Ponto do jogo (x, z) na altura y, em coordenadas do Blender."""
    return (x, -z, y)


def ancora(nome, x, z, y=TOPO):
    """Nó vazio de nome fixo (o jogo lê a posição): `chegada`, `morador`, `lumi-1`…"""
    e = bpy.data.objects.new(nome, None)
    e.empty_display_type = 'PLAIN_AXES'
    e.location = P(x, z, y)
    bpy.context.collection.objects.link(e)
    return e


def olhar_para(x, z, tx, tz):
    """Ângulo (no chão do Blender) de (x, z) do jogo para (tx, tz) do jogo."""
    return math.atan2(-tz + z, tx - x)


def colocar(objs, x, z, frente):
    """Leva uma peça montada na origem, de frente para −Y, até (x, z) do jogo, com a frente olhando
    para o ângulo `frente` (no chão do Blender)."""
    return place(objs, loc=(x, -z, 0), rot_z=frente + math.pi / 2)


# ------------------------------------------------------------------ colisão (nós col-*)
# Convenção (README): `col-terreno` vira malha de triângulos; `col-cil-*` vira cilindro (eixo no y do
# jogo, raio = metade da escala no chão, altura = escala no y); qualquer outro `col-*` vira caixa com
# a escala do nó. A forma do nó é sempre a unitária (cubo 1, cilindro de diâmetro 1): o tamanho fica
# no TRS do nó, que o exportador guarda (estes nós não passam pelo `_juntar`).
_CONTA_COL = {}


def _malha_col(tipo):
    nome = f'col-unidade-{tipo}'
    me = bpy.data.meshes.get(nome)
    if me is not None:
        return me
    bm = bmesh.new()
    if tipo == 'caixa':
        bmesh.ops.create_cube(bm, size=1)
    else:
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.5, radius2=0.5, depth=1)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    return me


def _no_col(base, tipo, escala, loc, rot):
    n = _CONTA_COL.get(base, 0) + 1
    _CONTA_COL[base] = n
    o = bpy.data.objects.new(f'col-{base}-{n}', _malha_col(tipo))
    o.scale = escala
    o.rotation_euler = rot
    o.location = loc
    bpy.context.collection.objects.link(o)
    return o


def col_caixa(base, tamanho, loc, rot=(0, 0, 0)):
    """Caixa de colisão com `tamanho` (x, y, z do Blender) centrada em `loc`."""
    return _no_col(base, 'caixa', tamanho, loc, rot)


def col_cilindro(base, r, h, loc, rot=(0, 0, 0)):
    """Cilindro de colisão (eixo z do Blender antes de `rot`), centrado em `loc`."""
    return _no_col(f'cil-{base}', 'cilindro', (2 * r, 2 * r, h), loc, rot)


def col_entre(base, a, b, r, sobra=0.0):
    """Cilindro de colisão de `a` até `b` (pontos do Blender), `sobra` a mais em cada ponta (emenda os
    pedaços de um tronco torto sem degrau)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    return col_cilindro(base, r, d.length + 2 * sobra, (a + b) / 2, d.to_track_quat('Z', 'Y').to_euler())


def col_terreno(objs):
    """`col-terreno`: cópia das malhas do chão, juntas e sem material."""
    copias = []
    for o in objs:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        copias.append(c)
    t = lib_mundo._juntar(copias, 'col-terreno')
    t.data.materials.clear()
    return t


def grupos_col(objs):
    """{grupo: quantos} dos nós `col-*` (o nome sem o número do fim), para o relatório."""
    g = {}
    for o in objs:
        base = o.name.rsplit('-', 1)[0] if o.name.rsplit('-', 1)[-1].isdigit() else o.name
        g[base] = g.get(base, 0) + 1
    return dict(sorted(g.items()))


# ------------------------------------------------------------------ chão
def _suavizar(pts, passos=4):
    """Curva que passa pelos pontos (Catmull-Rom), com `passos` pedaços por trecho."""
    if len(pts) < 3:
        return list(pts)
    ext = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for k in range(passos):
            t = k / passos
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    out.append(pts[-1])
    return out


_TRILHAS = [0]


def trilha(pts, larg, m='terraIlha', z0=TOPO - 0.02, z1=TOPO + 0.03, nome='trilha'):
    """Faixa no chão ao longo de pontos do jogo (x, z), curva suave e feita de quadriláteros (um
    polígono só, côncavo, triangulava para fora da faixa). `larg` é a meia-largura.

    Cada trilha nova fica 3 mm acima da anterior: onde duas se cruzam, as faces não ficam no mesmo
    plano (piscariam no jogo e sairiam pretas na prévia)."""
    z1 += 0.003 * _TRILHAS[0]
    _TRILHAS[0] += 1
    bl = _suavizar([(x, -z) for x, z in pts])
    n = len(bl)
    verts, faces = [], []
    for i, (x, y) in enumerate(bl):
        ax, ay = bl[max(i - 1, 0)]
        bx_, by_ = bl[min(i + 1, n - 1)]
        dx, dy = bx_ - ax, by_ - ay
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        # Pontas arredondadas: a largura afina nos dois últimos pontos.
        w = larg * (0.55 if i in (0, n - 1) else 1.0)
        verts += [(x + nx * w, y + ny * w, z1), (x - nx * w, y - ny * w, z1),
                  (x + nx * (w + 0.06), y + ny * (w + 0.06), z0), (x - nx * (w + 0.06), y - ny * (w + 0.06), z0)]
    for i in range(n - 1):
        a, b = 4 * i, 4 * (i + 1)
        faces += [(a, a + 1, b + 1, b), (a + 2, a, b, b + 2), (a + 1, a + 3, b + 3, b + 1)]
    # Tampas das duas pontas (sem elas, a ponta aberta aparece escura onde uma trilha cruza a outra).
    e = 4 * (n - 1)
    faces += [(0, 2, 3, 1), (e, e + 1, e + 3, e + 2)]
    o = malha(nome, verts, faces, m, liso=False, cima=False)
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(o.data)
    _bm.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < -0.5:
            f.normal_flip()
    bm.to_mesh(o.data)
    bm.free()
    return o


def mancha(x, z, rx, rz, m, seed=0, z0=TOPO - 0.02, z1=TOPO + 0.025, n=24, wob=0.08):
    """Manchinha orgânica deitada no tampo (clareira, lago raso, calçada)."""
    return slab(blob(x, -z, rx, rz, seed=seed, n=n, wob=wob), z0, z1, m, bevel=0.0, name='mancha', fundo=False)


# ------------------------------------------------------------------ vegetação
# O cilindro de colisão do tronco é um pouco mais fino que o desenho (que é torto e com casca): no
# deque o personagem contorna o tronco sem raspar.
TRONCO_COL = 0.85


def arvore_grande(x, z, s=1.0, variante='a', seed=0, y=TOPO, col=None, copa=None, tronco=None):
    """Árvore grande do Bosque (onde ficam as plataformas do percurso nas copas).

    a: copa larga e baixa, raízes de fora; b: alta, em andares; c: ipê rosa redondinho. Com `col`, o
    tronco ganha um cilindro de colisão por trecho (ele é torto); raízes e copa não colidem. Com
    `copa`, os blocos da copa vão para essa lista (o nó `copa-*`, que o jogo esmaece quando fica
    entre a câmera e o personagem) em vez de ficarem com o tronco; com `tronco`, o tronco vai para
    essa lista (o nó `tronco-*`, que esmaece do mesmo jeito)."""
    rnd = random.Random(seed)
    bx, by = x, -z
    p = []
    altura_tronco = {'a': 5.2, 'b': 6.6, 'c': 4.6}[variante] * s
    r = {'a': 0.75, 'b': 0.6, 'c': 0.55}[variante] * s
    # Tronco levemente torto, afinando.
    pts = [(bx, by, y - 0.2)]
    for k in range(1, 5):
        t = k / 4
        pts.append((bx + math.sin(seed + t * 2.1) * 0.25 * s * t, by + math.cos(seed * 1.7 + t * 1.6) * 0.2 * s * t,
                    y + altura_tronco * t))
    raios = [r * 1.15, r, r * 0.86, r * 0.74, r * 0.62]
    (p if tronco is None else tronco).append(tube(pts, raios, 'troncoGrande', seg=10))
    if col is not None:
        for k in range(4):
            r_col = (raios[k] + raios[k + 1]) / 2 * TRONCO_COL
            col.append(col_entre('tronco', pts[k], pts[k + 1], r_col, sobra=0.08))
    # Raízes que saem do pé.
    for k in range(5):
        a = 2 * math.pi * k / 5 + rnd.uniform(-0.3, 0.3)
        p.append(tube([(bx + math.cos(a) * r * 0.5, by + math.sin(a) * r * 0.5, y + 0.6 * s),
                       (bx + math.cos(a) * r * 1.4, by + math.sin(a) * r * 1.4, y + 0.15 * s),
                       (bx + math.cos(a) * r * 2.1, by + math.sin(a) * r * 2.1, y - 0.05)],
                      [r * 0.36, r * 0.24, r * 0.12], 'troncoGrandeClaro', seg=6))
    topo = pts[-1]
    # Os galhos lá de cima ficam com a copa (esmaecem juntos quando tapam a câmera).
    folhas = p if copa is None else copa
    if variante == 'a':
        for k in range(3):
            a = 2 * math.pi * k / 3 + seed
            galho_fim = (topo[0] + math.cos(a) * 2.0 * s, topo[1] + math.sin(a) * 2.0 * s, topo[2] + 0.6 * s)
            folhas.append(tube([(topo[0], topo[1], topo[2] - 0.8 * s), galho_fim], [r * 0.5, r * 0.25], 'troncoGrande', seg=6))
        blocos = [((0, 0, 1.3), (6.4, 6.0, 3.0), 'copaEscura'), ((1.6, 0.8, 2.2), (3.8, 3.6, 2.4), 'copa'),
                  ((-1.7, 0.5, 2.0), (3.6, 3.4, 2.2), 'copa'), ((0.2, -1.6, 2.4), (3.4, 3.2, 2.2), 'copaClara'),
                  ((0.3, 0.4, 3.2), (3.0, 3.0, 2.0), 'copaClara')]
    elif variante == 'b':
        blocos = [((0, 0, -1.2), (5.6, 5.2, 1.5), 'copaFunda'), ((0.3, -0.2, 0.2), (4.6, 4.4, 1.4), 'copaEscura'),
                  ((-0.2, 0.3, 1.4), (3.4, 3.2, 1.3), 'copa'), ((0.1, 0, 2.4), (2.0, 2.0, 1.2), 'copaClara')]
    else:
        blocos = [((0, 0, 1.0), (5.0, 4.8, 3.4), 'ipe'), ((1.1, 0.6, 1.8), (2.8, 2.6, 2.2), 'ipeClaro'),
                  ((-1.0, -0.7, 1.6), (2.8, 2.6, 2.2), 'ipeClaro'), ((0.2, 0.2, 2.6), (2.4, 2.4, 1.6), 'ipe')]
    for (dx, dy, dz), (sx, sy, sz), m in blocos:
        folhas.append(superellipsoid((sx * s, sy * s, sz * s), (topo[0] + dx * s, topo[1] + dy * s, topo[2] + dz * s),
                                     m, e1=0.75, e2=0.85, seg=12, ring=8))
    if variante == 'c':
        # Florzinhas caídas no chão em volta do ipê.
        for k in range(10):
            a = rnd.uniform(0, 2 * math.pi)
            d = rnd.uniform(1.2, 2.8) * s
            p.append(cyl(0.12, 0.02, (bx + math.cos(a) * d, by + math.sin(a) * d, y + 0.02), 'ipeClaro', verts=5))
    return p


def arvore_media(x, z, s=1.0, copa='copa', seed=0, y=TOPO, col=None, folhas=None):
    """Árvore de enfeite, menor que as do percurso (com `folhas`, a copa vai para essa lista)."""
    rnd = random.Random(seed)
    bx, by = x, -z
    p = [cyl(0.24 * s, 2.0 * s, (bx, by, y + 1.0 * s), 'tronco', verts=7, r2=0.17 * s)]
    if col is not None:
        col.append(col_cilindro('tronco', 0.21 * s, 2.0 * s, (bx, by, y + 1.0 * s)))
    f = p if folhas is None else folhas
    f.append(superellipsoid((2.6 * s, 2.5 * s, 2.2 * s), (bx, by, y + 2.7 * s), copa, e1=0.8, e2=0.9, seg=10, ring=7))
    f.append(superellipsoid((1.5 * s, 1.5 * s, 1.3 * s),
                            (bx + rnd.uniform(-0.5, 0.5) * s, by + rnd.uniform(-0.5, 0.5) * s, y + 3.6 * s),
                            'copaClara', e1=0.8, e2=0.9, seg=9, ring=6))
    return p


def moita(x, z, s=1.0, m='copaEscura', seed=0, y=TOPO):
    rnd = random.Random(seed)
    bx, by = x, -z
    p = []
    for k in range(3):
        a = 2 * math.pi * k / 3 + rnd.uniform(0, 1)
        p.append(superellipsoid((1.1 * s, 1.0 * s, 0.85 * s),
                                (bx + math.cos(a) * 0.35 * s, by + math.sin(a) * 0.35 * s, y + 0.3 * s),
                                m if k else 'copa', e1=0.8, e2=0.9, seg=8, ring=5))
    return p


def flores(x, z, raio, n, seed=0, cores=('petalaRosa', 'petalaAmarela', 'petalaBranca', 'petalaLilas'), y=TOPO):
    rnd = random.Random(seed)
    p = []
    for k in range(n):
        a = rnd.uniform(0, 2 * math.pi)
        d = raio * math.sqrt(rnd.uniform(0, 1))
        p += flor((x + math.cos(a) * d, -z - math.sin(a) * d, y), cores[k % len(cores)], seed=seed * 31 + k)
    return p


def tufos(x, z, raio, n, seed=0, y=TOPO):
    rnd = random.Random(seed)
    p = []
    for k in range(n):
        a = rnd.uniform(0, 2 * math.pi)
        d = raio * math.sqrt(rnd.uniform(0, 1))
        p.append(tufo((x + math.cos(a) * d, -z - math.sin(a) * d, y), seed=seed * 17 + k,
                      m='tufo' if k % 2 else 'tufoClaro'))
    return p


def tora(x, z, comp, rot, r=0.32, y=TOPO, col=None):
    """Tora deitada (anéis claros nas pontas)."""
    bx, by = x, -z
    p = [cyl(r, comp, (bx, by, y + r * 0.9), 'tora', verts=10, rot=(R(90), 0, rot))]
    if col is not None:
        col.append(col_cilindro('tora', r, comp, (bx, by, y + r * 0.9), (R(90), 0, rot)))
    for sgn in (-1, 1):
        dx, dy = -math.sin(rot) * comp / 2 * sgn, math.cos(rot) * comp / 2 * sgn
        p.append(cyl(r * 0.92, 0.04, (bx + dx, by + dy, y + r * 0.9), 'toraAnel', verts=10, rot=(R(90), 0, rot)))
    return p


def toco(x, z, r=0.45, h=0.55, y=TOPO, col=None):
    bx, by = x, -z
    if col is not None:
        col.append(col_cilindro('toco', r * 0.95, h, (bx, by, y + h / 2)))
    return [cyl(r, h, (bx, by, y + h / 2), 'tora', verts=10, r2=r * 0.9),
            cyl(r * 0.88, 0.04, (bx, by, y + h), 'toraAnel', verts=10)]


def cogumelo(x, z, s=1.0, y=TOPO):
    bx, by = x, -z
    p = [cyl(0.1 * s, 0.35 * s, (bx, by, y + 0.17 * s), 'cogumeloPinta', verts=6)]
    p.append(uvball(0.3 * s, (bx, by, y + 0.38 * s), 'cogumeloChapeu', seg=10, ring=5, scale=(1, 1, 0.55)))
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.4
        p.append(uvball(0.05 * s, (bx + math.cos(a) * 0.17 * s, by + math.sin(a) * 0.17 * s, y + 0.5 * s),
                        'cogumeloPinta', seg=5, ring=3, scale=(1, 1, 0.5)))
    return p


def pedra(x, z, s, m='pedra', seed=0, y=TOPO, top_m=None):
    return [rock((x, -z, y - 0.12), (1.3 * s, 1.1 * s, 0.85 * s), m, seed=seed, subdiv=1, rough=0.2, top_m=top_m)]


# ------------------------------------------------------------------ madeira, corda, construção
# Guarda-corpo invisível dos deques: pedaços retos em volta da borda, na altura dos postinhos, com um
# vão onde chega ponte, escada ou escorregador (a meia-largura deles mais uma folga, para o corpo
# passar sem raspar e sem sobrar fresta por onde cair do lado).
GUARDA_PEDACOS = 24
GUARDA_ALTURA = 0.95
GUARDA_ESPESSURA = 0.1
GUARDA_MEIO_VAO = 0.7


def plataforma(cx, cz, h, r=1.7, aberturas=(), y=TOPO, col=None):
    """Deque redondo em volta de um tronco, com postinhos (sem postes onde chega uma ponte).

    `aberturas`: ângulos (radianos, no chão do Blender) onde as pontes chegam. Com `col`: o piso
    (cilindro) e o guarda-corpo invisível, aberto nas mesmas aberturas."""
    bx, by = cx, -cz
    z = y + h
    p = [cyl(r, 0.22, (bx, by, z - 0.11), 'tabua', verts=16, bevel=0.04)]
    if col is not None:
        col.append(col_cilindro('deque', r, 0.22, (bx, by, z - 0.11)))
        rg = r - GUARDA_ESPESSURA / 2  # rente à borda: o anel livre do deque fica inteiro
        meio_vao = math.asin(min(1.0, GUARDA_MEIO_VAO / rg))
        passo = 2 * math.pi / GUARDA_PEDACOS
        for k in range(GUARDA_PEDACOS):
            a0, a1 = k * passo, (k + 1) * passo
            meio = (a0 + a1) / 2
            if any(abs(math.atan2(math.sin(meio - b), math.cos(meio - b))) < meio_vao + passo / 2
                   for b in aberturas):
                continue
            corda = 2 * rg * math.sin(passo / 2) + GUARDA_ESPESSURA
            d = rg * math.cos(passo / 2)
            col.append(col_caixa('guarda', (corda, GUARDA_ESPESSURA, GUARDA_ALTURA),
                                 (bx + math.cos(meio) * d, by + math.sin(meio) * d, z + GUARDA_ALTURA / 2),
                                 (0, 0, meio + math.pi / 2)))
    # Tábuas desenhadas por cima (sulcos) e a viga de baixo.
    for k in range(6):
        a = math.pi * k / 6
        p.append(box((2 * r * 0.96, 0.05, 0.03), (bx, by, z + 0.005), 'tabuaEscura', bevel=0.0, rot=(0, 0, a)))
    for k in range(4):
        a = math.pi / 2 * k + 0.4
        p.append(tube([(bx + math.cos(a) * 0.4, by + math.sin(a) * 0.4, z - 1.3),
                       (bx + math.cos(a) * r * 0.85, by + math.sin(a) * r * 0.85, z - 0.2)], [0.1, 0.08], 'poste', seg=5))
    for k in range(10):
        a = 2 * math.pi * k / 10
        if any(abs(math.atan2(math.sin(a - b), math.cos(a - b))) < R(30) for b in aberturas):
            continue
        p.append(cyl(0.06, 0.95, (bx + math.cos(a) * (r - 0.1), by + math.sin(a) * (r - 0.1), z + 0.47), 'poste',
                     verts=6))
        p.append(uvball(0.08, (bx + math.cos(a) * (r - 0.1), by + math.sin(a) * (r - 0.1), z + 0.96), 'corda', seg=6,
                        ring=4))
    return p


PONTE_FLECHA_POR_METRO = 0.08  # ponte curta cede pouco: a barriga inteira numa ponte de 1 m vira rampa de 50°
PONTE_TRECHO_COL = 0.6     # comprimento de cada caixa do piso de colisão (segue a barriga da ponte)
PONTE_PONTA_COL = 0.12     # o piso entra um pouco no deque (sem fresta na emenda)


def ponte_corda(a, b, flecha=0.35, largura=1.15, col=None):
    """Ponte de corda entre dois pontos do Blender (bordas das plataformas): tábuas que cedem um
    pouco no meio, dois corrimãos de corda e os amarrilhos. Com `col`: o piso em trechos retos que
    seguem a barriga (sem as frestas entre as tábuas) e uma parede baixa sob cada corrimão."""
    a, b = Vector(a), Vector(b)
    d = b - a
    comp = math.hypot(d.x, d.y)
    flecha = min(flecha, comp * PONTE_FLECHA_POR_METRO)
    giro = math.atan2(d.y, d.x)
    nx, ny = -math.sin(giro), math.cos(giro)
    n = max(3, int(comp / 0.42))
    p = []
    if col is not None:
        m = max(4, math.ceil(comp / PONTE_TRECHO_COL))

        def no_piso(t):
            c = a + d * t
            c.z -= flecha * math.sin(math.pi * t)
            return c

        for k in range(m):
            p0, p1 = no_piso(k / m), no_piso((k + 1) / m)
            trecho = p1 - p0
            incl = math.atan2(trecho.z, math.hypot(trecho.x, trecho.y))
            ini = PONTE_PONTA_COL if k == 0 else 0.03
            fim = PONTE_PONTA_COL if k == m - 1 else 0.03
            dir_ = trecho.normalized()
            meio = (p0 + p1) / 2 + dir_ * ((fim - ini) / 2)
            L = trecho.length + ini + fim
            rot = (0, -incl, giro)
            col.append(col_caixa('ponte', (L, largura, 0.1), (meio.x, meio.y, meio.z - 0.05), rot))
            for lado in (-1, 1):
                o = (largura / 2 + 0.04) * lado
                col.append(col_caixa('ponte-lado', (L, 0.08, 1.0), (meio.x + nx * o, meio.y + ny * o, meio.z + 0.5), rot))
    for i in range(n + 1):
        t = i / n
        c = a + d * t
        c.z -= flecha * math.sin(math.pi * t)
        p.append(box((0.32, largura, 0.07), (c.x, c.y, c.z - 0.035), 'tabua' if i % 2 else 'tabuaEscura', bevel=0.015,
                     segs=1, rot=(0, 0, giro)))
    for lado in (-1, 1):
        ox, oy = nx * largura / 2 * lado, ny * largura / 2 * lado
        pts = []
        for i in range(9):
            t = i / 8
            c = a + d * t
            pts.append((c.x + ox, c.y + oy, c.z + 0.95 - flecha * 0.6 * math.sin(math.pi * t)))
        p.append(tube(pts, [0.035] * len(pts), 'corda', seg=5, cap=False))
        for i in range(0, n + 1, 3):
            t = i / n
            c = a + d * t
            topo = c.z + 0.95 - flecha * 0.6 * math.sin(math.pi * t)
            base = c.z - flecha * math.sin(math.pi * t)
            p.append(tube([(c.x + ox, c.y + oy, base), (c.x + ox, c.y + oy, topo)], [0.022, 0.022], 'corda', seg=4,
                          cap=False))
    return p


def escada_espiral(cx, cz, h0, h1, r_tronco, raio, giro0=0.0, passo=0.33, y=TOPO, sentido=1, col=None):
    """Degraus de tábua, um encostado no outro, subindo em volta do tronco a `raio` do centro (por
    fora do deque, para o último degrau chegar na borda). O controlador do personagem sobe degrau.
    Com `col`, uma caixa por degrau. Devolve (objetos, ângulo do último degrau)."""
    p = []
    n = max(2, int(round((h1 - h0) / passo)))
    bx, by = cx, -cz
    arco = 0.95 / raio  # cada degrau ocupa ~0,95 de arco, um emendado no outro
    a = giro0
    for i in range(n):
        a = giro0 + sentido * i * arco
        z = y + h0 + (h1 - h0) * (i + 1) / n
        p.append(box((1.0, 1.0, 0.1), (bx + math.cos(a) * raio, by + math.sin(a) * raio, z - 0.05),
                     'tabua' if i % 2 else 'tabuaEscura', bevel=0.02, segs=1, rot=(0, 0, a)))
        if col is not None:
            col.append(col_caixa('degrau', (1.0, 1.0, 0.1), (bx + math.cos(a) * raio, by + math.sin(a) * raio, z - 0.05),
                                 (0, 0, a)))
        # Mão-francesa de cada degrau, presa no tronco.
        p.append(tube([(bx + math.cos(a) * r_tronco * 0.9, by + math.sin(a) * r_tronco * 0.9, z - 0.9),
                       (bx + math.cos(a) * (raio + 0.2), by + math.sin(a) * (raio + 0.2), z - 0.1)], [0.06, 0.045],
                      'poste', seg=4))
        if i % 2 == 0:
            ox, oy = math.cos(a) * (raio + 0.45), math.sin(a) * (raio + 0.45)
            p.append(cyl(0.045, 0.95, (bx + ox, by + oy, z + 0.47), 'poste', verts=5))
            p.append(uvball(0.07, (bx + ox, by + oy, z + 0.96), 'corda', seg=6, ring=4))
    return p, a


def cerca(pts, h=0.8, m='tabua', m_poste='poste', fechar=False, col=None):
    """Cerquinha baixa por pontos do jogo (postes e duas réguas). Com `col`, uma caixa por lado."""
    bl = [Vector((x, -z, TOPO)) for x, z in pts]
    if fechar:
        bl.append(bl[0])
    p = []
    for i in range(len(bl) - 1):
        a, b = bl[i], bl[i + 1]
        d = b - a
        L = d.length
        giro = math.atan2(d.y, d.x)
        n = max(1, int(L / 1.2))
        for k in range(n + 1):
            c = a + d * (k / n)
            p.append(box((0.12, 0.12, h), (c.x, c.y, TOPO + h / 2), m_poste, bevel=0.02, segs=1, rot=(0, 0, giro)))
        mid = (a + b) / 2
        if col is not None:
            col.append(col_caixa('cerca', (L + 0.12, 0.12, h), (mid.x, mid.y, TOPO + h / 2), (0, 0, giro)))
        for zz in (h * 0.4, h * 0.82):
            p.append(box((L, 0.06, 0.1), (mid.x, mid.y, TOPO + zz), m, bevel=0.015, segs=1, rot=(0, 0, giro)))
    return p


def caixote(x, z, s=0.8, y=TOPO, rot=0.0, m='madeiraDoce'):
    bx, by = x, -z
    p = [box((s, s, s), (bx, by, y + s / 2), m, bevel=0.04, segs=1, rot=(0, 0, rot))]
    for k in (-1, 1):
        p.append(box((s * 1.02, 0.06, 0.08), (bx, by, y + s / 2 + k * s * 0.28), 'paoEscuro', bevel=0.0,
                     rot=(0, 0, rot)))
    return p


def placa(x, z, texto_cor, rot=0.0, y=TOPO, h=1.3, w=1.0, m='placaBranca'):
    """Plaquinha num poste, virada para `rot` (frente para −y do Blender girada)."""
    bx, by = x, -z
    p = [cyl(0.06, h, (bx, by, y + h / 2), 'poste', verts=6)]
    p.append(box((w, 0.08, 0.55), (bx, by, y + h - 0.1), m, bevel=0.04, segs=1, rot=(0, 0, rot)))
    p.append(box((w * 0.7, 0.09, 0.12), (bx, by, y + h - 0.05), texto_cor, bevel=0.0, rot=(0, 0, rot)))
    p.append(box((w * 0.5, 0.09, 0.08), (bx, by, y + h - 0.22), texto_cor, bevel=0.0, rot=(0, 0, rot)))
    return p


def lampiao_poste(x, z, y=TOPO, h=2.6, m='metalEscuro'):
    """Poste com lampião (o vidro `lampiao` acende à noite)."""
    bx, by = x, -z
    # O poste nasce no topo da base (do chão, os fundos dos dois ficavam no mesmo plano).
    p = [cyl(0.07, h - 0.12, (bx, by, y + 0.12 + (h - 0.12) / 2), m, verts=8, r2=0.05),
         cyl(0.2, 0.12, (bx, by, y + 0.06), m, verts=8)]
    p.append(cyl(0.2, 0.4, (bx, by, y + h + 0.2), 'lampiao', verts=6))
    p.append(cone(0.3, 0.25, (bx, by, y + h + 0.52), m, verts=6))
    return p


def banco(x, z, rot=0.0, y=TOPO, m='madeiraDoce'):
    bx, by = x, -z
    p = [box((1.6, 0.5, 0.1), (bx, by, y + 0.48), m, bevel=0.03, segs=1, rot=(0, 0, rot))]
    ca, sa = math.cos(rot), math.sin(rot)
    p.append(box((1.6, 0.08, 0.45), (bx + sa * 0.24, by - ca * 0.24, y + 0.78), m, bevel=0.03, segs=1,
                 rot=(R(-8), 0, rot)))
    for k in (-0.65, 0.65):
        p.append(box((0.08, 0.45, 0.48), (bx + ca * k, by + sa * k, y + 0.24), 'metalEscuro', bevel=0.0,
                     rot=(0, 0, rot)))
    return p


def janela(cx, cy, cz, w, h, giro, m_moldura='acabamento', m_vidro='vidroJanela', cruz=True):
    """Janela (moldura e vidro) colada numa parede; `giro` é a direção para onde a parede olha."""
    nx, ny = math.cos(giro), math.sin(giro)
    rot = (0, 0, giro + math.pi / 2)
    p = [box((w + 0.16, 0.08, h + 0.16), (cx + nx * 0.02, cy + ny * 0.02, cz), m_moldura, bevel=0.02, segs=1, rot=rot),
         box((w, 0.1, h), (cx + nx * 0.04, cy + ny * 0.04, cz), m_vidro, bevel=0.0, rot=rot)]
    if cruz:
        # A cruz um pouco menor que o vidro e sem o fundo no plano dele (piscaria).
        p.append(box((0.05, 0.11, h - 0.02), (cx + nx * 0.055, cy + ny * 0.055, cz), m_moldura, bevel=0.0, rot=rot))
        p.append(box((w - 0.02, 0.11, 0.05), (cx + nx * 0.055, cy + ny * 0.055, cz), m_moldura, bevel=0.0, rot=rot))
    return p


def porta(cx, cy, z0, w, h, giro, m='portaNova', m_batente='batente'):
    """Porta com batente colada na parede (o vão de verdade fica no colisor do jogo)."""
    nx, ny = math.cos(giro), math.sin(giro)
    rot = (0, 0, giro + math.pi / 2)
    p = [box((w + 0.2, 0.1, h + 0.1), (cx + nx * 0.03, cy + ny * 0.03, z0 + (h + 0.1) / 2), m_batente, bevel=0.02,
             segs=1, rot=rot),
         # A folha começa 1 cm acima do batente: os fundos dos dois não ficam no mesmo plano.
         box((w, 0.12, h - 0.01), (cx + nx * 0.06, cy + ny * 0.06, z0 + 0.01 + (h - 0.01) / 2), m, bevel=0.03, segs=1,
             rot=rot)]
    ox, oy = math.cos(giro + math.pi / 2) * w * 0.32, math.sin(giro + math.pi / 2) * w * 0.32
    p.append(uvball(0.06, (cx + nx * 0.14 + ox, cy + ny * 0.14 + oy, z0 + h * 0.48), 'macaneta', seg=6, ring=4))
    return p


def toldo_listrado(cx, cy, z, w, prof, giro, cores, inclin=R(22), n=8):
    """Toldo listrado inclinado, preso na parede que olha para `giro`."""
    nx, ny = math.cos(giro), math.sin(giro)
    tx, ty = math.cos(giro + math.pi / 2), math.sin(giro + math.pi / 2)
    p = []
    larg = w / n
    for i in range(n):
        o = -w / 2 + larg * (i + 0.5)
        c = (cx + tx * o + nx * prof / 2 * math.cos(inclin), cy + ty * o + ny * prof / 2 * math.cos(inclin),
             z - prof / 2 * math.sin(inclin))
        # Listras vizinhas se sobrepõem um pouco: alternar a espessura e o comprimento tira as faces das
        # duas do mesmo plano.
        p.append(box((prof + 0.012 * (i % 2), larg * 1.01, 0.06 + 0.016 * (i % 2)), c, cores[i % len(cores)], bevel=0.0,
                     rot=(0, inclin, giro)))
        # Babado redondo na ponta de cada listra.
        bc = (cx + tx * o + nx * prof * math.cos(inclin), cy + ty * o + ny * prof * math.cos(inclin),
              z - prof * math.sin(inclin) - 0.06)
        p.append(uvball(larg * 0.5, bc, cores[i % len(cores)], seg=8, ring=4, scale=(0.35, 1, 0.6)))
    return p


# ------------------------------------------------------------------ corredor e exportação
CORREDOR = dict(x=5.5, z=2.5)


def conferir_corredor(objs, rotulo=''):
    """Erro se algo acima do chão cair no corredor da chegada (x > 5,5 e |z| < 2,5 do jogo)."""
    bpy.context.view_layer.update()
    ruins = []
    for o in objs:
        if o.type != 'MESH':
            continue
        cantos = [o.matrix_world @ Vector(c) for c in o.bound_box]
        xmax = max(c.x for c in cantos)
        ymin, ymax = min(c.y for c in cantos), max(c.y for c in cantos)
        zmax = max(c.z for c in cantos)
        zmin = min(c.z for c in cantos)
        # Copa alta por cima do caminho não atrapalha quem anda (só o que fica na altura do corpo).
        if (xmax > CORREDOR['x'] and ymin < CORREDOR['z'] and ymax > -CORREDOR['z'] and zmax > TOPO + 0.12
                and zmin < TOPO + 2.6):
            ruins.append(f'{o.name} x≤{xmax:.1f} y {ymin:.1f}..{ymax:.1f} z≤{zmax:.1f}')
    if ruins:
        raise RuntimeError(f'corredor da chegada ocupado ({rotulo}): ' + '; '.join(ruins[:8]))


def exportar(pid, nos, ancoras=(), clipes_=None, colisores=()):
    """Grava `ILHAS_OUT/pid.glb`: um nó por chave de `nos` ({nome: objs} ou {nome: (objs, pivô)}),
    as âncoras (nós vazios), os nós de colisão `col-*` (cada um com o seu TRS, sem juntar) e, com
    `clipes_`, as animações.

    `clipes_(juntos)` recebe {nome do nó: objeto} e devolve {clipe: {objeto: {prop: chaves}}}."""
    juntos = {}
    for nome, val in nos.items():
        objs, pivo = (val if isinstance(val, tuple) else (val, None))
        objs = [o for o in objs if o is not None]
        if not objs:
            continue
        juntos[nome] = lib_mundo._juntar(objs, nome, pivo)
    animado = False
    repouso = {}
    if clipes_:
        chaves = clipes_(juntos)
        for o in {o for por_obj in chaves.values() for o in por_obj}:
            l, sc = o.location.copy(), o.scale.copy()
            repouso[o.name] = {'translation': (l.x, l.z, -l.y), 'scale': (sc.x, sc.z, sc.y)}
        lib_ilha.clipes(chaves)
        for o in repouso:
            for t in bpy.data.objects[o].animation_data.nla_tracks:
                for st in t.strips:
                    st.extrapolation = 'NOTHING'
        animado = True
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(juntos.values()) + list(ancoras) + list(colisores):
        o.select_set(True)
    path = os.path.join(ILHAS_OUT, f'{pid}.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_texcoords=False, export_extras=False)
    if animado:
        bpy.context.scene.frame_current = -50
        kw.update(export_animations=True, export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True,
                  export_force_sampling=True, export_optimize_animation_size=False)
    else:
        kw.update(export_animations=False)
    bpy.ops.export_scene.gltf(**kw)
    if animado:
        lib_ilha.repouso_no_glb(path, repouso)
    tris = sum(len(p.vertices) - 2 for o in juntos.values() for p in o.data.polygons)
    kb = os.path.getsize(path) / 1024
    por_no = {n: sum(len(p.vertices) - 2 for p in o.data.polygons) for n, o in juntos.items()}
    # Objetos, não listas: o biome junta lista curta numa linha só e o relatório sairia "mal formatado".
    anc = {e.name: {'x': round(e.location.x, 2), 'y': round(e.location.z, 2), 'z': round(-e.location.y, 2)}
           for e in ancoras}
    grupos = grupos_col(colisores)
    print(f'EXPORTADO {pid}: {tris} triângulos, {kb:.0f} KB, nós {por_no}, {len(anc)} âncoras, '
          f'{len(colisores)} colisores')
    try:
        with open(RELATORIO_ILHAS) as f:
            rel = json.load(f)
    except (OSError, ValueError):
        rel = {}
    rel[pid] = {'triangulos': tris, 'kb': round(kb, 1), 'nos': por_no, 'ancoras': anc,
                'clipes': ', '.join(sorted(chaves)) if clipes_ else ''}
    if grupos:
        rel[pid]['colisores'] = grupos
    with open(RELATORIO_ILHAS, 'w') as f:
        json.dump(rel, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write('\n')
    return path


# ------------------------------------------------------------------ bacia de nadar
def profundidade_da_bacia(t, fundo, plana, fim):
    """Profundidade da bacia (abaixo do tampo) a `t` raios do meio: funda e plana até `plana`, sobe
    em curva suave e chega a zero em `fim` (fim maior que 1 passa da beira da água)."""
    if t <= plana:
        return fundo
    if t >= fim:
        return 0.0
    s = (t - plana) / (fim - plana)
    return fundo * (1 - s * s * (3 - 2 * s))


def cavar_bacia(chao_col, centro, raios, fundo, plana, fim, voltas=36, aneis=12):
    """Cava uma bacia elíptica no `col-terreno` (só na colisão: a água do desenho cobre o fundo),
    para a criança nadar: boolean exato com um molde fechado (o fundo em anéis, a parede e a tampa
    acima do tampo). O anel de fora fica um pouco acima do tampo, para o corte nunca ficar rente à
    face de cima. É a mesma conta do lago do Bosque (`bosque.py`, `bacia`)."""
    x, z = centro
    rx, rz = raios
    bm = bmesh.new()
    meio = bm.verts.new(P(x, z, TOPO - fundo))
    aneis_v = []
    for i in range(1, aneis + 1):
        t = fim * i / aneis
        y = TOPO + 0.05 if i == aneis else TOPO - profundidade_da_bacia(t, fundo, plana, fim)
        aneis_v.append([bm.verts.new(P(x + math.cos(2 * math.pi * k / voltas) * rx * t,
                                       z + math.sin(2 * math.pi * k / voltas) * rz * t, y))
                        for k in range(voltas)])
    tampa = [bm.verts.new((v.co.x, v.co.y, TOPO + 0.4)) for v in aneis_v[-1]]
    for k in range(voltas):
        k2 = (k + 1) % voltas
        bm.faces.new((meio, aneis_v[0][k2], aneis_v[0][k]))
        for a, b in zip(aneis_v, aneis_v[1:]):
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
        bm.faces.new((aneis_v[-1][k], aneis_v[-1][k2], tampa[k2], tampa[k]))
    bm.faces.new(tampa)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('molde-bacia')
    bm.to_mesh(me)
    bm.free()
    molde = bpy.data.objects.new('molde-bacia', me)
    bpy.context.collection.objects.link(molde)
    m = chao_col.modifiers.new('bacia', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    m.use_hole_tolerant = True
    m.object = molde
    bpy.context.view_layer.objects.active = chao_col
    bpy.ops.object.select_all(action='DESELECT')
    chao_col.select_set(True)
    bpy.ops.object.modifier_apply(modifier='bacia')
    bpy.data.objects.remove(molde, do_unlink=True)
    chao_col.data.materials.clear()
