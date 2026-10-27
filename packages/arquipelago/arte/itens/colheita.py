"""A colheita: o que sai da horta da sua ilha e das hortas das outras ilhas.

Cada item é UM nó com o nome do arquivo, com a base na origem. As funções `forma_*` devolvem as
peças soltas na origem e também servem para o desenho na frente dos pacotinhos de semente.

  alface, tomate, milho (a sua ilha) · morango (Vila Doce) · alga (Recife) · batata-doce (Pico)
  abobora (Vale dos Dinos) · flor-de-algodao (Nuvens)
"""
import random

from lib_itens import *


def forma_alface():
    p = [esfera(0.068, (0, 0, 0.072), 'folhaAlface', escala=(1, 1, 0.95), seg=16, aneis=10)]
    # Duas voltas de folhas: conchas finas que abraçam o miolo, com a borda de cima ondulada.
    for volta, (n, raio, alto, inclina) in enumerate(((6, 0.05, 0.07, -14), (7, 0.07, 0.06, -30))):
        for k in range(n):
            a = 2 * math.pi * k / n + volta * 0.45
            o = esfera(0.08 + 0.01 * volta, (0, 0, 0), 'folhaAlfaceEscura' if (k + volta) % 2 else 'folhaAlface',
                       escala=(1, 0.28, 1.0), seg=12, aneis=8)

            def onda(v):
                cima = max(0.0, v.z / 0.08)
                return Vector((v.x, v.y + 0.035 * (v.x / 0.085) ** 2 + 0.01 * cima * math.sin(v.x * 70), v.z))
            deformar(o, onda)
            o.rotation_euler = (R(inclina), 0, a + math.pi / 2)
            o.location = (math.cos(a) * raio, math.sin(a) * raio, alto + 0.01)
            p.append(o)
    return p


def forma_tomate():
    o = esfera(0.07, (0, 0, 0.06), 'tomate', escala=(1, 1, 0.84), seg=20, aneis=12)
    # Gomos rasos (seis) e o topo afundado, como tomate de horta.
    deformar(o, lambda v: Vector((v.x * (1 - 0.05 * abs(math.sin(3 * math.atan2(v.y, v.x)))),
                                  v.y * (1 - 0.05 * abs(math.sin(3 * math.atan2(v.y, v.x)))),
                                  v.z - 0.012 * max(0.0, 1 - math.hypot(v.x, v.y) / 0.03))))
    p = [o]
    p.append(prism(lib_q.star_pts(0.045, 0.014, n=5), 0.006, (0, 0, 0.115), 'cabinho', rot=(R(90), 0, 0)))
    p.append(tube([(0, 0, 0.11), (0.004, 0, 0.135), (0.014, 0, 0.15)], [0.006, 0.005, 0.004], 'cabinho', seg=6))
    p.append(esfera(0.014, (-0.03, -0.045, 0.085), 'tomateBrilho', escala=(1, 0.6, 0.8), seg=8, aneis=5))
    return p


def forma_milho():
    """Espiga deitada (ao longo de x) com a palha aberta e o cabelo."""
    L = 0.3
    o = esfera(1, (0, 0, 0), 'milho', escala=(L / 2, 0.065, 0.065), seg=18, aneis=14)
    o.data.polygons.foreach_set('use_smooth', [False] * len(o.data.polygons))

    def graos(v):
        a = math.atan2(v.z, v.y)
        k = 1 + 0.07 * abs(math.sin(a * 6)) * abs(math.sin(v.x / L * math.pi * 14))
        return Vector((v.x, v.y * k, v.z * k))
    deformar(o, graos)
    o.location = (0.02, 0, 0.07)
    p = [o]
    # Palha: três folhas largas saindo do pé (−x), abertas para os lados e para baixo.
    for k, (yaw, cor) in enumerate(((R(165), 'palha'), (R(195), 'palhaClara'), (R(180), 'palha'))):
        f = leaf((-0.1, (k - 1) * 0.035, 0.06), yaw, 0.22, 0.075, cor, lift=0.03, droop=0.07, fold=0.5, n=8)
        p.append(f)
    for k in range(3):
        f = leaf((-0.11, 0, 0.07), R(180 + (k - 1) * 65), 0.2, 0.07, 'palha', lift=0.08, droop=0.14, fold=0.6, n=8)
        f.location.z += 0.0
        p.append(f)
    # Cabelo do milho na ponta (+x).
    for k in range(5):
        a = R(-40 + k * 20)
        p.append(tube([(0.17, 0, 0.065), (0.2, math.sin(a) * 0.02, 0.07), (0.23, math.sin(a) * 0.04, 0.05)],
                      [0.004, 0.003, 0.002], 'cabeloMilho', seg=4))
    p.append(cyl(0.022, 0.06, (-0.15, 0, 0.055), 'cabinho', verts=8, rot=(0, R(90), 0)))
    return p


def forma_morango():
    o = torneado([(0, 0), (0.012, 0.004), (0.03, 0.02), (0.045, 0.045), (0.05, 0.07), (0.044, 0.088),
                  (0.026, 0.098), (0, 0.1)], 'morango', seg=18)
    p = [o]
    rnd = random.Random(3)
    for i in range(14):
        z = 0.02 + (i % 5) * 0.016
        a = i * 2.4 + rnd.uniform(-0.2, 0.2)
        r = {0: 0.024, 1: 0.038, 2: 0.046, 3: 0.049, 4: 0.044}[i % 5]
        p.append(esfera(0.004, (math.cos(a) * r, math.sin(a) * r, z), 'pintinha', escala=(1, 1, 1.4), seg=6, aneis=4))
    for k in range(6):
        a = 2 * math.pi * k / 6
        p.append(leaf((0, 0, 0.098), a, 0.045, 0.018, 'cabinho', lift=0.004, droop=0.02, fold=0.3, n=5))
    p.append(tube([(0, 0, 0.098), (0.004, 0, 0.12), (0.012, 0, 0.13)], [0.004, 0.003, 0.003], 'cabinho', seg=5))
    return p


def forma_alga():
    """Um maço de alga amarrado com corda."""
    p = []
    for k in range(5):
        a = 2 * math.pi * k / 5
        pts, raios = [], []
        for i in range(9):
            t = i / 8
            z = 0.02 + t * 0.28
            off = 0.014 * math.sin(t * 6 + k * 1.3)
            pts.append((math.cos(a) * (0.015 + 0.04 * t) + off * math.sin(a),
                        math.sin(a) * (0.015 + 0.04 * t) - off * math.cos(a), z))
            raios.append(0.03 * math.sin(math.pi * min(1.0, 0.12 + t * 0.95)) + 0.005)
        o = tube(pts, raios, 'alga' if k % 2 else 'algaEscura', seg=8)
        # Achata cada fita (folha de alga é larga e fina).
        cx, cy = math.cos(a), math.sin(a)
        deformar(o, lambda v, cx=cx, cy=cy: Vector((v.x - cx * (v.x * cx + v.y * cy) * 0.6,
                                                    v.y - cy * (v.x * cx + v.y * cy) * 0.6, v.z)))
        p.append(o)
    p.append(torus(0.03, 0.009, (0, 0, 0.07), 'corda', seg=16, rseg=6))
    return p


def forma_batata_doce():
    o = esfera(1, (0, 0, 0), 'batataDoce', escala=(0.13, 0.06, 0.055), seg=16, aneis=10)
    # Afina numa ponta e engorda na outra, com calombos.
    deformar(o, lambda v: Vector((v.x, v.y * (1 - 0.35 * max(0.0, v.x / 0.13)) * (1 + 0.06 * math.sin(v.x * 50)),
                                  v.z * (1 - 0.3 * max(0.0, v.x / 0.13)) + 0.008 * math.sin(v.y * 90))))
    o.rotation_euler = (0, 0, R(12))
    o.location = (0, 0, 0.052)
    p = [o]
    p.append(tube([(0.12, 0.02, 0.05), (0.17, 0.03, 0.035), (0.2, 0.05, 0.012)], [0.008, 0.004, 0.002],
                  'batataDoceClara', seg=5))
    p.append(tube([(-0.12, -0.03, 0.06), (-0.15, -0.035, 0.09), (-0.16, -0.02, 0.12)], [0.012, 0.008, 0.006],
                  'cabinho', seg=6))
    p.append(leaf((-0.16, -0.02, 0.12), R(160), 0.07, 0.03, 'folha', lift=0.03, droop=0.03, fold=0.3, n=6))
    return p


def forma_abobora():
    o = esfera(1, (0, 0, 0), 'abobora', escala=(0.15, 0.15, 0.11), seg=24, aneis=12)

    def gomos(v):
        a = math.atan2(v.y, v.x)
        k = 1 - 0.09 * (1 - abs(math.cos(4 * a))) ** 3
        z = v.z - 0.02 * max(0.0, 1 - math.hypot(v.x, v.y) / 0.05) * (1 if v.z > 0 else -0.6)
        return Vector((v.x * k, v.y * k, z))
    deformar(o, gomos)
    o.location = (0, 0, 0.1)
    p = [o]
    p.append(tube([(0, 0, 0.18), (0.006, 0, 0.22), (0.03, 0, 0.245)], [0.016, 0.013, 0.011], 'casulo', seg=7))
    p.append(leaf((0.02, 0, 0.2), R(-30), 0.12, 0.06, 'folhaEscura', lift=0.02, droop=0.05, fold=0.25, n=7))
    p.append(tube([(-0.01, 0, 0.21), (-0.05, 0.02, 0.24), (-0.07, 0.05, 0.22), (-0.06, 0.07, 0.2)],
                  [0.004] * 4, 'cabinho', seg=4))
    return p


def forma_flor_de_algodao():
    p = []
    for k in range(4):
        a = 2 * math.pi * k / 4
        p.append(esfera(0.045, (math.cos(a) * 0.032, math.sin(a) * 0.032, 0.1), 'algodao' if k % 2 else 'algodaoSombra',
                        seg=14, aneis=9))
    p.append(esfera(0.05, (0, 0, 0.13), 'algodao', seg=14, aneis=9))
    p.append(prism(lib_q.star_pts(0.07, 0.03, n=4, rot=45), 0.012, (0, 0, 0.065), 'casulo', rot=(R(90), 0, 0)))
    p.append(tube([(0, 0, 0.065), (0.01, 0, 0.03), (0.0, 0, 0.0)], [0.008, 0.007, 0.006], 'cabinho', seg=6))
    return p


FORMAS = {
    'alface': forma_alface,
    'tomate': forma_tomate,
    'milho': forma_milho,
    'morango': forma_morango,
    'alga': forma_alga,
    'batata-doce': forma_batata_doce,
    'abobora': forma_abobora,
    'flor-de-algodao': forma_flor_de_algodao,
}

ITENS = [(pid, (lambda pid=pid: {'nos': {pid: FORMAS[pid]()}, 'grupo': 'colheita'})) for pid in FORMAS]

if __name__ == '__main__':
    rodar(ITENS)
