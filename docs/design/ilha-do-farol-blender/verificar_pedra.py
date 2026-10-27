"""Confere que as pedras escondem a chave no esconderijo do curso, vista da câmera do jogo.

    ILHA_OUT=./out python verificar_pedra.py

Lê `pedras.glb` e `chave-dourada.glb` já gerados, põe as pedras em (-2, 0, -1) e a chave com o
CENTRO onde `ilha-do-farol-projeto.ts` a põe, e lança um raio da câmera (0, 12, 21) até cada
vértice da chave. Atrás das pedras, em (-2, 1, -3) (a aula 1: "a pedra pode esconder a chave
dependendo de onde a gente olha"), nenhum vértice pode aparecer. Em (-3, 1, -2), a posição das
partes seguintes, a chave fica em parte à vista também com as pedras do Molda: lá só se informa.
"""
import os, sys
import bpy
from mathutils import Vector

OUT = os.environ.get('ILHA_OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'))
CAMERA = (0, 12, 21)
PEDRAS = (-2, 0, -1)
ESCONDIDA = (-2, 1, -3)
CHAVES = [ESCONDIDA, (-3, 1, -2)]


def jogo(x, y, z):
    """Ponto do jogo (y para cima) no Blender (z para cima)."""
    return Vector((x, -z, y))


def importar(nome):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f'{nome}.glb'))
    return [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for o in importar('pedras'):
        o.location += jogo(*PEDRAS)
    chave = importar('chave-dourada')
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for o in chave for v in o.data.vertices]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    centro = (mn + mx) / 2
    for o in chave:
        bpy.data.objects.remove(o)
    bpy.context.view_layer.update()
    cam = jogo(*CAMERA)
    deps = bpy.context.evaluated_depsgraph_get()
    falhou = False
    for alvo in CHAVES:
        desloc = jogo(*alvo) - centro
        vistos = 0
        for p in pts:
            q = p + desloc
            d = q - cam
            hit, loc, *_ = bpy.context.scene.ray_cast(deps, cam, d.normalized(), distance=d.length - 1e-3)
            vistos += not hit
        print(f'chave em {alvo}: {vistos} de {len(pts)} vértices à vista')
        falhou |= alvo == ESCONDIDA and vistos > 0
    if falhou:
        sys.exit('As pedras não escondem a chave no esconderijo.')
    print('ok: as pedras escondem a chave no esconderijo')


main()
