"""Ajudantes das artes espaciais do Construtor (Blender sem tela, `bpy` do PyPI).

As peças da Patrulha Espacial (3D) e da Nave Contra Asteroides (2D, pelo `svg2d.py`) nascem
daqui: naves, asteroides, lasers e cenários, cada categoria com quatro variações que a criança
escolhe no bloco "Criar o objeto … com o modelo …".

Convenções (as do Jogo 3D):
- No Blender, z é para cima e o BICO da nave aponta para +Y. O exportador de glTF converte para o
  y para cima do three.js, e +Y do Blender vira -Z: a nave olha para longe da câmera da Patrulha,
  que fica atrás dela em (0, 8, 12) e mira (0, 1, -12).
- Um ponto do jogo (x, y, z) fica em (x, -z, y) no Blender (`jogo(x, y, z)`).
- Cada categoria tem uma CAIXA comum (`CAIXAS`). Toda peça leva dois marcos de 1 mm nos cantos
  dessa caixa: a caixa que o jogo mede sai igual nas quatro variações, e trocar a variação no
  bloco não muda tamanho, centro nem área de toque (o mesmo contrato da Ilha do Farol).
- A luz do Jogo 3D é forte e quase sem contraste (ambiente 2,1 + sol 1,7, sem tone mapping): a
  frente sai com 99% da cor e a sombra com 83%. O desenho vem da COR dos materiais e da silhueta,
  não do sombreamento. Nada metálico (sem mapa de ambiente, metal fica preto), brilho por
  `emissão` nos motores, lasers, cristais e lava.
- Os cenários são materiais SEM LUZ (`KHR_materials_unlit`) pintados por vértice: a cor que sai é a
  pintada, qualquer que seja a luz da cena. Levam `szSemCaixa` (fora da área de toque),
  `szSemSombra` e `szSemNevoa` (a névoa da Patrulha esconde quem nasce longe, não o céu).
"""
import math
import os
import random

import bpy  # noqa: I001  (o bmesh só existe depois do bpy)
import bmesh
from mathutils import Matrix, Vector, noise

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('ESPACO_OUT', os.path.join(HERE, 'out'))
R = math.radians

# ---------------------------------------------------------------------------------------------
# Caixas das categorias, no referencial do Blender (x, y = frente, z = cima).
# Nave: envergadura 3 (o `tamanho 3` do bloco é o lado maior), comprimento 2,3. O tiro nasce em
# z = -1,6 do jogo, logo à frente do bico (y = 1,15 aqui).
# Asteroide: o cubo de 1,8 do meteoro esférico do exemplo da galeria.
# Laser: 0,9 de comprimento (o `tamanho 0,9`), deitado no eixo do voo.
# Cenário: uma cúpula de raio 88 em volta da cena, na caixa de 180 (o motor aceita até 200).
# ---------------------------------------------------------------------------------------------
CAIXAS = {
    'nave': ((-1.5, -1.15, -0.34), (1.5, 1.15, 0.46)),
    'asteroide': ((-0.9, -0.9, -0.9), (0.9, 0.9, 0.9)),
    'laser': ((-0.14, -0.45, -0.14), (0.14, 0.45, 0.14)),
    'cenario': ((-90.0, -90.0, -90.0), (90.0, 90.0, 90.0)),
}
TAMANHO_NO_BLOCO = {'nave': 3, 'asteroide': 1.8, 'laser': 0.9, 'cenario': 180}

# ---------------------------------------------------------------------------------------------
# Materiais: (cor, rugosidade, emissão, força, alfa). Os nomes descrevem o papel na peça.
# ---------------------------------------------------------------------------------------------
PALETA = {}
_MATS = {}


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def cor(nome, base, rough=0.55, emit=None, forca=0.0, alfa=1.0, sem_sombra=False):
    """Declara um material da paleta (pode ser chamado de novo para trocar)."""
    PALETA[nome] = (base, rough, emit, forca, alfa, sem_sombra)
    _MATS.pop(nome, None)


def mat(nome):
    if nome in _MATS:
        return _MATS[nome]
    base, rough, emit, forca, alfa, sem_sombra = PALETA[nome]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(base), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = 0.0
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = forca
    if alfa < 1:
        b.inputs['Alpha'].default_value = alfa
        m.surface_render_method = 'BLENDED'
    if sem_sombra or alfa < 1:
        m['szSemSombra'] = True
    _MATS[nome] = m
    return m


def mat_sem_luz(nome, atributo='Cor'):
    """Material sem luz (glTF KHR_materials_unlit) com a cor pintada por vértice."""
    chave = f'unlit:{nome}'
    if chave in _MATS:
        return _MATS[chave]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = atributo
    bg = nt.nodes.new('ShaderNodeBackground')
    nt.links.new(attr.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    m['szSemSombra'] = True
    m['szSemNevoa'] = True
    _MATS[chave] = m
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()


# ---------------------------------------------------------------------------------------------
# Malhas
# ---------------------------------------------------------------------------------------------
def _obj(nome, bm, m):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nome, me)
    bpy.context.collection.objects.link(o)
    if m is not None:
        o.data.materials.append(m if isinstance(m, bpy.types.Material) else mat(m))
    return o


def _apply(o, mod):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)


def flat(o):
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def smooth(o, angulo=None):
    for p in o.data.polygons:
        p.use_smooth = True
    if angulo is not None:
        o.data.set_sharp_from_angle(angle=R(angulo))
    return o


def chanfro(o, largura, segs=2, angulo=35):
    b = o.modifiers.new('bv', 'BEVEL')
    b.width = largura
    b.segments = segs
    b.limit_method = 'ANGLE'
    b.angle_limit = R(angulo)
    _apply(o, b)
    return o


def subdividir(o, niveis=1):
    s = o.modifiers.new('sd', 'SUBSURF')
    s.levels = niveis
    s.render_levels = niveis
    _apply(o, s)
    return o


def box(size, loc, m, bevel=0.02, segs=2, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    o = _obj('box', bm, m)
    if bevel > 0:
        b = o.modifiers.new('bv', 'BEVEL')
        b.width = min(bevel, min(size) * 0.45)
        b.segments = segs
        b.limit_method = 'NONE'
        _apply(o, b)
    smooth(o, 40)
    o.rotation_euler = rot
    o.location = loc
    return o


def cyl(r, h, loc, m, verts=16, rot=(0, 0, 0), r2=None, bevel=0.0):
    """Cilindro (ou tronco de cone) com o eixo em z, centrado em `loc`."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r,
                          radius2=r if r2 is None else r2, depth=h)
    o = _obj('cyl', bm, m)
    if bevel > 0:
        chanfro(o, bevel, 2, 40)
    smooth(o, 40)
    o.rotation_euler = rot
    o.location = loc
    return o


def cyl_y(r, comp, centro, m, verts=16, r2=None, bevel=0.0):
    """Cilindro deitado no eixo da nave (y). `r` fica atrás, `r2` na frente."""
    return cyl(r, comp, centro, m, verts=verts, rot=(R(-90), 0, 0), r2=r2, bevel=bevel)


def sphere(r, loc, m, scale=(1, 1, 1), subdiv=2, liso=True):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
    o = _obj('sphere', bm, m)
    smooth(o) if liso else flat(o)
    o.location = loc
    return o


def uvball(r, loc, m, scale=(1, 1, 1), seg=24, ring=12, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2]))
    o = _obj('ball', bm, m)
    smooth(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def torus(R_, r, loc, m, seg=24, rseg=8, rot=(0, 0, 0)):
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        u = 2 * math.pi * i / seg
        ring = []
        for k in range(rseg):
            w = 2 * math.pi * k / rseg
            ring.append(bm.verts.new(((R_ + r * math.cos(w)) * math.cos(u),
                                      (R_ + r * math.cos(w)) * math.sin(u), r * math.sin(w))))
        rings.append(ring)
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for k in range(rseg):
            bm.faces.new((a[k], b[k], b[(k + 1) % rseg], a[(k + 1) % rseg]))
    o = _obj('torus', bm, m)
    smooth(o)
    o.rotation_euler = rot
    o.location = loc
    return o


def tube(pontos, raios, m, seg=10, tampa=True):
    bm = bmesh.new()
    rings = []
    n = len(pontos)
    for i, p in enumerate(pontos):
        p = Vector(p)
        d = (Vector(pontos[min(i + 1, n - 1)]) - Vector(pontos[max(i - 1, 0)])).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        a = d.cross(up).normalized()
        b = d.cross(a).normalized()
        rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * raios[i])
                      for k in range(seg)])
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if tampa:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(_obj('tube', bm, m))


def superellipsoid(size, loc, m, e1=0.5, e2=0.5, seg=20, ring=12, rot=(0, 0, 0), meia=False):
    """Superelipsoide (de cápsula a cubo arredondado). `meia` = só a metade de cima (z >= 0)."""
    sx, sy, sz = size

    def sgnpow(v, p):
        return math.copysign(abs(v) ** p, v)
    bm = bmesh.new()
    n0 = ring // 2 if meia else 0
    rows = []
    for i in range(n0, ring + 1):
        phi = -math.pi / 2 + math.pi * i / ring
        row = []
        for j in range(seg):
            th = -math.pi + 2 * math.pi * j / seg
            cp, sp = math.cos(phi), math.sin(phi)
            x = sx / 2 * sgnpow(cp, e1) * sgnpow(math.cos(th), e2)
            y = sy / 2 * sgnpow(cp, e1) * sgnpow(math.sin(th), e2)
            z = sz / 2 * sgnpow(sp, e1)
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for i in range(len(rows) - 1):
        for j in range(seg):
            a, b = rows[i][j], rows[i][(j + 1) % seg]
            c, d = rows[i + 1][(j + 1) % seg], rows[i + 1][j]
            try:
                bm.faces.new((a, b, c, d))
            except ValueError:
                pass
    if meia:
        bm.faces.new(list(reversed(rows[0])))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('superelipsoide', bm, m)
    smooth(o, 50)
    o.rotation_euler = rot
    o.location = loc
    return o


def anel(r, n=16, ex=2.5, cz=0.0, achatar_baixo=1.0):
    """Seção de uma fuselagem: superelipse no plano xz, com metade de baixo mais achatada."""
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        c, s = math.cos(t), math.sin(t)
        x = r[0] * math.copysign(abs(c) ** (2 / ex), c)
        z = r[1] * math.copysign(abs(s) ** (2 / ex), s)
        if z < 0:
            z *= achatar_baixo
        pts.append((x, z + cz))
    return pts


def loft(secoes, m, n=16, ex=2.5, achatar_baixo=1.0, tampas=True):
    """Fuselagem por seções: lista de (y, meia_largura, meia_altura, centro_z), de trás para a
    frente. Seção com largura ~0 vira ponta."""
    bm = bmesh.new()
    rings = []
    for y, w, h, cz in secoes:
        rings.append([bm.verts.new((x, y, z)) for x, z in anel((max(w, 1e-4), max(h, 1e-4)), n, ex, cz, achatar_baixo)])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n):
            bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if tampas:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('fuselagem', bm, m)
    return smooth(o, 38)


def placa(contorno, z0, z1, m, bevel=0.0, segs=2, afinar=None):
    """Placa recortada no plano xy (asas, aletas), de z0 a z1. `afinar(x, y) -> fator` encolhe a
    espessura em volta do meio (asa mais fina na ponta)."""
    bm = bmesh.new()
    base = [bm.verts.new((x, y, z0)) for x, y in contorno]
    f = bm.faces.new(base)
    f.normal_update()
    if f.normal.z > 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    topo = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    for v in topo:
        v.co.z = z1
    if afinar:
        meio = (z0 + z1) / 2
        for v in bm.verts:
            k = afinar(v.co.x, v.co.y)
            v.co.z = meio + (v.co.z - meio) * k
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('placa', bm, m)
    if bevel > 0:
        chanfro(o, bevel, segs, 30)
    return smooth(o, 35)


def asa(raiz_ba, raiz_bf, ponta_ba, ponta_bf, z0, z1, faixas, afinar_ponta=0.55, bevel=0.012):
    """Asa direita (x > 0) em faixas de cor. `raiz_ba`/`raiz_bf` = bordo de ataque e de fuga na
    raiz (x, y); `ponta_*` na ponta. Cada faixa = (s0, s1, c0, c1, material), com s de 0 (raiz)
    a 1 (ponta) e c de 0 (bordo de ataque) a 1 (bordo de fuga). As faixas se encostam e têm a
    mesma espessura em cada ponto, então a asa parece uma peça pintada."""
    ra, rf, pa, pf = (Vector((*p, 0)) for p in (raiz_ba, raiz_bf, ponta_ba, ponta_bf))
    x_raiz, x_ponta = ra.x, pa.x

    def ponto(s, c):
        ba = ra.lerp(pa, s)
        bf = rf.lerp(pf, s)
        p = ba.lerp(bf, c)
        return (p.x, p.y)

    def fator(x, y):
        s = 0 if x_ponta == x_raiz else max(0.0, min(1.0, (x - x_raiz) / (x_ponta - x_raiz)))
        return 1 - afinar_ponta * s
    pecas = []
    for s0, s1, c0, c1, m in faixas:
        contorno = [ponto(s0, c0), ponto(s1, c0), ponto(s1, c1), ponto(s0, c1)]
        pecas.append(placa(contorno, z0, z1, m, bevel=bevel, afinar=fator))
    return pecas


def placa_vertical(contorno_yz, x0, x1, m, bevel=0.0):
    """Placa no plano yz (deriva, leme), de x0 a x1."""
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in contorno_yz]
    b = [bm.verts.new((x1, y, z)) for y, z in contorno_yz]
    n = len(contorno_yz)
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('deriva', bm, m)
    if bevel > 0:
        chanfro(o, bevel, 2, 30)
    return smooth(o, 35)


def reamostrar(fileiras, n):
    """Interpola as fileiras (y, ...) em `n` fileiras igualmente espaçadas em y."""
    ys = [f[0] for f in fileiras]
    out = []
    for i in range(n):
        y = ys[0] + (ys[-1] - ys[0]) * i / (n - 1)
        j = max(k for k in range(len(ys) - 1) if ys[k] <= y + 1e-9) if y < ys[-1] else len(ys) - 2
        a, b = fileiras[j], fileiras[j + 1]
        t = (y - a[0]) / (b[0] - a[0])
        out.append(tuple([y] + [a[k] + (b[k] - a[k]) * t for k in range(1, len(a))]))
    return out


def corpo_lente(fileiras, m, colunas=14, perfil=0.55, linhas=None):
    """Corpo em forma de lente (asa voadora, raia): `fileiras` = (y, meia_envergadura,
    espessura_no_meio, centro_z), de trás para a frente. A espessura cai do meio para a borda
    como (1 - (x/s)^2)^perfil; em cima 60%, embaixo 40%."""
    if linhas:
        fileiras = reamostrar(fileiras, linhas)
    bm = bmesh.new()
    topo, baixo = [], []
    for y, s, t, cz in fileiras:
        rt, rb = [], []
        for j in range(colunas + 1):
            u = -1 + 2 * j / colunas
            x = u * s
            k = max(0.0, 1 - u * u) ** perfil
            rt.append(bm.verts.new((x, y, cz + 0.6 * t * k)))
            rb.append(bm.verts.new((x, y, cz - 0.4 * t * k)))
        topo.append(rt)
        baixo.append(rb)
    nf = len(fileiras)
    for i in range(nf - 1):
        for j in range(colunas):
            bm.faces.new((topo[i][j], topo[i][j + 1], topo[i + 1][j + 1], topo[i + 1][j]))
            bm.faces.new((baixo[i][j], baixo[i + 1][j], baixo[i + 1][j + 1], baixo[i][j + 1]))
    # bordas laterais e as pontas da frente e de trás
    for i in range(nf - 1):
        for j in (0, colunas):
            bm.faces.new((topo[i][j], topo[i + 1][j], baixo[i + 1][j], baixo[i][j]))
    for i in (0, nf - 1):
        for j in range(colunas):
            bm.faces.new((topo[i][j], baixo[i][j], baixo[i][j + 1], topo[i][j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _obj('lente', bm, m)
    return smooth(o, 40)


def rocha(raio, m, semente=0, subdiv=3, aspereza=0.22, escala_ruido=1.4, achatar=(1, 1, 1)):
    """Pedra por icosfera deslocada com ruído (facetas de low-poly, sombreamento chapado)."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1)
    off = Vector((semente * 13.1, semente * 7.7, semente * 3.3))
    for v in bm.verts:
        d = v.co.normalized()
        n = noise.fractal(d * escala_ruido + off, 0.6, 2.0, 4)
        r = raio * (1 + aspereza * n)
        v.co = Vector((d.x * r * achatar[0], d.y * r * achatar[1], d.z * r * achatar[2]))
    o = _obj('rocha', bm, m)
    return flat(o)


def topo_de(o, x, y, de_cima=5.0):
    """Altura da superfície de cima do objeto no ponto (x, y) (raio de cima para baixo)."""
    bpy.context.view_layer.update()
    inv = o.matrix_world.inverted()
    ok, loc, _n, _i = o.ray_cast(inv @ Vector((x, y, de_cima)), (inv.to_3x3() @ Vector((0, 0, -1))).normalized())
    return (o.matrix_world @ loc).z if ok else None


def adicionar_material(o, nome):
    """Acrescenta um material ao objeto e devolve o índice dele."""
    m = nome if isinstance(nome, bpy.types.Material) else mat(nome)
    for i, x in enumerate(o.data.materials):
        if x == m:
            return i
    o.data.materials.append(m)
    return len(o.data.materials) - 1


def pintar_faces(o, nome, criterio):
    """Pinta com `nome` as faces em que `criterio(centro, normal)` é verdadeiro."""
    i = adicionar_material(o, nome)
    for p in o.data.polygons:
        if criterio(Vector(p.center), Vector(p.normal)):
            p.material_index = i
    return o


def espelhar_x(objs):
    out = []
    for o in objs:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        c.location.x = -o.location.x
        c.rotation_euler = (o.rotation_euler.x, -o.rotation_euler.y, -o.rotation_euler.z)
        c.scale = (-o.scale.x, o.scale.y, o.scale.z)
        out.append(c)
    # escala negativa: aplica e conserta as normais
    for c in out:
        bpy.ops.object.select_all(action='DESELECT')
        c.select_set(True)
        bpy.context.view_layer.objects.active = c
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bm = bmesh.new()
        bm.from_mesh(c.data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(c.data)
        bm.free()
    return objs + out


def juntar(objs, nome='peca'):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = nome
    o.data.name = nome
    return o


def jogo(x, y, z):
    """Ponto do jogo (y para cima, frente em -z) no Blender."""
    return Vector((x, -z, y))


# ---------------------------------------------------------------------------------------------
# Caixa da categoria e exportação
# ---------------------------------------------------------------------------------------------
def caixa_mundo(objs):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    return (Vector([min(p[i] for p in pts) for i in range(3)]),
            Vector([max(p[i] for p in pts) for i in range(3)]))


def caixa_da_categoria(o, categoria, pid):
    """Confere que a peça cabe na caixa da categoria e põe os dois marcos de 1 mm nos cantos."""
    mn, mx = (Vector(v) for v in CAIXAS[categoria])
    a, b = caixa_mundo([o])
    fora = [f'{"xyz"[i]} {a[i]:.3f}..{b[i]:.3f}' for i in range(3) if a[i] < mn[i] - 1e-4 or b[i] > mx[i] + 1e-4]
    if fora:
        raise RuntimeError(f'{pid} passa da caixa de {categoria}: {", ".join(fora)}')
    inv = o.matrix_world.inverted()
    bm = bmesh.new()
    bm.from_mesh(o.data)
    e = 1e-3
    for canto, s in ((mn, 1), (mx, -1)):
        vs = [bm.verts.new(inv @ (canto + d)) for d in (Vector((0, 0, 0)), Vector((s * e, 0, 0)), Vector((0, s * e, 0)))]
        bm.faces.new(vs)
    bm.to_mesh(o.data)
    bm.free()
    a, b = caixa_mundo([o])
    assert (a - mn).length < 1e-4 and (b - mx).length < 1e-4, (pid, a, b)
    return (list(a), list(b))


def triangulos(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def exportar(pid, objs, categoria, sem_caixa=False, normais=True):
    """Junta a peça numa malha, põe os marcos da caixa e grava `<OUT>/<pid>.glb`."""
    os.makedirs(OUT, exist_ok=True)
    o = juntar(objs, pid)
    caixa = caixa_da_categoria(o, categoria, pid)
    if sem_caixa:
        o['szSemCaixa'] = True
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    path = os.path.join(OUT, f'{pid}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=False, export_extras=True,
                              export_animations=False, export_normals=normais)
    info = {
        'pid': pid,
        'categoria': categoria,
        'triangulos': triangulos(o),
        'materiais': [m.name for m in o.data.materials],
        'bytes': os.path.getsize(path),
        'caixa': caixa,
    }
    print('EXPORTADO', pid, info['triangulos'], 'triângulos', len(info['materiais']), 'materiais',
          info['bytes'] // 1024, 'KB')
    return info


def semente(nome):
    random.seed(nome)
    return random.Random(nome)
