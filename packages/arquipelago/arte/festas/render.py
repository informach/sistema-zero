"""Prévias do Lote 7 (Cycles na CPU, sem tela). Só para conferir: nada daqui vai para o jogo.

  # prévia de um GLB (fundo claro)
  python render.py previa saida.png src/assets/festas/junina.glb

  # todas as peças de uma pasta numa pasta de prévias (uma imagem por GLB)
  python render.py todas /tmp/previas [festas|movimento]

Variáveis: RES (lado em px, padrão 640), AMOSTRAS (padrão 48), DIR ("dx,dy,dz" no Blender, de
onde a câmera olha), NOITE=1 (fundo escuro e luz fraca, para ver o que brilha), FUNDO (cor),
QUADRO (quadro do clipe ativo a mostrar).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, '..', '..', 'src', 'assets')
env = os.environ.get


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def cena(glb, fundo):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    sc = bpy.context.scene
    if env('QUADRO'):
        # Mostra um quadro do clipe ativo (o estouro dos fogos aberto, por exemplo).
        sc.frame_set(int(env('QUADRO')))
    malhas = [o for o in bpy.data.objects if o.type == 'MESH']
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in malhas for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centro = (mn + mx) / 2
    d = Vector(tuple(float(t) for t in (env('DIR') or '0.75,-1.25,0.85').split(','))).normalized()
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
    sol.data.energy = 0.25 if env('NOITE') else 3.6
    sol.data.angle = math.radians(12)
    sol.rotation_euler = (math.radians(40), math.radians(-25), math.radians(-30))
    sc.collection.objects.link(sol)
    contra = bpy.data.objects.new('contra', bpy.data.lights.new('contra', 'SUN'))
    contra.data.energy = 0.15 if env('NOITE') else 1.0
    contra.rotation_euler = (math.radians(-60), math.radians(10), math.radians(160))
    sc.collection.objects.link(contra)
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb('#eef4ff'), 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.08 if env('NOITE') else 0.65
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


args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
modo = args[0] if args else 'previa'
fundo = env('FUNDO') or ('#1c2340' if env('NOITE') else '#eef4ff')
if modo == 'todas':
    saida = args[1]
    os.makedirs(saida, exist_ok=True)
    for pasta in (args[2:] or ['movimento', 'festas']):
        d = os.path.join(ASSETS, pasta)
        for nome in sorted(os.listdir(d)):
            if nome.endswith('.glb'):
                sc = cena(os.path.join(d, nome), fundo)
                gravar(sc, os.path.join(saida, nome[:-4] + '.png'), int(env('RES') or 640))
                print('PREVIA', nome[:-4])
else:
    saida, glb = args[1], args[2]
    sc = cena(glb, fundo)
    gravar(sc, saida, int(env('RES') or 640))
