"""Prévias dos personagens (Cycles na CPU, sem tela). Não faz parte do jogo, só da conferência.

Lê os GLB exportados (assim a prévia também prova que o arquivo abre) e põe cada um numa pose:

  python render.py saida.png "capi.glb:x=0:clipe=parado:q=0" "zappy.glb:x=1.2:z=1.4:escala=0.37"

Cada item aceita `x`, `y`, `z` (metros, z para cima), `giro` (graus em torno de z), `escala`,
`clipe` e `q` (quadro do clipe). Variáveis: VISTA (graus em torno do personagem, 0 = de frente,
35 = três quartos), ALTO (altura da câmera em relação ao centro), LENTE, RES="larg,alt",
FUNDO="#cor", AMOSTRAS, FOLGA (margem do enquadramento), OLHOS=piscar|feliz (forma dos olhos),
ESCONDER_MAT="mat1,mat2" (some com esses materiais, para olhar o que está por baixo).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
saida, itens = args[0], args[1:]
env = os.environ.get


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def acao_do_clipe(nome):
    for a in bpy.data.actions:
        if a.name == nome or a.name.startswith(nome + '_') or a.name.endswith('|' + nome):
            return a
    return None


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for item in itens:
    partes = item.split(':')
    glb, opc = partes[0], dict(p.split('=') for p in partes[1:])
    antes = set(bpy.data.objects)
    acoes_antes = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=glb)
    novos = [o for o in bpy.data.objects if o not in antes]
    for o in [o for o in novos if o.name.startswith('Icosphere') and o.parent is None]:
        novos.remove(o)  # forma de osso que o importador cria; não faz parte do arquivo
        bpy.data.objects.remove(o)
    acoes = [a for a in bpy.data.actions if a not in acoes_antes]
    # Um vazio por item segura tudo: a animação do arquivo pode mexer na posição das raízes (o
    # Zappy sobe e desce) e apagaria um deslocamento posto direto nelas.
    suporte = bpy.data.objects.new('suporte', None)
    sc.collection.objects.link(suporte)
    for o in [o for o in novos if o.parent is None]:
        o.parent = suporte
    suporte.location = (float(opc.get('x', 0)), float(opc.get('y', 0)), float(opc.get('z', 0)))
    suporte.rotation_euler.z = math.radians(float(opc.get('giro', 0)))
    suporte.scale = (float(opc.get('escala', 1)),) * 3
    clipe = opc.get('clipe')
    q = int(float(opc.get('q', 0)))
    for o in novos:
        ad = o.animation_data
        if o.type != 'ARMATURE' and not (ad and ad.action):
            continue
        o.animation_data_create()
        ad = o.animation_data
        alvo = None
        if clipe:
            alvo = next((a for a in acoes if a.name == clipe or a.name.startswith(clipe)), None)
        if alvo is None and o.type != 'ARMATURE':
            alvo = next((a for a in acoes if a.name.startswith('parado')), ad.action)
        for faixa in list(ad.nla_tracks):
            ad.nla_tracks.remove(faixa)
        ad.action = None
        if alvo is not None:
            # Cada item no seu quadro: a faixa começa em -q e a cena fica no quadro 0.
            faixa = ad.nla_tracks.new()
            faixa.strips.new(alvo.name, -q, alvo)
    if env('OLHOS'):
        for o in novos:
            if o.type == 'MESH' and o.data.shape_keys:
                k = o.data.shape_keys.key_blocks.get(env('OLHOS'))
                if k:
                    k.value = 1.0
for nome in (env('ESCONDER_MAT') or '').split(','):
    m = bpy.data.materials.get(nome)
    if m:
        m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.0
sc.frame_set(0)
bpy.context.view_layer.update()

# Enquadramento pela caixa de tudo o que aparece (já na pose).
dg = bpy.context.evaluated_depsgraph_get()
mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    for v in me.vertices:
        p = ev.matrix_world @ v.co
        mn = Vector(map(min, mn, p))
        mx = Vector(map(max, mx, p))
    ev.to_mesh_clear()
centro = (mn + mx) / 2
tam = mx - mn

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = int(env('AMOSTRAS') or 32)
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    sc.cycles.use_denoising = False
rx, ry = (int(v) for v in (env('RES') or '720,900').split(','))
sc.render.resolution_x, sc.render.resolution_y = rx, ry
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
w = bpy.data.worlds.new('w')
sc.world = w
bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = (*srgb(env('FUNDO') or '#dcefff'), 1)
bg.inputs[1].default_value = 0.85

sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sc.collection.objects.link(sol)
sol.rotation_euler = (math.radians(48), math.radians(8), math.radians(-30))
sol.data.energy = 3.0
sol.data.angle = math.radians(12)
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'AREA'))
sc.collection.objects.link(fill)
dist_fill = max(5.4, tam.length * 1.5)
fill.data.energy = 120 * (dist_fill / 5.4) ** 2
fill.data.size = 4 * dist_fill / 5.4
fill.location = centro + Vector((3, -4, 2.5)).normalized() * dist_fill
fill.rotation_euler = (centro - fill.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, min(0.0, mn.z)))
chao = bpy.context.active_object
m = bpy.data.materials.new('chaoPrevia')
b = m.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (*srgb(env('CHAO') or '#bfe3a5'), 1)
b.inputs['Roughness'].default_value = 0.9
chao.data.materials.append(m)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = float(env('LENTE') or 70)
vista = math.radians(float(env('VISTA') or 0))
alto = float(env('ALTO') or 0.25)
d = Vector((-math.sin(vista), -math.cos(vista), alto)).normalized()
# Distância para caber altura e largura com folga.
folga = float(env('FOLGA') or 1.15)
fov_v = 2 * math.atan(cam.data.sensor_width / 2 / cam.data.lens) * (ry / rx if rx > ry else 1)
fov_h = fov_v * rx / ry
larg = max(tam.x * abs(math.cos(vista)) + tam.y * abs(math.sin(vista)), 0.1)
dist = max(tam.z / 2 / math.tan(fov_v / 2), larg / 2 / math.tan(fov_h / 2)) * folga + tam.y / 2
cam.location = centro + d * dist
cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = os.path.abspath(saida)
bpy.ops.render.render(write_still=True)
print('RENDER', saida)
