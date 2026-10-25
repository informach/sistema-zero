"""Câmera que Segue: a bola fica no meio da tela, o zoom e o giro respondem e as gemas acabam."""


def play(t):
    g = t.game
    import pyray

    yield from t.wait(2)
    t.shot('inicio')

    def no_meio():
        tela = pyray.get_world_to_screen_2d(g['posicao'], g['camera'])
        return abs(tela.x - 400) < 1 and abs(tela.y - 225) < 1

    # Andar: a câmera vai junto e a bola continua no meio da tela.
    t.hold('RIGHT', 'DOWN')
    yield from t.wait(40)
    t.release('RIGHT', 'DOWN')
    yield
    t.check(g['posicao'].x > 50 and g['posicao'].y > 50, 'a bola não andou na diagonal')
    t.check(no_meio(), 'a câmera não seguiu a bola')

    # Zoom e giro, e o R endireita.
    t.hold('W')
    yield from t.wait(30)
    t.release('W')
    t.hold('S')
    yield from t.wait(30)
    t.release('S')
    yield
    t.check(g['camera'].zoom > 1.3, f'o W não aumentou o zoom ({g["camera"].zoom:.2f})')
    t.check(g['camera'].rotation > 20, 'o S não girou a câmera')
    t.check(no_meio(), 'com zoom e giro a bola saiu do meio')
    t.shot('zoom-e-giro')
    yield from t.tap('R')
    t.check(g['camera'].zoom == 1 and g['camera'].rotation == 0, 'o R não endireitou a câmera')

    # O mundo tem borda: segurar a seta não passa dela.
    t.hold('LEFT')
    yield from t.wait(400)
    t.release('LEFT')
    yield
    t.check(g['posicao'].x == -g['MUNDO'], 'a bola passou da borda do mundo')

    # Buscar as gemas, a mais perto primeiro, guiando com as setas.
    while g['gemas']:
        p = g['posicao']
        alvo = min(g['gemas'], key=lambda gema: (gema.x - p.x) ** 2 + (gema.y - p.y) ** 2)
        antes = len(g['gemas'])
        for _ in range(900):
            p = g['posicao']
            t.release('LEFT', 'RIGHT', 'UP', 'DOWN')
            if alvo.x > p.x + 6:
                t.hold('RIGHT')
            elif alvo.x < p.x - 6:
                t.hold('LEFT')
            if alvo.y > p.y + 6:
                t.hold('DOWN')
            elif alvo.y < p.y - 6:
                t.hold('UP')
            yield
            if len(g['gemas']) < antes:
                break
        t.release('LEFT', 'RIGHT', 'UP', 'DOWN')
        t.check(len(g['gemas']) < antes, 'chegou numa gema e ela não sumiu')
        if len(g['gemas']) >= antes:
            break
    yield from t.wait(2)
    t.shot('todas')
    yield from t.tap('ENTER')
    yield
    t.check(len(g['gemas']) == 12, 'o Enter não espalhou as gemas de novo')
    t.end()
    yield
