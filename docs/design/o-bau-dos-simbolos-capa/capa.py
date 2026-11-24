"""A arte da capa do Passo a passo do projeto de O baú dos símbolos (23/11/2026).

    PYTHONPATH=C:/Users/tocha/.cache/bpy-5.2.3 python docs/design/o-bau-dos-simbolos-capa/capa.py
    SIMBOLOS_CONFERIR=1 PYTHONPATH=... python .../capa.py   # só confere o enquadre, sem render

No molde de `../moedas-no-caminho-capa/capa.py` e de `../ilha-do-farol-blender/capa.py`: a cena da
Aula 2 (os símbolos na ilha em 3D) montada com as peças publicadas, os mesmos GLB da biblioteca de
modelos dos cursos. Todas saem dos `m-<sha>.generated.ts` de `packages/studio/src/core/course-models/`
(o sha está em `../ilha-do-farol-blender/modelos.json`, `../o-bau-dos-simbolos/modelos.json` e
`../moedas-no-caminho/modelos.json`), e o tamanho de cada arquivo é conferido com o publicado.

Cada peça entra como o jogo a põe: o lado maior vira o tamanho do bloco "Criar o objeto" e o centro
da caixa vai para o lugar do bloco "Colocar o objeto". O cenário, o farol, as pedras, a placa da
ordem, as três pedras dos símbolos e o baú ficam no lugar do jogo (`qa/ilha-do-farol-projeto.ts` e
`qa/simbolos-projeto.ts`: a fileira do sol, da lua e da estrela no gramado da frente, com a placa à
esquerda e o baú à direita). A capa conta o fim da senha: o sol, a lua e a estrela acesos, na
ordem da placa, e o baú aberto, com o tesouro à vista; o aventureiro chegou ao baú e olha para ele.
O farol fica apagado, como no começo da partida: o brilho da capa é o dos símbolos.

O coqueiro da frente do cenário fica logo na frente da placa e do sol. Vista do alto, como no jogo,
a copa dele cobre o sol; por isso a câmera fica mais baixa que a das outras capas (mira a fileira
num ângulo de uns 30 graus) e um pouco à esquerda: o sol, a lua e a estrela ficam inteiros, e a
placa fica atrás do coqueiro, na borda da imagem. `SIMBOLOS_CONFERIR=1` lança um raio da câmera
até os vértices de cada peça e diz quanto dela fica à vista e quem tapa o resto.

Cada pedra acesa é o último quadro do clipe `acender`, e o baú aberto é o último quadro do clipe
`abrir` (a faixa do NLA tocada de trás para a frente, parada no começo). A capa usa a metade de
cima da imagem (receita do caderno visual): a faixa "Passo a passo do projeto" cobre a altura de
590 a 660 px da folha, que aqui são as linhas 1189 a 1330. As peças ficam entre as linhas 550 e
900, e o farol à direita, inteiro.
`SIMBOLOS_CONFERIR=1` imprime a caixa de cada peça na imagem e o quanto dela fica à vista, sem
renderizar.
"""
import base64, json, math, os, re, shutil, tempfile
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..', '..'))
BIBLIOTECA = os.path.join(RAIZ, 'packages', 'studio', 'src', 'core', 'course-models')
SAIDA = os.environ.get(
    'SIMBOLOS_CAPA',
    os.path.join(RAIZ, 'docs', 'aulas-interativas-tecnico', 'recursos', 'caderno-visual', 'arte',
                 'capa-o-bau-dos-simbolos.jpg'),
)
LARGURA, ALTURA = 1600, 1390


def carregar(*caminho):
    with open(os.path.join(RAIZ, 'docs', 'design', *caminho), encoding='utf-8') as f:
        return json.load(f)


MODELOS = {
    **carregar('ilha-do-farol-blender', 'modelos.json'),
    **carregar('moedas-no-caminho', 'modelos.json'),
    **carregar('o-bau-dos-simbolos', 'modelos.json'),
}

# O chão do gramado da frente e os lugares do jogo (x, z), de `simbolos-projeto.ts`.
CHAO = 0.05
PEDRAS = {'pedra-sol': (-6.4, 2.5), 'pedra-lua': (-4.2, 3.6), 'pedra-estrela': (-2.0, 2.5)}
PLACA = (-7.9, 2.6)
BAU = (-0.6, 2.5)


def no_chao(peca, x, z):
    """O centro no jogo de uma peça posta no chão, como `em()` em simbolos-projeto.ts."""
    c = MODELOS[peca]['center']
    return (x + c[0], CHAO + c[1], z + c[2])


# (peça, tamanho do bloco, centro no jogo (x, y, z com y para cima), giro em graus, clipe, fim do
# clipe). O farol toca o começo de `acender` (apagado); as pedras, o fim de `acender` (acesas); o
# baú, o fim de `abrir` (aberto).
CENA = [
    ('cenario-praia-tropical', 140, (0, 33.6, 0), 0, None, False),
    ('farol-listrado', 5.3, (5.2, 2.7, 0.1), 0, 'acender', False),
    ('pedras', 4.5, (-2, 1.2, -0.5), 0, None, False),
    ('placa-da-ordem', MODELOS['placa-da-ordem']['size'], no_chao('placa-da-ordem', *PLACA), 0, None, False),
] + [
    (peca, MODELOS[peca]['size'], no_chao(peca, x, z), 0, 'acender', True)
    for peca, (x, z) in PEDRAS.items()
] + [
    ('bau-do-tesouro', 1.12, (BAU[0], CHAO + MODELOS['bau-do-tesouro']['center'][1], BAU[1]), 0, 'abrir', True),
    ('aventureiro', 1.6, tuple(float(v) for v in os.environ.get('SIMBOLOS_HEROI', '0.7,0.8,2.0').split(',')),
     float(os.environ.get('SIMBOLOS_GIRO', '-35')), 'andando', False),
]

CAMERA = tuple(float(v) for v in os.environ.get('SIMBOLOS_CAMERA', '-2.5,6.5,12.5').split(','))
ALVO = tuple(float(v) for v in os.environ.get('SIMBOLOS_ALVO', '-0.95,-0.45,0.5').split(','))
LENTE = float(os.environ.get('SIMBOLOS_LENTE', '32'))


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def extrair_da_biblioteca(pasta):
    """Grava em `pasta` os GLB das peças, tirados do base64 da biblioteca de modelos dos cursos."""
    for peca in {p for p, *_ in CENA}:
        m = MODELOS[peca]
        with open(os.path.join(BIBLIOTECA, f'm-{m["sha"]}.generated.ts'), encoding='utf-8') as f:
            dados = base64.b64decode(re.search(r"base64,([A-Za-z0-9+/=]+)'", f.read()).group(1))
        if len(dados) != m['bytes']:
            raise SystemExit(f'{peca}: o arquivo da biblioteca não é o publicado')
        with open(os.path.join(pasta, f'{peca}.glb'), 'wb') as f:
            f.write(dados)


def importar(pasta, peca):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(pasta, f'{peca}.glb'))
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
                if max(cx) - min(cx) < 800 and max(cx) > 0 and min(cx) < LARGURA:
                    print(f'    {o.name:24s} x {min(cx):5d} a {max(cx):5d}   y {min(cy):5d} a {max(cy):5d}')
        # As peças com clipe: a pose de cada parte (o aceso das pedras, a tampa do baú, os passos).
        for o in objs:
            if o.animation_data and any(not t.mute for t in o.animation_data.nla_tracks):
                ev = o.evaluated_get(deps)
                giro = [round(math.degrees(a)) for a in ev.matrix_local.to_euler()]
                tam = [round(v, 2) for v in ev.matrix_local.to_scale()]
                print(f'    {o.name:24s} giro {giro} tamanho {tam}')
    visibilidade(pecas, camera)


def visibilidade(pecas, camera):
    """Quanto de cada peça a câmera vê: um raio até cada vértice; vale se ele bate na própria peça.

    O coqueiro da frente do cenário fica na frente da placa e do sol em quase todo enquadre: é
    esta conta que mostra se ele (ou o aventureiro) tapa um símbolo.
    """
    sc = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    dono = {}
    for nome, objs in pecas:
        for o in objs:
            # Do cenário, o nó: a base (chão, grama, folhas) ou um obstáculo (tronco, rocha).
            dono[o.name] = o.name if nome.startswith('cenario') else nome
    origem = camera.matrix_world.translation
    for nome, objs in pecas:
        if nome.startswith('cenario'):
            continue
        vistos = total = 0
        tapou = {}
        for o in objs:
            if o.type != 'MESH':
                continue
            ev = o.evaluated_get(deps)
            malha = ev.to_mesh()
            passo = max(1, len(malha.vertices) // 400)
            for i in range(0, len(malha.vertices), passo):
                p = ev.matrix_world @ malha.vertices[i].co
                d = p - origem
                ok, _, _, _, achado, _ = sc.ray_cast(deps, origem, d.normalized(), distance=d.length + 0.01)
                total += 1
                quem = dono.get(achado.name, achado.name) if ok else nome
                if quem == nome:
                    vistos += 1
                else:
                    tapou[quem] = tapou.get(quem, 0) + 1
            ev.to_mesh_clear()
        if total:
            outros = ', '.join(f'{k} {round(100 * n / total)}%' for k, n in sorted(tapou.items(), key=lambda kv: -kv[1]))
            print(f'{nome:28s} visível {round(100 * vistos / total):3d}%   {outros}')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    pasta = tempfile.mkdtemp(prefix='simbolos-capa-')
    try:
        extrair_da_biblioteca(pasta)
        pecas = [(peca, colocar(pasta, peca, *resto)) for peca, *resto in CENA]
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
    camera = luz_e_camera()
    sc.frame_set(1)
    sc.render.resolution_x, sc.render.resolution_y = LARGURA, ALTURA
    sc.render.resolution_percentage = 100
    if os.environ.get('SIMBOLOS_CONFERIR'):
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
