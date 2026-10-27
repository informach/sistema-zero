"""Dino de montaria do Vale dos Dinos: um parassaurolofo bonzinho (bico de pato, crista em tubo)
de sela e manta, para a criança montar e atravessar o vale.

A `sela` é um vazio preso ao osso `corpo`, no assento: o jogo acha com `getObjectByName('sela')` e
põe o avatar ali (ele acompanha o corpo em todos os clipes). Clipes: `parado`, `andar`, `correr` e
`pular`. Teto de ~6 mil triângulos. Sai 25% maior que o desenho (escala do `Bicho`), para a sela ficar
na altura do peito do avatar.

  /tmp/claude-0/blender-venv/bin/python arte/bichos/montaria.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, clipes_quadrupede  # noqa: E402

PALETA = {
    'olho': ('#151216', 0.1),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fae', 0.9),
    'boca': ('#2f3a34', 0.6),
    'pele': ('#3fb3a5', 0.7),
    'barriga': ('#f6e3a1', 0.8),
    'pinta': ('#2f8f84', 0.7),
    'crista': ('#f6894a', 0.6),
    'bico': ('#f3d79a', 0.6),
    'unha': ('#f6ecd6', 0.5),
    'couro': ('#8a5a35', 0.65),
    'couro_escuro': ('#5e3b22', 0.65),
    'manta': ('#d9473f', 0.8),
    'manta_borda': ('#f5c445', 0.7),
    'metal': ('#e7c35a', 0.3),
}


def dino_montaria(pid):
    p = Bicho(pid, PALETA, alvo=6000, escala=1.25)
    hc, L = 0.72, 0.8
    rx, rz = 0.47, 0.43
    ox, oy = 0.24, -L * 0.62
    ax, ay = 0.28, L * 0.55

    def lombo(v):
        # Mais alto nas ancas, como os hadrossauros, e mais cheio embaixo.
        return (v.x * (1.0 + 0.06 * max(0.0, -v.z)), v.y, v.z + 0.08 * max(0.0, v.y) * max(0.0, v.z))
    p.esfera('corpo', 'pele', (0, 0, hc), (rx, L, rz), deformar=lombo, seg=24, aneis=14)
    p.esfera('corpo', 'barriga', (0, -0.05, hc - 0.2), (rx * 0.8, L * 0.78, rz * 0.62), seg=18, aneis=10)
    for x, y in ((0.18, -0.3), (-0.2, -0.1), (0.24, 0.2), (-0.15, 0.4), (0.05, 0.55), (0.3, -0.05), (-0.32, 0.15)):
        zt = hc + rz * math.sqrt(max(0.05, 1 - (x / rx) ** 2 - (y / L) ** 2)) - 0.02
        p.esfera('corpo', 'pinta', (x, y, zt), (0.07, 0.09, 0.03), seg=8, aneis=4)

    # Patas: as da frente mais finas; as de trás com a coxa grande. Pés de três dedos.
    for s, lado in ((1, 'e'), (-1, 'd')):
        p.capsula(f'pata_f{lado}', 'pele', (ox * s, oy, hc - 0.1), (ox * s, oy - 0.02, 0.09), 0.13, 0.115, seg=12)
        p.esfera(f'pata_f{lado}', 'pele', (ox * s, oy - 0.06, 0.06), (0.11, 0.14, 0.06), seg=12, aneis=6)
        p.esfera(f'pata_t{lado}', 'pele', ((ax + 0.04) * s, ay, hc - 0.05), (0.23, 0.33, 0.33), seg=14, aneis=8)
        p.capsula(f'pata_t{lado}', 'pele', (ax * s, ay + 0.05, hc - 0.2), (ax * s, ay, 0.09), 0.15, 0.13, seg=12)
        p.esfera(f'pata_t{lado}', 'pele', (ax * s, ay - 0.07, 0.065), (0.13, 0.17, 0.065), seg=12, aneis=6)
        for osso, (x, y) in ((f'pata_f{lado}', (ox, oy - 0.17)), (f'pata_t{lado}', (ax, ay - 0.21))):
            for k in (-1, 0, 1):
                p.esfera(osso, 'unha', (x * s + 0.055 * k, y, 0.04), (0.03, 0.035, 0.03), seg=6, aneis=4)

    # Pescoço e cabeça com bico de pato e a crista em tubo para trás.
    pescoco = [(0, -0.55, hc + 0.15), (0, -0.82, hc + 0.38), (0, -1.0, hc + 0.6)]
    p.tubo('pescoco', 'pele', pescoco, [0.26, 0.2, 0.17], seg=14)
    p.tubo('pescoco', 'barriga', [(0, -0.66, hc + 0.12), (0, -0.92, hc + 0.36), (0, -1.08, hc + 0.55)],
           [0.17, 0.13, 0.1], seg=10)
    cc = (0, -1.1, hc + 0.72)
    cab = p.esfera('cabeca', 'pele', cc, (0.22, 0.27, 0.21), seg=20, aneis=12)
    bico = p.esfera('cabeca', 'bico', (0, cc[1] - 0.27, cc[2] - 0.08), (0.17, 0.18, 0.075),
                    deformar=lambda v: (v.x * (1 + 0.2 * max(0.0, -v.y)), v.y, v.z), seg=16, aneis=8)
    rosto = [cab, bico]
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.12 * s, cc[2] + 0.06, (0.055, 0.035, 0.063), afunda=0.2, seg=14, aneis=8)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.16 * s, cc[2] - 0.04, (0.04, 0.015, 0.026), afunda=0.5, seg=8,
                   aneis=5)
        p.no_rosto('cabeca', 'boca', [bico], 0.05 * s, cc[2] - 0.06, (0.012, 0.008, 0.008), afunda=0.2, seg=6,
                   aneis=4)
    # Sorriso pela beirada do bico: cada ponto encostado na superfície (vista de frente).
    pts = []
    for x in (-0.12, -0.06, 0.0, 0.06, 0.12):
        z = cc[2] - 0.115 + 0.2 * x * x
        q = p.superficie([bico], x, z)[0]
        pts.append((q.x, q.y + 0.003, q.z))
    p.tubo('cabeca', 'boca', pts, 0.008, seg=5)
    crista = [(0, cc[1] + 0.05, cc[2] + 0.16), (0, cc[1] + 0.25, cc[2] + 0.3), (0, cc[1] + 0.5, cc[2] + 0.38),
              (0, cc[1] + 0.72, cc[2] + 0.36)]
    p.tubo('cabeca', 'crista', crista, [0.09, 0.075, 0.06, 0.05], seg=12)
    p.esfera('cabeca', 'crista', crista[-1], (0.05, 0.055, 0.05), seg=10, aneis=6)

    # Rabo grosso que afina, com a fileira de pintas.
    rabo = [(0, L * 0.85, hc + 0.1), (0, L * 1.3, hc - 0.02), (0, L * 1.85, hc - 0.2), (0, L * 2.35, hc - 0.38)]
    p.tubo('cauda', 'pele', rabo, [0.3, 0.2, 0.11, 0.03], seg=14)

    # Manta vermelha de beirada amarela e a sela de couro por cima, com o arção, a cilha e os
    # estribos. A sela fica um pouco atrás do meio, onde o lombo é mais reto.
    topo = lambda y: hc + rz * math.sqrt(max(0.0, 1 - (y / L) ** 2)) + 0.08 * max(0.0, y / L) * rz  # noqa: E731
    cortes = [((0, -0.36, 0), (0, -1, 0)), ((0, 0.34, 0), (0, 1, 0)), ((0, 0, hc + 0.08), (0, 0, -1))]
    p.casca('corpo', 'manta_borda', 'manta_borda', (0, 0, hc), (rx, L, rz), deformar=lombo, folga=0.012,
            espessura=0.012, seg=24, aneis=14, cortes=cortes)
    cortes = [((0, -0.32, 0), (0, -1, 0)), ((0, 0.3, 0), (0, 1, 0)), ((0, 0, hc + 0.12), (0, 0, -1))]
    p.casca('corpo', 'manta', 'manta', (0, 0, hc), (rx, L, rz), deformar=lombo, folga=0.024, espessura=0.012,
            seg=24, aneis=14, cortes=cortes)
    cortes = [((0, -0.22, 0), (0, -1, 0)), ((0, 0.2, 0), (0, 1, 0)), ((0, 0, hc + 0.27), (0, 0, -1))]
    p.casca('corpo', 'couro', 'couro_escuro', (0, 0, hc), (rx, L, rz), deformar=lombo, folga=0.05, espessura=0.03,
            seg=24, aneis=14, cortes=cortes)
    p.capsula('corpo', 'couro_escuro', (0, -0.2, topo(-0.2) + 0.02), (0, -0.25, topo(-0.2) + 0.14), 0.045, 0.06,
              seg=10)
    p.esfera('corpo', 'couro_escuro', (0, 0.2, topo(0.2) + 0.06), (0.18, 0.07, 0.07), seg=12, aneis=6)
    p.toro('corpo', 'couro_escuro', (0, -0.05, hc), rx + 0.02, 0.022, rot=(90, 0, 0), escala=(1, rz / rx + 0.02, 1),
           seg=28, rseg=5)
    for s in (1, -1):
        p.tubo('corpo', 'couro_escuro', [(rx * 0.9 * s, -0.02, hc + 0.18), (rx * 1.02 * s, -0.02, hc - 0.05),
                                          (rx * 1.02 * s, -0.02, hc - 0.2)], 0.015, seg=5)
        p.toro('corpo', 'metal', (rx * 1.02 * s, -0.02, hc - 0.25), 0.055, 0.014, rot=(90, 0, 0), seg=14, rseg=5)

    assento = (0, -0.02, topo(-0.02) + 0.06)
    p.esqueleto_quadrupede(
        hc=hc, anca=(ax, ay, hc - 0.05), ombro=(ox, oy, hc - 0.1),
        pescoco=(0, -1.0, hc + 0.6), topo=(0, cc[1], cc[2] + 0.25),
        cauda=((0, L * 0.85, hc + 0.1), rabo[-1]),
        pescoco_osso=((0, -0.55, hc + 0.15), (0, -1.0, hc + 0.6)),
    )
    p.finalizar()
    p.soquete('sela', 'corpo', assento)
    clipes_quadrupede(p, {'passo': 22, 'galope': 30, 'cauda': 8, 'pulo': 0.35, 'sentar': 18},
                      quais={'parado': 'parado', 'andar': 'andar', 'correr': 'correr', 'feliz': 'pular'})
    return p


BICHOS = {'dino-montaria': dino_montaria}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
