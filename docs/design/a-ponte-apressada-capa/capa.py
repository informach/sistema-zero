"""A arte da capa do Passo a passo do projeto de A ponte apressada (23/11/2026).

    PYTHONPATH=<bpy 5.2.3> python capa.py                 # renderiza (Eevee, 1600 x 1390)
    PONTE_MEDIR=1 PYTHONPATH=<bpy 5.2.3> python capa.py   # só mede o enquadre, sem renderizar

Com `PONTE_MEDIR`, o script mostra onde cada peça cai na imagem (de 0 a 1), e com `PONTE_DETALHE`
também a altura do topo da pedra do sino, que decidiu o lugar do aventureiro. Os GLB da Ilha são
extraídos da biblioteca para a pasta temporária do sistema (`ponte-capa-<peça>.glb`).

No molde de `../ilha-do-farol-blender/capa.py`: a cena do jogo 3D do Poder com as peças
publicadas. A Ilha do Farol vem da biblioteca de modelos dos cursos (cada
`packages/studio/src/core/course-models/m-<sha>.generated.ts` tem o GLB em base64; o sha está em
`../ilha-do-farol-blender/modelos.json`), e o laguinho, a pedra do sino, a ponte e a alavanca vêm
de `../a-ponte-apressada/assets/` (os mesmos GLB publicados, com `../a-ponte-apressada/modelos.json`).

Cada peça entra como o jogo a põe (`qa/ponte-projeto.ts` e `qa/ilha-do-farol-projeto.ts`): o lado
maior vira o tamanho do bloco "Criar o objeto" e o centro da caixa vai para o lugar do bloco
"Colocar o objeto". A cena é o fim da travessia: a alavanca puxada, a ponte baixada, o aventureiro
em cima da pedra, ao lado do sino, e o sino tocando. A câmera olha o laguinho de frente, do alto e
um pouco da direita (o farol fica fora do quadro); a capa usa a metade de cima da imagem
(receita do caderno visual), por isso a ponte, a alavanca, a pedra e o aventureiro ficam em cima,
e a água e a areia da frente ocupam a parte de baixo, que a faixa e o painel cobrem.
"""
import base64, json, math, os, re, tempfile
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '../../..'))
SAIDA = os.environ.get(
    'PONTE_CAPA',
    os.path.join(
        RAIZ,
        'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-a-ponte-apressada.jpg',
    ),
)
LARGURA, ALTURA = 1600, 1390
ILHA = json.load(open(os.path.join(AQUI, '../ilha-do-farol-blender/modelos.json'), encoding='utf-8'))
PONTE = json.load(open(os.path.join(AQUI, '../a-ponte-apressada/modelos.json'), encoding='utf-8'))
BIBLIOTECA = os.path.join(RAIZ, 'packages/studio/src/core/course-models')
CHAO = 0.05  # o chão da Ilha no gramado da frente (ponte-projeto.ts)
# O quadro da cena: os clipes "uma vez" já acabaram (o jogo segura o último quadro), e o sino e o
# aventureiro ficam no meio do clipe deles.
QUADRO = 200

def em(peca, x, z):
    """O lugar do bloco de uma peça da Ponte, como `em()`: o chão do gramado mais o centro dela."""
    c = PONTE[peca]['center']
    return (x + c[0], CHAO + c[1], z + c[2])


# (peça, tamanho do bloco, centro no jogo (x, y, z com y para cima), giro em graus, clipe, momento
# do clipe). O centro é o do bloco "Colocar o objeto": na Ilha, `ILHA_PREPARO` (a chave onde o
# jogo da Ponte a põe); nas peças da Ponte, `em()` de `ponte-projeto.ts`.
CENA = [
    ('cenario-praia-tropical', 140, (0, 33.6, 0), 0, None, None),
    ('farol-listrado', 5.3, (5.2, 2.7, 0.1), 0, None, None),
    ('pedras', 4.5, (-2, 1.2, -0.5), 0, None, None),
    ('chave-dourada', 1.2, (-3, 1, -2), 0, None, None),
    ('veleiro', 3.1, (13, 1.1, 4.5), 0, None, None),
    ('laguinho', PONTE['laguinho']['size'], em('laguinho', -3.1, 3.5), 0, None, None),
    ('pedra-do-sino', PONTE['pedra-do-sino']['size'], em('pedra-do-sino', -3.9, 3.5), 0, 'tocar', 'meio'),
    ('ponte-levadica', PONTE['ponte-levadica']['size'], em('ponte-levadica', -1.3, 3.5), 0, 'baixar', 'fim'),
    ('alavanca', PONTE['alavanca']['size'], em('alavanca', 0.9, 3), 0, 'puxar', 'fim'),
    # O aventureiro em cima da pedra, na altura do bloco Colocar o objeto da aula (y 1,4: os pés no
    # topo de areia, a 0,61), um passo à esquerda do lugar da aula (x −3,9) para não tapar o sino.
    ('aventureiro', 1.6, (-4.15, 1.4, 3.8), 20, 'andando', 'meio'),
]


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def arquivo(peca):
    """O GLB publicado da peça: o da Ponte na pasta de assets, o da Ilha na biblioteca."""
    if peca in PONTE:
        return os.path.join(AQUI, '../a-ponte-apressada/assets', f'{peca}.glb')
    sha = ILHA[peca]['sha']
    fonte = open(os.path.join(BIBLIOTECA, f'm-{sha}.generated.ts'), encoding='utf-8').read()
    dados = re.search(r"base64,([A-Za-z0-9+/=]+)'", fonte)
    if not dados:
        raise SystemExit(f'GLB de {peca} não encontrado na biblioteca')
    destino = os.path.join(tempfile.gettempdir(), f'ponte-capa-{peca}.glb')
    with open(destino, 'wb') as f:
        f.write(base64.b64decode(dados.group(1)))
    return destino


def importar(peca):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=arquivo(peca))
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


def colocar(peca, tamanho, centro, giro, clipe, momento):
    objs = importar(peca)
    raizes = [o for o in objs if o.parent is None]
    m = PONTE.get(peca) or ILHA[peca]
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
    mundo = bpy.data.worlds.new('ceu')
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes['Background']
    fundo.inputs['Color'].default_value = (1, 1, 1, 1)
    fundo.inputs['Strength'].default_value = float(os.environ.get('PONTE_AMBIENTE', '0.75'))
    sc.world = mundo
    sol = bpy.data.lights.new('sol', 'SUN')
    sol.energy = float(os.environ.get('PONTE_SOL', '3.6'))
    sol.angle = math.radians(8)
    lampada = bpy.data.objects.new('sol', sol)
    lampada.rotation_euler = (math.radians(48), math.radians(-12), math.radians(-35))
    sc.collection.objects.link(lampada)
    cam = bpy.data.cameras.new('camera')
    cam.lens = float(os.environ.get('PONTE_LENTE', '38'))
    camera = bpy.data.objects.new('camera', cam)
    sc.collection.objects.link(camera)
    camera.location = jogo(*json.loads(os.environ.get('PONTE_CAMERA', '[0.2, 6.6, 11.0]')))
    alvo = jogo(*json.loads(os.environ.get('PONTE_ALVO', '[-2.0, 0, 3.6]')))
    camera.rotation_euler = (alvo - camera.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = camera
    return camera


def medir(camera):
    """Onde cada peça cai na imagem (0 a 1, de cima para baixo), sem renderizar."""
    sc = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    for base in [o for o in sc.objects if o.name.endswith('-lugar')]:
        pontos = []
        for o in base.children_recursive:
            if o.type != 'MESH':
                continue
            ev = o.evaluated_get(deps)
            pontos += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
        if not pontos:
            continue
        tela = [world_to_camera_view(sc, camera, p) for p in pontos]
        xs = [t.x for t in tela]
        ys = [1 - t.y for t in tela]
        zs = [p.z for p in pontos]
        print(
            f'{base.name:28s} x {min(xs):.2f}..{max(xs):.2f}  y {min(ys):.2f}..{max(ys):.2f}'
            f'  altura {min(zs):.2f}..{max(zs):.2f}'
        )
        if os.environ.get('PONTE_DETALHE') and base.name.startswith('pedra-do'):
            # A altura do topo da pedra em alguns pontos (x, z do jogo), para pôr o aventureiro.
            for o in base.children_recursive:
                if o.type != 'MESH' or o.name != 'pedra':
                    continue
                ev = o.evaluated_get(deps)
                inv = ev.matrix_world.inverted()
                for x in (-4.4, -4.2, -4.0, -3.8, -3.6, -3.4, -3.25):
                    linha = []
                    for z in (3.0, 3.3, 3.6, 3.8, 4.0):
                        ok, loc, _n, _i = ev.ray_cast(inv @ jogo(x, 5, z), inv.to_3x3() @ Vector((0, 0, -1)))
                        linha.append(f'{(ev.matrix_world @ loc).z:.2f}' if ok else ' -- ')
                    print(f'    x {x:5.2f}:', ' '.join(linha))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    for peca in CENA:
        colocar(*peca)
    camera = luz_e_camera()
    sc.frame_set(QUADRO)
    sc.render.resolution_x, sc.render.resolution_y = LARGURA, ALTURA
    sc.render.resolution_percentage = 100
    if os.environ.get('PONTE_MEDIR'):
        medir(camera)
        return
    sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 92
    sc.render.filepath = SAIDA
    bpy.ops.render.render(write_still=True)
    print('capa gerada em', SAIDA)


main()
