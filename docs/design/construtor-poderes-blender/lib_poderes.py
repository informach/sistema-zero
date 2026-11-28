"""Ajudantes da arte dos Poderes do Construtor, sobre os da arte espacial.

Reaproveita `../construtor-espaco-blender/lib_espaco.py` (malhas, paleta, caixa da categoria com
os marcos de 1 mm, exportação) e acrescenta as categorias dos cinco Poderes:

| categoria | caixa (Blender: x, y = frente, z = cima) | tamanho no bloco |
|---|---|---|
| item-escudo, item-triplo, item-plasma | cubo ±0,6 | 1,2 |
| inimiga | x ±1,5 · frente ±1,15 · altura -0,34 a 0,46 (a da nave) | 3 |
| laser-inimigo | x e altura ±0,14 · frente ±0,45 (a do laser) | 0,9 |
| chefao | x ±3 · frente ±2 · altura -0,6 a 1 | 6 |
| plasma | x e altura ±0,3 · frente ±0,4 | 0,8 |

A nave da criança aponta o bico para +Y (o fundo do jogo). A inimiga, o laser inimigo e o chefão
vêm do fundo para a nave: o bico deles aponta para -Y (`virar_para_a_nave`). Os itens ficam de pé
e inclinados para a câmera, como uma moeda, legíveis de trás e de cima (3D) e de cima (2D).
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'construtor-espaco-blender'))

import lib_espaco  # noqa: E402
from lib_espaco import *  # noqa: E402,F401,F403
from lib_espaco import R, juntar, placa  # noqa: E402

lib_espaco.OUT = os.environ.get('PODERES_OUT', os.path.join(HERE, 'out'))
lib_espaco.CAIXAS.update({
    'item-escudo': ((-0.6, -0.6, -0.6), (0.6, 0.6, 0.6)),
    'item-triplo': ((-0.6, -0.6, -0.6), (0.6, 0.6, 0.6)),
    'item-plasma': ((-0.6, -0.6, -0.6), (0.6, 0.6, 0.6)),
    'inimiga': ((-1.5, -1.15, -0.34), (1.5, 1.15, 0.46)),
    'laser-inimigo': ((-0.14, -0.45, -0.14), (0.14, 0.45, 0.14)),
    'chefao': ((-3.0, -2.0, -0.6), (3.0, 2.0, 1.0)),
    'plasma': ((-0.3, -0.4, -0.3), (0.3, 0.4, 0.3)),
})
lib_espaco.TAMANHO_NO_BLOCO.update({
    'item-escudo': 1.2, 'item-triplo': 1.2, 'item-plasma': 1.2, 'inimiga': 3, 'laser-inimigo': 0.9,
    'chefao': 6, 'plasma': 0.8,
})
CAIXAS = lib_espaco.CAIXAS


def virar_para_a_nave(pecas, nome):
    """Junta as peças e gira meia volta: o bico desenhado em +Y passa a apontar para -Y."""
    o = juntar(pecas, nome)
    o.rotation_euler = (0, 0, math.pi)
    return [o]


def de_pe(pecas, nome, inclinar=50):
    """Junta as peças desenhadas deitadas (a face para +Z) e as levanta, inclinadas para a câmera
    (que fica atrás, em -Y, e acima)."""
    o = juntar(pecas, nome)
    o.rotation_euler = (R(inclinar), 0, 0)
    return [o]


def poligono(n, r, giro=0.0):
    return [(math.cos(giro + 2 * math.pi * k / n) * r, math.sin(giro + 2 * math.pi * k / n) * r) for k in range(n)]


def estrela(pontas, r_fora, r_dentro, giro=math.pi / 2):
    pts = []
    for k in range(pontas * 2):
        r = r_fora if k % 2 == 0 else r_dentro
        a = giro + math.pi * k / pontas
        pts.append((math.cos(a) * r, math.sin(a) * r))
    return pts


def icone(contorno, z0, z1, m, escala=1.0, desloc=(0.0, 0.0)):
    return placa([(x * escala + desloc[0], y * escala + desloc[1]) for x, y in contorno], z0, z1, m)
