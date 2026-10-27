"""Prévias dos Lumis (Cycles na CPU, sem tela). Não faz parte do jogo, só da conferência.

  python previa.py saida.png cena.json

`cena.json`:
  {"res": [1200, 600], "noite": false, "amostras": 32, "chao": "#9fdc8a",
   "camera": {"alvo": [0, 0, 0.5], "dir": [0.3, -1, 0.25], "dist": 6, "lente": 70},
   "itens": [{"glb": "pitanga.glb", "pos": [0, 0, 0], "giro": 0, "clipe": "parado", "quadro": 0,
              "escala": 1}]}

Coordenadas do Blender (z para cima, a frente dos modelos olha para -Y). `giro` em graus no z.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
saida, arq = args[0], args[1]
with open(arq) as f:
    cena = json.load(f)


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for item in cena['itens']:
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=item['glb'])
    novos = [o for o in bpy.data.objects if o not in antes]
    clipe, quadro = item.get('clipe', 'parado'), item.get('quadro', 0)
    for o in novos:
        ad = o.animation_data
        if not ad:
            continue
        ad.action = None
        for t in ad.nla_tracks:
            t.mute = t.name != clipe
            for s in t.strips:
                # Cada item mostra o próprio quadro: o clipe começa antes do quadro 0 da cena.
                s.frame_start_ui = -quadro
        if not any(t.name == clipe for t in ad.nla_tracks):
            print('SEM CLIPE', item['glb'], o.name, [t.name for t in ad.nla_tracks])
    # As raízes são animadas: o lugar e o giro de cada item ficam num vazio por cima delas.
    suporte = bpy.data.objects.new('suporte', None)
    sc.collection.objects.link(suporte)
    for o in novos:
        if o.parent is None:
            o.parent = suporte
    e = item.get('escala', 1)
    suporte.scale = (e, e, e)
    suporte.rotation_euler = (0, 0, math.radians(item.get('giro', 0)))
    suporte.location = Vector(item.get('pos', (0, 0, 0)))
sc.frame_set(0)

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = cena.get('amostras', 32)
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    sc.cycles.use_denoising = False
sc.render.resolution_x, sc.render.resolution_y = cena.get('res', [1200, 600])
sc.view_settings.view_transform = 'Standard'
sc.render.film_transparent = False
noite = cena.get('noite', False)
w = bpy.data.worlds.new('w')
sc.world = w
bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.012, 0.02, 0.06, 1) if noite else (*srgb(cena.get('ceu', '#cfe6f7')), 1)
bg.inputs[1].default_value = 0.8 if noite else 1.0
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sc.collection.objects.link(sol)
sol.rotation_euler = (math.radians(48), math.radians(12), math.radians(-30))
sol.data.energy = 0.12 if noite else 3.4
sol.data.angle = math.radians(10)
if cena.get('chao'):
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    p = bpy.context.active_object
    m = bpy.data.materials.new('chaoPrevia')
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(cena['chao']), 1)
    b.inputs['Roughness'].default_value = 0.9
    p.data.materials.append(m)

c = cena['camera']
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = c.get('lente', 70)
cam.data.clip_end = 500
alvo = Vector(c['alvo'])
cam.location = alvo + Vector(c['dir']).normalized() * c['dist']
cam.rotation_euler = (alvo - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = os.path.abspath(saida)
bpy.ops.render.render(write_still=True)
print('PREVIA', saida)
