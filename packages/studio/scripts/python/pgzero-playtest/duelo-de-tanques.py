"""Duelo de Tanques: a random hilly ground (pygame.draw.polygon) with a flat place for each tank;
the arrows set the angle (0 to 90) and the force (10 to 100); space fires; the shot flies with
gravity and wind, stops on the ground by the color of the screen (screen.surface.get_at) and
wins the round on the other tank; the turn passes after a miss; the computer corrects its aim
after each of its shots (more force, less force, or higher over a hill) until it hits, on any
ground."""


def play(t):
    sorteio = t.get('random')

    def chao_em(x):
        terreno = t.get('terreno')
        for (x1, y1), (x2, y2) in zip(terreno[1:-1], terreno[2:-1]):
            if x1 <= x <= x2 and x2 > x1:
                return y1 + (y2 - y1) * (x - x1) / (x2 - x1)

    def terreno_novo(semente):
        sorteio.seed(semente)
        t.get('nova_rodada')()
        t.step(2)

    terreno_novo(1)
    for tanque in t.get('tanques'):
        t.check('cada tanque fica no chão plano', abs(chao_em(tanque.left + 2) - tanque.bottom) < 1
                and abs(chao_em(tanque.right - 2) - tanque.bottom) < 1)

    # Limites da mira.
    t.hold('UP', 80)
    t.check('o ângulo não passa de 90', t.get('angulos')[0] == 90)
    t.hold('DOWN', 120)
    t.check('o ângulo não fica abaixo de 0', t.get('angulos')[0] == 0)
    t.hold('LEFT', 80)
    t.check('a força não fica abaixo de 10', t.get('forcas')[0] == 10)
    t.hold('RIGHT', 120)
    t.check('a força não passa de 100', t.get('forcas')[0] == 100)

    # Dois jogadores, sem vento: o azul mira como uma criança faria.
    t.set('COMPUTADOR', False)
    t.set('sortear_vento', lambda: None)
    t.set('vento', 0)
    # Quanto cada tiro que caiu no meio da tela parou longe do chão (pela cor, não pela conta).
    paradas = []
    for semente in [2, 3, 4]:
        terreno_novo(semente)
        # Começa a mira do zero: 45 graus e força 60.
        t.hold('DOWN', 100)
        t.hold('UP', 45)
        t.hold('LEFT', 100)
        t.hold('RIGHT', 50)
        tanques = t.get('tanques')
        ajuste = 16
        tiros = 0
        while t.get('estado') != 'fim' and tiros < 30:
            t.until(lambda: t.get('estado') == 'mirando' and t.get('vez') == 0, 600)
            t.tap('SPACE')
            tiros = tiros + 1
            t.until(lambda: t.get('estado') != 'voando', 600)
            if t.get('estado') == 'fim':
                break
            caiu = t.get('tiro_x')
            if 0 <= caiu < 800 and chao_em(caiu) is not None:
                paradas.append(abs(t.get('tiro_y') - chao_em(caiu)))
            # Vez do laranja: atira para o alto e erra.
            t.until(lambda: t.get('estado') == 'mirando' and t.get('vez') == 1, 600)
            t.hold('UP', 50)
            t.tap('SPACE')
            t.until(lambda: t.get('estado') == 'mirando' and t.get('vez') == 0, 600)
            if caiu < tanques[0].x + 120:
                t.hold('UP', 10)
                ajuste = 16
            else:
                t.hold('RIGHT' if caiu < tanques[1].x else 'LEFT', max(int(ajuste), 1))
                ajuste = ajuste * 0.6
        t.check('mirando com cuidado, o azul acerta o laranja', t.get('estado') == 'fim'
                and t.get('vez') == 0, f'terreno {semente}: {tiros} tiros')
    t.check('o tiro para no chão pela cor da tela (get_at)', len(paradas) >= 3 and max(paradas) <= 5,
            f'{len(paradas)} paradas, a mais longe a {max(paradas, default=0):.1f}')
    t.shot('azul-venceu')
    t.check('cada vitória conta no placar', t.get('vitorias') == [3, 0])

    # Contra o computador: quem não mira perde, em qualquer terreno.
    t.set('COMPUTADOR', True)
    for semente in range(10, 16):
        terreno_novo(semente)
        # O azul não mira: atira fraco, para o alto.
        t.hold('UP', 100)
        t.hold('LEFT', 100)
        rodadas = 0
        while t.get('estado') != 'fim' and rodadas < 20:
            t.until(lambda: t.get('estado') == 'mirando' and t.get('vez') == 0, 600)
            t.tap('SPACE')
            rodadas = rodadas + 1
            t.until(lambda: t.get('vez') == 1 and t.get('estado') == 'mirando'
                    or t.get('estado') == 'fim', 600)
            if t.get('estado') == 'mirando':
                t.tap('SPACE')
                if t.get('estado') != 'mirando' or t.get('espera') <= 0:
                    t.check('na vez do computador o espaço não atira', False)
            t.until(lambda: t.get('estado') == 'fim'
                    or (t.get('vez') == 0 and t.get('estado') == 'mirando'), 1200)
        t.check('o computador corrige a mira e acaba acertando', t.get('estado') == 'fim'
                and t.get('vez') == 1, f'terreno {semente}: {rodadas} rodadas')
    t.shot('computador-venceu')
    t.tap('SPACE')
    t.check('espaço começa outra rodada', t.get('estado') == 'mirando' and t.get('vez') == 0)
