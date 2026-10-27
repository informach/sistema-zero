"""Chave, veleiro e personagem da Ilha do Farol.

- Chave dourada (`chave-farol.svg`): argola grossa, haste na diagonal e dois dentes. Fica de pé,
  de frente para a câmera; ~1 de lado, como a atual.
- Veleiro: a forma da referência da autora (`referencias/veleiro.glb`), com a vela branca na proa
  (-X, o lado da ilhota, para onde o barco anda no fim). Referencial do Molda: linha d'água perto
  de z = 0.
- Aventureiro (`player-farol.svg`): cabeção, cabelo preto espetado, camiseta branca, short azul e
  tênis. Caixa de ~0,8 x 1,58 x 0,65, a mesma área de contato do atual; o jogo não gira o modelo,
  então ele fica de frente para a câmera, virado um pouco para o farol (+X), como no desenho.
"""
from lib_ilha import *


# ── Chave ────────────────────────────────────────────────────────────────────
def _chave(m_ouro, extra=None):
    p = []
    # Montada deitada (haste para +X, dentes para cima) e depois inclinada 45° como no desenho.
    p.append(torus(0.24, 0.085, (-0.3, 0, 0), m_ouro, seg=40, rseg=14, rot=(R(90), 0, 0)))
    p.append(cyl(0.07, 0.12, (-0.03, 0, 0), m_ouro, verts=20, rot=(0, R(90), 0), bevel=0.015))
    p.append(cyl(0.062, 0.62, (0.27, 0, 0), m_ouro, verts=20, rot=(0, R(90), 0)))
    p.append(sphere(0.07, (0.58, 0, 0), m_ouro, subdiv=2))
    for x, h in ((0.36, 0.2), (0.52, 0.26)):
        p.append(box((0.1, 0.11, h), (x, 0, h / 2 + 0.02), m_ouro, bevel=0.025))
    if extra:
        p += extra
    for o in p:
        o.location = Matrix.Rotation(R(45), 4, 'Y') @ o.location
        o.rotation_euler.y += R(45)
    return p


def chave_dourada():
    reset()
    export('chave-dourada', _chave('chaveOuro'))


# ── Veleiro ──────────────────────────────────────────────────────────────────
# Forma da referência da autora (`referencias/veleiro.glb`, feita no Molda): casco em elipse
# simétrico de 2,86 x 1,04, borda cor de areia, miolo azul-marinho, mastro um pouco à frente do
# centro, vela branca na proa (-X, o lado da ilhota) e amarela atrás, bandeira vermelha de rabo
# de andorinha e duas vigias de cada lado. O acabamento é daqui.
CX, CY = 1.43, 0.52          # meio comprimento e meia largura do casco
Z_FUNDO, Z_BORDA = -0.36, 0.17
XM = 0.15                    # mastro


def _meia_largura(x):
    return CY * max(0.0, 1 - (x / CX) ** 2) ** 0.55


def _fundo(x):
    return Z_FUNDO + 0.34 * (abs(x) / CX) ** 2.2


def _casco_pt(x, a, out=1.0):
    """Ponto do casco na estação x; a de 0 (borda de -Y) a pi (borda de +Y)."""
    w, zb = _meia_largura(x), _fundo(x)
    # Seção cheia (expoente baixo): laterais quase retas, como o casco da referência.
    return (x, -w * abs(math.cos(a)) ** 0.35 * math.copysign(1, math.cos(a)) * out, Z_BORDA - (Z_BORDA - zb) * math.sin(a) ** 2.2)


def veleiro():
    reset()
    p = []
    NX, NA = 32, 16
    xs = [CX * math.sin(math.pi * (i / NX - 0.5)) for i in range(NX + 1)]  # mais estações nas pontas
    bm = bmesh.new()
    rows = [[bm.verts.new(_casco_pt(x, math.pi * k / NA)) for k in range(NA + 1)] for x in xs]
    for i in range(NX):
        for k in range(NA):
            bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    casco = lib_q._obj('casco', bm, 'cascoRef')
    shade_auto(casco, 55)
    p.append(casco)
    # Miolo azul-marinho (o convés fundo do desenho) e a borda arredondada cor de areia.
    miolo = blob(0, 0, CX - 0.17, CY - 0.12, n=48, wob=0.0)
    p.append(slab(miolo, Z_BORDA - 0.06, Z_BORDA + 0.08, 'cascoMiolo'))
    aro = [(CX * math.cos(t), CY * math.sin(t)) for t in (2 * math.pi * i / 64 for i in range(65))]
    p.append(tube([(x * 0.995, y * 0.995, Z_BORDA + 0.035) for x, y in aro], [0.055] * len(aro), 'cascoBorda', seg=8, cap=False))
    # Frisos das tábuas, acompanhando o casco nos dois lados.
    for a in (0.5, 0.95):
        for lado in (a, math.pi - a):
            linha = [_casco_pt(x, lado, 1.01) for x in xs[2:-2]]
            p.append(tube(linha, [0.011] * len(linha), 'cascoLinha', seg=4))
    # Vigias: aro de bronze, vidro azul e um brilho, duas de cada lado (como na referência).
    for x in (-0.48, 0.55):
        for s, a in ((-1, 0.55), (1, math.pi - 0.55)):
            px, py, pz = _casco_pt(x, a, 1.0)
            p.append(torus(0.085, 0.024, (px, py + s * 0.01, pz), 'bronze', seg=16, rseg=6, rot=(R(90), 0, 0)))
            p.append(cyl(0.068, 0.02, (px, py + s * 0.005, pz), 'vigiaVidro', verts=14, rot=(R(90), 0, 0)))
            p.append(sphere(0.016, (px - 0.02, py + s * 0.02, pz + 0.025), 'olho', subdiv=1))
    # Mastro com bolinha dourada e as duas velas estufadas.
    p.append(cyl(0.045, 2.55, (XM, 0, Z_BORDA - 0.05 + 1.275), 'mastroRef', verts=12, r2=0.033))
    p.append(sphere(0.06, (XM, 0, 2.68), 'ouro', subdiv=2))
    p.append(_vela((XM + 0.06, 0.46), (XM + 0.06, 2.38), (1.68, 0.98), 'ouro', -0.16))
    p.append(_vela((XM - 0.07, 2.36), (XM - 0.07, 0.42), (-0.99, 0.6), 'vela', -0.12))
    # Cabos finos do topo do mastro à proa e à popa.
    for xp in (-CX + 0.08, CX - 0.08):
        p.append(tube([(XM, 0, 2.5), (xp, 0, Z_BORDA + 0.06)], [0.008, 0.008], 'mastroRef', seg=4))
    # Bandeira vermelha de rabo de andorinha, ondulada.
    flag = prism([(0, 0), (0.47, 0.0), (0.36, 0.08), (0.47, 0.16), (0, 0.16)], 0.018,
                 (XM + 0.02, 0, 2.47), 'bandeira')
    for v in flag.data.vertices:
        v.co.y += 0.045 * math.sin(v.co.x * 10)
    p.append(flag)
    export('veleiro', p)


def _vela(a, b, c, m, billow, n=10):
    """Vela triangular A (pé no mastro), B (topo), C (ponta), estufada para Y por `billow`."""
    bm = bmesh.new()
    A, B, C = (Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1])), Vector((c[0], 0, c[1])))
    rows = []
    for i in range(n + 1):
        t = i / n  # 0 na base (A–C), 1 no topo (B)
        row = []
        for j in range(n + 1):
            s = j / n
            base = A.lerp(C, s)
            q = base.lerp(B, t)
            q.y = billow * math.sin(math.pi * s) * (1 - t) ** 0.6 * math.sin(math.pi * min(1, t + 0.15)) ** 0.3
            row.append(bm.verts.new(q))
        rows.append(row)
    for i in range(n):
        for j in range(n):
            bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('vela', bm, m)
    for f in o.data.polygons:
        f.use_smooth = True
    # Espessura fininha: a vela não some quando vista de lado.
    sol = o.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.02
    lib_q._apply(o, sol)
    return o


# ── Aventureiro ──────────────────────────────────────────────────────────────
def _rosto(cz, fy=-0.3):
    """Olhos grandes com pupila virada para o lado do farol (+X), brilho, nariz e sorriso aberto."""
    p = []
    for s in (-1, 1):
        ex = s * 0.135
        p.append(ellipsoid((ex, fy + 0.02, cz + 0.02), (0.078, 0.04, 0.1), 'olho', seg=14, ring=8))
        p.append(ellipsoid((ex + 0.024, fy - 0.012, cz + 0.005), (0.038, 0.02, 0.06), 'pupila', seg=10, ring=6))
        p.append(sphere(0.015, (ex + 0.04, fy - 0.03, cz + 0.04), 'olho', subdiv=1))
    p.append(ellipsoid((0.01, fy - 0.005, cz - 0.075), (0.042, 0.035, 0.036), 'pele', seg=12, ring=8))
    boca = [(0.085 * math.cos(math.pi + math.pi * i / 12), 0.06 * math.sin(math.pi + math.pi * i / 12)) for i in range(13)]
    p.append(prism(boca, 0.03, (0.025, fy + 0.005, cz - 0.15), 'boca', bevel=0.008))
    return p


def _cabelo(cz):
    """Touca, nuca, franja varrida para o lado e espetos no alto, como o cabelo do desenho."""
    p = [superellipsoid((0.74, 0.66, 0.44), (0, 0.05, cz + 0.17), 'cabelo', e1=0.6, e2=0.55, seg=24, ring=12),
         superellipsoid((0.73, 0.34, 0.58), (0, 0.15, cz + 0.02), 'cabelo', e1=0.55, e2=0.55)]
    for s in (-1, 1):  # costeletas, atrás das orelhas
        p.append(superellipsoid((0.08, 0.26, 0.34), (s * 0.335, 0.1, cz + 0.06), 'cabelo', e1=0.6, e2=0.6))
    for k in range(5):  # franja varrida para o lado
        x = -0.24 + 0.12 * k
        p.append(lock((x, -0.19, cz + 0.33), (-0.3, -0.6, -1), 0.21 + 0.03 * (k % 2), 0.105, 'cabelo',
                      bend=(-0.09, -0.03, 0.03)))
    for x, y, d, L in ((-0.18, 0.04, (-0.5, 0.15, 1), 0.2), (0.0, -0.04, (-0.1, -0.15, 1), 0.24),
                       (0.17, 0.04, (0.45, 0.1, 1), 0.2), (0.02, 0.2, (0.0, 0.75, 0.75), 0.24),
                       (-0.24, 0.2, (-0.6, 0.6, 0.5), 0.17)):
        p.append(lock((x, y, cz + 0.32), d, L, 0.115, 'cabelo', bend=(0, 0.05, -0.03)))
    p.append(lock((0.0, 0.3, cz + 0.1), (0, 1, -0.4), 0.18, 0.11, 'cabelo', bend=(0, 0, -0.05)))
    return p


def aventureiro():
    reset()
    p = []
    # Tênis preto de sola branca, pernas, short azul.
    for s in (-1, 1):
        x = s * 0.1
        p.append(superellipsoid((0.16, 0.27, 0.11), (x, -0.035, 0.065), 'sapato', e1=0.5, e2=0.5, flat_bottom=0.25))
        p.append(superellipsoid((0.17, 0.28, 0.05), (x, -0.035, 0.022), 'camiseta', e1=0.4, e2=0.5, flat_bottom=0.3))
        p.append(cyl(0.05, 0.16, (x, 0.0, 0.17), 'pele', verts=16))
    p.append(superellipsoid((0.38, 0.27, 0.22), (0, 0.0, 0.34), 'short', e1=0.5, e2=0.6, flat_bottom=0.15))
    for s in (-1, 1):
        p.append(cyl(0.088, 0.12, (s * 0.095, 0.0, 0.265), 'short', verts=18, r2=0.1, bevel=0.015))
    # Camiseta branca, mangas curtas, braços e mãos.
    p.append(superellipsoid((0.38, 0.27, 0.32), (0, 0.0, 0.56), 'camiseta', e1=0.55, e2=0.6))
    p.append(cyl(0.075, 0.08, (0, 0, 0.72), 'pele', verts=16))
    for s in (-1, 1):
        p.append(superellipsoid((0.15, 0.17, 0.15), (s * 0.21, 0, 0.63), 'camiseta', e1=0.7, e2=0.7, rot=(0, R(-s * 25), 0)))
        p.append(tube([(s * 0.235, 0, 0.6), (s * 0.26, -0.01, 0.48), (s * 0.26, -0.02, 0.41)],
                      [0.046, 0.043, 0.04], 'pele', seg=8))
        p.append(sphere(0.058, (s * 0.262, -0.02, 0.38), 'pele', subdiv=2))
    cz = 1.0
    p.append(superellipsoid((0.68, 0.6, 0.62), (0, 0, cz), 'pele', e1=0.55, e2=0.6, seg=28, ring=16))
    for s in (-1, 1):  # orelhas
        p.append(ellipsoid((s * 0.335, -0.04, cz - 0.03), (0.045, 0.065, 0.08), 'pele', seg=14, ring=8))
    p += _rosto(cz)
    p += _cabelo(cz)
    place(p, rot_z=R(25))
    export('aventureiro', p)


TODOS = ['chave-dourada', 'veleiro', 'aventureiro']
