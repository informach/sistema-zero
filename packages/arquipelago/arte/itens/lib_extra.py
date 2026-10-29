"""Formas a mais para os ingredientes, as iscas e as coleções (por cima do `lib_itens`).

- `setor_torneado`: peça de torno só num pedaço da volta, com as faces do corte fechadas (o queijo
  sem a fatia, o limão e o coco partidos);
- `almofada`: placa fofa a partir de um contorno 2D (estrela gorducha, estrela-do-mar), com a
  borda arredondada e o meio mais alto;
- `contorno_redondo`: arredonda as pontas de um contorno (cortes de canto de Chaikin);
- `leque`: concha em leque (vieira, conchinha listrada, valva do mexilhão), a partir da dobradiça;
- `olho_fofo`: olho redondo com pupila e brilho, virado para uma direção;
- `girar`: gira um conjunto de peças como um bloco só;
- `na_superficie` e `pinta`: acham a pele de uma peça por raio e colam ali uma bolinha achatada;
- `suavizar` e `tubo_plano`: caminho macio e tubo que não torce (as notas e a clave de sol);
- `borda_colorida`: pinta o contorno (as faces viradas para os lados) de outra cor.
"""
from lib_itens import *


def setor_torneado(perfil, a0, a1, m, m_corte=None, seg=20, pos=(0, 0, 0), liso=True):
    """Peça de torno entre os ângulos a0 e a1 (radianos), com as duas faces do corte fechadas.

    O perfil vai de baixo para cima e começa e termina no eixo (raio 0), como no `torneado`.
    As faces do corte usam `m_corte` (a polpa, o miolo)."""
    bm = bmesh.new()
    n = seg + 1
    aneis = []
    for r, z in perfil:
        if r <= 1e-6:
            aneis.append([bm.verts.new((pos[0], pos[1], pos[2] + z))])
        else:
            aneis.append([bm.verts.new((pos[0] + r * math.cos(a0 + (a1 - a0) * k / seg),
                                        pos[1] + r * math.sin(a0 + (a1 - a0) * k / seg), pos[2] + z))
                          for k in range(n)])
    for a, b in zip(aneis, aneis[1:]):
        if len(a) == 1:
            for k in range(seg):
                bm.faces.new((a[0], b[k], b[k + 1]))
        elif len(b) == 1:
            for k in range(seg):
                bm.faces.new((a[k], a[k + 1], b[0]))
        else:
            for k in range(seg):
                bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    cortes = []
    for idx in (0, seg):
        vs = []
        for anel in aneis:
            v = anel[0] if len(anel) == 1 else anel[idx]
            if v not in vs:
                vs.append(v)
        cortes.append(bm.faces.new(vs))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.faces.ensure_lookup_table()
    ids_corte = {f.index for f in cortes}
    o = lib_q._obj('setor', bm, m)
    if m_corte:
        o.data.materials.append(lib_q.mat(m_corte))
        for p in o.data.polygons:
            if p.index in ids_corte:
                p.material_index = 1
    for p in o.data.polygons:
        p.use_smooth = liso and p.index not in ids_corte
    if liso:
        o.data.set_sharp_from_angle(angle=R(50))
    return o


def contorno_redondo(pts, voltas=3):
    """Cortes de canto (Chaikin): as pontas ficam redondas e os lados retos continuam retos."""
    for _ in range(voltas):
        novo_ = []
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            novo_.append((a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25))
            novo_.append((a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75))
        pts = novo_
    return pts


def almofada(pts, frente, m, tras=None, aneis=3, perfil=0.75):
    """Placa fofa a partir do contorno `pts` [(x, z)] em volta da origem, de pé no plano XZ.

    `frente` é a espessura para −Y (o lado da câmera) e `tras` para +Y. A borda é redonda e o meio
    fica mais alto; `perfil` < 1 deixa o tampo mais cheio (menos pontudo no meio)."""
    tras = frente if tras is None else tras
    bm = bmesh.new()
    borda = [bm.verts.new((x, 0, z)) for x, z in pts]
    n = len(pts)
    lados = []
    for sinal, h in ((-1, frente), (1, tras)):
        aneis_v = [borda]
        for k in range(1, aneis):
            phi = (math.pi / 2) * k / aneis
            s = math.cos(phi) ** perfil
            y = sinal * h * math.sin(phi)
            aneis_v.append([bm.verts.new((x * s, y, z * s)) for x, z in pts])
        centro = bm.verts.new((0, sinal * h, 0))
        for a, b in zip(aneis_v, aneis_v[1:]):
            for i in range(n):
                bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
        ult = aneis_v[-1]
        for i in range(n):
            bm.faces.new((ult[i], ult[(i + 1) % n], centro))
        lados.append(aneis_v)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('almofada', bm, m)
    lib_q.smooth(o)
    return o


def pts_estrela(r_fora, r_dentro, n=5, rot=90, voltas=3):
    return contorno_redondo(lib_q.star_pts(r_fora, r_dentro, n=n, rot=rot), voltas)


def leque(raio, h, m, cy=0.72, abertura=62, costelas=0, costela_h=0.0, nu=10, nv=18, espessura=0.004,
          alongar=1.0, u0=0.0):
    """Concha em leque, deitada com a parte de fora para cima e a dobradiça na origem (para +Y).

    `u0` > 0 deixa a dobradiça como uma linha curtinha (sem o leque de triângulos finos na ponta).

    O contorno é um círculo de raio `raio` com o centro a `cy`·raio da dobradiça, cortado pelas
    duas retas que saem dela a ±`abertura` graus. `costelas` é o número de gomos (vieira)."""
    tm = R(abertura)
    c = cy * raio
    verts, faces = [], []
    for j in range(nu + 1):
        u = u0 + (1 - u0) * j / nu
        for i in range(nv + 1):
            t = -tm + 2 * tm * i / nv
            alcance = c * math.cos(t) + math.sqrt(max(0.0, raio * raio - c * c * math.sin(t) ** 2))
            rho = alcance * u
            x = rho * math.sin(t)
            y = rho * math.cos(t) * alongar
            u = min(u, 1.0)
            z = h * (1 - u * u) ** 0.6 * (0.7 + 0.3 * math.cos(t))
            if costelas:
                z += costela_h * (u ** 0.7) * (0.5 + 0.5 * math.cos(costelas * t * math.pi / tm))
            verts.append((x, y, z))
    for j in range(nu):
        for i in range(nv):
            a = j * (nv + 1) + i
            faces.append((a, a + 1, a + nv + 2, a + nv + 1))
    o = malha('leque', verts, faces, m)
    if u0 <= 0:
        # Junta os vértices da dobradiça (todos em u = 0) num só.
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bm.to_mesh(o.data)
        bm.free()
    s = o.modifiers.new('esp', 'SOLIDIFY')
    s.thickness = espessura
    s.offset = -1
    lib_q._apply(o, s)
    lib_q.smooth(o)
    o.data.set_sharp_from_angle(angle=R(60))
    return o


def olho_fofo(pos, normal, r, pupila=0.62, m_branco='olhoBranco', m_pupila='olhoPreto', m_brilho='olhoBrilho',
              achatar=0.55, seg=12):
    """Olho de desenho: bolinha branca rasa, pupila preta e um pontinho de brilho em cima."""
    n = Vector(normal).normalized()
    rot = Vector((0, 0, 1)).rotation_difference(n).to_euler()
    p = Vector(pos)
    pecas = []
    if m_branco:
        b = esfera(r, tuple(p), m_branco, escala=(1, 1, achatar), seg=seg, aneis=max(5, seg // 2))
        b.rotation_euler = rot
        pecas.append(b)
        rp = r * pupila
        pp = p + n * (r * achatar * 0.55)
    else:
        rp = r
        pp = p
    pu = esfera(rp, tuple(pp), m_pupila, escala=(1, 1, achatar), seg=seg, aneis=max(5, seg // 2))
    pu.rotation_euler = rot
    pecas.append(pu)
    # Brilho: para cima e para a frente da pupila.
    cima = Vector((0, 0, 1))
    lado = n.cross(cima)
    if lado.length < 1e-4:
        lado = Vector((1, 0, 0))
    cima_local = lado.cross(n).normalized() * -1
    if cima_local.z < 0:
        cima_local = -cima_local
    bp = pp + n * (rp * achatar * 0.8) + cima_local * rp * 0.4 + lado.normalized() * rp * 0.25
    br = esfera(rp * 0.36, tuple(bp), m_brilho, escala=(1, 1, 0.6), seg=8, aneis=5)
    br.rotation_euler = rot
    pecas.append(br)
    return pecas


lib_q.PALETTE.update({
    'olhoBranco': ('#ffffff', 0.4, None, 0),
    'olhoPreto': ('#22202a', 0.25, None, 0),
    'olhoBrilho': ('#ffffff', 0.2, '#ffffff', 0.3),
    'bochechaRosa': ('#ff9fae', 0.8, None, 0),
})


def girar(objs, rot, centro=(0, 0, 0), mover=(0, 0, 0)):
    """Gira um conjunto de peças como um bloco só, em volta de `centro`, e depois desloca."""
    from mathutils import Euler
    c = Vector(centro)
    M = (Matrix.Translation(c + Vector(mover)) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Translation(-c))
    bpy.context.view_layer.update()
    for o in objs:
        o.matrix_world = M @ o.matrix_world
    return objs


def na_superficie(o, origem, direcao):
    """Ponto e normal onde o raio (no mundo) encontra a malha `o` (para pôr olhos e pintas)."""
    bpy.context.view_layer.update()
    mw = o.matrix_world
    inv = mw.inverted()
    ok, loc, nrm, _ = o.ray_cast(inv @ Vector(origem), (inv.to_3x3() @ Vector(direcao)).normalized())
    if not ok:
        return None, None
    return mw @ loc, (mw.to_3x3().inverted().transposed() @ nrm).normalized()


def suavizar(pts, n=4):
    """Catmull-Rom: `n` pontos entre cada par (o traço da clave de sol, o rastro da estrela)."""
    v = [Vector(p) for p in pts]
    v = [v[0] * 2 - v[1]] + v + [v[-1] * 2 - v[-2]]
    saida = []
    for i in range(1, len(v) - 2):
        p0, p1, p2, p3 = v[i - 1], v[i], v[i + 1], v[i + 2]
        for k in range(n):
            t = k / n
            saida.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
                                      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)))
    saida.append(tuple(v[-2]))
    return saida


def borda_colorida(o, m_borda, limite=0.5):
    """Pinta com `m_borda` as faces viradas para os lados (|normal.y| pequeno): o contorno colorido
    das notas e das estrelas, que têm a frente e as costas de `luz`."""
    return pintar_por(o, lambda c, n: m_borda if abs(n.y) < limite else None)


def tubo_plano(pts, raios, m, seg=12):
    """Tubo para caminhos no plano XZ (notas, clave de sol): o anel usa sempre o eixo y, então o
    tubo nunca torce nas curvas (o `tube` troca de referência quando o traço fica de pé)."""
    bm = bmesh.new()
    eixo_y = Vector((0, 1, 0))
    aneis = []
    n = len(pts)
    for i, p in enumerate(pts):
        p = Vector(p)
        d = (Vector(pts[min(i + 1, n - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        b = d.cross(eixo_y).normalized()
        aneis.append([bm.verts.new(p + (eixo_y * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg))
                                   * raios[i]) for k in range(seg)])
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((aneis[i][k], aneis[i][(k + 1) % seg], aneis[i + 1][(k + 1) % seg], aneis[i + 1][k]))
    bm.faces.new(list(reversed(aneis[0])))
    bm.faces.new(aneis[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return lib_q.smooth(lib_q._obj('tubo', bm, m))


def pinta(alvo, origem, direcao, r, m, achatar=0.4, afunda=0.25, seg=8, aneis=5):
    """Pinta redonda (bolinha achatada) colada na superfície de `alvo`, onde o raio bate."""
    pt, nr = na_superficie(alvo, origem, direcao)
    if pt is None:
        return None
    o = esfera(r, tuple(pt - nr * r * achatar * afunda), m, escala=(1, 1, achatar), seg=seg, aneis=aneis)
    o.rotation_euler = Vector((0, 0, 1)).rotation_difference(nr).to_euler()
    return o
