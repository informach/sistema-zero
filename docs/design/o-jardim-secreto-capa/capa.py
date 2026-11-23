"""A arte da capa do Passo a passo do projeto de O Jardim Secreto (23/11/2026).

    PYTHONPATH=C:/Users/tocha/.cache/bpy-5.2.3 python docs/design/o-jardim-secreto-capa/capa.py
    JARDIM_MEDIR=1 PYTHONPATH=... python .../capa.py   # só mede o enquadre, sem renderizar

No molde de `../ilha-do-farol-blender/capa.py` e das capas dos Poderes (`../moedas-no-caminho-capa`,
`../a-ponte-apressada-capa`): a cena do jogo 3D da Aula 2 montada com as peças publicadas. As
quatro saem da biblioteca de modelos dos cursos (cada
`packages/studio/src/core/course-models/m-<sha>.generated.ts` tem o GLB em base64): o jardim, o
regador e a flor com o sha de `../jardim-secreto/modelos.json`, e o aventureiro com o de
`../ilha-do-farol-blender/modelos.json`. O script confere o tamanho de cada arquivo com o publicado.

Cada peça entra como o jogo a põe (`qa/jardim-projeto.ts`): o lado maior vira o tamanho do bloco
"Criar o objeto" e o centro da caixa vai para o lugar do bloco "Colocar o objeto". O jardim e a
flor ficam no lugar do jogo, e o regador no lugar novo da Parte 5 (x −2). O aventureiro fica onde
a capa conta a história: na trilha, entre o regador e a flor, andando para a flor. A flor está no
fim do clipe `florescer` (aberta), como o jogo a deixa; o aventureiro, no meio do `andando`.

O jogo pinta o fundo de #c4e2df e ilumina com luz branca. Aqui a luz do mundo é branca e o filme é
transparente; depois do render, o script põe o céu atrás (um degradê suave do mesmo verde-água) e
grava o JPEG. A capa usa a metade de cima da imagem (receita do caderno visual): a faixa "Passo a
passo do projeto" cobre a altura de 590 a 660 px da folha, que aqui são as linhas 1189 a 1330. Por
isso a câmera olha o jardim de frente e do alto, como no jogo, e mira abaixo das peças, que sobem
na imagem. `JARDIM_MEDIR=1` imprime a caixa de cada peça na imagem, sem renderizar.
"""
import base64, json, math, os, re, shutil, tempfile
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '../../..'))
SAIDA = os.environ.get(
    'JARDIM_CAPA',
    os.path.join(
        RAIZ,
        'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-o-jardim-secreto.jpg',
    ),
)
LARGURA, ALTURA = 1600, 1390
BIBLIOTECA = os.path.join(RAIZ, 'packages/studio/src/core/course-models')
MODELOS = {
    **json.load(open(os.path.join(AQUI, '../ilha-do-farol-blender/modelos.json'), encoding='utf-8')),
    **json.load(open(os.path.join(AQUI, '../jardim-secreto/modelos.json'), encoding='utf-8')),
}
# O céu do jogo (`createFullscreenScene("#c4e2df")`), um pouco mais claro perto do jardim.
CEU_TOPO, CEU_BAIXO = (0xBB, 0xDE, 0xD9), (0xD4, 0xEC, 0xE8)
# O quadro da cena: o clipe "uma vez" da flor já acabou (o jogo segura o último quadro), e o
# aventureiro fica no meio do passo.
QUADRO = 200

# (peça, tamanho do bloco, centro no jogo (x, y, z com y para cima), giro em graus, clipe, momento
# do clipe). Os tamanhos e os centros são os de `jardim-projeto.ts` (`modelos.json` com duas casas).
CENA = [
    ('jardim-acolhedor', 25.18, (0, 2.35, 0), 0, None, None),
    ('regador-azul', 1.95, (-2, 0.53, -2), 0, None, None),
    ('flor-do-jardim', 1.76, (5, 0.83, 1), 0, 'florescer', 'fim'),
    ('aventureiro', 1.66, tuple(float(v) for v in os.environ.get('JARDIM_PERSONAGEM', '1.4,0.8,1.1').split(',')),
     float(os.environ.get('JARDIM_GIRO', '62')), 'andando', 'meio'),
]

CAMERA = tuple(float(v) for v in os.environ.get('JARDIM_CAMERA', '1.4,8.0,12.0').split(','))
ALVO = tuple(float(v) for v in os.environ.get('JARDIM_ALVO', '1.4,0.0,1.0').split(','))
LENTE = float(os.environ.get('JARDIM_LENTE', '46'))


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def arquivo(peca, pasta):
    """O GLB publicado da peça, tirado do base64 da biblioteca de modelos dos cursos."""
    m = MODELOS[peca]
    fonte = open(os.path.join(BIBLIOTECA, f"m-{m['sha']}.generated.ts"), encoding='utf-8').read()
    dados = re.search(r"base64,([A-Za-z0-9+/=]+)'", fonte)
    if not dados:
        raise SystemExit(f'GLB de {peca} não encontrado na biblioteca')
    glb = base64.b64decode(dados.group(1))
    if len(glb) != m['bytes']:
        raise SystemExit(f'{peca}: o arquivo da biblioteca não é o publicado')
    destino = os.path.join(pasta, f'{peca}.glb')
    with open(destino, 'wb') as f:
        f.write(glb)
    return destino


def importar(peca, pasta):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=arquivo(peca, pasta))
    return [o for o in bpy.data.objects if o not in antes]


def pose(objs, clipe, momento):
    """Deixa só o clipe pedido e põe, no QUADRO da cena, o fim ou o meio dele."""
    for o in objs:
        ad = o.animation_data
        if not ad:
            continue
        ad.action = None
        # Pelo nome: o Blender entrega um objeto Python novo a cada acesso, e `is` nunca bate.
        for t in ad.nla_tracks:
            t.mute = t.name != clipe
            if t.name != clipe:
                continue
            for s in t.strips:
                dur = s.frame_end - s.frame_start
                alvo = dur if momento == 'fim' else dur / 2
                s.extrapolation = 'HOLD'
                s.frame_start_ui = QUADRO - alvo


def colocar(pasta, peca, tamanho, centro, giro, clipe, momento):
    objs = importar(peca, pasta)
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
        pose(objs, clipe, momento)
    return objs


def luz_e_camera():
    sc = bpy.context.scene
    mundo = bpy.data.worlds.new('luz')
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes['Background']
    # Luz ambiente branca, como a do Jogo 3D; o céu entra depois, atrás do filme transparente.
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


def na_imagem(camera, p):
    t = world_to_camera_view(bpy.context.scene, camera, p)
    return round(t.x * LARGURA), round((1 - t.y) * ALTURA)


def medir(pecas, camera):
    """A caixa de cada peça na imagem (px, y para baixo), para acertar o enquadre sem renderizar."""
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
        tela = [na_imagem(camera, p) for p in pontos]
        xs, ys = [t[0] for t in tela], [t[1] for t in tela]
        print(f'{nome:20s} x {min(xs):5d} a {max(xs):5d}   y {min(ys):5d} a {max(ys):5d}')
        if nome == 'jardim-acolhedor':
            # As partes do jardim (o arco, as árvores, a cerca): o que fica no alto da imagem.
            for o in objs:
                if o.type != 'MESH':
                    continue
                ev = o.evaluated_get(deps)
                cantos = [na_imagem(camera, ev.matrix_world @ Vector(c)) for c in ev.bound_box]
                cx, cy = [t[0] for t in cantos], [t[1] for t in cantos]
                print(f'    {o.name:24s} x {min(cx):5d} a {max(cx):5d}   y {min(cy):5d} a {max(cy):5d}')
    # Os cantos do canteiro (o jardim mede ~25,2 x 16,4): a borda de terra não pode aparecer.
    for x, z in [(-12.6, -8.2), (12.6, -8.2), (-12.6, 8.2), (12.6, 8.2), (-9, -4), (9, -4), (-9, 4), (9, 4)]:
        print(f'chão ({x:5.1f}, {z:4.1f})   ->', na_imagem(camera, jogo(x, 0, z)))


def ceu_atras(png, jpg):
    """Põe o céu atrás do render transparente e grava o JPEG da capa."""
    from PIL import Image

    frente = Image.open(png).convert('RGBA')
    ceu = Image.new('RGBA', frente.size)
    px = ceu.load()
    for y in range(frente.size[1]):
        k = y / (frente.size[1] - 1)
        cor = tuple(round(a + (b - a) * k) for a, b in zip(CEU_TOPO, CEU_BAIXO)) + (255,)
        for x in range(frente.size[0]):
            px[x, y] = cor
    Image.alpha_composite(ceu, frente).convert('RGB').save(jpg, quality=92)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    pasta = tempfile.mkdtemp(prefix='jardim-capa-')
    try:
        pecas = [(c[0], colocar(pasta, *c)) for c in CENA]
        camera = luz_e_camera()
        sc.frame_set(QUADRO)
        sc.render.resolution_x, sc.render.resolution_y = LARGURA, ALTURA
        sc.render.resolution_percentage = 100
        if os.environ.get('JARDIM_MEDIR'):
            medir(pecas, camera)
            return
        sc.render.engine = 'BLENDER_EEVEE'
        sc.view_settings.view_transform = 'Standard'
        sc.render.film_transparent = True
        sc.render.image_settings.file_format = 'PNG'
        sc.render.image_settings.color_mode = 'RGBA'
        png = os.path.join(pasta, 'capa.png')
        sc.render.filepath = png
        bpy.ops.render.render(write_still=True)
        ceu_atras(png, SAIDA)
        print('capa gerada em', SAIDA)
    finally:
        shutil.rmtree(pasta, ignore_errors=True)


main()
