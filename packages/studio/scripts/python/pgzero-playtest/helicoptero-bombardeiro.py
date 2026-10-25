"""Helicóptero Bombardeiro: the bomb opens in a ring and explodes; a tank caught in the blast
explodes and scores; a tank shell costs a life; a second bomb waits for the first."""

import random


def play(t):
    random.seed(4)
    h = t.get('heli')
    tanques = t.get('tanques')
    pedacos = t.get('pedacos')
    t.set('vidas', 3)
    for tanque in tanques:
        tanque.pos = (-300, -300)
    alvo = tanques[0]
    # Um pedaço da roda chega a (90, -60) do helicóptero em 30 quadros; o tanque desce 30 até lá.
    alvo.pos = (h.x + 90, h.y - 90)
    t.tap('SPACE')
    t.step(5)
    t.check('a bomba se abre em 12 pedaços', len(pedacos) == 12)
    t.tap('SPACE')
    t.check('enquanto a bomba voa, não dá para soltar outra', t.get('idade_da_bomba') > 1)
    t.step(30)
    t.shot('explosao')
    t.check('o tanque pego pela explosão explode e conta 50', t.get('explodindo')[0] > 0 and t.get('pontos') == 50,
            f"pontos={t.get('pontos')}")
    t.step(20)
    t.check('a bomba acaba e libera a próxima', t.get('idade_da_bomba') == -1 and not pedacos)
    t.step(30)
    t.check('o tanque destruído volta mais tarde, lá no alto', alvo.y < 0 and t.get('explodindo')[0] == 0)
    bala = t.get('Actor')('bala')
    bala.pos = (h.x, h.y - 80)
    t.get('balas').append(bala)
    t.get('direcoes_das_balas').append((0, 4))
    t.step(25)
    t.check('a bala do tanque tira uma vida', t.get('vidas') == 2, f"vidas={t.get('vidas')}")
    # Mudando o tempo da bomba (uma das ideias), ela ainda explode antes de sumir.
    t.set('TEMPO_DA_BOMBA', 45)
    t.get('soltar_bomba')()
    explodiu = False
    for _ in range(60):
        t.step(1)
        explodiu = explodiu or any(p.image == 'explosao' for p in t.get('pedacos'))
    t.check('com TEMPO_DA_BOMBA = 45, a bomba ainda explode', explodiu)
    t.check('e depois some', t.get('idade_da_bomba') == -1)
