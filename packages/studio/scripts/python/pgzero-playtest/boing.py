"""Boing!: the menu picks 1 or 2 players; the ball waits a moment at each serve; the bats stay in
the court; a bat sends the ball back steeper the farther from its middle it hits, a bit faster
each time (up to a top speed), with sparks; the ball bounces on the top and bottom lines and
never passes through a bat; a ball past a bat is a point and the next serve goes to who lost it;
ten points win; the computer follows the ball but slower than a child can."""


def play(t):
    t.get('random').seed(3)
    raquetes = t.get('raquetes')
    bola = t.get('bola')

    t.check('o jogo começa no menu, com 1 jogador', t.get('estado') == 'menu' and t.get('jogadores') == 1)
    t.tap('DOWN')
    t.check('as setas trocam para 2 jogadores', t.get('jogadores') == 2)
    t.tap('UP')
    t.shot('menu')
    t.tap('SPACE')
    t.check('espaço começa contra o computador', t.get('estado') == 'jogando' and t.get('jogadores') == 1)
    parada = bola.pos
    t.step(30)
    t.check('no saque a bola espera um pouco', bola.pos == parada)

    # As raquetes não saem da quadra.
    t.hold('w', 120)
    t.check('a raquete não passa da linha de cima', raquetes[0].top >= t.get('TOPO'))
    t.hold('s', 120)
    t.check('a raquete não passa da linha de baixo', raquetes[0].bottom <= t.get('FUNDO'))

    def lancar(x, y, dx, dy, velocidade):
        bola.pos = (x, y)
        t.set('dx', dx)
        t.set('dy', dy)
        t.set('velocidade', velocidade)
        t.set('espera', 0)

    def rebatida(deslocamento):
        # Joga a bola reta na raquete azul, batendo a "deslocamento" do meio dela.
        raquetes[0].y = 240
        lancar(raquetes[0].right + 40, 240 + deslocamento, -1, 0, 5)
        t.until(lambda: t.get('dx') > 0, 60)
        return t.get('dy')

    meio = rebatida(0)
    t.check('a bola volta da raquete', t.get('dx') > 0 and abs(meio) < 0.01)
    t.check('a raquetada acelera a bola', t.get('velocidade') == 5.5)
    # Cada raquetada anda mais por quadro, mesmo de meio em meio.
    bola.pos = (400, 240)
    t.set('dx', 1)
    t.set('dy', 0)
    t.get('mover_bola')()
    t.check('a 5,5 a bola anda 5,5 pixels por quadro', abs(bola.x - 405.5) < 1e-9, str(bola.x))
    t.check('a raquete solta faíscas e brilha', len(t.get('faiscas')) > 0 and t.get('brilho')[0] > 0)
    ponta = rebatida(40)
    t.check('batendo longe do meio, a bola volta inclinada', ponta > 0.4, f'dy {ponta:.2f}')
    t.check('batendo do outro lado, inclina para o outro lado', rebatida(-40) < -0.4)

    # Na velocidade máxima a bola ainda não atravessa a raquete.
    raquetes[0].y = 240
    lancar(raquetes[0].right + 60, 240, -1, 0, t.get('VELOCIDADE_MAXIMA'))
    t.until(lambda: t.get('dx') > 0 or bola.right < 0, 60)
    t.check('mesmo bem rápida, a bola não atravessa a raquete', t.get('dx') > 0)
    t.check('a velocidade tem limite', t.get('velocidade') == t.get('VELOCIDADE_MAXIMA'))

    # A bola quica nas linhas de cima e de baixo.
    lancar(400, 100, 0.6, -0.8, 5)
    t.until(lambda: t.get('dy') > 0, 60)
    t.check('a bola quica na linha de cima', bola.top >= t.get('TOPO') - 1 and t.get('dy') > 0)

    # Ponto: a bola passa pela raquete azul.
    t.get('pontos')[:] = [0, 0]
    raquetes[0].y = 100
    lancar(200, 400, -1, 0, 5)
    t.until(lambda: t.get('pontos') != [0, 0], 120)
    t.check('a bola que passa da raquete é ponto do outro', t.get('pontos') == [0, 1])
    t.check('o saque vai para quem perdeu o ponto', t.get('dx') < 0 and bola.pos == (400, 240))
    t.shot('jogando')

    # Metade que vence: o azul acompanha a bola e bate com a ponta da raquete.
    t.get('novo_jogo')()
    for _ in range(60 * 600):
        if t.get('estado') != 'jogando':
            break
        alvo = bola.y - 38 if t.get('dx') < 0 else 240
        if raquetes[0].y > alvo + 4:
            t.down('w')
        else:
            t.up('w')
        if raquetes[0].y < alvo - 4:
            t.down('s')
        else:
            t.up('s')
        t.step(1)
    t.up('w')
    t.up('s')
    t.check('acompanhando a bola e batendo com a ponta, o azul vence o computador',
            t.get('pontos')[0] == 10, str(t.get('pontos')))
    t.shot('azul-venceu')

    # Metade que perde: parado, o azul perde para o computador.
    t.tap('SPACE')
    t.check('espaço volta ao menu', t.get('estado') == 'menu')
    t.tap('SPACE')
    t.until(lambda: t.get('estado') == 'fim', 60 * 600)
    t.check('sem mexer a raquete, o computador vence', t.get('pontos')[1] == 10 and t.get('pontos')[0] < 10,
            str(t.get('pontos')))

    # Dois jogadores: o laranja anda com as setas e o computador não mexe nele.
    t.tap('SPACE')
    t.tap('DOWN')
    t.tap('SPACE')
    t.check('com 2 jogadores, o jogo começa', t.get('jogadores') == 2 and t.get('estado') == 'jogando')
    # A bola vai para o laranja: contra o computador, a raquete iria atrás dela.
    raquetes[1].y = 240
    lancar(400, 150, 1, 0, 5)
    t.step(20)
    t.check('com 2 jogadores, o computador não mexe na raquete laranja', raquetes[1].y == 240)
    antes = raquetes[1].y
    t.hold('UP', 10)
    t.check('as setas mexem a raquete laranja', raquetes[1].y < antes)
