"""Íris, a faroleira (aparece no final e no retrato do diário).

Humana, no estilo do avatar da plataforma e no MESMO esqueleto (`Armature.glb`, ossos
`mixamorig:*`): o corpo é montado com as peças do próprio avatar (cabeça com as bocas de fala,
olhos, sobrancelha, nariz, tranças, blusa de manga comprida com listras de marinheira, calça, galochas, cachecol e bochechas), com as
cores dela já gravadas, mais duas peças feitas aqui: o boné de faroleira e o lampião aceso na mão
esquerda. Como o esqueleto é o do avatar, as animações daqui também servem no avatar do jogador.

Peças do avatar são densas (a cabeça sozinha tem ~4,7 mil triângulos e as 13 formas de boca);
as outras são afinadas aqui para o arquivo ficar leve. A cabeça fica inteira para manter as bocas
de fala (`B`, `C`, `D`) e o `smile`. Os olhos ganham as formas `piscar` e `feliz`.

  /tmp/blender-venv/bin/python arte/personagens/iris.py   # grava src/assets/personagens/iris.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from lib_personagens import HERE, Personagem, cos, formas_dos_olhos, juntar, sen, suave  # noqa: E402
from mathutils import Vector  # noqa: E402

PARTES = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'community-kids', 'public', 'avatar3d', 'parts'))

PALETA = {
    'pele': ('#c98a62', 0.75),
    'boca': ('#7a2f2a', 0.6),
    'dentes': ('#fbf6ee', 0.4),
    'cabelo': ('#4a2a1f', 0.65),
    'prendedor': ('#f2b632', 0.5),
    'blusa': ('#1f3b6e', 0.8),
    'listra': ('#f4f1ea', 0.8),
    'calca': ('#3c5363', 0.85),
    'galocha': ('#f2b632', 0.45),
    'sola': ('#f4f1ea', 0.7),
    'cachecol': ('#e2484a', 0.85),
    'bochecha': ('#f29a8e', 0.9),
    'bone': ('#1f3b6e', 0.7),
    'aba': ('#18233a', 0.5),
    'ouro': ('#e8b93f', 0.3),
    'farol': ('#f4f1ea', 0.6),
    'lampiao': ('#2c3e50', 0.45),
    'luz': ('#ffd36b', 0.3, '#ffc44d', 5.0),
    'olho': ('#16120f', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
}

# Peça do avatar → (material da peça → material da Íris), triângulos alvo (None = inteira).
PECAS = [
    ('head-01', {'Skin_': 'pele', 'InsideMouth': 'boca', 'Teeth': 'dentes'}, None),
    ('eyes-12', {'BlackShiny': 'olho', 'White': 'brilho'}, 440),
    ('eyebrow-05', {'Color_': 'cabelo'}, None),
    ('nose-05', {'Skin_': 'pele'}, 120),
    ('face-10', {'Rosado': 'bochecha'}, 200),
    ('hair-14', {'Color_': 'cabelo', 'Prendedor': 'prendedor'}, 820),
    ('top-04', {'Color_': 'blusa', 'Skin_': 'pele'}, 1000),
    ('bottom-04', {'Color_': 'calca', 'Skin_': 'pele'}, 600),
    ('shoes-04', {'Color_': 'galocha', 'White': 'sola'}, 900),
    ('acc-10', {'Color_': 'cachecol'}, 420),
]

# Bocas do avatar que a Íris leva: o sorriso e as três aberturas da fala (B entreaberta, C
# aberta, D bem aberta). As outras pesariam o arquivo sem mudar muito a conversa.
BOCAS = {'Basis', 'smile', 'B', 'C', 'D'}

# Braços em descanso: a pose do arquivo é em T, então os braços descem ~72 graus.
DESCE = 72


def importar(p):
    arm = None
    corpo, cabeca, olhos = [], None, None
    for nome, mapa, alvo in PECAS:
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(PARTES, nome + '.glb'))
        novos = [o for o in bpy.data.objects if o not in antes]
        esqueleto = next(o for o in novos if o.type == 'ARMATURE')
        malhas = [o for o in novos if o.type == 'MESH' and o.vertex_groups]
        for o in novos:
            if o.type == 'MESH' and not o.vertex_groups:
                bpy.data.objects.remove(o)
        if arm is None:
            arm = esqueleto
        for o in malhas:
            for m in o.modifiers:
                if m.type == 'ARMATURE':
                    m.object = arm
            mundo = o.matrix_world.copy()
            o.parent = arm
            o.matrix_world = mundo
            for i, m in enumerate(o.data.materials):
                chave = next((v for k, v in mapa.items() if m.name.startswith(k)), None)
                if chave is None:
                    raise ValueError(f'iris: material {m.name} de {nome} sem cor')
                o.data.materials[i] = p.mat(chave)
            if nome == 'head-01':
                for k in list(o.data.shape_keys.key_blocks):
                    if k.name not in BOCAS:
                        o.shape_key_remove(k)
                cabeca = o
                continue
            if o.data.shape_keys:
                o.shape_key_clear()
            if alvo:
                # O importador separa os vértices nas costuras; sem juntar de volta, o afinar
                # rasga a malha em cacos.
                import bmesh
                bm = bmesh.new()
                bm.from_mesh(o.data)
                bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
                bm.to_mesh(o.data)
                bm.free()
                if o.data.has_custom_normals:
                    with bpy.context.temp_override(object=o, active_object=o):
                        bpy.ops.mesh.customdata_custom_splitnormals_clear()
                for f in o.data.polygons:
                    f.use_smooth = True
                tris = sum(len(f.vertices) - 2 for f in o.data.polygons)
                fatia = alvo * tris / max(1, sum(sum(len(f.vertices) - 2 for f in x.data.polygons) for x in malhas))
                if tris > fatia:
                    mod = o.modifiers.new('afinar', 'DECIMATE')
                    mod.ratio = fatia / tris
                    bpy.context.view_layer.objects.active = o
                    with bpy.context.temp_override(object=o):
                        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
                    bpy.ops.object.modifier_apply(modifier=mod.name)
            if nome == 'top-04':
                listrar(p, o)
            if nome == 'bottom-04':
                dentro_da_galocha(o)
            if nome == 'eyes-12':
                olhos = o
            else:
                corpo.append(o)
        if esqueleto is not arm:
            bpy.data.objects.remove(esqueleto)
    return arm, corpo, cabeca, olhos


def listrar(p, blusa):
    """Listras de marinheira só no peito e nas costas (as mangas ficam lisas): corta a blusa por
    planos horizontais, para a beirada da listra sair reta, e pinta as faixas."""
    import bmesh
    M = blusa.matrix_world
    Mi = M.inverted()
    n_local = (M.to_3x3().transposed() @ Vector((0, 0, 1))).normalized()
    faixas = [(z, z + 0.045) for z in (0.64, 0.74, 0.84, 0.94, 1.04)]
    bm = bmesh.new()
    bm.from_mesh(blusa.data)
    for a, b in faixas:
        for z in (a, b):
            # Só o tronco: cortar as mangas (deitadas na pose em T) encheria a malha de lascas.
            faces = [f for f in bm.faces if abs((M @ f.calc_center_median()).x) < 0.4]
            geo = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
            bmesh.ops.bisect_plane(bm, geom=geo, plane_co=Mi @ Vector((0, 0, z)), plane_no=n_local, dist=1e-6)
    blusa.data.materials.append(p.mat('listra'))
    indice = len(blusa.data.materials) - 1
    blusa_idx = next(i for i, m in enumerate(blusa.data.materials) if m.name == 'blusa')
    for f in bm.faces:
        c = M @ f.calc_center_median()
        if f.material_index == blusa_idx and abs(c.x) < 0.3 and any(a < c.z < b for a, b in faixas):
            f.material_index = indice
    bm.to_mesh(blusa.data)
    bm.free()


def dentro_da_galocha(calca):
    """A barra da calça entra na galocha: corta reto um pouco acima da boca do cano e some com o
    que fica abaixo (senão o tecido atravessa a bota)."""
    import bmesh
    M = calca.matrix_world
    Mi = M.inverted()
    n_local = (M.to_3x3().transposed() @ Vector((0, 0, 1))).normalized()
    bm = bmesh.new()
    bm.from_mesh(calca.data)
    geo = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geo, plane_co=Mi @ Vector((0, 0, 0.27)), plane_no=n_local, clear_inner=True,
                           dist=1e-6)
    bm.to_mesh(calca.data)
    bm.free()


def olhos_com_formas(olhos):
    """As formas `piscar` e `feliz` dos olhos, pelo centro e tamanho de cada olho."""
    lados = {}
    for s in (1, -1):
        vs = [v.co for v in olhos.data.vertices if (v.co.x >= 0) == (s > 0)]
        mn = Vector(map(min, *vs)) if len(vs) > 1 else vs[0]
        mx = Vector(map(max, *vs)) if len(vs) > 1 else vs[0]
        lados[s] = ((mn + mx) / 2, (mx - mn) / 2)
    formas_dos_olhos(olhos, lambda co: lados[1 if co.x >= 0 else -1])


def pose_parado(t):
    return {
        'mixamorig:Hips': {'loc': (0, 0, 0.006 * sen(t))},
        'mixamorig:Spine1': {'rot': [('X', 1.2 * sen(t))]},
        'mixamorig:Neck': {'rot': [('X', -1 * sen(t, 1, 0.1))]},
        'mixamorig:Head': {'rot': [('Y', 3 * sen(t, 1, 0.3)), ('Z', 2 * sen(t, 1, 0.6))]},
        **bracos(esq=(2 * sen(t, 1, 0.5), 0), dir=(2 * sen(t), 0)),
    }


def bracos(esq=(0.0, 0.0), dir=(0.0, 0.0), antebraco_esq=40.0, antebraco_dir=10.0, sobe_esq=0.0, sobe_dir=0.0):
    """Braços caídos com o balanço (frente) e o quanto sobem pelo lado; o esquerdo segura o lampião
    com a mão fechada."""
    pose = {
        'mixamorig:LeftArm': {'rot': [('Y', DESCE - 8 - sobe_esq), ('X', -esq[0])]},
        'mixamorig:RightArm': {'rot': [('Y', -(DESCE - sobe_dir)), ('X', -dir[0])]},
        'mixamorig:LeftForeArm': {'rot': [('Z', -antebraco_esq)]},
        'mixamorig:RightForeArm': {'rot': [('Z', antebraco_dir)]},
    }
    for dedo in ('Index', 'Middle', 'Ring', 'Pinky'):
        for j, a in ((1, 35), (2, 45), (3, 30)):
            pose[f'mixamorig:LeftHand{dedo}{j}'] = {'rot': [('Y', a)]}
    pose['mixamorig:LeftHandThumb1'] = {'rot': [('Z', -20)]}
    return pose


def pose_andar(t):
    a = 24
    dobra_e = 8 + 34 * max(0.0, cos(t))
    dobra_d = 8 + 34 * max(0.0, -cos(t))
    return {
        'mixamorig:Hips': {'loc': (0, 0, 0.02 * cos(t, 2)), 'rot': [('Z', 4 * sen(t))]},
        'mixamorig:Spine1': {'rot': [('X', 3), ('Z', -3 * sen(t))]},
        'mixamorig:Spine2': {'rot': [('Z', -2 * sen(t))]},
        'mixamorig:Head': {'rot': [('X', -2 + 1.5 * cos(t, 2)), ('Z', -2 * sen(t))]},
        'mixamorig:LeftUpLeg': {'rot': [('X', -a * sen(t))]},
        'mixamorig:RightUpLeg': {'rot': [('X', a * sen(t))]},
        'mixamorig:LeftLeg': {'rot': [('X', dobra_e)]},
        'mixamorig:RightLeg': {'rot': [('X', dobra_d)]},
        'mixamorig:LeftFoot': {'rot': [('X', -dobra_e * 0.35)]},
        'mixamorig:RightFoot': {'rot': [('X', -dobra_d * 0.35)]},
        **bracos(esq=(10 * sen(t), 0), dir=(-20 * sen(t), 0), antebraco_dir=14 + 8 * max(0.0, -sen(t))),
    }


def pose_falar(t):
    return {
        'mixamorig:Hips': {'loc': (0, 0, 0.004 * sen(t, 2))},
        'mixamorig:Spine1': {'rot': [('X', 1.5 * sen(t, 2)), ('Z', 3 * sen(t))]},
        'mixamorig:Neck': {'rot': [('X', 2 * sen(t, 4))]},
        'mixamorig:Head': {'rot': [('X', 3 * sen(t, 4) + 1), ('Y', 5 * sen(t)), ('Z', -3 * sen(t))]},
        **bracos(esq=(4, 0), dir=(22 + 8 * sen(t, 2), 0), sobe_dir=14 + 6 * sen(t, 1, 0.25),
                 antebraco_dir=55 + 15 * sen(t, 2)),
    }


def pose_acenar(t):
    pose = {
        'mixamorig:Hips': {'loc': (0, 0, 0.004 * sen(t, 3))},
        'mixamorig:Spine1': {'rot': [('Y', 3 + 1.5 * sen(t, 3))]},
        'mixamorig:Head': {'rot': [('Y', 7 + 3 * sen(t, 3)), ('X', -3)]},
        **bracos(esq=(3, 0)),
    }
    pose['mixamorig:RightArm'] = {'rot': [('Y', 18), ('X', -18)]}
    pose['mixamorig:RightForeArm'] = {'rot': [('Y', 72 + 24 * sen(t, 3))]}
    pose['mixamorig:RightHand'] = {'rot': [('Y', 8 * sen(t, 3, 0.15))]}
    return pose


def pose_feliz(t):
    no_ar = suave(0.12, 0.3, t) * (1 - suave(0.7, 0.88, t))
    u = min(1.0, max(0.0, (t - 0.15) / 0.7))
    alt = 0.12 * math.sin(math.pi * u)
    agacha = 1 - no_ar
    pose = {
        'mixamorig:Hips': {'loc': (0, 0, alt - 0.04 * agacha)},
        'mixamorig:Spine1': {'rot': [('X', 5 * agacha - 3 * no_ar)]},
        'mixamorig:Head': {'rot': [('X', -8 * no_ar), ('Y', 5 * sen(t))]},
        'mixamorig:LeftUpLeg': {'rot': [('X', -18 * agacha - 10 * no_ar)]},
        'mixamorig:RightUpLeg': {'rot': [('X', -18 * agacha - 10 * no_ar)]},
        'mixamorig:LeftLeg': {'rot': [('X', 30 * agacha + 18 * no_ar)]},
        'mixamorig:RightLeg': {'rot': [('X', 30 * agacha + 18 * no_ar)]},
        'mixamorig:LeftFoot': {'rot': [('X', -12 * agacha)]},
        'mixamorig:RightFoot': {'rot': [('X', -12 * agacha)]},
        **bracos(sobe_esq=40 + 100 * no_ar, sobe_dir=40 + 100 * no_ar, antebraco_esq=30, antebraco_dir=30),
    }
    return pose


def ossos_animados(arm):
    nomes = set()
    for pose in (pose_parado(0), pose_andar(0), pose_falar(0), pose_acenar(0), pose_feliz(0)):
        nomes.update(pose)
    return [b.name for b in arm.data.bones if b.name in nomes]


def aplicar_pose(p, pose):
    for pb in p.arm.pose.bones:
        spec = pose.get(pb.name, {})
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = p._rot_local(pb, spec.get('rot', []))
        pb.location = p._loc_local(pb, spec.get('loc', (0, 0, 0)))
    bpy.context.view_layer.update()


def deformacao(p, osso):
    """Matriz (no mundo) que leva um ponto da pose de descanso para a pose atual pelo osso."""
    arm = p.arm
    pb = arm.pose.bones[osso]
    return arm.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted() @ arm.matrix_world.inverted()


def bone_de_faroleira(p, cabelo):
    """Boné azul-marinho com a faixa dourada, a aba escura e o farolzinho bordado na frente,
    sentado no alto das tranças (medido pela malha do cabelo)."""
    vs = [cabelo.matrix_world @ v.co for v in cabelo.data.vertices]
    topo = max(v.z for v in vs)
    cy = sum(v.y for v in vs if v.z > topo - 0.15) / max(1, sum(1 for v in vs if v.z > topo - 0.15))
    base = (0, cy + 0.02, topo - 0.11)
    inc = (-12, 0, 0)
    osso = 'mixamorig:Head'
    p.torno(osso, 'bone', [(0.33, 0.0), (0.34, 0.05), (0.36, 0.12), (0.33, 0.16), (0.2, 0.19), (0, 0.2)],
            centro=base, rot=inc, seg=24)
    p.torno(osso, 'ouro', [(0.335, 0.0), (0.345, 0.0), (0.352, 0.045), (0.342, 0.05)], centro=base, rot=inc, seg=24)
    # Aba: meia lua achatada na frente.
    n = 14
    contorno = [(0.3 * math.cos(math.pi * i / n), -0.3 * math.sin(math.pi * i / n) * 0.62 - 0.14) for i in range(n + 1)]
    contorno += [(x, -0.14 + 0.03 * (1 - (x / 0.3) ** 2)) for x, _ in reversed(contorno[1:-1])]
    p.placa(osso, 'aba', contorno, 0.02, centro=(0, base[1] - 0.17, base[2] + 0.01), rot=(-6, 0, 0),
            curvar=lambda x, y: -0.25 * x * x)
    # Farolzinho bordado: torre clara, faixa vermelha e a luz amarela.
    frente = Vector((0, base[1] - 0.355, base[2] + 0.1))
    p.esfera(osso, 'farol', tuple(frente), (0.03, 0.01, 0.055), rot=inc, seg=8, aneis=6)
    p.esfera(osso, 'cachecol', tuple(frente + Vector((0, -0.004, 0.0))), (0.031, 0.008, 0.01), rot=inc, seg=8, aneis=4)
    p.esfera(osso, 'luz', tuple(frente + Vector((0, 0.004, 0.065))), (0.022, 0.01, 0.018), rot=inc, seg=8, aneis=5)


def lampiao(p):
    """Lampião de faroleira pendurado na mão esquerda: argola, tampa, vidro aceso e base. É feito
    na pose de descanso dos braços (caído pela alça) e desfeito para a pose do arquivo."""
    aplicar_pose(p, pose_parado(0))
    d = deformacao(p, 'mixamorig:LeftHand')
    pega = d @ Vector((0.9, -0.045, 0.84))  # pontas dos dedos fechados, na pose de descanso
    pega = Vector((pega.x, pega.y, pega.z))
    pecas = []
    osso = 'mixamorig:LeftHand'
    k = 0.9  # tamanho do lampião
    pecas.append(p.toro(osso, 'lampiao', tuple(pega + Vector((0, 0, -0.035 * k))), 0.05 * k, 0.008, rot=(0, 90, 0),
                        seg=16, rseg=5))
    topo = pega + Vector((0, 0, -0.085 * k))
    pecas.append(p.torno(osso, 'lampiao', [(0, 0.06 * k), (0.03 * k, 0.055 * k), (0.085 * k, 0.0),
                                           (0.09 * k, -0.015 * k), (0.075 * k, -0.02 * k)], centro=tuple(topo), seg=14))
    vidro = topo + Vector((0, 0, -0.14 * k))
    pecas.append(p.torno(osso, 'luz', [(0, -0.11 * k), (0.07 * k, -0.11 * k), (0.085 * k, -0.06 * k),
                                       (0.085 * k, 0.06 * k), (0.07 * k, 0.11 * k), (0, 0.11 * k)],
                         centro=tuple(vidro), seg=14))
    for j in range(4):
        a = math.pi / 4 + j * math.pi / 2
        q = Vector((0.088 * k * math.cos(a), 0.088 * k * math.sin(a), 0))
        pecas.append(p.tubo(osso, 'lampiao', [tuple(vidro + q + Vector((0, 0, -0.115 * k))),
                                              tuple(vidro + q + Vector((0, 0, 0.115 * k)))], 0.008, seg=5))
    base = vidro + Vector((0, 0, -0.13 * k))
    pecas.append(p.torno(osso, 'lampiao', [(0, -0.03 * k), (0.08 * k, -0.03 * k), (0.095 * k, -0.015 * k),
                                           (0.09 * k, 0.02 * k), (0, 0.02 * k)], centro=tuple(base), seg=14))
    volta = d.inverted()
    for o in pecas:
        o.data.transform(volta)
    aplicar_pose(p, {})


def construir():
    p = Personagem('iris', PALETA)
    arm, corpo, cabeca, olhos = importar(p)
    arm.name = 'iris'
    p.arm = arm
    p.escala_arm = arm.scale.x
    p.ossos = [b.name for b in arm.data.bones]
    cabelo = max((o for o in corpo if any(m.name == 'cabelo' for m in o.data.materials)), key=lambda o: len(o.data.vertices))
    bone_de_faroleira(p, cabelo)
    lampiao(p)

    # Peças feitas aqui: juntas por osso, com peso 1, e presas ao esqueleto do avatar.
    feitas = []
    for osso, objs in p.pecas.items():
        o = juntar(objs, f'iris-{osso.split(":")[-1].lower()}')
        g = o.vertex_groups.new(name=osso)
        g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
        o.parent = arm
        o.matrix_parent_inverse = arm.matrix_world.inverted()
        mod = o.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm
        feitas.append(o)
    juntar(corpo + feitas, 'iris-corpo')
    cabeca.name = cabeca.data.name = 'iris-cabeca'
    olhos.name = olhos.data.name = 'iris-olhos'
    olhos_com_formas(olhos)

    p.animados = ossos_animados(arm)
    p.clipe('parado', 48, pose_parado)
    p.clipe('andar', 24, pose_andar)
    p.clipe('falar', 48, pose_falar)
    p.clipe('acenar', 48, pose_acenar)
    p.clipe('feliz', 24, pose_feliz)
    return p


if __name__ == '__main__':
    construir().exportar()
