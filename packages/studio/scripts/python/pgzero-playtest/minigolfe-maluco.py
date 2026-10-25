"""Minigolfe Maluco: a standing wall turns the ball sideways, a lying one up and down; the water
sends the ball back with one more stroke; the hole ends the hole and the next one starts; a
golfer that tries shots in its head plays all three holes near par."""

import math
from collections import deque

import pygame


def distancias(mapa, buraco, passo=6):
    """Grid steps from every free cell to the hole, never through a wall or the water."""
    largura, altura = mapa.get_size()

    def livre(cx, cy):
        x, y = cx * passo + passo // 2, cy * passo + passo // 2
        for dx, dy in ((0, 0), (-7, 0), (7, 0), (0, -7), (0, 7)):
            cor = mapa.get_at((x + dx, y + dy))
            if not (cor[0] > 200 and cor[1] > 200 and cor[2] > 200) and not (cor[0] < 50 and cor[1] < 50 and cor[2] < 50):
                return False
        return True

    alvo = (buraco[0] // passo, buraco[1] // passo)
    dist = {alvo: 0}
    fila = deque([alvo])
    while fila:
        cx, cy = fila.popleft()
        for vx, vy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cx + vx, cy + vy)
            if n not in dist and 0 <= n[0] < largura // passo and 0 <= n[1] < altura // passo and livre(*n):
                dist[n] = dist[(cx, cy)] + 1
                fila.append(n)
    return lambda x, y: dist.get((int(x) // passo, int(y) // passo), 10_000)


def simular(t, angulo, forca):
    """Plays one shot in the real game and puts everything back; returns where it stopped."""
    bolinha = t.get('bolinha')
    guardado = (bolinha.pos, t.get('tacadas'), t.get('aviso'), t.get('buraco'))
    t.get('seta').angle = angulo
    t.set('forca', forca)
    t.get('tacar')()
    update = t.get('update')
    for _ in range(900):
        if t.get('estado') != 'rolando':
            break
        update()
    resultado = (t.get('estado'), bolinha.pos, t.get('tacadas') - guardado[1])
    if resultado[0] == 'acertou':
        t.get('placar').pop()
        t.get('clock').unschedule(t.get('proximo_buraco'))
    bolinha.pos, bolinha.vx, bolinha.vy = guardado[0], 0, 0
    t.set('tacadas', guardado[1])
    t.set('aviso', guardado[2])
    t.set('estado', 'mirando')
    return resultado


def melhor_tacada(t, distancia):
    melhor = None
    for angulo in range(0, 360, 6):
        for forca in (2, 4, 6, 8, 10):
            estado, onde, custo = simular(t, angulo, forca)
            nota = 0 if estado == 'acertou' else distancia(*onde) + (60 if custo > 1 else 0)
            if melhor is None or nota < melhor[0]:
                melhor = (nota, angulo, forca)
    return melhor


def play(t):
    bolinha = t.get('bolinha')
    t.check('começa no buraco 1, mirando', t.get('buraco') == 0 and t.get('estado') == 'mirando')
    t.shot('buraco1')

    # Parede em pé (azul): a bola volta para o lado.
    bolinha.pos = (700, 200)
    bolinha.vx, bolinha.vy = 4, 0
    t.set('estado', 'rolando')
    t.step(20)
    t.check('na parede em pé, a bola volta para o lado', bolinha.vx < 0, f'vx={bolinha.vx:.2f}')
    # Parede deitada (vermelha): a bola volta para cima.
    bolinha.pos = (300, 280)
    bolinha.vx, bolinha.vy = 0, 4
    t.set('estado', 'rolando')
    t.step(20)
    t.check('na parede deitada, a bola volta para cima', bolinha.vy < 0, f'vy={bolinha.vy:.2f}')
    t.step(400)
    t.check('e para de rolar com o atrito', t.get('estado') == 'mirando')

    # Mirar e a força.
    t.hold('LEFT', 10)
    t.check('a seta da esquerda gira a mira', t.get('seta').angle == 30)
    for _ in range(12):
        t.tap('UP')
    t.check('a força vai até 10', t.get('forca') == 10)

    # Jogar os três buracos pensando antes de cada tacada.
    t.get('novo_jogo')()
    pygame_mapas = [pygame.image.load(f'images/mapa{n}.png') for n in (1, 2, 3)]
    buracos = [(660, 500), (660, 160), (700, 330)]
    tacadas_por_buraco = []
    for numero in range(3):
        distancia = distancias(pygame_mapas[numero], buracos[numero])
        t.check(f'buraco {numero + 1}: dá para chegar do início ao buraco', distancia(*bolinha.pos) < 10_000)
        tentativas = 0
        while t.get('buraco') == numero and t.get('estado') != 'fim' and tentativas < 10:
            _, angulo, forca = melhor_tacada(t, distancia)
            t.get('seta').angle = angulo
            t.set('forca', forca)
            t.tap('SPACE')
            t.until(lambda: t.get('estado') != 'rolando', 900)
            tentativas += 1
            if t.get('estado') == 'acertou':
                t.shot(f'acertou{numero + 1}')
                t.step(130)
        tacadas_por_buraco.append(tentativas)
    pares = t.get('PARES')
    t.check('joga os três buracos até o fim', t.get('estado') == 'fim', f'tacadas={tacadas_por_buraco}')
    t.check('perto do par em cada buraco', all(feitas <= par + 1 for feitas, par in zip(tacadas_por_buraco, pares)),
            f'tacadas={tacadas_por_buraco}, par={pares}')
    t.check('o placar guarda as tacadas de cada buraco', t.get('placar') == tacadas_por_buraco)
    t.shot('fim')

    # A água devolve a bola e conta uma tacada a mais.
    t.tap('SPACE')
    t.set('buraco', 2)
    t.get('comecar_buraco')()
    t.get('seta').angle = 0
    t.set('forca', 6)
    t.tap('SPACE')
    t.until(lambda: t.get('estado') != 'rolando', 900)
    t.check('caindo na água, a bola volta para onde estava', bolinha.pos == (100, 330))
    t.check('e conta uma tacada a mais', t.get('tacadas') == 2 and 'água' in t.get('aviso'))
