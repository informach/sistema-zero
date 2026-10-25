"""Labirinto dos Robôs: o choque gasta a energia; a parede segura o raio; mirando, os quatro robôs desligam."""
from math import atan2


def vizinho_livre(g, robo):
    # Uma casa livre ao lado do robô, para o jogador ficar de frente para ele.
    lado = g['LADO']
    coluna, linha = round(robo.posicao.x / lado), round(robo.posicao.z / lado)
    for dc, dl in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        if g['MAPA'][linha + dl][coluna + dc] != '#':
            return (coluna + dc) * lado, (linha + dl) * lado
    raise AssertionError('robô sem casa livre ao lado')


def ficar_de_frente(g, x, z, robo):
    g['posicao'].x = x
    g['posicao'].z = z
    g['angulo'] = atan2(robo.posicao.z - z, robo.posicao.x - x)
    g['olhar'] = 0


def play(t):
    g = t.game

    yield from t.wait(5)
    robos = g['robos']
    t.check(len(robos) == 4 and g['energia'] == 100, 'o labirinto não começou com 4 robôs e energia cheia')
    t.shot('inicio')

    # Parado ao lado de um robô, sem atirar: os choques gastam a energia toda.
    x, z = vizinho_livre(g, robos[0])
    ficar_de_frente(g, x, z, robos[0])
    for _ in range(900):
        if g['perdeu']:
            break
        yield
    t.check(g['perdeu'] and g['energia'] == 0, f'sem atirar, a energia não acabou ({g["energia"]})')
    t.shot('sem-energia')

    yield from t.tap('ENTER', 1)
    yield from t.wait(2)
    robos = g['robos']
    t.check(not g['perdeu'] and g['energia'] == 100, 'Enter não recomeçou')

    # Com uma parede no meio, o raio bate nela e o robô do outro lado continua inteiro.
    ficar_de_frente(g, 12, 4, robos[0])
    yield from t.wait(2)
    yield from t.tap('SPACE', 1)
    yield
    t.check(robos[0].vida == g['VIDA_DO_ROBO'], 'o raio atravessou a parede')

    # De frente para cada robô, três raios desligam.
    for indice, robo in enumerate(robos):
        x, z = vizinho_livre(g, robo)
        ficar_de_frente(g, x, z, robo)
        yield from t.wait(2)
        for quadro in range(180):
            if not robo.ligado():
                break
            if quadro % 20 == 0:
                t.hold('SPACE')
            else:
                t.release('SPACE')
            if indice == 0 and quadro == 1:
                t.shot('raio')
            yield
        t.release('SPACE')
        yield
        t.check(not robo.ligado(), f'o robô {indice} não desligou ({robo.vida})')
    yield from t.wait(2)
    t.check(g['venceu'], 'com os quatro robôs desligados, o jogo não terminou')
    t.shot('venceu')
