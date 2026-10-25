"""Rastro de Ajudantes: helpers follow the ship's trail (and stop when it stops), a capsule adds
a helper, every helper fires with the ship, and a drone hit by a shot is gone."""


def play(t):
    n = t.get('nave')
    ajudantes = t.get('ajudantes')
    rastro = t.get('rastro')
    t.get('clock').unschedule(t.get('novo_inimigo'))
    t.hold('RIGHT', 40)
    t.hold('DOWN', 40)
    t.check('o ajudante ocupa um lugar por onde a nave passou', ajudantes[0].pos in rastro[10:20], f'{ajudantes[0].pos}')
    t.check('ele fica atrás da nave, não em cima dela', ajudantes[0].distance_to(n) > 20, f'distância={ajudantes[0].distance_to(n):.0f}')
    parado = ajudantes[0].pos
    t.step(30)
    t.check('com a nave parada, o ajudante também para', ajudantes[0].pos == parado)
    capsula = t.get('capsula')
    capsula.pos = (n.x + 40, n.y)
    t.step(15)
    t.check('pegar a cápsula ganha mais um ajudante', len(ajudantes) == 2)
    t.hold('UP', 50)
    t.check('o segundo ajudante vem mais atrás no rastro', ajudantes[1].distance_to(n) > ajudantes[0].distance_to(n))
    tiros = t.get('tiros')
    antes = len(tiros)
    t.tap('SPACE')
    t.check('cada ajudante atira junto com a nave', len(tiros) - antes == 3, f'tiros novos={len(tiros) - antes}')
    t.shot('ajudantes')
    drone = t.get('Actor')('drone')
    drone.pos = (n.x + 200, n.y)
    t.get('inimigos').append(drone)
    t.get('alturas').append(n.y)
    # O drone ondula: a nave atira de tempos em tempos até acertar.
    for _ in range(12):
        t.tap('SPACE')
        t.until(lambda: t.get('pontos') > 0, 15)
        if t.get('pontos') > 0:
            break
    t.check('o tiro derruba o drone e conta ponto', t.get('pontos') == 10 and drone not in t.get('inimigos'))
