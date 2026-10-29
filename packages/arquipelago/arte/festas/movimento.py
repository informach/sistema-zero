"""Kit de movimento: cipó, equipamento de mergulho, planador e patins (`src/assets/movimento/`).

- `cipo`: nó `cipo` com o pivô no alto (onde ele se prende no galho) e o clipe `balancar`
  (2 s, em laço). O vazio `pegada` (filho do `cipo`) marca onde a mão segura e acompanha o
  balanço; o vazio `topo` marca o ponto de prender no galho.
- `mergulho`: máscara com snorkel e os dois pés de pato, já na posição em que ficam no corpo do
  avatar (origem nos pés dele). Nós `mascara`, `pe-de-pato-esq` e `pe-de-pato-dir`; vazios
  `cabeca`, `pe-esq` e `pe-dir` no lugar dos ossos `mixamorig:Head`, `LeftFoot` e `RightFoot`.
- `planador`: asa-delta infantil. Nós `planador` (estrutura e barra), `asa-esq` e `asa-dir`;
  vazio `pegada` no meio da barra (filho do `planador`); clipe `planar` (2 s, em laço: a estrutura
  sobe e desce e as asas flexionam).
- `patins`: um par de patins de bota. Nós `patim-esq` e `patim-dir`; vazios `pe-esq` e `pe-dir`
  (os ossos dos pés). Fica no referencial das peças do avatar, com a origem nos pés: o jogo faz da
  bota uma malha com o esqueleto (o pé leva a sola e as rodas, a canela leva o cano) e esconde o
  calçado do avatar. As rodinhas ficam 0,11 abaixo da sola (`RODAS_ABAIXO_DA_SOLA` no jogo).
"""
from lib_festas import *

# O avatar do jogo tem 1,6 de altura: 0,751 da altura do Armature.glb (2,13).
AV = 0.751
CABECA = (0.0, 0.0, 1.347 * AV)  # mixamorig:Head
PE = {'esq': (0.206 * AV, 0.0, 0.085 * AV), 'dir': (-0.232 * AV, 0.0, 0.085 * AV)}  # LeftFoot / RightFoot


def cipo():
    L = 2.4
    p = []
    pts = [(0.03 * math.sin(k * 1.3), 0.025 * math.cos(k * 0.9), L - L * k / 12 * 0.9) for k in range(13)]
    p.append(tube(pts, [0.036 - 0.004 * k / 12 for k in range(13)], 'cipo', seg=8))
    # Cipó fino enrolado em espiral no grosso.
    esp = []
    for k in range(40):
        t = k / 39
        z = L - t * L * 0.88
        a = t * math.pi * 9
        esp.append((pts[0][0] + 0.04 * math.cos(a), pts[0][1] + 0.04 * math.sin(a), z))
    p.append(tube(esp, [0.012] * len(esp), 'cipoEscuro', seg=5))
    for k, (z, yaw) in enumerate(((2.1, 0.4), (1.7, 2.6), (1.35, 4.4), (0.95, 1.2), (2.3, 3.6))):
        p.append(leaf((0.0, 0.0, z), yaw, 0.2, 0.07, 'folhaCipo', lift=0.04, droop=0.12, n=6))
    # Nó e o pau de segurar.
    zb = L - L * 0.9
    p.append(lib_q.torus(0.06, 0.03, (0, 0, zb), 'cipo', seg=12, rseg=6, rot=(R(90), 0, 0)))
    p.append(cyl(0.032, 0.44, (0, 0, zb - 0.07), 'pegadaCipo', verts=10, rot=(0, R(90), 0), bevel=0.01))
    for s in (-1, 1):
        p.append(cyl(0.036, 0.04, (s * 0.2, 0, zb - 0.07), 'cipoEscuro', verts=10, rot=(0, R(90), 0)))
    balancar = {'cipo': {'rotation_euler': [(0, (0, 0, 0)), (12, (R(22), 0, 0)), (24, (0, 0, 0)),
                                            (36, (R(-22), 0, 0)), (48, (0, 0, 0))]}}
    return {'nos': {'cipo': (p, (0, 0, L))}, 'vazios': {'pegada': (0, 0, zb - 0.07), 'topo': (0, 0, L)},
            'pais': {'pegada': 'cipo'}, 'clipes': {'balancar': balancar}, 'grupo': 'movimento', 'pasta': 'movimento'}


def mergulho():
    # Máscara: armação arredondada na frente dos olhos, vidro, alça em volta da cabeça e snorkel.
    zc, yf = 1.25, -0.335
    m = [superellipsoid((0.46, 0.09, 0.2), (0, yf, zc), 'mascaraBorracha', e1=0.35, e2=0.35, seg=18, ring=8)]
    m.append(superellipsoid((0.38, 0.03, 0.14), (0, yf - 0.035, zc + 0.005), 'mascaraVidro', e1=0.3, e2=0.3,
                            seg=16, ring=6))
    m.append(box((0.05, 0.05, 0.05), (0, yf - 0.04, zc - 0.075), 'mascaraBorracha', bevel=0.015, segs=1))
    alca = lib_q.torus(1.0, 0.022, (0, -0.01, zc + 0.02), 'mascaraBorracha', seg=28, rseg=6)
    alca.scale = (0.385, 0.335, 1)
    m.append(alca)
    sn = [(-0.08, yf - 0.06, 1.1), (-0.25, yf - 0.02, 1.13), (-0.37, -0.2, 1.24), (-0.39, -0.08, 1.48),
          (-0.36, -0.02, 1.7)]
    m.append(tube(sn, [0.022] * len(sn), 'snorkel', seg=8))
    m.append(cyl(0.032, 0.06, (-0.36, -0.02, 1.73), 'pePato', verts=10))
    m.append(box((0.08, 0.04, 0.04), (-0.07, yf - 0.07, 1.1), 'mascaraBorracha', bevel=0.012, segs=1))
    nos = {'mascara': (m, CABECA)}
    vazios = {'cabeca': CABECA}
    for lado, s in (('esq', 1), ('dir', -1)):
        x = PE[lado][0]
        pe = [superellipsoid((0.21, 0.29, 0.13), (x, -0.02, 0.07), 'pePato', e1=0.45, e2=0.5, seg=14, ring=8)]
        pe.append(box((0.22, 0.05, 0.03), (x, 0.1, 0.12), 'pePatoEscuro', bevel=0.012, segs=1))
        # Lâmina larga para a frente, um pouco curvada para cima na ponta.
        lam = malha('lamina', [(x - 0.09, -0.12, 0.012), (x + 0.09, -0.12, 0.012), (x + 0.16, -0.56, 0.05),
                               (x - 0.16, -0.56, 0.05), (x, -0.5, 0.035)],
                    [(0, 1, 2, 4), (0, 4, 3)], 'pePato', liso=False)
        sol = lam.modifiers.new('esp', 'SOLIDIFY')
        sol.thickness = 0.018
        lib_q._apply(lam, sol)
        pe.append(lam)
        for k in (-1, 0, 1):
            pe.append(tube([(x + k * 0.06, -0.16, 0.03), (x + k * 0.11, -0.52, 0.065)], [0.012, 0.009],
                           'pePatoEscuro', seg=5))
        nos[f'pe-de-pato-{lado}'] = (pe, PE[lado])
        vazios[f'pe-{lado}'] = PE[lado]
    return {'nos': nos, 'vazios': vazios, 'centrar': False, 'grupo': 'movimento', 'pasta': 'movimento'}


def _metade_asa(s):
    """Uma metade da vela (s = 1 esquerda, -1 direita), em listras de três cores."""
    nariz, ponta, cauda = Vector((0, -0.85, 2.05)), Vector((s * 1.3, 0.35, 1.97)), Vector((0, 0.5, 2.02))
    nu, nv = 6, 4
    verts, faces = [], []
    for i in range(nu + 1):
        u = i / nu
        borda = nariz.lerp(ponta, u)
        tras = cauda.lerp(ponta, u)
        for j in range(nv + 1):
            v = j / nv
            q = borda.lerp(tras, v)
            q.z += 0.06 * math.sin(math.pi * v) * (1 - u) + 0.04 * math.sin(math.pi * u)  # barriga da vela
            verts.append(tuple(q))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.append((a, a + nv + 1, a + nv + 2, a + 1) if s > 0 else (a, a + 1, a + nv + 2, a + nv + 1))
    o = malha('vela', verts, faces, 'velaPlanador')
    sol = o.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = 0.012
    lib_q._apply(o, sol)
    pintar_por(o, lambda c, n: ['velaPlanador', 'velaPlanador2', 'velaPlanador3'][int(abs(c.x) / 0.44) % 3])
    tubo = tube([tuple(nariz), tuple(ponta)], [0.022, 0.018], 'tuboPlanador', seg=6)
    return [o, tubo]


def planador():
    est = [tube([(0, -0.88, 2.05), (0, 0.55, 2.02)], [0.024, 0.02], 'tuboPlanador', seg=8)]
    est.append(tube([(-0.62, -0.12, 2.0), (0.62, -0.12, 2.0)], [0.018, 0.018], 'tuboPlanador', seg=6))
    # Triângulo de controle (o "A"): dois tubos descendo e a barra de segurar.
    topo, bar = (0, -0.1, 2.0), 1.22
    for s in (-1, 1):
        est.append(tube([topo, (s * 0.38, -0.32, bar)], [0.018, 0.018], 'tuboPlanador', seg=6))
        est.append(cyl(0.028, 0.1, (s * 0.22, -0.32, bar), 'mascaraBorracha', verts=10, rot=(0, R(90), 0)))
    est.append(tube([(-0.4, -0.32, bar), (0.4, -0.32, bar)], [0.02, 0.02], 'tuboPlanador', seg=8))
    est.append(cone(0.05, 0.12, (0, -0.94, 2.05), 'velaPlanador', verts=10, rot=(R(90), 0, 0), smooth_it=True))
    est.append(box((0.1, 0.18, 0.02), (0, 0.6, 2.06), 'velaPlanador2', bevel=0.008, segs=1))
    nos = {'planador': (est, (0, -0.1, 2.0))}
    for lado, s in (('esq', 1), ('dir', -1)):
        nos[f'asa-{lado}'] = (_metade_asa(s), (0, -0.1, 2.02))
    sobe = [(0, (0, 0, 0)), (24, (0, 0, 0.05)), (48, (0, 0, 0))]
    planar = {'planador': {'location': sobe, 'rotation_euler': [(0, (0, 0, 0)), (24, (R(2), 0, 0)), (48, (0, 0, 0))]}}
    for lado, s in (('esq', 1), ('dir', -1)):
        planar[f'asa-{lado}'] = {'location': sobe, 'rotation_euler': [(0, (0, 0, 0)), (12, (0, s * R(-4), 0)),
                                                                       (24, (0, 0, 0)), (36, (0, s * R(3), 0)),
                                                                       (48, (0, 0, 0))]}
    return {'nos': nos, 'vazios': {'pegada': (0, -0.32, bar)}, 'pais': {'pegada': 'planador'},
            'clipes': {'planar': planar}, 'grupo': 'movimento', 'pasta': 'movimento'}


# ------------------------------------------------------------------ patins
# A bota é medida pelo avatar (as peças de `community-kids/public/avatar3d/parts`, já na escala do
# jogo): com o patim calçado o jogo esconde o calçado do avatar, então dentro da bota cabem o pé, a
# perna e a barra da calça ou da fantasia de bicho (de x 0,023 a 0,275 e de −0,142 a 0,159 para a
# frente, nessas medidas). Vestidos e saias longas passam por fora. A boca fica logo acima do
# tornozelo e a perna entra por ela; o cano segue a canela no jogo, então nada escapa ao andar.
PATIM = dict(
    cx=0.150,          # o meio da bota no plano, para fora (o pé esquerdo em +x)
    cy=-0.0085,        # o meio da bota na frente/trás (a frente é −y)
    a_in=0.134,        # meia largura por dentro
    b_in=0.160,        # meio comprimento por dentro
    parede=0.011,
    bico=0.008,        # o bico vai um pouco além (a ponta do pé)
    boca=0.143,        # a altura da boca na frente (logo acima do tornozelo); atrás sobe `boca_tras`
    boca_tras=0.016,
    fundo=0.02,        # o fundo acolchoado fica esta distância abaixo da boca
    n=2.3,             # o expoente da superelipse (2 = elipse, maior = mais quadrada)
    seg=28,
    sola=(-0.022, 0.010),
    roda_r=0.032,
    roda_l=0.028,
)
# As medidas de PATIM saíram das peças multiplicadas por `AV`; o avatar do jogo, porém, usa as peças
# na escala delas (conferido no jogo em 29/10/2026: do arquivo das peças ao avatar a escala é 1).
# Então o patim é desenhado nessas medidas e, no fim, crescido por `1 / AV`.
CRESCER = 1 / AV
# As rodinhas tocam o chão a esta distância abaixo da sola do avatar (`ELEVACAO_DOS_PATINS`).
ELEVACAO = 0.11
# Os ossos dos pés no referencial das peças (sem o `AV`).
PE_REAL = {lado: tuple(c / AV for c in p) for lado, p in PE.items()}


def _se(a, b, t, n):
    c, s = math.cos(t), math.sin(t)
    return (a * math.copysign(abs(c) ** (2 / n), c), b * math.copysign(abs(s) ** (2 / n), s))


def _bico(z):
    """Quanto a frente vai além do pé nesta altura: o bico arredondado é mais comprido embaixo."""
    u = max(0.0, min(1.0, (0.11 - z) / 0.11))
    return PATIM['bico'] + 0.024 * u ** 1.3


def _calcanhar(z):
    """O calcanhar abaulado embaixo (o contraforte), que some para cima."""
    u = max(0.0, min(1.0, (0.09 - z) / 0.09))
    return 0.010 * math.sin(math.pi * min(1.0, u * 1.6) / 2)


def _contorno(k, escala=1.0, folga=0.0, z=0.12):
    """Ponto `k` do contorno de fora da bota na altura `z` (frente em −y)."""
    P = PATIM
    t = 2 * math.pi * k / P['seg']
    a = (P['a_in'] + P['parede']) * escala + folga
    b = (P['b_in'] + P['parede']) * escala + folga
    x, y = _se(a, b, t, P['n'])
    if y < 0:  # a frente
        y -= _bico(z) * (abs(y) / b) ** 2
    else:  # atrás
        y += _calcanhar(z) * (y / b) ** 3
    return x, y


def _alt_boca(k):
    """A boca sobe para trás (o calcanhar segura melhor) e desce na frente."""
    P = PATIM
    t = 2 * math.pi * k / P['seg']
    tras = (math.sin(t) + 1) / 2  # 0 na frente, 1 atrás
    return P['boca'] + P['boca_tras'] * tras * tras


def _frente(k):
    """Quanto o segmento `k` está longe da ponta, de 0 (a ponta) a 1 (o calcanhar)."""
    seg = PATIM['seg']
    d = (k - 3 * seg / 4) % seg
    return min(d, seg - d) / (seg / 2)


def _faixa(k):
    """A altura da linha da faixa branca: sobe na biqueira e no contraforte, baixa nos lados."""
    u = _frente(k)
    return 0.026 + 0.042 * math.exp(-(u / 0.27) ** 2) + 0.026 * math.exp(-((1 - u) / 0.24) ** 2)


def _bota(cx):
    """A bota inteira numa malha: casco por fora, borda da boca, forro por dentro e o fundo.

    Cada coluna do casco tem os anéis na altura dela: a linha da faixa (`_faixa`) é um anel, então
    a divisa entre o branco de baixo e o lilás de cima é uma curva lisa, sem degraus. Materiais por
    face: `patimClaro` (a faixa, com biqueira e contraforte), `patim` (o cano), `patimLingua` (a
    lingueta na frente do cano) e `patimForro` (por dentro)."""
    P = PATIM
    seg, cy, t_ = P['seg'], P['cy'], P['parede']
    mats = ['patim', 'patimClaro', 'patimForro', 'patimLingua']
    bm = bmesh.new()

    def niveis(k):
        f, b = _faixa(k), _alt_boca(k)
        # Fundo arredondado, a faixa, o cano em quatro partes e a boca (um pouco aberta).
        return [(0.004, 0.975), (0.016, 0.995), (f, 1.0), (f + (b - f) * 0.28, 1.0),
                (f + (b - f) * 0.56, 0.992), (f + (b - f) * 0.8, 0.995), (b - 0.012, 1.0), (b, 1.025)]

    colunas = []
    for k in range(seg):
        col = []
        for z, e in niveis(k):
            x, y = _contorno(k, e, z=z)
            col.append(bm.verts.new((cx + x, cy + y, z)))
        colunas.append(col)
    nfora = len(colunas[0])
    fora = [[colunas[k][i] for k in range(seg)] for i in range(nfora)]
    # Por dentro: a boca e o forro até um fundo acolchoado logo abaixo dela. A perna entra pelo fundo
    # escuro e o pé fica escondido dentro da bota (olhando de cima não aparece o peito do pé).
    dentro = []
    for desce, e in ((0.004, 1.0), (P['fundo'] - 0.004, 0.995), (P['fundo'], 0.97)):
        anel = []
        for k in range(seg):
            zz = _alt_boca(k) - desce
            x, y = _contorno(k, e, -t_, z=0.12)
            anel.append(bm.verts.new((cx + x, cy + y, zz)))
        dentro.append(anel)
    fundo = bm.verts.new((cx, cy, P['boca'] + P['boca_tras'] / 2 - P['fundo']))

    def quad(a, b, k, m):
        f = bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
        f.material_index = mats.index(m)

    for i in range(nfora - 1):
        for k in range(seg):
            if i < 2:
                m = 'patimClaro'
            elif _frente(k + 0.5) < 0.07 and i < nfora - 2:
                m = 'patimLingua'
            else:
                m = 'patim'
            quad(fora[i], fora[i + 1], k, m)
    for k in range(seg):
        quad(fora[-1], dentro[0], k, 'patimForro')
    for i in range(len(dentro) - 1):
        for k in range(seg):
            quad(dentro[i], dentro[i + 1], k, 'patimForro')
    for k in range(seg):
        f = bm.faces.new((dentro[-1][k], dentro[-1][(k + 1) % seg], fundo))
        f.material_index = mats.index('patimForro')
    base = bm.verts.new((cx, cy, 0.004))
    for k in range(seg):
        bm.faces.new((fora[0][(k + 1) % seg], fora[0][k], base))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('bota')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('bota', me)
    bpy.context.collection.objects.link(o)
    for m in mats:
        o.data.materials.append(lib_q.mat(m))
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=R(60))
    return o


def _acolchoado(cx):
    """O rolo acolchoado em volta da boca, por cima da borda."""
    P = PATIM
    seg, cy, rs = P['seg'], P['cy'], 6
    r = 0.0125
    bm = bmesh.new()
    aneis = []
    for k in range(seg):
        x, y = _contorno(k, 1.025, -P['parede'] / 2, z=_alt_boca(k))
        c = Vector((cx + x, cy + y, _alt_boca(k) + 0.002))
        # Para fora: a direção do contorno no plano (do meio da bota para o ponto).
        fora = Vector((x, y, 0)).normalized()
        anel = []
        for j in range(rs):
            a = 2 * math.pi * j / rs
            anel.append(bm.verts.new(c + fora * math.cos(a) * r * 1.15 + Vector((0, 0, 1)) * math.sin(a) * r))
        aneis.append(anel)
    for k in range(seg):
        a, b = aneis[k], aneis[(k + 1) % seg]
        for j in range(rs):
            bm.faces.new((a[j], a[(j + 1) % rs], b[(j + 1) % rs], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('acolchoado', bm, 'patimClaro')
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def _laje(cx, cy, a, b, z0, z1, m, n=4.0, seg=24, chanfro=0.003, folga_bico=0.0):
    """Placa de cantos redondos (a sola, a base do chassi) com as quinas chanfradas."""
    bm = bmesh.new()
    aneis = []
    for z, enc in ((z0, chanfro), (z0 + chanfro, 0), (z1 - chanfro, 0), (z1, chanfro)):
        anel = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            x, y = _se(a - enc, b - enc, t, n)
            if y < 0:
                y -= folga_bico * (abs(y) / b) ** 2
            anel.append(bm.verts.new((cx + x, cy + y, z)))
        aneis.append(anel)
    for i in range(3):
        for k in range(seg):
            bm.faces.new((aneis[i][k], aneis[i][(k + 1) % seg], aneis[i + 1][(k + 1) % seg], aneis[i + 1][k]))
    for anel, zc in ((aneis[0], z0), (aneis[-1], z1)):
        c = bm.verts.new((cx, cy, zc))
        for k in range(seg):
            bm.faces.new((anel[k], anel[(k + 1) % seg], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = lib_q._obj('laje', bm, m)
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=R(45))
    return o


def _roda(pos):
    """Roda de patins: pneu arredondado com o cubo afundado no meio (eixo em x)."""
    P = PATIM
    r, w = P['roda_r'], P['roda_l'] / 2
    pneu = torneado([(0.017, -w), (0.026, -w), (r, -w + 0.0065), (r, w - 0.0065), (0.026, w), (0.017, w),
                     (0.017, -w)], 'roda', seg=12)
    cubo = torneado([(0, -w + 0.002), (0.018, -w + 0.003), (0.018, w - 0.003), (0, w - 0.002)], 'patimCubo',
                    seg=12)
    for o in (pneu, cubo):
        o.rotation_euler = (0, R(90), 0)
        o.location = pos
    return [pneu, cubo]


def _patim(lado):
    P = PATIM
    s = 1 if lado == 'esq' else -1
    cx, cy = s * P['cx'], P['cy']
    a = P['a_in'] + P['parede']
    b = P['b_in'] + P['parede']
    pecas = [_bota(cx), _acolchoado(cx)]
    # Sola de borracha, um tico maior que o casco (a beirada aparece).
    z0, z1 = P['sola']
    pecas.append(_laje(cx, cy, a * 1.035, b * 1.03, z0, z1, 'patimSola', n=P['n'], seg=P['seg'],
                       chanfro=0.004, folga_bico=_bico(0.0)))
    # Cadarços: três laços sobre a lingueta, seguindo a curva da bota, um pouco por fora dela, com
    # as pontas entrando no cano (sem peça solta encostada).
    for zc in (0.086, 0.104, 0.122):
        pts = []
        for j in range(7):
            k = 3 * P['seg'] / 4 + (j - 3) * 0.5
            x, y = _contorno(k, 0.998, z=zc)
            fora = Vector((x, y, 0)).normalized()
            saliente = 0.0045 if 0 < j < 6 else -0.001
            pts.append(Vector((cx + x, cy + y, zc + abs(j - 3) * 0.0012)) + fora * saliente)
        pecas.append(lib_q.tube([tuple(p) for p in pts], [0.0042] * len(pts), 'cadarco', seg=6))
    # Chassi: a base embaixo da sola, dois eixos com suporte e as quatro rodas.
    zb1 = z0
    zb0 = z0 - 0.010
    pecas.append(_laje(cx, cy, 0.064, 0.130, zb0, zb1, 'metalEscuro', n=4.0, seg=24, chanfro=0.0025))
    rz = -ELEVACAO * AV + P['roda_r']  # o meio da roda (antes de crescer)
    for dy in (-0.094, 0.094):
        y = cy + dy
        pecas.append(box((0.05, 0.034, zb0 - (rz + 0.004)), (cx, y, (zb0 + rz + 0.004) / 2), 'metalEscuro',
                         bevel=0.004, segs=1))
        pecas.append(cyl(0.0105, 0.012, (cx, y, rz + 0.006), 'freio', verts=12, bevel=0.002))
        pecas.append(cyl(0.0042, 0.136, (cx, y, rz), 'metal', verts=8, rot=(0, R(90), 0)))
        for dx in (-0.056, 0.056):
            pecas += _roda((cx + dx, y, rz))
    # Freio na ponta: haste presa na base e a borracha inclinada, um pouco acima do chão.
    yb = cy - 0.150
    pecas.append(box((0.026, 0.05, 0.022), (cx, cy - 0.124, zb0 - 0.008), 'metalEscuro', bevel=0.004, segs=1))
    pecas.append(cyl(0.024, 0.036, (cx, yb, -0.052), 'freio', verts=16, bevel=0.005, rot=(R(-28), 0, 0)))
    bpy.context.view_layer.update()
    crescer = Matrix.Scale(CRESCER, 4)
    for o in pecas:
        o.matrix_world = crescer @ o.matrix_world
    return pecas


def patins():
    nos, vazios = {}, {}
    for lado in ('esq', 'dir'):
        nos[f'patim-{lado}'] = (_patim(lado), PE_REAL[lado])
        vazios[f'pe-{lado}'] = PE_REAL[lado]
    return {'nos': nos, 'vazios': vazios, 'centrar': False, 'grupo': 'movimento', 'pasta': 'movimento'}


PECAS = [('cipo', cipo), ('mergulho', mergulho), ('planador', planador), ('patins', patins)]

if __name__ == '__main__':
    rodar(PECAS)
