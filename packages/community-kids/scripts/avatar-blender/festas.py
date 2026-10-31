"""Roupas de festa (B16, 31/10/2026): uma peça de cabeça e uma de corpo por festa.

Carnaval: cartolinha (hat-08) e colete de franjas (top-07). Junina: chapéu de palha (hat-09) e
vestido de chita (outfit-07). Lanternas: tiara de lanterninhas (enfeite-06) e capa de estrelas
(top-08). Fim de ano: gorro (hat-10) e suéter de estrela (top-09).

Chapéus e a tiara ficam presos só ao osso da cabeça e são medidos contra os cabelos: o oco do
chapéu (e o arco da tiara) sai do tamanho dos próprios cabelos `hair-01` a `hair-18` e das
cabeças, para nenhum fio atravessar. Os cabelos de `FORA_*` não cabem num chapéu desse tamanho
(o rabo alto, o crespo...) e são conferidos por `conferir_festas.py` contra os chapéus que já
existem. Roupas nascem das peças do pacote e herdam os pesos delas (`herdar_pesos`).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
import numpy as np
import roupas
from enfeites import star

CABELOS = [f'hair-{i:02d}' for i in range(1, 19)]
CABECAS = [f'head-{i:02d}' for i in range(1, 7)]
C = Vector((0, -0.04, 1.70))  # centro da cabeça
TRONCO = {'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'LeftShoulder', 'RightShoulder'}

# Cabelos que nenhum chapéu desse tamanho cobre (ver o relatório de conferir_festas.py):
# 06 topete alto atrás, 08 pontas para os lados, 11 comprido jogado para trás, 13 rabo alto,
# 15 crespo volumoso. O coque (17) cabe na cartola e no gorro, não na palha.
FORA_CARTOLA = {'hair-06', 'hair-08', 'hair-13', 'hair-15'}
FORA_PALHA = {'hair-06', 'hair-08', 'hair-11', 'hair-13', 'hair-15'}
FORA_GORRO = {'hair-08', 'hair-11', 'hair-13', 'hair-15', 'hair-18'}
FORA_TIARA = {'hair-15'}


# ── ajudantes ───────────────────────────────────────────────────────────────────────────────
def pontos_de(ids):
    """Vértices (mundo, pose de descanso) de cada peça. Roda antes do `reset` da peça nova."""
    reset()
    out = {}
    for pid in ids:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=f'{BASE}/parts/{pid}.glb')
        new = [o for o in bpy.data.objects if o not in before]
        out[pid] = np.array([tuple(o.matrix_world @ v.co) for o in new
                             if o.type == 'MESH' and o.vertex_groups for v in o.data.vertices])
        for o in new:
            bpy.data.objects.remove(o)
    return out


def juntar_pontos(pts, fora=()):
    return np.concatenate([v for k, v in pts.items() if k not in fora])


def local(pontos, M):
    """Pontos no referencial do chapéu (M = posição e inclinação do chapéu)."""
    Mi = np.array(M.inverted())
    h = np.c_[pontos, np.ones(len(pontos))] @ Mi.T
    return h[:, :3]


def assentar(pontos, M, oco, z0=1.6, z1=2.9, folga=0.012):
    """Menor altura da base (no eixo do chapéu) para que nenhum ponto acima dela fique fora do oco.
    `oco(r, h)` diz, para arrays, se o ponto a raio r e altura h acima da base está no oco."""
    p = local(pontos, M)
    r = np.hypot(p[:, 0], p[:, 1])
    lo, hi = z0, z1
    for _ in range(32):
        mid = (lo + hi) / 2
        h = p[:, 2] - mid
        sel = h > -folga
        if np.all(oco(r[sel], h[sel])):
            hi = mid
        else:
            lo = mid
    return hi


def menor_escala(pontos, M, oco, k0=0.5, k1=3.0):
    """Menor escala k do oco (`oco(r, h, k)`) que guarda todos os pontos acima da base (h > 0)."""
    p = local(pontos, M)
    r = np.hypot(p[:, 0], p[:, 1])
    sel = p[:, 2] > -0.012
    r, h = r[sel], p[sel, 2]
    lo, hi = k0, k1
    for _ in range(32):
        mid = (lo + hi) / 2
        if np.all(oco(r, h, mid)):
            hi = mid
        else:
            lo = mid
    return hi


def revolve(loop, seg=32, closed=True, radial=None):
    """Sólido de revolução em torno de z: `loop` = [(r, z), ...]. Ponto com r = 0 vira polo.
    `radial(r, z, u)` deforma o raio (nervuras, franjas)."""
    bm = bmesh.new()
    rings = []
    for r, z in loop:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        ring = []
        for k in range(seg):
            u = 2 * math.pi * k / seg
            rr = radial(r, z, u) if radial else r
            ring.append(bm.verts.new((rr * math.cos(u), rr * math.sin(u), z)))
        rings.append(ring)
    n = len(loop)
    for i in range(n if closed else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        if len(a) == 1 and len(b) == 1:
            continue
        for k in range(seg):
            k2 = (k + 1) % seg
            if len(a) == 1:
                bm.faces.new((a[0], b[k2], b[k]))
            elif len(b) == 1:
                bm.faces.new((a[k], a[k2], b[0]))
            else:
                bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj('revolucao', bm)


def place(o, M):
    o.data.transform(M)
    o.data.update()


def emissivo(m, strength=0.6):
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Emission Color'].default_value = b.inputs['Base Color'].default_value
    b.inputs['Emission Strength'].default_value = strength
    return m


def metal(m, metallic=0.55, rough=0.3):
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    return m


def osso_dominante(fonte, v):
    if not v.groups:
        return ''
    g = max(v.groups, key=lambda g: g.weight)
    return fonte.vertex_groups[g.group].name.replace('mixamorig:', '')


def herdar_pesos(o, fonte, arm, filtro=None):
    """Cada vértice de `o` (coordenadas do mundo) copia os pesos do vértice mais próximo da peça do
    pacote `fonte`. `filtro(vértice)` limita a fonte (a capa só segue o tronco, não o braço)."""
    mw = fonte.matrix_world
    idx = [v.index for v in fonte.data.vertices if not filtro or filtro(v)]
    kd = KDTree(len(idx))
    for i, vi in enumerate(idx):
        kd.insert(mw @ fonte.data.vertices[vi].co, i)
    kd.balance()
    names = {g.index: g.name for g in fonte.vertex_groups}
    for g in fonte.vertex_groups:
        if g.name not in o.vertex_groups:
            o.vertex_groups.new(name=g.name)
    for v in o.data.vertices:
        _, i, _ = kd.find(o.matrix_world @ v.co)
        for g in fonte.data.vertices[idx[i]].groups:
            o.vertex_groups[names[g.group]].add([v.index], g.weight, 'REPLACE')
    attach(o, arm)


def bvh_mundo(o, faces=None):
    mw = o.matrix_world
    V = [mw @ v.co for v in o.data.vertices]
    F = [tuple(p.vertices) for p in o.data.polygons if faces is None or faces(p)]
    return BVHTree.FromPolygons(V, F)


def disco(center, normal, r, n=6, lobos=0):
    """Disco chato (confete, florzinha) virado para `normal`."""
    bm = bmesh.new()
    rot = Vector((0, 0, 1)).rotation_difference(normal).to_matrix()
    c = bm.verts.new(center)
    ring = []
    for k in range(n):
        t = 2 * math.pi * k / n
        rr = r * (1 if not lobos or k % 2 == 0 else 0.55)
        ring.append(bm.verts.new(center + rot @ Vector((rr * math.cos(t), rr * math.sin(t), 0))))
    for k in range(n):
        bm.faces.new((c, ring[k], ring[(k + 1) % n]))
    return new_obj('disco', bm)


def caixa(center, eixo_x, eixo_y, eixo_z):
    """Caixa orientada: centro e meios-eixos (vetores)."""
    bm = bmesh.new()
    vs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                vs.append(bm.verts.new(center + eixo_x * sx + eixo_y * sy + eixo_z * sz))
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj('caixa', bm)


def por_material(objs, m, name):
    o = join(objs, name) if len(objs) > 1 else objs[0]
    o.name = name
    set_material(o, m)
    return o


def cabeca(arm, head, pid, meshes):
    for m in meshes:
        bind(m, arm, head, {'Head': 1.0})
    export(arm, meshes, pid)


# ── Carnaval ────────────────────────────────────────────────────────────────────────────────
def cartolinha():
    pts = pontos_de(CABELOS + CABECAS)
    todos = juntar_pontos(pts, FORA_CARTOLA)
    reset()
    random.seed(8)
    arm, head = load('head-01')
    R_IN, H_IN = 0.385, 0.40          # oco: cilindro um pouco mais largo em cima
    R_CO, R_BO, T_B, H = 0.405, 0.58, 0.022, 0.43
    M0 = Matrix.Translation((0.0, -0.02, 2.2)) @ Matrix.Rotation(math.radians(-7), 4, 'Y') @ Matrix.Translation((0, 0, -2.2))

    def oco(r, h):
        return (r < R_IN + 0.02 * np.clip(h / H_IN, 0, 1) - 0.012) & (h < H_IN - 0.012)
    zb = assentar(todos, M0, oco)
    print('cartolinha: base em', round(zb, 3))
    M = M0 @ Matrix.Translation((0, 0, zb))
    # Copa de lantejoula: anéis com os vértices tremidos e sombra chapada (cada face brilha de um jeito).
    rings = 9
    loop = [(0.0, H_IN), (R_IN + 0.02, H_IN), (R_IN, 0.0), (R_BO, 0.0), (R_BO, T_B)]
    loop += [(R_CO + 0.02 * i / rings, T_B + (H - T_B) * i / rings) for i in range(rings + 1)]
    loop += [(0.0, H)]
    copa = revolve(loop, seg=28)
    for v in copa.data.vertices:
        r = math.hypot(v.co.x, v.co.y)
        if v.co.z > T_B + 0.01 and r > R_IN + 0.02 * min(v.co.z, H_IN) / H_IN + 0.01:  # só a casca de fora
            f = 1 + random.uniform(-0.012, 0.012)
            v.co.x *= f
            v.co.y *= f
            v.co.z += random.uniform(-0.006, 0.006)
    place(copa, M)
    shade(copa, False)
    set_material(copa, metal(mat('Color_', hexrgb('#8e44ad'), 0.3)))
    # Fita dourada na base da copa.
    fita = revolve([(R_CO - 0.004, T_B), (R_CO + 0.016, T_B), (R_CO + 0.016, T_B + 0.075), (R_CO - 0.004, T_B + 0.075)], seg=28)
    place(fita, M)
    set_material(fita, metal(mat('Fita', hexrgb('#f1c40f'), 0.35)))
    # Pluma curta presa na fita, do lado direito, inclinada para trás.
    base_p = Vector((-0.36, 0.17, T_B + 0.06))
    pena_pts = [base_p + Vector((0.0, 0.0, 0.0)), base_p + Vector((-0.03, 0.04, 0.10)), base_p + Vector((-0.04, 0.10, 0.19)),
                base_p + Vector((-0.02, 0.17, 0.25)), base_p + Vector((0.01, 0.23, 0.27))]
    pena = tube(pena_pts, [0.02, 0.05, 0.055, 0.04, 0.012], seg=8)
    for v in pena.data.vertices:  # achatada: larga de lado, fina de frente
        d = v.co - base_p
        v.co.x = base_p.x + d.x * 0.45
    place(pena, M)
    set_material(pena, mat('Pluma', hexrgb('#f8a5c2'), 0.9))
    # Serpentina enrolada na aba (duas voltas largas em torno da aba, cada uma com 26 espirais).
    serps = []
    for cor, u0, u1, fase in (('#f1c40f', 0.0, 1.15, 0.0), ('#2ecc71', 1.25, 1.95, 1.6)):
        pts_s = []
        n = 140
        for i in range(n):
            t = i / (n - 1)
            u = 2 * math.pi * (u0 + (u1 - u0) * t)
            v = fase + 2 * math.pi * 22 * (u1 - u0) * t
            re, a = R_BO - 0.035, 0.032
            pts_s.append(Vector(((re + a * math.cos(v)) * math.cos(u), (re + a * math.cos(v)) * math.sin(u), T_B / 2 + a * math.sin(v))))
        s = tube(pts_s, [0.0065] * n, seg=4)
        place(s, M)
        set_material(s, mat('Serpentina', hexrgb(cor), 0.5))
        serps.append(s)
    # Ponta solta da serpentina caindo da aba, enrolada.
    ponta = []
    u = 2 * math.pi * 1.15
    for i in range(26):
        t = i / 25
        r = R_BO + 0.02 + 0.03 * t
        ang = u + 0.4 * t
        ponta.append(Vector((r * math.cos(ang) + 0.025 * math.cos(9 * t * math.pi), r * math.sin(ang) + 0.025 * math.sin(9 * t * math.pi), -0.12 * t)))
    pt = tube(ponta, [0.0065] * 26, seg=4)
    place(pt, M)
    set_material(pt, serps[0].data.materials[0])
    serp = join(serps[:1] + [pt], 'Serpentina')
    meshes = [copa, fita, pena, serp, serps[1]]
    for m in meshes:
        shade(m, m is not copa)
    cabeca(arm, head, 'hat-cartolinha', meshes)


def colete():
    reset()
    random.seed(11)
    arm, top = load('top-01')
    co = slot(top, 'Color_')
    mw = top.matrix_world
    # O colete (cor da paleta) nasce do tronco da camiseta; a camiseta fica branca com confetes.
    vest = duplicate(top, 'Colete')
    bm = bmesh.new()
    bm.from_mesh(vest.data)
    names = {g.index: g.name.replace('mixamorig:', '') for g in vest.vertex_groups}
    dl = bm.verts.layers.deform.active

    def dom(v):
        d = v[dl]
        return names[max(d.items(), key=lambda kv: kv[1])[0]] if d else ''
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        if f.material_index != co:
            dead.append(f)
            continue
        bones = {dom(v) for v in f.verts}
        abre = c.y < 0 and abs(c.x) < 0.035 + max(0.0, c.z - 0.80) * 0.42  # decote em V, aberto na frente
        cava = abs(c.x) > 0.34 and c.z > 0.98  # cava do braço: colete sem manga
        if not bones <= TRONCO or abs(c.x) > 0.43 or c.z > 1.22 or c.z < 0.60 or abre or cava:
            dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)  # costuras da malha do pacote
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(vest.data)
    bm.free()
    for v in vest.data.vertices:  # afasta do corpo pela horizontal (as normais herdadas variam)
        d = Vector((v.co.x, v.co.y, 0))
        if d.length > 1e-6:
            v.co += d.normalized() * 0.022
    solidify(vest, 0.016, offset=1)
    shade(vest, True)
    attach(vest, arm)
    cor = top.data.materials[co]  # o Color_ do pacote passa para o colete
    top.data.materials[co] = mat('Camiseta', hexrgb('#f6f3ea'), 0.8)
    vest.data.materials.clear()
    vest.data.materials.append(cor)
    # Franjas coloridas na barra do colete.
    cores = ['#f1c40f', '#2ecc71', '#3498db', '#e84393', '#e67e22']
    corpo_bvh = bvh_mundo(top)
    fr = {c: [] for c in cores}
    n = 44
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        d = Vector((math.sin(a), -math.cos(a), 0))
        # raio do corpo nessa direção (ponto da barra mais alinhado com d)
        hit = corpo_bvh.ray_cast(Vector((0, 0, 0.625)) + d * 1.2, -d)[0]
        if hit is None:
            continue
        top_p = hit + d * 0.04
        if top_p.y < 0 and abs(top_p.x) < 0.035:
            continue
        L = 0.10 + 0.02 * (i % 2)
        pts_f = [top_p, top_p + d * 0.012 + Vector((0, 0, -L * 0.5)), top_p + d * 0.02 + Vector((0, 0, -L))]
        fr[cores[i % len(cores)]].append(tube(pts_f, [0.012, 0.011, 0.007], seg=4))
    franjas = []
    for c, objs in fr.items():
        if objs:
            o = por_material(objs, mat('Franja', hexrgb(c), 0.6), 'Franja')
            shade(o, True)
            herdar_pesos(o, top, arm, lambda v: osso_dominante(top, v) in TRONCO)
            franjas.append(o)
    # Confetes na camiseta: nas mangas e no decote, onde o colete não cobre.
    conf = {c: [] for c in cores}
    cand = [p for p in top.data.polygons if p.material_index == co]
    random.shuffle(cand)
    k = 0
    for p in cand:
        c = mw @ p.center
        nrm = (mw.to_3x3() @ p.normal).normalized()
        manga = abs(c.x) > 0.46
        decote = c.y < -0.2 and abs(c.x) < 0.02 + max(0.0, c.z - 0.80) * 0.42 and c.z < 1.18
        if not (manga or decote):
            continue
        conf[cores[k % len(cores)]].append(disco(c + nrm * 0.006, nrm, 0.022, n=6))
        k += 1
        if k >= 54:
            break
    confetes = []
    for c, objs in conf.items():
        if objs:
            o = por_material(objs, mat('Confete', hexrgb(c), 0.5), 'Confete')
            herdar_pesos(o, top, arm)
            confetes.append(o)
    export(arm, [top, vest] + franjas + confetes, 'top-colete')


# ── Junina ──────────────────────────────────────────────────────────────────────────────────
def remendo(M, ang, z0, w, h, r, cor, flor, seed):
    """Remendo de chita colado na copa: retângulo curvo com florzinhas. `r(z)` é o raio de fora da
    copa na altura z (o remendo acompanha a copa que afina para cima)."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    nu, nv = 4, 3
    grid = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            z = z0 + (j / nv - 0.5) * h
            a = ang + (i / nu - 0.5) * w / r(z0)
            row.append(bm.verts.new(((r(z) + 0.006) * math.cos(a), (r(z) + 0.006) * math.sin(a), z)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    p = new_obj('remendo', bm)
    solidify(p, 0.006, offset=-1)
    place(p, M)
    set_material(p, mat('Chita', hexrgb(cor), 0.8))
    flores = []
    for k in range(5):
        a = ang + rnd.uniform(-0.38, 0.38) * w / r(z0)
        z = z0 + rnd.uniform(-0.36, 0.36) * h
        c = Vector(((r(z) + 0.0135) * math.cos(a), (r(z) + 0.0135) * math.sin(a), z))
        flores.append(disco(c, Vector((math.cos(a), math.sin(a), 0)), 0.016, n=10, lobos=1))
    f = join(flores, 'Florzinhas')
    place(f, M)
    set_material(f, mat('Chita', hexrgb(flor), 0.7))
    return p, f


def palha():
    pts = pontos_de(CABELOS + CABECAS)
    todos = juntar_pontos(pts, FORA_PALHA)
    reset()
    random.seed(9)
    arm, head = load('head-01')
    # Oco da copa: 0.45 na boca, fechando em cúpula; a aba larga e desfiada.
    def r_in(h):
        return 0.45 - 0.05 * np.clip(h / 0.26, 0, 1) ** 2

    def oco(r, h):
        return (r < r_in(h) - 0.012) & (h < 0.35 - 0.012) & ((h < 0.24) | (r < 0.40 * np.sqrt(np.clip(1 - ((h - 0.24) / 0.11) ** 2, 0, 1)) - 0.012))
    M0 = Matrix.Translation((0.0, 0.0, 2.1)) @ Matrix.Rotation(math.radians(6), 4, 'X') @ Matrix.Translation((0, 0, -2.1))  # aba erguida na frente
    zb = assentar(todos, M0, oco)
    print('palha: base em', round(zb, 3))
    M = M0 @ Matrix.Translation((0, 0, zb))
    T = 0.03
    copa_out = [(0.475, T), (0.47, 0.10), (0.455, 0.18), (0.43, 0.25), (0.40, 0.30), (0.33, 0.35), (0.20, 0.38), (0.0, 0.385)]
    copa_in = [(0.0, 0.35), (0.22, 0.345), (0.33, 0.32), (0.40, 0.24), (0.43, 0.12), (0.45, 0.0)]
    R_BO = 0.86
    loop = copa_out + copa_in + [(0.47, -0.0), (R_BO - 0.06, -0.025), (R_BO, -0.045), (R_BO, -0.045 + T), (R_BO - 0.06, -0.025 + T), (0.49, T)]
    seg = 40

    def franja(r, z, u):  # borda desfiada: o raio da ponta varia por segmento
        if r >= R_BO - 1e-4:
            return r + (0.03 if int(round(u / (2 * math.pi) * seg)) % 2 else -0.012) + random.uniform(-0.01, 0.01)
        return r
    chapeu = revolve(loop, seg=seg, radial=franja)
    place(chapeu, M)
    shade(chapeu, False)
    claro, escuro = mat('Palha', hexrgb('#e8c872'), 0.9), mat('Palha_trama', hexrgb('#c9a24f'), 0.9)
    chapeu.data.materials.append(claro)
    chapeu.data.materials.append(escuro)
    Mi = M.inverted()
    for p in chapeu.data.polygons:  # trama: faixas alternadas na copa e na aba
        c = Mi @ p.center
        rr = math.hypot(c.x, c.y)
        k = int(c.z / 0.045) if c.z > T + 0.005 else int(rr / 0.07)
        p.material_index = k % 2
    # Fiapos soltos na borda da aba.
    fiapos = []
    for k in range(18):
        u = 2 * math.pi * (k + random.random() * 0.5) / 18
        d = Vector((math.cos(u), math.sin(u), 0))
        a = d * (R_BO + 0.005) + Vector((0, 0, -0.03))
        b = d * (R_BO + 0.07 + random.uniform(0, 0.03)) + Vector((random.uniform(-0.02, 0.02), random.uniform(-0.02, 0.02), -0.05))
        fiapos.append(tube([a, (a + b) / 2, b], [0.006, 0.005, 0.003], seg=3))
    fi = join(fiapos, 'Fiapos')
    place(fi, M)
    set_material(fi, escuro)
    # Fita da copa (cor da paleta).
    fita = revolve([(0.47, T + 0.002), (0.488, T + 0.002), (0.483, T + 0.075), (0.465, T + 0.075)], seg=seg)
    place(fita, M)
    set_material(fita, mat('Color_', hexrgb('#c0392b'), 0.7))
    shade(fita, True)
    # Dois remendos de chita na copa (um na frente à esquerda, outro atrás à direita).
    def r_copa(z):  # raio de fora da copa (o mesmo perfil de copa_out)
        for (r0, z0), (r1, z1) in zip(copa_out, copa_out[1:]):
            if z <= z1:
                return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
        return copa_out[-1][0]
    p1, f1 = remendo(M, math.radians(-120), 0.185, 0.24, 0.14, r_copa, '#c0392b', '#f6d32d', 1)
    p2, f2 = remendo(M, math.radians(35), 0.19, 0.20, 0.12, r_copa, '#2980b9', '#ffffff', 2)
    chita = join([p1, p2], 'Chita')
    flores = join([f1, f2], 'Flores')
    cabeca(arm, head, 'hat-palha', [chapeu, fi, fita, chita, flores])


def chita():
    reset()
    random.seed(12)
    arm, d = load('outfit-01')
    sk = slot(d, 'Skin_')
    cor = slot(d, 'Color_')
    mw = d.matrix_world
    # O vestido inteiro vira chita (cor própria); o babado novo leva a cor da paleta.
    chita_m = mat('Chita', hexrgb('#c62f4b'), 0.8)
    babado_m = d.data.materials[cor]
    for p in d.data.polygons:
        if p.material_index != sk:
            p.material_index = cor
    d.data.materials[cor] = chita_m
    # Barra presa às coxas, como as saias compridas (o joelho não atravessa o tecido).
    roupas.repesar_barra(d, lambda p: p.material_index != sk, 0.54, 0.24)
    # Babado: anel ondulado logo abaixo da barra, alargando para baixo.
    saia = [mw @ v.co for v in d.data.vertices if 0.33 < (mw @ v.co).z < 0.37]
    raio = max(math.hypot(p.x, p.y) for p in saia)
    cy = sum(p.y for p in saia) / len(saia)
    zt, zb_ = 0.36, 0.22
    n, rings = 64, 4
    bm = bmesh.new()
    grid = []
    for j in range(rings + 1):
        t = j / rings
        z = zt - (zt - zb_) * t
        row = []
        for k in range(n):
            u = 2 * math.pi * k / n
            r = raio - 0.008 + 0.075 * t + 0.03 * t * math.sin(12 * u)
            row.append(bm.verts.new((r * math.sin(u), cy - r * math.cos(u), z)))
        grid.append(row)
    for j in range(rings):
        for k in range(n):
            bm.faces.new((grid[j][k], grid[j][(k + 1) % n], grid[j + 1][(k + 1) % n], grid[j + 1][k]))
    bab = new_obj('Babado', bm)
    solidify(bab, 0.014, offset=0)
    set_material(bab, babado_m)
    shade(bab, True)
    bind(bab, arm, d, {'Hips': 1.0})
    roupas.repesar_barra(bab, lambda p: True, 0.54, 0.24)
    # Florzinhas da chita: amarelas, brancas e verdes espalhadas pela saia e pelo corpo.
    bvh = bvh_mundo(d, lambda p: p.material_index == cor)
    cores = {'#f6c945': [], '#ffffff': [], '#2e9e5b': []}
    ks = list(cores)
    k = 0
    for j in range(9):
        z = 0.40 + j * 0.085
        for i in range(10):
            a = 2 * math.pi * (i + 0.5 * (j % 2)) / 10 + random.uniform(-0.08, 0.08)
            dirv = Vector((math.sin(a), -math.cos(a), 0))
            o = Vector((0, cy, z)) + dirv * 1.0
            hit, nrm, _, _ = bvh.ray_cast(o, -dirv)
            if hit is None or abs(hit.x) > 0.47:
                continue
            nrm = nrm if nrm.dot(dirv) > 0 else -nrm
            cores[ks[k % 3]].append(disco(hit + nrm * 0.006, nrm, 0.03 if ks[k % 3] != '#2e9e5b' else 0.018, n=10, lobos=ks[k % 3] != '#2e9e5b'))
            k += 1
    flores = []
    for c, objs in cores.items():
        if objs:
            o = por_material(objs, mat('Chita_flor', hexrgb(c), 0.7), 'Flores')
            herdar_pesos(o, d, arm, lambda v: osso_dominante(d, v) in TRONCO | {'LeftUpLeg', 'RightUpLeg'})
            flores.append(o)
    export(arm, [d, bab] + flores, 'outfit-chita')


# ── Lanternas ───────────────────────────────────────────────────────────────────────────────
def lanternas():
    pts = pontos_de(CABELOS + CABECAS)
    todos = juntar_pontos(pts, FORA_TIARA)
    reset()
    arm, head = load('head-01')
    # Arco da tiara: elipse de orelha a orelha num plano um pouco inclinado (alto na frente).
    Y0, HALF = -0.12, 0.045
    RX, RZ = 0.47, 0.50
    inc = math.radians(-8)
    # escala mínima para o lado de dentro do arco ficar fora dos cabelos da fatia
    p = todos
    yplano = Y0 + (p[:, 2] - C.z) * math.tan(inc)
    ang = np.degrees(np.arctan2(np.abs(p[:, 0]) / RX, (p[:, 2] - C.z) / RZ))  # só onde o arco passa
    sel = (np.abs(p[:, 1] - yplano) < HALF + 0.02) & (ang < 88)
    q = np.sqrt((p[sel, 0] / RX) ** 2 + ((p[sel, 2] - C.z) / RZ) ** 2)
    k = float(q.max()) + 0.05
    print('tiara: escala do arco', round(k, 3))
    n = 19
    pts_a = []
    for i in range(n):
        a = math.radians(-78 + 156 * i / (n - 1))
        z = C.z + RZ * k * math.cos(a)
        pts_a.append(Vector((RX * k * math.sin(a), Y0 + (z - C.z) * math.tan(inc), z)))
    band = tube(pts_a, [0.026] * n, seg=6)
    for v in band.data.vertices:  # faixa achatada, mais larga que alta
        yp = Y0 + (v.co.z - C.z) * math.tan(inc)
        v.co.y = yp + (v.co.y - yp) * 1.9
    set_material(band, mat('Color_', hexrgb('#e74c3c'), 0.45))
    shade(band, True)
    # Três hastes de arame saindo do arco, cada uma com uma lanterninha pendurada na ponta.
    hastes, lant, tampas, fios, borlas = [], [], [], [], []
    cores = ['#e8412c', '#f39c12', '#f6d32d']
    for j, ang in enumerate((-52, 0, 52)):
        a = math.radians(ang)
        z0 = C.z + RZ * k * math.cos(a)
        p0 = Vector((RX * k * math.sin(a), Y0 + (z0 - C.z) * math.tan(inc), z0))
        out = Vector((math.sin(a), 0, math.cos(a)))
        up = Vector((0, 0, 1))
        tip = p0 + out * 0.20 + up * 0.10 + out * (0.06 if ang else 0) + Vector((0, 0.02, 0))
        mid = p0 + out * 0.08 + up * 0.10
        gancho = tip + out * 0.06 - up * 0.02
        hastes.append(tube([p0, mid, tip, gancho], [0.008, 0.007, 0.006, 0.006], seg=4))
        fio_top = gancho
        lc = fio_top - up * 0.12
        fios.append(tube([fio_top, fio_top - up * 0.035], [0.003, 0.003], seg=3))
        s = uvsphere(lc, 0.08, scale=(1, 1, 0.82), seg=10, ring=6)
        for v in s.data.vertices:  # gomos de papel: dez costelas
            a_ = math.atan2(v.co.y - lc.y, v.co.x - lc.x)
            f = 1 - 0.06 * abs(math.sin(5 * a_))
            v.co.x = lc.x + (v.co.x - lc.x) * f
            v.co.y = lc.y + (v.co.y - lc.y) * f
        set_material(s, emissivo(mat('Lanterna', hexrgb(cores[j]), 0.7), 0.7))
        shade(s, True)
        lant.append(s)
        tampas.append(tube([lc + up * 0.055, lc + up * 0.088], [0.036, 0.032], seg=8))
        tampas.append(tube([lc - up * 0.088, lc - up * 0.055], [0.032, 0.036], seg=8))
        borlas.append(tube([lc - up * 0.088, lc - up * 0.155], [0.012, 0.004], seg=4))
    h = por_material(hastes + fios, metal(mat('Arame', hexrgb('#d4ac0d'), 0.4)), 'Hastes')
    t = por_material(tampas, metal(mat('Ouro', hexrgb('#f1c40f'), 0.35)), 'Tampas')
    b = por_material(borlas, mat('Borla', hexrgb('#c0392b'), 0.8), 'Borlas')
    for o in (h, t, b):
        shade(o, True)
    cabeca(arm, head, 'enfeite-lanternas', [band, h, t, b] + lant)


def capa():
    reset()
    random.seed(13)
    arm, top = load('top-01')
    co = slot(top, 'Color_')
    bvh = bvh_mundo(top)

    def costas(x, z):  # y do tecido por trás em (x, z)
        for f in (1.0, 0.8, 0.6, 0.4, 0.0):
            hit = bvh.ray_cast(Vector((x * f, 1.5, z)), Vector((0, -1, 0)))[0]
            if hit:
                return hit.y
        return 0.2
    # Capa: dos ombros (atrás do pescoço) à cintura, abrindo e afastando das costas para baixo; a
    # barra é recortada em pontas, como estrelas.
    nu, nv = 16, 12
    Z0, Z1 = 1.245, 0.64
    bm = bmesh.new()
    grid = []
    for j in range(nv + 1):
        t = j / nv
        z = Z0 - (Z0 - Z1) * t
        half = 0.29 + 0.25 * t ** 0.75  # na cintura passa um pouco do corpo: aparece de frente
        row = []
        for i in range(nu + 1):
            s = i / nu * 2 - 1
            x = s * half
            y = costas(x, z) + 0.03 + 0.15 * t ** 1.4 + 0.03 * (1 - s * s) * t
            if j == nv:  # quatro pontas largas na barra
                w = (i % 4) / 4
                z = Z1 - 0.07 * (1 - abs(w * 2 - 1))
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    cp = new_obj('Capa', bm)
    if cp.data.polygons[len(cp.data.polygons) // 2].normal.y < 0:
        bm = bmesh.new(); bm.from_mesh(cp.data)
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
        bm.to_mesh(cp.data); bm.free()
    solidify(cp, 0.016, offset=-1)
    cor = top.data.materials[co]
    set_material(cp, cor)
    shade(cp, True)
    # Gola em pé atrás do pescoço e cordão pela frente, com a estrela de fecho.
    gola = []
    for i in range(13):
        a = math.radians(-115 + 230 * i / 12)  # 0 = nuca
        gola.append(Vector((0.19 * math.sin(a), 0.0 + 0.175 * math.cos(a), 1.29 + 0.035 * math.cos(a))))
    gl = tube(gola, [0.03] * 13, seg=6)
    for v in gl.data.vertices:  # gola alta: mais alta que grossa, aparece atrás do pescoço
        v.co.z = 1.29 + (v.co.z - 1.29) * 2.4
    cordao = []
    for i in range(11):
        a = math.radians(-115 + 230 * i / 10)  # 0 = frente
        cordao.append(Vector((0.185 * math.sin(a), -0.01 - 0.165 * math.cos(a), 1.235 - 0.015 * math.cos(a))))
    cord = tube(cordao, [0.011] * 11, seg=5)
    for o in (gl, cord):
        set_material(o, cor)
        shade(o, True)
    # A camiseta por baixo fica clara; capa, gola e cordão levam a cor da paleta.
    top.data.materials[co] = mat('Camiseta', hexrgb('#f6f3ea'), 0.8)
    # Estrelas douradas na capa.
    cbvh = bvh_mundo(cp)
    estrelas = []
    spots = [(-0.17, 1.12, 0.05), (0.15, 1.06, 0.065), (-0.03, 0.95, 0.085), (0.30, 0.88, 0.05), (-0.32, 0.83, 0.065),
             (0.10, 0.80, 0.05), (-0.13, 0.74, 0.045), (0.38, 0.72, 0.045), (0.02, 1.17, 0.035), (-0.42, 0.70, 0.035)]
    for x, z, r in spots:
        hit, nrm, _, _ = cbvh.ray_cast(Vector((x, 1.5, z)), Vector((0, -1, 0)))
        if hit is None:
            continue
        nrm = nrm if nrm.y > 0 else -nrm
        estrelas.append(star(hit + nrm * 0.006, r, 0.008, nrm))
    estrelas.append(star(Vector((0, -0.19, 1.22)), 0.048, 0.014, Vector((0, -1, 0.15)).normalized()))
    est = por_material(estrelas, metal(mat('Estrela', hexrgb('#f6c945'), 0.35), 0.4), 'Estrelas')
    shade(est, False)
    filtro = lambda v: osso_dominante(top, v) in TRONCO
    for o in (cp, gl, cord, est):
        herdar_pesos(o, top, arm, filtro)
    export(arm, [top, cp, gl, cord, est], 'top-capa')


# ── Fim de ano ──────────────────────────────────────────────────────────────────────────────
def gorro():
    pts = pontos_de(CABELOS + CABECAS)
    todos = juntar_pontos(pts, FORA_GORRO)
    reset()
    random.seed(10)
    arm, head = load('head-01')
    # Boca do gorro num plano inclinado: alta na testa (acima das sobrancelhas), baixa na nuca.
    tilt = math.radians(-16)
    M0 = Matrix.Translation((0, 0.0, 1.835)) @ Matrix.Rotation(tilt, 4, 'X')
    RAZAO, P = 1.1, 2.6  # cúpula cheia (superelipse): cabe o mesmo cabelo com menos largura

    def oco(r, h, k):
        hh = np.clip(h / (RAZAO * k), 0, 1)
        return (r < k * np.clip(1 - hh ** P, 0, 1) ** (1 / P) - 0.012) & (h < RAZAO * k - 0.012)
    k = menor_escala(todos, M0, oco)
    print('gorro: raio do oco', round(k, 3))
    R, H = k + 0.012, RAZAO * k + 0.012
    T = 0.035

    def perfil(rr, hh, t):  # superelipse de raio rr e altura hh no parâmetro t (0 = boca, 1 = topo)
        z = hh * t
        return rr * max(0.0, 1 - t ** P) ** (1 / P), z
    nr = 12
    loop = [perfil(R + T, H + T, i / nr) for i in range(nr)] + [(0.0, H + T)]
    inner = [(0.0, H)] + [perfil(R, H, i / nr) for i in range(nr - 1, -1, -1)]
    fora = set(loop[:nr])
    loop = loop + inner

    def nervura(r, z, u):  # tricô: nervuras verticais só por fora
        return r * (1 + 0.018 * math.cos(20 * u)) if (r, z) in fora else r
    corpo = revolve(loop, seg=40, radial=nervura)
    place(corpo, M0)
    set_material(corpo, mat('Color_', hexrgb('#c0392b'), 0.95))
    shade(corpo, True)
    # Barra branca dobrada na boca e pompom no topo.
    barra = revolve([(R - 0.002, -0.01), (R + T + 0.02, -0.01), (R + T + 0.03, 0.055), (R + T + 0.02, 0.12), (R - 0.002, 0.12)], seg=40,
                    radial=lambda r, z, u: r * (1 + 0.012 * math.cos(20 * u)) if r > R + T else r)
    place(barra, M0)
    branco = mat('Barra', hexrgb('#f4f4f4'), 0.95)
    set_material(barra, branco)
    shade(barra, True)
    pom = ico(Vector((0, -0.02, H + T + 0.08)), 0.14, sub=2)
    for v in pom.data.vertices:
        v.co += (v.co - Vector((0, -0.02, H + T + 0.08))).normalized() * random.uniform(-0.012, 0.012)
    place(pom, M0)
    set_material(pom, mat('Pompom', hexrgb('#ffffff'), 1.0))
    shade(pom, True)
    cabeca(arm, head, 'hat-gorro', [corpo, barra, pom])


def sueter():
    arm, top = roupas.mangalonga(None)
    co = slot(top, 'Color_')
    mw = top.matrix_world
    bvh = bvh_mundo(top)
    # Estrela grande no peito, moldada no tecido (cada vértice acompanha a curva do peito).
    cx, cz, R = 0.0, 0.93, 0.17
    bm = bmesh.new()
    outline = []
    for k in range(10):
        t = math.pi / 2 + 2 * math.pi * k / 10
        rr = R if k % 2 == 0 else R * 0.45
        outline.append((rr * math.cos(t), rr * math.sin(t)))

    def surf(x, z, off):
        hit = bvh.ray_cast(Vector((cx + x, -1.5, cz + z)), Vector((0, 1, 0)))[0]
        return Vector((cx + x, (hit.y if hit else -0.36) - off, cz + z))
    levels = [0.0, 0.34, 0.67, 1.0]
    front, back = [], []
    for s in levels:
        if s == 0:
            front.append([bm.verts.new(surf(0, 0, 0.008))])
            back.append([bm.verts.new(surf(0, 0, -0.004))])
            continue
        front.append([bm.verts.new(surf(x * s, z * s, 0.008)) for x, z in outline])
        back.append([bm.verts.new(surf(x * s, z * s, -0.004)) for x, z in outline])
    for layer in (front, back):
        for li in range(len(levels) - 1):
            a, b = layer[li], layer[li + 1]
            for k in range(10):
                k2 = (k + 1) % 10
                if len(a) == 1:
                    bm.faces.new((a[0], b[k], b[k2]))
                else:
                    bm.faces.new((a[k], b[k], b[k2], a[k2]))
    for k in range(10):
        k2 = (k + 1) % 10
        bm.faces.new((front[-1][k], back[-1][k], back[-1][k2], front[-1][k2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    est = new_obj('Estrela', bm)
    set_material(est, mat('Estrela', hexrgb('#f6c945'), 0.4))
    shade(est, False)
    herdar_pesos(est, top, arm, lambda v: osso_dominante(top, v) in TRONCO)
    # Faixa clara na barra com flocos de neve brancos em volta.
    branco = mat('Floco', hexrgb('#f4f4f4'), 0.8)
    bm = bmesh.new()  # corta a malha nas bordas da faixa: troca de cor reta, sem serrilhado
    bm.from_mesh(top.data)
    inv = mw.inverted()
    for zc in (0.598, 0.638):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=inv @ Vector((0, 0, zc)), plane_no=(inv.to_3x3() @ Vector((0, 0, 1))).normalized())
    bm.to_mesh(top.data)
    bm.free()
    for p in top.data.polygons:
        c = mw @ p.center
        if p.material_index == co and 0.598 < c.z < 0.638:
            p.material_index = add_slot(top, branco) if slot(top, 'Floco') < 0 else slot(top, 'Floco')
    flocos = []
    n = 12
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        d = Vector((math.sin(a), -math.cos(a), 0))
        hit, nrm, _, _ = bvh.ray_cast(Vector((0, 0, 0.71)) + d * 1.2, -d)
        if hit is None or abs(hit.x) > 0.40:
            continue
        nrm = Vector((nrm.x, nrm.y, 0)).normalized()
        nrm = nrm if nrm.dot(d) > 0 else -nrm
        tang = Vector((0, 0, 1)).cross(nrm).normalized()
        c = hit + nrm * 0.008
        for b in range(3):
            ang = math.radians(90 + 60 * b)
            ax = tang * math.cos(ang) + Vector((0, 0, 1)) * math.sin(ang)
            flocos.append(caixa(c, ax * 0.038, ax.cross(nrm).normalized() * 0.006, nrm * 0.004))
    fl = por_material(flocos, branco, 'Flocos')
    shade(fl, False)
    herdar_pesos(fl, top, arm, lambda v: osso_dominante(top, v) in TRONCO)
    export(arm, [top, est, fl], 'top-sueter')


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--') + 1:]:
        globals()[name]()
