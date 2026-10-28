"""Ajudantes das peças do mundo do Arquipélago Vagalume (Blender sem tela, `bpy` do PyPI).

Reaproveita, sem copiar, as formas do quarto (`community-kids/scripts/room-blender/lib_q.py`) e as
da Ilha do Farol (`docs/design/ilha-do-farol-blender/lib_ilha.py`: contorno orgânico, placa,
folha, pedra, superelipsoide). Acrescenta a paleta do jogo, a altura da ilha (cópia exata de
`src/mundo/medidas.ts`) e a exportação em VÁRIOS nós com nome (o jogo liga e desliga partes:
telhado, porta, estágios da horta, facho do farol).

Convenções: no Blender z é para cima e a frente olha para -Y; o exportador de glTF converte para
o y para cima do three.js. `g(x, z)` leva um ponto do chão do jogo (x, z) para o Blender (x, -z).
Cada arquivo fica no referencial do grupo que o desenha no jogo (veja o README).
"""
import json
import math
import os
import random
import sys

# Sem __pycache__ nas pastas do quarto e da Ilha do Farol (só lemos de lá).
sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
SAIDA = os.environ.get('MUNDO_OUT', os.path.join(HERE, '..', '..', 'src', 'assets', 'mundo'))
os.makedirs(SAIDA, exist_ok=True)

# lib_q lê ROOM_OUT na importação e lib_ilha sobrescreve com ILHA_OUT: as duas apontam para cá.
os.environ['ROOM_OUT'] = SAIDA
os.environ['ILHA_OUT'] = SAIDA
sys.path.insert(0, os.path.join(RAIZ, 'packages/community-kids/scripts/room-blender'))
sys.path.insert(0, os.path.join(RAIZ, 'docs/design/ilha-do-farol-blender'))
import lib_q  # noqa: E402
import lib_ilha  # noqa: E402
from lib_ilha import *  # noqa: E402,F401,F403  (box, cyl, tube, blob, slab, leaf, rock, superellipsoid…)

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

R = math.radians

# Paleta do Arquipélago (as cores que o jogo já usava, com um tom de luz e um de sombra).
# (cor, rugosidade, emissão, força). O jogo acha os materiais pelo NOME. Os que acendem à noite
# (vidros, lampião, lanterna, lâmpada do farol) saem com força 1: o jogo regula o brilho.
lib_q.PALETTE.update({
    # chão
    'grama': ('#7dbb5a', 0.95, None, 0),
    'gramaEscura': ('#6fae4f', 0.95, None, 0),
    'gramaClara': ('#93c96a', 0.95, None, 0),
    'tufo': ('#5fa346', 0.9, None, 0),
    'tufoClaro': ('#8ccc5e', 0.9, None, 0),
    'areia': ('#e8d6a3', 0.95, None, 0),
    'areiaMolhada': ('#c9b37c', 0.9, None, 0),
    'areiaFunda': ('#b49c66', 0.9, None, 0),
    'espuma': ('#ffffff', 0.6, '#ffffff', 0.15),
    'pedra': ('#9aa0aa', 0.9, None, 0),
    'pedraClara': ('#b8bdc6', 0.9, None, 0),
    'pedraEscura': ('#7b818c', 0.9, None, 0),
    'pedraCaminho': ('#d2cabb', 0.9, None, 0),
    'pedraCaminhoEscura': ('#bfb6a5', 0.9, None, 0),
    'musgo': ('#6fae4f', 0.95, None, 0),
    'petalaBranca': ('#fff8ee', 0.8, None, 0),
    'petalaRosa': ('#ff9cc2', 0.8, None, 0),
    'petalaAmarela': ('#ffd84f', 0.8, None, 0),
    'petalaLilas': ('#b99cff', 0.8, None, 0),
    'miolo': ('#f2a33a', 0.8, None, 0),
    # árvores
    'tronco': ('#7c5836', 0.9, None, 0),
    'troncoClaro': ('#96693f', 0.9, None, 0),
    'copa': ('#58b05a', 0.85, None, 0),
    'copaEscura': ('#3f9a4f', 0.85, None, 0),
    'copaFunda': ('#2f8a5f', 0.85, None, 0),
    'copaClara': ('#6cc46a', 0.85, None, 0),
    'fruta': ('#ff6b5a', 0.6, None, 0),
    # casa
    'parede': ('#fbe7d2', 0.9, None, 0),
    'paredeSombra': ('#f0d6bb', 0.9, None, 0),
    'acabamento': ('#fffaf3', 0.8, None, 0),
    'batente': ('#8a5a33', 0.8, None, 0),
    'portaNova': ('#c58b52', 0.7, '#ffc93c', 0.25),
    'macaneta': ('#e8b23a', 0.35, None, 0),
    'telhado': ('#e0584f', 0.8, None, 0),
    'telhadoSombra': ('#c94a43', 0.8, None, 0),
    'tijolo': ('#c8714e', 0.9, None, 0),
    'alicerce': ('#b9b3aa', 0.9, None, 0),
    'deque': ('#c08a5a', 0.85, None, 0),
    'dequeEscuro': ('#a8754a', 0.85, None, 0),
    'vidroJanela': ('#bfe3f0', 0.15, '#ffd27a', 1.0),
    'floreira': ('#5b8fd6', 0.8, None, 0),
    'lampiao': ('#fff3c4', 0.4, '#ffd27a', 1.0),
    'metalEscuro': ('#4a4f57', 0.5, None, 0),
    # horta
    'madeiraCanteiro': ('#9a6b41', 0.85, None, 0),
    'madeiraCanteiroEscura': ('#7c5836', 0.85, None, 0),
    'terra': ('#7a5435', 0.98, None, 0),
    'terraGrao': ('#5f3f26', 0.98, None, 0),
    'broto': ('#7fd06a', 0.8, None, 0),
    'folhaAlface': ('#8fdc6a', 0.75, None, 0),
    'folhaAlfaceEscura': ('#5fb84e', 0.75, None, 0),
    'caule': ('#4f9a45', 0.8, None, 0),
    'folhaTomate': ('#4f9f4a', 0.8, None, 0),
    'tomate': ('#e0584f', 0.45, '#e0584f', 0.12),
    'tomateVerde': ('#9ccf5a', 0.6, None, 0),
    'estaca': ('#c9a06a', 0.9, None, 0),
    'folhaMilho': ('#6cbf4e', 0.8, None, 0),
    'milho': ('#f2c94c', 0.55, '#f2c94c', 0.12),
    'palha': ('#b7d477', 0.8, None, 0),
    'cabelo': ('#d9a35a', 0.9, None, 0),
    'semente': ('#e9d29a', 0.7, None, 0),
    # bancada (projeto azul)
    'holograma': ('#5aa9ff', 0.3, '#5aa9ff', 0.9),
    'hologramaAresta': ('#a9d4ff', 0.3, '#7fc0ff', 2.2),
    'projetor': ('#3c4250', 0.5, None, 0),
    'projetorLuz': ('#7fc0ff', 0.3, '#5aa9ff', 1.6),
    # farol
    'farolVermelho': ('#e0584f', 0.6, None, 0),
    'farolBranco': ('#ffffff', 0.7, None, 0),
    'farolMarinho': ('#34507e', 0.55, None, 0),
    'farolPedra': ('#8d929c', 0.9, None, 0),
    'farolPedraClara': ('#a8adb6', 0.9, None, 0),
    'vidroFarol': ('#cfe9f5', 0.15, '#ffe9a0', 1.0),
    'lampadaFarol': ('#fff3b0', 0.3, '#ffd84f', 1.0),
    'fachoFarol': ('#fff1a8', 0.5, '#fff1a8', 0.6),
    # píer e pontes
    'tabua': ('#b98657', 0.85, None, 0),
    'tabuaEscura': ('#a8754a', 0.85, None, 0),
    'madeiraPonte': ('#b07c4f', 0.85, None, 0),
    'poste': ('#7c5836', 0.9, None, 0),
    'corda': ('#d8b57a', 0.95, None, 0),
    'lanterna': ('#fff3c4', 0.4, '#ffd27a', 1.0),
    # ilhas do anel
    'neve': ('#f4f7fb', 0.8, None, 0),
    'neveSombra': ('#e8eef5', 0.8, None, 0),
    'rochaMontanha': ('#8fa3b8', 0.9, None, 0),
    'rochaMontanhaEscura': ('#71859b', 0.9, None, 0),
    'pinheiro': ('#2f8a5f', 0.85, None, 0),
    'terraIlha': ('#8a6a4a', 0.95, None, 0),
    'terraIlhaEscura': ('#6f5339', 0.95, None, 0),
    'casinhaRosa': ('#ffd6e5', 0.85, None, 0),
    'casinhaCreme': ('#fff1c9', 0.85, None, 0),
    'casinhaAzul': ('#d9f2ff', 0.85, None, 0),
    'cupulaRosa': ('#ff8fb8', 0.6, None, 0),
    'cupulaLaranja': ('#f2a541', 0.6, None, 0),
    'cupulaAzul': ('#7fc8f8', 0.6, None, 0),
    'doceBranco': ('#fffaf5', 0.6, None, 0),
    'doceVermelho': ('#ff5f7a', 0.5, None, 0),
    'doceVerde': ('#7ee0a1', 0.5, None, 0),
    'lagoa': ('#4fc3d9', 0.25, None, 0),
    'lagoaFunda': ('#2e9fc0', 0.25, None, 0),
    'coral': ('#ff8a7a', 0.7, None, 0),
    'coralRosa': ('#ffb3c7', 0.7, None, 0),
    'coralLilas': ('#c79bff', 0.7, None, 0),
    'concha': ('#fff0e0', 0.6, None, 0),
    'rochaVulcao': ('#8a5a44', 0.9, None, 0),
    'rochaVulcaoEscura': ('#6c4434', 0.9, None, 0),
    'lava': ('#ff7a3d', 0.4, '#ff5a1f', 0.8),
    'samambaia': ('#4fa64a', 0.85, None, 0),
    'ovoDino': ('#f6efd9', 0.7, None, 0),
    'pintaDino': ('#7fbf6a', 0.7, None, 0),
    'osso': ('#f2ead6', 0.7, None, 0),
    'nuvem': ('#ffffff', 0.9, None, 0),
    'nuvemSombra': ('#e9eef8', 0.9, None, 0),
    'casaArvore': ('#f3c26b', 0.85, None, 0),
    'telhadoArvore': ('#e0498f', 0.8, None, 0),
    'balanço': ('#d8b57a', 0.9, None, 0),
})
lib_q.ALPHA.update({'fachoFarol': 0.35, 'holograma': 0.32, 'espuma': 0.75})


# ---------------------------------------------------------------- altura da ilha (medidas.ts)
NIVEL_DA_AGUA = 0
ALTURA_DA_TERRA = 1
FUNDO_DO_MAR = -3.5
RAIO_DO_GRAMADO = 24
RAIO_DA_PRAIA = 29
RAIO_DO_RASO = 36
CENTRO_DA_CASA = (0, -4)
QUARTO = dict(largura=12, fundo=8, altura=4)
PORTA = dict(x=2.5, largura=2.2, altura=3)
HORTA = dict(x=10.5, z=1, colunas=3, linhas=2, passo=1.7)
BANCADA = (10, -7)
FAROL = (-12, -13)
PIER = dict(x=-5, z=27, comprimento=10)
RAIO_DO_ANEL = 82
RAIO_DA_ILHA_DO_ANEL = 13
# As árvores da ilha central: (x, z, escala), as mesmas de ilha-central.tsx.
ARVORES = [(-9, 4, 1.2), (-14, -3, 1), (-16, 6, 1.3), (-6, 12, 1.1), (6, 14, 1.2), (15, 10, 1),
           (17, -10, 1.3), (4, -16, 1.1), (-4, -17, 1), (-19, -6, 1.2), (12, 16, 0.9), (-12, 15, 1)]


def suave(a, b, t):
    x = max(0.0, min(1.0, (t - a) / (b - a)))
    return x * x * (3 - 2 * x)


def irregularidade(angulo):
    return 1 + 0.06 * math.sin(angulo * 3 + 1) + 0.04 * math.sin(angulo * 7 + 2)


def raio_efetivo(x, z):
    return math.hypot(x, z) / irregularidade(math.atan2(z, x))


def peso_do_plano(x, z):
    casa = max(abs(x - CENTRO_DA_CASA[0]) - 9, abs(z - CENTRO_DA_CASA[1]) - 8, 0)
    horta = math.hypot(x - HORTA['x'], z - HORTA['z']) - 5
    bancada = math.hypot(x - BANCADA[0], z - BANCADA[1]) - 3
    d = min(casa, max(horta, 0), max(bancada, 0))
    return 1 - suave(0, 4, d)


def altura(x, z):
    """Altura do chão da ilha central em (x, z) do jogo: cópia exata de `alturaDaIlha`."""
    r = raio_efetivo(x, z)
    if r < RAIO_DO_GRAMADO:
        ondulado = ALTURA_DA_TERRA + 0.35 * math.sin(x * 0.23) * math.cos(z * 0.19)
        p = peso_do_plano(x, z)
        alto = ondulado * (1 - p) + ALTURA_DA_TERRA * p
        return alto + (ALTURA_DA_TERRA * 0.15 - 0.15) * suave(RAIO_DO_GRAMADO - 3, RAIO_DO_GRAMADO, r)
    if r < RAIO_DA_PRAIA:
        return ALTURA_DA_TERRA + (0.25 - ALTURA_DA_TERRA) * suave(RAIO_DO_GRAMADO, RAIO_DA_PRAIA, r)
    if r < RAIO_DO_RASO:
        return 0.25 + (FUNDO_DO_MAR - 0.25) * suave(RAIO_DA_PRAIA, RAIO_DO_RASO, r)
    return FUNDO_DO_MAR


def no_chao(x, z, dy=0.0):
    """Ponto do jogo (x, z) já pousado no chão, em coordenadas do Blender."""
    return (x, -z, altura(x, z) + dy)


# ---------------------------------------------------------------- formas
def malha(nome, verts, faces, m, materiais=None, liso=False, cima=True):
    """Malha crua a partir de listas (vértices do Blender, faces por índice).

    `cima=True` deixa as faces viradas para cima (chão, pétala, espuma)."""
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    if cima:
        bm = bmesh.new()
        bm.from_mesh(me)
        for f in bm.faces:
            f.normal_update()
            if f.normal.z < 0:
                f.normal_flip()
        bm.to_mesh(me)
        bm.free()
        me.update()
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(lib_q.mat(m))
    for extra in materiais or []:
        o.data.materials.append(lib_q.mat(extra))
    for p in o.data.polygons:
        p.use_smooth = liso
    return o


def duplicar(o):
    c = o.copy()
    c.data = o.data.copy()
    bpy.context.collection.objects.link(c)
    return c


def pintar_por(o, regra):
    """Troca o material de cada face: `regra(centro, normal)` devolve a chave da paleta ou None."""
    nomes = [m.name for m in o.data.materials]
    for p in o.data.polygons:
        chave = regra(o.matrix_world @ p.center, p.normal)
        if not chave:
            continue
        if chave not in nomes:
            o.data.materials.append(lib_q.mat(chave))
            nomes.append(chave)
        p.material_index = nomes.index(chave)
    return o


def tufo(base, altura_=0.42, seed=0, m='tufo', laminas=7):
    """Tufo de capim: lâminas finas dobradas, cada uma de 2 triângulos."""
    rnd = random.Random(seed)
    verts, faces = [], []
    bx, by, bz = base
    for k in range(laminas):
        a = 2 * math.pi * k / laminas + rnd.uniform(-0.4, 0.4)
        inc = rnd.uniform(0.3, 0.7)
        h = altura_ * rnd.uniform(0.7, 1.15)
        w = 0.07
        ca, sa = math.cos(a), math.sin(a)
        px, py = -sa, ca
        i = len(verts)
        verts += [(bx + px * w, by + py * w, bz - 0.02), (bx - px * w, by - py * w, bz - 0.02),
                  (bx + ca * inc * h, by + sa * inc * h, bz + h), (bx + ca * 0.04, by + sa * 0.04, bz + h * 0.35)]
        faces += [(i, i + 3, i + 2), (i + 3, i + 1, i + 2)]
    return malha('tufo', verts, faces, m, liso=True, cima=False)


def flor(base, cor, seed=0, r=0.17, haste=0.22):
    """Florzinha de cinco pétalas com miolo, numa haste curta."""
    rnd = random.Random(seed)
    bx, by, bz = base
    z = bz + haste
    p = [tube([(bx, by, bz - 0.02), (bx + rnd.uniform(-0.02, 0.02), by, z)], [0.012, 0.01], 'caule', seg=4, cap=False)]
    verts, faces = [(bx, by, z + 0.01)], []
    n = 10
    rot = rnd.uniform(0, math.pi)
    for i in range(n):
        a = rot + 2 * math.pi * i / n
        rr = r if i % 2 == 0 else r * 0.45
        verts.append((bx + math.cos(a) * rr, by + math.sin(a) * rr, z + (0.02 if i % 2 == 0 else 0.005)))
    for i in range(n):
        faces.append((0, 1 + i, 1 + (i + 1) % n))
    p.append(malha('flor', verts, faces, cor, liso=True))
    # Miolo: leque baixinho de seis triângulos (uma bolinha custaria 80).
    mv = [(bx, by, z + 0.045)] + [(bx + math.cos(2 * math.pi * i / 6) * r * 0.32,
                                   by + math.sin(2 * math.pi * i / 6) * r * 0.32, z + 0.025) for i in range(6)]
    p.append(malha('miolo', mv, [(0, 1 + i, 1 + (i + 1) % 6) for i in range(6)], 'miolo'))
    return p


# ---------------------------------------------------------------- exportação
def _contar(objs):
    return sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)


def _juntar(objs, nome, pivo=None):
    objs = [o for o in objs if o is not None]
    o = lib_q.join(objs, nome) if len(objs) > 1 else objs[0]
    if len(objs) == 1:
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.name = nome
    o.data.name = nome
    if pivo is not None:
        # O nó fica no pivô (dobradiça da porta, centro do facho): o jogo gira em volta dele.
        pv = Vector(pivo)
        for v in o.data.vertices:
            v.co -= pv
        o.location = pv
    return o


# (o `import *` de lib_ilha troca o HERE, então o caminho sai do próprio arquivo)
RELATORIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'relatorio.json')


def exportar(pid, nos):
    """Grava `SAIDA/pid.glb` com um nó por chave de `nos`.

    `nos` = {nome: [objetos]} ou {nome: ([objetos], pivô)}. Cada nó vira UMA malha (um nó com
    vários materiais vira várias primitivas). Os nomes dos nós e dos materiais são o contrato com
    o jogo (README)."""
    juntos = []
    for nome, val in nos.items():
        objs, pivo = (val if isinstance(val, tuple) else (val, None))
        juntos.append(_juntar(list(objs), nome, pivo))
    bpy.ops.object.select_all(action='DESELECT')
    for o in juntos:
        o.select_set(True)
    path = os.path.join(SAIDA, f'{pid}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_texcoords=False,
                              export_animations=False, export_extras=False)
    tris = _contar(juntos)
    kb = os.path.getsize(path) / 1024
    por_no = {o.name: _contar([o]) for o in juntos}
    print(f'EXPORTADO {pid}: {tris} triângulos, {kb:.0f} KB, nós {por_no}')
    try:
        with open(RELATORIO) as f:
            rel = json.load(f)
    except (OSError, ValueError):
        rel = {}
    rel[pid] = {'triangulos': tris, 'kb': round(kb, 1), 'nos': por_no}
    with open(RELATORIO, 'w') as f:
        json.dump(rel, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write('\n')
    return path
