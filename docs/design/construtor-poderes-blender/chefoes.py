"""Os quatro chefões (Poder Chefão com resistência).

Grandes (caixa `chefao`: 6 de largura, 4 de fundo), desenhados com a frente em +Y e girados meia
volta (`virar_para_a_nave`): vêm do fundo, de frente para a nave. Cada um tem um ponto fraco aceso
no meio (onde os lasers acertam) e canhões dos lados.

    python chefoes.py
    python chefoes.py chefao-disco-mae
"""
import math
import sys

from lib_poderes import (R, asa, box, cor, cyl, cyl_y, espelhar_x, exportar, loft, pintar_faces, reset, rocha,
                         sphere, superellipsoid, torus, tube, virar_para_a_nave)


def comuns():
    reset()
    cor('grafite', '#22262f', 0.55)
    cor('metal', '#9aa4b4', 0.4)
    cor('nucleo', '#fff1f2', 0.2, '#ff2d55', 2.4)
    cor('chamaChefao', '#ffd9b0', 0.3, '#ff7a1a', 2.4)
    cor('luzChefao', '#fde68a', 0.3, '#fbbf24', 1.8)


def canhao(x, y, z, comp=0.9, r=0.11):
    return [cyl_y(r, comp, (x, y, z), 'grafite', verts=14, r2=r * 0.8, bevel=0.01),
            cyl_y(r * 1.4, 0.18, (x, y - comp / 2, z), 'metal', verts=14, bevel=0.01)]


def cruzador():
    """Cruzador blindado: casco comprido vermelho e grafite, torres de canhão e motores grandes."""
    comuns()
    cor('casco', '#8f1d2c', 0.45)
    cor('placa', '#3a3f4f', 0.5)
    casco = loft([(-1.95, 0.9, 0.5, 0.15), (-1.2, 1.3, 0.62, 0.2), (0.0, 1.35, 0.6, 0.2), (1.0, 1.0, 0.45, 0.15),
                  (1.7, 0.45, 0.25, 0.1), (1.98, 0.05, 0.05, 0.05)], 'casco', n=22, ex=2.8, achatar_baixo=0.6)
    pintar_faces(casco, 'placa', lambda c, n: n.z > 0.75 and abs(c.x) > 0.35)
    pecas = [casco, sphere(0.28, (0, 0.6, 0.5), 'nucleo', subdiv=2)]
    lado = asa((0.9, 0.4), (0.9, -1.4), (2.95, -0.6), (2.95, -1.3), -0.05, 0.12,
               [(0, 1, 0, 0.7, 'placa'), (0, 1, 0.7, 1, 'casco')])
    lado += canhao(1.6, 0.4, 0.5) + canhao(2.6, -0.2, 0.12, 0.7, 0.09)
    lado += [cyl_y(0.32, 0.6, (0.75, -1.65, 0.15), 'grafite', verts=18, bevel=0.02),
             cyl_y(0.26, 0.05, (0.75, -1.96, 0.15), 'chamaChefao', verts=18)]
    lado += [sphere(0.07, (x, 0.0, 0.62), 'luzChefao', subdiv=1) for x in (0.5, 0.9)]
    pecas += espelhar_x(lado)
    return exportar('chefao-cruzador', virar_para_a_nave(pecas, 'chefao-cruzador'), 'chefao')


def disco_mae():
    """Disco-mãe: prato enorme com anéis de luzes, cúpula e o olho vermelho no meio."""
    comuns()
    cor('prato', '#2a1260', 0.45)
    cor('pratoClaro', '#6d3fd0', 0.4)
    cor('cupula', '#14112e', 0.1, '#5b21b6', 0.5)
    prato = superellipsoid((5.9, 3.95, 0.7), (0, 0, 0.15), 'prato', e1=0.55, e2=1.0, seg=56, ring=16)
    pintar_faces(prato, 'pratoClaro', lambda c, n: n.z > 0.7)
    pecas = [prato, superellipsoid((2.2, 1.6, 1.3), (0, 0, 0.35), 'cupula', e1=0.6, e2=1.0, seg=32, ring=14, meia=True)]
    pecas.append(sphere(0.3, (0, 0.62, 0.62), 'nucleo', subdiv=2))
    for raio, n, z in ((2.55, 24, 0.36), (1.8, 16, 0.44)):
        for k in range(n):
            a = 2 * math.pi * k / n
            pecas.append(sphere(0.08, (math.cos(a) * raio, math.sin(a) * raio * 0.66, z), 'luzChefao', subdiv=1))
    pecas += [cyl(0.5, 0.3, (0, 0, -0.42), 'grafite', verts=24, r2=0.3)]
    pecas += canhao(1.4, 1.4, 0.1) + canhao(-1.4, 1.4, 0.1)
    return exportar('chefao-disco-mae', virar_para_a_nave(pecas, 'chefao-disco-mae'), 'chefao')


def escorpiao():
    """Escorpião mecânico: corpo em gomos laranja, duas garras na frente e a cauda com ferrão."""
    comuns()
    cor('laranja', '#e2741b', 0.45)
    cor('marrom', '#5a2a10', 0.5)
    pecas = []
    for i, (y, r) in enumerate(((0.6, 0.62), (0.0, 0.72), (-0.6, 0.62), (-1.1, 0.48))):
        pecas.append(sphere(r, (0, y, 0.2), 'laranja' if i % 2 == 0 else 'marrom', scale=(1.2, 0.7, 0.55), subdiv=2))
    pecas.append(sphere(0.25, (0, 1.05, 0.45), 'nucleo', subdiv=2))
    pecas.append(tube([(0, -1.4, 0.3), (0, -1.72, 0.55), (0, -1.6, 0.78), (0, -1.25, 0.82)], [0.17, 0.14, 0.11, 0.08], 'marrom', seg=10))
    pecas.append(cyl_y(0.09, 0.32, (0, -1.06, 0.82), 'nucleo', verts=10, r2=0.0))
    lado = [tube([(0.6, 0.7, 0.15), (1.4, 1.0, 0.15), (1.9, 1.3, 0.15)], [0.14, 0.13, 0.12], 'laranja', seg=10)]
    lado += [sphere(0.35, (2.1, 1.45, 0.15), 'marrom', scale=(1, 0.6, 0.5), subdiv=2)]
    lado += [box((0.18, 0.45, 0.12), (x, 1.7, 0.15), 'laranja', bevel=0.04) for x in (1.95, 2.3)]
    for k, y in enumerate((0.4, -0.1, -0.6)):
        lado.append(tube([(0.7, y, 0.1), (1.5, y - 0.1, 0.0), (1.9, y - 0.3, -0.5)], [0.07, 0.06, 0.05], 'marrom', seg=6))
    pecas += espelhar_x(lado)
    return exportar('chefao-escorpiao', virar_para_a_nave(pecas, 'chefao-escorpiao'), 'chefao')


def fortaleza():
    """Fortaleza-asteroide: uma rocha enorme com placas de metal, canhões e o núcleo aceso."""
    comuns()
    cor('rocha', '#6b6f7a', 0.9)
    cor('placaMetal', '#3c4558', 0.45)
    pedra = rocha(1.0, 'rocha', semente=7, subdiv=3, aspereza=0.18)
    pedra.scale = (2.45, 1.65, 0.62)
    pedra.location = (0, 0, 0.15)
    pecas = [pedra]
    for x, y in ((-1.3, 0.5), (1.3, 0.5), (0.0, -0.9), (-1.6, -0.6), (1.6, -0.6)):
        pecas.append(box((0.8, 0.7, 0.16), (x, y, 0.66), 'placaMetal', bevel=0.05))
    pecas.append(torus(0.42, 0.08, (0, 0.6, 0.74), 'metal', seg=24, rseg=6))
    pecas.append(sphere(0.24, (0, 0.6, 0.74), 'nucleo', subdiv=2))
    pecas += canhao(1.6, 1.2, 0.4) + canhao(-1.6, 1.2, 0.4) + canhao(0.9, 1.3, 0.62, 0.6, 0.08) + canhao(-0.9, 1.3, 0.62, 0.6, 0.08)
    pecas += [sphere(0.07, (x, -1.1, 0.7), 'luzChefao', subdiv=1) for x in (-0.6, 0.0, 0.6)]
    return exportar('chefao-fortaleza', virar_para_a_nave(pecas, 'chefao-fortaleza'), 'chefao')


CHEFOES = {
    'chefao-cruzador': cruzador,
    'chefao-disco-mae': disco_mae,
    'chefao-escorpiao': escorpiao,
    'chefao-fortaleza': fortaleza,
}

if __name__ == '__main__':
    for pid in sys.argv[1:] or CHEFOES:
        CHEFOES[pid]()
