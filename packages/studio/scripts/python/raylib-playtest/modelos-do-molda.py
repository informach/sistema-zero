"""Modelos do Molda: os quatro modelos abrem, giram e as setas trocam de um para o outro."""


def play(t):
    g = t.game

    yield from t.wait(20)
    t.check(len(g['modelos']) == 4 and g['atual'] == 0, 'os quatro modelos não abriram')
    t.check(g['giro'] > 5, 'o modelo não está girando')
    t.shot('nave')
    vistos = [g['atual']]
    for _ in range(4):
        yield from t.tap('RIGHT')
        yield from t.wait(10)
        vistos.append(g['atual'])
        t.shot(f'modelo-{g["atual"]}')
    t.check(vistos == [0, 1, 2, 3, 0], f'a seta direita não passou pelos modelos ({vistos})')
    yield from t.tap('LEFT')
    yield
    t.check(g['atual'] == 3, 'a seta esquerda não voltou para o último')
    # Todos ficam do mesmo tamanho: a escala põe o lado maior em TAMANHO.
    t.check(abs(g['maior'] * g['escala'] - g['TAMANHO']) < 1e-6, 'a escala não igualou o tamanho')
