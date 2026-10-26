"""Nave que Desliza: a diagonal é tão rápida quanto o reto, a estrela soma ponto e a pedra bate."""


def play(t):
    g = t.game
    yield from t.wait(2)
    t.shot('inicio')

    # Parada: a nave não anda sozinha (anti-vácuo das setas).
    x0, y0 = g['posicao'].x, g['posicao'].y
    yield from t.wait(10)
    t.check((g['posicao'].x, g['posicao'].y) == (x0, y0), 'a nave andou sem seta')

    # Reto: 30 quadros para a direita.
    t.hold('RIGHT')
    yield from t.wait(30)
    t.release('RIGHT')
    yield
    reto = g['posicao'].x - x0
    t.check(140 <= reto <= 160, f'30 quadros a 300 px/s deviam andar 150 px; andou {reto:.1f}')

    # Diagonal: a mesma distância em 30 quadros (normalizar), e não 1,41 vezes mais.
    g['posicao'] = g['Vector2'](200, 300)
    yield
    t.hold('LEFT', 'UP')
    yield from t.wait(30)
    t.release('LEFT', 'UP')
    yield
    dx, dy = 200 - g['posicao'].x, 300 - g['posicao'].y
    distancia = (dx * dx + dy * dy) ** 0.5
    t.check(140 <= distancia <= 160, f'a diagonal andou {distancia:.1f} px, e não ~150')

    # A estrela: pôr a nave em cima dela soma um ponto.
    pontos = g['pontos']
    g['posicao'] = g['Vector2'](g['estrela_posicao'].x, g['estrela_posicao'].y)
    yield from t.wait(2)
    t.check(g['pontos'] == pontos + 1, 'pegar a estrela não somou ponto')

    # A pedra quica: depois de bater na borda de baixo, ela sobe.
    g['pedra_posicao'] = g['Vector2'](400, 450 - g['tamanho_pedra'] - 1)
    g['pedra_direcao'].y = 1
    g['posicao'] = g['Vector2'](10, 10)
    yield from t.wait(3)
    t.check(g['pedra_direcao'].y == -1, 'a pedra não quicou na borda de baixo')

    # A pedra bate na nave: conta uma batida e a nave volta ao começo.
    batidas = g['batidas']
    g['pedra_posicao'] = g['Vector2'](300, 200)
    g['posicao'] = g['Vector2'](316, 216)
    yield from t.wait(2)
    t.check(g['batidas'] == batidas + 1, 'a pedra encostou e não contou batida')
    t.shot('depois-da-batida')
    t.end()
    yield
