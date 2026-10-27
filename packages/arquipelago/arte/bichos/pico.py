"""Pinguins do Pico Gelado (bicho de enfeite que anda em bando pelo gelo).

Clipes: `parado`, `andar` (gingando, com as nadadeiras abertas) e `deslizar` (de barriga no gelo,
empurrando com os pés). O `pinguim-filhote` é o mesmo desenho menor e mais fofo, cinza.

  /tmp/claude-0/blender-venv/bin/python arte/bichos/pico.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_bichos import Bicho, sen  # noqa: E402

PALETA = {
    'olho': ('#151216', 0.1),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fae', 0.9),
    'penas': ('#28324a', 0.6),
    'barriga': ('#f8f8f4', 0.8),
    'bico': ('#f59a2b', 0.45),
    'pe': ('#f2a23a', 0.55),
}
FILHOTE = {**PALETA, 'penas': ('#8f97a6', 0.85), 'barriga': ('#d9dde3', 0.9)}


def pinguim(pid, filhote=False):
    p = Bicho(pid, FILHOTE if filhote else PALETA, alvo=2200, escala=0.6 if filhote else 1.0)
    fc = 1.18 if filhote else 1.0

    def ovo(v):
        f = 1.0 + 0.12 * max(0.0, -v.z)
        return (v.x * f, v.y * f, v.z)
    p.esfera('tronco', 'penas', (0, 0.0, 0.2), (0.14, 0.13, 0.19), deformar=ovo, seg=18, aneis=10)
    p.esfera('tronco', 'barriga', (0, -0.06, 0.18), (0.11, 0.085, 0.15), deformar=ovo, seg=16, aneis=9)
    cab = p.esfera('cabeca', 'penas', (0, -0.01, 0.4), (0.115 * fc, 0.11 * fc, 0.105 * fc), seg=18, aneis=10)
    # Máscara branca em forma de coração em volta dos olhos.
    rosto_c = (0, -0.075 * fc, 0.395)
    mascara = p.esfera('cabeca', 'barriga', rosto_c, (0.082 * fc, 0.055 * fc, 0.07 * fc),
                       deformar=lambda v: (v.x * (1 - 0.25 * max(0.0, -v.z)), v.y, v.z - 0.25 * (1 - abs(v.x)) * max(0.0, v.z)),
                       seg=16, aneis=9)
    rosto = [cab, mascara]
    for s in (1, -1):
        p.olho_no_rosto(s, rosto, 0.04 * fc * s, 0.41, (0.024 * fc, 0.016 * fc, 0.028 * fc), afunda=0.2, seg=12,
                        aneis=7)
        p.no_rosto('cabeca', 'bochecha', rosto, 0.062 * fc * s, 0.375, (0.016, 0.006, 0.01), afunda=0.5, seg=8,
                   aneis=5)
    ponta = p.superficie(rosto, 0, 0.385)[0]
    p.torno('cabeca', 'bico', [(0.024 * fc, 0.0), (0.016 * fc, 0.02), (0.0, 0.04 * fc)], de=tuple(ponta),
            ate=(0, ponta.y - 1, ponta.z - 0.25), seg=10, escala=(1.2, 0.8))
    for s, lado in ((1, 'esq'), (-1, 'dir')):
        p.esfera(f'braco_{lado}', 'penas', (0.15 * s, 0.0, 0.22), (0.025, 0.055, 0.11), rot=(0, -14 * s, 0), seg=10,
                 aneis=7)
        p.esfera(f'perna_{lado}', 'pe', (0.06 * s, -0.04, 0.012), (0.045, 0.06, 0.014), rot=(0, 0, 10 * s), seg=10,
                 aneis=5)
    p.esfera('cauda', 'penas', (0, 0.12, 0.05), (0.04, 0.04, 0.02), rot=(-30, 0, 0), seg=8, aneis=5)
    p.esqueleto_chibi(quadril=0.1, pescoco=0.32, topo=0.52, ombro=(0.13, 0.0, 0.31), mao=(0.17, 0.0, 0.12),
                      anca=(0.06, -0.02, 0.08), pe=(0.06, -0.04, 0.0), cauda=((0, 0.1, 0.07), (0, 0.16, 0.04)))
    p.finalizar()

    def nadadeiras(abre, bate=0.0):
        return {'braco_esq': {'rot': [('Y', -abre - bate)]}, 'braco_dir': {'rot': [('Y', abre + bate)]}}

    def parado(t):
        pose = {
            'quadril': {'loc': (0, 0, 0.004 * sen(t))},
            'tronco': {'rot': [('Y', 2 * sen(t))]},
            'cabeca': {'rot': [('Z', 14 * sen(t, 1, 0.2)), ('Y', 4 * sen(t, 1, 0.5))]},
            'cauda': {'rot': [('Z', 6 * sen(t, 2))]},
        }
        pose.update(nadadeiras(6, 6 * max(0.0, sen(t, 2))))
        return pose

    def andar(t):
        g = 10 * sen(t)
        pose = {
            'quadril': {'loc': (0, 0, 0.012 * abs(sen(t))), 'rot': [('Y', g)]},
            'tronco': {'rot': [('Y', g * 0.3), ('Z', 3 * sen(t))]},
            'cabeca': {'rot': [('Y', -g * 0.6)]},
            'perna_esq': {'rot': [('X', -18 * sen(t))]},
            'perna_dir': {'rot': [('X', 18 * sen(t))]},
            'cauda': {'rot': [('Z', -8 * sen(t))]},
        }
        pose.update(nadadeiras(26, 6 * sen(t, 2)))
        return pose

    def deslizar(t):
        # De barriga no gelo: o corpo deita para a frente e os pés empurram atrás.
        return {
            'raiz': {'loc': (0, 0, 0.13 + 0.006 * sen(t, 2)), 'rot': [('X', 80)]},
            'cabeca': {'rot': [('X', -55 + 3 * sen(t, 2))]},
            'braco_esq': {'rot': [('Y', -12), ('X', 30)]},
            'braco_dir': {'rot': [('Y', 12), ('X', 30)]},
            'perna_esq': {'rot': [('X', 30 + 20 * sen(t))]},
            'perna_dir': {'rot': [('X', 30 - 20 * sen(t))]},
            'cauda': {'rot': [('Z', 6 * sen(t, 2))]},
        }
    p.clipe('parado', 48, parado)
    p.clipe('andar', 16, andar)
    p.clipe('deslizar', 24, deslizar)
    return p


BICHOS = {'pinguim': lambda pid: pinguim(pid), 'pinguim-filhote': lambda pid: pinguim(pid, filhote=True)}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
