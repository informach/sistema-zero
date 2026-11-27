"""A arte 2D da Nave Contra Asteroides tirada dos MESMOS modelos 3D da Patrulha Espacial.

Cada nave, asteroide e laser publicado (`out/<peça>.glb`) é projetado em vetor: as faces visíveis
recebem um tom chapado (a cor do material com uma luz de cima e da esquerda, em poucos degraus), a
oclusão é resolvida da frente para trás e as faces de mesma cor viram uma forma só, simplificada.
Por cima, um contorno escuro de desenho animado. A nave ganha as chamas dos motores embaixo.

Os quatro fundos 800 × 480 são os PRÓPRIOS cenários 3D, vistos pela câmera da Patrulha e gravados
em WebP por `previa/previa.mjs fundos2d` (8 a 10 KB cada).

O SVG declara largura e altura iguais ao tamanho de desenho no jogo 2D (nave 56 × 64, asteroide
48 × 48, laser 10 × 28, fundo 800 × 480), com o viewBox no dobro para o traço sair fino. As imagens
vão EMBUTIDAS em cada projeto e em cada manifesto (não há referência de biblioteca para imagem), por
isso o conjunto precisa ser pequeno: `arte2d/orcamento.json` registra o tamanho.

    ESPACO_OUT=./out /tmp/claude-0/blender-venv/bin/python -B svg2d.py
"""
import base64
import json
import math
import os
import sys

import bpy  # noqa: I001
from mathutils import Vector
from shapely.geometry import Polygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib_espaco import CAIXAS  # noqa: E402

GLB = os.environ.get('ESPACO_OUT', os.path.join(HERE, 'out'))
DEST = os.path.join(HERE, 'arte2d')

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


if __name__ == '__main__':
    os.makedirs(DEST, exist_ok=True)
    gerar = {**{p: nave for p in NAVES}, **{p: asteroide for p in ASTEROIDES}, **{p: laser for p in LASERS}}
    pedidas = [a for a in sys.argv[sys.argv.index('--') + 1:]] if '--' in sys.argv else list(gerar)
    orc_path = os.path.join(DEST, 'orcamento.json')
    orcamento = json.load(open(orc_path)) if os.path.exists(orc_path) else {}
    for pid in pedidas:
        texto = gerar[pid](pid)
        with open(os.path.join(DEST, f'{pid}.svg'), 'w') as f:
            f.write(texto)
        orcamento[pid] = len(base64.b64encode(texto.encode()))
        print(pid, len(texto), 'bytes')
    ordem = NAVES + ASTEROIDES + LASERS + CENARIOS
    for pid in CENARIOS:  # os fundos são os cenários 3D em WebP (previa.mjs fundos2d)
        caminho_fundo = os.path.join(DEST, f'{pid}.webp')
        if os.path.exists(caminho_fundo):
            orcamento[pid] = len(base64.b64encode(open(caminho_fundo, 'rb').read()))
    orcamento = {k: orcamento[k] for k in ordem if k in orcamento}
    orcamento['total-base64'] = sum(v for k, v in orcamento.items() if k != 'total-base64')
    with open(orc_path, 'w') as f:
        json.dump(orcamento, f, indent=2)
        f.write('\n')
    print('TOTAL base64', orcamento['total-base64'])
