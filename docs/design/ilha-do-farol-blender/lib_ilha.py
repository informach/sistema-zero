"""Ajudantes das artes da Ilha do Farol (Blender sem tela, `bpy` do PyPI).

Reaproveita as formas do quarto (`community-kids/scripts/room-blender/lib_q.py`: caixa chanfrada,
almofada, cilindro, tubo, placa recortada, exportação) e acrescenta o que a ilha pede: contornos
orgânicos em camadas, folhas, cascos e pedras.

Convenções (as do Jogo 3D, iguais às do quarto): no Blender z é para cima e a FRENTE olha para -Y;
o exportador de glTF converte para o y para cima do three.js e a frente vira +Z, que é o lado da
câmera do curso. `g(x, z)` traduz um ponto do jogo (x, z) para o chão do Blender (x, -z).

Cada peça fica no seu próprio referencial, o mesmo dos projetos do Molda que ela substitui
(`docs/design/ilha-do-farol-molda/mapa-de-reintegracao.json` guarda a posição de cada uma).

Cores: as dos desenhos 2D da Chave do Farol (`studio/src/arte/assets/farol/*.svg`).
"""
import os, sys, math, random

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['ROOM_OUT'] = os.environ.get('ILHA_OUT', os.path.join(HERE, 'out'))
sys.path.insert(0, os.path.join(HERE, '../../../packages/community-kids/scripts/room-blender'))
import lib_q  # noqa: E402
from lib_q import *  # noqa: E402,F401,F403  (box, cushion, cyl, sphere, uvball, cone, torus, tube, prism, join, export…)
from lib_q import _obj  # noqa: E402

# O `import *` acima traz o HERE do quarto; esta é a pasta da ilha.
ILHA_DIR = HERE = os.path.dirname(os.path.abspath(__file__))

R = math.radians

# (cor, rugosidade, emissão, força). Os nomes descrevem o papel; as cores saem dos SVGs.
lib_q.PALETTE.update({
    # pessoa
    'pele': ('#fae1b5', 0.75, None, 0),
    'cabelo': ('#121a30', 0.6, None, 0),
    'camiseta': ('#ffffff', 0.85, None, 0),
    'camisetaSombra': ('#dde5f0', 0.85, None, 0),
    'short': ('#3b5dc9', 0.8, None, 0),
    'sapato': ('#1b2033', 0.5, None, 0),
    'boca': ('#5d275d', 0.6, None, 0),
    'olho': ('#ffffff', 0.3, None, 0),
    'pupila': ('#0b0f1c', 0.25, None, 0),
    # farol
    'farolVermelho': ('#cf3f36', 0.6, None, 0),
    'farolLaranja': ('#d9592d', 0.6, None, 0),
    'farolBranco': ('#f3f6fb', 0.7, None, 0),
    'ardosia': ('#46536e', 0.5, None, 0),
    'marinho': ('#0f1a33', 0.55, None, 0),
    'vidroApagado': ('#46536e', 0.15, '#2a3550', 0.15),
    'vidroAceso': ('#fff4b0', 0.2, '#ffe9a0', 1.6),
    'lampada': ('#fffbe0', 0.2, '#fff2b0', 3.0),
    'feixe': ('#ffe49b', 0.5, '#ffe49b', 0.55),
    # barco e chave
    'casco': ('#835d3f', 0.75, None, 0),
    'cascoRef': ('#967044', 0.75, None, 0),
    'cascoBorda': ('#ca9e58', 0.7, None, 0),
    'cascoMiolo': ('#22394b', 0.8, None, 0),
    'mastroRef': ('#a17842', 0.8, None, 0),
    'bronze': ('#b07a3a', 0.4, None, 0),
    'vigiaVidro': ('#8fc6ff', 0.15, '#8fc6ff', 0.2),
    'cascoLinha': ('#73503a', 0.8, None, 0),
    'ouro': ('#f3b123', 0.35, '#f3b123', 0.12),
    'chaveOuro': ('#f3b123', 0.28, '#ffcf55', 0.22),
    'vela': ('#ffffff', 0.9, None, 0),
    'bandeira': ('#cf3f36', 0.8, None, 0),
    'mastro': ('#7a5132', 0.8, None, 0),
    # ilha tropical
    'mar': ('#6e9bff', 0.35, None, 0),
    'marOnda': ('#8fb3ff', 0.4, None, 0),
    'aguaRasa': ('#94d5f5', 0.3, None, 0),
    'espuma': ('#ffffff', 0.7, None, 0),
    'areiaClara': ('#fae1ab', 0.95, None, 0),
    'areia': ('#dfc283', 0.95, None, 0),
    'areiaEscura': ('#c9aa6c', 0.95, None, 0),
    'gramaBorda': ('#4e9081', 0.9, None, 0),
    'grama': ('#0b7a54', 0.9, None, 0),
    'folha': ('#29905a', 0.8, None, 0),
    'folhaEscura': ('#21734f', 0.8, None, 0),
    'folhaClara': ('#41a867', 0.8, None, 0),
    'troncoLiso': ('#95633d', 0.85, None, 0),
    'coco': ('#61432f', 0.7, None, 0),
    'madeira': ('#835d3f', 0.85, None, 0),
    'madeiraClara': ('#95633d', 0.85, None, 0),
    'madeiraEscura': ('#61432f', 0.85, None, 0),
    'corda': ('#d8b57a', 0.95, None, 0),
    # pedras e coqueiro das referências do Molda (cores de lá, com um tom de luz e um de sombra)
    'pedraAzul': ('#566c86', 0.9, None, 0),
    'pedraAzulClara': ('#647b96', 0.9, None, 0),
    'pedraAzulTopo': ('#7c93ae', 0.85, None, 0),
    'pedraMarinho': ('#333c57', 0.9, None, 0),
    'pedraMarinhoClara': ('#3d4766', 0.9, None, 0),
    'pedraMarinhoTopo': ('#4f5b7d', 0.85, None, 0),
    'troncoRef': ('#a67c47', 0.85, None, 0),
    'troncoRefAnel': ('#8f6a3b', 0.85, None, 0),
    'folhaRef': ('#3f9441', 0.8, None, 0),
    'folhaRefClara': ('#4fae4c', 0.8, None, 0),
    'folhaRefEscura': ('#337d36', 0.8, None, 0),
    'cocoRef': ('#775e37', 0.7, None, 0),
    'pedra': ('#8d95a8', 0.85, None, 0),
    'pedraClara': ('#a9b0c0', 0.85, None, 0),
    'pedraEscura': ('#6c7488', 0.85, None, 0),
    'musgo': ('#29905a', 0.9, None, 0),
})
# Translúcidos: o feixe do farol aceso.
lib_q.ALPHA.update({'feixe': 0.85})


def g(x, z):
    """Ponto do chão do jogo (x, z) no chão do Blender."""
    return (x, -z)


def shade_auto(o, angle=35):
    """Liso nas curvas e quina viva acima de `angle` graus (o glTF separa as normais nas quinas)."""
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=R(angle))
    return o


def bevel_mod(o, width, segs=2, angle=40):
    b = o.modifiers.new('bv', 'BEVEL')
    b.width = width
    b.segments = segs
    b.limit_method = 'ANGLE'
    b.angle_limit = R(angle)
    lib_q._apply(o, b)
    return o


def blob(cx, cy, rx, ry, seed=0, n=64, wob=0.05, waves=(2, 3, 5), rot=0.0):
    """Contorno orgânico (ilha, mancha de grama): elipse com ondulações suaves e determinísticas."""
    rnd = random.Random(seed)
    terms = [(k, rnd.uniform(0, 2 * math.pi), wob * rnd.uniform(0.5, 1.0) / (i + 1) ** 0.5)
             for i, k in enumerate(waves)]
    c, s = math.cos(rot), math.sin(rot)
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = 1 + sum(a * math.sin(k * t + ph) for k, ph, a in terms)
        x, y = rx * r * math.cos(t), ry * r * math.sin(t)
        pts.append((cx + x * c - y * s, cy + x * s + y * c))
    return pts


def slab(pts, z0, z1, m, bevel=0.0, segs=2, name='slab', fundo=True):
    """Placa com o contorno `pts` (no chão do Blender) entre as alturas z0 e z1, borda arredondada.

    `fundo=False` deixa a placa sem a face de baixo (camadas do chão, que nunca são vistas por baixo)."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(top)
    if fundo:
        bm.faces.new(list(reversed(bot)))
    n = len(pts)
    for i in range(n):
        bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj(name, bm, m)
    if bevel > 0:
        bevel_mod(o, min(bevel, (z1 - z0) * 0.48), segs, angle=50)
    # O tampo grande vira leque de triângulos: sem normal suavizada ele fica limpo.
    return shade_auto(o, 50)


def strip(path, half_widths, z0, z1, m, bevel=0.0, segs=2, name='faixa'):
    """Faixa de largura variável ao longo de `path` (lista de pontos do chão), como uma trilha."""
    left, right = [], []
    n = len(path)
    for i, (x, y) in enumerate(path):
        ax, ay = path[max(i - 1, 0)]
        bx, by = path[min(i + 1, n - 1)]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        w = half_widths[i]
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    return slab(left + list(reversed(right)), z0, z1, m, bevel, segs, name, fundo=False)


def leaf(base, yaw, length, width, m, lift=0.35, droop=0.9, fold=0.35, teeth=0, pitch=0.0, n=14):
    """Folha curva com nervura central dobrada (coqueiro, moita). Sai de `base` na direção `yaw`.

    `teeth` > 0 recorta a borda em dentes (folíolos do coqueiro)."""
    bm = bmesh.new()
    cy, sy = math.cos(yaw), math.sin(yaw)
    rows = []
    for i in range(n + 1):
        t = i / n
        h = length * t
        z = base[2] + lift * t + pitch * h - droop * t * t
        cx, cyy = base[0] + cy * h, base[1] + sy * h
        w = width * math.sin(math.pi * min(1.0, t ** 0.75)) * (0.25 + 0.75 * (1 - t) ** 0.15)
        if teeth and 0.08 < t < 0.95:
            w *= 0.62 + 0.38 * abs(math.sin(t * math.pi * teeth))
        px, py = -sy, cy  # perpendicular no chão
        drop = fold * w
        rows.append([
            bm.verts.new((cx + px * w, cyy + py * w, z - drop)),
            bm.verts.new((cx, cyy, z)),
            bm.verts.new((cx - px * w, cyy - py * w, z - drop)),
        ])
    for i in range(n):
        a, b = rows[i], rows[i + 1]
        bm.faces.new((a[0], b[0], b[1], a[1]))
        bm.faces.new((a[1], b[1], b[2], a[2]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('folha', bm, m)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def rock(loc, size, m, seed=0, subdiv=2, rough=0.18, flat_top=0.0, top_m=None):
    """Pedra lapidada: icosfera amassada por ruído, faces chapadas (o jeito "brinquedo").

    `flat_top` achata o topo (0..1); `top_m` pinta as faces viradas para cima (musgo, luz)."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1)
    bumps = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized(),
              rnd.uniform(-rough, rough)) for _ in range(9)]
    for v in bm.verts:
        d = v.co.normalized()
        k = 1 + sum(a * max(0.0, d.dot(c)) ** 3 for c, a in bumps)
        k += rnd.uniform(-rough, rough) * 0.25
        v.co = d * k
        if flat_top and v.co.z > 1 - flat_top:
            v.co.z = 1 - flat_top + (v.co.z - (1 - flat_top)) * 0.25
        v.co = Vector((v.co.x * size[0] / 2, v.co.y * size[1] / 2, v.co.z * size[2] / 2))
    # Base plana no chão: nada abaixo de z = 0 local (a pedra pousa na grama).
    zmin = min(v.co.z for v in bm.verts)
    for v in bm.verts:
        v.co.z -= zmin
        if v.co.z < size[2] * 0.06:
            v.co.z = size[2] * 0.06 * (v.co.z / (size[2] * 0.06)) ** 2
    o = _obj('pedra', bm, m)
    if top_m:
        o.data.materials.append(mat(top_m))
        for p in o.data.polygons:
            if p.normal.z > 0.72:
                p.material_index = 1
    lib_q.flat(o)
    o.location = loc
    return o


def ellipsoid(loc, radii, m, seg=20, ring=12, rot=(0, 0, 0)):
    o = uvball(1, loc, m, scale=radii, seg=seg, ring=ring)
    o.rotation_euler = rot
    return o


def place(objs, loc=(0, 0, 0), rot_z=0.0, scale=1.0):
    """Move/gira um conjunto de objetos já posicionados como um bloco só (em torno da origem)."""
    M = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot_z, 4, 'Z') @ Matrix.Scale(scale, 4)
    # Objeto recém-criado só tem matrix_world depois de uma atualização da cena.
    bpy.context.view_layer.update()
    for o in objs:
        o.matrix_world = M @ o.matrix_world
    return objs


def superellipsoid(size, loc, m, e1=0.5, e2=0.5, seg=18, ring=10, flat_bottom=None, rot=(0, 0, 0)):
    """Caixa arredondada lisa (superelipsoide): e = 1 é elipsoide, perto de 0 vira caixa.

    `e1` arredonda de cima a baixo e `e2` em volta. `flat_bottom` corta a base nessa fração
    da altura (sapato, short), deixando-a reta."""
    def c(w, e):
        v = math.cos(w)
        return math.copysign(abs(v) ** e, v)

    def s_(w, e):
        v = math.sin(w)
        return math.copysign(abs(v) ** e, v)
    A, B, C = size[0] / 2, size[1] / 2, size[2] / 2
    bm = bmesh.new()
    rows = []
    for j in range(1, ring):
        v = -math.pi / 2 + math.pi * j / ring
        rows.append([bm.verts.new((A * c(v, e1) * c(u, e2), B * c(v, e1) * s_(u, e2), C * s_(v, e1)))
                     for u in (2 * math.pi * i / seg - math.pi for i in range(seg))])
    bot = bm.verts.new((0, 0, -C))
    top = bm.verts.new((0, 0, C))
    for j in range(len(rows) - 1):
        for i in range(seg):
            bm.faces.new((rows[j][i], rows[j][(i + 1) % seg], rows[j + 1][(i + 1) % seg], rows[j + 1][i]))
    for i in range(seg):
        bm.faces.new((bot, rows[0][(i + 1) % seg], rows[0][i]))
        bm.faces.new((top, rows[-1][i], rows[-1][(i + 1) % seg]))
    if flat_bottom is not None:
        zc = -C + size[2] * flat_bottom
        for vv in bm.verts:
            if vv.co.z < zc:
                vv.co.z = zc
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('sup', bm, m)
    for p in o.data.polygons:
        p.use_smooth = True
    o.rotation_euler = rot
    o.location = loc
    return o


def lock(base, direction, length, r, m, bend=(0, 0, 0), n=5, seg=7):
    """Mecha de cabelo (ou folha grossa): gota que sai de `base` na `direction`, afinando até a
    ponta e curvando para `bend`."""
    d = Vector(direction).normalized()
    b = Vector(bend)
    pts, radii = [], []
    for i in range(n + 1):
        t = i / n
        pts.append(tuple(Vector(base) + d * length * t + b * t * t))
        radii.append(max(0.004, r * (1 - t) ** 0.9 * (0.75 + 0.25 * math.sin(math.pi * min(1, t * 2.2)))))
    return tube(pts, radii, m, seg=seg)


def importar_referencia(nome):
    """Lê `referencias/<nome>.glb` (o projeto do Molda devolvido pela autora) e devolve as malhas
    com a transformação do mundo já aplicada, sem os grupos. É a FORMA que a peça segue."""
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ILHA_DIR, 'referencias', f'{nome}.glb'))
    novos = [o for o in bpy.data.objects if o not in antes]
    bpy.context.view_layer.update()
    malhas = []
    for o in novos:
        if o.type != 'MESH':
            continue
        M = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(M)
        # O Molda exporta cada triângulo com vértices próprios: soldar devolve as quinas (sem
        # elas o chanfro não acha aresta nenhuma) e junta os triângulos da mesma face.
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        bmesh.ops.dissolve_limit(bm, angle_limit=R(1), verts=bm.verts, edges=bm.edges)
        bm.to_mesh(o.data)
        bm.free()
        malhas.append(o)
    for o in novos:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    return malhas


def mat_gradiente(nome, cor, alfas, emissao=None, forca=0.0, culling=True):
    """Material translúcido com o alfa em degradê ao longo do V da textura (0 = início da peça,
    1 = ponta), como a luz do farol da referência do Molda: forte junto ao vidro e sumindo na ponta.
    `culling` deixa só a face de fora (sem dobrar a transparência com o lado de dentro)."""
    if nome in lib_q._MATS:
        return lib_q._MATS[nome]
    n = 64
    img = bpy.data.images.new(nome, width=4, height=n, alpha=True)
    rgb = srgb_px(cor)
    px = []
    for j in range(n):
        t = j / (n - 1)
        # Interpola os alfas pedidos (lista de valores igualmente espaçados).
        k = t * (len(alfas) - 1)
        i = min(int(k), len(alfas) - 2)
        a = alfas[i] + (alfas[i + 1] - alfas[i]) * (k - i)
        px += [*rgb, a] * 4
    img.pixels[:] = px
    img.pack()
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Linear'
    # Sem repetir: a ponta (alfa ~0) não pode misturar com o começo (alfa forte) na borda.
    tex.extension = 'EXTEND'
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    nt.links.new(tex.outputs['Alpha'], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 0.6
    if emissao:
        b.inputs['Emission Color'].default_value = (*srgb(emissao), 1)
        b.inputs['Emission Strength'].default_value = forca
    m.surface_render_method = 'BLENDED'
    m.use_backface_culling = culling
    lib_q._MATS[nome] = m
    return m


def srgb_px(h):
    """Cor para os pixels da imagem do Blender (linear, como ela guarda)."""
    return srgb(h)


def tubo_aberto(r0, r1, L, m, seg=24, anel=6, eixo='X', sentido=1):
    """Tronco de cone ABERTO (sem tampas) que sai da origem ao longo de `eixo`, de raio r0 a r1,
    com UV: U em volta e V do começo (0) à ponta (1). Para os feixes e o vidro aceso."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    rings = []
    for j in range(anel + 1):
        t = j / anel
        r = r0 + (r1 - r0) * t
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            c1, c2 = r * math.cos(a), r * math.sin(a)
            d = sentido * L * t
            ring.append(bm.verts.new((d, c1, c2) if eixo == 'X' else (c1, c2, d)))
        rings.append(ring)
    for j in range(anel):
        for i in range(seg):
            i2 = (i + 1) % seg
            f = bm.faces.new((rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]))
            for loop, (uu, vv) in zip(f.loops, ((i / seg, j / anel), ((i + 1) / seg, j / anel),
                                                 ((i + 1) / seg, (j + 1) / anel), (i / seg, (j + 1) / anel))):
                loop[uv].uv = (uu, vv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # Normais para FORA (o lado que fica à vista com o culling).
    for f in bm.faces:
        c = f.calc_center_median()
        radial = Vector((0, c.y, c.z)) if eixo == 'X' else Vector((c.x, c.y, 0))
        if f.normal.dot(radial) < 0:
            f.normal_flip()
    me = bpy.data.meshes.new('tubo')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('tubo', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def clipes(objs_chaves, fps=24):
    """Grava as animações como faixas do NLA com o NOME do clipe: o exportador junta as faixas de
    mesmo nome de todos os objetos numa animação só do glTF (o nome que o bloco "tocar a animação"
    usa). `objs_chaves` = {clipe: {objeto: {'scale' | 'rotation_euler': [(quadro, valor), ...]}}}."""
    sc = bpy.context.scene
    sc.render.fps = fps
    for clipe, por_obj in objs_chaves.items():
        for o, props in por_obj.items():
            o.animation_data_create()
            act = bpy.data.actions.new(f'{clipe}-{o.name}')
            o.animation_data.action = act
            fim = 0
            for prop, chaves in props.items():
                if prop.startswith('_'):
                    continue
                for quadro, valor in chaves:
                    setattr(o, prop, valor)
                    o.keyframe_insert(data_path=prop, frame=quadro)
                    fim = max(fim, quadro)
            if props.get('_linear'):
                for fc in _fcurves(act):
                    for kp in fc.keyframe_points:
                        kp.interpolation = 'LINEAR'
            o.animation_data.action = None
            trilha = o.animation_data.nla_tracks.new()
            trilha.name = clipe
            trilha.strips.new(clipe, 0, act)
    return sc


def _fcurves(act):
    """As curvas de uma ação (no Blender 5 elas moram nas camadas/canais da ação em camadas)."""
    if hasattr(act, 'fcurves') and act.fcurves:
        return list(act.fcurves)
    out = []
    for layer in getattr(act, 'layers', []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out


def repouso_no_glb(path, escalas):
    """Grava a pose de REPOUSO (a do modelo parado, antes de qualquer animação) nos nós do GLB.

    Com faixas do NLA o exportador do glTF avalia o quadro inicial e grava a pose animada como
    repouso; aqui ela volta a ser a de verdade. `escalas` = {nome do nó: (x, y, z)} já no y para
    cima do glTF. Rotação de repouso: nenhuma."""
    import json, struct
    with open(path, 'rb') as f:
        dados = f.read()
    n = struct.unpack('<I', dados[12:16])[0]
    doc = json.loads(dados[20:20 + n])
    resto = dados[20 + n:]
    vistos = set()
    for no in doc['nodes']:
        if no.get('name') in escalas:
            no['scale'] = list(escalas[no['name']])
            no.pop('rotation', None)
            vistos.add(no['name'])
    falta = set(escalas) - vistos
    if falta:
        raise RuntimeError(f'nós ausentes no GLB: {sorted(falta)}')
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + len(resto)
    with open(path, 'wb') as f:
        f.write(dados[:8] + struct.pack('<I', total) + struct.pack('<I', len(js)) + b'JSON' + js + resto)
