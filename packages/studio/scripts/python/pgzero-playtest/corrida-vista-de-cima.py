"""Corrida Vista de Cima: nobody moves during the countdown; the computer cars follow the grey
of the guide and do laps on their own; no car ever leaves the track; a lap only counts after
the bottom of the track; a pilot that steers by the same guide finishes three laps and the
game says the place."""

import random


def tom(t, carro):
    return t.get('cor_do_guia')(carro.x, carro.y)[1]


def segurar(t, teclas):
    for tecla in ('UP', 'LEFT', 'RIGHT'):
        if tecla in teclas:
            t.down(tecla)
        else:
            t.up(tecla)


def play(t):
    random.seed(4)
    carros = t.get('carros')
    na_pista = t.get('na_pista')
    t.check('quatro carros na largada, todos na pista', len(carros) == 4 and all(na_pista(c.x, c.y) for c in carros))
    t.shot('largada')
    t.down('UP')
    t.step(150)
    t.up('UP')
    t.check('durante a contagem ninguém sai do lugar', carros[0].x == 380 and carros[1].x == 380, f'{carros[0].pos}')
    t.step(40)
    t.check('depois do "já", os carros do computador andam', carros[1].x > 380 and carros[3].x > 320)

    # Ida e volta na linha de chegada sem dar a volta não conta.
    jogador = carros[0]
    jogador.pos = (430, 120)
    jogador.angle = 0
    jogador.velocidade = 0
    t.get('contar_volta')(jogador, 410)
    t.check('cruzar a linha sem passar por baixo não conta volta', jogador.voltas == 0)

    # O piloto segue o cinza do guia, como os carros do computador.
    t.get('novo_jogo')()
    carros = t.get('carros')
    jogador = carros[0]
    t.step(200)
    sempre_na_pista = True
    quadros = 0
    while not t.get('terminou') and quadros < 60 * 120:
        valor = tom(t, jogador)
        teclas = ['UP']
        if valor > 146:
            teclas.append('RIGHT')
        elif valor < 126:
            teclas.append('LEFT')
        segurar(t, teclas)
        t.step(1)
        quadros += 1
        if not all(na_pista(c.x, c.y) for c in carros):
            sempre_na_pista = False
        if quadros <= 60 * 40:
            voltas_do_computador = [c.voltas for c in carros[1:]]
    segurar(t, [])
    t.check('nenhum carro sai da pista durante a corrida', sempre_na_pista)
    t.check('os carros do computador completam voltas sozinhos', min(voltas_do_computador) >= 1, f'{voltas_do_computador}')
    t.check('o piloto termina as três voltas', t.get('terminou') and jogador.voltas == 3,
            f'voltas={jogador.voltas} em {quadros} quadros')
    t.check('o jogo diz em que lugar ele chegou', 1 <= t.get('lugar') <= 4, f"lugar={t.get('lugar')}")
    t.shot('chegada')
    parado = jogador.pos
    t.step(30)
    t.check('depois da chegada, nada anda', jogador.pos == parado)

    # Batendo na grama, o carro volta e continua na pista.
    t.tap('SPACE')
    t.step(200)
    carros = t.get('carros')
    jogador = carros[0]
    jogador.pos = (600, 75)
    jogador.angle = 90
    t.down('UP')
    t.step(60)
    t.up('UP')
    t.check('acelerando contra a grama, o carro não sai da pista', na_pista(jogador.x, jogador.y), f'{jogador.pos}')
