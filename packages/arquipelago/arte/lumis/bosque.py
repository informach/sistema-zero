"""Lumis do Bosque dos Bichos: Pitanga (comum) e Ipê (raro).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/bosque.py   # grava src/assets/lumis/{pitanga,ipe}.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_lumis as L  # noqa: E402
from mathutils import Vector  # noqa: E402


def pitanga():
    L.comecar({
        'corpo': ('#f2401f', 0.32, None, 0, 1),
        'corpo2': ('#b52519', 0.55, None, 0, 1),
        'detalhe': ('#3fae4e', 0.35, None, 0, 1),
        'detalhe2': ('#6f8a2e', 0.7, None, 0, 1),
        'luz': ('#fff07a', 0.35, '#ffd83a', 6.0, 1),
        'pupila': ('#2a1210', 0.25, None, 0, 1),
    })
    C, R = Vector((0, 0, 0.5)), 0.46
    casca = L.bola('corpo', R, C, (1.02, 1.0, 0.92), seg=32, aneis=16)

    def gomos(v):
        # A pitanga tem gomos: sulcos finos que somem no rosto e no topo, e uma covinha no cabo.
        d = v - C
        az = math.atan2(d.y, d.x)
        el = math.asin(max(-1.0, min(1.0, d.z / max(1e-6, d.length))))
        rosto = math.exp(-((az + math.pi / 2) / 0.5) ** 2)
        sulco = (1 - abs(math.cos(4 * az))) ** 2.2 * max(0.0, math.cos(el)) ** 0.6 * (1 - 0.8 * rosto)
        d *= 1 - 0.15 * sulco
        topo = max(0.0, d.z / (R * 0.9) - 0.8) / 0.2
        d.z -= 0.07 * topo ** 1.4
        if d.z < 0:
            d.z *= 0.94
        return C + d

    L.deformar(casca, gomos)
    rosto, olho = L.rosto(casca, 0.155, 0.6, 0.088, 0.112, boca_z=0.445, boca_larg=0.052, boca_alt=0.042,
                          bochecha_x=0.27, bochecha_z=0.475)
    cor = L.coracao(casca, 0.27, 0.06)
    corpo = L.juntar([casca, *rosto, cor], 'corpo', pivo=(0, 0, 0.08))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.42, 0.6))

    # Cabinho com duas folhas brilhantes, que termina numa gotinha de luz.
    topo_z = 0.84
    coroa = [L.tubo('detalhe2', [(0, 0, topo_z - 0.03), (0.0, 0.0, topo_z + 0.07), (0.025, 0.0, topo_z + 0.16),
                                 (0.08, 0.0, topo_z + 0.21)], [0.03, 0.025, 0.02, 0.017], seg=8)]
    coroa.append(L.folha('detalhe', 0.24, 0.13, (0.0, 0.0, topo_z + 0.05), rot=(10, -62, -20), curva=0.25, dobra=0.4))
    coroa.append(L.folha('detalhe', 0.19, 0.11, (0.0, 0.0, topo_z + 0.08), rot=(-10, 58, 25), curva=0.25, dobra=0.4))
    coroa.append(L.bola('luz', 0.048, (0.1, 0.0, topo_z + 0.22), seg=12, aneis=8))
    coroa = L.juntar(coroa, 'coroa', pivo=(0, 0, topo_z))

    lumi = L.Lumi('pitanga', corpo, olhos, bracos=L.bracinhos('corpo', 0.4, 0.36), pes=L.pezinhos('corpo2', 0.17),
                  enfeites=[(coroa, 9, 0.12)], pulo=0.36, passo=0.085)
    lumi.animar()
    L.exportar('pitanga', {'familia': 'bosque', 'raridade': 'comum'})


def ipe():
    L.comecar({
        'corpo': ('#8fd35f', 0.55, None, 0, 1),
        'corpo2': ('#4f9b3c', 0.6, None, 0, 1),
        'detalhe': ('#ff86c0', 0.5, None, 0, 1),
        'barriga': ('#c9f0a0', 0.6, None, 0, 1),
        'detalhe2': ('#5cb648', 0.6, None, 0, 1),
        'luz': ('#fff6a0', 0.35, '#ffe14f', 6.0, 1),
        'pupila': ('#1d2414', 0.25, None, 0, 1),
        'faisca': ('#ffe6f2', 0.3, '#ffb3d6', 5.0, 1),
    })
    C, R = Vector((0, 0, 0.47)), 0.44
    casca = L.bola('corpo', R, C, seg=24, aneis=14)

    def broto(v):
        # Um broto em gota: a parte de cima afina e sobe até a flor.
        d = v - C
        if d.z > 0:
            k = d.z / R
            d.z *= 1 + 0.38 * k * k
            d.x *= 1 - 0.22 * k ** 2.5
            d.y *= 1 - 0.22 * k ** 2.5
        else:
            d.z *= 0.92
        return C + d

    L.deformar(casca, broto)
    rosto, olho = L.rosto(casca, 0.15, 0.56, 0.085, 0.108, boca_z=0.42, boca_larg=0.05, boca_alt=0.03,
                          bochecha_x=0.26, bochecha_z=0.44, sorriso=True)
    barriga = L.decalque(casca, 'barriga', (0, 0.25), (0.165, 0.13), alto=0.003, bojo=0.006, aneis=2)
    cor = L.coracao(barriga, 0.26, 0.058)
    corpo = L.juntar([casca, *rosto, barriga, cor], 'corpo', pivo=(0, 0, 0.07))
    olhos = L.juntar(olho, 'olhos', pivo=(0, -0.4, 0.56))

    # Um cachinho de flores de ipê-rosa no alto da cabeça, com o miolo de luz.
    topo_z = 1.04

    def flor_ipe(centro, tam, inclina=(0, 0, 0)):
        pecas = []
        cx, cy, cz = centro
        for i in range(5):
            a = 360 * i / 5 + 10
            pecas.append(L.folha('detalhe', 0.25 * tam, 0.22 * tam, (0, 0, -0.02 * tam), rot=(-70, 0, a), curva=-0.3,
                                 dobra=0.25, n=4, gordura=0.4, ponta=0.55))
        pecas.append(L.bola('luz', 0.06 * tam, (0, 0, 0.0), (1, 1, 0.7), seg=8, aneis=5))
        for i in range(3 if tam >= 1 else 0):
            a = 2 * math.pi * (i + 0.25) / 3
            p = Vector((0.05 * tam * math.cos(a), 0.05 * tam * math.sin(a), 0.07 * tam))
            pecas.append(L.tubo('luz', [(0, 0, 0), p], [0.01 * tam, 0.008 * tam], seg=4, tampa=False))
            pecas.append(L.bola('luz', 0.018 * tam, p, seg=6, aneis=4))
        f = L.juntar(pecas, 'f')
        f.rotation_euler = [math.radians(a) for a in inclina]
        f.location = centro
        return L.juntar([f], 'f')

    flor = [flor_ipe((0, 0.0, topo_z + 0.01), 1.2, (26, 0, 0)),
            flor_ipe((0.15, 0.1, topo_z - 0.08), 0.6, (12, 48, 0))]
    flor.append(L.tubo('detalhe2', [(0, 0.03, topo_z - 0.12), (0, 0.01, topo_z - 0.01)], 0.032, seg=8))
    flor = L.juntar(flor, 'flor', pivo=(0, 0, topo_z - 0.06))

    # Duas folhas de orelha, que balançam em tempos diferentes.
    orelhas = []
    for lado in (1, -1):
        f = L.folha('detalhe2', 0.26, 0.15, (lado * 0.33, 0.02, 0.74), rot=(0, lado * 62, 0), curva=0.25, dobra=0.35, n=7)
        orelhas.append((L.juntar([f], f'orelha-{"e" if lado > 0 else "d"}', pivo=(lado * 0.33, 0.02, 0.74)),
                        12, 0.0 if lado > 0 else 0.25))
    roda = L.faiscas(0.38, 1.32)
    lumi = L.Lumi('ipe', corpo, olhos, bracos=L.bracinhos('corpo', 0.37, 0.34), pes=L.pezinhos('corpo2', 0.16),
                  enfeites=[(flor, 7, 0.1), *orelhas], faiscas=roda, pulo=0.3, passo=0.07)
    lumi.animar()
    L.exportar('ipe', {'familia': 'bosque', 'raridade': 'raro'})


if __name__ == '__main__':
    pitanga()
    ipe()
