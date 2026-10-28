"""Festa Junina (`src/assets/festas/junina.glb`): um arquivo com as peças lado a lado.

Nós (cada um com o pivô no meio da própria base, para o jogo copiar e espalhar):
- `bandeirinhas`: um trecho de varal de 2 de comprimento com nove bandeirinhas. Os vazios
  `ponta-esq` e `ponta-dir` marcam as pontas do barbante: o jogo emenda um trecho no outro;
- `fogueira`: lenha, pedras e o nó `fogo` (materiais `fogo` e `brasa`, emissão 1) com o clipe
  `crepitar` (1 s, em laço);
- `barraca-pescaria`, `barraca-milho`, `barraca-suco`: barracas de toldo listrado. A placa de cada
  uma tem a face lisa no material `placaFace`, para o jogo escrever;
- `balao`: balão de papel enfeitado (decorativo, preso por um fio), com a boca no material `luz`.
"""
from lib_festas import *

CORES = ['bandeiraVermelha', 'bandeiraAmarela', 'bandeiraAzul', 'bandeiraVerde', 'bandeiraRosa']
H_VARAL = 0.62  # altura das pontas do barbante sobre o pé das bandeirinhas


def bandeirinhas():
    p = []
    n, comp, flecha = 9, 2.0, 0.12

    def z(x):
        return H_VARAL - flecha * (1 - (x / (comp / 2)) ** 2)
    pts = [(-comp / 2 + comp * k / 16, 0, z(-comp / 2 + comp * k / 16)) for k in range(17)]
    p.append(tube(pts, [0.008] * len(pts), 'barbante', seg=5))
    for k in range(n):
        x = -comp / 2 + comp * (k + 0.5) / n
        w, h = 0.19, 0.26
        topo = z(x)
        f = prism([(-w / 2, 0), (w / 2, 0), (w / 2, -h), (0, -h * 0.72), (-w / 2, -h)], 0.006, (x, 0, topo - 0.004),
                  CORES[k % len(CORES)])
        f.rotation_euler = (0, 0, R((k % 3 - 1) * 6))
        deformar(f, lambda v: Vector((v.x, v.y + 0.02 * math.sin(v.x * 18), v.z)))
        p.append(f)
    return p, {'ponta-esq': (-comp / 2, 0, H_VARAL), 'ponta-dir': (comp / 2, 0, H_VARAL)}


def fogueira():
    lenha = []
    for k in range(7):
        a = 2 * math.pi * k / 7
        lenha.append(tube([(math.cos(a) * 0.42, math.sin(a) * 0.42, 0.06), (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.62)],
                          [0.055, 0.045], 'lenha', seg=7))
    for k in range(11):
        a = 2 * math.pi * k / 11 + 0.2
        lenha.append(rock((math.cos(a) * 0.6, math.sin(a) * 0.6, 0), (0.2, 0.17, 0.13), 'metalEscuro', seed=k,
                          subdiv=1))
    fogo = []
    chama = [(0, 0), (0.12, 0.06), (0.15, 0.2), (0.1, 0.38), (0.13, 0.5), (0.03, 0.78), (0.04, 0.6), (-0.02, 0.66),
             (-0.08, 0.46), (-0.13, 0.32), (-0.14, 0.14), (-0.1, 0.04)]
    for k in range(6):
        esc = 1.0 if k % 2 == 0 else 0.72
        o = prism([(x * esc * 1.5, z * esc * 1.5) for x, z in chama], 0.03, (0, 0, 0.12), 'fogo' if k % 2 == 0 else 'brasa',
                  rot=(0, 0, R(30 * k)))
        fogo.append(o)
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.3
        o = prism([(x * 0.6, z * 0.6) for x, z in chama], 0.025, (math.cos(a) * 0.17, math.sin(a) * 0.17, 0.12),
                  'brasa', rot=(0, 0, a))
        fogo.append(o)
    for k in range(9):
        a = 2 * math.pi * k / 9
        fogo.append(sphere(0.035, (math.cos(a) * 0.25, math.sin(a) * 0.25, 0.08), 'brasa', subdiv=1))
    return lenha, fogo


def _barraca(teto, cor_balcao, placa_cor):
    p = []
    L, F = 1.6, 0.9
    for x in (-L / 2 + 0.06, L / 2 - 0.06):
        for y in (-F / 2 + 0.06, F / 2 - 0.06):
            p.append(cyl(0.04, 2.0, (x, y, 1.0), 'madeira', verts=8))
    # Toldo de duas águas em listras (uma tira por listra).
    n = 8
    for s_ in (-1, 1):
        for k in range(n):
            w = (L + 0.2) / n
            x = -L / 2 - 0.1 + w * (k + 0.5)
            p.append(box((w + 0.002, F / 2 + 0.12, 0.03), (x, s_ * (F / 4 + 0.03), 2.12), teto[k % 2], bevel=0.008,
                         segs=1, rot=(s_ * R(-18), 0, 0)))
    for k in range(9):
        x = -L / 2 - 0.1 + (L + 0.2) * (k + 0.5) / 9
        aba = prism([(-0.09, 0), (0.09, 0), (0, -0.1)], 0.012, (x, -F / 2 - 0.08, 2.03), teto[k % 2])
        p.append(aba)
    # Balcão com a frente enfeitada de chita.
    p.append(box((L, 0.36, 0.9), (0, -F / 2 + 0.2, 0.45), cor_balcao, bevel=0.03, segs=1))
    p.append(box((L + 0.06, 0.42, 0.05), (0, -F / 2 + 0.2, 0.92), 'madeiraClara', bevel=0.015, segs=1))
    for k in range(6):
        p.append(cyl(0.05, 0.01, (-L / 2 + 0.15 + k * 0.26, -F / 2 + 0.015, 0.45 + 0.18 * (k % 2)), 'chitaFlor',
                     verts=8, rot=(R(90), 0, 0)))
    # Placa no alto da frente.
    p.append(box((0.9, 0.05, 0.28), (0, -F / 2 - 0.04, 1.82), placa_cor, bevel=0.02, segs=1))
    p.append(box((0.78, 0.02, 0.18), (0, -F / 2 - 0.07, 1.82), 'placaFace', bevel=0.01, segs=1))
    return p, -F / 2 + 0.2, 0.945


def barraca_pescaria():
    p, yb, zb = _barraca(('chita', 'toldoListra'), 'bandeiraAzul', 'bandeiraAmarela')
    p.append(cyl(0.34, 0.16, (0, yb, zb + 0.08), 'madeira', verts=18))
    p.append(cyl(0.31, 0.02, (0, yb, zb + 0.15), 'aguaPescaria', verts=18))
    for k in range(5):
        a = 2 * math.pi * k / 5
        pe = esfera(0.045, (math.cos(a) * 0.18, yb + math.sin(a) * 0.14, zb + 0.165), 'peixinho', escala=(1.6, 0.8, 0.5),
                    seg=8, aneis=5)
        pe.rotation_euler = (0, 0, a + R(90))
        p.append(pe)
    for s in (-1, 1):
        p.append(tube([(s * 0.55, yb - 0.05, zb), (s * 0.4, yb, zb + 0.7)], [0.012, 0.008], 'vara', seg=5))
        p.append(tube([(s * 0.4, yb, zb + 0.7), (s * 0.3, yb, zb + 0.2)], [0.003, 0.003], 'linha', seg=3))
    return p


def barraca_milho():
    p, yb, zb = _barraca(('bandeiraVerde', 'toldoListra'), 'bandeiraAmarela', 'bandeiraVermelha')
    p.append(cyl(0.18, 0.24, (0.45, yb, zb + 0.12), 'panela', verts=16))
    p.append(cyl(0.17, 0.02, (0.45, yb, zb + 0.235), 'milhoClaro', verts=16))
    for k in range(6):
        x = -0.55 + k * 0.13
        p.append(esfera(0.04, (x, yb, zb + 0.04), 'milho', escala=(0.9, 2.6, 0.9), seg=8, aneis=6))
        p.append(leaf((x, yb + 0.08, zb + 0.04), R(90), 0.12, 0.04, 'palha', lift=0.0, droop=0.02, n=4))
    return p


def barraca_suco():
    p, yb, zb = _barraca(('bandeiraAzul', 'toldoListra'), 'bandeiraRosa', 'bandeiraVerde')
    jarra = torneado([(0, 0), (0.11, 0), (0.12, 0.05), (0.11, 0.24), (0.08, 0.3), (0.085, 0.32), (0, 0.32)],
                     'vidroCabine', seg=14, pos=(-0.4, yb, zb))
    p.append(jarra)
    p.append(torneado([(0, 0.01), (0.1, 0.01), (0.108, 0.2), (0, 0.2)], 'suco', seg=14, pos=(-0.4, yb, zb)))
    for k in range(5):
        x = 0.05 + k * 0.14
        p.append(torneado([(0, 0), (0.035, 0), (0.045, 0.1), (0.04, 0.1), (0.03, 0.01), (0, 0.01)], 'loucaBranca',
                          seg=10, pos=(x, yb, zb)))
        p.append(disco(0.036, 0.075, 'suco', seg=10, pos=(x, yb, zb)))
    return p


def balao():
    perfil = [(0, 0.12), (0.12, 0.14), (0.26, 0.3), (0.3, 0.5), (0.26, 0.7), (0.14, 0.84), (0, 0.88)]
    o = torneado(perfil, CORES[0], seg=8, liso=False)
    pintar_por(o, lambda c, n: CORES[int((math.atan2(c.y, c.x) + math.pi) / (2 * math.pi) * 8) % len(CORES)])
    p = [o]
    p.append(lib_q.torus(0.12, 0.012, (0, 0, 0.13), 'madeiraEscura', seg=12, rseg=4))
    p.append(cyl(0.1, 0.01, (0, 0, 0.125), 'luz', verts=10))
    p.append(cyl(0.004, 0.12, (0, 0, 0.06), 'barbante', verts=4))
    p.append(lib_q.torus(0.06, 0.008, (0, 0, 0.004), 'barbante', seg=10, rseg=4))
    for k in range(4):
        a = 2 * math.pi * k / 4
        p.append(prism([(-0.03, 0), (0.03, 0), (0, -0.07)], 0.004, (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.12),
                       CORES[(k + 2) % 5], rot=(0, 0, a + R(90))))
    return p


def junina():
    band, pontas = bandeirinhas()
    lenha, fogo = fogueira()
    pecas = [('bandeirinhas', band), ('fogueira', lenha + fogo), ('barraca-pescaria', barraca_pescaria()),
             ('barraca-milho', barraca_milho()), ('barraca-suco', barraca_suco()), ('balao', balao())]
    nos, desl = enfileirar(pecas, vao=0.9)
    # O fogo vira um nó à parte, com o pivô no meio da fogueira.
    piv = nos['fogueira'][1]
    nos['fogueira'] = (lenha, piv)
    nos['fogo'] = (fogo, piv)
    vazios = {k: tuple(Vector(v) + desl['bandeirinhas']) for k, v in pontas.items()}
    crepitar = {'fogo': {'scale': [(0, (1, 1, 1)), (5, (1.06, 0.96, 1.12)), (10, (0.95, 1.04, 0.92)),
                                   (16, (1.04, 1.0, 1.08)), (24, (1, 1, 1))],
                         'rotation_euler': [(0, (0, 0, 0)), (12, (0, 0, R(8))), (24, (0, 0, 0))]}}
    return {'nos': nos, 'vazios': vazios, 'clipes': {'crepitar': crepitar}, 'grupo': 'festas'}


PECAS = [('junina', junina)]

if __name__ == '__main__':
    rodar(PECAS)
