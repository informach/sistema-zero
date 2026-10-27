"""Filhotes de dino do Vale dos Dinos: o rex-bebê (bípede, cabeção e bracinhos) e o
tricerátops-bebê (quatro patas, babado e três chifrinhos). Bichos de enfeite que passeiam pelo
vale. Clipes: `parado`, `andar` e `pular`.

  /tmp/claude-0/blender-venv/bin/python arte/bichos/vale.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, clipes_quadrupede, cos, sen, suave  # noqa: E402

COMUM = {
    'olho': ('#151216', 0.1),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fae', 0.9),
    'boca': ('#3b261a', 0.6),
    'unha': ('#f6ecd6', 0.5),
}


def espinhos(p, osso, m, pontos, tamanho):
    """Espinhos macios (cones arredondados) ao longo das costas."""
    for (x, y, z), t in zip(pontos, tamanho):
        p.torno(osso, m, [(t * 0.6, 0.0), (t * 0.45, t * 0.5), (t * 0.15, t * 0.95), (0.0, t)], de=(x, y, z - t * 0.3),
                ate=(x, y + 0.3, z + 1), seg=8)


# --------------------------------------------------------------------- rex-bebê
def rex(pid):
    p = Bicho(pid, {**COMUM, 'pele': ('#6cc24a', 0.7), 'barriga': ('#f4e39a', 0.8), 'espinho': ('#f39a3d', 0.6),
                     'pinta': ('#57a43b', 0.7)}, alvo=2900)
    p.esfera('tronco', 'pele', (0, 0.03, 0.27), (0.13, 0.16, 0.14), rot=(-12, 0, 0), seg=18, aneis=10)
    p.esfera('tronco', 'barriga', (0, -0.06, 0.25), (0.095, 0.08, 0.11), rot=(-12, 0, 0), seg=14, aneis=8)
    cab = p.esfera('cabeca', 'pele', (0, -0.11, 0.47), (0.13, 0.14, 0.115), seg=18, aneis=11)
    foc = p.esfera('cabeca', 'pele', (0, -0.22, 0.43), (0.095, 0.08, 0.07), seg=14, aneis=8)
    queixo = p.esfera('cabeca', 'barriga', (0, -0.2, 0.385), (0.085, 0.07, 0.035), seg=12, aneis=6)
    rosto = [cab, foc, queixo]
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.065 * s, 0.505, (0.032, 0.02, 0.036), afunda=0.2, seg=12, aneis=7)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.085 * s, 0.43, (0.02, 0.008, 0.013), afunda=0.5, seg=8, aneis=5)
        p.no_rosto('cabeca', 'pinta', rosto, 0.025 * s, 0.465, (0.008, 0.005, 0.006), afunda=0.3, seg=6, aneis=4)
    # Sorriso largo de dino.
    y = p.superficie(rosto, 0, 0.405)[0].y
    p.tubo('cabeca', 'boca', [(-0.06, y + 0.035, 0.41), (-0.03, y + 0.008, 0.402), (0, y, 0.4), (0.03, y + 0.008, 0.402),
                              (0.06, y + 0.035, 0.41)], 0.005, seg=5)
    # Bracinhos curtos na frente do peito, com duas garrinhas.
    for s, lado in ((1, 'esq'), (-1, 'dir')):
        p.capsula(f'braco_{lado}', 'pele', (0.08 * s, -0.12, 0.31), (0.1 * s, -0.17, 0.25), 0.022, 0.02, seg=8)
        for k in (-1, 1):
            p.esfera(f'braco_{lado}', 'unha', (0.1 * s + 0.008 * k, -0.185, 0.24), (0.007, 0.01, 0.007), seg=6, aneis=4)
        # Coxa grossa, perna e pé com três dedos.
        p.esfera(f'perna_{lado}', 'pele', (0.09 * s, 0.05, 0.2), (0.07, 0.09, 0.09), seg=12, aneis=7)
        p.capsula(f'perna_{lado}', 'pele', (0.09 * s, 0.05, 0.16), (0.09 * s, 0.03, 0.04), 0.045, 0.04, seg=10)
        p.esfera(f'perna_{lado}', 'pele', (0.09 * s, -0.01, 0.025), (0.055, 0.075, 0.03), seg=10, aneis=6)
        for k in (-1, 0, 1):
            p.esfera(f'perna_{lado}', 'unha', (0.09 * s + 0.025 * k, -0.08, 0.02), (0.01, 0.014, 0.01), seg=6, aneis=4)
    # Rabo comprido que afina, com espinhos nas costas.
    rabo = [(0, 0.15, 0.25), (0, 0.27, 0.2), (0, 0.39, 0.14), (0, 0.5, 0.09)]
    p.tubo('cauda', 'pele', rabo, [0.085, 0.06, 0.038, 0.015], seg=10)
    espinhos(p, 'tronco', 'espinho', [(0, 0.0, 0.415), (0, 0.08, 0.39)], [0.035, 0.03])
    espinhos(p, 'cabeca', 'espinho', [(0, -0.12, 0.6), (0, -0.04, 0.585)], [0.032, 0.03])
    espinhos(p, 'cauda', 'espinho', [(0, 0.2, 0.31), (0, 0.31, 0.25), (0, 0.42, 0.18)], [0.028, 0.022, 0.016])
    p.esqueleto_chibi(quadril=0.2, pescoco=0.36, topo=0.6, ombro=(0.08, -0.12, 0.31), mao=(0.1, -0.17, 0.24),
                      anca=(0.09, 0.05, 0.2), pe=(0.09, 0.0, 0.0), cauda=((0, 0.14, 0.25), (0, 0.5, 0.09)))
    p.finalizar()

    def parado(t):
        return {
            'quadril': {'loc': (0, 0, 0.005 * sen(t))},
            'tronco': {'rot': [('X', 2 * sen(t))]},
            'cabeca': {'rot': [('Z', 12 * sen(t, 1, 0.2)), ('X', -3 * sen(t, 1, 0.4))]},
            'braco_esq': {'rot': [('X', -8 * sen(t, 2))]},
            'braco_dir': {'rot': [('X', -8 * sen(t, 2, 0.25))]},
            'cauda': {'rot': [('Z', 10 * sen(t)), ('X', 3 * sen(t, 2))]},
        }

    def andar(t):
        return {
            'quadril': {'loc': (0, 0, 0.02 * (0.5 + 0.5 * cos(t, 2))), 'rot': [('Z', 5 * sen(t)), ('Y', 4 * sen(t))]},
            'tronco': {'rot': [('X', 5), ('Z', -3 * sen(t))]},
            'cabeca': {'rot': [('X', -4 + 3 * cos(t, 2)), ('Z', -4 * sen(t))]},
            'perna_esq': {'rot': [('X', -30 * sen(t))]},
            'perna_dir': {'rot': [('X', 30 * sen(t))]},
            'braco_esq': {'rot': [('X', 14 * sen(t))]},
            'braco_dir': {'rot': [('X', -14 * sen(t))]},
            'cauda': {'rot': [('Z', 14 * sen(t, 1, 0.5)), ('X', 4 * cos(t, 2))]},
        }

    def pular(t):
        no_ar = suave(0.12, 0.3, t) * (1 - suave(0.7, 0.88, t))
        u = min(1.0, max(0.0, (t - 0.15) / 0.7))
        return {
            'raiz': {'loc': (0, 0, 0.18 * math.sin(math.pi * u))},
            'quadril': {'loc': (0, 0, -0.03 * (1 - no_ar))},
            'tronco': {'rot': [('X', 8 * (1 - no_ar) - 6 * no_ar)]},
            'cabeca': {'rot': [('X', -12 * no_ar)]},
            'perna_esq': {'rot': [('X', -20 * no_ar)]},
            'perna_dir': {'rot': [('X', -20 * no_ar)]},
            'braco_esq': {'rot': [('X', -40 * no_ar), ('Y', -20 * no_ar)]},
            'braco_dir': {'rot': [('X', -40 * no_ar), ('Y', 20 * no_ar)]},
            'cauda': {'rot': [('X', -14 * no_ar), ('Z', 10 * sen(t, 2))]},
        }
    p.clipe('parado', 48, parado)
    p.clipe('andar', 24, andar)
    p.clipe('pular', 24, pular)
    return p


# --------------------------------------------------------------------- tricerátops-bebê
def triceratops(pid):
    p = Bicho(pid, {**COMUM, 'pele': ('#f08a5d', 0.7), 'barriga': ('#fde3c0', 0.8), 'babado': ('#f6c14d', 0.6),
                     'chifre': ('#fbf1dc', 0.5), 'pinta': ('#d86e45', 0.7)}, alvo=2900)
    hc, L = 0.2, 0.2
    ox, oy = 0.09, -L * 0.6
    ax, ay = 0.1, L * 0.6
    p.esfera('corpo', 'pele', (0, 0.0, hc), (0.15, L, 0.13), seg=18, aneis=10)
    p.esfera('corpo', 'barriga', (0, 0.0, hc - 0.07), (0.11, L * 0.8, 0.07), seg=14, aneis=7)
    for x, y in ((0.07, -0.06), (-0.05, 0.02), (0.04, 0.09), (-0.08, -0.1), (0.0, 0.14)):
        p.esfera('corpo', 'pinta', (x, y, hc + 0.12 - 0.3 * (x * x + y * y)), (0.025, 0.03, 0.01), seg=8, aneis=4)
    for s, lado in ((1, 'e'), (-1, 'd')):
        for frente, (x, y) in (('f', (ox, oy)), ('t', (ax, ay))):
            osso = f'pata_{frente}{lado}'
            p.capsula(osso, 'pele', (x * s, y, hc - 0.03), (x * s, y, 0.035), 0.05, 0.048, seg=10)
            p.esfera(osso, 'pele', (x * s, y - 0.01, 0.025), (0.055, 0.06, 0.028), seg=10, aneis=6)
            for k in (-1, 0, 1):
                p.esfera(osso, 'unha', (x * s + 0.022 * k, y - 0.06, 0.02), (0.01, 0.01, 0.01), seg=6, aneis=4)
    cc = (0, -L - 0.07, hc + 0.1)
    cab = p.esfera('cabeca', 'pele', cc, (0.12, 0.12, 0.1), seg=18, aneis=10)
    foc = p.esfera('cabeca', 'pele', (0, cc[1] - 0.1, cc[2] - 0.03), (0.075, 0.07, 0.06), seg=12, aneis=7)
    p.torno('cabeca', 'chifre', [(0.03, 0.0), (0.024, 0.02), (0.0, 0.04)], de=(0, cc[1] - 0.16, cc[2] - 0.04),
                   ate=(0, -5, cc[2] - 0.8), seg=10, escala=(1.2, 0.8))
    rosto = [cab, foc]
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.06 * s, cc[2] + 0.03, (0.028, 0.018, 0.032), afunda=0.2, seg=12, aneis=7)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.08 * s, cc[2] - 0.03, (0.018, 0.007, 0.012), afunda=0.5, seg=8,
                   aneis=5)
        # Chifrinhos da testa.
        base = p.superficie(rosto, 0.05 * s, cc[2] + 0.08)[0]
        p.torno('cabeca', 'chifre', [(0.016, 0.0), (0.01, 0.03), (0.0, 0.05)], de=tuple(base),
                ate=(base.x + 0.2 * s, base.y - 0.6, base.z + 1), seg=8)
    nariz = p.superficie(rosto, 0, cc[2] + 0.005)[0]
    p.torno('cabeca', 'chifre', [(0.014, 0.0), (0.008, 0.02), (0.0, 0.032)], de=tuple(nariz),
            ate=(0, nariz.y - 0.5, nariz.z + 1), seg=8)
    y = p.superficie(rosto, 0, cc[2] - 0.05)[0].y
    p.tubo('cabeca', 'boca', [(-0.04, y + 0.02, cc[2] - 0.045), (0, y, cc[2] - 0.055), (0.04, y + 0.02, cc[2] - 0.045)],
           0.004, seg=5)
    # Babado em meia-lua atrás da cabeça, com a beirada amarela de bolinhas.
    contorno = [(0.17 * math.cos(math.radians(a)), 0.15 * math.sin(math.radians(a))) for a in range(0, 181, 15)]
    p.placa('cabeca', 'pele', contorno, 0.022, centro=(0, cc[1] + 0.06, cc[2] + 0.02), rot=(70, 0, 0), bisel=0.006)
    for a in range(0, 181, 30):
        r = math.radians(a)
        q = (0.17 * math.cos(r), 0.15 * math.sin(r))
        z = cc[2] + 0.02 + q[1] * math.sin(math.radians(70))
        yq = cc[1] + 0.06 + q[1] * math.cos(math.radians(70))
        p.esfera('cabeca', 'babado', (q[0], yq, z), (0.022, 0.016, 0.022), seg=8, aneis=5)
    # Rabo curto.
    p.tubo('cauda', 'pele', [(0, L * 0.85, hc + 0.02), (0, L * 1.2, hc - 0.03), (0, L * 1.45, hc - 0.08)],
           [0.07, 0.04, 0.012], seg=10)
    p.esqueleto_quadrupede(hc=hc, anca=(ax, ay, hc - 0.03), ombro=(ox, oy, hc - 0.03),
                           pescoco=(0, cc[1] + 0.07, cc[2] - 0.05), topo=(0, cc[1], cc[2] + 0.12),
                           cauda=((0, L * 0.85, hc + 0.02), (0, L * 1.45, hc - 0.08)))
    p.finalizar()
    clipes_quadrupede(p, {'passo': 24, 'cauda': 14, 'pulo': 0.12}, quais={'parado': 'parado', 'andar': 'andar',
                                                                        'feliz': 'pular'})
    return p


BICHOS = {'rex-filhote': rex, 'triceratops-filhote': triceratops}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
