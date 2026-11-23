"""A arte da capa do Passo a passo do projeto de O segredo da cabana (23/11/2026).

    PYTHONPATH=C:/Users/tocha/.cache/bpy-5.2.3 python docs/design/o-segredo-da-cabana-capa/capa.py
    CAPA_CONFERIR=1 PYTHONPATH=... python .../capa.py   # só confere o enquadre, sem render

No molde de `../ilha-do-farol-blender/capa.py`: a cena da Aula 2 (a ilha em 3D) montada com as
peças publicadas, os mesmos GLB da biblioteca de modelos dos cursos. As da ilha saem dos
`m-<sha>.generated.ts` de `packages/studio/src/core/course-models/` (o sha está em
`../ilha-do-farol-blender/modelos.json`); a cabana e o emblema saem de
`../o-segredo-da-cabana/assets/`, os mesmos arquivos publicados (`../o-segredo-da-cabana/modelos.json`).

Cada peça entra como o jogo a põe: o lado maior vira o tamanho do bloco "Criar o objeto" e o centro
da caixa vai para o lugar do bloco "Colocar o objeto". O cenário, o farol, as pedras e a cabana
ficam no lugar do jogo (`qa/ilha-do-farol-projeto.ts` e `qa/cabana-projeto.ts`); a chave, o
emblema e o aventureiro ficam onde a capa conta a história: o aventureiro sai da porta da cabana
fechada e anda para as duas peças, que flutuam no caminho até as pedras. A cabana fica fechada (a
pose de repouso, com a fechadura de ouro): o segredo é o que a criança vai programar. O coqueiro
da frente do cenário tapa quem fica entre ele e a câmera; por isso as peças ficam no caminho de
trás (z até 1,8), e a conferência mede quanto de cada peça aparece.

A capa usa a metade de cima da imagem (receita do caderno visual): a faixa "Passo a passo do
projeto" cobre a altura de 590 a 660 px da folha, que aqui são as linhas 1189 a 1330. Por isso a
câmera olha a ilha de frente e do alto, como no jogo, e mira um pouco abaixo das peças, que sobem na
imagem. `CAPA_CONFERIR=1` imprime a caixa de cada peça na imagem e quanto dela aparece (raios da
câmera até os vértices), sem renderizar: confira antes do render, que é um só.
"""
import base64, json, math, os, re, shutil, tempfile
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..', '..'))
BIBLIOTECA = os.path.join(RAIZ, 'packages', 'studio', 'src', 'core', 'course-models')
CABANA_GLB = os.path.join(RAIZ, 'docs', 'design', 'o-segredo-da-cabana', 'assets')
SAIDA = os.environ.get(
    'CABANA_CAPA',
    os.path.join(RAIZ, 'docs', 'aulas-interativas-tecnico', 'recursos', 'caderno-visual', 'arte',
                 'capa-o-segredo-da-cabana.jpg'),
)
LARGURA, ALTURA = 1600, 1390


def carregar(caminho):
    with open(caminho, encoding='utf-8') as f:
        return json.load(f)


MODELOS = {
    **carregar(os.path.join(RAIZ, 'docs', 'design', 'ilha-do-farol-blender', 'modelos.json')),
    **carregar(os.path.join(RAIZ, 'docs', 'design', 'o-segredo-da-cabana', 'modelos.json')),
}

# (peça, tamanho do bloco, centro no jogo (x, y, z com y para cima), giro em graus, clipe)
CENA = [
    ('cenario-praia-tropical', 140, (0, 33.6, 0), 0, None),
    ('farol-listrado', 5.3, (5.2, 2.7, 0.1), 0, 'aceso'),
    ('pedras', 4.5, (-2, 1.2, -0.5), 0, None),
    ('cabana-do-faroleiro', 3, (-9.3, 1.5, 0.4), 0, None),
    ('aventureiro', 1.6, (-6.4, 0.8, 0.8), 35, 'andando'),
    ('emblema-do-farol', 0.9, (-4.9, 1.2, 0.1), 0, None),
    ('chave-dourada', 1.2, (-3.3, 1.25, 1.8), 25, None),
]


def numero(nome, padrao):
    return float(os.environ.get(nome, padrao))


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def glb(peca, pasta):
    """O GLB publicado da peça: o da cabana na pasta das artes, o da ilha tirado da biblioteca."""
    proprio = os.path.join(CABANA_GLB, f'{peca}.glb')
    if os.path.exists(proprio):
        return proprio
    sha = MODELOS[peca]['sha']
    with open(os.path.join(BIBLIOTECA, f'm-{sha}.generated.ts'), encoding='utf-8') as f:
        dados = re.search(r"base64,([A-Za-z0-9+/=]+)'", f.read())
    if not dados:
        raise SystemExit(f'Modelo sem base64 na biblioteca: {peca}')
    caminho = os.path.join(pasta, f'{peca}.glb')
    with open(caminho, 'wb') as f:
        f.write(base64.b64decode(dados.group(1)))
    return caminho


def importar(caminho):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=caminho)
    return [o for o in bpy.data.objects if o not in antes]


def so_o_clipe(objs, clipe):
    """Deixa tocando só o clipe pedido (o importador traz todos como faixas do NLA)."""
    for o in objs:
        ad = o.animation_data
        if not ad:
            continue
        for t in ad.nla_tracks:
            t.mute = t.name != clipe
        ad.action = None


def colocar(pasta, peca, tamanho, centro, giro, clipe):
    objs = importar(glb(peca, pasta))
    raizes = [o for o in objs if o.parent is None]
    m = MODELOS[peca]
    s = tamanho / m['size']
    base = bpy.data.objects.new(f'{peca}-lugar', None)
    bpy.context.scene.collection.objects.link(base)
    for o in raizes:
        o.parent = base
    # O centro da caixa da peça (no jogo) vai para o lugar do bloco; o giro é em volta dele.
    c = jogo(*m['center']) * s
    base.scale = (s, s, s)
    base.rotation_euler = (0, 0, math.radians(giro))
    rot = base.rotation_euler.to_matrix()
    base.location = jogo(*centro) - rot @ c
    if clipe:
        so_o_clipe(objs, clipe)
    return objs


def luz_e_camera():
    sc = bpy.context.scene
    mundo = bpy.data.worlds.new('ceu')
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes['Background']
    fundo.inputs['Color'].default_value = (1, 1, 1, 1)
    fundo.inputs['Strength'].default_value = numero('CAPA_AMBIENTE', '0.75')
    sc.world = mundo
    sol = bpy.data.lights.new('sol', 'SUN')
    sol.energy = numero('CAPA_SOL', '3.6')
    sol.angle = math.radians(8)
    lampada = bpy.data.objects.new('sol', sol)
    lampada.rotation_euler = (math.radians(48), math.radians(-12), math.radians(-35))
    sc.collection.objects.link(lampada)
    cam = bpy.data.cameras.new('camera')
    cam.lens = numero('CAPA_LENTE', '40')
    camera = bpy.data.objects.new('camera', cam)
    sc.collection.objects.link(camera)
    # A câmera fica na frente e no alto, um pouco à direita: a cabana aparece de frente e de lado.
    alvo = Vector((numero('CAPA_ALVO_X', '-5.8'), numero('CAPA_ALVO_Y', '0'),
                   numero('CAPA_ALVO_Z', '1.6')))
    distancia = numero('CAPA_DISTANCIA', '15.5')
    altura = math.radians(numero('CAPA_ALTURA', '42'))
    lado = math.radians(numero('CAPA_LADO', '12'))
    olho = alvo + distancia * Vector((math.cos(altura) * math.sin(lado), math.sin(altura),
                                      math.cos(altura) * math.cos(lado)))
    camera.location = jogo(*olho)
    camera.rotation_euler = (jogo(*alvo) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = camera
    return camera


def visivel(sc, camera, objs):
    """A parte da peça que a câmera vê: lança um raio da câmera até cada vértice (até 400 por
    peça) e conta os que chegam sem bater antes em outra peça ou no cenário (o coqueiro da
    frente, por exemplo)."""
    deps = bpy.context.evaluated_depsgraph_get()
    nomes = {o.name for o in objs}
    origem = camera.matrix_world.translation
    vertices = [o.matrix_world @ v.co for o in objs if o.type == 'MESH' for v in o.data.vertices]
    passo = max(1, len(vertices) // 400)
    amostra = vertices[::passo]
    vistos = 0
    for ponto in amostra:
        direcao = ponto - origem
        distancia = direcao.length
        acertou, onde, _, _, obj, _ = sc.ray_cast(deps, origem, direcao.normalized(),
                                                  distance=distancia + 0.01)
        if not acertou or obj.name in nomes or (onde - origem).length >= distancia - 0.02:
            vistos += 1
    return vistos / max(1, len(amostra))


def conferir(camera, pecas):
    """A caixa de cada peça na imagem (em pixels, com y descendo) e quanto dela aparece."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    for peca, objs in pecas:
        pontos = []
        for o in objs:
            if o.type != 'MESH':
                continue
            for canto in o.bound_box:
                p = world_to_camera_view(sc, camera, o.matrix_world @ Vector(canto))
                pontos.append((p.x * LARGURA, (1 - p.y) * ALTURA))
        if not pontos:
            continue
        xs, ys = [p[0] for p in pontos], [p[1] for p in pontos]
        parte = '' if peca.startswith('cenario') else f'   à vista {visivel(sc, camera, objs):4.0%}'
        print(f'{peca:24s} x {min(xs):7.0f} a {max(xs):7.0f}   y {min(ys):7.0f} a {max(ys):7.0f}{parte}')
    print('A faixa cobre y 1189 a 1330; o degradê do painel começa em y 1105.')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = LARGURA, ALTURA
    sc.render.resolution_percentage = 100
    # Os GLB tirados da biblioteca ficam numa pasta temporária só desta execução, até o render.
    pasta = tempfile.mkdtemp(prefix='capa-cabana-')
    try:
        # CAPA_PECAS (JSON {peça: [x, y, z, giro]}) testa outros lugares no modo de conferência.
        outros = json.loads(os.environ.get('CAPA_PECAS', '{}'))
        cena = [(p, t, tuple(outros[p][:3]), outros[p][3], c) if p in outros else (p, t, l, g, c)
                for p, t, l, g, c in CENA]
        pecas = [(p[0], colocar(pasta, *p)) for p in cena]
        camera = luz_e_camera()
        # O meio do clipe: a luz do farol no alto do giro e o passo do aventureiro aberto.
        sc.frame_set(int(numero('CAPA_QUADRO', '1')))
        if os.environ.get('CAPA_CONFERIR'):
            conferir(camera, pecas)
            return
        sc.render.engine = 'BLENDER_EEVEE'
        sc.view_settings.view_transform = 'Standard'
        sc.render.image_settings.file_format = 'JPEG'
        sc.render.image_settings.quality = 92
        sc.render.filepath = SAIDA
        bpy.ops.render.render(write_still=True)
        print('capa gerada em', SAIDA)
    finally:
        shutil.rmtree(pasta, ignore_errors=True)


main()
