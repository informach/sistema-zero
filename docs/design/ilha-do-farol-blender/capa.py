"""A arte da capa do Passo a passo do projeto de A Ilha do Farol (20/11/2026).

    ILHA_GLB=./out ILHA_CAPA=capa.jpg python capa.py

Monta a cena do jogo com as peças publicadas (os mesmos GLB da biblioteca de modelos dos cursos,
pelos nomes de `modelos.json`): a ilha da praia tropical, o farol listrado ACESO, as pedras, a
chave na areia, o aventureiro andando para o farol e o veleiro chegando. Cada peça entra como o
jogo a põe: o lado maior vira o tamanho do bloco "Criar o objeto" e o centro da caixa vai para o
lugar do bloco "Colocar o objeto". O cenário, o farol e as pedras ficam no lugar do jogo
(`ilha-do-farol-projeto.ts`, ILHA_PREPARO); a chave, o aventureiro e o barco ficam onde a cena
conta a história. A câmera olha de frente e do alto, como no jogo, um pouco mais alta. A capa usa
a metade de cima da imagem (receita do caderno visual): a ilha fica em cima, e o mar ocupa a
parte de baixo, que a faixa e o painel cobrem. O giro do aventureiro (40°) o deixa de frente,
olhando para o farol: os modelos do curso olham para quem está na frente da câmera.

Para extrair os GLB da biblioteca sem gerar tudo de novo, cada `m-<sha>.generated.ts` de
`packages/studio/src/core/course-models/` tem o arquivo em base64 (o sha está em `modelos.json`).
"""
import json, math, os
import bpy
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
GLB = os.environ.get('ILHA_GLB', os.path.join(AQUI, 'out'))
SAIDA = os.environ.get('ILHA_CAPA', os.path.join(AQUI, 'capa.jpg'))
LARGURA, ALTURA = 1600, 1390
MODELOS = json.load(open(os.path.join(AQUI, 'modelos.json'), encoding='utf-8'))

# (peça, tamanho do bloco, centro no jogo (x, y, z com y para cima), giro em graus, clipe)
CENA = [
    ('cenario-praia-tropical', 140, (0, 33.6, 0), 0, None),
    ('farol-listrado', 5.3, (5.2, 2.7, 0.1), 0, 'aceso'),
    ('pedras', 4.5, (-2, 1.2, -0.5), 0, None),
    ('chave-dourada', 1.2, (-4.4, 1.0, 2.4), 25, None),
    ('aventureiro', 1.6, (-1.2, 0.8, 1.9), 40, 'andando'),
    ('veleiro', 3.1, (8.4, 1.1, 3.2), -18, None),
]


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def importar(peca):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(GLB, f'{peca}.glb'))
    return [o for o in bpy.data.objects if o not in antes]


def so_o_clipe(objs, clipe):
    """Deixa tocando só o clipe pedido (o importador traz todos como faixas do NLA)."""
    for o in objs:
        ad = o.animation_data
        if not ad:
            continue
        # Pelo nome: o Blender entrega um objeto Python novo a cada acesso, e `is` nunca bate.
        for t in ad.nla_tracks:
            t.mute = t.name != clipe
        ad.action = None


def colocar(peca, tamanho, centro, giro, clipe):
    objs = importar(peca)
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
    # Luz ambiente branca: azul, ela tinge a cena inteira (o céu do cenário já tem a cor dele).
    fundo.inputs['Color'].default_value = (1, 1, 1, 1)
    fundo.inputs['Strength'].default_value = float(os.environ.get('ILHA_AMBIENTE', '0.75'))
    sc.world = mundo
    sol = bpy.data.lights.new('sol', 'SUN')
    sol.energy = float(os.environ.get('ILHA_SOL', '3.6'))
    sol.angle = math.radians(8)
    lampada = bpy.data.objects.new('sol', sol)
    lampada.rotation_euler = (math.radians(48), math.radians(-12), math.radians(-35))
    sc.collection.objects.link(lampada)
    cam = bpy.data.cameras.new('camera')
    cam.lens = 40
    camera = bpy.data.objects.new('camera', cam)
    sc.collection.objects.link(camera)
    camera.location = jogo(0.4, 19.0, 23.5)
    alvo = jogo(0.4, -1.2, 1.7)
    camera.rotation_euler = (alvo - camera.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = camera


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    for peca, tamanho, centro, giro, clipe in CENA:
        colocar(peca, tamanho, centro, giro, clipe)
    luz_e_camera()
    # O meio do clipe: a luz do farol no alto do giro e o passo do aventureiro aberto.
    sc.frame_set(int(os.environ.get('ILHA_QUADRO', '1')))
    sc.render.resolution_x, sc.render.resolution_y = LARGURA, ALTURA
    sc.render.resolution_percentage = 100
    motor = os.environ.get('ILHA_MOTOR', 'BLENDER_EEVEE')
    sc.render.engine = motor
    if motor == 'CYCLES':
        sc.cycles.samples = int(os.environ.get('ILHA_AMOSTRAS', '96'))
        sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 92
    sc.render.filepath = SAIDA
    bpy.ops.render.render(write_still=True)
    print('capa gerada em', SAIDA)


main()
