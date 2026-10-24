"""Duelo por Turnos: on your turn 1 attacks, 2 defends and 3 drinks a potion (two per fight);
while a turn plays out the keys choose nothing; the clock passes the turn to the dragon and back;
a defending fighter takes half the blow, and attacking drops the shield; whoever reaches zero
loses; a player that attacks and drinks a potion when low beats the dragon most of the time, and
one that only defends never wins."""

import random


def lutar(t, estrategia, limite=60 * 120):
    heroi = t.get('heroi')
    for _ in range(limite):
        if t.get('estado') != 'lutando':
            return t.get('estado')
        if t.get('vez') == 0 and not t.get('esperando'):
            t.tap(estrategia(heroi))
        else:
            t.step(1)
    return t.get('estado')


def esperta(t):
    def escolher(heroi):
        if heroi.vida < 40 and t.get('pocoes') > 0:
            return '3'
        return '1'
    return escolher


def play(t):
    random.seed(3)
    heroi = t.get('heroi')
    dragao = t.get('dragao')
    espera = int(t.get('ESPERA') * 60)
    t.check('a luta começa na sua vez, com as vidas cheias e duas poções',
            t.get('vez') == 0 and not t.get('esperando') and heroi.vida == 100 and dragao.vida == 120 and t.get('pocoes') == 2)
    t.shot('inicio')
    t.tap('a')
    t.check('outras teclas não escolhem nada', not t.get('esperando'))

    # Atacar: o dragão perde vida, e a vez passa pelo relógio.
    t.tap('1')
    perdeu = 120 - dragao.vida
    t.check('atacar tira de 20 a 39 do dragão', 20 <= perdeu <= 39 and t.get('esperando'), f'perdeu {perdeu}')
    t.tap('1')
    t.check('enquanto a vez acontece, as teclas não fazem nada', dragao.vida == 120 - perdeu)
    t.step(espera)
    t.check('depois da espera, é a vez do dragão', t.get('vez') == 1)
    t.step(espera)
    t.check('o dragão age sozinho', heroi.vida < 100 or dragao.defendendo, t.get('mensagem'))
    t.step(espera + 1)
    t.check('e a vez volta para você', t.get('vez') == 0 and not t.get('esperando'))

    # Defender: o golpe pela metade; atacar baixa o escudo.
    t.tap('2')
    t.check('defender levanta o escudo', heroi.defendendo)
    t.until(lambda: not t.get('esperando'), 400)
    heroi.vida = 100
    heroi.defendendo = True
    danos = []
    for _ in range(20):
        antes = heroi.vida
        t.get('atacar')(dragao, heroi)
        danos.append(antes - heroi.vida)
        heroi.vida = 100
    t.check('com o escudo, o golpe tira de 10 a 19', min(danos) >= 10 and max(danos) <= 19, str(sorted(set(danos))))
    heroi.defendendo = False
    danos = []
    for _ in range(20):
        t.get('atacar')(dragao, heroi)
        danos.append(100 - heroi.vida)
        heroi.vida = 100
    t.check('sem o escudo, de 20 a 39', min(danos) >= 20 and max(danos) <= 39, str(sorted(set(danos))))
    dragao.defendendo = True
    t.get('atacar')(dragao, heroi)
    t.check('quem ataca baixa o próprio escudo', not dragao.defendendo)

    # Poção: cura sem passar do máximo, e só duas.
    heroi.vida = 50
    t.tap('3')
    t.check('a poção cura de 25 a 35', 75 <= heroi.vida <= 85 and t.get('pocoes') == 1, str(heroi.vida))
    t.until(lambda: not t.get('esperando'), 400)
    heroi.vida = 95
    t.tap('3')
    t.check('sem passar da vida máxima', heroi.vida == 100 and t.get('pocoes') == 0)
    t.until(lambda: not t.get('esperando'), 400)
    heroi.vida = 100
    t.tap('3')
    t.check('sem poções, a tecla 3 não faz nada', not t.get('esperando'))
    t.set('pocoes', 1)
    t.tap('3')
    t.check('com a vida cheia, a poção não é gasta', not t.get('esperando') and t.get('pocoes') == 1)
    t.set('pocoes', 0)

    # Quem chega a zero perde.
    dragao.vida = 1
    t.tap('1')
    t.check('o dragão sem vida perde a luta', t.get('estado') == 'venceu' and dragao.vida == 0)
    t.shot('venceu')
    t.tap('SPACE')
    t.check('espaço começa outra luta, tudo cheio', t.get('estado') == 'lutando' and dragao.vida == 120 and t.get('pocoes') == 2)
    t.tap('1')
    t.get('nova_luta')()
    t.step(espera * 4)
    t.check('uma luta nova no meio de uma vez não herda o relógio da anterior',
            t.get('vez') == 0 and not t.get('esperando') and heroi.vida == 100 and dragao.vida == 120)

    # Atacando e tomando poção na hora certa, ganha quase sempre; só se defendendo, nunca.
    vitorias = 0
    for semente in range(20):
        random.seed(semente)
        t.get('nova_luta')()
        if lutar(t, esperta(t)) == 'venceu':
            vitorias = vitorias + 1
    t.check('atacando e tomando poção quando a vida está baixa, vence a maioria das lutas', vitorias >= 13, f'{vitorias} de 20')
    vitorias = 0
    for semente in range(5):
        random.seed(semente)
        t.get('nova_luta')()
        if lutar(t, lambda heroi: '2') == 'venceu':
            vitorias = vitorias + 1
    t.check('só se defendendo, nunca vence', vitorias == 0 and t.get('estado') == 'perdeu')
    t.tap('SPACE')
    t.check('espaço recomeça', t.get('estado') == 'lutando')
