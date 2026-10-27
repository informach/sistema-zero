"""Ajudantes do Lote 7 do Arquipélago Vagalume: kit de movimento, veículos e festas.

Cópia do `arte/itens/lib_itens.py` (mesmas formas, torno, paleta e exportação), com três mudanças:

- `exportar(..., pasta='festas' | 'movimento')` grava em `src/assets/<pasta>/`;
- os nós vazios podem ser filhos de um nó animado (`pais={vazio: nó}`): a `pegada` do cipó e o
  `assento` dos barcos acompanham o clipe;
- a pose de repouso é lida ANTES de gravar os clipes, então clipes de posição (flutuar, balançar)
  também voltam ao lugar certo no arquivo.

Convenções: no Blender z é para cima e a frente olha para -Y (o glTF converte para o y para cima
do three.js). Cada peça sai com a origem no meio da BASE (o ponto mais baixo em y = 0, centrado
em x e z), na escala do avatar (1,6 de altura) e do Zappy. As peças vestidas no avatar (mergulho,
patins) saem na posição em que ficam no corpo, com a origem nos pés do avatar.
"""
import json
import math
import os
import sys

sys.dont_write_bytecode = True

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..', '..'))
ASSETS = os.environ.get('FESTAS_OUT', os.path.join(AQUI, '..', '..', 'src', 'assets'))
SAIDA = os.path.join(ASSETS, 'festas')
for _p in ('festas', 'movimento'):
    os.makedirs(os.path.join(ASSETS, _p), exist_ok=True)

os.environ['ROOM_OUT'] = SAIDA
os.environ['ILHA_OUT'] = SAIDA
sys.path.insert(0, os.path.join(RAIZ, 'packages/community-kids/scripts/room-blender'))
sys.path.insert(0, os.path.join(RAIZ, 'docs/design/ilha-do-farol-blender'))
import lib_q  # noqa: E402
import lib_ilha  # noqa: E402
from lib_ilha import *  # noqa: E402,F401,F403  (box, cyl, sphere, uvball, cone, torus, tube, prism, leaf…)

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

R = math.radians

# (cor, rugosidade, emissão, força). O jogo acha os materiais pelo NOME (README).
lib_q.PALETTE.update({
    # comuns
    'madeira': ('#b98657', 0.85, None, 0),
    'madeiraClara': ('#d8b07a', 0.85, None, 0),
    'madeiraEscura': ('#7c5836', 0.85, None, 0),
    'metal': ('#b9c0c7', 0.35, None, 0),
    'metalEscuro': ('#4a4f57', 0.5, None, 0),
    'ferro': ('#3c4250', 0.55, None, 0),
    'ouro': ('#f3b123', 0.3, '#ffcf55', 0.2),
    'papel': ('#fff6e3', 0.9, None, 0),
    'papelSombra': ('#f1e3c4', 0.9, None, 0),
    'tinta': ('#34507e', 0.6, None, 0),
    'corda': ('#d8b57a', 0.95, None, 0),
    'luz': ('#fff3c4', 0.4, '#ffd27a', 1.0),
    # pratos e louça
    'loucaBranca': ('#fffaf3', 0.45, None, 0),
    'loucaAzul': ('#7fb2e6', 0.5, None, 0),
    'loucaVerde': ('#8fd3a8', 0.5, None, 0),
    'barro': ('#c8714e', 0.85, None, 0),
    'barroEscuro': ('#9c5536', 0.85, None, 0),
    'cuia': ('#8a5a33', 0.8, None, 0),
    'guardanapo': ('#e0584f', 0.9, None, 0),
    # colheita
    'folhaAlface': ('#8fdc6a', 0.75, None, 0),
    'folhaAlfaceEscura': ('#5fb84e', 0.75, None, 0),
    'nervura': ('#d8f5b0', 0.75, None, 0),
    'tomate': ('#e0584f', 0.4, None, 0),
    'tomateBrilho': ('#ff8a7a', 0.4, None, 0),
    'cabinho': ('#4f9a45', 0.8, None, 0),
    'milho': ('#f5c330', 0.5, None, 0),
    'milhoClaro': ('#ffe08a', 0.55, None, 0),
    'palha': ('#b7d477', 0.8, None, 0),
    'palhaClara': ('#d6e89a', 0.8, None, 0),
    'cabeloMilho': ('#d9a35a', 0.9, None, 0),
    'morango': ('#ff4f6d', 0.4, None, 0),
    'pintinha': ('#ffe9a8', 0.6, None, 0),
    'alga': ('#3fbf8f', 0.6, None, 0),
    'algaEscura': ('#2a9a72', 0.6, None, 0),
    'batataDoce': ('#c45a8a', 0.8, None, 0),
    'batataDoceClara': ('#e08ab0', 0.8, None, 0),
    'abobora': ('#f28a2e', 0.6, None, 0),
    'aboboraEscura': ('#d96d1c', 0.6, None, 0),
    'algodao': ('#ffffff', 0.95, None, 0),
    'algodaoSombra': ('#eef1f7', 0.95, None, 0),
    'casulo': ('#8a6a4a', 0.85, None, 0),
    'folha': ('#58b05a', 0.8, None, 0),
    'folhaEscura': ('#3f9a4f', 0.8, None, 0),
    # comidas
    'pipoca': ('#fff3d6', 0.9, None, 0),
    'pipocaMiolo': ('#f6d77a', 0.9, None, 0),
    'saquinho': ('#e0584f', 0.8, None, 0),
    'saquinhoListra': ('#fffaf3', 0.8, None, 0),
    'paoDeQueijo': ('#f2c066', 0.85, None, 0),
    'paoDeQueijoTopo': ('#e0a24a', 0.85, None, 0),
    'bolo': ('#f2c94c', 0.85, None, 0),
    'boloTopo': ('#d9a03a', 0.85, None, 0),
    'erva': ('#6fae4f', 0.8, None, 0),
    'brigadeiro': ('#5a3424', 0.7, None, 0),
    'granulado': ('#3a2016', 0.7, None, 0),
    'forminha': ('#ff8fb8', 0.8, None, 0),
    'acai': ('#5b2a6e', 0.45, None, 0),
    'banana': ('#fff0b0', 0.7, None, 0),
    'granola': ('#c89a5a', 0.9, None, 0),
    'caldoMoqueca': ('#f29a3a', 0.4, None, 0),
    'peixe': ('#f6ead8', 0.7, None, 0),
    'pimentao': ('#e0584f', 0.6, None, 0),
    'pimentaoVerde': ('#6cbf4e', 0.6, None, 0),
    'coentro': ('#3f9a4f', 0.8, None, 0),
    'cebola': ('#fff2f6', 0.7, None, 0),
    'molhoCoco': ('#fff6e0', 0.45, None, 0),
    'peixeAssado': ('#e8b070', 0.7, None, 0),
    'peixeAssadoEscuro': ('#c98a4a', 0.7, None, 0),
    'coco': ('#7a5132', 0.85, None, 0),
    'cocoBranco': ('#fffaf3', 0.7, None, 0),
    'limao': ('#9ccf5a', 0.6, None, 0),
    # ferramentas
    'regador': ('#5bb8d6', 0.5, None, 0),
    'regadorEscuro': ('#3f97b6', 0.5, None, 0),
    'cabo': ('#c58b52', 0.8, None, 0),
    'lamina': ('#9aa3ab', 0.4, None, 0),
    'rede': ('#fff6e3', 0.9, None, 0),
    'aro': ('#5b8fd6', 0.6, None, 0),
    'vara': ('#c9a06a', 0.8, None, 0),
    'molinete': ('#e0584f', 0.5, None, 0),
    'linha': ('#ffffff', 0.6, None, 0),
    'boia': ('#e0584f', 0.6, None, 0),
    'boiaBranca': ('#ffffff', 0.6, None, 0),
    'vidroLanterna': ('#fff3c4', 0.15, '#ffd27a', 1.0),
    # coleção
    'envelope': ('#f6ead0', 0.9, None, 0),
    'lacre': ('#d9434f', 0.5, None, 0),
    'capaDiario': ('#5b8fd6', 0.8, None, 0),
    'bauMadeira': ('#a8754a', 0.85, None, 0),
    'bauMadeiraClara': ('#c58b52', 0.85, None, 0),
    'bauFaixa': ('#e8b23a', 0.35, None, 0),
    'bauMiolo': ('#5a3424', 0.9, None, 0),
    'tesouro': ('#ffd84f', 0.3, '#ffd84f', 0.25),
    # lugares
    'luneta': ('#e8b23a', 0.35, None, 0),
    'lunetaEscura': ('#34507e', 0.5, None, 0),
    'vidroLente': ('#bfe3f0', 0.1, None, 0),
    'quadro': ('#fffaf3', 0.85, None, 0),
    'cor-1': ('#e0584f', 0.6, None, 0),
    'cor-2': ('#f28a2e', 0.6, None, 0),
    'cor-3': ('#f2c94c', 0.6, None, 0),
    'cor-4': ('#58b05a', 0.6, None, 0),
    'cor-5': ('#5b8fd6', 0.6, None, 0),
    'cor-6': ('#9b6fd0', 0.6, None, 0),
    'placa': ('#d8b07a', 0.85, None, 0),
    'placaFace': ('#f6e2bf', 0.85, None, 0),
    # cozinha
    'fogaoParede': ('#fbe7d2', 0.85, None, 0),
    'fogaoTijolo': ('#c8714e', 0.9, None, 0),
    'fogaoTijoloEscuro': ('#a85a3c', 0.9, None, 0),
    'chapa': ('#3c4250', 0.55, None, 0),
    'fogo': ('#ff9a3d', 0.4, '#ff7a1f', 1.0),
    'brasa': ('#ffd84f', 0.4, '#ffb03a', 1.0),
    'lenha': ('#7c5836', 0.9, None, 0),
    'panela': ('#e0584f', 0.45, None, 0),
    'panelaInterna': ('#f3efe7', 0.5, None, 0),
    'tabua': ('#d8b07a', 0.85, None, 0),
})


# Lote 7: movimento, veículos e festas.
lib_q.PALETTE.update({
    # movimento
    'cipo': ('#6f9a3a', 0.85, None, 0),
    'cipoEscuro': ('#4f7a2a', 0.85, None, 0),
    'folhaCipo': ('#7cc35a', 0.8, None, 0),
    'pegadaCipo': ('#c58b52', 0.8, None, 0),
    'mascaraBorracha': ('#2f7fd6', 0.55, None, 0),
    'mascaraVidro': ('#bfe9ff', 0.08, None, 0),
    'snorkel': ('#f2c94c', 0.5, None, 0),
    'pePato': ('#ff7a3d', 0.55, None, 0),
    'pePatoEscuro': ('#e05a24', 0.55, None, 0),
    'velaPlanador': ('#ff6f61', 0.75, None, 0),
    'velaPlanador2': ('#ffd84f', 0.75, None, 0),
    'velaPlanador3': ('#5bb8d6', 0.75, None, 0),
    'tuboPlanador': ('#d8dde3', 0.35, None, 0),
    'patim': ('#9b6fd0', 0.5, None, 0),
    'patimClaro': ('#f6f0ff', 0.6, None, 0),
    'roda': ('#5bd6b8', 0.45, None, 0),
    'cadarco': ('#ffffff', 0.8, None, 0),
    # veículos
    'cascoAmarelo': ('#f5c330', 0.55, None, 0),
    'cascoAzul': ('#3f86c8', 0.55, None, 0),
    'cascoBranco': ('#fbf7ef', 0.55, None, 0),
    'cascoVermelho': ('#e0584f', 0.55, None, 0),
    'convesMadeira': ('#c58b52', 0.85, None, 0),
    'vidroCabine': ('#bfe3f0', 0.1, None, 0),
    'boiaLaranja': ('#ff8a3d', 0.6, None, 0),
    'bandeira': ('#58b05a', 0.8, None, 0),
    # carnaval
    'confeteRosa': ('#ff6fb5', 0.6, None, 0),
    'confeteAzul': ('#4fb3ff', 0.6, None, 0),
    'confeteAmarelo': ('#ffd84f', 0.6, None, 0),
    'confeteVerde': ('#6ad66a', 0.6, None, 0),
    'confeteLilas': ('#b98aff', 0.6, None, 0),
    'brilho': ('#ffe27a', 0.25, '#ffd84f', 0.35),
    'parede': ('#fff1dc', 0.9, None, 0),
    'carroBase': ('#7a4fd6', 0.5, None, 0),
    'carroRoda': ('#3c4250', 0.6, None, 0),
    'pena': ('#ff4f9a', 0.8, None, 0),
    # festa junina
    'bandeiraVermelha': ('#e8443a', 0.8, None, 0),
    'bandeiraAzul': ('#3f86e8', 0.8, None, 0),
    'bandeiraAmarela': ('#ffd23f', 0.8, None, 0),
    'bandeiraVerde': ('#3fbf5f', 0.8, None, 0),
    'bandeiraRosa': ('#ff7ab8', 0.8, None, 0),
    'barbante': ('#e8dcc0', 0.9, None, 0),
    'chita': ('#e8443a', 0.8, None, 0),
    'chitaFlor': ('#ffd23f', 0.8, None, 0),
    'toldoListra': ('#fffaf0', 0.8, None, 0),
    'aguaPescaria': ('#5bc4e6', 0.2, None, 0),
    'peixinho': ('#ff8a3d', 0.5, None, 0),
    'suco': ('#ff9f43', 0.3, None, 0),
    'balaoPapel': ('#ff7a3d', 0.8, '#ffb070', 0.15),
    # noite das lanternas
    'lanternaVermelha': ('#ff5a4f', 0.6, '#ff6a50', 0.8),
    'lanternaAmarela': ('#ffc93f', 0.6, '#ffc040', 0.8),
    'lanternaAzul': ('#5aa8ff', 0.6, '#5aa8ff', 0.8),
    'lanternaRosa': ('#ff8fc8', 0.6, '#ff8fc8', 0.8),
    'folhaLotus': ('#4fb36a', 0.7, None, 0),
    'fio': ('#4a4f57', 0.6, None, 0),
    # fim de ano
    'tronco': ('#a87a4a', 0.9, None, 0),
    'troncoAnel': ('#8a5f36', 0.9, None, 0),
    'palmeira': ('#3fae5a', 0.75, None, 0),
    'palmeiraClara': ('#5fce6a', 0.75, None, 0),
    'enfeiteVermelho': ('#e8443a', 0.3, None, 0),
    'enfeiteAzul': ('#3f86e8', 0.3, None, 0),
    'estrela': ('#ffd84f', 0.3, '#ffd84f', 0.6),
    'foguete': ('#e8443a', 0.5, None, 0),
    'fogoArtificio1': ('#ff5ab0', 0.4, '#ff5ab0', 1.0),
    'fogoArtificio2': ('#5ad0ff', 0.4, '#5ad0ff', 1.0),
    'fogoArtificio3': ('#ffd84f', 0.4, '#ffd84f', 1.0),
    'toalha': ('#fffaf3', 0.85, None, 0),
    'toalhaBarra': ('#3fae5a', 0.85, None, 0),
    'uva': ('#7a3fa8', 0.4, None, 0),
    'abacaxi': ('#f5c330', 0.6, None, 0),
    'panetone': ('#e0a24a', 0.8, None, 0),
})


def novo():
    """Cena limpa para o próximo item."""
    lib_q.reset()


# ---------------------------------------------------------------- formas
def torneado(perfil, m, seg=24, pos=(0, 0, 0), liso=True):
    """Peça de torno a partir do perfil [(raio, z), …] de baixo para cima (prato, tigela, panela).

    Raio 0 nas pontas fecha a peça num leque; sem raio 0 a ponta fica aberta (borda de tigela)."""
    bm = bmesh.new()
    aneis = []
    for r, z in perfil:
        if r <= 1e-6:
            aneis.append([bm.verts.new((pos[0], pos[1], pos[2] + z))])
        else:
            aneis.append([bm.verts.new((pos[0] + r * math.cos(2 * math.pi * k / seg),
                                        pos[1] + r * math.sin(2 * math.pi * k / seg), pos[2] + z))
                          for k in range(seg)])
    for a, b in zip(aneis, aneis[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for k in range(seg):
                bm.faces.new((a[0], b[k], b[(k + 1) % seg]))
        elif len(b) == 1:
            for k in range(seg):
                bm.faces.new((a[k], a[(k + 1) % seg], b[0]))
        else:
            for k in range(seg):
                bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('torno', bm, m)
    for p in o.data.polygons:
        p.use_smooth = liso
    if liso:
        o.data.set_sharp_from_angle(angle=R(50))
    return o


def prato(r=0.17, m='loucaBranca', pos=(0, 0, 0), fundo=0.012):
    """Prato raso: base, aba levantada e um friso."""
    return torneado([(0, 0), (r * 0.6, 0), (r * 0.64, 0.006), (r * 0.66, fundo), (r * 0.94, fundo + 0.02),
                     (r, fundo + 0.03), (r * 0.96, fundo + 0.035), (r * 0.66, fundo + 0.014), (0, fundo + 0.014)],
                    m, seg=28, pos=pos)


TOPO_DO_PRATO = 0.026  # z do miolo do prato (onde a comida pousa)


def tigela(r=0.12, h=0.08, m='loucaAzul', pos=(0, 0, 0), espessura=0.012):
    """Tigela com pé e borda grossa; devolve (tigela, altura do miolo)."""
    perfil = [(0, 0), (r * 0.45, 0), (r * 0.5, 0.012), (r * 0.62, 0.02), (r * 0.86, h * 0.45),
              (r, h), (r - espessura, h + 0.004), (r - espessura * 1.4, h * 0.95),
              (r * 0.8, h * 0.5), (r * 0.45, h * 0.28), (0, h * 0.26)]
    return torneado(perfil, m, seg=26, pos=pos), h * 0.26


def disco(r, z, m, seg=24, pos=(0, 0, 0)):
    """Disco chato (o caldo de uma tigela, a superfície de um bolo)."""
    return torneado([(0, z), (r, z)], m, seg=seg, pos=pos)


def esfera(r, pos, m, escala=(1, 1, 1), seg=16, aneis=10):
    return uvball(r, pos, m, scale=escala, seg=seg, ring=aneis)


def deformar(o, f):
    """`f(Vector) -> Vector` em cada vértice (coordenadas locais)."""
    for v in o.data.vertices:
        v.co = f(v.co.copy())
    o.data.update()
    return o


# ---------------------------------------------------------------- exportação
def _contar(objs):
    return sum(len(p.vertices) - 2 for o in objs if o.type == 'MESH' for p in o.data.polygons)


def _caixa(objs):
    bpy.context.view_layer.update()
    mn = Vector((1e9, 1e9, 1e9))
    mx = -mn
    for o in objs:
        if o.type != 'MESH':
            continue
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            mn = Vector(map(min, mn, w))
            mx = Vector(map(max, mx, w))
    return mn, mx


def _juntar(objs, nome, pivo=None):
    objs = [o for o in objs if o is not None]
    if len(objs) > 1:
        o = lib_q.join(objs, nome)
    else:
        o = objs[0]
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.name = nome
    o.data.name = nome
    if pivo is not None:
        pv = Vector(pivo)
        for v in o.data.vertices:
            v.co -= pv
        o.location = pv
    return o


RELATORIO = os.path.join(AQUI, 'relatorio.json')


def exportar(pid, nos, vazios=None, clipes=None, grupo='', centrar=True, pasta='festas', pais=None,
             escala_repouso=None):
    """Grava `src/assets/<pasta>/pid.glb`.

    - `nos` = {nome: [objetos]} ou {nome: ([objetos], pivô)}: cada nó vira UMA malha com o pivô dado;
    - `vazios` = {nome: ponto}: nós vazios (`pegada`, `assento`, `cabeca`, `pe-esq`…);
    - `pais` = {vazio: nó}: o vazio vira filho do nó e acompanha os clipes dele;
    - `clipes` = {clipe: {nó: {'rotation_euler' | 'location' | 'scale': [(quadro, valor), …]}}}
      gravados como faixas do NLA (um clipe do glTF por nome, como na Ilha do Farol). Os valores de
      `location` são deslocamentos a partir do pivô do nó;
    - `escala_repouso` = {nó: escala}: a escala do nó parado (o estouro dos fogos começa pequenino).

    Antes de juntar, tudo é deslocado para a origem ficar no meio da base (`centrar`)."""
    vazios = dict(vazios or {})
    pais = dict(pais or {})
    todos = [o for val in nos.values() for o in (val[0] if isinstance(val, tuple) else val)]
    if centrar:
        mn, mx = _caixa(todos)
        d = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
        lib_ilha.place(todos, loc=d)
        nos = {k: ((v[0], tuple(Vector(v[1]) + d)) if isinstance(v, tuple) else v) for k, v in nos.items()}
        vazios = {k: tuple(Vector(p) + d) for k, p in vazios.items()}
    juntos = {}
    for nome, val in nos.items():
        objs, pivo = (val if isinstance(val, tuple) else (val, None))
        juntos[nome] = _juntar(list(objs), nome, pivo)
    for n, k in (escala_repouso or {}).items():
        juntos[n].scale = (k, k, k)
    # Pose de repouso de cada nó (antes dos clipes: gravar as chaves move o objeto).
    descanso = {n: (o.location.copy(), o.rotation_euler.copy(), o.scale.copy()) for n, o in juntos.items()}
    extras = []
    for nome, p in vazios.items():
        e = bpy.data.objects.new(nome, None)
        e.empty_display_size = 0.05
        bpy.context.scene.collection.objects.link(e)
        e.location = Vector(p)
        if nome in pais:
            pai = juntos[pais[nome]]
            bpy.context.view_layer.update()
            e.parent = pai
            e.matrix_parent_inverse = pai.matrix_world.inverted()
        extras.append(e)
    repouso = {}
    if clipes:
        conv = {}
        for c, por in clipes.items():
            conv[c] = {}
            for n, props in por.items():
                o = juntos[n]
                base = descanso[n][0]
                props = dict(props)
                if 'location' in props:
                    props['location'] = [(q, tuple(Vector(v) + base)) for q, v in props['location']]
                conv[c][o] = props
        lib_ilha.clipes(conv)
        for n, o in juntos.items():
            loc, rot, sc = descanso[n]
            o.location, o.rotation_euler, o.scale = loc, rot, sc
            if o.animation_data and o.animation_data.nla_tracks:
                repouso[o.name] = {'translation': (loc.x, loc.z, -loc.y), 'scale': (sc.x, sc.z, sc.y)}
                for t in o.animation_data.nla_tracks:
                    for st in t.strips:
                        st.extrapolation = 'NOTHING'
        bpy.context.scene.frame_current = -50
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(juntos.values()) + extras:
        o.select_set(True)
    path = os.path.join(ASSETS, pasta, f'{pid}.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_texcoords=False, export_extras=False, export_animations=bool(clipes))
    if clipes:
        kw.update(export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True, export_force_sampling=True,
                  export_optimize_animation_size=False)
    bpy.ops.export_scene.gltf(**kw)
    if repouso:
        lib_ilha.repouso_no_glb(path, repouso)
    objs = list(juntos.values())
    tris = _contar(objs)
    kb = os.path.getsize(path) / 1024
    mn, mx = _caixa(objs)
    mats = sorted({m.name for o in objs for m in o.data.materials})
    dados = {
        'pasta': pasta,
        'grupo': grupo,
        'triangulos': tris,
        'kb': round(kb, 1),
        'nos': {o.name: _contar([o]) for o in objs},
        'vazios': sorted(vazios),
        'clipes': sorted(clipes or {}),
        'materiais': mats,
        # largura (x), altura (y do jogo) e fundo (z do jogo), em unidades do jogo
        'tamanho': [round(mx.x - mn.x, 3), round(mx.z - mn.z, 3), round(mx.y - mn.y, 3)],
    }
    print(f'EXPORTADO {pid}: {tris} triângulos, {kb:.0f} KB, nós {list(dados["nos"])}, clipes {dados["clipes"]}')
    try:
        with open(RELATORIO) as f:
            rel = json.load(f)
    except (OSError, ValueError):
        rel = {}
    rel[pid] = dados
    with open(RELATORIO, 'w') as f:
        f.write(json_como_biome(dict(sorted(rel.items()))) + '\n')
    return path


def json_como_biome(v, nivel=0, prefixo=0):
    """JSON no formato do biome do repositório (2 espaços, listas curtas numa linha só, até 100
    colunas): o relatório sai já formatado e o lint não acusa diferença a cada exportação."""
    pad = '  ' * nivel
    if isinstance(v, dict):
        if not v:
            return '{}'
        linhas = []
        for i, (k, x) in enumerate(v.items()):
            chave = json.dumps(k, ensure_ascii=False) + ': '
            fim = ',' if i < len(v) - 1 else ''
            linhas.append(pad + '  ' + chave + json_como_biome(x, nivel + 1, len(pad) + 2 + len(chave)) + fim)
        return '{\n' + '\n'.join(linhas) + '\n' + pad + '}'
    if isinstance(v, list):
        curta = '[' + ', '.join(json.dumps(x, ensure_ascii=False) for x in v) + ']'
        if all(not isinstance(x, (dict, list)) for x in v) and prefixo + len(curta) + 1 <= 100:
            return curta
        itens = [pad + '  ' + json_como_biome(x, nivel + 1, len(pad) + 2) for x in v]
        return '[\n' + ',\n'.join(itens) + '\n' + pad + ']'
    return json.dumps(v, ensure_ascii=False)


def enfileirar(pecas, vao=0.5, largura_max=6.0):
    """Põe as peças de uma festa lado a lado (em fileiras de até `largura_max`), cada uma com o
    pivô no meio da própria base.

    `pecas` = [(nome, objetos)], cada uma montada em volta da origem. Devolve `nos` para
    `exportar` e o deslocamento aplicado a cada peça (para levar junto os vazios dela). No jogo,
    cada nó é uma peça que pode ser copiada e posta em qualquer lugar."""
    nos, desl = {}, {}
    x, y, fundo_fileira = 0.0, 0.0, 0.0
    for nome, objs in pecas:
        mn, mx = _caixa(objs)
        larg, fundo = mx.x - mn.x, mx.y - mn.y
        if x > 0 and x + larg > largura_max:
            x, y = 0.0, y + fundo_fileira + vao
            fundo_fileira = 0.0
        cx, cy = x + larg / 2, y + fundo / 2
        d = (cx - (mn.x + mx.x) / 2, cy - (mn.y + mx.y) / 2, -mn.z)
        lib_ilha.place(objs, loc=d)
        nos[nome] = (objs, (cx, cy, 0.0))
        desl[nome] = Vector(d)
        x += larg + vao
        fundo_fileira = max(fundo_fileira, fundo)
    return nos, desl


def rodar(itens, so=None):
    """Monta e exporta cada item numa cena limpa. `itens` = [(id, função)]; a função devolve os
    argumentos de `exportar` (`nos` e, se quiser, `vazios` e `clipes`). `so` filtra por id
    (variável PECA na linha de comando)."""
    so = so or os.environ.get('PECA')
    for pid, fn in itens:
        if so and pid not in so.split(','):
            continue
        novo()
        res = fn()
        if isinstance(res, dict) and 'nos' in res:
            exportar(pid, **res)
        else:
            exportar(pid, res)


def pintar_por(o, regra):
    """Troca o material de cada face: `regra(centro, normal)` devolve a chave da paleta ou None."""
    bpy.context.view_layer.update()
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


def malha(nome, verts, faces, m, liso=True):
    """Malha crua a partir de listas (vértices do Blender, faces por índice)."""
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(lib_q.mat(m))
    for p in o.data.polygons:
        p.use_smooth = liso
    return o


def meio_cilindro(comprimento, raio, z0, m, seg=14, achatado=1.0):
    """Meio cilindro deitado em x, com a parte reta em z0 (a tampa abaulada de um baú)."""
    bm = bmesh.new()
    lados = []
    for s in (-1, 1):
        lados.append([bm.verts.new((s * comprimento / 2, raio * math.cos(math.pi * k / seg),
                                    z0 + raio * achatado * math.sin(math.pi * k / seg))) for k in range(seg + 1)])
    a, b = lados
    for k in range(seg):
        bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    bm.faces.new((a[0], b[0], b[-1], a[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('meio-cilindro', bm, m)
    for p in o.data.polygons:
        p.use_smooth = abs(p.normal.x) < 0.5 and p.normal.z > -0.5
    return o
