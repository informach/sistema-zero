"""Ajudantes dos objetos com função da casa do Arquipélago Vagalume (Blender sem tela, `bpy` 5.x).

Reaproveita a `arte/itens/lib_itens.py` (formas, paleta, `exportar` e `rodar`) e só muda o destino:
os GLBs vão para `src/assets/objetos` e o relatório para `arte/objetos/relatorio.json`. A lib dos
itens lê `SAIDA` e `RELATORIO` na hora de exportar, então basta trocar as duas aqui, antes de tudo.

Acrescenta:
- a paleta dos objetos (vidro, água, holograma, tijolo, fósseis, instrumentos);
- `uv_plano`: coordenadas de textura de 0 a 1 numa face plana (as faces que o Pinta pinta na
  geladeira e a `tela` do fliperama, onde o jogo põe uma imagem);
- `exportar(..., uv=True)`: grava as coordenadas de textura (a lib dos itens não grava);
- `POSE=clipe:quadro` na linha de comando: em vez do arquivo do jogo, grava na pasta das prévias
  um GLB parado naquele quadro do clipe (porta aberta, fogo, peixes no meio do caminho), para o
  `arte/itens/render.py previa` mostrar.

Convenções (as dos itens e do quarto): z para cima e a frente para -Y no Blender, 1 célula = 1
unidade, base em z = 0 e o objeto centrado no seu footprint em células (README).
"""
import math
import os
import sys

sys.dont_write_bytecode = True

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'itens'))
import lib_itens  # noqa: E402
from lib_itens import *  # noqa: E402,F401,F403  (box, cyl, tube, prism, torneado, esfera, pintar_por…)

# O `import *` acima traz o AQUI dos itens: esta é a pasta dos objetos (o relatório mora aqui).
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.environ.get('OBJETOS_OUT', os.path.join(AQUI, '..', '..', 'src', 'assets', 'objetos')))
os.makedirs(SAIDA, exist_ok=True)
RELATORIO = os.path.join(AQUI, 'relatorio.json')
# Antes de qualquer exportação: nada pode cair em src/assets/itens nem em arte/itens.
lib_itens.SAIDA = SAIDA
lib_itens.RELATORIO = RELATORIO
assert os.path.basename(os.path.dirname(RELATORIO)) == 'objetos' and 'itens' not in SAIDA.split(os.sep)
PREVIAS = os.environ.get('PREVIAS_OUT', '/tmp/claude-0/-home-user-sistema-zero/f9cda8be-1c0f-581b-956d-d4d071871b04/'
                         'scratchpad/arte-objetos')

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

R = math.radians

lib_q.PALETTE.update({
    # comuns
    'vidro': ('#d6f1fa', 0.3, None, 0),
    'agua': ('#5cc3e8', 0.1, None, 0),
    'branco': ('#fffaf3', 0.6, None, 0),
    'brancoSombra': ('#e9e4da', 0.6, None, 0),
    'plastico': ('#3c4250', 0.5, None, 0),
    'borracha': ('#30343a', 0.8, None, 0),
    'tecido': ('#e0584f', 0.95, None, 0),
    # projeto azul (o holograma: o jogo soma a luz, como na bancada)
    'projetoAzul': ('#5aa9ff', 0.3, '#5aa9ff', 0.9),
    'projetoAzulLinha': ('#a9d4ff', 0.3, '#7fc0ff', 2.2),
    'projetor': ('#3c4250', 0.5, None, 0),
    'projetorLuz': ('#7fc0ff', 0.3, '#5aa9ff', 1.6),
    # geladeira
    'geladeira': ('#bfe6dc', 0.45, None, 0),
    'pintaFrente': ('#bfe6dc', 0.45, None, 0),
    'pintaLadoEsq': ('#bfe6dc', 0.45, None, 0),
    'pintaLadoDir': ('#bfe6dc', 0.45, None, 0),
    'pintaTopo': ('#bfe6dc', 0.45, None, 0),
    'geladeiraFrisos': ('#6fb8a8', 0.45, None, 0),
    'geladeiraDentro': ('#f4fbff', 0.5, None, 0),
    'prateleira': ('#cdeaf6', 0.1, None, 0),
    'gaveta': ('#bfe8c8', 0.15, None, 0),
    'cromado': ('#d9dee3', 0.25, None, 0),
    'leite': ('#ffffff', 0.7, None, 0),
    'leiteAzul': ('#5b8fd6', 0.7, None, 0),
    'ovo': ('#fbefdc', 0.6, None, 0),
    'queijo': ('#ffd25a', 0.6, None, 0),
    'queijoFuro': ('#e9b53a', 0.6, None, 0),
    'suco': ('#ff9a3d', 0.3, None, 0),
    'garrafa': ('#9fe0b8', 0.2, None, 0),
    'tampinha': ('#e0584f', 0.5, None, 0),
    'maca': ('#e0584f', 0.4, None, 0),
    'gelatina': ('#ff5f8a', 0.2, None, 0),
    'cenoura': ('#f28a2e', 0.6, None, 0),
    # forno
    'forno': ('#f3e3c8', 0.5, None, 0),
    'fornoEscuro': ('#e0584f', 0.5, None, 0),
    'fornoDentro': ('#5d636c', 0.6, None, 0),
    'grade': ('#b9c0c7', 0.35, None, 0),
    'botao': ('#fffaf3', 0.5, None, 0),
    'bocaGas': ('#30343a', 0.6, None, 0),
    'forma': ('#9aa3ab', 0.35, None, 0),
    'vidroForno': ('#dceef5', 0.6, None, 0),
    # aquário
    'aquarioMovel': ('#5b8fd6', 0.7, None, 0),
    'aquarioMovelClaro': ('#7fb2e6', 0.7, None, 0),
    'aquarioAro': ('#34507e', 0.5, None, 0),
    'areiaAquario': ('#f3dca2', 0.95, None, 0),
    'pedrinha1': ('#e88bb6', 0.7, None, 0),
    'pedrinha2': ('#7fb2e6', 0.7, None, 0),
    'pedrinha3': ('#fff3d6', 0.7, None, 0),
    'pedrinha4': ('#9b6fd0', 0.7, None, 0),
    'planta': ('#3fbf8f', 0.6, None, 0),
    'plantaEscura': ('#2a9a72', 0.6, None, 0),
    'plantaClara': ('#8fdc6a', 0.6, None, 0),
    'peixeLaranja': ('#ff8a2e', 0.45, None, 0),
    'peixeBranco': ('#ffffff', 0.45, None, 0),
    'peixeAzul': ('#3f7fe0', 0.45, None, 0),
    'peixeAmarelo': ('#ffd84f', 0.45, None, 0),
    'peixeRosa': ('#ff7fb0', 0.45, None, 0),
    'peixeRoxo': ('#9b6fd0', 0.45, None, 0),
    'olhoPeixe': ('#20242c', 0.3, None, 0),
    'bolha': ('#ffffff', 0.2, '#e8f8ff', 0.3),
    # lareira
    'tijolo': ('#c8714e', 0.9, None, 0),
    'tijoloClaro': ('#d98a64', 0.9, None, 0),
    'tijoloEscuro': ('#a85a3c', 0.9, None, 0),
    'rejunte': ('#efe3cf', 0.95, None, 0),
    'pedraLareira': ('#b8b0a4', 0.9, None, 0),
    'pedraLareiraEscura': ('#958c80', 0.9, None, 0),
    'fuligem': ('#3a2e2a', 0.95, None, 0),
    'vela': ('#fff6e3', 0.8, None, 0),
    'chama': ('#ffd27a', 0.4, '#ffb03a', 1.0),
    'vaso': ('#5bb8d6', 0.6, None, 0),
    'moldura': ('#e8b23a', 0.4, None, 0),
    'foto': ('#9fd3f0', 0.7, None, 0),
    # banda
    'bumbo': ('#e0584f', 0.45, None, 0),
    'peleTambor': ('#fff6e3', 0.8, None, 0),
    'aroTambor': ('#d9dee3', 0.3, None, 0),
    'pratoBateria': ('#f3b123', 0.3, None, 0),
    'teclaBranca': ('#fffaf3', 0.5, None, 0),
    'teclaPreta': ('#30343a', 0.5, None, 0),
    'teclado': ('#9b6fd0', 0.5, None, 0),
    'violao': ('#e8a35a', 0.45, None, 0),
    'violaoEscuro': ('#7c4a2a', 0.6, None, 0),
    'boca': ('#3a2416', 0.8, None, 0),
    'corda': ('#fff6e3', 0.4, None, 0),
    'xilo1': ('#e0584f', 0.5, None, 0),
    'xilo2': ('#f28a2e', 0.5, None, 0),
    'xilo3': ('#f2c94c', 0.5, None, 0),
    'xilo4': ('#58b05a', 0.5, None, 0),
    'xilo5': ('#5b8fd6', 0.5, None, 0),
    'xilo6': ('#9b6fd0', 0.5, None, 0),
    'xilo7': ('#e88bb6', 0.5, None, 0),
    'microfone': ('#3c4250', 0.4, None, 0),
    'gradeMic': ('#d9dee3', 0.3, None, 0),
    # fliperama
    'gabinete': ('#5b5fd6', 0.55, None, 0),
    'gabineteClaro': ('#ff8fb8', 0.55, None, 0),
    'gabineteEscuro': ('#2e3160', 0.6, None, 0),
    'tela': ('#1f3550', 0.25, '#3a86c8', 0.6),
    'botaoVermelho': ('#ff4f6d', 0.35, None, 0),
    'botaoAmarelo': ('#ffd84f', 0.35, None, 0),
    'botaoVerde': ('#6cd38a', 0.35, None, 0),
    'botaoAzul': ('#4fb3ff', 0.35, None, 0),
    'estrela': ('#ffd84f', 0.4, None, 0),
    # museu
    'osso': ('#f2ead6', 0.7, None, 0),
    'ossoSombra': ('#d9ccb0', 0.75, None, 0),
    'pedestal': ('#f6efe2', 0.7, None, 0),
    'pedestalEscuro': ('#d8cdb8', 0.7, None, 0),
    'veludo': ('#34507e', 0.95, None, 0),
    'veludoVermelho': ('#c8434f', 0.95, None, 0),
    'amonite': ('#d9a35a', 0.6, None, 0),
    'amoniteClaro': ('#f0c88a', 0.6, None, 0),
    'dente': ('#fff6e3', 0.5, None, 0),
    'rocha': ('#b9a68a', 0.9, None, 0),
    'rochaEscura': ('#8e7c63', 0.9, None, 0),
    'ambar': ('#ffb030', 0.2, '#ff9a20', 0.25),
    # casinha
    'casinha': ('#e8b070', 0.85, None, 0),
    'casinhaEscura': ('#c98a4a', 0.85, None, 0),
    'telhado': ('#e0584f', 0.75, None, 0),
    'telhadoEscuro': ('#c4473f', 0.75, None, 0),
    'portaCasinha': ('#5a3a26', 0.95, None, 0),
    'almofada': ('#5bb8d6', 0.95, None, 0),
    'almofadaBorda': ('#3f97b6', 0.95, None, 0),
    'racao': ('#a8693a', 0.9, None, 0),
    'potinho': ('#ff8fb8', 0.45, None, 0),
    'potinhoAzul': ('#7fb2e6', 0.45, None, 0),
    'tapete': ('#f2c94c', 0.95, None, 0),
    'osso2': ('#fff6e3', 0.7, None, 0),
})
lib_q.ALPHA.update({'vidro': 0.16, 'agua': 0.3, 'projetoAzul': 0.32, 'prateleira': 0.55, 'gaveta': 0.6,
                    'garrafa': 0.75, 'bolha': 0.75, 'vidroForno': 0.1, 'gelatina': 0.85})


# ---------------------------------------------------------------- formas
def caixa_redonda(size, loc, m, raio=0.05, segs=3):
    """Caixa de quinas bem arredondadas, faces planas no meio (onde a pintura cai)."""
    return box(size, loc, m, bevel=raio, segs=segs)


def barra(a, b, m, r=0.012, verts=6):
    """Barra fina entre dois pontos do Blender (contornos do holograma, varetas, pés)."""
    pa, pb = Vector(a), Vector(b)
    d = pb - pa
    o = cyl(r, d.length, tuple((pa + pb) / 2), m, verts=verts, smooth_sides=verts > 6)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


def uv_plano(o, materiais, eixo_u, eixo_v):
    """Coordenadas de textura de 0 a 1 nas faces dos `materiais`, projetadas nos eixos dados
    (u para a direita e v para cima de quem olha a face de fora). As outras faces não mudam (uma
    camada nova começa em 0), então dá para chamar uma vez por face pintável."""
    bpy.context.view_layer.update()
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uv = me.uv_layers[0].data
    idx = {i for i, m in enumerate(me.materials) if m and m.name in materiais}
    eu, ev = Vector(eixo_u), Vector(eixo_v)
    M = o.matrix_world
    pts = [M @ me.vertices[v].co for p in me.polygons if p.material_index in idx for v in p.vertices]
    if not pts:
        return o
    us = [p.dot(eu) for p in pts]
    vs = [p.dot(ev) for p in pts]
    u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
    for p in me.polygons:
        if p.material_index not in idx:
            continue
        for li in p.loop_indices:
            w = M @ me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((w.dot(eu) - u0) / (u1 - u0), (w.dot(ev) - v0) / (v1 - v0))
    return o


def booleana(alvo, corte, op='DIFFERENCE'):
    """Recorta `corte` de `alvo` (o miolo da geladeira, a boca do forno) e apaga o corte."""
    b = alvo.modifiers.new('bool', 'BOOLEAN')
    b.operation = op
    b.solver = 'EXACT'
    b.object = corte
    bpy.context.view_layer.update()
    lib_q._apply(alvo, b)
    bpy.data.objects.remove(corte)
    return fechar_emendas(alvo)


def fechar_emendas(o, tol=2e-4):
    """Costura as emendas em T que a booleana às vezes deixa (um vértice no meio da aresta da face
    vizinha): a aresta é partida nesse vértice, e a placa de vídeo fecha a costura."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    # Faces de muitos lados com vértices em linha viram triângulos sem área ao exportar; em
    # triângulos aqui, cada aresta que passa por cima de um vértice é partida nele.
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4], ngon_method='BEAUTY')
    mexeu = True
    while mexeu:
        mexeu = False
        bm.verts.ensure_lookup_table()
        for v in list(bm.verts):
            for e in list(bm.edges):
                a, b = e.verts
                if v in (a, b):
                    continue
                ab = b.co - a.co
                L2 = ab.length_squared
                if L2 < 1e-12:
                    continue
                t = (v.co - a.co).dot(ab) / L2
                if t <= 1e-4 or t >= 1 - 1e-4 or (a.co + ab * t - v.co).length > tol:
                    continue
                novo_e, novo_v = bmesh.utils.edge_split(e, a, t)
                bmesh.ops.weld_verts(bm, targetmap={novo_v: v})
                mexeu = True
                break
            if mexeu:
                break
    bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges[:])
    bm.to_mesh(o.data)
    bm.free()
    return o


def mover(objs, d):
    """Desloca uma lista de objetos (nós de uma peça que fica num lugar só do arquivo)."""
    return lib_ilha.place(objs, loc=d)


# ---------------------------------------------------------------- exportação
_exportar_itens = lib_itens.exportar


class _BpyComUV:
    """O `bpy` visto pela lib dos itens durante uma exportação com `uv=True`: igual ao de verdade,
    mas o exportador de glTF grava as coordenadas de textura."""

    class _Ops:
        class _Cena:
            def __getattr__(self, n):
                if n == 'gltf':
                    return lambda **kw: bpy.ops.export_scene.gltf(**{**kw, 'export_texcoords': True})
                return getattr(bpy.ops.export_scene, n)

        def __getattr__(self, n):
            return self._Cena() if n == 'export_scene' else getattr(bpy.ops, n)

    def __getattr__(self, n):
        return self._Ops() if n == 'ops' else getattr(bpy, n)


def _valor(chaves, q):
    """Valor de uma lista de chaves [(quadro, valor)] no quadro q (linear, só para as prévias)."""
    if q <= chaves[0][0]:
        return Vector(chaves[0][1])
    for (q0, a), (q1, b) in zip(chaves, chaves[1:]):
        if q0 <= q <= q1:
            t = (q - q0) / (q1 - q0) if q1 > q0 else 0
            return Vector(a).lerp(Vector(b), t)
    return Vector(chaves[-1][1])


def _posar(nos, clipe, q):
    """Leva cada nó animado para a pose do quadro q (prévia): gira e escala em volta do pivô."""
    for nome, props in clipe.items():
        objs, pivo = nos[nome] if isinstance(nos[nome], tuple) else (nos[nome], (0, 0, 0))
        pv = Vector(pivo)
        loc = _valor(props['location'], q) if 'location' in props else pv
        rot = _valor(props['rotation_euler'], q) if 'rotation_euler' in props else Vector((0, 0, 0))
        esc = _valor(props['scale'], q) if 'scale' in props else Vector((1, 1, 1))
        from mathutils import Euler
        M = (Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @
             Matrix.Diagonal((*esc, 1)) @ Matrix.Translation(-pv))
        bpy.context.view_layer.update()
        for o in objs:
            o.matrix_world = M @ o.matrix_world


def exportar(pid, nos, vazios=None, clipes=None, grupo='', centrar=False, uv=False):
    """A `exportar` dos itens, gravando em `src/assets/objetos`. Os objetos já são montados no
    lugar (centrados no footprint, base em z = 0), então não recentra (`centrar=False`).
    `uv=True` grava as coordenadas de textura. Com `POSE=clipe:quadro`, grava a prévia parada."""
    pose = os.environ.get('POSE')
    if pose:
        clipe, q = pose.split(':')
        if not clipes or clipe not in clipes:
            print(f'POSE: {pid} não tem o clipe {clipe}')
            return None
        _posar(nos, clipes[clipe], float(q))
        lib_itens.SAIDA, lib_itens.RELATORIO = PREVIAS, os.path.join(PREVIAS, 'relatorio-poses.json')
        try:
            return _exportar_itens(f'{pid}-{clipe}-{q}', nos, vazios, None, grupo, centrar)
        finally:
            lib_itens.SAIDA, lib_itens.RELATORIO = SAIDA, RELATORIO
    lib_itens.SAIDA, lib_itens.RELATORIO = SAIDA, RELATORIO
    if not uv:
        return _exportar_itens(pid, nos, vazios, clipes, grupo, centrar)
    lib_itens.bpy = _BpyComUV()
    try:
        return _exportar_itens(pid, nos, vazios, clipes, grupo, centrar)
    finally:
        lib_itens.bpy = bpy


# A `rodar` dos itens chama a `exportar` do módulo dela: aponta para esta.
lib_itens.exportar = exportar
rodar = lib_itens.rodar
