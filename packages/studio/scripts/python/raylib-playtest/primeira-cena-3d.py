"""Primeira Cena 3D: o cilindro gira, a barra troca o sentido e as setas andam com a bola."""


def play(t):
    g = t.game

    yield from t.wait(30)
    t.check(g['giro'] > 0.5, f'o cilindro não girou ({g["giro"]:.2f})')
    t.shot('inicio')

    # A barra de espaço troca o sentido: o giro passa a diminuir.
    antes = g['giro']
    yield from t.tap('SPACE')
    yield from t.wait(30)
    t.check(g['sentido'] == -1 and g['giro'] < antes, 'a barra não trocou o sentido do giro')

    # As setas andam com a bola pelo chão (x para os lados, z para a frente e para trás).
    x, z = g['bola'].x, g['bola'].z
    t.hold('LEFT', 'UP')
    yield from t.wait(40)
    t.release('LEFT', 'UP')
    yield
    t.check(g['bola'].x < x - 1.5 and g['bola'].z < z - 1.5, 'as setas não moveram a bola')
    t.shot('bola-andou')
