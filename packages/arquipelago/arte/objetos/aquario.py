"""O aquário de casa (footprint 2 × 1, frente para -Y): o pedido do Recife Coral.

Nós:
- `aquario`: o móvel com duas portinhas, o vidro (material `vidro`), a água (`agua`, translúcida),
  a areia com pedrinhas, as plantas, uma pedra, o baú aberto com moedas e a barra de luz de cima
  (material `luz`);
- `peixe-1` a `peixe-4` (palhaço, cirurgião-azul, amarelo e rosa), cada um com o pivô no meio do
  corpo e a cabeça para +X no repouso;
- `bolha-1` a `bolha-6`, as bolhas que saem do baú e somem na superfície.

Clipe `nadar` (6 s, em laço): os peixes dão voltas em alturas diferentes (um faz um oito), com o
rabinho balançando, e as bolhas sobem do baú. Tudo cabe dentro da água.
"""
import random

from lib_objetos import *

LM, FM, AM = 1.5, 0.62, 0.6          # móvel
LV, FV = 1.4, 0.56                   # vidro (por fora)
Z_VIDRO = 0.64
A_VIDRO = 0.70
EV = 0.012                           # espessura do vidro
Z_AGUA = 1.27                        # superfície da água
LA, FA = LV - 2 * EV - 0.008, FV - 2 * EV - 0.008     # água (folga do vidro)
LR, FR = LA - 0.008, FA - 0.008                       # areia (folga da água)
Z_FUNDO = Z_VIDRO + EV
BAU = (0.4, -0.08)
QUADROS = 144                        # 6 s a 24 quadros


def altura_areia(x, y):
    """A areia sobe para o fundo e tem dunas suaves."""
    t = (y + FR / 2) / FR
    return (Z_FUNDO + 0.05 + 0.06 * t ** 1.4 + 0.012 * math.sin(x * 7.0 + 1.3) * (0.5 + t)
            + 0.008 * math.cos(x * 13.0 - y * 9.0))


def areia():
    nx, ny = 18, 7
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = -LR / 2 + LR * i / nx
            y = -FR / 2 + FR * j / ny
            verts.append((x, y, altura_areia(x, y)))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    # Laterais e fundo: o contorno da grade descendo até o chão do vidro.
    borda = ([j * 0 + i for i in range(nx + 1)] + [j * (nx + 1) + nx for j in range(1, ny + 1)] +
             [ny * (nx + 1) + i for i in range(nx - 1, -1, -1)] + [j * (nx + 1) for j in range(ny - 1, 0, -1)])
    base = len(verts)
    for k in borda:
        x, y, _ = verts[k]
        verts.append((x, y, Z_FUNDO + 0.002))
    n = len(borda)
    for k in range(n):
        a, b = borda[k], borda[(k + 1) % n]
        faces.append((b, a, base + k, base + (k + 1) % n))
    faces.append(tuple(base + k for k in range(n)))
    o = malha('areia', verts, faces, 'areiaAquario', liso=True)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    for p in o.data.polygons:
        p.use_smooth = p.normal.z > 0.5
    return o


def movel():
    p = [caixa_redonda((LM, FM, AM - 0.11), (0, 0, 0.08 + (AM - 0.11) / 2), 'aquarioMovel', raio=0.035, segs=3)]
    p.append(caixa_redonda((LM - 0.06, FM - 0.06, 0.09), (0, 0, 0.045), 'aquarioAro', raio=0.02, segs=2))
    p.append(caixa_redonda((LM + 0.03, FM + 0.03, 0.045), (0, 0, AM - 0.0225), 'madeiraClara', raio=0.015, segs=2))
    # Duas portinhas com puxador redondo e um friso no meio.
    for s in (-1, 1):
        x = s * (LM / 4 + 0.005)
        p.append(caixa_redonda((LM / 2 - 0.08, 0.025, AM - 0.24), (x, -FM / 2 - 0.006, 0.08 + (AM - 0.12) / 2 + 0.005),
                               'aquarioMovelClaro', raio=0.02, segs=2))
        p.append(lib_q.sphere(0.022, (x - s * (LM / 4 - 0.1), -FM / 2 - 0.03, 0.36), 'madeiraClara', subdiv=2,
                              scale=(1, 0.7, 1)))
        # Um peixinho recortado em cada porta.
        pts = [(0.05, 0), (0.0, 0.028), (-0.035, 0.012), (-0.06, 0.03), (-0.055, 0), (-0.06, -0.03),
               (-0.035, -0.012), (0.0, -0.028)]
        if s > 0:
            pts = [(-x2, z2) for x2, z2 in pts][::-1]
        p.append(prism(pts, 0.008, (x, -FM / 2 - 0.022, 0.33), 'aquarioAro', bevel=0.002))
    return p


def vidro():
    zc = Z_VIDRO + A_VIDRO / 2
    v = box((LV, FV, A_VIDRO), (0, 0, zc), 'vidro', bevel=0.004, segs=1)
    miolo = box((LV - 2 * EV, FV - 2 * EV, A_VIDRO), (0, 0, zc + EV), 'vidro', bevel=0.0)
    booleana(v, miolo)
    p = [v]
    # Aro de baixo e aro de cima (a moldura que segura o vidro).
    aro = caixa_redonda((LV + 0.04, FV + 0.04, 0.06), (0, 0, AM + 0.03), 'aquarioAro', raio=0.02, segs=2)
    p.append(aro)
    zt = Z_VIDRO + A_VIDRO
    cima = caixa_redonda((LV + 0.03, FV + 0.03, 0.04), (0, 0, zt - 0.01), 'aquarioAro', raio=0.012, segs=2)
    furo = box((LV - 0.04, FV - 0.04, 0.2), (0, 0, zt), 'aquarioAro', bevel=0.0)
    booleana(cima, furo)
    p.append(cima)
    # Barra de luz atravessada no fundo de cima.
    yb = FV / 2 - 0.07
    p.append(caixa_redonda((LV + 0.05, 0.09, 0.035), (0, yb, zt + 0.03), 'aquarioAro', raio=0.012, segs=2))
    p.append(box((LV - 0.1, 0.05, 0.012), (0, yb, zt + 0.008), 'luz', bevel=0.004, segs=1))
    return p


def agua():
    z0 = Z_FUNDO + 0.03
    return [box((LA, FA, Z_AGUA - z0), (0, 0, (Z_AGUA + z0) / 2), 'agua', bevel=0.0)]


def no_chao(x, y):
    return altura_areia(x, y)


def decoracao():
    rnd = random.Random(7)
    p = []
    # Pedrinhas coloridas espalhadas.
    for k in range(16):
        x = rnd.uniform(-LR / 2 + 0.06, LR / 2 - 0.06)
        y = rnd.uniform(-FR / 2 + 0.04, FR / 2 - 0.08)
        if abs(x - BAU[0]) < 0.12 and abs(y - BAU[1]) < 0.1:
            continue
        r = rnd.uniform(0.016, 0.026)
        p.append(esfera(r, (x, y, no_chao(x, y) + r * 0.25), f'pedrinha{1 + k % 4}', escala=(1.2, 1, 0.6), seg=7,
                        aneis=4))
    # Pedra grande com musgo, à esquerda.
    p.append(lib_ilha.rock((-0.3, 0.05, no_chao(-0.3, 0.05) - 0.03), (0.22, 0.16, 0.09), 'pedraClara', seed=5,
                           subdiv=1, rough=0.2, top_m='plantaClara'))
    p.append(lib_ilha.rock((-0.19, 0.12, no_chao(-0.19, 0.12) - 0.02), (0.12, 0.1, 0.075), 'pedra', seed=9, subdiv=1,
                           rough=0.2))
    # Algas altas nos cantos do fundo (fitas onduladas).
    for cx, cy, n in ((-0.55, 0.17, 4), (0.56, 0.16, 3), (0.05, 0.2, 3)):
        for k in range(n):
            a = 2 * math.pi * k / n + cx
            bx, by = cx + math.cos(a) * 0.035, cy + math.sin(a) * 0.025
            h = rnd.uniform(0.32, 0.46)
            z0 = no_chao(bx, by) - 0.01
            pts = [(bx + 0.025 * math.sin(t * 5 + k), by + 0.01 * math.cos(t * 4 + k), z0 + h * t) for t in
                   (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
            alga = tube(pts, [0.016, 0.017, 0.016, 0.014, 0.01, 0.004], ('planta', 'plantaEscura')[k % 2], seg=6)
            alga.scale = (1, 0.45, 1)
            p.append(alga)
    # Planta de folhas largas na frente, à esquerda.
    bx, by = -0.56, -0.17
    z0 = no_chao(bx, by)
    for k in range(7):
        yaw = 2 * math.pi * k / 7 + 0.3
        p.append(lib_ilha.leaf((bx, by, z0), yaw, 0.1 + 0.02 * (k % 3), 0.03, 'plantaClara' if k % 2 else 'planta',
                               lift=0.02, droop=-0.01, fold=0.3, pitch=1.1, n=7))
    # Coral rosa ao lado da pedra e uma estrela-do-mar na areia da frente.
    cx, cy = -0.12, 0.18
    z0 = no_chao(cx, cy) - 0.01
    ramos = [((0, 0, 0), (0.0, 0.0, 0.12)), ((0, 0, 0.05), (0.05, 0.01, 0.13)), ((0, 0, 0.04), (-0.05, -0.01, 0.11)),
             ((0.03, 0.005, 0.09), (0.06, 0.0, 0.16)), ((0, 0, 0.09), (-0.02, 0.02, 0.17))]
    for (a, b) in ramos:
        a = (cx + a[0], cy + a[1], z0 + a[2])
        b = (cx + b[0], cy + b[1], z0 + b[2])
        p.append(tube([a, b], [0.014, 0.01], 'pedrinha1', seg=6))
        p.append(lib_q.sphere(0.011, b, 'pedrinha1', subdiv=1))
    sx, sy = 0.12, -0.17
    estrela = prism(lib_q.star_pts(0.035, 0.015), 0.012, (sx, sy, no_chao(sx, sy) + 0.004), 'peixeLaranja',
                    rot=(R(90), 0, R(20)), bevel=0.004)
    p.append(estrela)
    # O baú aberto, com moedas (as bolhas saem dele).
    x, y = BAU
    z = no_chao(x, y) - 0.01
    p.append(box((0.15, 0.1, 0.075), (x, y, z + 0.0375), 'bauMadeira', bevel=0.01, segs=2))
    p.append(box((0.1, 0.07, 0.01), (x, y, z + 0.0735), 'bauMiolo', bevel=0.0))
    for s in (-1, 1):
        p.append(box((0.018, 0.11, 0.09), (x + s * 0.05, y, z + 0.0375), 'bauFaixa', bevel=0.004, segs=1))
    tampa = meio_cilindro(0.15, 0.05, 0, 'bauMadeiraClara', seg=8, achatado=0.7)
    tampa.rotation_euler = (R(-115), 0, 0)
    tampa.location = (x, y + 0.058, z + 0.078)
    p.append(tampa)
    for k in range(6):
        a = k * 2.1
        p.append(cyl(0.016, 0.006, (x + math.cos(a) * 0.035, y + math.sin(a) * 0.02, z + 0.08 + 0.004 * (k % 2)),
                     'tesouro', verts=10, rot=(R(12 * (k % 3)), 0, 0)))
    return p


# ---------------------------------------------------------------- peixes
def peixe(corpo, barbatana, s=1.0, listras=None, olho_r=0.011):
    """Peixinho fofo com a cabeça para +X, centrado na origem."""
    p = [esfera(0.055 * s, (0, 0, 0), corpo, escala=(1, 0.42, 0.66), seg=12, aneis=8)]
    if listras:
        for x in (0.018 * s, -0.022 * s):
            p.append(esfera(0.04 * s, (x, 0, 0), listras, escala=(0.22, 0.6, 0.96), seg=10, aneis=6))
    rabo = [(0, 0), (-0.045, 0.032), (-0.032, 0), (-0.045, -0.032)]
    p.append(prism([(a * s, b * s) for a, b in rabo], 0.008 * s, (-0.045 * s, 0, 0), barbatana, bevel=0.002))
    dorsal = [(-0.025, 0), (0.012, 0), (-0.03, 0.028)]
    p.append(prism([(a * s, b * s) for a, b in dorsal], 0.006 * s, (0, 0, 0.03 * s), barbatana, bevel=0.002))
    for lado in (-1, 1):
        f = prism([(0, 0), (-0.03 * s, 0.006 * s), (-0.022 * s, -0.012 * s)], 0.005 * s, (0.005 * s, lado * 0.02 * s,
                  -0.01 * s), barbatana)
        f.rotation_euler = (lado * R(25), 0, lado * R(-25))
        p.append(f)
        p.append(esfera(olho_r * s, (0.03 * s, lado * 0.016 * s, 0.008 * s), 'peixeBranco', seg=8, aneis=5))
        p.append(esfera(olho_r * 0.6 * s, (0.035 * s, lado * 0.022 * s, 0.009 * s), 'olhoPeixe', seg=6, aneis=4))
    return p


def caminho(i, t):
    """Posição (x, y, z) do peixe i no tempo t de 0 a 1 (uma volta do clipe)."""
    w = 2 * math.pi * t
    if i == 0:
        return (0.48 * math.cos(w), 0.12 * math.sin(w), 0.99 + 0.006 * math.sin(2 * w))
    if i == 1:
        return (0.1 + 0.3 * math.cos(-w + 1.0), 0.09 * math.sin(-w + 1.0) - 0.02, 1.135 + 0.006 * math.sin(3 * w))
    if i == 2:
        return (0.44 * math.sin(w), 0.11 * math.sin(2 * w), 0.86 + 0.006 * math.sin(w))
    return (-0.5 + 0.09 * math.cos(2 * w + 2.0), 0.07 * math.sin(2 * w + 2.0) - 0.01, 1.2 + 0.005 * math.sin(4 * w))


def chaves_do_peixe(i):
    loc, rot = [], []
    passo = 2
    ang_ant = None
    for q in range(0, QUADROS + 1, passo):
        t = q / QUADROS
        x, y, z = caminho(i, t)
        x2, y2, _ = caminho(i, t + 0.002)
        ang = math.atan2(y2 - y, x2 - x)
        if ang_ant is not None:
            while ang - ang_ant > math.pi:
                ang -= 2 * math.pi
            while ang - ang_ant < -math.pi:
                ang += 2 * math.pi
        ang_ant = ang
        rabo = R(8) * math.sin(2 * math.pi * 12 * t + i)
        loc.append((q, (x, y, z)))
        rot.append((q, (0, 0, ang + rabo)))
    return {'location': loc, 'rotation_euler': rot, '_linear': True}


PERIODO_BOLHA = 48     # 2 s por subida: três subidas por volta do clipe


def chaves_da_bolha(i, n):
    x0, y0 = BAU
    z0 = no_chao(x0, y0) + 0.08
    z1 = Z_AGUA - 0.015
    loc, esc = [], []
    for q in range(0, QUADROS + 1):
        f = (q + i * PERIODO_BOLHA // n) % PERIODO_BOLHA
        fase = f / PERIODO_BOLHA
        z = z0 + (z1 - z0) * fase
        x = x0 + 0.012 * math.sin(fase * 9 + i) - 0.01
        y = y0 + 0.008 * math.cos(fase * 7 + i)
        if f == PERIODO_BOLHA - 1:
            s = 0.0                # some na superfície antes de voltar para o baú
        else:
            s = max(0.0, min(1.0, fase / 0.1, (1 - fase) / 0.12)) * (0.6 + 0.5 * fase)
        loc.append((q, (x, y, z)))
        esc.append((q, (s, s, s)))
    return {'location': loc, 'scale': esc, '_linear': True}


def aquario():
    nos = {'aquario': movel() + vidro() + [areia()] + decoracao() + agua()}
    clipe = {}
    tipos = [('peixeLaranja', 'peixeLaranja', 1.3, 'peixeBranco'), ('peixeAzul', 'peixeAmarelo', 1.35, None),
             ('peixeAmarelo', 'peixeLaranja', 1.15, None), ('peixeRosa', 'peixeRoxo', 1.0, None)]
    for i, (c, b, s, lst) in enumerate(tipos):
        objs = peixe(c, b, s, lst)
        pos = caminho(i, 0)
        mover(objs, pos)
        nome = f'peixe-{i + 1}'
        nos[nome] = (objs, pos)
        clipe[nome] = chaves_do_peixe(i)
    n = 6
    for i in range(n):
        ch = chaves_da_bolha(i, n)
        pos = ch['location'][0][1]
        b = [esfera(0.016, pos, 'bolha', seg=7, aneis=5)]
        nome = f'bolha-{i + 1}'
        nos[nome] = (b, pos)
        clipe[nome] = ch
    return {'nos': nos, 'clipes': {'nadar': clipe}, 'grupo': 'aquario'}


ITENS = [('aquario', aquario)]

if __name__ == '__main__':
    rodar(ITENS)
