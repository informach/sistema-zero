"""A arte 2D da Nave Contra Asteroides tirada dos MESMOS modelos 3D da Patrulha Espacial.

Cada nave, asteroide e laser publicado (`out/<peça>.glb`) é projetado em vetor: as faces visíveis
recebem um tom chapado (a cor do material com uma luz de cima e da esquerda, em poucos degraus), a
oclusão é resolvida da frente para trás e as faces de mesma cor viram uma forma só, simplificada.
Por cima, um contorno escuro de desenho animado. A nave ganha as chamas dos motores embaixo.

Os quatro fundos 800 × 480 são composições em vetor com os mesmos elementos e a mesma paleta de
cada cenário 3D (planeta anelado, aurora sobre o planeta gelado, nebulosa, planeta azul com a
estação).

O SVG declara largura e altura iguais ao tamanho de desenho no jogo 2D (nave 56 × 64, asteroide
48 × 48, laser 10 × 28, fundo 800 × 480), com o viewBox no dobro para o traço sair fino. As imagens
vão EMBUTIDAS em cada projeto e em cada manifesto (não há referência de biblioteca para imagem), por
isso o conjunto precisa ser pequeno: `svg2d/orcamento.json` registra o tamanho.

    ESPACO_OUT=./out /tmp/claude-0/blender-venv/bin/python -B svg2d.py
"""
import base64
import json
import math
import os
import random
import sys

import bpy  # noqa: I001
from mathutils import Vector
from shapely.geometry import Polygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib_espaco import CAIXAS  # noqa: E402

GLB = os.environ.get('ESPACO_OUT', os.path.join(HERE, 'out'))
DEST = os.path.join(HERE, 'svg2d')

NAVES = ['nave-falcao-azul', 'nave-exploradora-coral', 'nave-arraia-lilas', 'nave-cometa-verde']
ASTEROIDES = ['asteroide-rocha-lunar', 'asteroide-gelo-azul', 'asteroide-cristal-violeta', 'asteroide-lava-laranja']
LASERS = ['laser-ciano', 'laser-dourado', 'laser-lilas', 'laser-verde']
CENARIOS = ['cenario-orbita', 'cenario-aurora', 'cenario-nebulosa', 'cenario-estacao']

LUZ = Vector((-0.45, 0.35, 0.82)).normalized()  # de cima, um pouco da esquerda e de trás


def lin2srgb(c):
    return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hexa(rgb):
    return '#' + ''.join(f'{max(0, min(255, round(v * 255))):02x}' for v in rgb)


def escurecer(h, k):
    h = h.lstrip('#')
    return hexa([int(h[i:i + 2], 16) / 255 * k for i in (0, 2, 4)])


def importar(pid):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(GLB, f'{pid}.glb'))
    return [o for o in bpy.data.objects if o.type == 'MESH']


def material_info(m):
    """(cor sRGB, emissão sRGB × força, alfa, nome) a partir do Principled importado."""
    base, emit, forca, alfa = (0.8, 0.8, 0.8), (0, 0, 0), 0.0, 1.0
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                base = tuple(n.inputs['Base Color'].default_value[:3])
                emit = tuple(n.inputs['Emission Color'].default_value[:3])
                forca = n.inputs['Emission Strength'].default_value
                alfa = n.inputs['Alpha'].default_value
    return ([lin2srgb(c) for c in base], [lin2srgb(c) * min(forca, 1.6) for c in emit], alfa, m.name if m else '')


def faces_do_modelo(objs):
    faces = []
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        mw = o.matrix_world
        nmat = mw.to_3x3().inverted().transposed()
        infos = [material_info(m) for m in me.materials]
        for t in me.loop_triangles:
            pts = [mw @ me.vertices[i].co for i in t.vertices]
            n = (nmat @ t.normal).normalized()
            info = infos[t.material_index] if infos else ([0.8] * 3, [0] * 3, 1.0, '')
            # os marcos de 1 mm da caixa não entram no desenho
            if (pts[1] - pts[0]).cross(pts[2] - pts[0]).length < 1e-5:
                continue
            faces.append((pts, n, info))
    return faces


def base_da_camera(olho, cima):
    """Eixos da câmera ortográfica: z aponta para quem olha, y para cima na tela."""
    zc = olho.normalized()
    xc = cima.cross(zc).normalized()
    yc = zc.cross(xc).normalized()
    return lambda p: Vector((p.dot(xc), p.dot(yc), p.dot(zc)))


def projetar(faces, olho, escala, origem, degraus=4, cima=Vector((0, 1, 0))):
    """Faces visíveis em camadas por cor, com a oclusão resolvida da frente para trás."""
    q = base_da_camera(olho, cima)
    itens = []
    for pts, n, (base, emit, alfa, nome) in faces:
        if n.dot(olho) <= 0.02 and alfa >= 0.99:
            continue
        cam = [q(p) for p in pts]
        poli = [((c.x - origem[0]) * escala, (origem[1] - c.y) * escala) for c in cam]
        prof = sum(c.z for c in cam) / 3
        luz = 0.7 + 0.38 * max(0.0, n.dot(LUZ))
        luz = round(luz * degraus) / degraus
        cor = hexa([min(1.0, b * luz + e) for b, e in zip(base, emit)])
        itens.append((prof, poli, cor, alfa))
    itens.sort(key=lambda it: -it[0])
    opacas, translucidas = {}, {}
    coberto = None
    lote = []
    for prof, poli, cor, alfa in itens:
        p = Polygon(poli)
        if not p.is_valid or p.area < 1e-4:
            p = p.buffer(0)
            if p.area < 1e-4:
                continue
        if alfa < 0.99:
            translucidas.setdefault((cor, round(alfa, 2)), []).append(p)
            continue
        vis = p if coberto is None else p.difference(coberto)
        if not vis.is_empty:
            opacas.setdefault(cor, []).append(vis)
        lote.append(p)
        if len(lote) >= 24:
            coberto = unary_union([coberto, *lote] if coberto is not None else lote)
            lote = []
        elif coberto is not None:
            coberto = coberto.union(p)
        else:
            coberto = unary_union(lote)
            lote = []
    return opacas, translucidas


def caminho(geom, tol=0.8):
    geom = unary_union(geom).buffer(0.15, join_style=2).buffer(-0.15, join_style=2).simplify(tol, preserve_topology=True)
    partes = []
    polys = getattr(geom, 'geoms', [geom])
    for p in polys:
        if p.is_empty or p.area < 0.8:
            continue
        for anel in [p.exterior, *p.interiors]:
            xs = list(anel.coords)[:-1]
            if len(xs) < 3:
                continue
            d = f'M{round(xs[0][0])} {round(xs[0][1])}'
            ultimo = (round(xs[0][0]), round(xs[0][1]))
            for x, y in xs[1:]:
                pt = (round(x), round(y))
                if pt != ultimo:
                    d += f'L{pt[0]} {pt[1]}'
                    ultimo = pt
            partes.append(d + 'Z')
    return ''.join(partes)


def svg(w, h, conteudo, vb=2):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w * vb} {h * vb}">'
            f'{conteudo}</svg>')


def desenhar(opacas, translucidas, contorno='#141a33', traco=3):
    silhueta = unary_union([unary_union(v) for v in opacas.values()] + [unary_union(v) for v in translucidas.values()])
    out = [f'<path d="{caminho([silhueta], 0.6)}" fill="{contorno}" stroke="{contorno}" stroke-width="{traco}" stroke-linejoin="round"/>'] if contorno else []
    for cor, geoms in sorted(opacas.items(), key=lambda kv: -unary_union(kv[1]).area):
        d = caminho(geoms)
        if d:
            out.append(f'<path d="{d}" fill="{cor}"/>')
    for (cor, alfa), geoms in translucidas.items():
        d = caminho(geoms)
        if d:
            out.append(f'<path d="{d}" fill="{cor}" fill-opacity="{alfa}"/>')
    return ''.join(out), silhueta


# --- naves ----------------------------------------------------------------------------------
def nave(pid):
    objs = importar(pid)
    faces = faces_do_modelo(objs)
    (x0, y0, _), (x1, y1, _) = CAIXAS['nave']
    w, h = 56, 64
    escala = (w * 2 - 4) / (x1 - x0)
    origem = (x0 - 2 / escala, y1 + 3 / escala)  # câmera de cima: x da tela = x, y da tela = -y
    opacas, transl = projetar(faces, Vector((0, 0, 1)), escala, origem)
    corpo, silhueta = desenhar(opacas, transl)
    # chamas: um par de gotas embaixo de cada motor (as faces da chama ficam viradas para trás)
    chamas = []
    xs = sorted({round(p.x, 2) for pts, n, info in faces if 'chama' in info[3] for p in pts})
    grupos, atual = [], []
    for x in xs:
        if atual and x - atual[-1] > 0.04:
            grupos.append(atual)
            atual = []
        atual.append(x)
    if atual:
        grupos.append(atual)
    cor_chama = next((hexa([min(1, e) for e in info[1]]) for pts, n, info in faces if 'chama' in info[3]), '#7df9ff')
    fundo = silhueta.bounds[3]
    for g in grupos:
        cx = ((g[0] + g[-1]) / 2 - origem[0]) * escala
        r = max(3.0, (g[-1] - g[0]) / 2 * escala * 0.9)
        topo = fundo - 6
        comp = min(h * 2 - 2 - topo, 16 + r * 1.3)
        chamas.append(f'<path d="M{cx - r:.0f} {topo:.0f}Q{cx:.0f} {topo + comp * 1.25:.0f} {cx + r:.0f} {topo:.0f}Z" fill="{cor_chama}" fill-opacity=".75"/>'
                      f'<path d="M{cx - r * 0.5:.0f} {topo:.0f}Q{cx:.0f} {topo + comp * 0.75:.0f} {cx + r * 0.5:.0f} {topo:.0f}Z" fill="#fff"/>')
    return svg(w, h, ''.join(chamas) + corpo)


def asteroide(pid):
    objs = importar(pid)
    faces = faces_do_modelo(objs)
    olho = Vector((0.35, -0.55, 0.75))
    q = base_da_camera(olho, Vector((0, 0, 1)))
    cams = [q(p) for pts, n, i in faces for p in pts]
    xs, ys = [c.x for c in cams], [c.y for c in cams]
    w = h = 48
    lado = max(max(xs) - min(xs), max(ys) - min(ys))
    escala = (w * 2 - 6) / lado
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    origem = (cx - w / escala, cy + h / escala)
    opacas, transl = projetar(faces, olho, escala, origem, cima=Vector((0, 0, 1)))
    corpo, _ = desenhar(opacas, transl)
    return svg(w, h, corpo)


def laser(pid):
    objs = importar(pid)
    faces = faces_do_modelo(objs)
    (x0, y0, _), (x1, y1, _) = CAIXAS['laser']
    w, h = 10, 28
    escala = (h * 2 - 2) / (y1 - y0)
    origem = (-(w / escala), y1 + 1 / escala)
    opacas, transl = projetar(faces, Vector((0, 0, 1)), escala, origem, degraus=3)
    corpo, _ = desenhar(opacas, transl, contorno=None)
    return svg(w, h, corpo)


# --- fundos ---------------------------------------------------------------------------------
def estrelas(rnd, n, w=800, h=480, cores=('#ffffff', '#cfe3ff', '#fff1c9', '#ffd6f0'), evitar=None):
    """Estrelinhas em poucos caminhos (um por cor e brilho): pequenos losangos."""
    grupos = {}
    for _ in range(n):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h)
        if evitar and evitar(x, y):
            continue
        r = 2 if rnd.random() < 0.1 else 1
        chave = (rnd.choice(cores), rnd.choice(('.5', '.9')))
        grupos.setdefault(chave, []).append(f'M{x:.0f} {y - r:.0f}l{r} {r}l-{r} {r}l-{r}-{r}z')
    return ''.join(f'<path d="{"".join(ds)}" fill="{c}" opacity="{o}"/>' for (c, o), ds in grupos.items())


def cintilante(x, y, s, cor='#fff'):
    return (f'<path d="M{x} {y - s}L{x + s * .14:.1f} {y}L{x} {y + s}L{x - s * .14:.1f} {y}ZM{x - s} {y}L{x} {y + s * .14:.1f}'
            f'L{x + s} {y}L{x} {y - s * .14:.1f}Z" fill="{cor}"/>')


def fundo_svg(conteudo):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">{conteudo}</svg>'


def grad(id_, paradas, x2=0, y2=1):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"{f" stop-opacity={chr(34)}{a}{chr(34)}" if a is not None else ""}/>' for o, c, a in paradas)
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def radial(id_, paradas, cx=0.5, cy=0.5, r=0.5):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"{f" stop-opacity={chr(34)}{a}{chr(34)}" if a is not None else ""}/>' for o, c, a in paradas)
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


def fundo_orbita():
    rnd = random.Random('orbita2d')
    defs = (grad('c', [(0, '#070826', None), (.55, '#1a1650', None), (1, '#0b0d2c', None)])
            + radial('p', [(0, '#fff0cc', None), (.5, '#e8b77a', None), (1, '#9a4e33', None)], .35, .35, .75)
            + radial('n', [(0, '#3b2a8f', .55), (1, '#3b2a8f', 0)]))
    faixas = ''.join(f'<path d="M{560 - 10 * i} {40 + i * 26}Q660 {28 + i * 26} {770 + 8 * i} {48 + i * 26}" fill="none" stroke="{c}" stroke-width="{wd}" opacity=".55"/>'
                     for i, (c, wd) in enumerate([('#d99060', 11), ('#fff0cc', 7), ('#b8673f', 12), ('#f2cf96', 8), ('#c4563a', 9), ('#e8b77a', 10)]))
    planeta = (f'<clipPath id="k"><circle cx="665" cy="120" r="102"/></clipPath><circle cx="665" cy="120" r="102" fill="url(#p)"/>'
               f'<g clip-path="url(#k)">{faixas}<path d="M563 120A102 102 0 0 0 767 120Q665 260 563 120Z" fill="#05061a" opacity=".35"/></g>')
    anel = ('<ellipse cx="665" cy="128" rx="176" ry="38" transform="rotate(-14 665 128)" fill="none" stroke="#e6cfa4" stroke-width="13" opacity=".85"/>'
            '<ellipse cx="665" cy="128" rx="150" ry="31" transform="rotate(-14 665 128)" fill="none" stroke="#3a2e3e" stroke-width="4" opacity=".7"/>'
            '<ellipse cx="665" cy="128" rx="199" ry="44" transform="rotate(-14 665 128)" fill="none" stroke="#8f7a63" stroke-width="5" opacity=".7"/>')
    luas = '<circle cx="132" cy="96" r="20" fill="#b9bfcc"/><circle cx="126" cy="91" r="5" fill="#8d93a6"/><circle cx="138" cy="103" r="3.5" fill="#8d93a6"/><circle cx="455" cy="62" r="8" fill="#7fd6c9"/>'
    return fundo_svg(f'<defs>{defs}</defs><rect width="800" height="480" fill="url(#c)"/><ellipse cx="240" cy="200" rx="330" ry="150" fill="url(#n)"/>'
                     f'{estrelas(rnd, 120)}{planeta}{anel}{luas}{cintilante(300, 140, 9)}{cintilante(90, 300, 7)}')


def fundo_aurora():
    rnd = random.Random('aurora2d')
    defs = (grad('c', [(0, '#030a16', None), (.6, '#0b3442', None), (1, '#05202c', None)])
            + grad('a', [(0, '#c06cff', 0), (.35, '#3be0ff', .55), (.75, '#3dffa0', .6), (1, '#3dffa0', 0)])
            + radial('p', [(0, '#24527c', None), (.8, '#143656', None), (1, '#0c2340', None)], .5, .2, .9))
    cortinas = ''.join(f'<path d="M{x} {y}C{x + 30} {y + 60} {x - 20} {y + 120} {x + 15} {y + 180}L{x + 15 + wd} {y + 180}C{x + wd - 15} {y + 120} {x + wd + 35} {y + 60} {x + wd} {y}Z" fill="url(#a)" opacity="{o}"/>'
                       for x, y, wd, o in [(40, 30, 70, .7), (150, 10, 90, .85), (280, 40, 60, .6), (380, 15, 110, .9), (520, 35, 70, .7), (620, 5, 95, .8), (730, 30, 70, .65)])
    planeta = ('<path d="M-60 480Q400 300 860 480Z" fill="url(#p)"/><path d="M-60 480Q400 300 860 480" fill="none" stroke="#5ff0ff" stroke-width="5" opacity=".75"/>'
               '<path d="M120 452Q260 430 330 446M470 430Q560 424 640 445" stroke="#7fb2dc" stroke-width="5" fill="none" opacity=".45"/>')
    lua = '<circle cx="110" cy="70" r="17" fill="#eef4ff"/><circle cx="104" cy="66" r="4" fill="#c9d6ea"/>'
    return fundo_svg(f'<defs>{defs}</defs><rect width="800" height="480" fill="url(#c)"/>{estrelas(rnd, 110, evitar=lambda x, y: y > 380)}'
                     f'{cortinas}{planeta}{lua}{cintilante(470, 80, 8, "#e9fbff")}')


def fundo_nebulosa():
    rnd = random.Random('nebulosa2d')
    defs = (grad('c', [(0, '#0a0626', None), (.5, '#1a0f3d', None), (1, '#0c0828', None)])
            + radial('v', [(0, '#8b3bd9', .6), (1, '#8b3bd9', 0)])
            + radial('r', [(0, '#ff4fa3', .55), (1, '#ff4fa3', 0)])
            + radial('a', [(0, '#2fb4ff', .45), (1, '#2fb4ff', 0)])
            + radial('b', [(0, '#ffe1f2', .5), (1, '#ffe1f2', 0)])
            + radial('t', [(0, '#c9fff4', None), (.5, '#44d4c0', None), (1, '#1f8f8a', None)], .35, .35, .7))
    nuvens = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="url(#{g})" transform="rotate({a} {x} {y})"/>'
                     for x, y, rx, ry, g, a in [(560, 150, 330, 170, 'v', -20), (650, 90, 200, 90, 'r', -25), (200, 120, 260, 120, 'v', 15),
                                                (300, 70, 160, 70, 'r', 10), (470, 260, 230, 100, 'a', -10), (120, 330, 200, 90, 'a', 20),
                                                (600, 120, 90, 40, 'b', -25), (260, 95, 70, 30, 'b', 10)])
    planeta = '<circle cx="118" cy="108" r="30" fill="url(#t)"/><path d="M92 100Q118 92 146 104M90 116Q118 110 147 120" stroke="#1f8f8a" stroke-width="4" fill="none" opacity=".6"/>'
    return fundo_svg(f'<defs>{defs}</defs><rect width="800" height="480" fill="url(#c)"/>{nuvens}{estrelas(rnd, 130)}{planeta}'
                     f'{cintilante(600, 120, 10, "#fff0fb")}{cintilante(330, 210, 7, "#fff0fb")}{cintilante(700, 300, 6, "#fff0fb")}')


def fundo_estacao():
    rnd = random.Random('estacao2d')
    defs = (grad('c', [(0, '#03050f', None), (.55, '#0b1636', None), (1, '#050a1d', None)])
            + radial('t', [(0, '#3d8ee8', None), (.75, '#1a5fd0', None), (1, '#0d3d91', None)], .65, .3, .85))
    # o planeta fica no alto (espelhado): embaixo é a faixa onde a nave voa
    terra = ('<g transform="translate(0 410) scale(1 -1)"><clipPath id="k"><circle cx="70" cy="470" r="230"/></clipPath><circle cx="70" cy="470" r="230" fill="url(#t)"/>'
             '<g clip-path="url(#k)"><path d="M-40 330Q40 290 110 320T230 300Q260 360 200 380T60 420Q0 400 -40 330Z" fill="#4caf50"/>'
             '<path d="M120 400Q180 380 240 420Q230 470 170 470Q130 450 120 400Z" fill="#2e7d32"/>'
             '<path d="M150 310Q190 300 215 318" stroke="#c9b56d" stroke-width="10" fill="none"/>'
             '<path d="M-20 290Q60 260 150 280Q90 300 20 300ZM170 360Q240 340 290 380Q230 380 180 375ZM0 430Q70 410 120 440Q60 450 10 445Z" fill="#fff" opacity=".85"/>'
             '<path d="M300 470A230 230 0 0 1 70 240L300 240Z" fill="#02040d" opacity=".35"/></g>'
             '<circle cx="70" cy="470" r="230" fill="none" stroke="#6cc6ff" stroke-width="6" opacity=".7"/></g>')
    estacao = ('<g transform="translate(20 140) rotate(-18 650 120)"><ellipse cx="650" cy="120" rx="80" ry="34" fill="none" stroke="#d9dee8" stroke-width="11"/>'
               '<ellipse cx="650" cy="120" rx="80" ry="34" fill="none" stroke="#ffe08a" stroke-width="3" stroke-dasharray="4 18"/>'
               '<path d="M570 120H730M650 86V154" stroke="#aab3c4" stroke-width="4"/><rect x="636" y="104" width="28" height="32" rx="6" fill="#eef1f6"/>'
               '<rect x="590" y="62" width="44" height="18" rx="2" fill="#2f5fd8"/><rect x="666" y="160" width="44" height="18" rx="2" fill="#2f5fd8"/></g>')
    return fundo_svg(f'<defs>{defs}</defs><rect width="800" height="480" fill="url(#c)"/>{estrelas(rnd, 130)}{terra}{estacao}'
                     f'{cintilante(420, 90, 8)}{cintilante(740, 330, 7)}')


FUNDOS = {'cenario-orbita': fundo_orbita, 'cenario-aurora': fundo_aurora, 'cenario-nebulosa': fundo_nebulosa,
          'cenario-estacao': fundo_estacao}

if __name__ == '__main__':
    os.makedirs(DEST, exist_ok=True)
    gerar = {**{p: nave for p in NAVES}, **{p: asteroide for p in ASTEROIDES}, **{p: laser for p in LASERS}}
    pedidas = [a for a in sys.argv[sys.argv.index('--') + 1:]] if '--' in sys.argv else list(gerar) + list(FUNDOS)
    orc_path = os.path.join(DEST, 'orcamento.json')
    orcamento = json.load(open(orc_path)) if os.path.exists(orc_path) else {}
    for pid in pedidas:
        texto = FUNDOS[pid]() if pid in FUNDOS else gerar[pid](pid)
        with open(os.path.join(DEST, f'{pid}.svg'), 'w') as f:
            f.write(texto)
        orcamento[pid] = len(base64.b64encode(texto.encode()))
        print(pid, len(texto), 'bytes')
    ordem = NAVES + ASTEROIDES + LASERS + CENARIOS
    orcamento = {k: orcamento[k] for k in ordem if k in orcamento}
    orcamento['total-base64'] = sum(v for k, v in orcamento.items() if k != 'total-base64')
    with open(orc_path, 'w') as f:
        json.dump(orcamento, f, indent=2)
        f.write('\n')
    print('TOTAL base64', orcamento['total-base64'])
