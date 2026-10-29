"""Prévias das peças do mundo (Cycles na CPU, sem tela). Não faz parte do jogo, só da conferência.

  python render.py saida.png arquivo.glb [outro.glb …] [opções em variáveis de ambiente]

Variáveis: ALVO="x,y,z" (ponto do jogo, y para cima), DIR="dx,dy,dz" (de onde a câmera olha, no
jogo), DIST, LENTE, RES="larg,alt", NOITE=1, CHAO="#cor" (plano de chão em y = 0), AGUA=1 (mar em
y = 0), ESCONDER="no1,no2", ACENDER="material:força,…", POS="arquivo.glb=x,y,z;…" (move a
cena de um arquivo, no jogo), CINZA=1 (pinta tudo de cinza, como a ilha antes do posto).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
saida, glbs = args[0], args[1:]
env = os.environ.get


def jogo(v):
    x, y, z = v
    return Vector((x, -z, y))


def vec(s, padrao):
    return tuple(float(t) for t in (env(s) or padrao).split(','))


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


bpy.ops.wm.read_factory_settings(use_empty=True)
pos = {}
for item in (env('POS') or '').split(';'):
    if '=' in item:
        k, v = item.split('=')
        pos[k] = tuple(float(t) for t in v.split(','))
for glb in glbs:
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb)
    novos = [o for o in bpy.data.objects if o not in antes]
    desloc = pos.get(os.path.basename(glb))
    if desloc:
        for o in novos:
            if o.parent is None:
                o.location += jogo(desloc)
if env('MONTAGEM'):
    # Arquivo Python que arruma as peças importadas para a prévia (ex.: canteiros com plantas).
    exec(open(env('MONTAGEM')).read(), {'bpy': bpy, 'jogo': jogo, 'Vector': Vector, 'math': math})
if env('ESPALHAR'):
    # Prévia de um arquivo com várias peças na origem: lado a lado em x (no jogo).
    passo = float(env('ESPALHAR'))
    raizes = [o for o in bpy.data.objects if o.parent is None]
    for i, o in enumerate(raizes):
        o.location.x += (i - (len(raizes) - 1) / 2) * passo
# Os nós de colisão (`col-*`) nunca se desenham no jogo: sem material, a prévia os pintaria de branco.
for o in bpy.data.objects:
    if o.name.startswith('col-'):
        o.hide_render = True
for nome in (env('ESCONDER') or '').split(','):
    o = bpy.data.objects.get(nome)
    if o:
        o.hide_render = True
for item in (env('ACENDER') or '').split(','):
    if ':' in item:
        nome, forca = item.split(':')
        m = bpy.data.materials.get(nome)
        if m and m.use_nodes:
            b = m.node_tree.nodes.get('Principled BSDF')
            if b:
                b.inputs['Emission Strength'].default_value = float(forca)
if env('CINZA'):
    for m in bpy.data.materials:
        b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
        if b:
            b.inputs['Base Color'].default_value = (*srgb('#b3b8c1'), 1)
            b.inputs['Emission Strength'].default_value = 0

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = int(env('AMOSTRAS') or 24)
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    sc.cycles.use_denoising = False
rx, ry = (int(v) for v in vec('RES', '720,540'))
sc.render.resolution_x, sc.render.resolution_y = rx, ry
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w')
sc.world = w
bg = w.node_tree.nodes['Background']
noite = bool(env('NOITE'))
bg.inputs[0].default_value = (0.02, 0.035, 0.09, 1) if noite else (0.62, 0.8, 0.95, 1)
bg.inputs[1].default_value = 0.6 if noite else 1.0
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sc.collection.objects.link(sol)
sol.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
sol.data.energy = 0.25 if noite else 3.2
sol.data.angle = math.radians(8)
if env('CHAO'):
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
    p = bpy.context.active_object
    m = bpy.data.materials.new('chaoPrevia')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(env('CHAO')), 1)
    p.data.materials.append(m)
if env('AGUA'):
    bpy.ops.mesh.primitive_plane_add(size=900, location=(0, 0, 0))
    p = bpy.context.active_object
    m = bpy.data.materials.new('aguaPrevia')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb('#3aa6c4'), 1)
    b.inputs['Roughness'].default_value = 0.25
    b.inputs['Alpha'].default_value = 0.8
    m.surface_render_method = 'BLENDED'
    p.data.materials.append(m)
    bpy.ops.mesh.primitive_plane_add(size=900, location=(0, 0, -3.55))
    f = bpy.context.active_object
    mf = bpy.data.materials.new('fundoPrevia')
    mf.use_nodes = True
    mf.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb('#2a7a8f'), 1)
    f.data.materials.append(mf)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = float(env('LENTE') or 50)
cam.data.clip_end = 2000
alvo = jogo(vec('ALVO', '0,1,0'))
d = jogo(vec('DIR', '1,0.7,1.2')).normalized()
cam.location = alvo + d * float(env('DIST') or 12)
cam.rotation_euler = (alvo - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = os.path.abspath(saida)
bpy.ops.render.render(write_still=True)
print('RENDER', saida)
