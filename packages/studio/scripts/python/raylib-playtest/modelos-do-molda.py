"""Modelos do Molda: os quatro modelos abrem, giram e as setas trocam de um para o outro."""
import pyray


def play(t):
    g = t.game

    yield from t.wait(20)
    t.check(len(g['modelos']) == 4 and g['atual'] == 0, 'os quatro modelos não abriram')
    t.check(g['giro'] > 5, 'o modelo não está girando')
    # O giro aparece na tela: em volta do centro, algum pixel muda depois de meio segundo.
    pontos = [(400 + dx, 250 + dy) for dx in (-60, -30, 0, 30, 60) for dy in (-30, 0, 30)]
    t.capture()
    yield
    antes = [t.pixel(x, y) for x, y in pontos]
    yield from t.wait(30)
    t.capture()
    yield
    t.check([t.pixel(x, y) for x, y in pontos] != antes, 'o modelo não girou na tela')
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
    # Todos ficam do mesmo tamanho: o lado maior da caixa do modelo, medido aqui, vezes a escala
    # do jogo dá TAMANHO.
    caixa = pyray.get_model_bounding_box(g['modelos'][g['atual']])
    maior = max(caixa.max.x - caixa.min.x, caixa.max.y - caixa.min.y, caixa.max.z - caixa.min.z)
    t.check(abs(maior * g['escala'] - g['TAMANHO']) < 1e-4, 'a escala não igualou o tamanho')
