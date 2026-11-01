"""Os chãos dos desafios 3D das ilhas (lacunas, 01/11/2026): um disco baixo por ilha, na cor dela.

Cada desafio 3D usa o personagem do curso (a biblioteca de modelos), o morador da ilha e um item do
jogo; o chão é a única peça nova. Um disco de 1 de raio e 0,1 de altura, com a origem no centro do
topo (o chão fica em y 0), poucos polígonos. O bloco "criar modelo" escala pelo tamanho pedido
(o lado maior), então a caixa do disco não muda: a cena posiciona o chão por ela.

O topo tem a cor da ilha e uma borda fina de terra (ou rocha, ou nuvem escura); a lateral é toda de
terra. A luz do Estúdio é forte (ambiente 2,1 e sol 1,7): a cor na tela sai uns 8% mais clara que a
do material, e um tom claro vira branco. Por isso as cores são mais fundas que a vista desejada, e o
chão nunca é da cor do fundo da cena (`cor` do desafio em `projetos.ts`) nem do morador e do item.

Rodar com o Python que tem o bpy:
  C:/Users/tocha/blender-venv/Scripts/python.exe docs/desafios-do-jogo/tres-d/arte/chaos.py
"""
import os

import bpy  # noqa: I001  (o módulo bpy precisa vir antes do bmesh)
import bmesh

# (topo, terra) em cor linear do Blender. Na tela, com a luz do Estúdio, saem perto de:
# sua ilha areia #e8d29a, bosque grama #8fc274, vila caramelo #e8b98f, recife areia molhada
# #d9c08a, pico gelo #9fbad6, vale capim seco #a8b26a, nuvens lilás #b9a8e6.
CORES = {
    'sua-ilha': ((0.75, 0.59, 0.30), (0.40, 0.23, 0.09)),
    'bosque': ((0.25, 0.50, 0.16), (0.18, 0.08, 0.035)),
    'vila-doce': ((0.75, 0.45, 0.25), (0.36, 0.15, 0.065)),
    'recife': ((0.64, 0.49, 0.23), (0.36, 0.21, 0.09)),
    'pico': ((0.32, 0.45, 0.62), (0.12, 0.17, 0.23)),
    'vale-dos-dinos': ((0.36, 0.42, 0.14), (0.19, 0.12, 0.046)),
    'nuvens': ((0.45, 0.36, 0.73), (0.23, 0.18, 0.51)),
}
# A largura da borda de terra no topo, no raio 1 do disco (na cena, ~0,66 m).
BORDA = 0.07
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modelos')


def limpar():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)


def material(nome, cor):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    fundo = m.node_tree.nodes.get('Principled BSDF')
    fundo.inputs['Base Color'].default_value = (*cor, 1.0)
    fundo.inputs['Roughness'].default_value = 0.95
    return m


def chao(ilha, cores):
    topo, terra = cores
    limpar()
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.0, depth=0.1, location=(0, 0, -0.05))
    disco = bpy.context.active_object
    disco.name = f'chao-{ilha}'
    disco.data.materials.append(material(f'chao-{ilha}', topo))
    disco.data.materials.append(material(f'terra-{ilha}', terra))
    # Tudo de terra; o topo ganha um anel de terra por inset (a caixa não muda) e o miolo
    # fica com a cor da ilha.
    bm = bmesh.new()
    bm.from_mesh(disco.data)
    for f in bm.faces:
        f.material_index = 1
    cima = [f for f in bm.faces if f.normal.z > 0.9]
    resultado = bmesh.ops.inset_region(bm, faces=cima, thickness=BORDA, depth=0.0)
    for f in cima:
        f.material_index = 0
    for f in resultado['faces']:
        f.material_index = 1
    bm.to_mesh(disco.data)
    bm.free()
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
    for ilha, cores in CORES.items():
        caminho = chao(ilha, cores)
        print(ilha, os.path.getsize(caminho))
