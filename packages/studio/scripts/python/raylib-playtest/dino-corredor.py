"""Dino Corredor: sem pular, perde logo; pulando na hora certa, corre 40 segundos. Enter recomeça."""


def play(t):
    g = t.game
    yield from t.wait(2)
    t.shot('inicio')

    # Anti-vácuo: sem pular, um obstáculo pega o dino em poucos segundos.
    for _ in range(60 * 10):
        if g['perdeu']:
            break
        yield
    t.check(g['perdeu'], 'o dino correu 10 s sem pular e não bateu')
    recorde = g['recorde']
    t.check(recorde > 0, 'perdeu e o recorde ficou zero')
    t.shot('bateu')
    yield from t.tap('ENTER')
    yield
    t.check(not g['perdeu'] and g['obstaculos'] == [], 'o Enter não recomeçou')

    # Piloto: pula quando o próximo obstáculo chega perto, proporcional à velocidade.
    for quadro in range(60 * 40):
        if g['perdeu']:
            break
        frente = [o for o in g['obstaculos'] if o.posicao.x + 20 > 100]
        if frente and g['dino_y'] >= g['CHAO']:
            o = min(frente, key=lambda o: o.posicao.x)
            distancia = o.posicao.x - (100 + 16 * g['ESCALA'])
            velocidade = 360 + g['tempo'] * 8
            if 0 < distancia < velocidade * 0.16:
                yield from t.tap('SPACE', 1)
                continue
        yield
    t.check(not g['perdeu'], f'o piloto bateu aos {g["tempo"]:.1f} s')
    t.check(g['tempo'] >= 39, f'só correu {g["tempo"]:.1f} s')
    t.shot('correndo')
    t.check(g['recorde'] == recorde, 'o recorde mudou sem bater')
    t.end()
    yield
