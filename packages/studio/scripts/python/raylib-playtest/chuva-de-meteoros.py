"""Chuva de Meteoros: o laser destrói meteoros, a explosão anima e some, a batida acaba o voo."""


def play(t):
    g = t.game
    yield from t.wait(2)
    t.shot('inicio')

    # Atirar: um laser nasce acima da nave e sobe.
    yield from t.tap('SPACE', 1)
    t.check(len(g['lasers']) == 1, 'o espaço não atirou')
    y0 = g['lasers'][0].posicao.y
    yield from t.wait(5)
    t.check(g['lasers'] and g['lasers'][0].posicao.y < y0, 'o laser não subiu')

    # Piloto que mira: vai para baixo do meteoro mais baixo e atira; foge se ele estiver perto.
    destruidos = 0
    vistos = set()
    viu_explosao = False
    for quadro in range(60 * 25):
        if g['perdeu']:
            break
        nave = g['nave']
        centro = nave.centro()
        antes = len(g['meteoros'])
        acima = [m for m in g['meteoros'] if m.posicao.y < centro.y - 40]
        t.release('LEFT', 'RIGHT')
        if acima:
            alvo = max(acima, key=lambda m: m.posicao.y)
            if alvo.posicao.x > centro.x + 10:
                t.hold('RIGHT')
            elif alvo.posicao.x < centro.x - 10:
                t.hold('LEFT')
            elif quadro % 6 == 0:
                t.hold('SPACE')
        if quadro % 6 == 1:
            t.release('SPACE')
        yield
        if g['explosoes']:
            viu_explosao = True
        destruidos += sum(1 for e in g['explosoes'] if id(e) not in vistos)
        vistos.update(id(e) for e in g['explosoes'])
    t.release('LEFT', 'RIGHT', 'SPACE')
    t.check(viu_explosao and destruidos >= 5, f'o laser destruiu só {destruidos} meteoros')

    # A explosão some sozinha depois dos quadros.
    t.check(all(e.quadro < 5 for e in g['explosoes']), 'uma explosão passou do último quadro')

    # Parada no caminho, a nave é atingida e o voo acaba.
    for _ in range(60 * 60):
        if g['perdeu']:
            break
        nave = g['nave']
        abaixo = [m for m in g['meteoros'] if m.posicao.y < nave.posicao.y]
        t.release('LEFT', 'RIGHT')
        if abaixo:
            alvo = max(abaixo, key=lambda m: m.posicao.y)
            if alvo.posicao.x > nave.centro().x + 6:
                t.hold('RIGHT')
            elif alvo.posicao.x < nave.centro().x - 6:
                t.hold('LEFT')
        yield
    t.release('LEFT', 'RIGHT')
    t.check(g['perdeu'], 'indo para baixo dos meteoros, a nave nunca foi atingida')
    t.check(g['recorde'] >= 1, 'perdeu e o recorde não foi guardado')
    yield from t.wait(3)
    t.shot('fim')
    yield from t.tap('ENTER')
    yield
    t.check(not g['perdeu'] and g['meteoros'] == [] and g['tempo'] < 0.1, 'o Enter não recomeçou')
    t.end()
    yield
