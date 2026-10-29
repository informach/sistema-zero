"""O jardim da missão (`jardim-acolhedor`): um canteiro grande, como um diorama, com a terra à
mostra nos lados.

Composição (no chão do jogo, x para a direita e z para a câmera): a área em que o personagem anda
é a do projeto (`walkArea` de x -9 a 9 e z -4 a 4), plana no nível 0. Uma trilha de terra batida
entra pela esquerda, passa pelo começo do personagem (-7, 1) e chega a uma pracinha de cascalho em
volta do canteiro da flor (5, 1); dali um caminho estreito leva ao arco do jardim secreto, no
fundo, entre a cerca. O regador fica na grama, entre a trilha e o fundo ((-4, -2) e (-2, -2)), e a
grama em volta dele fica livre. Os detalhes moram nas bordas: moitas em tufos com flores, árvores
nos cantos do fundo, tulipas, pedras, cogumelos e um toco; na frente só coisa baixa, que não
esconde o personagem. O centro é tranquilo.

Acabamento como o da Ilha: o chão é UM terreno pintado nos vértices (grama em manchas de tom,
trilha, cascalho e a terra do canteiro), com a borda arredondada e a terra em camadas nos lados;
o material do chão leva `szSemSombra` (o Jogo 3D não o deixa fazer sombra nele mesmo). Moitas,
árvores e o toco levam o degradê de luz na própria cor dos vértices.
"""
from jardim_lib import *
import mathutils

AX, AZ, NSE = 12.3, 8.0, 4.0      # meia largura, meia profundidade e a forma do canteiro
ANDAR = (-9.0, 9.0, -4.0, 4.0)     # o `walkArea` do projeto (x mín, x máx, z mín, z máx)
FLOR = (5.0, 1.0)                  # onde o projeto põe a flor
REGADOR = ((-4.0, -2.0), (-2.0, -2.0))  # o lugar de entrada e o da aula da posição
PERSONAGEM = (-7.0, 1.0)
ARCO_X, CERCA_Z = 1.5, -7.35

lib_q.PALETTE.update({
    'j/tufo': ('#7fb36a', 0.9, None, 0),
    'j/tufoClaro': ('#9cc97f', 0.9, None, 0),
    'j/cipo': ('#4a8a52', 0.85, None, 0),
    'j/folhaCipo': ('#5e9e5c', 0.85, None, 0),
    'j/casca': ('#7a5238', 0.9, None, 0),
    'j/seixo': ('#b9b4a6', 0.9, None, 0),
    'j/seixoClaro': ('#d3cec0', 0.9, None, 0),
    'j/seixoEscuro': ('#9a978f', 0.9, None, 0),
})

C = {k: hexlin(h) for k, h in dict(
    g1='#8fbe77', g2='#a5cd86', g3='#78a964', g4='#b7d590', gborda='#6e9c5c',
    p1='#ead8aa', p2='#d9c190', p3='#f4e7c6', pdirt='#c9ae80', cascalho='#e3d3ad', cascalhoEsc='#cbb68c',
    terra='#a07a54', terraBorda='#b9946a', terraEsc='#83603f',
    s1='#b28f68', s2='#9a7856', s3='#846448', s4='#6b5039', sraiz='#5a4130',
    m1='#4f8657', m2='#6ea566', m3='#9ccb7f', m4='#bcdb92',
    a1='#467d4e', a2='#64a05d', a3='#8fc376', a4='#b2d98d',
    tr1='#6e4d34', tr2='#94704f',
).items()}


def g(x, z):
    return (x, -z)


def dist(x, z):
    """Distância normalizada à borda do canteiro (1 = na borda)."""
    return (abs(x / AX) ** NSE + abs(z / AZ) ** NSE) ** (1 / NSE)


def contorno(n=220):
    """A borda de cima do canteiro (no jogo), com uma ondulação leve, reamostrada por comprimento."""
    pts = []
    for i in range(2400):
        t = 2 * math.pi * i / 2400
        c, s = math.cos(t), math.sin(t)
        w = 1 + 0.008 * math.sin(3 * t + 1.3) + 0.006 * math.sin(7 * t + 0.4) + 0.004 * math.sin(13 * t + 2)
        pts.append((AX * w * math.copysign(abs(c) ** (2 / NSE), c), AZ * w * math.copysign(abs(s) ** (2 / NSE), s)))
    acum = [0.0]
    for i in range(1, len(pts) + 1):
        a, b = pts[i - 1], pts[i % len(pts)]
        acum.append(acum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = acum[-1]
    out, j = [], 0
    for k in range(n):
        alvo = total * k / n
        while acum[j + 1] < alvo:
            j += 1
        a, b = pts[j], pts[(j + 1) % len(pts)]
        t = (alvo - acum[j]) / ((acum[j + 1] - acum[j]) or 1)
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def _spline(pts, passo=0.08):
    """Catmull-Rom pelos pontos (no chão do jogo), amostrada a cada ~`passo`."""
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        L = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        n = max(2, int(L / passo))
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    out.append(pts[-1])
    return out


# A trilha principal entra pela esquerda e acaba na pracinha da flor; a estreita vai dela ao arco.
TRILHA = _spline([(-12.9, 1.45), (-10.2, 1.25), (-7.0, 0.9), (-4.4, 0.55), (-1.6, 0.75), (1.2, 1.15), (3.4, 1.1), (FLOR[0], FLOR[1])])
TRILHA_ARCO = _spline([(FLOR[0], FLOR[1]), (4.4, -1.4), (3.2, -3.5), (2.2, -5.4), (ARCO_X, -7.7)])
PRACA_R = 1.75
CANTEIRO_R = 0.72


def _dist_linha(pts, x, z):
    return min(math.hypot(x - a, z - b) for a, b in pts)


r_tr, r_tr2, r_c = ruido(41, 0.55), ruido(42, 1.6), ruido(43, 0.35)
r1, r2, r3, r4, r5 = ruido(5, 2.6), ruido(6, 1.1), ruido(7, 1.9), ruido(8, 0.8), ruido(9, 0.45)
r_alt, r_s = ruido(12, 2.2), ruido(13, 0.6)


def caminho(x, z):
    """Quanto o ponto é trilha/cascalho (0 a 1), e quanto é a pracinha (para o tom)."""
    w1 = 1.0 + 0.08 * math.sin(0.9 * x + 1.0)
    d1 = _dist_linha(TRILHA, x, z) if x < FLOR[0] + 1 else 99
    d2 = _dist_linha(TRILHA_ARCO, x, z) if z < FLOR[1] + 0.5 else 99
    dp = math.hypot(x - FLOR[0], z - FLOR[1])
    jit = 0.13 * (r_tr(x, z) - 0.5) + 0.05 * (r_tr2(x, z) - 0.5)
    t1 = 1 - suave(w1 - 0.14, w1 + 0.08, d1 + jit)
    t2 = 1 - suave(0.58, 0.78, d2 + jit)
    tp = 1 - suave(PRACA_R - 0.15, PRACA_R + 0.08, dp + jit)
    return max(t1, t2, tp), tp


def canteiro(x, z):
    d = math.hypot(x - FLOR[0], z - FLOR[1])
    return 1 - suave(CANTEIRO_R - 0.1, CANTEIRO_R + 0.04, d + 0.05 * (r_c(x, z) - 0.5))


def fora_da_area(x, z):
    """Quanto o ponto está fora da área de andar (0 dentro, cresce para fora)."""
    dx = max(0.0, abs(x) - (ANDAR[1] + 0.6))
    dz = max(0.0, (-z) - (-ANDAR[2] + 0.7), z - (ANDAR[3] + 0.7))
    return math.hypot(dx, dz)


def altura(x, z):
    """A altura do chão no ponto: plano na área de andar, montinhos de grama nas bordas, a trilha
    um pouco mais baixa e o canteiro da flor um pouco mais alto."""
    d = dist(x, z)
    monte = 0.26 * suave(0.15, 1.6, fora_da_area(x, z)) * (0.45 + 0.9 * r_alt(x, z))
    monte *= 1 - suave(0.93, 0.995, d)
    tc, _ = caminho(x, z)
    h = monte * (1 - tc) - 0.018 * tc
    h += 0.09 * suave(0.0, 0.8, canteiro(x, z))
    return h


SOMBRAS = []  # (x, z, raio) das moitas e árvores: o chão escurece embaixo delas


def cor_chao(x, z):
    d = dist(x, z)
    grama = mistura(C['g1'], C['g2'], r1(x, z))
    grama = mistura(grama, C['g3'], 0.5 * suave(0.55, 0.85, r2(x, z)))
    grama = mistura(grama, C['g4'], 0.35 * suave(0.6, 0.9, r3(x, z)))
    grama = mistura(grama, C['gborda'], 0.3 * suave(0.82, 1.0, d))
    for sx, sz, sr in SOMBRAS:
        k = 1 - suave(0.5 * sr, 1.15 * sr, math.hypot(x - sx, z - sz))
        if k > 0:
            grama = mistura(grama, C['gborda'], 0.55 * k)
    tc, tp = caminho(x, z)
    terra = mistura(mistura(C['p1'], C['p3'], r4(x, z)), C['p2'], 0.45 * suave(0.5, 0.9, r5(x, z)))
    if tp > 0:
        cas = mistura(C['cascalho'], C['cascalhoEsc'], 0.6 * suave(0.45, 0.8, r5(x * 2.3, z * 2.3)))
        terra = mistura(terra, cas, tp)
    c = mistura(grama, terra, suave(0.3, 0.72, tc))
    # A beira da trilha: grama gasta e um friso de terra mais escura.
    c = mistura(c, C['pdirt'], 0.4 * math.exp(-((tc - 0.55) / 0.14) ** 2))
    k = canteiro(x, z)
    if k > 0:
        solo = mistura(C['terra'], C['terraEsc'], 0.6 * suave(0.5, 0.85, r_s(x * 3, z * 3)))
        solo = mistura(solo, C['terraBorda'], suave(0.0, 0.5, 1 - k) * 0.8)
        c = mistura(c, solo, suave(0.0, 0.35, k))
    return c


def cor_lado(z_abs, x, y):
    """A terra dos lados, em camadas, do topo (sob a grama) ao fundo."""
    n = r_s(x * 1.7 + y, y * 1.7 - x) - 0.5
    h = -z_abs + 0.06 * n
    c = mistura(C['s1'], C['s2'], suave(0.2, 0.42, h))
    c = mistura(c, C['s3'], suave(0.5, 0.72, h))
    c = mistura(c, C['s4'], suave(0.82, 1.05, h))
    return c


def _terreno():
    borda = contorno()
    n = len(borda)
    # Grade de 0,2 no gramado e de 0,1 onde a cor muda depressa (a beira da trilha, da pracinha e
    # do canteiro), com um leve desvio em cada ponto para a beira não sair em degraus.
    miolo = []
    rj = random.Random(3)
    passo = 0.15
    nx_, nz_ = int(2 * AX / passo), int(2 * AZ / passo)
    for i in range(nx_):
        for j in range(nz_):
            x, z = -AX + (i + 0.5) * passo, -AZ + (j + 0.5) * passo
            if dist(x, z) >= 0.975:
                continue
            fino = 0.03 < caminho(x, z)[0] < 0.97 or 0.03 < canteiro(x, z) < 0.97
            if not fino and (i % 3 or j % 3):
                continue
            miolo.append((x + rj.uniform(-0.025, 0.025), z + rj.uniform(-0.025, 0.025)))
    todos = borda + miolo
    vs, _, faces, orig, _, _ = mathutils.geometry.delaunay_2d_cdt(
        [Vector(g(x, z)) for x, z in todos], [], [list(range(n))], 1, 1e-6)
    bm = bmesh.new()
    cores = bm.loops.layers.float_color.new('Col')
    topo, cor_de = [], {}
    anel = {}
    for k, v2 in enumerate(vs):
        x, z = v2.x, -v2.y
        na_borda = any(i < n for i in orig[k])
        h = 0.0 if na_borda else altura(x, z)
        vert = bm.verts.new((v2.x, v2.y, h))
        topo.append(vert)
        cor_ = cor_chao(x, z)
        if na_borda:
            cor_ = mistura(cor_, C['g2'], 0.25)
            for i in orig[k]:
                if i < n:
                    anel[i] = vert
        cor_de[vert] = cor_
    for f in faces:
        face = bm.faces.new([topo[i] for i in f])
        if face.normal.z < 0:
            face.normal_flip()
        for loop in face.loops:
            loop[cores] = (*cor_de[loop.vert], 1.0)
    # A borda: a grama arredonda por cima da terra e a terra desce em camadas, afinando embaixo.
    area = sum(borda[i - 1][0] * borda[i][1] - borda[i][0] * borda[i - 1][1] for i in range(n))
    sentido = 1 if area > 0 else -1
    perfil = [(0.0, 0.0), (0.06, -0.035), (0.1, -0.1), (0.11, -0.2), (0.05, -0.55),
              (-0.14, -0.93), (-0.42, -1.12)]
    aneis = [[anel[i] for i in range(n)]]
    normais = []
    for i in range(n):
        (ax, az), (bx, bz) = borda[i - 1], borda[(i + 1) % n]
        dx, dz = bx - ax, bz - az
        L = math.hypot(dx, dz) or 1
        normais.append((sentido * dz / L, -sentido * dx / L))
    for off, zz in perfil[1:]:
        ring = []
        for i in range(n):
            x, z = borda[i]
            nx, nz = normais[i]
            wob = 0.025 * math.sin(i * 0.9) + 0.02 * (r_s(x, z) - 0.5) if zz < -0.2 else 0.0
            ring.append(bm.verts.new((*g(x + nx * (off + wob), z + nz * (off + wob)), zz)))
        aneis.append(ring)

    cor_anel = []
    for j, ring in enumerate(aneis):
        if j == 0:
            cor_anel.append([cor_de[v] for v in ring])
        elif j == 1:
            cor_anel.append([mistura(cor_de[aneis[0][i]], C['gborda'], 0.4) for i in range(n)])
        elif j == 2:
            cor_anel.append([mistura(C['gborda'], C['s1'], 0.45) for _ in range(n)])
        else:
            cor_anel.append([cor_lado(-v.co.z, v.co.x, v.co.y) for v in ring])
    for j in range(len(aneis) - 1):
        for i in range(n):
            i2 = (i + 1) % n
            q = ((j, i), (j, i2), (j + 1, i2), (j + 1, i))
            face = bm.faces.new([aneis[a][b] for a, b in q])
            for loop, (a, b) in zip(face.loops, q):
                loop[cores] = (*cor_anel[a][b], 1.0)
    fundo = bm.faces.new(list(reversed(aneis[-1])))
    for loop in fundo.loops:
        loop[cores] = (*C['s4'], 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('terreno')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('terreno', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat_vc('jardim-chao', 0.93, sem_sombra=True))
    for f in o.data.polygons:
        f.use_smooth = True
    o.data.set_sharp_from_angle(angle=R(55))
    return [o]


# ---------------------------------------------------------------- vegetação

def _sem_sombra(fn):
    """Peça miúda (capim, florzinhas, seixos, tulipas, cogumelos): não faz sombra. Sem placa de
    vídeo a sombra desenha a cena duas vezes; o que é baixinho não ganha nada com ela."""
    def f(*a, **k):
        objs = fn(*a, **k)
        for o in objs:
            o['jardimSemSombra'] = True
        return objs
    return f


def _cor_folhagem(z0, h, tons, semente):
    rr = ruido(semente, 0.35)
    d, m, l, t = tons

    def f(p, n):
        k = (p.z - z0) / max(h, 1e-3)
        c = mistura(d, m, suave(-0.05, 0.55, k))
        c = mistura(c, l, suave(0.4, 1.0, k) * (0.45 + 0.55 * max(0.0, n.z)))
        c = mistura(c, t, 0.55 * suave(0.72, 1.05, k) * max(0.0, n.z))
        c = mistura(c, d, 0.18 * rr(p.x, p.y + p.z))
        if n.z < -0.25:
            c = mistura(c, tuple(v * 0.8 for v in d), 0.5)
        return c
    return f


MAT_FOLHA = None


def moita(x, z, r, h, seed, flores=None, tons=None, n=None, sombra=True, sub=2):
    """Moita em tufos: 4 a 8 bolotas de folhagem sobrepostas, a de cima mais alta, com o degradê de
    luz nos vértices. `flores` = (cor, quantas): florzinhas espalhadas pela parte de cima."""
    rnd = random.Random(seed)
    base = altura(x, z) - 0.04
    bx, by = g(x, z)
    bm = bmesh.new()
    k = n or rnd.randint(3, 5)
    centros = [(bx, by, base + h * 0.55, r * 0.62)]
    for i in range(k):
        a = 2 * math.pi * i / k + rnd.uniform(-0.3, 0.3)
        rr = r * rnd.uniform(0.45, 0.7)
        cx, cy = bx + math.cos(a) * r * 0.55, by + math.sin(a) * r * 0.42
        centros.append((cx, cy, base + rr * 0.75 + rnd.uniform(0, h * 0.15), rr))
    for i, (cx, cy, cz, rr) in enumerate(centros):
        bolota(bm, (cx, cy, cz), rr, (1, 0.92, 0.9), seed * 31 + i, amp=0.08, recorte=0.045, nrec=10, pot=4, sub=sub)
    o = obj_de('moita', bm, mat_vc('jardim-folhagem', 0.86))
    topo = max(cz + rr * 0.9 for _, _, cz, rr in centros)
    pintar(o, _cor_folhagem(base, topo - base, tons or (C['m1'], C['m2'], C['m3'], C['m4']), seed))
    p = [o]
    if flores:
        cor_flor, q = flores
        bm = bmesh.new()
        for i in range(q):
            cx, cy, cz, rr = centros[rnd.randrange(len(centros))]
            a, el = rnd.uniform(0, 2 * math.pi), rnd.uniform(0.35, 1.2)
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            pos = Vector((cx, cy, cz)) + Vector((d.x * rr * 0.95, d.y * rr * 0.87, d.z * rr * 0.86))
            florzinha(bm, pos, d, rnd.uniform(0.07, 0.1), giro=rnd.uniform(0, 6))
        fl = obj_de('flores', bm, mat(cor_flor))
        fl.data.materials.append(mat('j/miolo'))
        _miolos(fl)
        p.append(fl)
    if sombra:
        SOMBRAS.append((x, z, r * 1.15))
    return p


def _miolos(o):
    """Põe o material do miolo (índice 1) nas faces do cone central de cada florzinha: as que não
    tocam a borda das pétalas (os 6 triângulos que se seguem a cada leque de pétalas)."""
    faces = list(o.data.polygons)
    # Cada florzinha tem 20 triângulos de pétalas e depois 6 do miolo.
    por_flor = 26
    for i, poly in enumerate(faces):
        if i % por_flor >= 20:
            poly.material_index = 1


def arvore(x, z, s, seed, inclina=0.0):
    """Árvore de copa redonda: tronco que afina com dois galhos e a copa em bolotas grandes."""
    rnd = random.Random(seed)
    base = altura(x, z) - 0.05
    bx, by = g(x, z)
    p = []
    lean = Vector((inclina, rnd.uniform(-0.05, 0.05), 0))
    pts = [Vector((bx, by, base)) + lean * t * t + Vector((0, 0, 2.2 * s * t)) for t in (0, 0.25, 0.5, 0.75, 1.0)]
    tronco = tube([tuple(v) for v in pts], [0.3 * s, 0.22 * s, 0.19 * s, 0.17 * s, 0.14 * s], 'j/casca', seg=12)
    p.append(tronco)
    for lado in (-1, 1):
        a = rnd.uniform(0, 1) * 0.6 + (0 if lado < 0 else math.pi)
        o0 = pts[2] + Vector((0, 0, 0.2 * s))
        o1 = o0 + Vector((math.cos(a) * 0.55 * s, math.sin(a) * 0.35 * s, 0.6 * s))
        p.append(tube([tuple(o0), tuple((o0 + o1) / 2 + Vector((0, 0, 0.05))), tuple(o1)], [0.1 * s, 0.075 * s, 0.05 * s], 'j/casca', seg=8))
    for k in range(4):
        a = k * math.pi / 2 + rnd.uniform(0, 0.6)
        raiz = [pts[0] + Vector((math.cos(a) * 0.12 * s, math.sin(a) * 0.12 * s, 0.25 * s)),
                pts[0] + Vector((math.cos(a) * 0.38 * s, math.sin(a) * 0.38 * s, 0.04 * s))]
        p.append(tube([tuple(v) for v in raiz], [0.11 * s, 0.05 * s], 'j/casca', seg=6))
    bm = bmesh.new()
    topo = pts[-1]
    copa = [(topo + Vector((0, 0, 0.75 * s)), 1.1 * s), (topo + Vector((0.1 * s, -0.15 * s, 1.45 * s)), 0.78 * s)]
    for i in range(9):
        a = 2 * math.pi * i / 9 + rnd.uniform(-0.2, 0.2)
        rr = rnd.uniform(0.62, 0.8) * s
        copa.append((topo + Vector((math.cos(a) * 1.0 * s, math.sin(a) * 0.8 * s, rnd.uniform(0.15, 0.8) * s)), rr))
    for i, (c, rr) in enumerate(copa):
        bolota(bm, tuple(c), rr, (1, 0.95, 0.9), seed * 17 + i, amp=0.08, recorte=0.045, nrec=12, sub=2, pot=4)
    o = obj_de('copa', bm, mat_vc('jardim-folhagem', 0.86))
    z0 = min(c.z - rr * 0.88 for c, rr in copa)
    z1 = max(c.z + rr * 0.88 for c, rr in copa)
    pintar(o, _cor_folhagem(z0, z1 - z0, (C['a1'], C['a2'], C['a3'], C['a4']), seed))
    p.append(o)
    SOMBRAS.append((x, z, 2.1 * s))
    return p


@_sem_sombra
def tufo(x, z, s, seed, tons=('j/tufo', 'j/tufoClaro')):
    """Tufo de capim: cinco folhinhas finas abertas em leque."""
    rnd = random.Random(seed)
    bx, by = g(x, z)
    h = altura(x, z) - 0.01
    p = []
    for i in range(4):
        yaw = rnd.uniform(0, 2 * math.pi)
        p.append(leaf((bx + rnd.uniform(-0.05, 0.05), by + rnd.uniform(-0.05, 0.05), h), yaw,
                      rnd.uniform(0.12, 0.2) * s, rnd.uniform(0.03, 0.045) * s, tons[i % 2],
                      lift=rnd.uniform(0.22, 0.34) * s, droop=0.08 * s, fold=0.25, n=4))
    return p


@_sem_sombra
def flores_no_chao(x, z, s, seed, cores=('j/rosa', 'j/amarela', 'j/lilas')):
    """Um punhado de florzinhas em hastes curtas, como as do desenho 2D."""
    rnd = random.Random(seed)
    p = []
    bm_c = bmesh.new()
    por_cor = {c: bmesh.new() for c in cores}
    for i in range(rnd.randint(3, 5)):
        fx, fz = x + rnd.uniform(-0.35, 0.35) * s, z + rnd.uniform(-0.25, 0.25) * s
        bx, by = g(fx, fz)
        h0 = altura(fx, fz) - 0.01
        hh = rnd.uniform(0.18, 0.32) * s
        topo = Vector((bx + rnd.uniform(-0.03, 0.03), by + rnd.uniform(-0.03, 0.03), h0 + hh))
        p.append(tube([(bx, by, h0), tuple((Vector((bx, by, h0)) + topo) / 2), tuple(topo)], [0.014 * s, 0.012 * s, 0.01 * s], 'j/caule', seg=5, cap=False))
        florzinha(por_cor[cores[i % len(cores)]], topo, Vector((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), 1)),
                  rnd.uniform(0.07, 0.095) * s, giro=rnd.uniform(0, 6))
        if rnd.random() < 0.5:
            p.append(leaf((bx, by, h0 + hh * 0.3), rnd.uniform(0, 6.3), 0.1 * s, 0.035 * s, 'j/tufo', lift=0.05, droop=0.05, n=4))
    for cor_, bm in por_cor.items():
        if not bm.faces:
            bm.free()
            continue
        o = obj_de('flor', bm, mat(cor_))
        o.data.materials.append(mat('j/miolo'))
        _miolos(o)
        p.append(o)
    bm_c.free()
    return p


@_sem_sombra
def tulipas(x, z, s, seed, cor_='j/tulipa'):
    """Tulipas (como as do Cadê): hastes com duas folhas e a taça de três pétalas."""
    rnd = random.Random(seed)
    p = []
    for i in range(rnd.randint(3, 4)):
        fx, fz = x + rnd.uniform(-0.35, 0.35) * s, z + rnd.uniform(-0.2, 0.2) * s
        bx, by = g(fx, fz)
        h0 = altura(fx, fz) - 0.02
        hh = rnd.uniform(0.55, 0.8) * s
        topo = Vector((bx + rnd.uniform(-0.05, 0.05), by + rnd.uniform(-0.05, 0.05), h0 + hh))
        p.append(tube([(bx, by, h0), tuple((Vector((bx, by, h0)) + topo) / 2 + Vector((0.02, 0, 0))), tuple(topo)],
                      [0.025 * s, 0.022 * s, 0.02 * s], 'j/caule', seg=6, cap=False))
        for k in range(2):
            p.append(leaf((bx, by, h0 + 0.02), rnd.uniform(0, 6.3), 0.32 * s, 0.07 * s, 'j/folhaTulipa',
                          lift=0.32 * s, droop=0.12 * s, fold=0.45, n=7))
        cor_i = (cor_, 'j/tulipaClara', 'j/tulipaRosa')[rnd.randrange(3)] if cor_ == 'mix' else cor_
        for k in range(3):
            a = 2 * math.pi * k / 3 + rnd.uniform(-0.2, 0.2)
            c = topo + Vector((math.cos(a) * 0.045 * s, math.sin(a) * 0.045 * s, 0.1 * s))
            pet = superellipsoid((0.11 * s, 0.075 * s, 0.22 * s), tuple(c), cor_i, e1=0.65, e2=0.8, seg=8, ring=6)
            pet.rotation_euler = (0, 0, a)
            p.append(pet)
    return p


@_sem_sombra
def cogumelo(x, z, s, seed):
    """Cogumelo do Cadê: pé creme, chapéu vermelho com pintas brancas."""
    rnd = random.Random(seed)
    bx, by = g(x, z)
    h0 = altura(x, z) - 0.02
    hh = 0.26 * s
    p = [tube([(bx, by, h0), (bx + 0.01, by, h0 + hh * 0.6), (bx, by, h0 + hh)], [0.075 * s, 0.06 * s, 0.055 * s], 'j/pe', seg=10)]
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1)
    for v in list(bm.verts):
        if v.co.z < -0.05:
            v.co.z = -0.05
    for v in bm.verts:
        v.co = Vector((bx + v.co.x * 0.2 * s, by + v.co.y * 0.2 * s, h0 + hh + v.co.z * 0.14 * s))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    p.append(obj_de('chapeu', bm, mat('j/chapeu')))
    for i in range(6):
        a, el = rnd.uniform(0, 2 * math.pi), rnd.uniform(0.35, 1.2)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        c = Vector((bx + d.x * 0.2 * s, by + d.y * 0.2 * s, h0 + hh + d.z * 0.14 * s))
        pin = sphere(0.03 * s, tuple(c), 'j/pinta', scale=(1, 1, 0.45), subdiv=1)
        pin.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
        p.append(pin)
    return p


def toco(x, z, s, seed):
    """Toco de árvore com os anéis no tampo, raízes e um tufo de musgo."""
    rnd = random.Random(seed)
    bx, by = g(x, z)
    h0 = altura(x, z) - 0.04
    hh = 0.5 * s
    p = [cyl(0.42 * s, hh, (bx, by, h0 + hh / 2), 'j/casca', verts=16, r2=0.37 * s)]
    p.append(cyl(0.37 * s, 0.02, (bx, by, h0 + hh + 0.005), 'j/tocoTopo', verts=16))
    for rr in (0.26, 0.15):
        p.append(torus(rr * s, 0.012 * s, (bx, by, h0 + hh + 0.012), 'j/tocoAnel', seg=20, rseg=4))
    for k in range(5):
        a = 2 * math.pi * k / 5 + rnd.uniform(-0.3, 0.3)
        p.append(tube([(bx + math.cos(a) * 0.3 * s, by + math.sin(a) * 0.3 * s, h0 + 0.2 * s),
                       (bx + math.cos(a) * 0.55 * s, by + math.sin(a) * 0.55 * s, h0 + 0.02)], [0.09 * s, 0.04 * s], 'j/casca', seg=6))
    bm = bmesh.new()
    bolota(bm, (bx - 0.22 * s, by + 0.1 * s, h0 + hh * 0.85), 0.16 * s, (1.2, 1, 0.55), seed, amp=0.1, sub=1)
    o = obj_de('musgo', bm, mat_vc('jardim-folhagem', 0.86))
    pintar(o, _cor_folhagem(h0 + hh * 0.7, 0.2 * s, (C['m1'], C['m2'], C['m3'], C['m4']), seed))
    p.append(o)
    return p


def pedras(x, z, s, seed, n=3):
    """Pedras lapidadas (um bloco grande e pedrinhas no pé), tampo mais claro."""
    rnd = random.Random(seed)
    p = []
    for k in range(n):
        ss = s * (1.0 if k == 0 else rnd.uniform(0.35, 0.55))
        dx, dz = (0, 0) if k == 0 else (rnd.uniform(-0.75, 0.75) * s, rnd.uniform(-0.45, 0.45) * s)
        bx, by = g(x + dx, z + dz)
        o = rock((bx, by, altura(x + dx, z + dz) - 0.06 * ss), (ss * 1.25, ss * 1.0, ss * 0.8), 'j/pedra',
                 seed=rnd.randint(0, 999), subdiv=2, rough=0.16, flat_top=0.15, top_m='j/pedraTopo')
        o.rotation_euler.z = rnd.uniform(0, math.pi)
        p.append(o)
    return p


@_sem_sombra
def seixos(pts, seed):
    """Pedrinhas soltas e chatas (na beira da trilha e em volta do canteiro)."""
    rnd = random.Random(seed)
    p = []
    for x, z in pts:
        bx, by = g(x, z)
        r = rnd.uniform(0.06, 0.12)
        o = ellipsoid((bx, by, altura(x, z) + 0.005), (r, r * rnd.uniform(0.7, 0.95), r * 0.45),
                      ('j/seixo', 'j/seixoClaro', 'j/seixoEscuro')[rnd.randrange(3)], seg=7, ring=4)
        o.rotation_euler = (0, 0, rnd.uniform(0, 3.14))
        p.append(o)
    return p


# ---------------------------------------------------------------- cerca e arco

def _caixa(bm, c, tam, giro=0.0, ponta=0.0):
    """Caixa (opcionalmente com ponta em pirâmide) no bmesh, sem chanfro (cerca, ripas)."""
    cx, cy, cz = c
    w, d, h = tam[0] / 2, tam[1] / 2, tam[2] / 2
    cs, sn = math.cos(giro), math.sin(giro)

    def P(x, y, z):
        return bm.verts.new((cx + x * cs - y * sn, cy + x * sn + y * cs, cz + z))
    b = [P(-w, -d, -h), P(w, -d, -h), P(w, d, -h), P(-w, d, -h)]
    t = [P(-w, -d, h), P(w, -d, h), P(w, d, h), P(-w, d, h)]
    bm.faces.new(list(reversed(b)))
    for i in range(4):
        bm.faces.new((b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]))
    if ponta:
        top = P(0, 0, h + ponta)
        for i in range(4):
            bm.faces.new((t[i], t[(i + 1) % 4], top))
    else:
        bm.faces.new(t)


def cerca():
    """Cerca de ripas brancas no fundo, com a abertura do arco."""
    rnd = random.Random(90)
    bm = bmesh.new()
    x = -11.25
    while x <= 11.25:
        if abs(x - ARCO_X) > 1.15:
            bx, by = g(x, CERCA_Z + 0.03 * math.sin(x * 1.7))
            h = 0.78 + rnd.uniform(-0.03, 0.03)
            z0 = altura(x, CERCA_Z) - 0.05
            _caixa(bm, (bx, by, z0 + h / 2), (0.11, 0.05, h), giro=rnd.uniform(-0.04, 0.04), ponta=0.07)
        x += 0.36
    for zz in (0.3, 0.62):
        for a, b in ((-11.3, ARCO_X - 1.12), (ARCO_X + 1.12, 11.3)):
            L = b - a
            bx, by = g((a + b) / 2, CERCA_Z)
            _caixa(bm, (bx, by + 0.045, zz + altura((a + b) / 2, CERCA_Z) - 0.05), (L, 0.04, 0.06))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_de('cerca', bm, mat('j/cerca'), liso=False)
    return [o]


def arco():
    """O arco do jardim secreto: dois pilares de madeira branca, o arco duplo com treliça,
    o portão verde entreaberto e uma trepadeira com flores rosas."""
    rnd = random.Random(91)
    p = []
    bx, by = g(ARCO_X, CERCA_Z)
    z0 = altura(ARCO_X, CERCA_Z) - 0.04
    H, W = 1.95, 0.98
    bm = bmesh.new()
    for lado in (-1, 1):
        _caixa(bm, (bx + lado * W, by, z0 + H / 2), (0.17, 0.17, H))
        _caixa(bm, (bx + lado * W, by, z0 + 0.06), (0.25, 0.25, 0.12))
        _caixa(bm, (bx + lado * W, by, z0 + H + 0.03), (0.22, 0.22, 0.06))
    p.append(obj_de('pilares', bm, mat('j/cerca'), liso=False))
    for rr, t in ((W, 0.075), (W - 0.17, 0.05)):
        o = torus(rr, t, (bx, by, z0 + H), 'j/cerca', seg=28, rseg=8, rot=(R(90), 0, 0), arc=180)
        p.append(o)
    for k in range(7):  # raios da treliça entre os dois arcos
        a = math.pi * (k + 0.5) / 7
        c0 = Vector((bx + math.cos(a) * (W - 0.17), by, z0 + H + math.sin(a) * (W - 0.17)))
        c1 = Vector((bx + math.cos(a) * W, by, z0 + H + math.sin(a) * W))
        p.append(tube([tuple(c0), tuple(c1)], [0.025, 0.025], 'j/cerca', seg=6))
    # O portão: duas folhas de ripas, a da direita entreaberta para dentro do jardim.
    for lado, giro in ((-1, 0.0), (1, 0.75)):
        bm = bmesh.new()
        dobra = Vector((bx + lado * (W - 0.09), by, 0))
        larg = W - 0.1
        for i in range(5):
            u = (i + 0.5) / 5 * larg
            h = 1.15 + 0.12 * math.sin(math.pi * (1 - u / larg if lado > 0 else u / larg)) * 0.5
            _caixa(bm, (-lado * u, 0, z0 + 0.12 + h / 2), (larg / 5 - 0.03, 0.045, h), ponta=0.05)
        for zz in (0.35, 0.95):
            _caixa(bm, (-lado * larg / 2, 0.035, z0 + zz), (larg, 0.03, 0.07))
        o = obj_de('portao', bm, mat('j/portao'), liso=False)
        o.location = dobra
        o.rotation_euler.z = giro * lado
        p.append(o)
    # Trepadeira: um cipó que sobe enrolado em cada pilar e percorre o arco, com folhas e flores.
    caminho_ = []
    for lado in (-1, 1):
        pts = []
        for i in range(19):
            t = i / 18
            a = t * 5 * math.pi + (0 if lado < 0 else 1.3)
            pts.append((bx + lado * W + math.cos(a) * 0.12, by + math.sin(a) * 0.12, z0 + 0.05 + t * H))
        caminho_.append(pts)
        p.append(tube(pts, [0.028] * len(pts), 'j/cipo', seg=6))
    topo = [(bx + math.cos(math.pi * t / 20) * (W - 0.08), by - 0.06 + 0.05 * math.sin(t * 1.9), z0 + H + math.sin(math.pi * t / 20) * (W - 0.08)) for t in range(21)]
    caminho_.append(topo)
    p.append(tube(topo, [0.028] * len(topo), 'j/cipo', seg=6))
    bm = {c: bmesh.new() for c in ('j/rosa', 'j/branca')}
    for pts in caminho_:
        for i in range(1, len(pts) - 1):
            c = Vector(pts[i])
            for k in range(2):
                yaw = rnd.uniform(0, 2 * math.pi)
                p.append(leaf(tuple(c), yaw, rnd.uniform(0.12, 0.17), 0.06, 'j/folhaCipo', lift=0.05, droop=0.08, fold=0.4, n=5))
            if rnd.random() < 0.55:
                d = Vector((rnd.uniform(-0.6, 0.6), -1, rnd.uniform(-0.2, 0.6)))
                florzinha(bm['j/rosa' if rnd.random() < 0.75 else 'j/branca'], c + d.normalized() * 0.08, d, rnd.uniform(0.07, 0.095), giro=rnd.uniform(0, 6))
    for cor_, b in bm.items():
        o = obj_de('flores-arco', b, mat(cor_))
        o.data.materials.append(mat('j/miolo'))
        _miolos(o)
        p.append(o)
    return p


# ---------------------------------------------------------------- montagem

def _longe(x, z, pts, r):
    return all(math.hypot(x - a, z - b) >= r for a, b in pts)


def vegetacao():
    rnd = random.Random(7)
    p = []
    # Árvores nos cantos do fundo (a da esquerda mais à frente, para a copa não sair da cerca).
    p += arvore(-10.3, -5.9, 1.15, 1, inclina=0.12)
    p += arvore(9.7, -6.2, 1.3, 2, inclina=-0.1)
    # Moitas na frente da cerca (a abertura do arco e o caminho até ele ficam livres).
    x = -11.6
    i = 0
    while x < 11.7:
        if abs(x - ARCO_X) > 1.75 and _longe(x, -6.4, ((-10.3, -5.9), (9.7, -6.2)), 1.2):
            flor = (('j/rosa', 9), ('j/lilas', 8), None, ('j/branca', 7), None)[i % 5]
            r = rnd.uniform(0.72, 0.98)
            p += moita(x, rnd.uniform(-6.75, -6.15), r, rnd.uniform(0.9, 1.2), 100 + i, flores=flor)
            i += 1
        x += rnd.uniform(1.15, 1.45)
    # Atrás da cerca: moitas baixas que aparecem entre as ripas.
    x = -10.8
    while x < 10.8:
        if abs(x - ARCO_X) > 0.4:
            p += moita(x, -7.72, rnd.uniform(0.45, 0.6), 0.65, 300 + int(x * 10), sombra=False, n=2, sub=1,
                       tons=(C['a1'], C['a2'], C['a3'], C['a4']))
        x += rnd.uniform(1.1, 1.5)
    # Tulipas e flores na frente das moitas do fundo.
    for k, (tx, tz) in enumerate(((-7.6, -5.25), (-2.6, -5.3), (6.1, -5.35), (-11.3, -4.4))):
        p += tulipas(tx, tz, 1.0, 400 + k, cor_=('j/tulipa', 'j/tulipaRosa', 'j/tulipaClara', 'j/tulipa')[k])
    for k, (fx, fz) in enumerate(((-5.0, -5.4), (0.0, -5.35), (4.0, -5.6), (8.0, -5.2), (-9.0, -5.0))):
        p += flores_no_chao(fx, fz, 1.15, 500 + k)
    # Lados: pedras e cogumelos à esquerda, o toco à direita, moitas médias.
    p += pedras(-11.1, -3.0, 1.15, 600)
    p += pedras(10.9, 4.3, 0.9, 601)
    p += moita(-11.35, 4.4, 0.8, 0.95, 610, flores=('j/amarela', 7))
    p += moita(11.2, -2.1, 0.75, 0.9, 611)
    p += moita(11.5, 1.95, 0.55, 0.65, 612, flores=('j/rosa', 5))
    p += moita(-11.6, -1.2, 0.55, 0.6, 613)
    p += toco(10.8, -4.1, 1.0, 620)
    for k, (cx, cz, s) in enumerate(((-10.6, -4.3, 1.0), (-10.25, -4.05, 0.7), (11.2, -3.6, 0.8), (10.4, -3.55, 0.65), (-10.8, 3.3, 0.85))):
        p += cogumelo(cx, cz, s, 630 + k)
    # Frente: só coisa baixa (não esconde o personagem que anda perto da câmera).
    for k, x in enumerate((-10.4, -6.8, -2.4, 2.2, 6.4, 9.9)):
        z = rnd.uniform(6.2, 6.9)
        p += moita(x, z, rnd.uniform(0.45, 0.58), 0.5, 700 + k, n=4, flores=(('j/rosa', 4), None, ('j/amarela', 4))[k % 3])
    for k, (fx, fz) in enumerate(((-8.6, 5.7), (-4.6, 6.0), (0.0, 6.2), (4.3, 5.8), (8.2, 5.9), (-11.4, 0.0), (11.6, -0.6), (-0.8, -5.9))):
        p += flores_no_chao(fx, fz, 1.0, 800 + k)
    p += pedras(-4.0, 6.7, 0.55, 850, n=2)
    p += pedras(8.3, 6.8, 0.5, 851, n=2)
    # Tufos de capim: muitos nas bordas e poucos dentro, longe do regador, da flor e do começo.
    livres = list(REGADOR) + [FLOR, PERSONAGEM]
    feitos = 0
    while feitos < 55:
        x, z = rnd.uniform(-11.8, 11.8), rnd.uniform(-7.4, 7.4)
        if dist(x, z) > 0.95 or caminho(x, z)[0] > 0.05:
            continue
        dentro = fora_da_area(x, z) == 0
        if dentro and (rnd.random() < 0.7 or not _longe(x, z, livres, 1.4)):
            continue
        p += tufo(x, z, rnd.uniform(0.85, 1.25) * (0.75 if dentro else 1.0), 900 + feitos)
        feitos += 1
    # Florzinhas soltas na grama de dentro, poucas e baixas (não parecem coisa de recolher).
    feitos = 0
    while feitos < 7:
        x, z = rnd.uniform(-8.5, 8.5), rnd.uniform(-3.6, 3.6)
        if caminho(x, z)[0] > 0.02 or not _longe(x, z, livres, 1.8):
            continue
        p += flores_no_chao(x, z, 0.6, 1100 + feitos)
        feitos += 1
    # Seixos na beira da trilha e o anel de pedrinhas do canteiro.
    beira = []
    for i in range(0, len(TRILHA), 6):
        x, z = TRILHA[i]
        if rnd.random() < 0.3 and _longe(x, z, livres[:2], 1.0):
            lado = rnd.choice((-1, 1))
            beira.append((x + rnd.uniform(-0.2, 0.2), z + lado * rnd.uniform(1.02, 1.18)))
    for k in range(22):
        a = 2 * math.pi * k / 22
        beira.append((FLOR[0] + math.cos(a) * (CANTEIRO_R + 0.06), FLOR[1] + math.sin(a) * (CANTEIRO_R + 0.06)))
    p += seixos(beira, 1200)
    return p


def pecas_do_jardim():
    SOMBRAS.clear()
    veg = vegetacao()  # primeiro: as sombras das moitas entram na cor do chão
    return _terreno() + veg + cerca() + arco()


def _marcos_simetricos(p):
    """Dois marcos de 1 mm nos cantos de uma caixa simétrica no chão (a maior extensão de cada
    lado): o jogo centraliza a caixa no objeto, então o canteiro fica exatamente na origem."""
    a, b = caixa_mundo(p)
    ex, ey = max(-a.x, b.x) + 0.01, max(-a.y, b.y) + 0.01
    bm = bmesh.new()
    for sx, sy in ((-1, -1), (1, 1)):
        p0 = Vector((sx * ex, sy * ey, -1.0))
        bm.faces.new([bm.verts.new(p0 + d) for d in (Vector((0, 0, 0)), Vector((-sx * 1e-3, 0, 0)), Vector((0, -sy * 1e-3, 0)))])
    return obj_de('marcos', bm, mat('j/pedraEscura'))


def jardim_acolhedor():
    reset()
    p = pecas_do_jardim()
    p.append(_marcos_simetricos(p))
    # Dois materiais no cenário inteiro: o chão (sem sombra) e o resto, com a cor nos vértices.
    chao = mat_vc('jardim-chao', 0.93, sem_sombra=True)
    resto = mat_vc('jardim-cor', 0.86, dupla=True)
    miudo = mat_vc('jardim-miudo', 0.86, sem_sombra=True, dupla=True)
    soltos = [o for o in p if chao not in list(o.data.materials)]
    assar_cores([o for o in soltos if not o.get('jardimSemSombra')], resto)
    assar_cores([o for o in soltos if o.get('jardimSemSombra')], miudo)
    exportar_estatico('jardim-acolhedor', p)


TODOS = ['jardim-acolhedor']
