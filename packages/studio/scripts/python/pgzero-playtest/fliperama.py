"""Fliperama: the launched ball curves into the table; a bumper bounces it away and scores; a
rising flipper throws the ball up; the ball never sinks into a wall; a player that flips when
the ball comes keeps it in play for a long time; three lost balls end the game."""

import random


def dentro_da_parede(t):
    bola = t.get('bola')
    return t.get('cor_do_mapa')(bola.x, bola.y)[0] > 100


def jogar(t, quadros):
    """Flips when the ball comes down over a flipper. Returns (frames, ball inside a wall)."""
    bola = t.get('bola')
    furou = False
    for quadro in range(quadros):
        if t.get('estado') == 'esperando':
            t.tap('SPACE')
        if t.get('estado') == 'fim':
            return quadro, furou
        perto = bola.vy > 0 and 630 < bola.y < 712
        for tecla, de, ate in (('LEFT', 170, 300), ('RIGHT', 300, 430)):
            if perto and de <= bola.x < ate:
                t.down(tecla)
            else:
                t.up(tecla)
        t.step(1)
        if dentro_da_parede(t):
            furou = True
    t.up('LEFT')
    t.up('RIGHT')
    return quadros, furou


def play(t):
    random.seed(2)
    bola = t.get('bola')
    t.check('a bola espera na canaleta', t.get('estado') == 'esperando' and bola.x > 532)
    t.step(30)
    t.check('sem apertar espaço, ela fica parada', bola.pos == (558, 748))
    t.tap('SPACE')
    entrou = t.until(lambda: bola.x < 500, 200)
    t.check('lançada, a bola sobe e a curva joga ela para dentro da mesa', bola.x < 500, f'{entrou} quadros')

    # Um batedor manda a bola longe e dá pontos.
    pontos = t.get('pontos')
    bola.pos = (200, 200)
    bola.vx = 0
    bola.vy = 3
    t.step(12)
    t.check('o batedor dá 100 pontos', t.get('pontos') == pontos + 100)
    t.check('e joga a bola para longe dele', bola.vy < -4, f'vy={bola.vy:.1f}')
    t.shot('batedor')

    # O flíper subindo joga a bola para cima.
    t.step(10)
    flipper = t.get('flipper_esquerdo')
    bola.pos = (250, 685)
    bola.vx = 0
    bola.vy = 1
    t.step(2)
    t.down('LEFT')
    t.step(3)
    t.up('LEFT')
    t.check('o flíper subindo joga a bola para cima', bola.vy < -8, f'vy={bola.vy:.1f}')
    t.step(20)
    t.check('e o flíper volta a descer', flipper.angle == -30)

    # Jogando de verdade: virando o flíper quando a bola chega.
    t.get('novo_jogo')()
    random.seed(5)
    quadros, furou = jogar(t, 60 * 240)
    t.check('a bola nunca entra numa parede', not furou)
    t.check('virando os flíperes na hora, a bola fica muito tempo em jogo', quadros > 60 * 60,
            f'{quadros / 60:.0f} s, pontos={t.get("pontos")}')
    t.check('e faz pontos nos batedores', t.get('pontos') >= 500, f"pontos={t.get('pontos')}")
    t.shot('jogando')

    # Sem virar os flíperes, as três bolas caem.
    t.get('novo_jogo')()
    for _ in range(3):
        t.tap('SPACE')
        t.until(lambda: t.get('estado') != 'jogando', 60 * 60)
    t.check('perdendo as três bolas, o jogo acaba', t.get('estado') == 'fim' and t.get('bolas') == 0)
    t.shot('fim')
    t.tap('SPACE')
    t.check('espaço começa de novo com três bolas', t.get('estado') == 'esperando' and t.get('bolas') == 3)
