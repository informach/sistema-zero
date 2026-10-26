"""Sprites, Timer e Animação: o cronômetro solta maçãs, o herói anima e vira, pegar e perder contam."""


def play(t):
    g = t.game
    heroi = g['heroi']
    yield from t.wait(2)

    # Parado: quadro 0 (anti-vácuo da animação).
    t.check(int(heroi.quadro) == 0, 'o herói parado não está no quadro 0')

    # O cronômetro: em 2 segundos caem duas maçãs (uma a cada 0,9 s).
    yield from t.wait(110)
    t.check(len(g['macas']) >= 2, f'o cronômetro soltou {len(g["macas"])} maçãs em 2 s')

    # Andando para a esquerda: os quadros mudam e o herói vira.
    vistos = set()
    t.hold('LEFT')
    for _ in range(30):
        yield
        vistos.add(int(heroi.quadro))
    t.release('LEFT')
    yield
    t.check(len(vistos) >= 3, f'a animação só mostrou os quadros {sorted(vistos)}')
    t.check(heroi.olhando_esquerda, 'andando para a esquerda o herói não virou')
    t.shot('andando')

    # Pegar: o herói vai para baixo da maçã mais baixa.
    pontos = g['pontos']
    for _ in range(600):
        if g['pontos'] > pontos:
            break
        if g['macas']:
            alvo = max(g['macas'], key=lambda m: m.posicao.y)
            meio = heroi.posicao.x + 24
            t.release('LEFT', 'RIGHT')
            if alvo.posicao.x + 20 > meio + 8:
                t.hold('RIGHT')
            elif alvo.posicao.x + 20 < meio - 8:
                t.hold('LEFT')
        yield
    t.release('LEFT', 'RIGHT')
    t.check(g['pontos'] > pontos, 'o herói ficou embaixo da maçã e não pegou')

    # Perder: parado no canto, as maçãs caem e as vidas acabam.
    for _ in range(1200):
        if g['vidas'] == 0:
            break
        yield
    t.check(g['vidas'] == 0, 'as maçãs caíram no chão e as vidas não acabaram')
    t.shot('acabou')
    quantas = len(g['macas'])
    yield from t.wait(120)
    t.check(len(g['macas']) == quantas, 'sem vidas, o cronômetro continuou soltando maçãs')
    yield from t.tap('ENTER')
    yield
    t.check(g['vidas'] == 3 and g['pontos'] == 0, 'o Enter não recomeçou')
    t.end()
    yield
