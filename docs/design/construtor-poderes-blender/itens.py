"""Os itens que caem e dão um Poder: escudo, tiro triplo e plasma (quatro de cada).

Cada item é uma ficha de pé, inclinada para a câmera (`lib_poderes.de_pe`): moldura, fundo e o
símbolo do Poder, com um halo aceso atrás. A FAMÍLIA de cor e o símbolo dizem o Poder (escudo
ciano com o escudo, tiro triplo amarelo com as três setas, plasma roxo com o raio); as quatro
variações mudam só a forma da moldura. Na caixa `item-*` (cubo de 1,2).

    python itens.py
    python itens.py item-escudo-hexagono
"""
import math
import sys

from lib_poderes import (R, cor, cyl, de_pe, estrela, exportar, icone, placa, poligono, reset, sphere, torus)

MOLDURAS = {
    'redondo': dict(lados=40, giro=0.0),
    'hexagono': dict(lados=6, giro=math.pi / 6),
    'losango': dict(lados=4, giro=0.0),
    'octogono': dict(lados=8, giro=math.pi / 8),
}

PALETAS = {
    'escudo': dict(fundo='#0b3a66', moldura='#22d3ee', brilho='#7df9ff', simbolo='#e8fbff', halo='#38bdf8'),
    'triplo': dict(fundo='#5a2a00', moldura='#fbbf24', brilho='#ffe08a', simbolo='#fff7e0', halo='#f59e0b'),
    'plasma': dict(fundo='#3b0764', moldura='#c084fc', brilho='#f0abfc', simbolo='#fdf4ff', halo='#a855f7'),
}

R_FICHA = 0.46


def simbolo_escudo(z):
    contorno = [(0.0, 0.26), (0.2, 0.2), (0.19, 0.0), (0.12, -0.15), (0.0, -0.26), (-0.12, -0.15), (-0.19, 0.0), (-0.2, 0.2)]
    faixa = [(0.0, 0.17), (0.06, 0.15), (0.06, -0.16), (0.0, -0.19), (-0.06, -0.16), (-0.06, 0.15)]
    return [icone(contorno, z, z + 0.03, 'simbolo'), icone(faixa, z + 0.03, z + 0.045, 'moldura')]


def simbolo_triplo(z):
    pecas = []
    # as três setas saem do mesmo ponto embaixo e se abrem em leque para cima, como os tiros
    base = -0.24
    for ang in (-30, 0, 30):
        a = math.radians(ang)
        c, s = math.cos(a), math.sin(a)
        pts = [(-0.025, 0.0), (0.025, 0.0), (0.025, 0.3), (0.07, 0.3), (0.0, 0.44), (-0.07, 0.3), (-0.025, 0.3)]
        pecas.append(placa([(x * c - y * s, x * s + y * c + base) for x, y in pts], z, z + 0.035, 'simbolo'))
    return pecas


def simbolo_plasma(z):
    raio = [(0.06, 0.26), (-0.1, 0.0), (0.0, 0.0), (-0.07, -0.26), (0.12, 0.04), (0.02, 0.04), (0.1, 0.26)]
    return [icone(raio, z, z + 0.035, 'simbolo'), sphere(0.05, (0.13, -0.15, z + 0.03), 'brilho', subdiv=2),
            sphere(0.035, (-0.14, 0.15, z + 0.03), 'brilho', subdiv=2)]


SIMBOLOS = {'escudo': simbolo_escudo, 'triplo': simbolo_triplo, 'plasma': simbolo_plasma}


def ficha(poder, forma):
    reset()
    p = PALETAS[poder]
    cor('fundo', p['fundo'], 0.4, p['halo'], 0.25)
    cor('moldura', p['moldura'], 0.35, p['moldura'], 0.6)
    cor('brilho', p['brilho'], 0.3, p['brilho'], 1.4)
    cor('simbolo', p['simbolo'], 0.4, p['simbolo'], 0.5)
    cor('halo', p['halo'], 0.3, p['halo'], 1.0, alfa=0.35)
    m = MOLDURAS[forma]
    lados, giro = m['lados'], m['giro']
    r_moldura = R_FICHA * (1.0 if lados > 8 else 1.12 if lados == 4 else 1.04)
    pecas = []
    if lados > 8:
        pecas.append(cyl(R_FICHA * 0.9, 0.08, (0, 0, 0), 'fundo', verts=40))
        pecas.append(torus(R_FICHA * 0.92, 0.055, (0, 0, 0.02), 'moldura', seg=40, rseg=8))
    else:
        pecas.append(placa(poligono(lados, r_moldura * 0.86, giro), -0.04, 0.04, 'fundo', bevel=0.01))
        externo = poligono(lados, r_moldura, giro)
        interno = poligono(lados, r_moldura * 0.82, giro)
        for k in range(lados):
            a, b = externo[k], externo[(k + 1) % lados]
            c, d = interno[(k + 1) % lados], interno[k]
            pecas.append(placa([a, b, c, d], -0.05, 0.07, 'moldura'))
    pecas += SIMBOLOS[poder](0.04)
    # o halo: um disco translúcido atrás, maior que a ficha, e quatro faíscas em volta
    pecas.append(cyl(R_FICHA * 1.18, 0.01, (0, 0, -0.07), 'halo', verts=40))
    for k in range(4):
        a = giro + math.pi / 4 + k * math.pi / 2
        pecas.append(sphere(0.035, (math.cos(a) * R_FICHA * 1.15, math.sin(a) * R_FICHA * 1.15, 0.02), 'brilho', subdiv=1))
    return exportar(f'item-{poder}-{forma}', de_pe(pecas, f'item-{poder}-{forma}'), f'item-{poder}')


ITENS = {f'item-{p}-{f}': (lambda p=p, f=f: ficha(p, f)) for p in ('escudo', 'triplo', 'plasma') for f in MOLDURAS}

if __name__ == '__main__':
    for pid in sys.argv[1:] or ITENS:
        ITENS[pid]()
