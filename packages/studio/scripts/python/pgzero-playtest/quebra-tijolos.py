"""Quebra-Tijolos: the ball waits on the bat until a click; it bounces off walls, ceiling and
bat, and the side of the bat decides where it goes; a brick hit disappears and scores more the
higher it was; a player that follows the ball with the mouse clears the wall and the next level
is faster; a missed ball costs a life and three end the game."""

import random


def seguir(t, quadros):
    """Moves the bat under the ball for some frames, hitting it with a different part of the
    bat on each way down, as a person does (a fixed hit can loop the ball forever)."""
    bola = t.get('bola')
    sorteio = random.Random(8)
    mirar = 0
    descendo = False
    for _ in range(quadros):
        if t.get('estado') == 'esperando':
            t.click((300, 600))
        if t.get('vy') > 0 and not descendo:
            mirar = sorteio.randint(-35, 35)
        descendo = t.get('vy') > 0
        t.move((bola.x + mirar, 700))
        t.step(1)
        if t.get('estado') == 'fim' or t.get('fase') > 1:
            return


def play(t):
    bola = t.get('bola')
    raquete = t.get('raquete')
    tijolos = t.get('tijolos')
    t.check('60 tijolos em 6 fileiras', len(tijolos) == 60)
    t.move((100, 700))
    t.step(5)
    t.check('a raquete segue o mouse', raquete.centerx == 100)
    t.check('a bola espera em cima da raquete', t.get('estado') == 'esperando' and abs(bola.x - raquete.centerx) < 1)
    t.shot('inicio')

    # A ponta da raquete manda a bola para o lado.
    t.click((100, 700))
    t.step(1)
    t.set('vx', 0)
    t.set('vy', 5)
    bola.pos = (raquete.right - 6, raquete.top - 20)
    t.step(6)
    t.check('batendo na ponta direita da raquete, a bola vai para a direita', t.get('vx') > 3 and t.get('vy') < 0,
            f"vx={t.get('vx')}")

    # Um tijolo de baixo vale 10, um de cima vale 60.
    t.get('novo_jogo')()
    t.click((300, 700))
    t.step(1)
    pontos = t.get('pontos')
    alvo = tijolos[-1]
    bola.midtop = (alvo.centerx, alvo.bottom + 2)
    t.set('vx', 0)
    t.set('vy', -6)
    t.step(2)
    t.check('o tijolo atingido some', alvo not in tijolos and len(tijolos) == 59)
    t.check('o de baixo vale 10', t.get('pontos') == pontos + 10, f"{t.get('pontos') - pontos}")
    t.check('e a bola volta para baixo', t.get('vy') > 0)
    topo = tijolos[0]
    tijolos.clear()
    tijolos.append(topo)
    pontos = t.get('pontos')
    bola.midtop = (topo.centerx, topo.bottom + 2)
    t.set('vx', 0)
    t.set('vy', -6)
    t.step(2)
    t.check('o de cima vale 60', t.get('pontos') == pontos + 60, f"{t.get('pontos') - pontos}")

    # A raquete para nas bordas, e a bola que chega pelo lado dela passa.
    t.get('novo_jogo')()
    raquete = t.get('raquete')
    t.hold('LEFT', 200)
    t.check('a raquete para na borda da esquerda', raquete.left == 0)
    t.hold('RIGHT', 200)
    t.check('e na da direita', raquete.right == t.get('WIDTH'))
    t.click((300, 700))
    t.step(1)
    bola.midright = (raquete.left + 2, raquete.centery + 4)
    t.set('vx', 2)
    t.set('vy', 3)
    t.step(1)
    t.check('a bola que bate no lado da raquete não é jogada para cima', t.get('vy') > 0)

    # Seguindo a bola, derruba a parede toda.
    t.get('novo_jogo')()
    seguir(t, 60 * 300)
    t.check('seguindo a bola, a parede inteira cai e vem a fase 2', t.get('fase') == 2,
            f"sobraram {len(tijolos)}, vidas={t.get('vidas')}")
    t.check('a fase 2 começa com a parede cheia', len(tijolos) == 60 and t.get('estado') == 'esperando')
    t.click((300, 700))
    t.step(1)
    t.check('na fase 2 a bola sai mais rápida', t.get('vy') == -6, f"vy={t.get('vy')}")
    t.shot('fase2')

    # Errando a bola três vezes, acabou.
    t.get('novo_jogo')()
    for _ in range(3):
        t.click((300, 700))
        t.move((20, 700))
        t.until(lambda: t.get('estado') != 'jogando', 60 * 20)
        t.move((580, 700))
    t.check('três bolas perdidas: fim de jogo', t.get('estado') == 'fim' and t.get('vidas') == 0)
    t.shot('fim')
    t.tap('SPACE')
    t.check('espaço começa de novo', t.get('estado') == 'esperando' and t.get('vidas') == 3 and len(tijolos) == 60)
