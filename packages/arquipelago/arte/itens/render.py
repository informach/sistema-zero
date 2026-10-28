"""Ícones e prévias dos itens (Cycles na CPU, sem tela).

  # ícones de 256 px, fundo transparente, em src/assets/icones/<id>.png (todos ou ITEM=a,b)
  python render.py icones

  # prévia de um GLB (fundo claro), para conferir de perto
  python render.py previa saida.png src/assets/itens/bau.glb

Variáveis: RES (lado em px, padrão 256 nos ícones e 640 na prévia), AMOSTRAS (padrão 48), DIR
("dx,dy,dz" no Blender, de onde a câmera olha). Os ícones saem em RGBA de 8 bits; o
`icones_paleta.py` (Python do sistema, com Pillow) reduz a paleta depois.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
ITENS = os.path.join(AQUI, '..', '..', 'src', 'assets', 'itens')
ICONES = os.path.join(AQUI, '..', '..', 'src', 'assets', 'icones')
env = os.environ.get


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def cena(glb, fundo, preparar=None, direcao=None):
    """Monta a cena de um GLB com a câmera enquadrando tudo. `preparar()` roda depois de importar
    (arruma, esconde ou copia peças) e pode devolver os pontos a enquadrar no lugar da caixa toda;
    `direcao` (no Blender) é de onde a câmera olha, no lugar de DIR."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    sc = bpy.context.scene
    caixa = preparar() if preparar else None
    malhas = [o for o in bpy.data.objects if o.type == 'MESH' and not o.hide_render]
    bpy.context.view_layer.update()
    pts = caixa or [o.matrix_world @ Vector(c) for o in malhas for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centro = (mn + mx) / 2
    d = Vector(direcao or tuple(float(t) for t in (env('DIR') or '0.75,-1.25,0.85').split(','))).normalized()
    # Escala ortográfica: o maior lado da caixa projetada no plano da câmera, com folga.
    cam_d = bpy.data.cameras.new('cam')
    cam_d.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_d)
    sc.collection.objects.link(cam)
    cam.location = centro + d * 10
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in pts]
    larg = max(p.x for p in loc) - min(p.x for p in loc)
    alt = max(p.y for p in loc) - min(p.y for p in loc)
    cx = (max(p.x for p in loc) + min(p.x for p in loc)) / 2
    cy = (max(p.y for p in loc) + min(p.y for p in loc)) / 2
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    cam_d.ortho_scale = max(larg, alt) * 1.12
    cam_d.clip_end = 100
    sc.camera = cam
    # Luz: sol de cima à esquerda, um contraluz fraco e o céu claro.
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
    sol.data.energy = 3.6
    sol.data.angle = math.radians(12)
    sol.rotation_euler = (math.radians(40), math.radians(-25), math.radians(-30))
    sc.collection.objects.link(sol)
    contra = bpy.data.objects.new('contra', bpy.data.lights.new('contra', 'SUN'))
    contra.data.energy = 1.0
    contra.rotation_euler = (math.radians(-60), math.radians(10), math.radians(160))
    sc.collection.objects.link(contra)
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb('#eef4ff'), 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.65
    sc.world = w
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(env('AMOSTRAS') or 48)
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = fundo is None
    if fundo is not None:
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb(fundo), 1)
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA' if fundo is None else 'RGB'
    sc.render.image_settings.color_depth = '8'
    sc.render.image_settings.compression = 100
    return sc


def gravar(sc, saida, res):
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.filepath = saida
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    modo = args[0] if args else 'icones'
    if modo == 'icones':
        os.makedirs(ICONES, exist_ok=True)
        so = set((env('ITEM') or '').split(',')) - {''}
        for nome in sorted(os.listdir(ITENS)):
            if not nome.endswith('.glb') or (so and nome[:-4] not in so):
                continue
            sc = cena(os.path.join(ITENS, nome), None)
            gravar(sc, os.path.join(ICONES, nome[:-4] + '.png'), int(env('RES') or 256))
            print('ICONE', nome[:-4])
    else:
        saida, glb = args[1], args[2]
        sc = cena(glb, env('FUNDO') or '#eef4ff')
        gravar(sc, saida, int(env('RES') or 640))
