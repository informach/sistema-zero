"""Os quatro coletores da Estação de Reciclagem (o que o jogador move para os lados).

Todos na caixa `coletor` (3 de largura, 2,2 de fundo, 1,6 de altura), com a boca de recolher
virada para +Y (o fundo do galpão, de onde as peças chegam). A câmera do jogo 3D vê o coletor
por TRÁS e de cima, e o 2D o vê de cima: o capricho mora no topo e na traseira (luzes, painel,
faixas). Nenhum é verde nem vermelho por inteiro: essas cores são das marcas das peças.

    python coletores.py
    python coletores.py coletor-robo-laranja
"""
import sys

from lib_estacao import (R, box, cor, cyl, exportar, farol, placa, placa_vertical, reset, roda, sphere,
                         superellipsoid, torus, tube)

FUNDO = -0.8  # o chão da caixa (onde as rodas encostam)


def comuns():
    reset()
    cor('pneu', '#23262f', 0.7)
    cor('cubo', '#c3cad6', 0.4)
    cor('farol', '#fff6cf', 0.2, '#fff1b0', 1.6)
    cor('lanterna', '#ff6a3d', 0.3, '#ff5a2a', 1.4)
    cor('grafite', '#2b2f3b', 0.55)
    cor('metal', '#aeb7c5', 0.4)
    cor('painel', '#14203d', 0.3)
    cor('tela', '#1f6fe0', 0.25, '#3fa2ff', 1.0)


def rodas(xs, ys, r, larg):
    out = []
    for x in xs:
        for y in ys:
            out += roda(x, y, FUNDO + r, r, larg)
    return out


def caçamba(x0, x1, y0, y1, z0, z1, m, m_borda, parede=0.07):
    """Caçamba aberta em cima, com a frente baixa para a peça entrar."""
    pecas = [box((x1 - x0, y1 - y0, parede), ((x0 + x1) / 2, (y0 + y1) / 2, z0 + parede / 2), m, bevel=0.02)]
    for x in (x0 + parede / 2, x1 - parede / 2):
        pecas.append(box((parede, y1 - y0, z1 - z0), (x, (y0 + y1) / 2, (z0 + z1) / 2), m, bevel=0.02))
    pecas.append(box((x1 - x0, parede, z1 - z0), ((x0 + x1) / 2, y0 + parede / 2, (z0 + z1) / 2), m, bevel=0.02))
    frente = z0 + (z1 - z0) * 0.45
    pecas.append(box((x1 - x0, parede, frente - z0), ((x0 + x1) / 2, y1 - parede / 2, (z0 + frente) / 2), m, bevel=0.02))
    # borda de cima (aro claro) nas três paredes altas
    pecas.append(box((x1 - x0 + 0.04, parede + 0.04, 0.06), ((x0 + x1) / 2, y0 + parede / 2, z1), m_borda, bevel=0.02))
    for x in (x0 + parede / 2, x1 - parede / 2):
        pecas.append(box((parede + 0.04, y1 - y0, 0.06), (x, (y0 + y1) / 2, z1), m_borda, bevel=0.02))
    return pecas


def carrinho_azul():
    """Carrinho de coleta: chassi azul, caçamba larga, quatro rodas, faróis e alça de empurrar."""
    comuns()
    cor('azul', '#2f6df0', 0.45)
    cor('azulEscuro', '#1c3c91', 0.5)
    cor('amarelo', '#ffc93a', 0.45)
    cor('branco', '#f3f6ff', 0.5)
    r = 0.26
    pecas = rodas((-1.22, 1.22), (-0.62, 0.62), r, 0.22)
    pecas.append(box((2.3, 1.75, 0.3), (0, 0, FUNDO + r + 0.06), 'azulEscuro', bevel=0.05))
    pecas += caçamba(-1.35, 1.35, -0.8, 0.95, FUNDO + r + 0.2, 0.62, 'azul', 'branco')
    pecas.append(box((2.72, 0.07, 0.1), (0, -0.84, FUNDO + r + 0.6), 'amarelo', bevel=0.02))  # faixa atrás
    pecas.append(box((2.4, 0.16, 0.14), (0, 1.0, FUNDO + r + 0.1), 'grafite', bevel=0.04))  # para-choque
    pecas += [farol(x, 1.08, FUNDO + r + 0.12) for x in (-0.95, 0.95)]
    pecas += [box((0.16, 0.05, 0.09), (x, -0.98, FUNDO + r + 0.12), 'lanterna', bevel=0.02) for x in (-1.0, 1.0)]
    alca = tube([(-0.7, -0.82, 0.6), (-0.7, -1.05, 0.74), (0.7, -1.05, 0.74), (0.7, -0.82, 0.6)], [0.04] * 4, 'grafite', seg=10)
    pecas.append(alca)
    pecas.append(sphere(0.07, (0, -0.5, 0.72), 'lanterna', subdiv=2))  # giroflex
    pecas.append(cyl(0.05, 0.12, (0, -0.5, 0.64), 'grafite', verts=10))
    return exportar('coletor-carrinho-azul', pecas, 'coletor')


def robo_laranja():
    """Robô coletor: corpo redondo laranja, pá larga na frente, cabeça com antena e um painel
    aceso atrás (o que a câmera vê)."""
    comuns()
    cor('laranja', '#ff8f2a', 0.45)
    cor('laranjaEscuro', '#c8601a', 0.5)
    cor('creme', '#fff1d6', 0.5)
    cor('olho', '#7df9ff', 0.2, '#3fe3ff', 1.8)
    r = 0.24
    pecas = rodas((-1.0, 1.0), (-0.5, 0.45), r, 0.3)
    corpo = superellipsoid((2.0, 1.55, 0.95), (0, -0.1, FUNDO + r + 0.46), 'laranja', e1=0.5, e2=0.55, seg=28, ring=14)
    faixa = superellipsoid((2.04, 1.58, 0.16), (0, -0.1, FUNDO + r + 0.42), 'creme', e1=0.3, e2=0.55, seg=28, ring=6)
    pecas += [corpo, faixa]
    # a pá: chapa larga inclinada na frente
    pa = placa([(-1.5, 0.62), (1.5, 0.62), (1.42, 1.1), (-1.42, 1.1)], FUNDO + 0.04, FUNDO + 0.1, 'laranjaEscuro', bevel=0.02)
    pecas.append(pa)
    pecas += [box((0.08, 0.5, 0.28), (x, 0.85, FUNDO + 0.2), 'laranjaEscuro', bevel=0.02) for x in (-1.45, 1.45)]
    cabeca = superellipsoid((0.9, 0.7, 0.42), (0, -0.25, 0.4), 'creme', e1=0.6, e2=0.6, seg=22, ring=12)
    visor = superellipsoid((0.74, 0.1, 0.24), (0, 0.08, 0.42), 'painel', e1=0.5, e2=0.5, seg=16, ring=8)
    olhos = [sphere(0.06, (x, 0.13, 0.43), 'olho', subdiv=2) for x in (-0.18, 0.18)]
    painel = box((0.6, 0.04, 0.22), (0, -0.6, 0.38), 'tela', bevel=0.02)  # o painel de trás
    antena = cyl(0.025, 0.2, (0.3, -0.35, 0.6), 'grafite', verts=8)
    bola = sphere(0.06, (0.3, -0.35, 0.72), 'lanterna', subdiv=2)
    pecas += [cabeca, visor, *olhos, painel, antena, bola]
    pecas += [box((0.18, 0.05, 0.08), (x, -0.88, FUNDO + r + 0.45), 'lanterna', bevel=0.02) for x in (-0.65, 0.65)]
    return exportar('coletor-robo-laranja', pecas, 'coletor')


def empilhadeira_amarela():
    """Mini empilhadeira: chassi amarelo, cabine de grade com teto, contrapeso escuro atrás e o
    garfo com uma bandeja na frente; giroflex laranja no teto."""
    comuns()
    cor('amarelo', '#ffc93a', 0.45)
    cor('amareloEscuro', '#d99a1c', 0.5)
    cor('banco', '#2f6df0', 0.5)
    r = 0.25
    pecas = rodas((-1.05, 1.05), (-0.55, 0.45), r, 0.26)
    pecas.append(box((1.9, 1.5, 0.42), (0, -0.15, FUNDO + r + 0.12), 'amarelo', bevel=0.06))
    pecas.append(box((1.95, 0.32, 0.5), (0, -0.92, FUNDO + r + 0.18), 'grafite', bevel=0.08))  # contrapeso
    for x in (-0.75, 0.75):
        for y in (-0.6, 0.25):
            pecas.append(cyl(0.035, 1.0, (x, y, 0.08), 'grafite', verts=8))
    pecas.append(box((1.7, 1.05, 0.06), (0, -0.18, 0.6), 'amareloEscuro', bevel=0.02))  # teto
    pecas.append(box((0.5, 0.45, 0.12), (0, -0.3, -0.18), 'banco', bevel=0.04))
    pecas.append(box((0.5, 0.1, 0.4), (0, -0.55, 0.0), 'banco', bevel=0.04))
    # mastro e garfo com a bandeja
    for x in (-0.55, 0.55):
        pecas.append(box((0.1, 0.1, 1.15), (x, 0.62, -0.08), 'grafite', bevel=0.02))
    pecas.append(box((1.3, 0.08, 0.1), (0, 0.62, 0.45), 'grafite', bevel=0.02))
    pecas.append(box((2.6, 0.5, 0.06), (0, 0.85, FUNDO + 0.18), 'metal', bevel=0.02))  # bandeja
    pecas += [box((0.06, 0.5, 0.18), (x, 0.85, FUNDO + 0.27), 'amarelo', bevel=0.02) for x in (-1.32, 1.32)]
    pecas.append(box((2.6, 0.06, 0.16), (0, 1.07, FUNDO + 0.26), 'amarelo', bevel=0.02))
    pecas.append(sphere(0.1, (0, -0.25, 0.7), 'lanterna', subdiv=2))
    pecas += [box((0.16, 0.05, 0.1), (x, -1.07, FUNDO + r + 0.2), 'lanterna', bevel=0.02) for x in (-0.7, 0.7)]
    pecas += [box((0.5, 0.02, 0.07), (x, -1.07, FUNDO + r + 0.36), 'amarelo', bevel=0.0) for x in (-0.5, 0.5)]
    return exportar('coletor-empilhadeira-amarela', pecas, 'coletor')


def aspirador_lilas():
    """Varredeira larga: corpo baixo lilás, escova giratória na frente, cúpula clara com as peças
    recolhidas dentro e faróis."""
    comuns()
    cor('lilas', '#8b6cff', 0.45)
    cor('lilasEscuro', '#5b40c9', 0.5)
    cor('cupula', '#e9e3ff', 0.15, '#d8ccff', 0.2)
    cor('escova', '#ffc93a', 0.6)
    cor('cerdas', '#262b37', 0.7)
    r = 0.2
    pecas = rodas((-1.25, 1.25), (-0.65, 0.2), r, 0.2)
    corpo = superellipsoid((2.9, 1.7, 0.5), (0, -0.2, FUNDO + r + 0.22), 'lilas', e1=0.4, e2=0.35, seg=30, ring=12)
    saia = box((3.0, 0.3, 0.2), (0, 0.62, FUNDO + 0.16), 'lilasEscuro', bevel=0.05)
    escova = cyl(0.17, 2.7, (0, 0.88, FUNDO + 0.21), 'cerdas', verts=18, rot=(0, R(90), 0))
    aneis = [torus(0.17, 0.035, (x, 0.88, FUNDO + 0.21), 'escova', seg=16, rseg=5, rot=(0, R(90), 0))
             for x in (-1.1, -0.66, -0.22, 0.22, 0.66, 1.1)]
    tampa = box((2.95, 0.12, 0.12), (0, 0.9, FUNDO + 0.42), 'lilasEscuro', bevel=0.04)
    cupula = superellipsoid((1.5, 1.0, 0.85), (0, -0.25, FUNDO + r + 0.42), 'cupula', e1=0.6, e2=0.7, seg=24, ring=12, meia=True)
    dentro = [box((0.24, 0.2, 0.14), (-0.3, -0.3, FUNDO + r + 0.55), 'escova', bevel=0.03),
              cyl(0.1, 0.24, (0.25, -0.15, FUNDO + r + 0.56), 'metal', verts=12, rot=(0, R(90), 0))]
    aro_cupula = torus(0.74, 0.04, (0, -0.25, FUNDO + r + 0.43), 'lilasEscuro', seg=30, rseg=5)
    aro_cupula.scale = (1, 0.68, 1)
    pecas += [corpo, saia, escova, *aneis, tampa, *dentro, cupula, aro_cupula]
    pecas += [farol(x, 0.98, FUNDO + 0.44, r=0.06) for x in (-1.2, 1.2)]
    pecas += [box((0.2, 0.05, 0.08), (x, -1.05, FUNDO + r + 0.24), 'lanterna', bevel=0.02) for x in (-1.0, 1.0)]
    pecas.append(box((0.9, 0.05, 0.12), (0, -1.05, FUNDO + r + 0.26), 'painel', bevel=0.02))
    pecas.append(sphere(0.08, (0.9, -0.6, FUNDO + r + 0.52), 'lanterna', subdiv=2))
    return exportar('coletor-aspirador-lilas', pecas, 'coletor')


COLETORES = {
    'coletor-carrinho-azul': carrinho_azul,
    'coletor-robo-laranja': robo_laranja,
    'coletor-empilhadeira-amarela': empilhadeira_amarela,
    'coletor-aspirador-lilas': aspirador_lilas,
}

if __name__ == '__main__':
    for pid in sys.argv[1:] or COLETORES:
        COLETORES[pid]()
