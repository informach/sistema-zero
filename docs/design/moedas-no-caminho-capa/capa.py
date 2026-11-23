"""A arte da capa do Passo a passo do projeto de Moedas no caminho (23/11/2026).

    PYTHONPATH=C:/Users/tocha/.cache/bpy-5.2.3 python docs/design/moedas-no-caminho-capa/capa.py
    MOEDAS_CONFERIR=1 PYTHONPATH=... python .../capa.py   # só confere o enquadre, sem render

No molde de `../ilha-do-farol-blender/capa.py`: a cena da Aula 2 (as moedas na ilha em 3D)
montada com as peças publicadas, os mesmos GLB da biblioteca de modelos dos cursos. As da ilha
saem dos `m-<sha>.generated.ts` de `packages/studio/src/core/course-models/` (o sha está em
`../ilha-do-farol-blender/modelos.json`); a moeda e o baú saem de `../moedas-no-caminho/assets/`,
os mesmos arquivos publicados (`../moedas-no-caminho/modelos.json`).

Cada peça entra como o jogo a põe: o lado maior vira o tamanho do bloco "Criar o objeto" e o centro
da caixa vai para o lugar do bloco "Colocar o objeto". O cenário, o farol, as pedras e as moedas
ficam no lugar do jogo (`qa/ilha-do-farol-projeto.ts` e `qa/moedas-projeto.ts`: na frente da
pedra, na ponte e a sexta no gramado de trás). O baú e o aventureiro ficam onde a capa conta a
história: o aventureiro acabou de pegar a primeira moeda (o lugar dela é onde ele está) e segue
pela trilha para a próxima, e o baú, aberto e com o tesouro à vista, fica na areia da frente, no
meio da cena. O farol fica apagado, como no começo da partida: o brilho da capa é o das moedas.
O coqueiro da frente cobriria o começo da trilha; por isso o aventureiro já está na primeira moeda.

O baú aberto é o último quadro do clipe `abrir` (a faixa do NLA tocada de trás para a frente,
parada no começo). A capa usa a metade de cima da imagem (receita do caderno visual): a faixa
"Passo a passo do projeto" cobre a altura de 590 a 660 px da folha, que aqui são as linhas 1189 a
1330. Por isso a câmera olha a ilha de frente e do alto, como no jogo, e mira abaixo das peças, que
sobem na imagem. `MOEDAS_CONFERIR=1` imprime a caixa de cada peça na imagem, sem renderizar.
"""
import base64, json, math, os, re, shutil, tempfile
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..', '..'))
BIBLIOTECA = os.path.join(RAIZ, 'packages', 'studio', 'src', 'core', 'course-models')
MOEDAS_GLB = os.path.join(RAIZ, 'docs', 'design', 'moedas-no-caminho', 'assets')
SAIDA = os.environ.get(
    'MOEDAS_CAPA',
    os.path.join(RAIZ, 'docs', 'aulas-interativas-tecnico', 'recursos', 'caderno-visual', 'arte',
                 'capa-moedas-no-caminho.jpg'),
)
LARGURA, ALTURA = 1600, 1390


def carregar(caminho):
    with open(caminho, encoding='utf-8') as f:
        return json.load(f)


MODELOS = {
    **carregar(os.path.join(RAIZ, 'docs', 'design', 'ilha-do-farol-blender', 'modelos.json')),
    **carregar(os.path.join(RAIZ, 'docs', 'design', 'moedas-no-caminho', 'modelos.json')),
}
ILHA = ('cenario-praia-tropical', 'farol-listrado', 'pedras', 'aventureiro')

# O lugar das moedas no jogo (x, z) e a altura do centro delas (`MOEDAS_3D` em moedas-projeto.ts).
# A primeira já foi pega: a capa põe as outras cinco.
MOEDAS = [(-4.4, 1.75), (-2.2, 1.75), (1.0, 0.75), (2.1, 0.75), (3.2, 0.75), (-8.6, -3.2)]
Y_MOEDA = 0.42

# (peça, tamanho do bloco, centro no jogo (x, y, z com y para cima), giro em graus, clipe, fim do
# clipe). O farol toca o começo de `acender` (apagado); o baú, o fim de `abrir` (aberto).
CENA = [
    ('cenario-praia-tropical', 140, (0, 33.6, 0), 0, None, False),
    ('farol-listrado', 5.3, (5.2, 2.7, 0.1), 0, 'acender', False),
    ('pedras', 4.5, (-2, 1.2, -0.5), 0, None, False),
    ('bau-do-tesouro', 1.12, (-1.0, 0.47, 3.8), 0, 'abrir', True),
    ('aventureiro', 1.6, (-4.1, 0.8, 1.65), 60, 'andando', False),
] + [('moeda-de-ouro', 0.68, (x, Y_MOEDA, z), 0, None, False) for x, z in MOEDAS[1:]]

CAMERA = tuple(float(v) for v in os.environ.get('MOEDAS_CAMERA', '0.1,12.5,16.0').split(','))
ALVO = tuple(float(v) for v in os.environ.get('MOEDAS_ALVO', '0.1,0.2,1.2').split(','))
LENTE = float(os.environ.get('MOEDAS_LENTE', '40'))


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def extrair_da_biblioteca(pasta):
    """Grava em `pasta` os GLB da ilha, tirados do base64 da biblioteca de modelos dos cursos."""
    for peca in ILHA:
        sha = MODELOS[peca]['sha']
        with open(os.path.join(BIBLIOTECA, f'm-{sha}.generated.ts'), encoding='utf-8') as f:
            dados = base64.b64decode(re.search(r"base64,([A-Za-z0-9+/=]+)'", f.read()).group(1))
        if len(dados) != MODELOS[peca]['bytes']:
            raise SystemExit(f'{peca}: o arquivo da biblioteca não é o publicado')
        with open(os.path.join(pasta, f'{peca}.glb'), 'wb') as f:
            f.write(dados)


def importar(pasta, peca):
    antes = set(bpy.data.objects)
    origem = pasta if peca in ILHA else MOEDAS_GLB
    bpy.ops.import_scene.gltf(filepath=os.path.join(origem, f'{peca}.glb'))
    return [o for o in bpy.data.objects if o not in antes]


def so_o_clipe(objs, clipe, fim):
    """Deixa tocando só o clipe pedido; com `fim`, a faixa toca ao contrário e mostra o último quadro."""
    for o in objs:
        ad = o.animation_data
        if not ad:
            continue
        # Pelo nome: o Blender entrega um objeto Python novo a cada acesso, e `is` nunca bate.
        for t in ad.nla_tracks:
            t.mute = t.name != clipe
            if t.name == clipe:
                for faixa in t.strips:
                    faixa.use_reverse = fim
                    faixa.extrapolation = 'HOLD'
        ad.action = None


def colocar(pasta, peca, tamanho, centro, giro, clipe, fim):
    objs = importar(pasta, peca)
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
        so_o_clipe(objs, clipe, fim)
    return objs


def luz_e_camera():
    sc = bpy.context.scene
    mundo = bpy.data.worlds.new('ceu')
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes['Background']
    # Luz ambiente branca: azul, ela tinge a cena inteira (o céu do cenário já tem a cor dele).
    fundo.inputs['Color'].default_value = (1, 1, 1, 1)
    fundo.inputs['Strength'].default_value = 0.75
    sc.world = mundo
    sol = bpy.data.lights.new('sol', 'SUN')
    sol.energy = 3.6
    sol.angle = math.radians(8)
    lampada = bpy.data.objects.new('sol', sol)
    lampada.rotation_euler = (math.radians(48), math.radians(-12), math.radians(-35))
    sc.collection.objects.link(lampada)
    cam = bpy.data.cameras.new('camera')
    cam.lens = LENTE
    camera = bpy.data.objects.new('camera', cam)
    sc.collection.objects.link(camera)
    camera.location = jogo(*CAMERA)
    alvo = jogo(*ALVO)
    camera.rotation_euler = (alvo - camera.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = camera
    return camera


def conferir(pecas, camera):
    """A caixa de cada peça na imagem (px, y para baixo), para acertar o enquadre sem renderizar."""
    sc = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    for nome, objs in pecas:
        pontos = []
        for o in objs:
            if o.type != 'MESH':
                continue
            ev = o.evaluated_get(deps)
            pontos += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
        if not pontos:
            continue
        tela = [world_to_camera_view(sc, camera, p) for p in pontos]
        xs = [round(t.x * LARGURA) for t in tela]
        ys = [round((1 - t.y) * ALTURA) for t in tela]
        print(f'{nome:28s} x {min(xs):5d} a {max(xs):5d}   y {min(ys):5d} a {max(ys):5d}')
        if nome.startswith('cenario'):
            # Os obstáculos do cenário (troncos e rochas) são nós próprios: o que pode tapar a cena.
            for o in objs:
                if o.type != 'MESH':
                    continue
                ev = o.evaluated_get(deps)
                cantos = [world_to_camera_view(sc, camera, ev.matrix_world @ Vector(c)) for c in ev.bound_box]
                cx = [round(t.x * LARGURA) for t in cantos]
                cy = [round((1 - t.y) * ALTURA) for t in cantos]
                if max(cx) - min(cx) < 800:
                    print(f'    {o.name:24s} x {min(cx):5d} a {max(cx):5d}   y {min(cy):5d} a {max(cy):5d}')
        # As peças com clipe: a pose de cada parte (a tampa do baú, a luz do farol, os passos).
        for o in objs:
            if o.animation_data and any(not t.mute for t in o.animation_data.nla_tracks):
                ev = o.evaluated_get(deps)
                giro = [round(math.degrees(a)) for a in ev.matrix_local.to_euler()]
                tam = [round(v, 2) for v in ev.matrix_local.to_scale()]
                print(f'    {o.name:24s} giro {giro} tamanho {tam}')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    pasta = tempfile.mkdtemp(prefix='moedas-capa-')
    try:
        extrair_da_biblioteca(pasta)
        pecas = []
        for i, (peca, tamanho, centro, giro, clipe, fim) in enumerate(CENA):
            objs = colocar(pasta, peca, tamanho, centro, giro, clipe, fim)
            nome = f'{peca} {i - 3}' if peca == 'moeda-de-ouro' else peca
            pecas.append((nome, objs))
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
    camera = luz_e_camera()
    sc.frame_set(1)
    sc.render.resolution_x, sc.render.resolution_y = LARGURA, ALTURA
    sc.render.resolution_percentage = 100
    if os.environ.get('MOEDAS_CONFERIR'):
        conferir(pecas, camera)
        return
    sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 92
    sc.render.filepath = SAIDA
    bpy.ops.render.render(write_still=True)
    print('capa gerada em', SAIDA)


main()
