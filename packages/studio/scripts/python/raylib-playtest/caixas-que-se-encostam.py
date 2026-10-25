"""Caixas que se Encostam: a caixa barra o cubo, dá para deslizar encostado e as moedas contam."""


def play(t):
    g = t.game
    pos = g['pos']

    yield from t.wait(5)
    t.shot('inicio')
    # Para a direita, a fileira de caixas em x = 1 barra o cubo encostado na face dela.
    t.hold('RIGHT')
    yield from t.wait(80)
    t.release('RIGHT')
    yield
    t.check(-0.01 < pos.x < 0, f'a caixa não barrou o cubo (x = {pos.x:.3f})')
    t.shot('encostou')

    # Encostado, ainda dá para andar no outro eixo: deslizar pela parede.
    t.hold('RIGHT', 'UP')
    yield from t.wait(40)
    t.release('RIGHT', 'UP')
    yield
    t.check(pos.z < -2.5, f'o cubo não deslizou encostado na caixa (z = {pos.z:.2f})')

    # Para a direita até a primeira moeda, em (4, -3).
    t.hold('RIGHT')
    yield from t.wait(80)
    t.release('RIGHT')
    yield
    t.check(g['pegou'] == 1 and g['moeda'] == 1, f'a moeda não foi pega ({g["pegou"]})')
    # Sem jogar, a borda segura o cubo dentro do chão.
    t.hold('DOWN')
    yield from t.wait(200)
    t.release('DOWN')
    yield
    t.check(pos.z <= g['BORDA'], 'o cubo passou da borda')
    t.shot('moeda')
