"""Chave, veleiro e personagem da Ilha do Farol.

- Chave dourada (`chave-farol.svg`): argola grossa, haste na diagonal e dois dentes. Fica de pé,
  de frente para a câmera; ~1 de lado, como a atual.
- Veleiro (`veleiro.svg`): casco de madeira com friso e vigias douradas, convés azul-marinho, vela
  branca na proa (-X, o lado da ilhota, para onde o barco anda no fim) e amarela atrás. Da
  referência da autora (`referencias/veleiro.glb`) veio só o acabamento: friso mais cheio e o
  brilho nas vigias. Linha d'água perto de z = 0.
- Aventureiro (`player-farol.svg`): cabeção, cabelo preto espetado, camiseta branca, short azul e
  tênis. Caixa de ~0,8 x 1,58 x 0,65, a mesma área de contato do atual; o jogo não gira o modelo,
  então ele fica de frente para a câmera, virado um pouco para o farol (+X), como no desenho.
"""
from lib_ilha import *


# ── Chave ────────────────────────────────────────────────────────────────────
def _chave(m_ouro, extra=None, cabeca=None):
    p = []
    # Montada deitada (haste para +X, dentes para cima) e depois inclinada 45° como no desenho.
    if cabeca is None:
        p.append(torus(0.24, 0.085, (-0.3, 0, 0), m_ouro, seg=40, rseg=14, rot=(R(90), 0, 0)))
    else:
        p += cabeca
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
    exportar_na_caixa('chave-dourada', _chave('chaveOuro'), 'chave')


def _cor(hexa, rug=0.5):
    chave = 'k' + hexa.lstrip('#')
    lib_q.PALETTE.setdefault(chave, (hexa, rug, None, 0))
    return chave


def _contorno(o, hexa, esp=0.022):
    """Contorno de desenho (o traço escuro da `chave-prateada.svg`): uma casca um pouco maior, de
    normais viradas e só com a face de trás à vista, atrás da peça."""
    me = o.data.copy()
    casca = bpy.data.objects.new('contorno', me)
    bpy.context.collection.objects.link(casca)
    casca.matrix_world = o.matrix_world
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * esp
    for f in bm.faces:
        f.normal_flip()
    bm.to_mesh(me)
    bm.free()
    m = lib_q.mat(_cor(hexa, 0.6)).copy()
    m.name = 'contorno' + hexa.lstrip('#')
    m.use_backface_culling = True
    me.materials.clear()
    me.materials.append(m)
    return casca


def chave_prateada():
    reset()
    corpo = join(_chave(_cor('#dce5ef', 0.3)), 'chave')
    exportar_na_caixa('chave-prateada', [corpo, _contorno(corpo, '#46536e')], 'chave')


def chave_de_estrela():
    reset()
    lilas = _cor('#bc7be8', 0.45)
    # Estrela de cinco pontas gordinha no lugar da argola, de pé depois do giro de 45° da chave.
    pts = []
    for i in range(10):
        r = 0.34 if i % 2 == 0 else 0.17
        a = math.pi / 2 + math.pi * i / 5 + R(45)
        pts.append((-0.27 + r * math.cos(a), r * math.sin(a)))
    estrela = prism(pts, 0.13, (0, 0, 0), lilas, bevel=0.035)
    miolo = cyl(0.085, 0.03, (-0.27, -0.065, 0), _cor('#613886', 0.5), verts=28, rot=(R(90), 0, 0), bevel=0.01)
    exportar_na_caixa('chave-de-estrela', _chave(lilas, cabeca=[estrela, miolo]), 'chave')


# ── Veleiro ──────────────────────────────────────────────────────────────────
X0, X1 = -1.5, 1.42  # proa e popa


def _w(u):
    return 0.6 * math.sin(math.pi / 2 * min(u / 0.62, 1)) ** 0.75 - (0.1 * ((u - 0.62) / 0.38) ** 2 if u > 0.62 else 0)


def _ztop(u):
    return 0.24 + 0.3 * (1 - u) ** 3 + 0.1 * u ** 4


def _zbot(u):
    return -0.36 + 0.5 * (1 - min(u / 0.4, 1)) ** 2 + 0.14 * u ** 3


def _casco_pt(u, a, out=1.0):
    """Ponto do casco: u de 0 (proa) a 1 (popa); a de 0 (borda de -Y) a pi (borda de +Y)."""
    w, zt, zb = _w(u), _ztop(u), _zbot(u)
    return (X0 + (X1 - X0) * u, -w * math.cos(a) * out, zt - (zt - zb) * math.sin(a) ** 0.55)


def veleiro():
    reset()
    p = []
    NU, NA = 28, 16
    us = [(i / NU) ** 0.85 for i in range(NU + 1)]
    bm = bmesh.new()
    rows = [[bm.verts.new(_casco_pt(u, math.pi * k / NA)) for k in range(NA + 1)] for u in us]
    for i in range(NU):
        for k in range(NA):
            bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
    bm.faces.new(rows[-1])  # espelho de popa
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    casco = lib_q._obj('casco', bm, 'casco')
    shade_auto(casco, 50)
    p.append(casco)
    # Convés escuro (o "miolo" do barco no desenho), um pouco abaixo da borda.
    borda_e = [_casco_pt(u, 0.12) for u in us[1:]]
    borda_d = [_casco_pt(u, math.pi - 0.12) for u in us[1:]]
    deck = [(x, y) for x, y, _ in borda_e] + [(x, y) for x, y, _ in reversed(borda_d)]
    zdeck = min(z for _, _, z in borda_e) - 0.05
    p.append(slab(deck, zdeck - 0.03, zdeck, 'marinho'))
    # Friso dourado em volta da borda e frisos das tábuas.
    friso = [_casco_pt(u, 0.0, 1.02) for u in us] + [_casco_pt(u, math.pi, 1.02) for u in reversed(us)]
    p.append(tube(friso, [0.045] * len(friso), 'ouro', seg=8, cap=False))
    for a in (0.62, 1.0):
        for lado in (a, math.pi - a):
            linha = [_casco_pt(u, lado, 1.012) for u in us[2::2]]
            p.append(tube(linha, [0.012] * len(linha), 'cascoLinha', seg=4))
    # Vigias douradas dos dois lados.
    for u in (0.32, 0.47, 0.62):
        for s, a in ((-1, 0.38), (1, math.pi - 0.38)):
            x, y, z = _casco_pt(u, a, 1.0)
            p.append(torus(0.068, 0.02, (x, y + s * 0.006, z), 'ouro', seg=14, rseg=5, rot=(R(90), 0, 0)))
            p.append(cyl(0.055, 0.02, (x, y + s * 0.004, z), 'marinho', verts=12, rot=(R(90), 0, 0)))
            p.append(sphere(0.014, (x - 0.018, y + s * 0.016, z + 0.02), 'olho', subdiv=1))
    # Mastro, retranca e as duas velas.
    xm = -0.1
    p.append(cyl(0.045, 2.5, (xm, 0, zdeck + 1.25), 'mastro', verts=12, r2=0.032))
    p.append(sphere(0.06, (xm, 0, zdeck + 2.52), 'ouro', subdiv=2))
    p.append(cyl(0.03, 1.32, (xm + 0.66, 0, zdeck + 0.42), 'mastro', verts=10, rot=(0, R(90), 0)))
    p.append(_vela((xm + 0.06, zdeck + 0.5), (xm + 0.06, zdeck + 2.38), (xm + 1.34, zdeck + 0.5), 'ouro', -0.16))
    p.append(_vela((xm - 0.08, zdeck + 2.25), (xm - 0.08, zdeck + 0.42), (X0 + 0.22, zdeck + 0.42 + 0.1), 'vela', -0.12))
    # Cabos finos: do topo do mastro à proa e à popa.
    p.append(tube([(xm, 0, zdeck + 2.42), (X0 + 0.12, 0, _ztop(0.02) + 0.02)], [0.008, 0.008], 'mastro', seg=4))
    p.append(tube([(xm, 0, zdeck + 2.42), (X1 - 0.05, 0, _ztop(1.0) + 0.02)], [0.008, 0.008], 'mastro', seg=4))
    # Bandeira vermelha de rabo de andorinha, ondulada.
    flag = prism([(0, 0), (0.5, 0.0), (0.38, 0.1), (0.5, 0.2), (0, 0.2)], 0.018,
                 (xm + 0.04, 0, zdeck + 2.3), 'bandeira')
    for v in flag.data.vertices:
        v.co.y += 0.05 * math.sin(v.co.x * 9)
    p.append(flag)
    exportar_na_caixa('veleiro', p, 'barco')


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
def _rosto(cz, fy=-0.3, pele='pele', cilios=None):
    """Olhos grandes com pupila virada para o lado do farol (+X), brilho, nariz e sorriso aberto.
    `cilios` (material) acrescenta três cílios em cada olho, como nas meninas do desenho."""
    p = []
    for s in (-1, 1):
        ex = s * 0.135
        p.append(ellipsoid((ex, fy + 0.02, cz + 0.02), (0.078, 0.04, 0.1), 'olho', seg=14, ring=8))
        p.append(ellipsoid((ex + 0.024, fy - 0.012, cz + 0.005), (0.038, 0.02, 0.06), 'pupila', seg=10, ring=6))
        p.append(sphere(0.015, (ex + 0.04, fy - 0.03, cz + 0.04), 'olho', subdiv=1))
        if cilios:
            for k in (-1, 0, 1):
                ax = ex + s * 0.05 + k * 0.022
                p.append(tube([(ax, fy + 0.0, cz + 0.11), (ax + s * 0.02 + k * 0.01, fy - 0.01, cz + 0.16)],
                              [0.008, 0.004], cilios, seg=4))
    p.append(ellipsoid((0.01, fy - 0.005, cz - 0.075), (0.042, 0.035, 0.036), pele, seg=12, ring=8))
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


# Juntas do boneco (o mesmo esqueleto para todos os personagens): pivô de cada parte.
QUADRIL, OMBRO, PESCOCO = 0.33, 0.64, 0.74


def _boneco_base(cores):
    """Corpo comum dos personagens, em partes: {parte: [objetos]}. `cores` troca a roupa:
    camiseta, manga, short, sapato e sola (nomes de materiais da paleta); opcionais: pele, perna
    (a cor da perna: pele ou calça comprida), mao e saia (no lugar do short)."""
    pele = cores.get('pele', 'pele')
    perna_m = cores.get('perna', pele)
    saia = cores.get('saia')
    partes = {'Corpo': [], 'Cabeca': [], 'PernaE': [], 'PernaD': [], 'BracoE': [], 'BracoD': []}
    for s, lado in ((-1, 'E'), (1, 'D')):
        x = s * 0.1
        perna = partes['Perna' + lado]
        perna.append(superellipsoid((0.16, 0.27, 0.11), (x, -0.035, 0.065), cores['sapato'], e1=0.5, e2=0.5, flat_bottom=0.25))
        perna.append(superellipsoid((0.17, 0.28, 0.05), (x, -0.035, 0.022), cores['sola'], e1=0.4, e2=0.5, flat_bottom=0.3))
        perna.append(cyl(0.05 if perna_m == pele else 0.06, 0.2, (x, 0.0, 0.19), perna_m, verts=16))
        if not saia:
            perna.append(cyl(0.088, 0.12, (s * 0.095, 0.0, 0.265), cores['short'], verts=18, r2=0.1, bevel=0.015))
        braco = partes['Braco' + lado]
        braco.append(superellipsoid((0.15, 0.17, 0.15), (s * 0.21, 0, 0.63), cores['manga'], e1=0.7, e2=0.7, rot=(0, R(-s * 25), 0)))
        braco.append(tube([(s * 0.235, 0, 0.6), (s * 0.26, -0.01, 0.48), (s * 0.26, -0.02, 0.41)],
                          [0.046, 0.043, 0.04], pele, seg=8))
        braco.append(sphere(0.058, (s * 0.262, -0.02, 0.38), cores.get('mao', pele), subdiv=2))
    if saia:
        # Saia rodada em vez do short: tronco de cone que abre para baixo.
        partes['Corpo'].append(cyl(0.2, 0.2, (0, 0, 0.33), saia, verts=24, r2=0.17, bevel=0.02))
    else:
        partes['Corpo'].append(superellipsoid((0.38, 0.27, 0.22), (0, 0.0, 0.34), cores['short'], e1=0.5, e2=0.6, flat_bottom=0.15))
    partes['Corpo'].append(superellipsoid((0.38, 0.27, 0.32), (0, 0.0, 0.56), cores['camiseta'], e1=0.55, e2=0.6))
    partes['Corpo'].append(cyl(0.075, 0.08, (0, 0, 0.72), pele, verts=16))
    cz = 1.0
    cab = partes['Cabeca']
    cab.append(superellipsoid((0.68, 0.6, 0.62), (0, 0, cz), pele, e1=0.55, e2=0.6, seg=28, ring=16))
    for s in (-1, 1):  # orelhas
        cab.append(ellipsoid((s * 0.335, -0.04, cz - 0.03), (0.045, 0.065, 0.08), pele, seg=14, ring=8))
    cab += _rosto(cz, pele=pele, cilios=cores.get('cilios'))
    return partes


ALTURA = 1.58  # a do aventureiro: todo personagem tem a mesma altura (trocar não muda o tamanho)


def _animar_boneco(pid, partes):
    """Junta cada parte numa malha com o pivô na junta, monta a hierarquia (tudo pendurado no
    Corpo) e grava os clipes do Jogo 3D:

    - `parado` (2 s, laço): respira, os braços balançam de leve e a cabeça inclina um pouco;
    - `andando` (0,5 s, laço): pernas e braços em passada alternada, o corpo sobe a cada passo e
      inclina um pouco para a frente.

    A frente olha para a câmera (+Z no jogo). Quem vira o boneco para o lado em que anda é o jogo
    ("virar para a direção do movimento"), por isso não há giro embutido."""
    # Mesma altura para todos: o chapéu ou a antena entram na conta e o boneco encolhe um pouco.
    todos = [o for objs in partes.values() for o in objs]
    bpy.context.view_layer.update()
    zmax = max((o.matrix_world @ Vector(c)).z for o in todos for c in o.bound_box)
    k = ALTURA / zmax
    place(todos, scale=k)
    pivos = {'Corpo': (0, 0, QUADRIL), 'Cabeca': (0, 0, PESCOCO), 'PernaE': (-0.1, 0, QUADRIL),
             'PernaD': (0.1, 0, QUADRIL), 'BracoE': (-0.21, 0, OMBRO), 'BracoD': (0.21, 0, OMBRO)}
    pivos = {n: tuple(c * k for c in v) for n, v in pivos.items()}
    obj = {}
    for nome, objs in partes.items():
        o = join(objs, nome)
        px, py, pz = pivos[nome]
        o.data.transform(Matrix.Translation((-px, -py, -pz)))
        o.location = (px, py, pz)
        obj[nome] = o
    corpo = obj['Corpo']
    bpy.context.view_layer.update()
    for nome, o in obj.items():
        if nome != 'Corpo':
            o.parent = corpo
            o.location = Vector(pivos[nome]) - Vector(pivos['Corpo'])
    z0 = QUADRIL * k
    caixa_da_categoria(list(obj.values()), corpo, 'personagem', pid)

    def rx(graus):
        return (R(graus), 0, 0)

    clipes({
        'andando': {
            corpo: {'location': [(0, (0, 0, z0)), (3, (0, 0, z0 + 0.035)), (6, (0, 0, z0)),
                                 (9, (0, 0, z0 + 0.035)), (12, (0, 0, z0))],
                    'rotation_euler': [(0, rx(5)), (3, rx(7)), (6, rx(5)), (9, rx(7)), (12, rx(5))]},
            obj['Cabeca']: {'rotation_euler': [(0, rx(-3)), (3, rx(-1)), (6, rx(-3)), (9, rx(-1)), (12, rx(-3))]},
            obj['PernaE']: {'rotation_euler': [(0, rx(-32)), (6, rx(32)), (12, rx(-32))]},
            obj['PernaD']: {'rotation_euler': [(0, rx(32)), (6, rx(-32)), (12, rx(32))]},
            obj['BracoE']: {'rotation_euler': [(0, rx(35)), (6, rx(-35)), (12, rx(35))]},
            obj['BracoD']: {'rotation_euler': [(0, rx(-35)), (6, rx(35)), (12, rx(-35))]},
        },
        'parado': {
            corpo: {'location': [(0, (0, 0, z0)), (24, (0, 0, z0 + 0.012)), (48, (0, 0, z0))]},
            obj['Cabeca']: {'rotation_euler': [(0, (0, 0, 0)), (24, (0, R(4), R(3))), (48, (0, 0, 0))]},
            obj['BracoE']: {'rotation_euler': [(0, (0, 0, 0)), (24, (R(-3), R(4), 0)), (48, (0, 0, 0))]},
            obj['BracoD']: {'rotation_euler': [(0, (0, 0, 0)), (24, (R(-3), R(-4), 0)), (48, (0, 0, 0))]},
        },
    })
    # Repouso: de pé e parado.
    corpo.location = (0, 0, z0)
    for o in obj.values():
        o.rotation_euler = (0, 0, 0)
    exportar_animado(pid, list(obj.values()))


def aventureiro():
    reset()
    partes = _boneco_base({'camiseta': 'camiseta', 'manga': 'camisetaSombra', 'short': 'short',
                           'sapato': 'sapato', 'sola': 'camiseta'})
    partes['Cabeca'] += _cabelo(1.0)
    _animar_boneco('aventureiro', partes)


TODOS = ['chave-dourada', 'chave-prateada', 'chave-de-estrela', 'veleiro', 'aventureiro']
