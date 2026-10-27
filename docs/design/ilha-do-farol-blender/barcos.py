"""Os outros três barcos da Chave do Farol em 3D (o veleiro mora em `objetos.py`).

Cores e peças de cada desenho 2D (`studio/src/arte/assets/farol/{barco-de-pesca,lancha,
barco-pirata}.svg`). Todos com a proa em -X, como o veleiro (o lado para onde o barco anda no fim),
a linha d'água em z = 0 e a MESMA caixa do veleiro (`CAIXAS['barco']`): na personalização a troca
do modelo não muda o tamanho nem a área de toque. A lancha e o barco pirata estão com a proa à
direita no 2D; aqui ficam espelhados para andar para o mesmo lado.
"""
from lib_ilha import *


def c(hexa, rug=0.75):
    chave = 'b' + hexa.lstrip('#')
    lib_q.PALETTE.setdefault(chave, (hexa, rug, None, 0))
    return chave


def _casco(cx, cy, borda, fundo, faixas, x_fim=None, ponta_proa=0.55, ponta_popa=0.55, secao=0.35,
           nx=36, na=14, nome='casco'):
    """Casco aberto em cima, de -cx (proa) a `x_fim` (popa; menor que cx corta a popa reta, com o
    espelho fechado). `borda(x)` e `fundo(x)` dão a altura da borda e da quilha. `faixas` pinta o
    casco em faixas que acompanham a borda: [(fração da altura até onde vai, material), ...], de 0
    (borda) a 1 (quilha). Devolve o objeto e a função do ponto (x, a) para encaixar peças."""
    x_fim = cx if x_fim is None else x_fim

    def meia(x):
        p = ponta_proa if x < 0 else ponta_popa
        return cy * max(0.0, 1 - (x / cx) ** 2) ** p

    def pt(x, a, fora=1.0):
        zt, zb = borda(x), fundo(x)
        y = -meia(x) * abs(math.cos(a)) ** secao * math.copysign(1, math.cos(a)) * fora
        return (x, y, zt - (zt - zb) * math.sin(a) ** 2.2)

    # Ângulos: uniformes e mais as divisas das faixas (cor certinha na linha da faixa).
    meio = {math.pi / 2 * k / na for k in range(na + 1)}
    for f, _ in faixas[:-1]:
        meio.add(math.asin(f ** (1 / 2.2)))
    meio = sorted(meio)
    angs = meio + [math.pi - a for a in reversed(meio[:-1])]
    t0 = math.asin(-cx / cx) if False else -math.pi / 2
    t1 = math.asin(min(1.0, x_fim / cx))
    xs = [cx * math.sin(t0 + (t1 - t0) * i / nx) for i in range(nx + 1)]
    mats = [m for _, m in faixas]
    bm = bmesh.new()
    rows = [[bm.verts.new(pt(x, a)) for a in angs] for x in xs]
    for i in range(nx):
        for k in range(len(angs) - 1):
            f = bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
            am = (angs[k] + angs[k + 1]) / 2
            prof = math.sin(am) ** 2.2
            f.material_index = next(j for j, (lim, _) in enumerate(faixas) if prof <= lim + 1e-6)
    if x_fim < cx:
        # Espelho da popa: fecha o U da última estação, pintado faixa a faixa como o resto.
        ult = rows[-1]
        c0 = bm.verts.new((x_fim, 0, borda(x_fim)))
        for k in range(len(angs) - 1):
            f = bm.faces.new((ult[k], ult[k + 1], c0))
            am = (angs[k] + angs[k + 1]) / 2
            prof = math.sin(am) ** 2.2
            f.material_index = next(j for j, (lim, _) in enumerate(faixas) if prof <= lim + 1e-6)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj(nome, bm, mats[0])
    for m in mats[1:]:
        o.data.materials.append(lib_q.mat(m))
    shade_auto(o, 55)
    return o, pt, meia


def _convés(meia, x0, x1, z, m, folga=0.06, n=40):
    """Tampo do convés seguindo o contorno do casco, um pouco para dentro."""
    xs = [x0 + (x1 - x0) * i / n for i in range(n + 1)]
    lado = [(x, -max(0.0, meia(x) - folga)) for x in xs]
    pts = lado + [(x, -y) for x, y in reversed(lado)]
    return slab(pts, z - 0.05, z, m, name='conves')


def _aro(pt, xs, m, r=0.045):
    """Friso arredondado na borda, dos dois lados."""
    out = []
    for a in (0.0, math.pi):
        linha = [pt(x, a, 1.0) for x in xs]
        out.append(tube(linha, [r] * len(linha), m, seg=8))
    return out


def _vigia(pos, s, aro, vidro, r=0.075):
    x, y, z = pos
    return [torus(r, r * 0.28, (x, y + s * 0.01, z), aro, seg=16, rseg=6, rot=(R(90), 0, 0)),
            cyl(r * 0.8, 0.02, (x, y + s * 0.004, z), vidro, verts=14, rot=(R(90), 0, 0))]


# ── Barco de pesca ───────────────────────────────────────────────────────────
def barco_de_pesca():
    reset()
    azul, fundo_az, branco = c('#346d8e'), c('#24516d'), c('#e8edf6', 0.6)
    marinho, vidro, madeira, vermelho = c('#293f61', 0.5), c('#94d5f5', 0.2), c('#61432f'), c('#e05245', 0.6)
    p = []
    borda = lambda x: 0.36 + 0.22 * (max(0.0, -x) / 1.45) ** 2 + 0.04 * (max(0.0, x) / 1.45) ** 2
    fundo = lambda x: -0.34 + 0.3 * (abs(x) / 1.45) ** 2.4
    casco, pt, meia = _casco(1.45, 0.56, borda, fundo,
                             [(0.1, branco), (0.36, azul), (0.5, branco), (0.74, azul), (1.0, fundo_az)],
                             x_fim=1.3, ponta_proa=0.6, ponta_popa=0.3)
    p.append(casco)
    p.append(_convés(meia, -1.3, 1.3, 0.3, c('#c9d3df')))
    p += _aro(pt, [-1.45 + 2.75 * i / 40 for i in range(41)], branco, 0.04)
    # Cabine branca de teto vermelho, janelas azul-marinho com o reflexo azul-claro.
    cx0 = -0.25
    p.append(box((0.8, 0.7, 0.78), (cx0, 0, 0.3 + 0.39), branco, bevel=0.04))
    p.append(box((1.0, 0.86, 0.09), (cx0, 0, 1.12), vermelho, bevel=0.03))
    for s in (-1, 1):
        for dx in (-0.18, 0.18):
            p.append(box((0.22, 0.03, 0.26), (cx0 + dx, s * 0.355, 0.86), marinho, bevel=0.02))
            p.append(box((0.025, 0.012, 0.15), (cx0 + dx - 0.04, s * 0.37, 0.88), vidro, bevel=0.004,
                         rot=(0, R(-30), 0)))
    p.append(box((0.03, 0.5, 0.26), (cx0 - 0.405, 0, 0.86), marinho, bevel=0.02))  # janela da frente
    # Chaminé azul-marinho e a fumacinha branca.
    p.append(cyl(0.085, 0.36, (cx0 - 0.18, 0.05, 1.32), marinho, verts=16, bevel=0.02))
    fumo = c('#e8edf6', 0.95)
    for (dx, dz, r) in ((-0.05, 1.68, 0.1), (-0.2, 1.8, 0.13), (-0.38, 1.86, 0.09)):
        p.append(sphere(r, (cx0 - 0.18 + dx, 0.05, dz), fumo, scale=(1.25, 0.8, 0.9), subdiv=2))
    # Guindaste de madeira na popa com a rede verde pendurada.
    mx = 0.42
    p.append(cyl(0.045, 1.7, (mx, 0.1, 0.3 + 0.85), madeira, verts=12))
    p.append(tube([(mx, 0.1, 1.9), (1.32, 0.1, 1.45)], [0.035, 0.03], madeira, seg=8))
    p.append(tube([(1.32, 0.1, 1.45), (1.36, 0.1, 0.98)], [0.008, 0.008], madeira, seg=4))
    rede = superellipsoid((0.32, 0.18, 0.42), (1.36, 0.1, 0.78), c('#3b747e', 0.9), e1=0.5, e2=0.7)
    p.append(rede)
    linha = c('#94d5f5', 0.6)
    for k in range(3):
        z = 0.66 + 0.11 * k
        p.append(tube([(1.21, 0.0, z + 0.05), (1.51, 0.0, z - 0.05)], [0.007, 0.007], linha, seg=4))
    p.append(tube([(1.26, 0.0, 0.62), (1.46, 0.0, 0.96)], [0.007, 0.007], linha, seg=4))
    # Boia salva-vidas vermelha e branca no costado, dos dois lados.
    for s, a in ((-1, 0.62), (1, math.pi - 0.62)):
        x, y, z = pt(0.42, a, 1.0)
        p.append(torus(0.14, 0.045, (x, y + s * 0.02, z), vermelho, seg=24, rseg=8, rot=(R(90), 0, 0)))
        for k in range(4):
            ang = R(45 + 90 * k)
            p.append(torus(0.14, 0.05, (x, y + s * 0.02, z), branco, seg=6, rseg=8, arc=26,
                           rot=(R(90), ang, 0)))
    exportar_na_caixa('barco-de-pesca', p, 'barco')


# ── Lancha ───────────────────────────────────────────────────────────────────
def lancha():
    reset()
    branco, vermelho, marinho = c('#e8edf6', 0.45), c('#e05245', 0.5), c('#293f61', 0.5)
    vidro, vidro2 = c('#94d5f5', 0.15), c('#b8e8f6', 0.15)
    p = []
    borda = lambda x: 0.32 + 0.16 * (max(0.0, -x) / 1.5) ** 1.6
    fundo = lambda x: -0.26 + 0.42 * (max(0.0, -x) / 1.5) ** 2 + 0.02 * (max(0.0, x) / 1.5)
    casco, pt, meia = _casco(1.5, 0.58, borda, fundo,
                             [(0.12, branco), (0.42, vermelho), (0.56, branco), (1.0, marinho)],
                             x_fim=1.22, ponta_proa=0.9, ponta_popa=0.25, secao=0.25)
    p.append(casco)
    p.append(_convés(meia, -1.38, 1.22, 0.3, branco))
    p += _aro(pt, [-1.5 + 2.72 * i / 40 for i in range(41)], branco, 0.035)
    # Cabine do para-brisa: moldura azul-marinho em trapézio (a frente inclinada para a proa), os
    # vidros azuis na frente e dos lados e a capota branca arredondada em cima.
    xw, base = -0.3, 0.3
    perfil = [(-0.32, 0), (0.42, 0), (0.42, 0.5), (0.04, 0.5)]
    p.append(prism([(x + xw, z + base) for x, z in perfil], 0.8, (0, 0, 0), marinho, bevel=0.02))
    for s in (-1, 1):  # vidros dos lados, um pouco para fora da moldura
        lado = [(-0.2, 0.07), (0.33, 0.07), (0.33, 0.43), (0.06, 0.43)]
        vid = prism([(x + xw, z + base) for x, z in lado], 0.02, (0, s * 0.405, 0), vidro2)
        p.append(vid)
    frente = Vector((0.04 - (-0.32), 0, 0.5))
    ang = math.atan2(frente.z, frente.x)
    for dy in (-0.2, 0.2):  # dois vidros na frente, separados pelo montante
        vid = box((frente.length * 0.78, 0.34, 0.02), (0, 0, 0), vidro, bevel=0.005)
        vid.rotation_euler = (0, -ang, 0)
        vid.location = (xw - 0.14 - 0.012, dy, base + 0.25 + 0.012)
        p.append(vid)
    p.append(box((0.62, 0.9, 0.06), (xw + 0.2, 0, base + 0.53), branco, bevel=0.03))  # capota
    # Banco vermelho atrás do para-brisa.
    p.append(box((0.36, 0.7, 0.2), (xw + 0.82, 0, base + 0.1), vermelho, bevel=0.05))
    p.append(box((0.1, 0.7, 0.34), (xw + 0.98, 0, base + 0.25), vermelho, bevel=0.04))
    # Motor de popa azul-marinho.
    p.append(box((0.24, 0.3, 0.42), (1.36, 0, 0.42), marinho, bevel=0.08))
    p.append(box((0.08, 0.1, 0.5), (1.4, 0, 0.0), marinho, bevel=0.03))
    p.append(cone(0.07, 0.12, (1.4, 0, -0.27), marinho, verts=12, rot=(R(180), 0, 0)))
    p.append(box((0.26, 0.31, 0.04), (1.36, 0, 0.64), vermelho, bevel=0.015))
    # Corrimão na proa.
    for s in (-1, 1):
        linha = [(x, s * (meia(x) - 0.05), borda(x) + 0.12) for x in (-1.3, -1.0, -0.7)]
        p.append(tube(linha, [0.015] * 3, c('#c9d3df', 0.3), seg=6))
    exportar_na_caixa('lancha', p, 'barco')


# ── Barco pirata ─────────────────────────────────────────────────────────────
def barco_pirata():
    reset()
    madeira, escura, ouro = c('#835d3f'), c('#61432f'), c('#f3b123', 0.4)
    marinho, vela, creme, vermelho = c('#19283d', 0.5), c('#293248', 0.85), c('#f3e5c7', 0.85), c('#e05245', 0.6)
    p = []
    borda = lambda x: 0.4 + 0.18 * (max(0.0, -x) / 1.4) ** 2 + 0.1 * (max(0.0, x) / 1.4) ** 2
    fundo = lambda x: -0.36 + 0.36 * (abs(x) / 1.4) ** 2.2
    casco, pt, meia = _casco(1.4, 0.56, borda, fundo,
                             [(0.08, ouro), (0.3, madeira), (0.44, ouro), (0.78, madeira), (1.0, escura)],
                             x_fim=1.3, ponta_proa=0.6, ponta_popa=0.35)
    p.append(casco)
    p.append(_convés(meia, -1.3, 1.3, 0.34, escura))
    p += _aro(pt, [-1.4 + 2.7 * i / 40 for i in range(41)], ouro, 0.04)
    # Vigias azul-marinho, três de cada lado.
    for x in (-0.55, -0.05, 0.45):
        for s, a in ((-1, 0.95), (1, math.pi - 0.95)):
            p += _vigia(pt(x, a, 1.0), s, escura, marinho, r=0.08)
    # Castelo de popa: caixa de madeira com o friso dourado.
    p.append(box((0.5, 0.86, 0.42), (1.02, 0, 0.62), madeira, bevel=0.04))
    p.append(box((0.56, 0.92, 0.07), (1.02, 0, 0.86), ouro, bevel=0.025))
    for s in (-1, 1):
        p.append(box((0.3, 0.02, 0.14), (1.02, s * 0.43, 0.62), escura, bevel=0.01))
    # Gurupés na proa com o enfeite dourado.
    p.append(tube([(-1.0, 0, 0.55), (-1.46, 0, 0.78)], [0.04, 0.03], escura, seg=8))
    p.append(tube([(-1.32, 0, 0.6), (-1.42, 0, 0.98)], [0.025, 0.018], ouro, seg=6))
    p.append(cone(0.05, 0.1, (-1.43, 0, 1.03), ouro, verts=8, rot=(0, R(-14), 0)))
    # Mastro grande e a vela escura de frente, com a faixa vermelha e a caveira.
    xm = 0.05
    p.append(cyl(0.05, 2.25, (xm, 0.12, 0.34 + 1.125), escura, verts=12, r2=0.04))
    p.append(tube([(xm - 0.62, 0.06, 2.3), (xm + 0.62, 0.06, 2.3)], [0.03, 0.03], escura, seg=8))
    larg, alto = 1.18, 1.5
    bm = bmesh.new()
    n = 10
    rows = []
    for i in range(n + 1):
        t = i / n
        row = []
        for j in range(n + 1):
            u = j / n
            w = larg * (1 - 0.1 * t)  # um pouco mais larga em cima, como no desenho
            x = xm + (u - 0.5) * w
            z = 2.26 - alto * t
            y = -0.2 * math.sin(math.pi * u) * math.sin(math.pi * min(1.0, 0.15 + t)) ** 0.8
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for i in range(n):
        for j in range(n):
            bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    sail = lib_q._obj('vela', bm, vela)
    for f in sail.data.polygons:
        f.use_smooth = True
    sol = sail.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.02
    lib_q._apply(sail, sol)
    p.append(sail)

    def na_vela(u, t, frente=0.03):
        w = larg * (1 - 0.1 * t)
        y = -0.2 * math.sin(math.pi * u) * math.sin(math.pi * min(1.0, 0.15 + t)) ** 0.8
        return (xm + (u - 0.5) * w, y - frente, 2.26 - alto * t)

    faixa = [na_vela(j / 16, 0.07, 0.02) for j in range(17)]
    p.append(tube(faixa, [0.07] * len(faixa), vermelho, seg=6))
    # Caveira com os ossos cruzados.
    cxv, cyv, czv = na_vela(0.5, 0.42, 0.04)
    p.append(sphere(0.17, (cxv, cyv - 0.02, czv + 0.05), creme, scale=(1, 0.5, 0.95), subdiv=3))
    p.append(box((0.17, 0.08, 0.1), (cxv, cyv - 0.02, czv - 0.1), creme, bevel=0.03))
    for s in (-1, 1):
        p.append(sphere(0.045, (cxv + s * 0.065, cyv - 0.09, czv + 0.06), marinho, scale=(1, 0.5, 1.1), subdiv=2))
    for s in (-1, 1):
        a, b = (cxv - 0.26, cyv - 0.03, czv - 0.36 * (1 if s > 0 else 0) - 0.12 + 0.12 * s), None
        ini = (cxv - 0.26, cyv - 0.04, czv - 0.24 + s * 0.12)
        fim = (cxv + 0.26, cyv - 0.04, czv - 0.24 - s * 0.12)
        p.append(tube([ini, fim], [0.035, 0.035], creme, seg=8))
        for q in (ini, fim):
            for d in (-1, 1):
                p.append(sphere(0.04, (q[0], q[1], q[2] + d * 0.035), creme, subdiv=2))
    # Bandeira vermelha no alto do mastro.
    flag = prism([(0, 0), (0.42, 0.02), (0.32, 0.1), (0.42, 0.19), (0, 0.19)], 0.018, (xm + 0.03, 0.12, 2.4), vermelho)
    for v in flag.data.vertices:
        v.co.y += 0.04 * math.sin(v.co.x * 10)
    p.append(flag)
    p.append(sphere(0.05, (xm, 0.12, 2.62), ouro, subdiv=2))
    # Mastro pequeno da popa com a vela creme triangular.
    xp = 1.12
    p.append(cyl(0.035, 1.25, (xp, 0.1, 0.86 + 0.62), escura, verts=10))
    from objetos import _vela
    p.append(_vela((xp - 0.05, 1.0), (xp - 0.05, 2.0), (xp - 0.5, 1.02), creme, -0.1, n=8))
    exportar_na_caixa('barco-pirata', p, 'barco')


TODOS = ['barco-de-pesca', 'lancha', 'barco-pirata']
