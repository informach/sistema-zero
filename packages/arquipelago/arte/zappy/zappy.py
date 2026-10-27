"""O Zappy, o vagalume guia do Arquipélago Vagalume (Blender sem tela, `bpy` do PyPI).

Inspirado no Zappy que a dona mandou (27/10/2026): cabeça redonda preta com olhos grandes,
antenas com pontas amarelas, perninhas finas, dois pares de asas claras e a bunda acesa.

Gera `src/assets/zappy.glb` com duas animações em laço:
- `voar`: asas batendo rápido (4 batidas por segundo) e o corpo subindo e descendo;
- `parado`: o mesmo, mais calmo, para quando o Zappy espera.

Convenções: no Blender z é para cima e a FRENTE olha para -Y (o exportador converte para o y para
cima do three.js e a frente vira +Z). Altura total ~1,5 (o jogo reduz). O material da parte que
brilha chama `luz`: o jogo pulsa o `emissiveIntensity` dele e acende mais à noite.

Rodar (mesmo ambiente das peças do quarto):
  /tmp/blender-venv/bin/python arte/zappy/zappy.py            # grava src/assets/zappy.glb
  ZAPPY_OUT=/tmp/z.glb /tmp/blender-venv/bin/python arte/zappy/zappy.py
"""
import math
import os

import bpy
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('ZAPPY_OUT', os.path.join(HERE, '..', '..', 'src', 'assets', 'zappy.glb'))
FPS = 24
LACO = 24  # quadros de cada animação (1 s)

# (cor, rugosidade, emissão, força, alfa)
PALETA = {
    'corpo': ('#16161c', 0.55, None, 0, 1),
    'olho': ('#ffffff', 0.35, None, 0, 1),
    'pupila': ('#101014', 0.25, None, 0, 1),
    'boca': ('#e8473f', 0.6, None, 0, 1),
    'bochecha': ('#ff8fb1', 0.8, None, 0, 1),
    'ponta': ('#fff35a', 0.5, '#fff35a', 0.6, 1),
    'luz': ('#eaff3c', 0.35, '#dcff2e', 6.0, 1),
    'asa': ('#f4ecff', 0.25, '#fbf6ff', 0.25, 0.62),
}
_MATS = {}


def srgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def mat(chave):
    if chave in _MATS:
        return _MATS[chave]
    cor, rug, emis, forca, alfa = PALETA[chave]
    m = bpy.data.materials.new(chave)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(cor), 1)
    b.inputs['Roughness'].default_value = rug
    b.inputs['Metallic'].default_value = 0.0
    if emis:
        b.inputs['Emission Color'].default_value = (*srgb(emis), 1)
        b.inputs['Emission Strength'].default_value = forca
    if alfa < 1:
        b.inputs['Alpha'].default_value = alfa
        m.surface_render_method = 'BLENDED'
        m.use_backface_culling = False
    _MATS[chave] = m
    return m


def novo(nome, dados, material, liso=True):
    o = bpy.data.objects.new(nome, dados)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    for p in o.data.polygons:
        p.use_smooth = liso
    return o


def esfera(nome, material, raio, pos, escala=(1, 1, 1), seg=20, aneis=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=aneis, radius=raio)
    o = bpy.context.active_object
    o.name = nome
    o.location = pos
    o.scale = escala
    o.rotation_euler = Euler([math.radians(a) for a in rot])
    o.data.materials.append(mat(material))
    bpy.ops.object.shade_smooth()
    return o


def tubo(nome, material, pontos, raio=0.022):
    """Um tubo liso que passa pelos pontos (antenas e perninhas)."""
    curva = bpy.data.curves.new(nome, 'CURVE')
    curva.dimensions = '3D'
    curva.resolution_u = 3
    curva.bevel_depth = raio
    curva.bevel_resolution = 1
    curva.use_fill_caps = True
    s = curva.splines.new('BEZIER')
    s.bezier_points.add(len(pontos) - 1)
    for bp, p in zip(s.bezier_points, pontos):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(nome, curva)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def meia_boca():
    import bmesh
    o = esfera('boca', 'boca', 1, (0, -0.462, 0.46), (0.1, 0.04, 0.075), 12, 8)
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(o.data)
    geo = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geo, plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_outer=True)
    borda = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=borda)
    bmesh.update_edit_mesh(o.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def asa(nome, comprimento, largura, lado):
    """Asa em forma de folha, com o pivô na junta (origem) e a ponta para o lado (x)."""
    n = 14
    verts = [(0, 0, 0)]
    for i in range(n + 1):
        t = i / n
        a = math.pi * t
        x = comprimento * (0.08 + 0.92 * (1 - math.cos(a)) / 2)
        y = largura * math.sin(a) * (0.55 + 0.45 * t) * (1 if i < n else 0)
        verts.append((x * lado, y - largura * 0.25 * t, 0.0))
    faces = [(0, i, i + 1) for i in range(1, n + 1)]
    me = bpy.data.meshes.new(nome)
    me.from_pydata(verts, [], faces)
    me.update()
    return novo(nome, me, 'asa')


def juntar(objs, nome):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = nome
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def construir():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()
    sc = bpy.context.scene
    sc.render.fps = FPS

    pecas = []
    # Cabeça grande e redonda, levemente achatada.
    pecas.append(esfera('cabeca', 'corpo', 0.5, (0, 0, 0.62), (1.04, 0.98, 0.94), 18, 12))
    # Olhos grandes: branco, pupila e brilho, encostados na frente da cabeça (-Y).
    for lado in (-1, 1):
        x = 0.19 * lado
        pecas.append(esfera(f'olho{lado}', 'olho', 1, (x, -0.405, 0.67), (0.135, 0.07, 0.17), 14, 8, (0, 0, -18 * lado)))
        pecas.append(esfera(f'pupila{lado}', 'pupila', 1, (x * 0.93, -0.462, 0.64), (0.075, 0.035, 0.1), 10, 6, (0, 0, -18 * lado)))
        pecas.append(esfera(f'brilho{lado}', 'olho', 1, (x * 0.93 + 0.03, -0.49, 0.69), (0.027, 0.012, 0.03), 8, 6))
        pecas.append(esfera(f'bochecha{lado}', 'bochecha', 1, (0.33 * lado, -0.36, 0.47), (0.07, 0.03, 0.045), 8, 6, (0, 0, -40 * lado)))
    # Boca aberta, sorrindo: meia elipse com a borda reta em cima.
    pecas.append(meia_boca())
    # Antenas curvas com bolinhas amarelas na ponta.
    for lado in (-1, 1):
        pecas.append(tubo(f'antena{lado}', 'corpo', [
            (0.12 * lado, -0.05, 1.02), (0.2 * lado, -0.08, 1.3), (0.33 * lado, -0.02, 1.5)]))
        pecas.append(esfera(f'ponta{lado}', 'ponta', 0.075, (0.34 * lado, -0.02, 1.53), seg=10, aneis=6))
    # Tórax pequeno logo abaixo da cabeça.
    pecas.append(esfera('torax', 'corpo', 0.2, (0, 0.04, 0.1), (1, 1.05, 0.95), 12, 8))
    # Abdômen preto e a bunda acesa (separada pelo material `luz`).
    pecas.append(esfera('abdomen', 'corpo', 0.19, (0, 0.2, -0.04), (1, 1.1, 1), 12, 8, (-25, 0, 0)))
    pecas.append(esfera('luz', 'luz', 0.23, (0, 0.38, -0.2), (0.95, 1.25, 0.95), 16, 10, (-35, 0, 0)))
    # Perninhas finas: dois bracinhos para a frente e duas pernas para baixo.
    for lado in (-1, 1):
        pecas.append(tubo(f'braco{lado}', 'corpo', [
            (0.12 * lado, -0.02, 0.12), (0.3 * lado, -0.12, 0.02), (0.36 * lado, -0.2, -0.12)], 0.024))
        pecas.append(esfera(f'mao{lado}', 'corpo', 0.04, (0.36 * lado, -0.21, -0.14), seg=8, aneis=6))
        pecas.append(tubo(f'perna{lado}', 'corpo', [
            (0.08 * lado, 0.08, 0.0), (0.2 * lado, 0.02, -0.2), (0.22 * lado, -0.04, -0.4)], 0.024))
        pecas.append(esfera(f'pe{lado}', 'corpo', 0.045, (0.22 * lado, -0.05, -0.42), seg=8, aneis=6))
    corpo = juntar(pecas, 'zappy-corpo')

    # Raiz animada (sobe, desce e inclina); corpo e asas presos nela.
    raiz = bpy.data.objects.new('zappy', None)
    sc.collection.objects.link(raiz)
    corpo.parent = raiz

    asas = {}
    for lado, nome_lado in ((1, 'esquerda'), (-1, 'direita')):
        for par, comp, larg, pos, incl in (
            ('frente', 1.0, 0.42, (0.12 * lado, 0.28, 0.26), 8),
            ('tras', 0.76, 0.3, (0.1 * lado, 0.36, 0.14), -10),
        ):
            a = asa(f'asa-{par}-{nome_lado}', comp, larg, lado)
            a.location = pos
            a.rotation_euler = Euler((math.radians(incl), 0, math.radians(-18 * lado if par == 'frente' else -42 * lado)))
            a.parent = raiz
            asas[(par, lado)] = a
    return raiz, corpo, asas


def chave(o, quadro, **props):
    for nome, valor in props.items():
        setattr(o, nome, valor)
        o.keyframe_insert(data_path=nome, frame=quadro)


def animar(nome, raiz, asas, batidas, abertura, subida):
    """Grava uma animação em laço e a empurra para uma faixa de NLA com o nome dela."""
    passo = LACO / (batidas * 2)
    for (par, lado), a in asas.items():
        base = a.rotation_euler.copy()
        amp = abertura * (1 if par == 'frente' else 0.8)
        atraso = 0 if par == 'frente' else passo * 0.35
        for i in range(batidas * 2 + 1):
            q = i * passo
            cima = i % 2 == 0
            # Girar em +y leva a ponta de +x para baixo: para cima é o sinal oposto ao lado.
            ang = math.radians(-(amp if cima else -amp * 0.6) * lado)
            r = base.copy()
            r.y = ang
            chave(a, min(LACO, q + atraso) if i < batidas * 2 else LACO, rotation_euler=r)
        _empurrar(a, nome)
        a.rotation_euler = base
    for i in range(5):
        q = i * LACO / 4
        z = subida * math.sin(i * math.pi / 2)
        inc = math.radians(4 * math.sin(i * math.pi / 2 + math.pi / 2))
        chave(raiz, q, location=Vector((0, 0, z)), rotation_euler=Euler((inc, 0, 0)))
    _empurrar(raiz, nome)
    raiz.location = (0, 0, 0)
    raiz.rotation_euler = (0, 0, 0)


def _empurrar(o, nome):
    ad = o.animation_data
    acao = ad.action
    acao.name = f'{nome}-{o.name}'
    for fc in _fcurves(acao):
        for k in fc.keyframe_points:
            k.interpolation = 'SINE' if 'rotation' in fc.data_path else 'BEZIER'
    faixa = ad.nla_tracks.new()
    faixa.name = nome
    faixa.strips.new(nome, 0, acao)
    ad.action = None


def _fcurves(acao):
    if hasattr(acao, 'fcurves') and len(getattr(acao, 'fcurves', [])) > 0:
        return list(acao.fcurves)
    curvas = []
    for camada in getattr(acao, 'layers', []):
        for faixa in camada.strips:
            for cb in faixa.channelbags:
                curvas.extend(cb.fcurves)
    return curvas


def exportar(caminho):
    os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=caminho,
        export_format='GLB',
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_draco_mesh_compression_enable=False,
    )


def main():
    raiz, corpo, asas = construir()
    animar('voar', raiz, asas, batidas=4, abertura=40, subida=0.05)
    animar('parado', raiz, asas, batidas=2, abertura=25, subida=0.08)
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = LACO
    tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
    print(f'zappy: {tris} triângulos')
    exportar(OUT)
    print(f'zappy: gravado em {os.path.abspath(OUT)}')


if __name__ == '__main__':
    main()
