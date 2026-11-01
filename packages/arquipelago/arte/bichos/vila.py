"""A ovelhinha de algodão-doce da Vila Doce (lacunas, 01/11/2026): o bicho que corre pela Vila na luneta
do píer, como o coelho do Bosque, a tartaruguinha do Recife e o pinguim do Pico.

A lã é algodão-doce: um miolo rosa coberto de tufos redondos rosa, lilás e rosa-claro. O rosto e as
orelhas caídas são creme, as patas de cacau com o casco escuro, a coleira de fita de menta com um
sininho dourado e um tufo de lã no alto da cabeça. Clipes de quatro patas: `parado`, `andar`,
`correr` e `feliz`.

  C:/Users/tocha/blender-venv/Scripts/python.exe arte/bichos/vila.py
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adotar import bochechas, boca_w, olhos  # noqa: E402
from lib_bichos import Bicho, clipes_quadrupede  # noqa: E402
from mathutils import Vector  # noqa: E402

PALETA = {
    'olho': ('#1b1410', 0.12),
    'brilho': ('#ffffff', 0.2, '#ffffff', 0.4),
    'bochecha': ('#ff9fb8', 0.9),
    'boca': ('#5a3a2c', 0.6),
    'la': ('#ffb6d5', 0.95),
    'laLilas': ('#c4a2ff', 0.95),
    'laClara': ('#fff3f8', 0.95),
    'rosto': ('#fff1e0', 0.85),
    'orelha': ('#ffb3c1', 0.8),
    'nariz': ('#e8899c', 0.45),
    'pata': ('#7a5240', 0.8),
    'casco': ('#47302a', 0.6),
    'fita': ('#8fe3c4', 0.55),
    'sino': ('#f2c14e', 0.3),
}
# A ordem das cores dos tufos: o rosa domina, o lilás e o rosa-claro fazem o redemoinho do algodão-doce.
CORES_DOS_TUFOS = ('la', 'la', 'laLilas', 'la', 'laClara', 'la', 'laLilas', 'laClara')


def tufos(p, osso, centro, raios, n, r_tufo, rnd, de_baixo=-0.25, so_atras=None):
    """Tufos redondos espalhados pela superfície do elipsoide `centro`/`raios` (a lã), de cima para os
    lados; a barriga (abaixo de `de_baixo` na altura normalizada) fica lisa."""
    feitos = 0
    k = 0
    ouro = math.pi * (3 - math.sqrt(5))
    while feitos < n and k < n * 4:
        # Pontos bem espalhados na esfera (espiral de Fibonacci), só os de cima e dos lados.
        z = 1 - 2 * (k + 0.5) / (n * 2.2)
        k += 1
        if z < de_baixo:
            continue
        r = math.sqrt(max(0.0, 1 - z * z))
        a = ouro * k
        x, y = math.cos(a) * r, math.sin(a) * r
        if so_atras is not None and y < so_atras:
            continue
        rt = r_tufo * rnd.uniform(0.82, 1.18)
        pos = (centro[0] + x * raios[0] * 0.93, centro[1] + y * raios[1] * 0.93, centro[2] + z * raios[2] * 0.93)
        p.esfera(osso, CORES_DOS_TUFOS[feitos % len(CORES_DOS_TUFOS)], pos, (rt, rt, rt * 0.92), seg=10, aneis=6)
        feitos += 1


def ovelhinha(pid):
    p = Bicho(pid, PALETA, alvo=3200, afinar_de=90)
    rnd = random.Random(7)
    perna = 0.14
    hc = perna + 0.13
    L = 0.2
    ox, oy = 0.075, -L * 0.62
    ax, ay = 0.08, L * 0.6

    # O corpo de lã: o miolo rosa e os tufos por cima.
    corpo = (0, 0.0, hc + 0.02)
    raios = (0.165, L + 0.03, 0.14)
    p.esfera('corpo', 'la', corpo, raios, seg=14, aneis=8)
    tufos(p, 'corpo', corpo, raios, 26, 0.068, rnd)

    # As patas de cacau, finas, com o casco escuro.
    for s, lado in ((1, 'e'), (-1, 'd')):
        for osso, (px, py) in ((f'pata_f{lado}', (ox * s, oy)), (f'pata_t{lado}', (ax * s, ay))):
            p.capsula(osso, 'pata', (px, py, hc - 0.06), (px, py, 0.04), 0.037, 0.033, seg=6)
            p.esfera(osso, 'casco', (px, py - 0.006, 0.022), (0.038, 0.044, 0.026), seg=8, aneis=5)
            # A lã cobre o alto da perna.
            p.esfera(osso, 'la', (px, py, hc - 0.065), (0.055, 0.055, 0.055), seg=8, aneis=5)

    # A cabeça creme na frente, um pouco abaixo do alto da lã, com o focinho mais claro.
    cc = Vector((0, -L - 0.07, hc + 0.12))
    cab = p.esfera('cabeca', 'rosto', tuple(cc), (0.098, 0.1, 0.108), seg=18, aneis=10)
    foc = p.esfera('cabeca', 'rosto', (0, cc.y - 0.068, cc.z - 0.045), (0.066, 0.05, 0.055), seg=12, aneis=7)
    rosto = [cab, foc]
    p.no_rosto('cabeca', 'nariz', rosto, 0, cc.z - 0.03, (0.02, 0.012, 0.013), afunda=0.3, seg=10, aneis=6)
    boca_w(p, rosto, cc.z - 0.058, 0.018, 0.018)
    olhos(p, rosto, 0.045, cc.z + 0.022, (0.026, 0.018, 0.03), afunda=0.2)
    bochechas(p, rosto, 0.07, cc.z - 0.02, 0.02)
    # O tufo de lã no alto da cabeça (a franja de algodão-doce).
    for x, y, z, r, cor in ((0, cc.y + 0.01, cc.z + 0.098, 0.05, 'la'), (0.045, cc.y + 0.025, cc.z + 0.085, 0.04, 'laLilas'),
                            (-0.045, cc.y + 0.025, cc.z + 0.085, 0.04, 'laClara'), (0, cc.y + 0.055, cc.z + 0.08, 0.042, 'la')):
        p.esfera('cabeca', cor, (x, y, z), (r, r, r * 0.9), seg=10, aneis=6)
    # As orelhas caídas para os lados, com o miolo rosa.
    base = (0.085, cc.y + 0.015, cc.z + 0.035)
    ponta = (0.17, cc.y + 0.03, cc.z - 0.005)
    for s, osso in ((1, 'orelha_esq'), (-1, 'orelha_dir')):
        meio = (0.132 * s, cc.y + 0.022, cc.z + 0.016)
        p.esfera(osso, 'rosto', meio, (0.07, 0.024, 0.036), rot=(0, 18 * s, -10 * s), seg=12, aneis=7)
        p.esfera(osso, 'orelha', (meio[0], meio[1] - 0.013, meio[2] - 0.002), (0.054, 0.012, 0.025),
                 rot=(0, 18 * s, -10 * s), seg=10, aneis=6)

    # A coleira de fita de menta e o sininho dourado na frente do pescoço.
    gola = (0, cc.y + 0.075, cc.z - 0.07)
    p.toro('corpo', 'fita', gola, 0.072, 0.014, rot=(62, 0, 0), seg=14, rseg=5)
    sino = (0, gola[1] - 0.068, gola[2] - 0.035)
    p.esfera('corpo', 'sino', sino, (0.022, 0.022, 0.024), seg=10, aneis=6)
    p.toro('corpo', 'sino', (sino[0], sino[1], sino[2] - 0.012), 0.016, 0.005, seg=10, rseg=3)

    # O rabinho: um tufo redondo atrás.
    cauda_c = (0, L + 0.05, hc + 0.06)
    p.esfera('cauda', 'laClara', cauda_c, (0.048, 0.045, 0.05), seg=10, aneis=6)

    p.esqueleto_quadrupede(
        hc=hc, anca=(ax, ay, hc - 0.05), ombro=(ox, oy, hc - 0.05),
        pescoco=(0, cc.y + 0.06, cc.z - 0.08), topo=(0, cc.y, cc.z + 0.12),
        cauda=((0, L + 0.01, hc + 0.05), (0, L + 0.09, hc + 0.07)),
        orelha=(base, ponta),
    )
    p.finalizar()
    clipes_quadrupede(p, {'passo': 28, 'galope': 40, 'cauda': 22, 'orelha': 10, 'pulo': 0.12, 'sentar': 24},
                      quais={'parado': 'parado', 'andar': 'andar', 'correr': 'correr', 'feliz': 'feliz'})
    return p


BICHOS = {'ovelhinha': ovelhinha}

if __name__ == '__main__':
    for pid in sys.argv[1:] or list(BICHOS):
        BICHOS[pid](pid).exportar()
