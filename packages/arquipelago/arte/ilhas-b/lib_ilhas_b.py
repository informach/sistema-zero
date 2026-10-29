"""Ajudantes da segunda metade das ilhas completas (Pico Gelado, Vale dos Dinos, Ilha das Nuvens e
o alto do Farol). Blender sem tela, o mesmo `bpy` do mundo.

Reaproveita, sem copiar, o `lib_mundo` (paleta, formas, `_juntar`) e as ilhas leves de
`arte/mundo/ilhas_anel.py` (o mesmo chão com o mesmo contorno e a mesma semente: a ilha completa
troca a leve sem mudar de tamanho). Acrescenta:

- a paleta destas ilhas (gelo, palco, observatório, tear, balão, a sala da lanterna);
- `ancora(nome, x, z, y)`: nó vazio de nome fixo onde o jogo põe morador, Lumis e pontos;
- `exportar(pid, nos, ancoras, clipes_)`: um GLB com um nó por chave, as âncoras e, se houver,
  os clipes (faixas do NLA com o nome do clipe, como o farol da Ilha do Farol);
- `conferir_corredor(objs)`: nada na altura do corpo no corredor da chegada da ponte.

Referencial de cada ilha: o centro dela, y = 0 no mar, tampo plano em y = 1 (o mesmo das leves; a
Ilha das Nuvens fica num grupo a y = 7 no jogo). A chegada da ponte é o +x do jogo; o corredor é
x > 5,5 e |z| < 2,5 (o jogo gira a ilha). O alto do Farol é uma sala: centro no meio do piso,
y = 0 no piso.
"""
import json
import math
import os
import random
import sys

sys.dont_write_bytecode = True
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA_ILHAS = os.environ.get('ILHAS_OUT', os.path.join(AQUI, '..', '..', 'src', 'assets', 'ilhas'))
os.makedirs(SAIDA_ILHAS, exist_ok=True)
os.environ['MUNDO_OUT'] = SAIDA_ILHAS
sys.path.insert(0, os.path.join(AQUI, '..', 'mundo'))

import lib_mundo  # noqa: E402
from lib_mundo import *  # noqa: E402,F401,F403
import ilhas_anel as anel  # noqa: E402
import lib_ilha  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

R = math.radians
TOPO = anel.TOPO
RAIO = anel.RAIO
RELATORIO_B = os.path.join(AQUI, 'relatorio.json')

lib_q.PALETTE.update({
    # pico
    'gelo': ('#a9e4f7', 0.15, None, 0),
    'geloClaro': ('#d6f4ff', 0.15, None, 0),
    'geloFundo': ('#6fc3e6', 0.2, None, 0),
    'agarra': ('#ff8a5a', 0.6, None, 0),
    'agarraAzul': ('#5b8fd6', 0.6, None, 0),
    # Neve batida, um cinza-azulado mais fundo que a neve (#e8eef5): com #e2e7ef o caminho sumia de dia.
    'neveTrilha': ('#c3cddb', 0.9, None, 0),
    'iglu': ('#f7fbff', 0.7, None, 0),
    'igluJunta': ('#d2e4f2', 0.8, None, 0),
    'trenoVermelho': ('#e0584f', 0.5, None, 0),
    'trenoMadeira': ('#c08a5a', 0.85, None, 0),
    'patimTreno': ('#4a4f57', 0.4, None, 0),
    'palco': ('#a8754a', 0.85, None, 0),
    'palcoClaro': ('#c08a5a', 0.85, None, 0),
    'cortina': ('#3f6fc4', 0.85, None, 0),
    'bandeirinhaA': ('#ff8fb8', 0.8, None, 0),
    'bandeirinhaB': ('#ffd36b', 0.8, None, 0),
    'bandeirinhaC': ('#7fc8f8', 0.8, None, 0),
    'cachecol': ('#e0584f', 0.85, None, 0),
    'nota': ('#34507e', 0.6, None, 0),
    # vale
    'areiaEscavacao': ('#dcc38f', 0.95, None, 0),
    'areiaEscavacaoFunda': ('#c4a774', 0.95, None, 0),
    'samambaiaClara': ('#6cc46a', 0.85, None, 0),
    'samambaiaFunda': ('#2f8a5f', 0.85, None, 0),
    'cavalinha': ('#7fbf4a', 0.85, None, 0),
    'pedraObservatorio': ('#b9b3aa', 0.9, None, 0),
    'pedraObservatorioEscura': ('#9a948b', 0.9, None, 0),
    'madeiraObservatorio': ('#8a5a33', 0.85, None, 0),
    'cupulaObservatorio': ('#34507e', 0.5, None, 0),
    'cupulaFresta': ('#1f2c45', 0.6, None, 0),
    'lunetaLatao': ('#c8913f', 0.35, None, 0),
    'estrela': ('#ffd84f', 0.5, '#ffd84f', 0.4),
    'pintaDinoLaranja': ('#ffad5a', 0.7, None, 0),
    'pintaDinoAzul': ('#7fc8f8', 0.7, None, 0),
    'cordaEscavacao': ('#e8b23a', 0.9, None, 0),
    'pincel': ('#c8714e', 0.8, None, 0),
    # nuvens
    'nuvemPlataforma': ('#ffffff', 0.9, None, 0),
    'nuvemAzulada': ('#dfe9fb', 0.9, None, 0),
    'madeiraTear': ('#b07c4f', 0.85, None, 0),
    'madeiraTearEscura': ('#8a5a33', 0.85, None, 0),
    'fio1': ('#ff5f5f', 0.6, '#ff5f5f', 0.15),
    'fio2': ('#ffa04f', 0.6, '#ffa04f', 0.15),
    'fio3': ('#ffd84f', 0.6, '#ffd84f', 0.15),
    'fio4': ('#6cd06a', 0.6, '#6cd06a', 0.15),
    'fio5': ('#5aa9ff', 0.6, '#5aa9ff', 0.15),
    'fio6': ('#b07cff', 0.6, '#b07cff', 0.15),
    'balaoA': ('#ff8fb8', 0.7, None, 0),
    'balaoB': ('#fff3cf', 0.7, None, 0),
    'balaoC': ('#7fc8f8', 0.7, None, 0),
    'cesta': ('#c49255', 0.9, None, 0),
    'cestaEscura': ('#9c6c38', 0.9, None, 0),
    'chama': ('#ffb347', 0.4, '#ff9a2e', 1.0),
    'ninho': ('#c9a26a', 0.95, None, 0),
    'ninhoEscuro': ('#a07c48', 0.95, None, 0),
    'penaVermelha': ('#ff4f4f', 0.7, None, 0),
    'penaAzul': ('#4f8fff', 0.7, None, 0),
    'penaAmarela': ('#ffd84f', 0.7, None, 0),
    # alto do farol
    'paredeFarol': ('#fff6ea', 0.85, None, 0),
    'paredeFarolSombra': ('#f0e2cc', 0.85, None, 0),
    'pisoFarol': ('#b98657', 0.85, None, 0),
    'pisoFarolEscuro': ('#a8754a', 0.85, None, 0),
    'ferroFarol': ('#34507e', 0.5, None, 0),
    'ferroFarolEscuro': ('#26395a', 0.5, None, 0),
    'janelaFarol': ('#cfe9f5', 0.1, None, 0),
    'lenteFarol': ('#e6f7ff', 0.1, '#fff1b0', 0.3),
    'luz': ('#fff3b0', 0.3, '#ffd84f', 1.0),
    'latao': ('#d9a440', 0.35, None, 0),
    'papel': ('#fffaf0', 0.9, None, 0),
    'papelVelho': ('#f6e7c1', 0.9, None, 0),
    'rabisco': ('#5a7fa8', 0.8, None, 0),
    'rabiscoVermelho': ('#e0584f', 0.8, None, 0),
    'cortica': ('#c8956a', 0.95, None, 0),
    'mesaFarol': ('#8a5a33', 0.85, None, 0),
    'caneca': ('#5b8fd6', 0.6, None, 0),
    'tapete': ('#e0584f', 0.95, None, 0),
    'tapeteClaro': ('#ffd36b', 0.95, None, 0),
    'livro1': ('#3fb27f', 0.8, None, 0),
    'livro2': ('#e0584f', 0.8, None, 0),
    'livro3': ('#5b8fd6', 0.8, None, 0),
})
lib_q.ALPHA.update({'janelaFarol': 0.3, 'lenteFarol': 0.55, 'gelo': 0.85, 'geloClaro': 0.9})


# ------------------------------------------------------------------ colisão (nós col-*)
# A convenção do README de `arte/ilhas`: `col-terreno` vira malha de triângulos, `col-cil-*` cilindro
# em pé e o resto caixa. `col_caixa`, `col_cilindro` e `grupos_col` vêm do `lib_mundo`.
def col_terreno(objs):
    """`col-terreno`: cópia das malhas do chão (e do que se pisa como chão), juntas e sem material."""
    copias = []
    for o in objs:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        copias.append(c)
    t = lib_mundo._juntar(copias, 'col-terreno')
    t.data.materials.clear()
    return t


def col_entre(base, a, b, larg, alto, baixo=0.0):
    """Caixa em pé de `a` até `b` (pontos do Blender, a altura de cada um é o chão ali): `larg` de
    espessura, de `baixo` abaixo do chão mais baixo até `alto` acima do mais alto (guarda-corpo)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    comp = math.hypot(dx, dy)
    z0 = min(a[2], b[2]) - baixo
    z1 = max(a[2], b[2]) + alto
    return col_caixa(base, (comp, larg, z1 - z0), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (z0 + z1) / 2),
                     rot=(0, 0, math.atan2(dy, dx)))


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


def ancoras_padrao(lumis, morador, extras=()):
    """`chegada` na borda do +x, `morador`, `lumi-1`..`lumi-4` e os pontos da ilha."""
    a = [ancora('chegada', RAIO - 1.5, 0.0)]
    a.append(ancora('morador', *morador))
    for i, (x, z) in enumerate(lumis, 1):
        a.append(ancora(f'lumi-{i}', x, z))
    for nome, x, z, *y in extras:
        a.append(ancora(nome, x, z, y[0] if y else TOPO))
    return a


def angulo_para(x, z, tx, tz):
    """Giro no chão do Blender para a frente (−Y) de uma peça em (x, z) olhar para (tx, tz)."""
    return math.atan2(-(tz - z), tx - x) + math.pi / 2


def colocar(objs, x, z, giro, y=0.0, escala=1.0):
    """Leva uma peça montada na origem do Blender até (x, z) do jogo, girada `giro` no chão."""
    return lib_ilha.place(objs, loc=(x, -z, y), rot_z=giro, scale=escala)


# ------------------------------------------------------------------ chão
def faixa(pts, larg, m, z0, z1, nome='faixa'):
    """Faixa deitada ao longo de pontos do Blender (x, y, z), cada ponto com a sua altura: trilhas
    que sobem a montanha. `larg` é a meia-largura. Feita de quadriláteros, com laterais."""
    n = len(pts)
    verts, faces = [], []
    for i, (x, y, z) in enumerate(pts):
        ax, ay, _ = pts[max(i - 1, 0)]
        bx, by, _ = pts[min(i + 1, n - 1)]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        verts += [(x + nx * larg, y + ny * larg, z + z1), (x - nx * larg, y - ny * larg, z + z1),
                  (x + nx * larg, y + ny * larg, z + z0), (x - nx * larg, y - ny * larg, z + z0)]
    for i in range(n - 1):
        a, b = 4 * i, 4 * (i + 1)
        faces += [(a, a + 1, b + 1, b), (a + 2, a, b, b + 2), (a + 1, a + 3, b + 3, b + 1)]
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


def mancha(x, z, rx, rz, m, seed=0, z0=TOPO - 0.02, z1=TOPO + 0.03, n=24, wob=0.08):
    """Manchinha orgânica deitada no tampo (neve batida, areia da escavação, lago congelado)."""
    return slab(blob(x, -z, rx, rz, seed=seed, n=n, wob=wob), z0, z1, m, bevel=0.0, name='mancha', fundo=False)


def nuvem_fofa(cx, cy, cz, s, seed, m1='nuvem', m2='nuvemSombra', bolas=5):
    """Nuvenzinha de bolas achatadas (coordenadas do Blender)."""
    rnd = random.Random(seed)
    p = []
    for k in range(bolas):
        a = 2 * math.pi * k / bolas + rnd.uniform(-0.3, 0.3)
        d = 0 if k == 0 else rnd.uniform(0.7, 1.1) * s
        r = (1.1 if k == 0 else rnd.uniform(0.6, 0.85)) * s
        p.append(uvball(r, (cx + math.cos(a) * d, cy + math.sin(a) * d, cz + rnd.uniform(-0.1, 0.25) * s),
                        m1 if k % 2 == 0 else m2, seg=10, ring=6, scale=(1, 1, 0.72)))
    return p


# ------------------------------------------------------------------ corredor e exportação
CORREDOR = dict(x=5.5, z=2.5)


def conferir_corredor(objs, rotulo=''):
    """Erro se algo na altura do corpo cair no corredor da chegada (x > 5,5 e |z| < 2,5 do jogo)."""
    bpy.context.view_layer.update()
    ruins = []
    for o in objs:
        if o is None or o.type != 'MESH':
            continue
        cantos = [o.matrix_world @ Vector(c) for c in o.bound_box]
        xmax = max(c.x for c in cantos)
        ymin, ymax = min(c.y for c in cantos), max(c.y for c in cantos)
        zmin, zmax = min(c.z for c in cantos), max(c.z for c in cantos)
        if (xmax > CORREDOR['x'] and ymin < CORREDOR['z'] and ymax > -CORREDOR['z'] and zmax > TOPO + 0.12
                and zmin < TOPO + 2.6):
            ruins.append(f'{o.name} x≤{xmax:.1f} y {ymin:.1f}..{ymax:.1f} z {zmin:.1f}..{zmax:.1f}')
    if ruins:
        raise RuntimeError(f'corredor da chegada ocupado ({rotulo}): ' + '; '.join(ruins[:8]))


def contar(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def exportar(pid, nos, ancoras=(), clipes_=None, colisores=()):
    """Grava `SAIDA_ILHAS/pid.glb`: um nó por chave de `nos` ({nome: objs} ou {nome: (objs, pivô)}),
    as âncoras (nós vazios), os nós de colisão `col-*` (cada um com o seu TRS, sem juntar; ajudantes
    `col_caixa` e `col_cilindro` do `lib_mundo`, `col_terreno` e `col_entre` aqui) e, com `clipes_`,
    as animações.

    `clipes_(juntos)` recebe {nome do nó: objeto} e devolve {clipe: {objeto: {prop: chaves}}}."""
    juntos = {}
    for nome, val in nos.items():
        objs, pivo = (val if isinstance(val, tuple) else (val, None))
        objs = [o for o in objs if o is not None]
        if not objs:
            continue
        juntos[nome] = lib_mundo._juntar(objs, nome, pivo)
    repouso = {}
    chaves = {}
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
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(juntos.values()) + list(ancoras) + list(colisores):
        o.select_set(True)
    path = os.path.join(SAIDA_ILHAS, f'{pid}.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_texcoords=False, export_extras=False)
    if chaves:
        bpy.context.scene.frame_current = -50
        kw.update(export_animations=True, export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True,
                  export_force_sampling=True, export_optimize_animation_size=False)
    else:
        kw.update(export_animations=False)
    bpy.ops.export_scene.gltf(**kw)
    if chaves:
        lib_ilha.repouso_no_glb(path, repouso)
    tris = sum(contar(o) for o in juntos.values())
    kb = os.path.getsize(path) / 1024
    por_no = {n: contar(o) for n, o in juntos.items()}
    anc = {e.name: [round(e.location.x, 2), round(e.location.z, 2), round(-e.location.y, 2)] for e in ancoras}
    print(f'EXPORTADO {pid}: {tris} triângulos, {kb:.0f} KB, nós {por_no}, {len(anc)} âncoras, '
          f'{len(colisores)} colisores')
    try:
        with open(RELATORIO_B) as f:
            rel = json.load(f)
    except (OSError, ValueError):
        rel = {}
    rel[pid] = {'triangulos': tris, 'kb': round(kb, 1), 'nos': por_no, 'ancoras': anc,
                'clipes': sorted(chaves)}
    if colisores:
        rel[pid]['colisores'] = grupos_col(colisores)
    with open(RELATORIO_B, 'w') as f:
        json.dump(rel, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write('\n')
    return path


def base_da_ilha(ilha, **kw):
    """O chão da ilha leve (mesma semente e contorno do `ilhas_anel.py`)."""
    sementes = {'pico': 5 * 1.7, 'vale-dos-dinos': 6 * 1.7, 'nuvens': 7 * 1.7}
    return anel.base(sementes[ilha], **kw)


# ------------------------------------------------------------------ peças que se repetem
def cortar_abaixo(o, z_corte):
    """Apaga os vértices abaixo de `z_corte` (no espaço do objeto já aplicado): meia esfera, meio
    cilindro. O furo fica para baixo, encostado no chão."""
    import bmesh as _bm
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = _bm.new()
    bm.from_mesh(o.data)
    fora = [v for v in bm.verts if v.co.z < z_corte - 1e-4]
    _bm.ops.delete(bm, geom=fora, context='VERTS')
    for v in bm.verts:
        if abs(v.co.z - z_corte) < 0.02:
            v.co.z = z_corte
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    return o


def meia_esfera(r, loc, m, seg=16, ring=10, sz=1.0):
    """Cúpula: a metade de cima de uma esfera (iglu, observatório, ninho)."""
    o = uvball(r, loc, m, seg=seg, ring=ring, scale=(1, 1, sz))
    return cortar_abaixo(o, loc[2])


def poste_lampiao(x, z, y=TOPO, h=2.4):
    """Poste baixo com lampião (o vidro usa `lanterna`, que acende à noite)."""
    bx, by = x, -z
    return [cyl(0.08, h, (bx, by, y + h / 2), 'metalEscuro', verts=8),
            cyl(0.18, 0.08, (bx, by, y + 0.04), 'metalEscuro', verts=10),
            box((0.36, 0.36, 0.42), (bx, by, y + h + 0.2), 'lanterna', bevel=0.04, segs=1),
            cone(0.32, 0.22, (bx, by, y + h + 0.52), 'metalEscuro', verts=4, rot=(0, 0, R(45)))]


def bandeirinhas(a, b, cores, n=9, flecha=0.35):
    """Varal de bandeirinhas entre dois pontos do Blender (cordinha e triângulos)."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(tuple(a[k] + (b[k] - a[k]) * t for k in range(2)) + (a[2] + (b[2] - a[2]) * t - flecha * math.sin(math.pi * t),))
    p = [tube(pts, [0.02] * len(pts), 'corda', seg=4, cap=False)]
    for i in range(n):
        x0, y0, z0 = pts[i]
        x1, y1, z1 = pts[i + 1]
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        verts = [(x0 + (x1 - x0) * 0.1, y0 + (y1 - y0) * 0.1, z0 - 0.02), (x0 + (x1 - x0) * 0.9, y0 + (y1 - y0) * 0.9, z1 - 0.02),
                 (mx, my, (z0 + z1) / 2 - 0.42)]
        p.append(malha('bandeirinha', verts, [(0, 1, 2)], cores[i % len(cores)], cima=False))
    return p


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


def caminho(pts, larg, m, z0=-0.05, z1=0.03, y=TOPO):
    """Caminho deitado no tampo, por pontos do jogo (x, z), curva suave, meia-largura `larg`."""
    bl = _suavizar([(x, -z) for x, z in pts])
    return faixa([(x, yy, y) for x, yy in bl], larg, m, z0, z1, nome='caminho')
