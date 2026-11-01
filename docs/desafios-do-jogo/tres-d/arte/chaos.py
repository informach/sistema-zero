"""Os chãos dos desafios 3D das ilhas (lacunas, 01/11/2026): um disco baixo por ilha, na cor dela.

Cada desafio 3D usa o personagem do curso (a biblioteca de modelos), o morador da ilha e um item do
jogo; o chão é a única peça nova. Um disco de 1 de raio e 0,1 de altura, com a origem no centro do
topo (o chão fica em y 0), poucos polígonos. O bloco "criar modelo" escala pelo tamanho pedido.

Rodar com o Python que tem o bpy:
  C:/Users/tocha/blender-venv/Scripts/python.exe docs/desafios-do-jogo/tres-d/arte/chaos.py
"""
import os

import bpy

CORES = {
    'sua-ilha': (0.93, 0.85, 0.62),
    'bosque': (0.45, 0.68, 0.36),
    'vila-doce': (0.89, 0.78, 0.65),
    'recife': (0.92, 0.84, 0.66),
    'pico': (0.92, 0.95, 0.98),
    'vale-dos-dinos': (0.62, 0.66, 0.42),
    'nuvens': (0.95, 0.94, 1.0),
}
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modelos')


def limpar():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)


def chao(ilha, cor):
    limpar()
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.0, depth=0.1, location=(0, 0, -0.05))
    disco = bpy.context.active_object
    disco.name = f'chao-{ilha}'
    material = bpy.data.materials.new(f'chao-{ilha}')
    material.use_nodes = True
    fundo = material.node_tree.nodes.get('Principled BSDF')
    fundo.inputs['Base Color'].default_value = (*cor, 1.0)
    fundo.inputs['Roughness'].default_value = 0.95
    disco.data.materials.append(material)
    bpy.ops.object.shade_flat()
    os.makedirs(SAIDA, exist_ok=True)
    destino = os.path.join(SAIDA, f'chao-{ilha}.glb')
    bpy.ops.export_scene.gltf(
        filepath=destino,
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_apply=True,
    )
    return destino


if __name__ == '__main__':
    for ilha, cor in CORES.items():
        caminho = chao(ilha, cor)
        print(ilha, os.path.getsize(caminho))
