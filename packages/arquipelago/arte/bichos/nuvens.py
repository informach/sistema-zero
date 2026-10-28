"""Pássaro das Nuvens: passarinho fofo azul-céu com o peito de nuvem e o penacho enrolado, que voa
em volta das ilhas flutuantes. Clipes: `voar` e `pousado`.

  /tmp/claude-0/blender-venv/bin/python arte/bichos/nuvens.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, clipes_ave, corpo_de_passaro  # noqa: E402

PALETA = {
    'olho': ('#151216', 0.1),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fbe', 0.9),
    'penas': ('#8fc9f2', 0.75),
    'barriga': ('#ffffff', 0.9),
    'asa': ('#b9a3f0', 0.7),
    'bico': ('#ffc94d', 0.45),
    'pe': ('#f6a7b7', 0.6),
    'crista': ('#ff9ec4', 0.6),
}


def passaro_das_nuvens(pid):
    p = Bicho(pid, PALETA, alvo=2200)

    def crista(p, cab, cc):
        # Penacho enrolado como uma voltinha de nuvem.
        pts = []
        for i in range(8):
            a = math.radians(-60 + 300 * i / 7)
            pts.append((0, cc[1] + 0.02 + 0.03 * math.cos(a) * (1 - i / 10), cc[2] + 0.075 + 0.03 * math.sin(a) + 0.006 * i))
        p.tubo('cabeca', 'crista', pts, [0.013 - 0.0012 * i for i in range(8)], seg=6)

    corpo_de_passaro(p, crista=crista, escala_cab=1.08)
    # Peito de nuvem: bolinhas brancas por cima da barriga.
    for x, z in ((0.0, 0.125), (0.03, 0.105), (-0.03, 0.105), (0.0, 0.08), (0.035, 0.075), (-0.035, 0.075)):
        p.esfera('corpo', 'barriga', (x, -0.075, z), (0.025, 0.018, 0.023), seg=8, aneis=5)
    p.finalizar()
    clipes_ave(p, {'bate': 40})
    return p


BICHOS = {'passaro-das-nuvens': passaro_das_nuvens}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
