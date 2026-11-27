"""Ajudantes da arte da Estação de Reciclagem (a missão do Construtor), sobre os da arte espacial.

Reaproveita tudo de `../construtor-espaco-blender/lib_espaco.py` (malhas, paleta, caixa da
categoria com os marcos de 1 mm, exportação) e acrescenta as categorias da missão:

| categoria | caixa (Blender: x, y = frente, z = cima) | tamanho no bloco |
|---|---|---|
| coletor | x ±1,5 · frente ±1,1 · altura ±0,8 | 3 |
| reciclavel | cubo ±0,75 | 1,5 |
| proibido | cubo ±0,75 | 1,5 |
| galpao | cubo ±50 | 100 |

Convenções do jogo (as mesmas da Patrulha Espacial): a frente da peça aponta para +Y do Blender,
que vira -Z no jogo, para o fundo do galpão, de onde as peças chegam. As peças apoiam a base no
fundo da caixa (z = -0,75): no jogo, o centro fica 0,75 acima da esteira.

O código de cores da regra (o enunciado diz qual é qual) mora em DUAS marcas que aparecem nas
duas câmeras (a do jogo 3D, de trás e de cima, e a vista de cima do 2D): o aro aceso no pé da
peça e o selo redondo inclinado para a câmera. Verde com o símbolo de reciclar: vale ponto.
Vermelho com o X: tira vida. A forma da peça muda nas variações; as duas marcas, nunca.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'construtor-espaco-blender'))

import lib_espaco  # noqa: E402
from lib_espaco import *  # noqa: E402,F401,F403
from lib_espaco import R, Vector, bmesh, box, cor, cyl, juntar, placa, torus, _obj  # noqa: E402

lib_espaco.OUT = os.environ.get('ESTACAO_OUT', os.path.join(HERE, 'out'))
lib_espaco.CAIXAS.update({
    'coletor': ((-1.5, -1.1, -0.8), (1.5, 1.1, 0.8)),
    'reciclavel': ((-0.75, -0.75, -0.75), (0.75, 0.75, 0.75)),
    'proibido': ((-0.75, -0.75, -0.75), (0.75, 0.75, 0.75)),
    'galpao': ((-50.0, -50.0, -50.0), (50.0, 50.0, 50.0)),
})
lib_espaco.TAMANHO_NO_BLOCO.update({'coletor': 3, 'reciclavel': 1.5, 'proibido': 1.5, 'galpao': 100})
CAIXAS = lib_espaco.CAIXAS
TAMANHO_NO_BLOCO = lib_espaco.TAMANHO_NO_BLOCO

PISO = -0.75  # o fundo da caixa das peças (onde a peça encosta na esteira)


def cores_da_regra():
    """As cores das duas marcas. Base escura + emissão: aceso sem lavar a cor na luz do jogo."""
    cor('marcaVerde', '#0f7a3a', 0.4, '#2fe07a', 1.1)
    cor('marcaVermelha', '#8a1420', 0.4, '#ff3b4a', 1.1)
    cor('seloBranco', '#ffffff', 0.5, '#ffffff', 0.35)
    cor('seloVerde', '#22b85a', 0.45)
    cor('seloVermelho', '#e2333f', 0.45)


def aro(tipo, raio=0.66, z=PISO + 0.03):
    """O aro aceso no pé da peça (anel achatado no chão da esteira)."""
    m = 'marcaVerde' if tipo == 'reciclavel' else 'marcaVermelha'
    a = torus(raio, 0.045, (0, 0, z), m, seg=40, rseg=6)
    a.scale = (1, 1, 0.55)
    return a


def _seta(ang, raio, larg):
    """Uma das três setas do símbolo de reciclar: um trecho de arco com a ponta de flecha."""
    pts_ext, pts_int = [], []
    a0, a1 = ang - R(38), ang + R(22)
    n = 6
    for i in range(n + 1):
        t = a0 + (a1 - a0) * i / n
        pts_ext.append((math.cos(t) * (raio + larg / 2), math.sin(t) * (raio + larg / 2)))
        pts_int.append((math.cos(t) * (raio - larg / 2), math.sin(t) * (raio - larg / 2)))
    corpo = pts_ext + list(reversed(pts_int))
    ponta_c = a1 + R(24)
    ponta = [(math.cos(a1) * (raio + larg * 1.25), math.sin(a1) * (raio + larg * 1.25)),
             (math.cos(ponta_c) * raio, math.sin(ponta_c) * raio),
             (math.cos(a1) * (raio - larg * 1.25), math.sin(a1) * (raio - larg * 1.25))]
    return [corpo, ponta]


def selo(tipo, centro, raio=0.24, inclinar=50):
    """O selo redondo: disco colorido com o símbolo branco (três setas ou um X), virado para a
    câmera do jogo (que fica atrás e acima) e ainda legível de cima."""
    fundo = 'seloVerde' if tipo == 'reciclavel' else 'seloVermelho'
    disco = cyl(raio, 0.05, (0, 0, 0), fundo, verts=28, bevel=0.012)
    borda = torus(raio, 0.022, (0, 0, 0), 'seloBranco', seg=28, rseg=5)
    pecas = [disco, borda]
    z = 0.027
    if tipo == 'reciclavel':
        for k in range(3):
            for contorno in _seta(R(90 + 120 * k), raio * 0.55, raio * 0.2):
                pecas.append(placa(contorno, z, z + 0.014, 'seloBranco'))
    else:
        # 57° no disco deitado viram 45° na vista inclinada da câmera (o selo encolhe na altura)
        for ang in (57, -57):
            barra = box((raio * 1.25, raio * 0.3, 0.014), (0, 0, z + 0.007), 'seloBranco', bevel=0.004)
            barra.rotation_euler = (0, 0, R(ang))
            pecas.append(barra)
    o = juntar(pecas, 'selo')
    o.rotation_euler = (R(inclinar), 0, 0)  # a face do selo vira para -Y (a câmera)
    o.location = centro
    return o


def roda(x, y, z, r, larg, m='pneu', m_cubo='cubo'):
    """Roda com o eixo em x (pneu e calota)."""
    pneu = cyl(r, larg, (x, y, z), m, verts=20, rot=(0, R(90), 0), bevel=0.02)
    lado = 1 if x >= 0 else -1
    cubo = cyl(r * 0.5, 0.02, (x + lado * larg / 2, y, z), m_cubo, verts=16, rot=(0, R(90), 0))
    return [pneu, cubo]


def farol(x, y, z, r=0.07, m='farol'):
    return cyl(r, 0.04, (x, y, z), m, verts=16, rot=(R(90), 0, 0))
