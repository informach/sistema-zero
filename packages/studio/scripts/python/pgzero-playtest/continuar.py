"""Continuar?: the title waits for space; in the game the arrows dodge falling rocks, each rock
that passes is a point and a hit costs a life; with no lives the continue screen counts ten
seconds: space goes back to the game keeping the points, and the end of the count goes to the
title, keeping the record; every state has its rules, each a (condition, next state) pair."""

import random


def desviar(t, quadros):
    nave = t.get('nave')
    for _ in range(quadros):
        if t.get('estado') != 'jogo':
            return
        t.up('LEFT')
        t.up('RIGHT')
        perigo = [p for p in t.get('pedras') if p.bottom > nave.top - 160 and abs(p.x - nave.x) < 50]
        if perigo:
            p = min(perigo, key=lambda p: nave.top - p.bottom)
            if (p.x >= nave.x and nave.left > 60) or nave.right > t.get('WIDTH') - 60:
                t.down('LEFT')
            else:
                t.down('RIGHT')
        t.step(1)
    t.up('LEFT')
    t.up('RIGHT')


def play(t):
    random.seed(2)
    regras = t.get('REGRAS')
    t.check('cada estado tem as suas regras de (condição, próximo estado)',
            set(regras) == {'titulo', 'jogo', 'continuar'} and all(callable(c) and p in regras for r in regras.values() for c, p in r))
    t.step(60)
    t.check('o título espera o espaço', t.get('estado') == 'titulo')
    t.shot('titulo')
    t.tap('SPACE')
    t.check('espaço começa o jogo com três vidas e zero pontos', t.get('estado') == 'jogo' and t.get('vidas') == 3 and t.get('pontos') == 0)

    # As pedras: a que passa vale ponto, a que bate tira vida.
    nave = t.get('nave')
    t.hold('LEFT', 100)
    t.check('as setas movem a nave, até a borda', nave.left <= 6 and nave.left > -6)
    pedras = t.get('pedras')
    pedras.clear()
    pedra = t.get('Actor')('pedra', (700, t.get('HEIGHT') + 15))
    pedra.velocidade = 10
    pedras.append(pedra)
    pontos = t.get('pontos')
    t.step(1)
    t.check('a pedra que passa sem bater vale um ponto', t.get('pontos') == pontos + 1 and pedra not in pedras)
    pedra = t.get('Actor')('pedra', (nave.x, nave.y - 30))
    pedra.velocidade = 5
    pedras.append(pedra)
    t.step(1)
    t.check('a pedra que bate na nave tira uma vida', t.get('vidas') == 2)

    # Duas pedras no mesmo quadro com uma vida só também levam à tela de continuar.
    t.set('vidas', 1)
    pedras.clear()
    for dx in (-10, 10):
        pedra = t.get('Actor')('pedra', (nave.x + dx, nave.y - 30))
        pedra.velocidade = 5
        pedras.append(pedra)
    t.step(1)
    t.check('duas pedras de uma vez com uma vida: tela de continuar', t.get('estado') == 'continuar')
    t.tap('SPACE')

    # Sem vidas, a tela de continuar.
    t.set('vidas', 1)
    pedras.clear()
    pedra = t.get('Actor')('pedra', (nave.x, nave.y - 30))
    pedra.velocidade = 5
    pedras.append(pedra)
    t.step(1)
    t.check('sem vidas, aparece a tela de continuar com a contagem', t.get('estado') == 'continuar' and t.get('quadros_da_contagem') > 9 * 60)
    t.shot('continuar')
    pontos = t.get('pontos')
    t.step(120)
    t.check('a contagem anda', t.get('estado') == 'continuar' and (t.get('quadros_da_contagem') + 59) // 60 == 8)
    t.tap('SPACE')
    t.check('espaço continua com os pontos e as vidas de volta', t.get('estado') == 'jogo' and t.get('pontos') == pontos and t.get('vidas') == 3)

    # Deixando a contagem acabar, volta ao título e o recorde fica.
    t.set('vidas', 0)
    t.step(1)
    t.check('perdendo as vidas de novo, volta a tela de continuar', t.get('estado') == 'continuar')
    t.until(lambda: t.get('estado') != 'continuar', 60 * 11)
    t.check('com a contagem no fim, volta ao título', t.get('estado') == 'titulo' and t.get('pontos') == 0)
    t.check('e o recorde guarda os pontos daquela partida', t.get('recorde') == pontos)

    # Desviando das pedras, junta pontos; parada, perde as vidas.
    t.tap('SPACE')
    desviar(t, 60 * 30)
    t.check('desviando das pedras, passa de 40 pontos', t.get('pontos') > 40, f"{t.get('pontos')} pontos, vidas={t.get('vidas')}")
    t.shot('jogo')
    t.get('mudar_para')('jogo')
    t.until(lambda: t.get('estado') != 'jogo', 60 * 60)
    t.check('parada no meio, as pedras acabam com as vidas', t.get('estado') == 'continuar')
