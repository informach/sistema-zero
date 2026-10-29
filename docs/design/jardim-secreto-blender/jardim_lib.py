"""Ajudantes do Jardim Secreto no Blender (sem tela, `bpy` do PyPI).

Usa os ajudantes da Ilha do Farol (`../ilha-do-farol-blender/lib_ilha.py`: folha, pedra
lapidada, superelipsoide, clipes do NLA, exportação) e acrescenta o que o jardim pede: cor nos
vértices (o chão, as moitas e as árvores levam o degradê de luz na própria malha), moitas em
tufos, florzinhas e ruído suave.

Convenções do Jogo 3D, as mesmas da Ilha: no Blender z é para cima e a FRENTE olha para -Y; o
exportador converte para o y para cima do three.js e a frente vira +Z, o lado da câmera do curso.
`g(x, z)` traduz um ponto do chão do jogo para o chão do Blender (x, -z).
"""
import os, sys, math, random

HERE = os.path.dirname(os.path.abspath(__file__))
# A pasta de saída da Ilha é lida pelo lib_ilha na importação: vale a do jardim.
os.environ['ILHA_OUT'] = os.environ.get('JARDIM_OUT', os.path.join(HERE, 'out'))
# No FIM da busca: a Ilha também tem um cenario.py e um objetos.py.
sys.path.append(os.path.join(HERE, '../ilha-do-farol-blender'))
from lib_ilha import *  # noqa: E402,F401,F403
import lib_q  # noqa: E402

JARDIM_DIR = HERE

# Cores tiradas do desenho 2D do jardim (`../jardim-secreto/gerar-artes.ts`) e do Cadê Todo
# Mundo; os tons de luz e sombra são os mesmos de cada cor, mais claros ou mais escuros.
lib_q.PALETTE.update({
    # flores do canteiro e da grama (as três cores do 2D, o miolo e o caule)
    'j/rosa': ('#ef9b9f', 0.7, None, 0),
    'j/amarela': ('#ffd272', 0.7, None, 0),
    'j/lilas': ('#d7b7e7', 0.7, None, 0),
    'j/branca': ('#fff6ea', 0.7, None, 0),
    'j/miolo': ('#fff0a5', 0.6, None, 0),
    'j/mioloLaranja': ('#f5b94e', 0.6, None, 0),
    'j/caule': ('#3b7453', 0.8, None, 0),
    'j/folhaTulipa': ('#4f9a5c', 0.8, None, 0),
    'j/tulipa': ('#ef8c63', 0.65, None, 0),
    'j/tulipaClara': ('#f7b98f', 0.65, None, 0),
    'j/tulipaRosa': ('#e8778a', 0.65, None, 0),
    # cogumelo e toco (os do Cadê)
    'j/chapeu': ('#c8475a', 0.55, None, 0),
    'j/chapeuEscuro': ('#a8384c', 0.55, None, 0),
    'j/pinta': ('#fff4e6', 0.6, None, 0),
    'j/pe': ('#f1e2c6', 0.8, None, 0),
    'j/tocoTopo': ('#e2b57c', 0.85, None, 0),
    'j/tocoAnel': ('#b98552', 0.85, None, 0),
    # pedras (azul acinzentado do Cadê, com tampo mais claro)
    'j/pedra': ('#7d90a6', 0.9, None, 0),
    'j/pedraClara': ('#93a7bb', 0.9, None, 0),
    'j/pedraTopo': ('#b2c3d2', 0.85, None, 0),
    'j/pedraEscura': ('#64778d', 0.9, None, 0),
    'j/musgo': ('#6fa865', 0.9, None, 0),
    # cerca, arco e portão
    'j/cerca': ('#f3ecdc', 0.85, None, 0),
    'j/cercaSombra': ('#ddd2bb', 0.85, None, 0),
    'j/portao': ('#5f9c8f', 0.7, None, 0),
    'j/portaoEscuro': ('#4a8174', 0.7, None, 0),
    'j/ferro': ('#3f4a5c', 0.5, None, 0),
    # regador (os azuis do 2D)
    'j/regadorClaro': ('#9ad9e2', 0.35, None, 0),
    'j/regadorEscuro': ('#2d7e98', 0.4, None, 0),
    'j/regadorMiolo': ('#1d5568', 0.6, None, 0),
    'j/regadorFuro': ('#1f5f73', 0.6, None, 0),
    'j/regadorFaixa': ('#c4ecef', 0.4, None, 0),
    # flor da missão (os rosas do 2D)
    'j/sepala': ('#5c9d60', 0.8, None, 0),
    'j/brilho': ('#fff3b0', 0.4, '#ffe58a', 2.2),
})


def hexlin(h):
    """Cor do hexadecimal no espaço linear (o que a cor de vértice guarda)."""
    return lib_q.srgb(h)


def suave(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mistura(c0, c1, t):
    t = min(1.0, max(0.0, t))
    return tuple(a + (b - a) * t for a, b in zip(c0, c1))


def ruido(seed, escala):
    """Ruído suave e determinístico (value noise em grade) em [0, 1]."""
    rnd = random.Random(seed)
    tab = {}

    def v(i, j):
        if (i, j) not in tab:
            tab[(i, j)] = rnd.random()
        return tab[(i, j)]

    def f(x, z):
        x, z = x / escala, z / escala
        i, j = math.floor(x), math.floor(z)
        fx, fz = x - i, z - j
        sx, sz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
        a = v(i, j) + (v(i + 1, j) - v(i, j)) * sx
        b = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * sx
        return a + (b - a) * sz
    return f


def mat_vc(nome, rug=0.88, sem_sombra=False, dupla=False):
    """Material cuja cor vem dos vértices (camada `Col`). `sem_sombra` põe `szSemSombra` nos
    extras (o Jogo 3D não deixa o chão fazer sombra nele mesmo); `dupla` desenha os dois lados
    (pétalas e folhas finas)."""
    if nome in lib_q._MATS:
        return lib_q._MATS[nome]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rug
    if sem_sombra:
        m['szSemSombra'] = True
    # O publicador mantém a cor dos vértices só nos materiais que a usam.
    m['szCorDosVertices'] = True
    m.use_backface_culling = not dupla
    lib_q._MATS[nome] = m
    return m


def obj_de(nome, bm, material, liso=True):
    """Objeto novo com a malha do bmesh e o material (objeto do Blender, não chave da paleta)."""
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = liso
    return o


def pintar(o, fn):
    """Cor de cada canto da malha: `fn(ponto do mundo, normal do mundo)` -> cor linear (r, g, b)."""
    bpy.context.view_layer.update()
    me = o.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    at = me.color_attributes['Col']
    M = o.matrix_world
    N = M.to_3x3()
    # A normal do VÉRTICE (não a da face): o mesmo vértice sai com a mesma cor em todas as faces,
    # e o exportador não precisa duplicá-lo (a folhagem caía de ~34 mil para ~14 mil vértices).
    cache = {}
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            if vi not in cache:
                v = me.vertices[vi]
                cache[vi] = fn(M @ v.co, (N @ v.normal).normalized())
            at.data[li].color = (*cache[vi], 1.0)
    return o


def bolota(bm, centro, raio, escala, seed, amp=0.07, sub=2, recorte=0.05, nrec=14, pot=8):
    """Tufo de folhagem: icosfera com calombos largos (a forma) e recortes miúdos (os grupos de
    folhas na borda), determinística pela semente. Vértices já no mundo."""
    rnd = random.Random(seed)
    ret = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    largos = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.4, 1))).normalized(),
               rnd.uniform(-amp, amp)) for _ in range(7)]
    miudos = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.2, 1))).normalized(),
               rnd.uniform(0.3, 1.0) * recorte) for _ in range(nrec)]
    for v in ret['verts']:
        d = v.co.normalized()
        k = 1 + sum(a * max(0.0, d.dot(u)) ** 2 for u, a in largos)
        k += sum(a * max(0.0, d.dot(u)) ** pot for u, a in miudos)
        v.co = Vector((centro[0] + d.x * k * raio * escala[0],
                       centro[1] + d.y * k * raio * escala[1],
                       centro[2] + d.z * k * raio * escala[2]))
    return ret['verts']


def florzinha(bm, centro, normal, raio, petalas=5, giro=0.0, copa=0.25, res=4):
    """Flor miúda de cinco pétalas arredondadas (contorno em lóbulos), levemente em concha, virada
    para `normal`. Devolve (faces das pétalas, faces do miolo) para o material de cada parte."""
    nz = Vector(normal).normalized()
    ref = Vector((0, 0, 1)) if abs(nz.z) < 0.9 else Vector((1, 0, 0))
    ax = nz.cross(ref).normalized()
    ay = nz.cross(ax).normalized()
    c = Vector(centro)
    n = petalas * res
    borda = []
    for i in range(n):
        a = giro + 2 * math.pi * i / n
        lob = 0.55 + 0.45 * abs(math.cos(petalas * a / 2)) ** 0.6
        r = raio * lob
        borda.append(bm.verts.new(c + (ax * math.cos(a) + ay * math.sin(a)) * r + nz * (copa * r * lob)))
    meio = bm.verts.new(c + nz * raio * 0.08)
    pet = [bm.faces.new((meio, borda[i], borda[(i + 1) % n])) for i in range(n)]
    m0 = [bm.verts.new(c + nz * raio * 0.22 + (ax * math.cos(2 * math.pi * i / 6) + ay * math.sin(2 * math.pi * i / 6)) * raio * 0.3)
          for i in range(6)]
    topo = bm.verts.new(c + nz * raio * 0.34)
    mio = [bm.faces.new((topo, m0[i], m0[(i + 1) % 6])) for i in range(6)]
    return pet, mio


def trocar_mat(o, material):
    """Troca o material de um objeto feito com uma chave da paleta (tube, leaf) por outro."""
    o.data.materials.clear()
    o.data.materials.append(material)
    return o


def curva(pts, por_trecho=6):
    """Catmull-Rom 3D pelos pontos: devolve pontos suaves (alças, caule, bico)."""
    P = [Vector(pts[0])] + [Vector(p) for p in pts] + [Vector(pts[-1])]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(por_trecho):
            t = k / por_trecho
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)))
    out.append(tuple(P[-2]))
    return out


def raios_ao_longo(raios, n):
    """Interpola a lista de raios (um por ponto de controle) para `n` pontos da curva."""
    out = []
    for i in range(n):
        t = i / (n - 1) * (len(raios) - 1)
        k = min(int(t), len(raios) - 2)
        out.append(raios[k] + (raios[k + 1] - raios[k]) * (t - k))
    return out


def tubo(points, radii, m, seg=12, cap=True):
    """Tubo pela curva com o anel transportado de um ponto ao outro (sem torcer nas curvas, ao
    contrário do `tube` do quarto, que troca o vetor de cima quando o tubo fica em pé)."""
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    n = len(pts)
    tan = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    ref = Vector((0, 0, 1)) if abs(tan[0].z) < 0.9 else Vector((1, 0, 0))
    a = tan[0].cross(ref).normalized()
    rings = []
    for i in range(n):
        if i:
            q = tan[i - 1].rotation_difference(tan[i])
            a = (q @ a).normalized()
        b = tan[i].cross(a).normalized()
        rings.append([bm.verts.new(pts[i] + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * radii[i])
                      for k in range(seg)])
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_de('tubo', bm, m if not isinstance(m, str) else mat(m))


def tubo_suave(pts, raios, m, seg=12, por_trecho=6, cap=True):
    c = curva(pts, por_trecho)
    return tubo(c, raios_ao_longo(raios, len(c)), m, seg=seg, cap=cap)


def _cor_base(m):
    """Cor do material (linear), a do Principled BSDF."""
    b = m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
    if not b:
        return (0.8, 0.8, 0.8)
    return tuple(b.inputs['Base Color'].default_value[:3])


def _usa_vertices(m):
    return bool(m and m.get('szCorDosVertices'))


def assar_cores(objs, destino, manter=()):
    """Passa a cor de cada material para a cor dos vértices (camada `Col`) e troca todos pelo
    material `destino`, que lê os vértices. Material que já lê os vértices guarda a cor que tem;
    os de `manter` (o brilho, que tem emissão) ficam como estão.

    É o que os jogos fazem com cenários de cores chapadas: um material só, um programa de
    desenho só. Sem software de vídeo (o executor dos objetivos), cada material novo custa a
    compilação de um programa no primeiro quadro, e com ~30 materiais o jogo ficava parado
    segundos depois de abrir."""
    bpy.context.view_layer.update()
    for o in objs:
        if o.type != 'MESH':
            continue
        me = o.data
        mats = list(me.materials)
        if not mats or all(m in manter for m in mats):
            continue
        if 'Col' not in me.color_attributes:
            at = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
            for d in at.data:
                d.color = (1, 1, 1, 1)
        at = me.color_attributes['Col']
        novo = list(dict.fromkeys([destino] + [m for m in mats if m in manter]))
        for poly in me.polygons:
            m = mats[poly.material_index] if poly.material_index < len(mats) else None
            if m in manter:
                continue
            if not _usa_vertices(m):
                c = _cor_base(m)
                for li in poly.loop_indices:
                    at.data[li].color = (*c, 1.0)
        idx = [novo.index(m) if m in manter else 0 for m in mats]
        for poly in me.polygons:
            poly.material_index = idx[poly.material_index] if poly.material_index < len(idx) else 0
        me.materials.clear()
        for m in novo:
            me.materials.append(m)
