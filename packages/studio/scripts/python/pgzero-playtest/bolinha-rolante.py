"""Bolinha Rolante: on flat ground the marble stays still and the arrows push it, up to a top
speed; on a ramp it rolls downhill by itself; rolling off the course or into a hole it falls and
comes back on the last safe ground; the clock ends the game; a player that brakes on the ramps
and steers round the holes reaches the finish with time to spare."""

ROTA = [(300, 100), (290, 240), (265, 300), (175, 320), (175, 450), (300, 490), (300, 560), (300, 625)]


def jogar(t, quadros):
    """Steers to each point of the route, asking for a gentle speed towards it."""
    alvo = 0
    for _ in range(quadros):
        if t.get('estado') == 'chegou' or t.get('estado') == 'fim':
            return
        x, y = t.get('x'), t.get('y')
        if alvo < len(ROTA) - 1 and abs(ROTA[alvo][0] - x) < 14 and abs(ROTA[alvo][1] - y) < 14:
            alvo = alvo + 1
        tx, ty = ROTA[alvo]
        for eixo, distancia, velocidade, menos, mais in (('x', tx - x, t.get('vx'), 'LEFT', 'RIGHT'), ('y', ty - y, t.get('vy'), 'UP', 'DOWN')):
            quero = max(-1.6, min(1.6, distancia * 0.05))
            t.up(menos)
            t.up(mais)
            if velocidade < quero - 0.1:
                t.down(mais)
            elif velocidade > quero + 0.1:
                t.down(menos)
        t.step(1)
    for tecla in ('LEFT', 'RIGHT', 'UP', 'DOWN'):
        t.up(tecla)


def play(t):
    t.check('começa no alto, parada, com o tempo cheio', (t.get('x'), t.get('y')) == t.get('INICIO') and t.get('quadros_restantes') >= t.get('TEMPO') * 60 - 5)
    t.step(60)
    t.check('no chão reto, sem apertar nada, ela fica parada', (t.get('x'), t.get('y')) == t.get('INICIO'))
    t.shot('inicio')
    t.hold('RIGHT', 20)
    t.check('a seta empurra a bolinha', t.get('x') > 300 and t.get('vx') > 0)

    # Rápida demais (descendo uma rampa com a seta apertada), a velocidade volta ao limite.
    t.set('x', 300)
    t.set('y', 40)
    t.set('vx', 0)
    t.set('vy', 5)
    t.hold('DOWN', 1)
    t.check('a velocidade nunca passa do limite', t.get('vy') == t.get('VELOCIDADE_MAXIMA'), f"vy={t.get('vy')}")

    # Na rampa ela desce sozinha; no chão reto, não.
    t.set('estado', 'jogando')
    t.set('x', 300)
    t.set('y', 170)
    t.set('vx', 0)
    t.set('vy', 0)
    t.step(30)
    t.check('na rampa, a bolinha desce sozinha', t.get('y') > 172 and t.get('vy') > 0, f"y={t.get('y'):.1f}")
    t.check('e não vai para os lados', abs(t.get('x') - 300) < 0.01)

    # Fora da pista ou no buraco, ela cai e volta ao último chão seguro.
    t.set('x', 250)
    t.set('y', 300)
    t.set('vx', 0)
    t.set('vy', 0)
    t.step(2)
    t.check('o chão seguro guarda onde ela volta', t.get('salvo') == (250, 300))
    t.set('vx', 3)
    t.until(lambda: t.get('estado') == 'caindo', 60)
    t.check('o buraco derruba a bolinha', t.get('estado') == 'caindo' and 300 <= t.get('x') <= 310, f"x={t.get('x'):.1f}")
    t.step(45)
    t.check('depois de cair, ela volta ao chão seguro, parada', t.get('estado') == 'jogando' and t.get('vx') == 0 and abs(t.get('x') - t.get('salvo')[0]) < 0.01)
    t.set('x', 152)
    t.set('vx', -3)
    t.until(lambda: t.get('estado') == 'caindo', 30)
    t.check('saindo pela beirada, também cai', t.get('estado') == 'caindo' and t.get('x') < 150)
    t.step(45)

    # O tempo acaba.
    t.set('quadros_restantes', 2)
    t.step(2)
    t.check('sem tempo, acabou', t.get('estado') == 'fim')
    t.tap('SPACE')
    t.check('espaço recomeça do alto com o tempo cheio', t.get('estado') == 'jogando' and (t.get('x'), t.get('y')) == t.get('INICIO'))

    # Freando nas rampas e desviando dos buracos, chega com tempo sobrando.
    jogar(t, 60 * 45)
    t.check('desviando dos buracos, chega à bandeira', t.get('estado') == 'chegou',
            f"estado={t.get('estado')}, x={t.get('x'):.0f}, y={t.get('y'):.0f}")
    t.check('e sobra tempo', t.get('quadros_restantes') > 10 * 60, f"{t.get('quadros_restantes') // 60} s")
    t.shot('chegou')
    t.tap('SPACE')
    t.check('espaço joga de novo', t.get('estado') == 'jogando')
